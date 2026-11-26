require('dotenv').config();

const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const helmet = require('koa-helmet');
const cors = require('@koa/cors');

const { connectDB, closeDB } = require('./db');

const usersRouter = require('./routes/users');
const queryRouter = require('./routes/userQueryRoutes');
const authRouter = require('./routes/authRoutes');

const errorMiddleware = require('./middleware/errorMiddleware');
const dbMiddleware = require('./middleware/dbMiddleware');
const loggerMiddleware = require('./middleware/loggerMiddleware');
const rateLimitMiddleware = require('./middleware/rateLimitMiddleware');

const app = new Koa();

app.use(errorMiddleware);
app.use(helmet());
app.use(cors());
app.use(rateLimitMiddleware);

app.use(async (ctx, next) => {
    ctx.set('X-Group', 'BBMO-01-23');
    await next();
});

app.use(loggerMiddleware);
app.use(bodyParser());
app.use(dbMiddleware);

app.use(authRouter.routes());
app.use(authRouter.allowedMethods());

app.use(queryRouter.routes());
app.use(queryRouter.allowedMethods());

app.use(usersRouter.routes());
app.use(usersRouter.allowedMethods());

app.use(async ctx => {
    ctx.status = 404;
    ctx.body = {
        error: 'Route not found',
        status: 404
    };
});

async function start() {
    await connectDB();

    const port = process.env.PORT || 3000;

    const server = app.listen(port, () => {
        console.log(`[INFO] Koa-сервер запущен на порту ${port}`);
        console.log('[INFO] Задание 4 готово');
    });

    process.on('SIGINT', async () => {
        server.close();
        await closeDB();
        process.exit(0);
    });
}

start().catch(error => {
    console.error('[ERROR] Ошибка запуска:', error);
    process.exit(1);
});