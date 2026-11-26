
const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const router = new Router();

const PORT = 3000;

// ==========================================
// ДАННЫЕ СТУДЕНТКИ
// ==========================================

const studentInfo = {
    name: 'Грудская Вероника Сергеевна',
    group: '401',
    journalNumber: 5
};

// ==========================================
// МАССИВ ПОЛЬЗОВАТЕЛЕЙ
// ЗАДАНИЕ 2
// ==========================================

let users = [
    {
        id: 1,
        name: 'Иванов Иван',
        group: 'ББМО-01-23'
    },
    {
        id: 2,
        name: 'Петров Петр',
        group: 'ББМО-02-23'
    },
    {
        id: 3,
        name: 'Сидорова Анна',
        group: 'ББМО-01-23'
    }
];

let nextUserId = 4;

// ==========================================
// ГЕНЕРАЦИЯ СТУДЕНТОВ
// ЗАДАНИЕ 5
// ==========================================

const firstNames = [
    'Анна', 'Александр', 'Мария', 'Дмитрий',
    'Екатерина', 'Иван', 'Анастасия', 'Максим',
    'София', 'Андрей', 'Вероника', 'Никита',
    'Полина', 'Михаил', 'Дарья', 'Артем'
];

const lastNames = [
    'Иванова', 'Петров', 'Сидорова', 'Смирнов',
    'Козлова', 'Попов', 'Новикова', 'Васильев',
    'Морозова', 'Соколов', 'Кузнецова', 'Лебедев',
    'Минчук', 'Грудская', 'Орлова', 'Волков'
];

const groups = [
    'ББМО-01-23',
    'ББМО-02-23',
    'ББМО-03-23',
    'ББМО-04-23',
    'ББМО-05-23'
];

let students = [];

function generateStudents() {
    students = [];

    for (let i = 1; i <= 50; i++) {
        const firstName =
            firstNames[Math.floor(Math.random() * firstNames.length)];

        const lastName =
            lastNames[Math.floor(Math.random() * lastNames.length)];

        const group =
            groups[Math.floor(Math.random() * groups.length)];

        const course = Math.floor(Math.random() * 4) + 1;

        students.push({
            id: i,
            name: `${lastName} ${firstName}`,
            group: group,
            course: course
        });
    }

    console.log('Создано 50 тестовых студентов');
}

// ==========================================
// ЗАДАНИЕ 3. MIDDLEWARE ОБРАБОТКИ ОШИБОК
// ==========================================

app.use(async (ctx, next) => {
    try {
        await next();
    } catch (error) {
        const status = error.status || 500;

        ctx.status = status;

        ctx.body = {
            error: status === 500
                ? 'Внутренняя ошибка сервера'
                : error.message,
            status: status
        };

        console.error('Ошибка сервера:', error.message);
    }
});

// ==========================================
// ЗАДАНИЕ 3. MIDDLEWARE ЛОГИРОВАНИЯ
// ==========================================

app.use(async (ctx, next) => {
    const start = Date.now();
    const startTime = new Date();

    try {
        await next();
    } finally {
        const duration = Date.now() - start;

        console.log(
            `[${startTime.toLocaleString('ru-RU')}] ` +
            `${ctx.method} ${ctx.path} - ${duration}ms`
        );
    }
});

// ==========================================
// ОБРАБОТКА JSON
// ==========================================

app.use(bodyParser());

// ==========================================
// ЗАДАНИЕ 3. MIDDLEWARE АВТОРИЗАЦИИ
// ==========================================

async function authorization(ctx, next) {
    const token = ctx.headers.authorization;

    if (!token) {
        ctx.status = 401;
        ctx.body = {
            error: 'Требуется авторизация',
            status: 401
        };

        return;
    }

    await next();
}

// ==========================================
// ЗАДАНИЕ 1. ГЛАВНАЯ HTML-СТРАНИЦА
// ==========================================

router.get('/', async (ctx) => {
    const date = new Date().toLocaleString('ru-RU');

    ctx.type = 'html';

    ctx.body = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Лабораторная работа №15</title>

        <style>
            body {
                font-family: Arial, sans-serif;
                background: #f1f4f9;
                margin: 0;
                padding: 40px;
            }

            .container {
                max-width: 700px;
                margin: auto;
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }

            h1 {
                color: #243b55;
                text-align: center;
            }

            .info {
                background: #eaf1f8;
                padding: 20px;
                border-radius: 8px;
                line-height: 1.8;
            }

            .welcome {
                text-align: center;
                color: #246b45;
                margin-top: 25px;
                font-size: 18px;
            }
        </style>
    </head>

    <body>
        <div class="container">
            <h1>Лабораторная работа №15</h1>

            <div class="info">
                <p><b>Студентка:</b> ${studentInfo.name}</p>
                <p><b>Группа:</b> ${studentInfo.group}</p>
                <p><b>Номер по журналу:</b> ${studentInfo.journalNumber}</p>
                <p><b>Дата и время:</b> ${date}</p>
            </div>

            <div class="welcome">
                Добро пожаловать на сервер Koa.js!
            </div>
        </div>
    </body>
    </html>
    `;
});

// ==========================================
// ЗАДАНИЕ 2. REST API ПОЛЬЗОВАТЕЛЕЙ
// ==========================================

// GET /api/users
router.get('/api/users', async (ctx) => {
    ctx.body = users;
});

// POST /api/users
router.post('/api/users', async (ctx) => {
    const { name, group } = ctx.request.body;

    if (
        typeof name !== 'string' ||
        !name.trim() ||
        typeof group !== 'string' ||
        !group.trim()
    ) {
        ctx.throw(400, 'Необходимо указать имя и группу');
    }

    const newUser = {
        id: nextUserId++,
        name: name.trim(),
        group: group.trim()
    };

    users.push(newUser);

    ctx.status = 201;
    ctx.body = newUser;
});

// PUT /api/users/:id
router.put('/api/users/:id', async (ctx) => {
    const id = Number(ctx.params.id);

    const user = users.find(item => item.id === id);

    if (!user) {
        ctx.throw(404, 'Пользователь не найден');
    }

    const { name, group } = ctx.request.body;

    if (
        typeof name !== 'string' ||
        !name.trim() ||
        typeof group !== 'string' ||
        !group.trim()
    ) {
        ctx.throw(400, 'Некорректные данные пользователя');
    }

    user.name = name.trim();
    user.group = group.trim();

    ctx.body = user;
});

// DELETE /api/users/:id
router.delete('/api/users/:id', async (ctx) => {
    const id = Number(ctx.params.id);

    const index = users.findIndex(item => item.id === id);

    if (index === -1) {
        ctx.throw(404, 'Пользователь не найден');
    }

    users.splice(index, 1);

    ctx.body = {
        message: 'Пользователь успешно удалён',
        id: id
    };
});

// ==========================================
// ЗАДАНИЕ 3. ЗАЩИЩЁННЫЙ МАРШРУТ
// ==========================================

router.get('/protected', authorization, async (ctx) => {
    ctx.body = {
        message: 'Доступ разрешён',
        student: studentInfo.name
    };
});

// ==========================================
// ЗАДАНИЕ 3. ПРОВЕРКА ОБРАБОТКИ ОШИБОК
// ==========================================

router.get('/error', async (ctx) => {
    ctx.throw(500, 'Тестовая ошибка сервера');
});

// ==========================================
// ЗАДАНИЕ 4 И 5. ПОЛУЧЕНИЕ СТУДЕНТОВ
// ФИЛЬТРАЦИЯ, ПОИСК, СОРТИРОВКА, ПАГИНАЦИЯ
// ==========================================

router.get('/students', async (ctx) => {
    let result = [...students];

    const { group, search, sort } = ctx.query;

    // Фильтрация по группе
    if (group) {
        result = result.filter(
            student => student.group === group
        );
    }

    // Поиск по имени без учёта регистра
    if (search) {
        const query = search.toLowerCase();

        result = result.filter(
            student => student.name.toLowerCase().includes(query)
        );
    }

    // Сортировка
    if (sort) {
        const descending = sort.startsWith('-');
        const field = descending ? sort.slice(1) : sort;

        if (!['name', 'course', 'group', 'id'].includes(field)) {
            ctx.throw(400, 'Недопустимое поле сортировки');
        }

        result.sort((a, b) => {
            let comparison;

            if (typeof a[field] === 'number') {
                comparison = a[field] - b[field];
            } else {
                comparison = String(a[field]).localeCompare(
                    String(b[field]), 'ru'
                );
            }

            return descending ? -comparison : comparison;
        });
    }

    // Количество записей до пагинации
    const total = result.length;

    // Пагинация
    const limit = Number(ctx.query.limit || 10);
    const offset = Number(ctx.query.offset || 0);

    if (
        !Number.isInteger(limit) ||
        !Number.isInteger(offset) ||
        limit < 1 ||
        offset < 0
    ) {
        ctx.throw(400, 'Некорректные параметры пагинации');
    }

    const page = result.slice(offset, offset + limit);

    ctx.body = {
        total: total,
        limit: limit,
        offset: offset,
        students: page
    };
});

// ==========================================
// GET /students/:id
// ПОЛУЧЕНИЕ ОДНОГО СТУДЕНТА
// ==========================================

router.get('/students/:id', async (ctx) => {
    const id = Number(ctx.params.id);

    const student = students.find(
        item => item.id === id
    );

    if (!student) {
        ctx.throw(404, 'Студент не найден');
    }

    ctx.body = student;
});

// ==========================================
// POST /students
// ДОБАВЛЕНИЕ СТУДЕНТА
// ==========================================

router.post('/students', async (ctx) => {
    const { name, group, course } = ctx.request.body;

    if (
        typeof name !== 'string' ||
        !name.trim() ||
        typeof group !== 'string' ||
        !group.trim() ||
        !Number.isInteger(course) ||
        course < 1 ||
        course > 4
    ) {
        ctx.throw(400, 'Необходимо указать имя, группу и курс от 1 до 4');
    }

    const newStudent = {
        id: students.length
            ? Math.max(...students.map(item => item.id)) + 1
            : 1,
        name: name.trim(),
        group: group.trim(),
        course: course
    };

    students.push(newStudent);

    ctx.status = 201;
    ctx.body = newStudent;
});

// ==========================================
// PUT /students/:id
// ОБНОВЛЕНИЕ СТУДЕНТА
// ==========================================

router.put('/students/:id', async (ctx) => {
    const id = Number(ctx.params.id);

    const student = students.find(
        item => item.id === id
    );

    if (!student) {
        ctx.throw(404, 'Студент не найден');
    }

    const { name, group, course } = ctx.request.body;

    if (
        typeof name !== 'string' ||
        !name.trim() ||
        typeof group !== 'string' ||
        !group.trim() ||
        !Number.isInteger(course) ||
        course < 1 ||
        course > 4
    ) {
        ctx.throw(400, 'Некорректные данные студента');
    }

    student.name = name.trim();
    student.group = group.trim();
    student.course = course;

    ctx.body = student;
});

// ==========================================
// DELETE /students/:id
// УДАЛЕНИЕ СТУДЕНТА
// ==========================================

router.delete('/students/:id', async (ctx) => {
    const id = Number(ctx.params.id);

    const index = students.findIndex(
        item => item.id === id
    );

    if (index === -1) {
        ctx.throw(404, 'Студент не найден');
    }

    students.splice(index, 1);

    ctx.body = {
        message: 'Студент успешно удалён',
        id: id
    };
});

// ==========================================
// ПОДКЛЮЧЕНИЕ МАРШРУТОВ
// ==========================================

app.use(router.routes());
app.use(router.allowedMethods());

// ==========================================
// ЗАПУСК СЕРВЕРА
// ==========================================

generateStudents();

app.listen(PORT, () => {
    console.log('===================================');
    console.log('Лабораторная работа №15');
    console.log('Студентка:', studentInfo.name);
    console.log('Группа:', studentInfo.group);
    console.log('Вариант:', studentInfo.journalNumber);
    console.log(`Сервер запущен: http://localhost:${PORT}`);
    console.log('Создано студентов:', students.length);
    console.log('===================================');
});
