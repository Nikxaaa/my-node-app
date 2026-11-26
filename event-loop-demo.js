
setTimeout(() => {
    console.log('1. setTimeout');
}, 0);

setImmediate(() => {
    console.log('2. setImmediate');
});

process.nextTick(() => {
    console.log('3. process.nextTick');
});

Promise.resolve().then(() => {
    console.log('4. Promise.then');
});

console.log('5. Синхронный код');

/*
Объяснение порядка выполнения:

1. Сначала выполняется синхронный код.
2. Затем выполняется очередь process.nextTick.
3. После неё выполняются микрозадачи Promise.then.
4. Далее Node.js переходит к обработке таймеров
   и других фаз цикла событий.

setTimeout выполняется в фазе Timers.
setImmediate выполняется в фазе Check.

Порядок setTimeout и setImmediate при запуске
из основного модуля может зависеть от версии Node.js
и условий выполнения.
*/
