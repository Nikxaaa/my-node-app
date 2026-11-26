module.exports = async (ctx, next) => {
    const start = Date.now();

    try {
        await next();
    } finally {
        console.log(
            `[${new Date().toISOString()}] ${ctx.method} ${ctx.url} ` +
            `${ctx.status} ${Date.now() - start}ms`
        );
    }
};