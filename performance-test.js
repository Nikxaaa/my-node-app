
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'performance-test.txt');
const ITERATIONS = 1000;

const content = 'Тест производительности Node.js\n';

function measureSync() {
    const start = process.hrtime.bigint();

    for (let i = 0; i < ITERATIONS; i++) {
        fs.writeFileSync(FILE, content);
        fs.readFileSync(FILE, 'utf8');
    }

    const end = process.hrtime.bigint();

    return Number(end - start) / 1e6;
}

function measureCallback() {
    return new Promise((resolve, reject) => {
        let counter = 0;

        const start = process.hrtime.bigint();

        function next() {
            fs.writeFile(FILE, content, (writeError) => {
                if (writeError) {
                    reject(writeError);
                    return;
                }

                fs.readFile(FILE, 'utf8', (readError) => {
                    if (readError) {
                        reject(readError);
                        return;
                    }

                    counter++;

                    if (counter < ITERATIONS) {
                        next();
                    } else {
                        const end = process.hrtime.bigint();

                        resolve(Number(end - start) / 1e6);
                    }
                });
            });
        }

        next();
    });
}

async function measurePromise() {
    const start = process.hrtime.bigint();

    for (let i = 0; i < ITERATIONS; i++) {
        await fs.promises.writeFile(FILE, content);
        await fs.promises.readFile(FILE, 'utf8');
    }

    const end = process.hrtime.bigint();

    return Number(end - start) / 1e6;
}

async function runBenchmark() {
    console.log('=== ИССЛЕДОВАНИЕ ПРОИЗВОДИТЕЛЬНОСТИ ===');
    console.log(`Количество повторений: ${ITERATIONS}\n`);

    try {
        console.log('1. Синхронные операции...');

        const syncTime = measureSync();

        console.log(`Время: ${syncTime.toFixed(2)} мс`);

        console.log('\n2. Асинхронные операции (колбэки)...');

        const callbackTime = await measureCallback();

        console.log(`Время: ${callbackTime.toFixed(2)} мс`);

        console.log('\n3. Асинхронные операции (промисы)...');

        const promiseTime = await measurePromise();

        console.log(`Время: ${promiseTime.toFixed(2)} мс`);

        console.log('\n=== РЕЗУЛЬТАТЫ СРАВНЕНИЯ ===');

        console.log(`Синхронные: ${syncTime.toFixed(2)} мс`);
        console.log(`Колбэки: ${callbackTime.toFixed(2)} мс`);
        console.log(`Промисы: ${promiseTime.toFixed(2)} мс`);

        console.log('\nИсследование завершено!');

    } catch (error) {
        console.error('Ошибка тестирования:', error.message);
    } finally {
        if (fs.existsSync(FILE)) {
            fs.unlinkSync(FILE);
        }
    }
}

runBenchmark();
