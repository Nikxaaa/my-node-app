const UserQueryService = require('../services/userQueryService');

class UserQueryController {
    static async getAll(ctx) {
        ctx.body = await UserQueryService.findAll(ctx.db, ctx.query);
    }

    static async search(ctx) {
        const query = ctx.query.q;

        const data = await UserQueryService.search(ctx.db, query);

        ctx.body = {
            found: data.length,
            data
        };
    }

    static async stats(ctx) {
        ctx.body = await UserQueryService.getStats(ctx.db);
    }

    static async exportCSV(ctx) {
        const csv = await UserQueryService.exportCSV(ctx.db);

        ctx.type = 'text/csv; charset=utf-8';
        ctx.set('Content-Disposition', 'attachment; filename="users.csv"');
        ctx.body = csv;
    }
}

module.exports = UserQueryController;