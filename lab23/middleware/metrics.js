const metrics = {
    requests: 0,
    errors: 0,
    totalTime: 0
};

module.exports = async (ctx, next) => {
    const start = Date.now();
    metrics.requests++;

    try {
        await next();
    } catch (error) {
        metrics.errors++;
        throw error;
    } finally {
        metrics.totalTime += Date.now() - start;
    }
};

module.exports.getMetrics = () => ({
    requests: metrics.requests,
    errors: metrics.errors,
    averageTime: metrics.requests
        ? Number((metrics.totalTime / metrics.requests).toFixed(2))
        : 0
});