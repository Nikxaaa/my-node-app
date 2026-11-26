
const { MongoClient } = require('mongodb');

async function main() {
    const client = new MongoClient('mongodb://localhost:27017');

    try {
        await client.connect();
        console.log('Подключение к MongoDB успешно');

        const db = client.db('bbmo_01_23');
        const students = db.collection('students');

        // 1. Работа с курсором
        console.log('\n=== 1. Работа с курсором ===');

        const cursor = students.find().batchSize(2);

        for await (const student of cursor) {
            console.log(student.name, '| Оценка:', student.grade);
        }

        await cursor.close();

        // 2. Получение данных через toArray()
        console.log('\n=== 2. Получение данных через toArray ===');

        const allStudents = await students.find().toArray();
        console.log('Количество студентов:', allStudents.length);

        // 3. Агрегация: средняя оценка по группам
        console.log('\n=== 3. Агрегация ===');

        const result = await students.aggregate([
            {
                $group: {
                    _id: '$group_name',
                    averageGrade: { $avg: '$grade' },
                    totalStudents: { $sum: 1 }
                }
            },
            {
                $sort: { averageGrade: -1 }
            },
            {
                $project: {
                    _id: 0,
                    group: '$_id',
                    averageGrade: 1,
                    totalStudents: 1
                }
            }
        ]).toArray();

        console.log(result);

        // 4. Фильтрация и ограничение результатов
        console.log('\n=== 4. Фильтрация и LIMIT ===');

        const filtered = await students.aggregate([
            { $match: { grade: { $gte: 8 } } },
            { $sort: { grade: -1 } },
            { $limit: 3 }
        ]).toArray();

        console.log(filtered);

        // 5. Создание текстового индекса
        console.log('\n=== 5. Текстовый поиск ===');

        await students.createIndex({ name: 'text' });

        const textResults = await students.find({
            $text: { $search: 'Иванов' }
        }).toArray();

        console.log(textResults);

        // 6. Проверка индексов
        console.log('\n=== 6. Список индексов ===');

        const indexes = await students.indexes();
        console.log(indexes);

        // 7. Анализ запроса
        console.log('\n=== 7. Explain ===');

        const explanation = await students
            .find({ group_name: 'ББМО-01-23' })
            .explain('executionStats');

        console.log('Количество проверенных документов:',
            explanation.executionStats.totalDocsExamined);

        console.log('Количество найденных документов:',
            explanation.executionStats.nReturned);

    } catch (error) {
        console.error('Ошибка:', error.message);
    } finally {
        await client.close();
        console.log('\nСоединение закрыто');
    }
}

main();
