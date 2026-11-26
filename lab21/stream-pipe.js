
const fs = require('fs');
const { Transform } = require('stream');
const { pipeline } = require('stream/promises');

const INPUT = 'input.txt';

fs.writeFileSync(
    INPUT,
    'Лабораторная работа №21\nПотоки Node.js\nГруппа ББМО-01-23\n'
);

async function main() {
    console.log('=== Демонстрация pipe() ===');

    await new Promise((resolve) => {
        const source = fs.createReadStream(INPUT);
        const destination = fs.createWriteStream('output-pipe.txt');

        source.pipe(destination);

        destination.on('finish', () => {
            console.log('✔ Копирование через pipe() завершено');
            console.log('Размер:', fs.statSync('output-pipe.txt').size, 'байт');
            resolve();
        });

        source.on('error', (error) => {
            console.log('Ошибка pipe():', error.message);
            resolve();
        });

        destination.on('error', (error) => {
            console.log('Ошибка записи:', error.message);
            resolve();
        });
    });

    console.log('\n=== pipe() с ошибкой ===');

    await new Promise((resolve) => {
        const source = fs.createReadStream('missing.txt');
        const destination = fs.createWriteStream('pipe-error.txt');

        source.pipe(destination);

        source.on('error', (error) => {
            console.log('✖ Ошибка:', error.code);
            console.log('⚠ pipe() самостоятельно не закрывает destination');
            destination.destroy();
            resolve();
        });
    });

    console.log('\n=== Демонстрация pipeline() ===');

    try {
        await pipeline(
            fs.createReadStream(INPUT),
            fs.createWriteStream('output-pipeline.txt')
        );

        console.log('✔ Копирование через pipeline() завершено');
    } catch (error) {
        console.log('Ошибка pipeline():', error.message);
    }

    console.log('\n=== pipeline() с ошибкой ===');

    try {
        await pipeline(
            fs.createReadStream('missing.txt'),
            fs.createWriteStream('pipeline-error.txt')
        );
    } catch (error) {
        console.log('✖ Ошибка:', error.code);
        console.log('✔ Pipeline автоматически закрыл потоки');
    }

    console.log('\n=== Цепочка потоков ===');

    const uppercase = new Transform({
        transform(chunk, encoding, callback) {
            callback(null, chunk.toString().toUpperCase());
        }
    });

    const reverse = new Transform({
        transform(chunk, encoding, callback) {
            callback(null, chunk.toString().split('').reverse().join(''));
        }
    });

    await pipeline(
        fs.createReadStream(INPUT),
        uppercase,
        reverse,
        fs.createWriteStream('output-chain.txt')
    );

    console.log('✔ input.txt → uppercase → reverse → output-chain.txt');

    console.log('\n=== Содержимое файлов ===');
    for (const file of [
        'output-pipe.txt',
        'output-pipeline.txt',
        'output-chain.txt'
    ]) {
        console.log(`\n${file}:`);
        console.log(fs.readFileSync(file, 'utf8'));
    }
}

main().catch(console.error);
