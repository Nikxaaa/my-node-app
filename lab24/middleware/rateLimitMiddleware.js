const requests = new Map();

module.exports = async function rateLimitMiddleware(ctx, next) {
    const ip = ctx.ip;
    const now = Date.now();
    const windowMs = 60 * 1000;
    const maxRequests = 60;

    let data = requests.get(ip);

    if (!data || now - data.start > windowMs) {
        data = { start: now, count: 0 };
    }

    data.count++;
    requests.set(ip, data);

    if (data.count > maxRequests) {
        ctx.status = 429;
        ctx.body = {
            error: 'Слишком много запросов. Повторите позже.'
        };
        return;
    }

    await next();
};