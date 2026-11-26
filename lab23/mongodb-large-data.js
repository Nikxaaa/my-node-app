
const { MongoClient } = require('mongodb');

async function main() {
    const client = new MongoClient('mongodb://localhost:27017');

    try {
        await client.connect();

        const db = client.db('bbmo_01_23');
        const collection = db.collection('large_students');

        const TOTAL = 1000000;
        const BATCH_SIZE = 10000;

        console.log('=== Генерация 1 000 000 документов ===');

        await collection.deleteMany({});

        const startInsert = Date.now();

        for (let start = 0; start < TOTAL; start += BATCH_SIZE) {
            const documents = [];

            for (let i = start; i < Math.min(start + BATCH_SIZE, TOTAL); i++) {
                documents.push({
                    student_id: i + 1,
                    name: `Студент ${i + 1}`,
                    group_name: `ББМО-${(i % 5) + 1}`,
                    grade: (i % 10) + 1
                });
            }

            await collection.insertMany(documents, { ordered: false });

            console.log(`Добавлено: ${Math.min(start + BATCH_SIZE, TOTAL)}`);
        }

        console.log('Время вставки:', Date.now() - startInsert, 'мс');

        // Чтение через курсор
        console.log('\n=== Чтение через курсор ===');

        const memoryBeforeCursor = process.memoryUsage().heapUsed;
        const startCursor = Date.now();

        let cursorCount = 0;
        const cursor = collection.find().batchSize(1000);

        for await (const document of cursor) {
            cursorCount++;
        }

        await cursor.close();

        const cursorTime = Date.now() - startCursor;
        const cursorMemory = process.memoryUsage().heapUsed - memoryBeforeCursor;

        console.log('Прочитано:', cursorCount);
        console.log('Время:', cursorTime, 'мс');
        console.log('Изменение памяти:', (cursorMemory / 1024 / 1024).toFixed(2), 'МБ');

        // Чтение через toArray()
        console.log('\n=== Чтение через toArray() ===');

        const memoryBeforeArray = process.memoryUsage().heapUsed;
        const startArray = Date.now();

        const allDocuments = await collection.find().toArray();

        const arrayTime = Date.now() - startArray;
        const arrayMemory = process.memoryUsage().heapUsed - memoryBeforeArray;

        console.log('Прочитано:', allDocuments.length);
        console.log('Время:', arrayTime, 'мс');
        console.log('Изменение памяти:', (arrayMemory / 1024 / 1024).toFixed(2), 'МБ');

        console.log('\n=== Сравнение ===');
        console.log('Курсор:', cursorTime, 'мс');
        console.log('toArray():', arrayTime, 'мс');

        console.log('\nЭксперимент завершён');

    } catch (error) {
        console.error('Ошибка:', error.message);
    } finally {
        await client.close();
    }
}

main();
