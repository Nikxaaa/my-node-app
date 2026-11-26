const Router = require('@koa/router');
const Controller = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = new Router({ prefix: '/api/auth' });

router.post('/register', Controller.register);
router.post('/login', Controller.login);
router.post('/refresh', Controller.refresh);
router.get('/me', authMiddleware, Controller.me);

router.get(
    '/admin',
    authMiddleware,
    roleMiddleware('admin'),
    async ctx => {
        ctx.body = {
            message: 'Доступ разрешён',
            user: ctx.state.user
        };
    }
);

module.exports = router;