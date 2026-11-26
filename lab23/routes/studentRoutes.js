const Router = require('@koa/router');

module.exports = (controller) => {
    const router = new Router({ prefix: '/api/students' });

    router.get('/', ctx => controller.getAll(ctx));
    router.get('/stats', ctx => controller.stats(ctx));
    router.get('/search', ctx => controller.search(ctx));
    router.get('/:id', ctx => controller.getById(ctx));
    router.post('/', ctx => controller.create(ctx));
    router.post('/batch', ctx => controller.batch(ctx));
    router.put('/:id', ctx => controller.update(ctx));
    router.delete('/:id', ctx => controller.delete(ctx));

    return router;
};