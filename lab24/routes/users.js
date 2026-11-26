const Router = require('@koa/router');
const UsersController = require('../controllers/users');

const validate = require('../middleware/validationMiddleware');

const router = new Router({
    prefix: '/api/users'
});

router.get('/', UsersController.getAll);

router.get('/:id', UsersController.getById);

router.post(
    '/',
    validate(validate.userSchema),
    UsersController.create
);

router.put(
    '/:id',
    validate(validate.updateSchema),
    UsersController.update
);

router.delete('/:id', UsersController.delete);

module.exports = router;