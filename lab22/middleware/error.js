
module.exports = async (ctx, next) => {
    try {
        await next();
    } catch (error) {
        console.error('[ERROR]', error.code || error.message);

        const statuses = {
            ER_DUP_ENTRY: 409,
            ER_NO_REFERENCED_ROW_2: 400,
            ECONNREFUSED: 503
        };

        ctx.status = statuses[error.code] || 500;
        ctx.body = {
            error: error.code || 'INTERNAL_ERROR',
            message: error.message
        };
    }
};
