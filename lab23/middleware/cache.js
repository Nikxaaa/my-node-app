const cache = new Map();
const TTL = 60 * 1000;

module.exports = async (ctx, next) => {
    if (ctx.method === 'GET') {
        const cached = cache.get(ctx.url);

        if (cached && cached.expires > Date.now()) {
            ctx.body = cached.body;
            ctx.set('X-Cache', 'HIT');
            return;
        }

        await next();

        if (ctx.status === 200) {
            cache.set(ctx.url, {
                body: ctx.body,
                expires: Date.now() + TTL
            });
        }

        ctx.set('X-Cache', 'MISS');
    } else {
        await next();
        cache.clear();
    }
};

module.exports.clear = () => cache.clear();