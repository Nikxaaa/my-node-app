
const cache = new Map();

let hits = 0;
let misses = 0;

function get(key) {
    const item = cache.get(key);

    if (!item) {
        misses++;
        return null;
    }

    if (Date.now() > item.expires) {
        cache.delete(key);
        misses++;
        return null;
    }

    hits++;
    return item.value;
}

function set(key, value) {
    cache.set(key, {
        value,
        expires: Date.now() + 60000
    });
}

function clear() {
    cache.clear();
}

function stats() {
    return {
        size: cache.size,
        hits,
        misses,
        hitRate: hits + misses
            ? Number((hits / (hits + misses)).toFixed(2))
            : 0
    };
}

module.exports = { get, set, clear, stats };
