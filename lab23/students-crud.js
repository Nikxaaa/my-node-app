
require('dotenv').config();
const { MongoClient } = require('mongodb');

async function main() {
    const client = new MongoClient('mongodb://localhost:27017');

    try {
        await client.connect();
        console.log('Подключение к MongoDB успешно');

        const db = client.db('bbmo_01_23');
        const students = db.collection('students');

        // Создание индекса
        await students.createIndex({ group_name: 1 });
        console.log('Индекс group_name создан');

        // Добавление одного студента
        const oneStudent = await students.insertOne({
            name: 'Иванов Иван',
            group_name: 'ББМО-01-23',
            course: 3,
            grade: 8,
            created_at: new Date()
        });

        console.log('Добавлен студент:', oneStudent.insertedId);

        // Добавление нескольких студентов
        const manyStudents = await students.insertMany([
            {
                name: 'Петров Петр',
                group_name: 'ББМО-01-23',
                course: 3,
                grade: 9,
                created_at: new Date()
            },
            {
                name: 'Сидоров Алексей',
                group_name: 'ББМО-02-23',
                course: 3,
                grade: 7,
                created_at: new Date()
            },
            {
                name: 'Козлова Анна',
                group_name: 'ББМО-01-23',
                course: 3,
                grade: 10,
                created_at: new Date()
            }
        ]);

        console.log('Добавлено студентов:', manyStudents.insertedCount);

        // Вывод всех студентов
        console.log('\n=== Все студенты ===');
        const allStudents = await students.find().toArray();
        console.log(allStudents);

        // Поиск по группе
        console.log('\n=== Студенты группы ББМО-01-23 ===');
        const groupStudents = await students
            .find({ group_name: 'ББМО-01-23' })
            .toArray();
        console.log(groupStudents);

        // Сортировка по оценке
        console.log('\n=== Сортировка по оценке ===');
        const sortedStudents = await students
            .find()
            .sort({ grade: -1 })
            .toArray();
        console.log(sortedStudents);

        // Пагинация
        console.log('\n=== Пагинация ===');
        const page = await students
            .find()
            .skip(0)
            .limit(2)
            .toArray();
        console.log(page);

        // Поиск одного студента
        console.log('\n=== Поиск одного студента ===');
        const student = await students.findOne({
            name: 'Иванов Иван'
        });
        console.log(student);

        // Обновление одного документа
        const updateOne = await students.updateOne(
            { name: 'Иванов Иван' },
            { $set: { grade: 9 } }
        );
        console.log('\nОбновлено документов:', updateOne.modifiedCount);

        // Обновление нескольких документов
        const updateMany = await students.updateMany(
            { group_name: 'ББМО-01-23' },
            { $set: { course: 4 } }
        );
        console.log('Массово обновлено:', updateMany.modifiedCount);

        // Удаление одного документа
        const deleteOne = await students.deleteOne({
            name: 'Сидоров Алексей'
        });
        console.log('Удалено документов:', deleteOne.deletedCount);

        // Проекция: вывод только имени и оценки
        console.log('\n=== Проекция ===');
        const projection = await students.find(
            {},
            { projection: { _id: 0, name: 1, grade: 1 } }
        ).toArray();
        console.log(projection);

    } catch (error) {
        console.error('Ошибка:', error.message);
    } finally {
        await client.close();
        console.log('\nСоединение закрыто');
    }
}

main();
