
require('dotenv').config();

const Koa = require('koa');
const bodyParser = require('koa-bodyparser');

const pool = require('./config/db');
const dbMiddleware = require('./middleware/db');
const errorMiddleware = require('./middleware/error');
const logger = require('./middleware/logger');
const cache = require('./services/cache');

const studentsRouter = require('./routes/students');
const groupsRouter = require('./routes/groups');

const app = new Koa();

app.use(errorMiddleware);
app.use(bodyParser({ jsonLimit: '1mb' }));
app.use(dbMiddleware);
app.use(logger);

app.use(studentsRouter.routes());
app.use(studentsRouter.allowedMethods());

app.use(groupsRouter.routes());
app.use(groupsRouter.allowedMethods());

app.use(async ctx => {
    if (ctx.path === '/api/metrics') {
        ctx.body = {
            queries: logger.metrics.queries,
            avgTime: logger.metrics.queries
                ? Number(
                    (logger.metrics.totalTime /
                    logger.metrics.queries).toFixed(2)
                )
                : 0,
            errors: logger.metrics.errors,
            cache: cache.stats()
        };
        return;
    }

    if (ctx.path === '/api/cache/stats') {
        ctx.body = cache.stats();
        return;
    }

    ctx.status = 404;
    ctx.body = { error: 'Маршрут не найден' };
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
    console.log('[INFO] Пул MySQL создан (лимит: 10)');
    console.log('[INFO] Сервер Koa запущен на порту ' + PORT);
    console.log('[INFO] Группа: ББМО-01-23');
});

async function shutdown() {
    server.close();
    await pool.end();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
