const UserService = require('../services/userService');

class UsersController {
    static async getAll(ctx) {
        const users = await UserService.findAll(ctx.db);

        ctx.body = {
            data: users
        };
    }

    static async getById(ctx) {
        const user = await UserService.findById(ctx.db, ctx.params.id);

        ctx.body = {
            data: user
        };
    }

    static async create(ctx) {
        const user = await UserService.create(ctx.db, ctx.request.body);

        ctx.status = 201;
        ctx.body = {
            data: user
        };
    }

    static async update(ctx) {
        const user = await UserService.update(
            ctx.db,
            ctx.params.id,
            ctx.request.body
        );

        if (!user) {
            ctx.throw(404, 'User not found');
        }

        ctx.body = {
            data: user
        };
    }

    static async delete(ctx) {
        const result = await UserService.delete(ctx.db, ctx.params.id);

        if (!result || !result.deletedCount) {
            ctx.throw(404, 'User not found');
        }

        ctx.body = {
            data: {
                message: 'User deleted successfully'
            }
        };
    }
}

module.exports = UsersController;