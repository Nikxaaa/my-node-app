
const { Readable } = require('stream');

const GROUP = 'ББМО-01-23';
const STUDENT = 'Вероника Грудская';

const chunks = [
    `Группа: ${GROUP}`,
    `Студент: ${STUDENT}`,
    'Лабораторная работа: №21',
    'Тема: Потоки в Node.js'
];

let index = 0;
let totalChunks = 0;
let totalBytes = 0;

const readable = new Readable({
    read(size) {
        if (index < chunks.length) {
            const chunk = chunks[index];
            this.push(chunk);
            index++;
        } else {
            this.push(null);
        }
    }
});

console.log('=== Демонстрация Readable-потока ===\n');

readable.on('data', (chunk) => {
    totalChunks++;
    totalBytes += chunk.length;

    console.log(`[CHUNK ${totalChunks}] ${chunk.toString()}`);
});

readable.on('end', () => {
    console.log('\n[END] Поток завершён');
    console.log(`Всего получено чанков: ${totalChunks}`);
    console.log(`Общий размер данных: ${totalBytes} байт`);
});

readable.on('error', (error) => {
    console.error('[ERROR]', error.message);
});
