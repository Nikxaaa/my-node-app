
const http = require('http');

const PORT = 3000;
const GROUP = 'ББМО-01-23';

let students = [
    { id: 1, name: 'Иван', group: GROUP },
    { id: 2, name: 'Мария', group: GROUP }
];

let nextId = 3;

// Чтение тела запроса
function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', chunk => {
            body += chunk;

            if (body.length > 1024 * 1024) {
                reject(new Error('Размер тела превышает 1 МБ'));
                req.destroy();
            }
        });

        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

// Отправка JSON
function sendJSON(res, status, data) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Group': 'BBMO-01-23'
    });

    res.end(JSON.stringify(data, null, 2));
}

// Таблица маршрутов
const routes = [
    {
        method: 'GET',
        pattern: /^\/api\/students$/,
        handler: (req, res, params, query) => {
            let result = students;

            if (query.group) {
                result = result.filter(
                    student => student.group === query.group
                );
            }

            sendJSON(res, 200, result);
        }
    },

    {
        method: 'GET',
        pattern: /^\/api\/students\/(\d+)$/,
        handler: (req, res, params) => {
            const student = students.find(
                item => item.id === Number(params[0])
            );

            if (!student) {
                return sendJSON(res, 404, {
                    error: 'Студент не найден'
                });
            }

            sendJSON(res, 200, student);
        }
    },

    {
        method: 'POST',
        pattern: /^\/api\/students$/,
        handler: async (req, res) => {
            const body = await readBody(req);
            const data = JSON.parse(body);

            if (!data.name) {
                return sendJSON(res, 400, {
                    error: 'Необходимо указать имя'
                });
            }

            const student = {
                id: nextId++,
                name: data.name,
                group: data.group || GROUP
            };

            students.push(student);

            sendJSON(res, 201, student);
        }
    },

    {
        method: 'PUT',
        pattern: /^\/api\/students\/(\d+)$/,
        handler: async (req, res, params) => {
            const id = Number(params[0]);

            const student = students.find(
                item => item.id === id
            );

            if (!student) {
                return sendJSON(res, 404, {
                    error: 'Студент не найден'
                });
            }

            const body = await readBody(req);
            const data = JSON.parse(body);

            if (data.name) student.name = data.name;
            if (data.group) student.group = data.group;

            sendJSON(res, 200, student);
        }
    },

    {
        method: 'DELETE',
        pattern: /^\/api\/students\/(\d+)$/,
        handler: (req, res, params) => {
            const id = Number(params[0]);

            const index = students.findIndex(
                item => item.id === id
            );

            if (index === -1) {
                return sendJSON(res, 404, {
                    error: 'Студент не найден'
                });
            }

            students.splice(index, 1);

            sendJSON(res, 200, {
                deleted: true,
                id: id
            });
        }
    },

    // Демонстрация параметров пути
    {
        method: 'GET',
        pattern: /^\/users\/([^/]+)\/posts\/([^/]+)$/,
        handler: (req, res, params) => {
            sendJSON(res, 200, {
                userId: decodeURIComponent(params[0]),
                postId: decodeURIComponent(params[1])
            });
        }
    },

    // Демонстрация query-параметров
    {
        method: 'GET',
        pattern: /^\/search$/,
        handler: (req, res, params, query) => {
            sendJSON(res, 200, {
                q: query.q || '',
                limit: Number(query.limit) || 10
            });
        }
    }
];

// Создание сервера
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);

    const query = Object.fromEntries(url.searchParams.entries());

    let status = 200;

    try {
        const matchingRoutes = routes.filter(route =>
            route.pattern.test(pathname)
        );

        const route = matchingRoutes.find(
            item => item.method === req.method
        );

        if (route) {
            const match = pathname.match(route.pattern);
            const params = match ? match.slice(1) : [];

            await route.handler(req, res, params, query);
            status = res.statusCode;
        } else if (matchingRoutes.length > 0) {
            status = 405;

            sendJSON(res, 405, {
                error: 'Method Not Allowed'
            });
        } else {
            status = 404;

            sendJSON(res, 404, {
                error: 'Not Found',
                path: pathname
            });
        }

    } catch (error) {
        console.error('Ошибка:', error);

        if (!res.headersSent && !res.destroyed) {
            status = 400;

            sendJSON(res, 400, {
                error: 'Некорректный запрос'
            });
        }
    } finally {
        const date = new Date().toLocaleString('ru-RU');

        console.log(
            `[${date}] [${GROUP}] ${req.method} ${req.url} ${res.statusCode || status}`
        );
    }
});

server.listen(PORT, () => {
    console.log(`HTTP-сервер запущен на порту ${PORT}`);
    console.log(`Группа: ${GROUP}`);
});
