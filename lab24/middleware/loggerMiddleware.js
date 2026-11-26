module.exports = async (ctx, next) => {
    const start = Date.now();

    try {
        await next();
    } finally {
        console.log(
            `[${new Date().toISOString()}] ` +
            `[${ctx.method}] ${ctx.url} ` +
            `Status: ${ctx.status} ` +
            `Time: ${Date.now() - start}ms`
        );
    }
};