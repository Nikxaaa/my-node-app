const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

module.exports = async function authMiddleware(ctx, next) {
    const header = ctx.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        ctx.throw(401, 'Требуется авторизация');
    }

    const token = header.substring(7);

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        if (payload.type === 'refresh') {
            ctx.throw(401, 'Используйте access-токен');
        }

        if (!ObjectId.isValid(payload.sub)) {
            ctx.throw(401, 'Некорректный токен');
        }

        ctx.state.user = {
            id: new ObjectId(payload.sub),
            role: payload.role || 'user'
        };
    } catch (error) {
        if (error.status) throw error;
        ctx.throw(401, 'Недействительный или просроченный токен');
    }

    await next();
};