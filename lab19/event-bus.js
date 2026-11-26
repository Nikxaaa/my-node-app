
const EventEmitter = require('events');
const http = require('http');
const os = require('os');

const GROUP = 'ББМО-01-23';

class EventBus extends EventEmitter {
    constructor() {
        super();
        this.events = new Map();
        this.anyListeners = [];
        this.metrics = {};
        this.total = 0;
        this.lastCall = null;
    }

    on(event, listener, priority = 0) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        this.events.get(event).push({
            listener,
            priority,
            once: false
        });

        this.events.get(event).sort((a, b) => b.priority - a.priority);
        return this;
    }

    once(event, listener, priority = 0) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        this.events.get(event).push({
            listener,
            priority,
            once: true
        });

        this.events.get(event).sort((a, b) => b.priority - a.priority);
        return this;
    }

    onAny(listener) {
        this.anyListeners.push(listener);
        return this;
    }

    off(event, listener) {
        const list = this.events.get(event) || [];
        this.events.set(event, list.filter(item => item.listener !== listener));
        return this;
    }

    emit(event, ...args) {
        this.total++;
        this.metrics[event] = (this.metrics[event] || 0) + 1;
        this.lastCall = new Date().toISOString();

        for (const listener of this.anyListeners) {
            listener(event, ...args);
        }

        const list = this.events.get(event) || [];

        for (const item of [...list]) {
            try {
                item.listener(...args);
            } catch (error) {
                console.log(`[ERROR] [${GROUP}] Ошибка в слушателе "${event}": ${error.message}`);
            }

            if (item.once) {
                this.off(event, item.listener);
            }
        }

        return list.length > 0 || this.anyListeners.length > 0;
    }

    getMetrics() {
        const listeners = {};

        for (const [event, list] of this.events) {
            listeners[event] = list.length;
        }

        return {
            group: GROUP,
            events: this.metrics,
            total: this.total,
            lastCall: this.lastCall,
            listeners
        };
    }
}

const bus = new EventBus();

console.log(`=== EventBus (группа ${GROUP}) ===`);

bus.on('priority', () => console.log('[priority 0] Низкий приоритет'), 0);
bus.on('priority', () => console.log('[priority 5] Средний приоритет'), 5);
bus.on('priority', () => console.log('[priority 10] Высокий приоритет'), 10);

console.log('\n--- Приоритеты ---');
bus.emit('priority');

console.log('\n--- Wildcard ---');

bus.onAny((event, ...args) => {
    console.log(`[onAny] Событие "${event}" с аргументами: ${JSON.stringify(args)}`);
});

bus.emit('greet', 'Иван');
bus.emit('info', GROUP);

console.log('\n--- Once-кэш ---');

let onceCount = 0;

bus.once('tick', () => {
    onceCount++;
});

bus.emit('tick');
bus.emit('tick');
bus.emit('tick');

console.log(`once-слушатель вызван: ${onceCount} раз`);

console.log('\n--- Обработка ошибок ---');

bus.on('test', () => {
    throw new Error('Тестовая ошибка');
}, 10);

bus.emit('test');

console.log('\n--- Интеграция с os ---');

bus.emit('system', {
    platform: os.platform(),
    memory: os.totalmem(),
    freeMemory: os.freemem()
});

console.log('\n--- Метрики ---');
console.log(JSON.stringify(bus.getMetrics(), null, 2));

const server = http.createServer((req, res) => {
    bus.emit('request', req.method, req.url);

    if (req.url === '/metrics') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(bus.getMetrics(), null, 2));
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('EventBus server is running');
    }
});

server.listen(3000, () => {
    console.log('\nHTTP-сервер запущен: http://localhost:3000');
    console.log('Метрики: http://localhost:3000/metrics');
});
