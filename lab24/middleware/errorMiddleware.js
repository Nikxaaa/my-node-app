module.exports = async (ctx, next) => {
    try {
        await next();
    } catch (error) {
        ctx.status = error.status || 500;

        ctx.body = {
            error: error.message || 'Internal server error'
        };

        if (error.details) {
            ctx.body.details = error.details;
        }

        if (ctx.status >= 500) {
            console.error('[ERROR]', error);
        }
    }
};