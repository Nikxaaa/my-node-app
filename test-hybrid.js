
const HybridFileManager = require('./hybridOperations');

const manager = new HybridFileManager('./hybrid-data');

async function testHybrid() {
    console.log('=== ТЕСТИРОВАНИЕ ГИБРИДНОГО МОДУЛЯ ===\n');

    try {
        // Работа через колбэк
        console.log('1. Создание файла через callback...');

        await new Promise((resolve, reject) => {
            manager.createFile(
                'callback.txt',
                'Файл создан через колбэк',
                (err, filePath) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    console.log(`Создан: ${filePath}`);
                    resolve();
                }
            );
        });

        // Работа через промис
        console.log('\n2. Создание файла через Promise...');

        const promisePath = await manager.createFile(
            'promise.txt',
            'Файл создан через промис'
        );

        console.log(`Создан: ${promisePath}`);

        // Чтение через колбэк
        console.log('\n3. Чтение через callback...');

        await new Promise((resolve, reject) => {
            manager.readFile('callback.txt', (err, content) => {
                if (err) {
                    reject(err);
                    return;
                }

                console.log(`Содержимое: ${content}`);
                resolve();
            });
        });

        // Чтение через промис
        console.log('\n4. Чтение через Promise...');

        const content = await manager.readFile('promise.txt');

        console.log(`Содержимое: ${content}`);

        // Проверка обработки ошибки
        console.log('\n5. Проверка обработки ошибки...');

        try {
            await manager.readFile('missing.txt');
        } catch (error) {
            console.log(`Ошибка обработана: ${error.message}`);
        }

        // Очистка
        console.log('\n6. Удаление файлов...');

        await manager.deleteFile('callback.txt');
        await manager.deleteFile('promise.txt');

        console.log('Файлы удалены');

        console.log('\nВсе операции завершены успешно!');

    } catch (error) {
        console.error('Ошибка:', error.message);
    }
}

testHybrid();
