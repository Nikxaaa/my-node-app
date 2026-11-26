const Joi = require('joi');

const userSchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),

    email: Joi.string().email().required(),

    group_name: Joi.string()
        .pattern(/^ББМО-\d{2}-\d{2}$/)
        .required(),

    age: Joi.number().integer().min(16).max(100).required(),

    course: Joi.number().integer().min(1).max(4),

    password: Joi.string().min(6).optional()
});

const updateSchema = Joi.object({
    name: Joi.string().min(2).max(100),
    email: Joi.string().email(),
    group_name: Joi.string().pattern(/^ББМО-\d{2}-\d{2}$/),
    age: Joi.number().integer().min(16).max(100),
    course: Joi.number().integer().min(1).max(4)
}).min(1);

module.exports = (schema) => async (ctx, next) => {
    const { error, value } = schema.validate(ctx.request.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        ctx.status = 400;

        ctx.body = {
            error: 'Validation failed',
            details: error.details.map(item => ({
                field: item.path.join('.'),
                message: item.message
            }))
        };

        return;
    }

    ctx.request.body = value;

    await next();
};

module.exports.userSchema = userSchema;
module.exports.updateSchema = updateSchema;