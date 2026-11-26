module.exports = function roleMiddleware(...allowedRoles) {
    return async (ctx, next) => {
        if (!ctx.state.user) {
            ctx.throw(401, 'Требуется авторизация');
        }

        if (!allowedRoles.includes(ctx.state.user.role)) {
            ctx.throw(403, 'Недостаточно прав доступа');
        }

        await next();
    };
};




