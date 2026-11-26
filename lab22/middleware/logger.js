
const metrics = {
    queries: 0,
    totalTime: 0,
    errors: 0
};

module.exports = async (ctx, next) => {
    const start = Date.now();

    await next();

    const duration = Date.now() - start;

    metrics.queries++;
    metrics.totalTime += duration;

    console.log(
        `[${new Date().toLocaleString()}] [ББМО-01-23] ${ctx.method} ${ctx.url} (${duration}ms)`
    );
};

module.exports.metrics = metrics;
