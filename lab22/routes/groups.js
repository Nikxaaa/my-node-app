
const Router = require('@koa/router');
const controller = require('../controllers/groups');

const router = new Router({ prefix: '/api/groups' });

router.get('/', controller.findAll);
router.post('/', controller.create);
router.get('/:id/students', controller.students);

module.exports = router;
