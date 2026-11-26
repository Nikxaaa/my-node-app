const Router = require('@koa/router');
const Controller = require('../controllers/userQueryController');

const router = new Router({
    prefix: '/api/users'
});

router.get('/', Controller.getAll);
router.get('/search', Controller.search);
router.get('/stats', Controller.stats);
router.get('/export', Controller.exportCSV);

module.exports = router;