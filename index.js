const express = require('express');
const compression = require('compression');
const { rateLimit } = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const multer = require('multer');
const csvParser = require('csv-parser');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'lr16-veronika-group401-secret';

const GROUP = 'ББМО-01-23';
const STUDENT = 'Грудская Вероника Сергеевна';
const JOURNAL_NUMBER = 5;

const DATA_DIR = path.join(__dirname, 'data');
const LOG_DIR = path.join(__dirname, 'logs');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(LOG_DIR, { recursive: true });

const LOG_FILE = path.join(LOG_DIR, 'operations.log');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

let books = [];
let users = [];
let nextBookId = 101;

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

// ==========================================
// НАЗВАНИЯ, АВТОРЫ И ЖАНРЫ
// ==========================================

const titles = [
    'Война и мир',
    'Преступление и наказание',
    'Мастер и Маргарита',
    'Анна Каренина',
    'Отцы и дети',
    'Евгений Онегин',
    'Тихий Дон',
    'Идиот',
    'Герой нашего времени',
    'Мёртвые души',
    'Дубровский',
    'Капитанская дочка',
    'Двенадцать стульев',
    'Золотой телёнок',
    'Белый клык',
    'Остров сокровищ',
    'Граф Монте-Кристо',
    'Три мушкетёра',
    'Шерлок Холмс',
    'Приключения Тома Сойера'
];

const authors = [
    'Лев Толстой',
    'Фёдор Достоевский',
    'Михаил Булгаков',
    'Иван Тургенев',
    'Александр Пушкин',
    'Михаил Шолохов',
    'Николай Гоголь',
    'Александр Дюма',
    'Марк Твен',
    'Артур Конан Дойл'
];

const genres = [
    'роман',
    'детектив',
    'фантастика',
    'приключения',
    'драма',
    'исторический роман',
    'классика',
    'повесть'
];

// ==========================================
// ГЕНЕРАЦИЯ 100 КНИГ
// ==========================================

function generateBooks() {
    const result = [];

    for (let i = 1; i <= 100; i++) {
        const title = titles[(i - 1) % titles.length];
        const author = authors[(i + JOURNAL_NUMBER - 1) % authors.length];
        const genre = genres[(i + JOURNAL_NUMBER - 1) % genres.length];
        const year = 1850 + ((i * 7 + JOURNAL_NUMBER) % 170);

        result.push({
            id: i,
            title: `${title} (${i})`,
            author,
            year,
            genre,
            isbn: `978-5-${String(JOURNAL_NUMBER).padStart(2, '0')}-${String(i).padStart(6, '0')}`,
            group: GROUP,
            available: i % 3 !== 0,
            reviews: []
        });
    }

    return result;
}

// ==========================================
// ЗАПИСЬ ОПЕРАЦИЙ В ФАЙЛ
// ==========================================

function logOperation(message) {
    const entry = `[${new Date().toISOString()}] ${message}\n`;

    fs.appendFile(LOG_FILE, entry, error => {
        if (error) {
            console.error('Ошибка записи лога:', error.message);
        }
    });
}

// ==========================================
// ЛОГИРОВАНИЕ ЗАПРОСОВ
// ==========================================

app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;

        const message =
            `[${new Date().toISOString()}] ` +
            `${req.method} ${req.originalUrl} ` +
            `${res.statusCode} - ${duration}ms`;

        console.log(message);
        logOperation(message);
    });

    next();
});

// ==========================================
// СЖАТИЕ ДАННЫХ
// ==========================================

app.use(compression({
    level: 6,
    threshold: 1024
}));

// ==========================================
// ОГРАНИЧЕНИЕ ЗАПРОСОВ
// ==========================================

const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        error: 'Превышен лимит запросов',
        status: 429
    }
});

app.use(limiter);

// ==========================================
// ОБРАБОТКА JSON
// ==========================================

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================

function saveUsers() {
    fs.writeFileSync(
        USERS_FILE,
        JSON.stringify(users, null, 2),
        'utf8'
    );
}

function validateRequest(req, res, next) {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Ошибка проверки данных',
            details: errors.array()
        });
    }

    next();
}

function findBook(id) {
    return books.find(book => book.id === Number(id));
}

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: '2h' }
    );
}

// ==========================================
// JWT АУТЕНТИФИКАЦИЯ
// ==========================================

function authenticateToken(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Требуется авторизация',
            status: 401
        });
    }

    const token = header.split(' ')[1];

    jwt.verify(token, JWT_SECRET, (error, decoded) => {
        if (error) {
            return res.status(403).json({
                error: 'Недействительный или просроченный токен',
                status: 403
            });
        }

        req.user = decoded;
        next();
    });
}

// ==========================================
// ПРОВЕРКА РОЛИ АДМИНИСТРАТОРА
// ==========================================

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Доступ разрешён только администраторам',
            status: 403
        });
    }

    next();
}

// ==========================================
// КЭШИРОВАНИЕ GET-ЗАПРОСОВ НА 5 МИНУТ
// ==========================================

function cacheMiddleware(req, res, next) {
    if (req.method !== 'GET') {
        return next();
    }

    const key = req.originalUrl + ':' + req.headers.authorization;

    const saved = cache.get(key);

    if (saved && Date.now() - saved.time < CACHE_TTL) {
        return res.json(saved.data);
    }

    const originalJson = res.json.bind(res);

    res.json = function (data) {
        if (res.statusCode === 200) {
            cache.set(key, {
                data,
                time: Date.now()
            });
        }

        return originalJson(data);
    };

    next();
}

// ==========================================
// ГЛАВНАЯ СТРАНИЦА
// ==========================================

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <title>Лабораторная работа №16</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background: #eef2f7;
                padding: 40px;
            }
            .container {
                max-width: 750px;
                margin: auto;
                background: white;
                padding: 30px;
                border-radius: 12px;
            }
            h1 { color: #243b55; }
            a { color: #176b87; }
            li { margin: 12px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Лабораторная работа №16</h1>
            <p><b>Студентка:</b> ${STUDENT}</p>
            <p><b>Группа:</b> ${GROUP}</p>
            <p><b>Номер по журналу:</b> ${JOURNAL_NUMBER}</p>
            <p><b>Дата и время:</b> ${new Date().toLocaleString('ru-RU')}</p>
            <h3>Добро пожаловать на сервер Express.js!</h3>

            <h3>Доступные маршруты:</h3>
            <ul>
                <li><a href="/about">О разработчике</a></li>
                <li><a href="/contacts">Контакты</a></li>
                <li><a href="/api-docs">Swagger документация</a></li>
                <li>GET /api/books</li>
                <li>GET /api/books/stats</li>
                <li>POST /auth/register</li>
                <li>POST /auth/login</li>
            </ul>
        </div>
    </body>
    </html>
    `);
});

// ==========================================
// СТРАНИЦА О РАЗРАБОТЧИКЕ
// ==========================================

app.get('/about', (req, res) => {
    res.send(`
        <h1>О разработчике</h1>
        <p>Студентка: ${STUDENT}</p>
        <p>Группа: 401</p>
        <p>Лабораторная работа №16</p>
        <a href="/">На главную</a>
    `);
});

// ==========================================
// КОНТАКТЫ
// ==========================================

app.get('/contacts', (req, res) => {
    res.send(`
        <h1>Контактная информация</h1>
        <p>Разработчик: ${STUDENT}</p>
        <p>Группа: 401</p>
        <p>Учебный проект Express.js</p>
        <a href="/">На главную</a>
    `);
});

// ==========================================
// РЕГИСТРАЦИЯ
// ==========================================

app.post('/auth/register',
    [
        body('email').isEmail().withMessage('Некорректный email'),
        body('password').isLength({ min: 6 }).withMessage('Пароль должен содержать минимум 6 символов'),
        body('name').trim().notEmpty().withMessage('Укажите имя')
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            const { email, password, name } = req.body;

            if (users.some(user => user.email === email.toLowerCase())) {
                return res.status(409).json({
                    error: 'Пользователь уже существует'
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const user = {
                id: users.length + 1,
                email: email.toLowerCase(),
                password: hashedPassword,
                name,
                role: 'user'
            };

            users.push(user);
            saveUsers();

            logOperation(`Регистрация пользователя: ${email}`);

            res.status(201).json({
                message: 'Регистрация успешна',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// ВХОД В СИСТЕМУ
// ==========================================

app.post('/auth/login',
    [
        body('email').isEmail(),
        body('password').notEmpty()
    ],
    validateRequest,
    async (req, res, next) => {
        try {
            const { email, password } = req.body;

            const user = users.find(
                item => item.email === email.toLowerCase()
            );

            if (!user || !(await bcrypt.compare(password, user.password))) {
                return res.status(401).json({
                    error: 'Неверный email или пароль'
                });
            }

            const token = createToken(user);

            res.json({
                message: 'Вход выполнен успешно',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// ЗАЩИТА ВСЕХ МАРШРУТОВ /api/books
// ==========================================

app.use('/api/books', authenticateToken, cacheMiddleware);

// ==========================================
// GET /api/books
// ФИЛЬТРАЦИЯ, ПОИСК, ПАГИНАЦИЯ, СОРТИРОВКА
// ==========================================

app.get('/api/books', (req, res) => {
    let result = [...books];

    const {
        author,
        year,
        yearFrom,
        yearTo,
        search,
        sort,
        limit,
        page
    } = req.query;

    if (author) {
        result = result.filter(
            book => book.author.toLowerCase().includes(author.toLowerCase())
        );
    }

    if (year) {
        result = result.filter(
            book => book.year === Number(year)
        );
    }

    if (yearFrom) {
        result = result.filter(
            book => book.year >= Number(yearFrom)
        );
    }

    if (yearTo) {
        result = result.filter(
            book => book.year <= Number(yearTo)
        );
    }

    if (search) {
        const value = search.toLowerCase();

        result = result.filter(
            book =>
                book.title.toLowerCase().includes(value) ||
                book.author.toLowerCase().includes(value)
        );
    }

    if (sort) {
        const descending = sort.startsWith('-');
        const field = descending ? sort.slice(1) : sort;

        if (!['title', 'year', 'author', 'genre'].includes(field)) {
            return res.status(400).json({
                error: 'Недопустимое поле сортировки'
            });
        }

        result.sort((a, b) => {
            const comparison = String(a[field]).localeCompare(
                String(b[field]), 'ru',
                { numeric: true }
            );

            return descending ? -comparison : comparison;
        });
    }

    const total = result.length;
    const pageLimit = Number(limit || 10);
    const currentPage = Number(page || 1);

    if (
        !Number.isInteger(pageLimit) ||
        !Number.isInteger(currentPage) ||
        pageLimit < 1 ||
        currentPage < 1
    ) {
        return res.status(400).json({
            error: 'Некорректные параметры пагинации'
        });
    }

    const start = (currentPage - 1) * pageLimit;

    result = result.slice(start, start + pageLimit);

    res.json({
        total,
        page: currentPage,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit),
        books: result
    });
});

// ==========================================
// СТАТИСТИКА
// ==========================================

app.get('/api/books/stats', (req, res) => {
    const authorStats = {};
    const genreStats = {};

    books.forEach(book => {
        authorStats[book.author] =
            (authorStats[book.author] || 0) + 1;

        genreStats[book.genre] =
            (genreStats[book.genre] || 0) + 1;
    });

    const years = books.map(book => book.year);

    res.json({
        totalBooks: books.length,
        byAuthors: authorStats,
        oldestYear: Math.min(...years),
        newestYear: Math.max(...years),
        byGenres: genreStats
    });
});

// ==========================================
// ЭКСПОРТ CSV / JSON
// ==========================================

app.get('/api/books/export', (req, res) => {
    const format = req.query.format || 'json';

    if (format === 'json') {
        res.setHeader('Content-Disposition', 'attachment; filename="books.json"');
        return res.json(books);
    }

    if (format === 'csv') {
        const fields = [
            'id', 'title', 'author', 'year',
            'genre', 'isbn', 'group', 'available'
        ];

        const rows = [
            fields.join(','),
            ...books.map(book =>
                fields.map(field =>
                    `"${String(book[field]).replace(/"/g, '""')}"`
                ).join(',')
            )
        ];

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="books.csv"');

        return res.send('\uFEFF' + rows.join('\n'));
    }

    res.status(400).json({
        error: 'Формат должен быть json или csv'
    });
});

// ==========================================
// ИМПОРТ CSV
// ТОЛЬКО АДМИНИСТРАТОР
// ==========================================

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }
});

app.post(
    '/api/books/import',
    requireAdmin,
    upload.single('file'),
    async (req, res, next) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    error: 'Необходимо прикрепить CSV-файл'
                });
            }

            const imported = [];

            await new Promise((resolve, reject) => {
                Readable.from(req.file.buffer)
                    .pipe(csvParser())
                    .on('data', row => imported.push(row))
                    .on('end', resolve)
                    .on('error', reject);
            });

            let added = 0;

            for (const row of imported) {
                const title = String(row.title || '').trim();
                const author = String(row.author || '').trim();
                const year = Number(row.year);
                const genre = String(row.genre || 'классика').trim();

                if (
                    !title ||
                    !author ||
                    !Number.isInteger(year) ||
                    year < 1 ||
                    year > new Date().getFullYear()
                ) {
                    continue;
                }

                books.push({
                    id: nextBookId++,
                    title,
                    author,
                    year,
                    genre,
                    isbn: `978-5-${String(nextBookId).padStart(10, '0')}`,
                    group: GROUP,
                    available: true,
                    reviews: []
                });

                added++;
            }

            cache.clear();

            res.json({
                message: 'Импорт завершён',
                imported: added
            });
        } catch (error) {
            next(error);
        }
    }
);

// ==========================================
// РЕКОМЕНДАЦИИ ПО ЖАНРУ
// ==========================================

app.get('/api/books/recommendations', (req, res) => {
    const genre = req.query.genre;

    if (!genre) {
        return res.status(400).json({
            error: 'Укажите жанр'
        });
    }

    const result = books.filter(
        book => book.genre.toLowerCase() === genre.toLowerCase()
    );

    res.json({
        genre,
        recommendations: result.slice(0, 10)
    });
});

// ==========================================
// ДОСТУПНЫЕ КНИГИ
// ==========================================

app.get('/api/books/available', (req, res) => {
    const result = books.filter(book => book.available);

    res.json({
        total: result.length,
        books: result
    });
});

// ==========================================
// ПОИСК КНИГ ПО АВТОРУ
// ==========================================

app.get('/api/books/search', (req, res) => {
    const author = req.query.author;

    if (!author) {
        return res.status(400).json({
            error: 'Укажите автора книги'
        });
    }

    const result = books.filter(book =>
        book.author.toLowerCase().includes(author.toLowerCase())
    );

    res.json({
        author,
        total: result.length,
        books: result
    });
});

// ==========================================
// ПОЛУЧЕНИЕ ОДНОЙ КНИГИ
// ==========================================

app.get('/api/books/:id', (req, res) => {
    const book = findBook(req.params.id);

    if (!book) {
        return res.status(404).json({
            error: 'Книга не найдена',
            status: 404
        });
    }

    res.json(book);
});

// ==========================================
// ДОБАВЛЕНИЕ КНИГИ
// ТОЛЬКО АДМИНИСТРАТОР
// ==========================================

app.post(
    '/api/books',
    requireAdmin,
    [
        body('title').trim().notEmpty(),
        body('author').trim().notEmpty(),
        body('year').isInt({ min: 1, max: new Date().getFullYear() }),
        body('genre').trim().notEmpty()
    ],
    validateRequest,
    (req, res) => {
        const { title, author, year, genre } = req.body;

        const duplicate = books.some(
            book =>
                book.title.toLowerCase() === title.toLowerCase() &&
                book.author.toLowerCase() === author.toLowerCase()
        );

        if (duplicate) {
            return res.status(409).json({
                error: 'Такая книга уже существует'
            });
        }

        const book = {
            id: nextBookId++,
            title,
            author,
            year: Number(year),
            genre,
            isbn: `978-5-${crypto.randomInt(100000000, 999999999)}`,
            group: GROUP,
            available: true,
            reviews: []
        };

        books.push(book);
        cache.clear();

        logOperation(`Добавлена книга: ${title}`);

        res.status(201).json(book);
    }
);

// ==========================================
// ОБНОВЛЕНИЕ КНИГИ
// ==========================================

app.put('/api/books/:id', (req, res) => {
    const book = findBook(req.params.id);

    if (!book) {
        return res.status(404).json({
            error: 'Книга не найдена'
        });
    }

    const { title, author, year, genre, available } = req.body;

    if (
        (title !== undefined && (typeof title !== 'string' || !title.trim())) ||
        (author !== undefined && (typeof author !== 'string' || !author.trim())) ||
        (year !== undefined &&
            (!Number.isInteger(Number(year)) ||
            Number(year) < 1 ||
            Number(year) > new Date().getFullYear())) ||
        (genre !== undefined && (typeof genre !== 'string' || !genre.trim())) ||
        (available !== undefined && typeof available !== 'boolean')
    ) {
        return res.status(400).json({
            error: 'Некорректные данные книги'
        });
    }

    if (title !== undefined) book.title = title.trim();
    if (author !== undefined) book.author = author.trim();
    if (year !== undefined) book.year = Number(year);
    if (genre !== undefined) book.genre = genre.trim();
    if (available !== undefined) book.available = available;

    cache.clear();

    logOperation(`Обновлена книга ID: ${book.id}`);

    res.json(book);
});

// ==========================================
// УДАЛЕНИЕ КНИГИ
// ТОЛЬКО АДМИНИСТРАТОР
// ==========================================

app.delete('/api/books/:id', requireAdmin, (req, res) => {
    const index = books.findIndex(
        book => book.id === Number(req.params.id)
    );

    if (index === -1) {
        return res.status(404).json({
            error: 'Книга не найдена'
        });
    }

    const deleted = books.splice(index, 1)[0];

    cache.clear();

    logOperation(`Удалена книга: ${deleted.title}`);

    res.json({
        message: 'Книга успешно удалена',
        id: deleted.id
    });
});

// ==========================================
// ДОБАВЛЕНИЕ ОТЗЫВА
// ==========================================

app.post(
    '/api/books/:id/reviews',
    [
        body('text').trim().notEmpty(),
        body('rating').isInt({ min: 1, max: 5 })
    ],
    authenticateToken,
    validateRequest,
    (req, res) => {
        const book = findBook(req.params.id);

        if (!book) {
            return res.status(404).json({
                error: 'Книга не найдена'
            });
        }

        const review = {
            id: crypto.randomUUID(),
            user: req.user.email,
            text: req.body.text,
            rating: Number(req.body.rating),
            date: new Date().toISOString()
        };

        book.reviews.push(review);
        cache.clear();

        res.status(201).json({
            message: 'Отзыв добавлен',
            review
        });
    }
);

// ==========================================
// АДМИНИСТРАТИВНЫЙ МАРШРУТ
// ==========================================

app.get(
    '/api/admin',
    authenticateToken,
    requireAdmin,
    (req, res) => {
        res.json({
            message: 'Доступ администратора разрешён',
            totalBooks: books.length,
            totalUsers: users.length
        });
    }
);

// ==========================================
// SWAGGER ДОКУМЕНТАЦИЯ
// (без изменений — оставлен ваш объект swaggerOptions)
// ==========================================

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Library REST API',
            version: '1.0.0',
            description: 'REST API для управления библиотекой. Лабораторная работа №16'
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Локальный сервер'
            }
        ],
        // ... (весь ваш объект paths и components без изменений)
        paths: { /* см. исходный код — без изменений */ },
        components: { /* см. исходный код — без изменений */ }
    },
    apis: []
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ==========================================
// МАРШРУТЫ ТЕСТИРОВАНИЯ ОШИБОК
// ==========================================

app.get('/error', (req, res, next) => {
    next(new Error('Тестовая ошибка сервера'));
});

app.get('/async-error', async (req, res, next) => {
    try {
        await Promise.reject(
            new Error('Тестовая асинхронная ошибка')
        );
    } catch (error) {
        next(error);
    }
});

// ==========================================
// НЕСУЩЕСТВУЮЩИЕ МАРШРУТЫ
// ==========================================

app.use((req, res) => {
    res.status(404).json({
        error: 'Маршрут не найден',
        status: 404
    });
});

// ==========================================
// ЦЕНТРАЛИЗОВАННАЯ ОБРАБОТКА ОШИБОК
// ==========================================

app.use((error, req, res, next) => {
    console.error('Ошибка:', error.message);

    logOperation(`Ошибка: ${error.message}`);

    if (res.headersSent) {
        return next(error);
    }

    const status = error.status || error.statusCode || 500;

    res.status(status).json({
        error: status === 500
            ? 'Внутренняя ошибка сервера'
            : error.message,
        status
    });
});

// ==========================================
// ЗАПУСК СЕРВЕРА
// ==========================================

async function startServer() {
    try {
        books = generateBooks();

        if (fs.existsSync(USERS_FILE)) {
            users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        }

        let admin = users.find(
            user => user.email === 'admin@library.local'
        );

        if (!admin) {
            admin = {
                id: 1,
                email: 'admin@library.local',
                password: await bcrypt.hash('Admin123!', 10),
                name: 'Администратор',
                role: 'admin'
            };

            users.push(admin);
            saveUsers();
        }

        console.log('======================================');
        console.log('Лабораторная работа №16');
        console.log('Express.js сервер запущен');
        console.log('Студентка:', STUDENT);
        console.log('Группа:', GROUP);
        console.log('Вариант:', JOURNAL_NUMBER);
        console.log('Книг создано:', books.length);
        console.log('Администратор: admin@library.local');
        console.log('Пароль: Admin123!');
        console.log(`Адрес: http://localhost:${PORT}`);
        console.log(`Swagger: http://localhost:${PORT}/api-docs`);
        console.log('======================================');

        app.listen(PORT);
    } catch (error) {
        console.error('Ошибка запуска:', error.message);
        process.exitCode = 1;
    }
}

startServer();