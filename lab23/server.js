require('dotenv').config();

const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const WebSocket = require('ws');

const connectDatabase = require('./config/database');
const studentSchema = require('./models/student');
const StudentService = require('./services/studentService');
const StudentController = require('./controllers/studentController');
const studentRoutes = require('./routes/studentRoutes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');
const cache = require('./middleware/cache');
const metrics = require('./middleware/metrics');
const startChangeStream = require('./streams/changeStream');

async function start() {
    const { client, db } = await connectDatabase();

    try {
        await db.createCollection('students', {
            validator: studentSchema
        });
        console.log('Коллекция students создана с JSON Schema');
    } catch (error) {
        if (error.codeName !== 'NamespaceExists') throw error;
        await db.command({
            collMod: 'students',
            validator: studentSchema
        });
        console.log('Валидатор students обновлён');
    }

    const studentsCollection = db.collection('students');
const indexes = await studentsCollection.indexes();

const textIndex = indexes.find(index =>
    Object.values(index.key || {}).includes('text')
);

if (textIndex) {
    await studentsCollection.dropIndex(textIndex.name);
}

await studentsCollection.createIndex({
    name: 'text',
    group_name: 'text'
});

    const service = new StudentService(db, client);
    const controller = new StudentController(service);
    const router = studentRoutes(controller);

    const app = new Koa();

    app.use(errorHandler);
    app.use(metrics);
    app.use(logger);
    app.use(cache);
    app.use(bodyParser());

    app.use(router.routes());
    app.use(router.allowedMethods());

    app.use(async ctx => {
        if (ctx.path === '/api/metrics' && ctx.method === 'GET') {
            ctx.body = metrics.getMetrics();
        }
    });

    const server = app.listen(process.env.PORT || 3000, () => {
        console.log(`Koa сервер запущен: http://localhost:${process.env.PORT || 3000}`);
    });

    const wss = new WebSocket.Server({
        port: Number(process.env.WS_PORT) || 3001
    });

    console.log(`WebSocket сервер запущен на порту ${process.env.WS_PORT || 3001}`);

    const changeStream = startChangeStream(db, wss);

    process.on('SIGINT', async () => {
        console.log('\nЗавершение работы...');
        await changeStream.close();
        wss.close();
        server.close();
        await client.close();
        process.exit(0);
    });
}

start().catch(error => {
    console.error('Ошибка запуска:', error);
    process.exit(1);
});