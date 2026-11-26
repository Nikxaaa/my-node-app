
const Router = require('@koa/router');
const controller = require('../controllers/students');

const router = new Router({ prefix: '/api/students' });

router.get('/stats', controller.stats);
router.post('/batch', controller.batch);
router.get('/', controller.findAll);
router.get('/:id', controller.findById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.remove);

module.exports = router;
