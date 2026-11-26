
const EventEmitter = require('events');

const emitter = new EventEmitter();

let onCount = 0;
let onceCount = 0;

console.log('=== Сравнение on и once ===');

emitter.on('tick', () => {
    onCount++;
    console.log(`[tick #${onCount}] on-слушатель`);
});

emitter.once('tick', () => {
    onceCount++;
    console.log(`[tick #${onCount}] once-слушатель`);
});

emitter.emit('tick');
emitter.emit('tick');
emitter.emit('tick');

console.log(`\non-слушатель вызван: ${onCount} раза`);
console.log(`once-слушатель вызван: ${onceCount} раз`);

console.log('\n=== Управление подписками ===');

const first = () => console.log('Первый слушатель');
const second = () => console.log('Второй слушатель');
const third = () => console.log('Третий слушатель');

emitter.on('test', first);
emitter.on('test', second);
emitter.on('test', third);

console.log('Слушателей до удаления:', emitter.listenerCount('test'));
console.log('Массив слушателей:', emitter.listeners('test').length);

emitter.removeListener('test', second);
console.log('Слушателей после удаления одного:', emitter.listenerCount('test'));

emitter.removeAllListeners('test');
console.log('Слушателей после removeAllListeners:', emitter.listenerCount('test'));

console.log('\n=== Порядок вызова ===');

const order = new EventEmitter();

order.on('order', () => console.log('1. Первый слушатель (группа ББМО-01-23)'));
order.addListener('order', () => console.log('2. Второй слушатель'));
order.on('order', () => console.log('3. Третий слушатель'));

order.emit('order');
