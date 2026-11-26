const Joi = require('joi');
const AuthService = require('../services/authService');

const registerSchema = Joi.object({
    name: Joi.string().min(2).required(),
    email: Joi.string().email().required(),
    group_name: Joi.string().pattern(/^ББМО-\d{2}-\d{2}$/).required(),
    age: Joi.number().integer().min(16).max(100).required(),
    course: Joi.number().integer().min(1).max(4).required(),
    password: Joi.string().min(6).required()
});

async function register(ctx) {
    const { error, value } = registerSchema.validate(ctx.request.body);

    if (error) {
        ctx.status = 400;
        ctx.body = { error: error.details[0].message };
        return;
    }

    ctx.status = 201;
    ctx.body = await AuthService.register(ctx.db, value);
}

async function login(ctx) {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    });

    const { error, value } = schema.validate(ctx.request.body);

    if (error) {
        ctx.status = 400;
        ctx.body = { error: error.details[0].message };
        return;
    }

    ctx.body = await AuthService.login(
        ctx.db,
        value.email,
        value.password
    );
}

async function refresh(ctx) {
    const schema = Joi.object({
        refreshToken: Joi.string().required()
    });

    const { error, value } = schema.validate(ctx.request.body);

    if (error) {
        ctx.status = 400;
        ctx.body = { error: error.details[0].message };
        return;
    }

    ctx.body = await AuthService.refresh(ctx.db, value.refreshToken);
}

async function me(ctx) {
    const user = await ctx.db.collection('users').findOne(
        { _id: ctx.state.user.id },
        { projection: { password: 0 } }
    );

    if (!user) {
        ctx.throw(404, 'Пользователь не найден');
    }

    ctx.body = { user };
}

module.exports = { register, login, refresh, me };