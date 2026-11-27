
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const readline = require('readline');
const { once } = require('events');

const VARIANT = 5;
const TOTAL_LINES = 100000;
const INPUT = path.join(__dirname, `data_${VARIANT}.txt`);
const OUTPUT = path.join(__dirname, `processed_${VARIANT}.txt`);

async function generateFile() {
    try {
        await fsp.access(INPUT);
        console.log('Файл данных уже существует');
        return;
    } catch {
        console.log('Создание файла со 100 000 строк...');
    }

    const output = fs.createWriteStream(INPUT, {
        encoding: 'utf8',
        highWaterMark: 64 * 1024
    });

    for (let i = 1; i <= TOTAL_LINES; i++) {
        const number = Math.floor(Math.random() * 1000) + 1;
        const line = `${i}, ${number}, Вариант ${VARIANT}\n`;

        if (!output.write(line)) {
            await once(output, 'drain');
        }
    }

    output.end();
    await once(output, 'finish');

    console.log('Файл успешно создан');
}

async function processFile() {
    const stats = await fsp.stat(INPUT);

    console.log(`\nОбработка файла: data_${VARIANT}.txt`);
    console.log(`Размер файла: ${(stats.size / 1024 / 1024).toFixed(2)} МБ`);

    const start = Date.now();

    let count = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    let even = 0;
    let odd = 0;
    let nextProgress = 10;

    const output = fs.createWriteStream(OUTPUT, {
        encoding: 'utf8',
        highWaterMark: 64 * 1024
    });

    const input = fs.createReadStream(INPUT, {
        encoding: 'utf8',
        highWaterMark: 64 * 1024
    });

    const rl = readline.createInterface({
        input,
        crlfDelay: Infinity
    });

    try {
        for await (const line of rl) {
            const parts = line.split(',');
            const number = Number(parts[1]);

            if (!Number.isInteger(number)) {
                continue;
            }

            count++;
            sum += number;

            min = Math.min(min, number);
            max = Math.max(max, number);

            if (number % 2 === 0) {
                even++;
            } else {
                odd++;
            }

            if (count % 1000 === 0) {
                if (!output.write(`${line}\n`)) {
                    await once(output, 'drain');
                }
            }

            const progress = Math.floor(count / TOTAL_LINES * 100);

            if (progress >= nextProgress) {
                console.log(
                    `Прогресс: ${nextProgress}% (${count} строк)`
                );

                nextProgress += 10;
            }
        }

        const average = count > 0 ? sum / count : 0;

        const result = [
            'РЕЗУЛЬТАТЫ ОБРАБОТКИ',
            `Всего строк: ${count}`,
            `Сумма чисел: ${sum}`,
            `Среднее значение: ${average.toFixed(2)}`,
            `Максимальное число: ${max}`,
            `Минимальное число: ${min}`,
            `Чётных чисел: ${even}`,
            `Нечётных чисел: ${odd}`,
            `Вариант: ${VARIANT}`
        ].join('\n');

        if (!output.write('\n' + result + '\n')) {
            await once(output, 'drain');
        }

        output.end();
        await once(output, 'finish');

        console.log('\nОбработка завершена!');
        console.log(result);
        console.log(`\nРезультаты сохранены: processed_${VARIANT}.txt`);
        console.log(`Время выполнения: ${((Date.now() - start) / 1000).toFixed(2)} сек.`);

    } catch (error) {
        output.destroy();
        throw error;
    }
}

async function main() {
    try {
        await generateFile();
        await processFile();
    } catch (error) {
        console.error('Ошибка обработки:', error.message);
    }
}

main();
