
const http = require('http');

const PORT = 3000;
const GROUP = 'ББМО-01-23';
const STUDENT = 'Вероника Грудская';
const MAX_BODY_SIZE = 1024 * 1024;

const server = http.createServer(async (request, response) => {
    const date = new Date().toLocaleString('ru-RU');
    const pathname = new URL(
        request.url,
        `http://${request.headers.host || 'localhost'}`
    ).pathname;

    console.log(`[${date}] ${request.method} ${request.url}`);

    response.setHeader('X-Powered-By', 'Node.js');
    response.setHeader('X-Group', 'BBMO-01-23');
    response.setHeader('Cache-Control', 'no-cache');

    function sendJSON(status, data) {
        response.writeHead(status, {
            'Content-Type': 'application/json; charset=utf-8'
        });
        response.end(JSON.stringify(data, null, 2));
    }

    // Чтение тела запроса
    function readBody(req) {
        return new Promise((resolve, reject) => {
            let chunks = [];
            let size = 0;

            req.on('data', chunk => {
                size += chunk.length;

                if (size > MAX_BODY_SIZE) {
                    const error = new Error('Payload Too Large');
                    error.statusCode = 413;
                    reject(error);
                    req.destroy();
                    return;
                }

                chunks.push(chunk);
            });

            req.on('end', () => {
                resolve(Buffer.concat(chunks));
            });

            req.on('error', error => {
                reject(error);
            });
        });
    }

    try {
        // Задание 1: главная страница
        if (request.method === 'GET' && pathname === '/') {
            response.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8'
            });

            response.end(`
                <h1>Лабораторная работа №20</h1>
                <p>Группа: ${GROUP}</p>
                <p>Метод: ${request.method}</p>
                <p>URL: ${request.url}</p>
            `);
        }

        // Задание 1: информация о студенте
        else if (request.method === 'GET' && pathname === '/about') {
            response.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8'
            });

            response.end(`
                <h1>О студенте</h1>
                <p>Группа: ${GROUP}</p>
                <p>Студент: ${STUDENT}</p>
            `);
        }

        // Задание 2: чтение заголовков
        else if (request.method === 'GET' && pathname === '/headers') {
            sendJSON(200, {
                headers: request.headers,
                method: request.method,
                url: request.url,
                httpVersion: request.httpVersion
            });
        }

        // Задание 2: установка заголовков
        else if (request.method === 'GET' && pathname === '/headers/set') {
            response.setHeader('Content-Type', 'text/html; charset=utf-8');
            response.setHeader('X-Custom-Header', 'My Header');

            console.log('X-Powered-By:', response.getHeader('X-Powered-By'));
            console.log('Есть X-Group:', response.hasHeader('X-Group'));

            response.writeHead(200);
            response.end('<h1>Заголовки ответа установлены</h1>');
        }

        // Задание 2: проверка заголовков
        else if (request.method === 'GET' && pathname === '/headers/check') {
            sendJSON(200, {
                hasContentType: response.hasHeader('Content-Type'),
                hasXGroup: response.hasHeader('X-Group'),
                hasUnknown: response.hasHeader('Unknown-Header')
            });
        }

        // Задание 3: POST /echo
        else if (request.method === 'POST' && pathname === '/echo') {
            const body = await readBody(request);
            const contentType = request.headers['content-type'] || '';
            const size = body.length;

            console.log(`Размер тела запроса: ${size} байт`);

            if (contentType.includes('application/json')) {
                try {
                    const data = JSON.parse(body.toString('utf8'));
                    data.group = GROUP;
                    sendJSON(200, data);
                } catch {
                    sendJSON(400, { error: 'Некорректный JSON' });
                }
            } else if (contentType.includes('text/plain')) {
                response.writeHead(200, {
                    'Content-Type': 'text/plain; charset=utf-8'
                });
                response.end(body.toString('utf8'));
            } else if (contentType.includes('application/x-www-form-urlencoded')) {
                const data = Object.fromEntries(
                    new URLSearchParams(body.toString('utf8'))
                );
                sendJSON(200, data);
            } else {
                response.writeHead(200, {
                    'Content-Type': contentType || 'application/octet-stream'
                });
                response.end(body);
            }
        }

        // Задание 3: POST /form
        else if (request.method === 'POST' && pathname === '/form') {
            const body = await readBody(request);
            const data = Object.fromEntries(
                new URLSearchParams(body.toString('utf8'))
            );

            console.log(`Размер тела формы: ${body.length} байт`);
            sendJSON(200, data);
        }

        // Неизвестный маршрут
        else {
            response.writeHead(404, {
                'Content-Type': 'text/html; charset=utf-8'
            });

            response.end(`
                <h1>404 Not Found</h1>
                <p>Путь ${request.url} не найден</p>
            `);
        }

    } catch (error) {
        if (error.statusCode === 413) {
            if (!response.headersSent && !response.destroyed) {
                sendJSON(413, {
                    error: 'Payload Too Large',
                    message: 'Максимальный размер тела — 1 МБ'
                });
            }
        } else {
            console.error('Ошибка:', error);

            if (!response.headersSent && !response.destroyed) {
                sendJSON(500, { error: 'Internal Server Error' });
            }
        }
    }
});

server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Группа: ${GROUP}`);
});
