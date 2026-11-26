module.exports = (db) => async (ctx, next) => {
    ctx.state.db = db;
    await next();
};