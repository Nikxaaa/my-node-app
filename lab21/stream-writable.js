
const { Writable } = require('stream');

const GROUP = 'ББМО-01-23';
const STUDENT = 'Вероника Грудская';

let written = 0;
let index = 0;

const chunks = [
    `Группа: ${GROUP}`,
    `Студент: ${STUDENT}`,
    'Лабораторная работа: №21',
    'Тема: Потоки в Node.js'
];

const writable = new Writable({
    highWaterMark: 16,

    write(chunk, encoding, callback) {
        setTimeout(() => {
            written++;
            console.log(`[WRITE] ${chunk.toString()}`);
            callback();
        }, 200);
    }
});

writable.on('drain', () => {
    console.log('[DRAIN] Буфер освобождён, продолжаем запись');
    writeNext();
});

writable.on('finish', () => {
    console.log('\n[FINISH] Все данные записаны');
    console.log(`Всего записано: ${written} чанка`);
});

writable.on('error', (error) => {
    console.error('[ERROR]', error.message);
});

function writeNext() {
    while (index < chunks.length) {
        const chunk = chunks[index++];
        const canContinue = writable.write(chunk);

        console.log(`write() вернул: ${canContinue}`);

        if (!canContinue) {
            console.log('[BACKPRESSURE] Буфер переполнен!');
            return;
        }
    }

    writable.end();
}

console.log('=== Демонстрация Writable-потока ===\n');
writeNext();
