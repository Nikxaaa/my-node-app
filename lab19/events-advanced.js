
const EventEmitter = require('events');

class PluginManager extends EventEmitter {
    constructor() {
        super();

        this.on('newListener', (event) => {
            if (event !== 'newListener') {
                console.log(`[newListener] Добавлен слушатель "${event}"`);
            }
        });

        this.on('removeListener', (event) => {
            if (event !== 'removeListener') {
                console.log(`[removeListener] Удалён слушатель "${event}"`);
            }
        });
    }

    register(name, callback) {
        this.on(name, callback);
        this.emit('plugin:registered', name);
    }

    remove(name, callback) {
        this.removeListener(name, callback);
        this.emit('plugin:removed', name);
    }
}

const manager = new PluginManager();

console.log('=== Система плагинов ===');

manager.on('plugin:registered', name => {
    console.log(`[PLUGIN] Зарегистрирован: ${name}`);
});

manager.on('plugin:removed', name => {
    console.log(`[PLUGIN] Удалён: ${name}`);
});

const logger = () => console.log('LoggerPlugin работает');
const alert = () => console.log('AlertPlugin работает');

manager.register('LoggerPlugin', logger);
manager.register('AlertPlugin', alert);

manager.on('log', logger);
manager.on('alert', alert);

manager.remove('log', logger);

console.log('\n=== Демонстрация утечки ===');

const leak = new EventEmitter();

for (let i = 0; i < 10; i++) {
    leak.on('data', () => {});
}

console.log('Слушателей до:', leak.listenerCount('data'));

for (let i = 0; i < 1000; i++) {
    leak.on('data', () => {});
}

console.log('Слушателей после добавления 1000:', leak.listenerCount('data'));

leak.removeAllListeners('data');
console.log('Слушателей после removeAllListeners:', leak.listenerCount('data'));

console.log('\n=== Асинхронные слушатели ===');

manager.on('async', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('[BBMO-01-23] async-слушатель завершён через 100ms');
});

manager.emit('async');

setImmediate(() => {
    console.log('[BBMO-01-23] emit вызван (не ждёт async-слушатель)');
});
