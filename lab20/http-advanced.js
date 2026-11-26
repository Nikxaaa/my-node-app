
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3000;
const HTTPS_PORT = 3443;
const GROUP = 'ББМО-01-23';

const PUBLIC_DIR = path.join(__dirname, 'public');
const LOG_FILE = path.join(__dirname, 'access.log');
const STREAM_FILE = path.join(__dirname, 'public', 'big-file.txt');

const CACHE_TTL = 60 * 1000;
const cache = new Map();

const metrics = {
    total: 0,
    byMethod: {},
    byStatus: {}
};

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.pdf': 'application/pdf'
};

// Общая отправка JSON
function sendJSON(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify(data, null, 2));
}

// Middleware: заголовки и метрики
function commonMiddleware(req, res, next) {
res.setHeader('X-Group', 'BBMO-01-23');
    res.setHeader('X-Powered-By', 'Node.js');

    metrics.total++;
    metrics.byMethod[req.method] =
        (metrics.byMethod[req.method] || 0) + 1;

    const originalWriteHead = res.writeHead;

    res.writeHead = function (statusCode, ...args) {
        metrics.byStatus[statusCode] =
            (metrics.byStatus[statusCode] || 0) + 1;

        return originalWriteHead.call(this, statusCode, ...args);
    };

    next();
}

// Middleware: логирование
function loggingMiddleware(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
        const status = res.statusCode;
        const date = new Date().toLocaleString('ru-RU');

        const log = `[${date}] [${GROUP}] ${req.method} ${req.url} ${status} ${Date.now() - start}ms\n`;

        fs.appendFile(LOG_FILE, log, error => {
            if (error) console.error('Ошибка записи лога:', error);
        });

        console.log(log.trim());
    });

    next();
}

// Middleware: обработка ошибок
function errorMiddleware(req, res, next) {
    Promise.resolve()
        .then(next)
        .catch(error => {
            console.error('Ошибка middleware:', error);

            if (!res.headersSent && !res.destroyed) {
                sendJSON(res, 500, {
                    error: 'Internal Server Error'
                });
            }
        });
}

// Middleware: кэширование GET /api/data
function cacheMiddleware(req, res, next) {
    const url = new URL(req.url, 'http://localhost');

    if (req.method !== 'GET' || url.pathname !== '/api/data') {
        return next();
    }

    const key = url.pathname + url.search;
    const saved = cache.get(key);

    if (saved && Date.now() - saved.time < CACHE_TTL) {
        res.setHeader('Cache-Control', 'max-age=60');
        res.setHeader('X-Cache', 'HIT');
        return sendJSON(res, 200, saved.data);
    }

    const originalEnd = res.end;
    const chunks = [];

    res.write = function (chunk, ...args) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return http.ServerResponse.prototype.write.call(this, chunk, ...args);
    };

    res.end = function (chunk, ...args) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

        const content = Buffer.concat(chunks).toString('utf8');

        try {
            if (res.statusCode === 200) {
                cache.set(key, {
                    data: JSON.parse(content),
                    time: Date.now()
                });
            }
        } catch (error) {
            console.error('Ошибка сохранения кэша:', error.message);
        }

        return originalEnd.call(this, chunk, ...args);
    };

    res.setHeader('Cache-Control', 'max-age=60');
    res.setHeader('X-Cache', 'MISS');

    next();
}

// Middleware: запуск цепочки
const middlewares = [
    commonMiddleware,
    loggingMiddleware,
    errorMiddleware,
    cacheMiddleware
];

function runMiddlewares(req, res) {
    let index = 0;

    function next() {
        if (index < middlewares.length) {
            const middleware = middlewares[index++];
            middleware(req, res, next);
        } else {
            handleRequest(req, res);
        }
    }

    next();
}

// Отдача статических файлов
function serveStatic(req, res, pathname) {
    const rawPath = decodeURIComponent(req.url.split('?')[0]);
    const segments = rawPath.split('/');

    if (segments.includes('..')) {
        return sendJSON(res, 403, {
            error: 'Forbidden: path traversal'
        });
    }

    const relativePath = pathname.slice('/static/'.length);
    const filePath = path.resolve(PUBLIC_DIR, relativePath);

    if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
        return sendJSON(res, 403, { error: 'Forbidden' });
    }

    fs.stat(filePath, (error, stats) => {
        if (error || !stats.isFile()) {
            return sendJSON(res, 404, {
                error: 'File Not Found'
            });
        }

        const etag = '"' + crypto
            .createHash('md5')
            .update(`${stats.size}-${stats.mtimeMs}`)
            .digest('hex') + '"';

        const lastModified = stats.mtime.toUTCString();

        res.setHeader(
            'Content-Type',
            mimeTypes[path.extname(filePath).toLowerCase()] ||
            'application/octet-stream'
        );

        res.setHeader('ETag', etag);
        res.setHeader('Last-Modified', lastModified);
        res.setHeader('Cache-Control', 'max-age=60');

        if (req.headers['if-none-match'] === etag ||
            (!req.headers['if-none-match'] &&
             req.headers['if-modified-since'] &&
             new Date(req.headers['if-modified-since']) >= stats.mtime)) {
            res.writeHead(304);
            return res.end();
        }

        res.writeHead(200);

        const stream = fs.createReadStream(filePath);

        stream.on('error', error => {
            console.error('Ошибка чтения файла:', error);
            if (!res.headersSent) {
                sendJSON(res, 500, { error: 'File Read Error' });
            } else {
                res.destroy(error);
            }
        });

        stream.pipe(res);
    });
}

// Основная маршрутизация
function handleRequest(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const pathname = url.pathname;

    if (req.method === 'GET' && pathname.startsWith('/static/')) {
        return serveStatic(req, res, pathname);
    }

    if (req.method === 'GET' && pathname === '/') {
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8'
        });

        return res.end(`
            <h1>Экспертное задание №5</h1>
            <p>Группа: ${GROUP}</p>
            <p>HTTP-сервер работает!</p>
            <p><a href="/metrics">Метрики</a></p>
            <p><a href="/api/data">Данные API</a></p>
        `);
    }

    if (req.method === 'GET' && pathname === '/api/data') {
        return sendJSON(res, 200, {
            group: GROUP,
            message: 'Данные сервера',
            updated: new Date().toISOString()
        });
    }

    if (req.method === 'POST' && pathname === '/api/data') {
        cache.clear();

        return sendJSON(res, 200, {
            updated: true,
            cache: 'cleared'
        });
    }

    if (req.method === 'GET' && pathname === '/metrics') {
        return sendJSON(res, 200, {
            group: GROUP,
            total: metrics.total,
            byMethod: metrics.byMethod,
            byStatus: metrics.byStatus,
            uptime: Math.floor(process.uptime())
        });
    }

    if (req.method === 'GET' && pathname === '/stream') {
        fs.stat(STREAM_FILE, (error, stats) => {
            if (error) {
                return sendJSON(res, 404, {
                    error: 'Файл для стриминга не найден'
                });
            }

            res.writeHead(200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Content-Length': stats.size
            });

            const stream = fs.createReadStream(STREAM_FILE);
            let transferred = 0;

            stream.on('data', chunk => {
                transferred += chunk.length;

                const percent = Math.floor(
                    transferred / stats.size * 100
                );

                console.log(`Прогресс стриминга: ${percent}%`);
            });

            stream.on('error', error => {
                console.error('Ошибка стриминга:', error);
                res.destroy(error);
            });

            stream.pipe(res);
        });

        return;
    }

    if (req.method === 'GET' && pathname === '/https-info') {
        res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8'
        });

        return res.end(`
            <h1>HTTPS работает!</h1>
            <p>Группа: ${GROUP}</p>
            <p>Защищённое соединение установлено.</p>
        `);
    }

    sendJSON(res, 404, {
        error: 'Not Found',
        path: pathname
    });
}

// Создание серверов
const httpServer = http.createServer((req, res) => {
    runMiddlewares(req, res);
});

httpServer.on('error', error => {
    console.error('Ошибка HTTP-сервера:', error);
});

httpServer.on('clientError', (error, socket) => {
    console.error('Некорректный запрос клиента:', error.message);

    if (socket.writable) {
        socket.end(
            'HTTP/1.1 400 Bad Request\r\n' +
            'Connection: close\r\n\r\n'
        );
    }
});

httpServer.listen(PORT, () => {
    console.log(`[INFO] HTTP-сервер запущен на порту ${PORT}`);
    console.log(`[INFO] Группа: ${GROUP}`);
});

// HTTPS
const certDir = path.join(__dirname, 'cert');

try {
    const options = {
        key: fs.readFileSync(path.join(certDir, 'server.key')),
        cert: fs.readFileSync(path.join(certDir, 'server.crt'))
    };

    const httpsServer = https.createServer(options, (req, res) => {
        runMiddlewares(req, res);
    });

    httpsServer.on('error', error => {
        console.error('Ошибка HTTPS-сервера:', error);
    });

    httpsServer.listen(HTTPS_PORT, () => {
        console.log(`[INFO] HTTPS-сервер запущен на порту ${HTTPS_PORT}`);
    });

    process.on('SIGINT', () => {
        console.log('\n[INFO] Завершение серверов...');

        httpServer.close(() => {
            console.log('[INFO] HTTP-сервер остановлен');
        });

        httpsServer.close(() => {
            console.log('[INFO] HTTPS-сервер остановлен');
            process.exit(0);
        });

        setTimeout(() => process.exit(1), 5000).unref();
    });

} catch (error) {
    console.error(
        'Не удалось запустить HTTPS. Проверь сертификаты в папке cert:',
        error.message
    );

    process.on('SIGINT', () => {
        console.log('\n[INFO] Завершение HTTP-сервера...');
        httpServer.close(() => {
            console.log('[INFO] HTTP-сервер остановлен');
            process.exit(0);
        });
    });
}
