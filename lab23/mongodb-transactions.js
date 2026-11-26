const { MongoClient } = require('mongodb');

const URI = 'mongodb://localhost:27017';
const DB_NAME = 'bbmo_01_23';

async function main() {
    const client = new MongoClient(URI);

    try {
        await client.connect();

        const db = client.db(DB_NAME);
        const students = db.collection('students');

        console.log('=== РЕПЛИКА-СЕТ ===');

        const status = await db.admin().command({
            replSetGetStatus: 1
        });

        console.log('Replica Set:', status.set);
        console.log('Статус узла:', status.members[0].stateStr);

        await students.createIndex(
            { transaction_id: 1 },
            { unique: true, sparse: true }
        );

        console.log('\n=== УСПЕШНАЯ ТРАНЗАКЦИЯ ===');

        const session = client.startSession();

        try {
            session.startTransaction();

            await students.insertOne({
                name: 'Иван Иванов',
                group_name: 'ББМО-01-23',
                grade: 8,
                transaction_id: 'success_001'
            }, { session });

            await students.insertOne({
                name: 'Мария Петрова',
                group_name: 'ББМО-01-23',
                grade: 9,
                transaction_id: 'success_002'
            }, { session });

            await students.updateOne(
                { transaction_id: 'success_001' },
                { $set: { grade: 10 } },
                { session }
            );

            await session.commitTransaction();
            console.log('Транзакция успешно подтверждена.');

        } catch (error) {
            await session.abortTransaction();
            console.log('Ошибка:', error.message);
        } finally {
            await session.endSession();
        }

        console.log('\n=== ОТКАТ ТРАНЗАКЦИИ ===');

        const rollbackSession = client.startSession();

        try {
            rollbackSession.startTransaction();

            await students.insertOne({
                name: 'Пётр Сидоров',
                group_name: 'ББМО-01-23',
                grade: 7,
                transaction_id: 'rollback_001'
            }, { session: rollbackSession });

            await students.insertOne({
                name: 'Дубликат',
                group_name: 'ББМО-01-23',
                grade: 5,
                transaction_id: 'success_001'
            }, { session: rollbackSession });

            await rollbackSession.commitTransaction();

        } catch (error) {
            await rollbackSession.abortTransaction();
            console.log('Транзакция отменена:', error.message);
        } finally {
            await rollbackSession.endSession();
        }

        const rollbackCheck = await students.findOne({
            transaction_id: 'rollback_001'
        });

        console.log(
            'Запись после отката:',
            rollbackCheck ? 'ОСТАЛАСЬ' : 'ОТСУТСТВУЕТ — ОТКАТ УСПЕШЕН'
        );

        console.log('\n=== CHANGE STREAMS ===');

        const stream = students.watch();

        const streamPromise = (async () => {
            for (let i = 0; i < 3; i++) {
                const change = await stream.next();

                console.log('Событие:', change.operationType);
                console.log('Документ:', change.documentKey);
            }
        })();

        await students.insertOne({
            name: 'Анна Смирнова',
            group_name: 'ББМО-01-23',
            grade: 9
        });

        await students.updateOne(
            { name: 'Анна Смирнова' },
            { $set: { grade: 10 } }
        );

        await students.deleteOne({
            name: 'Анна Смирнова'
        });

        await streamPromise;
        await stream.close();

        console.log('\n=== READ PREFERENCE ===');

        const preferences = [
            'primary',
            'primaryPreferred',
            'secondary',
            'secondaryPreferred',
            'nearest'
        ];

        for (const preference of preferences) {
            try {
                const preferenceDb = client.db(DB_NAME, {
                    readPreference: preference
                });

                const collection = preferenceDb.collection('students');

                const count = await collection.countDocuments();

                console.log(
                    preference + ': успешно, записей — ' + count
                );

            } catch (error) {
                console.log(
                    preference + ': ошибка — ' + error.message
                );
            }
        }

        console.log('\n=== ЗАДАНИЕ 4 ЗАВЕРШЕНО ===');

    } catch (error) {
        console.error('Ошибка:', error);
    } finally {
        await client.close();
    }
}

main();