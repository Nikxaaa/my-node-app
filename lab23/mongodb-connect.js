
require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

async function main() {
    const client = new MongoClient(uri);

    try {
        console.log('=== Подключение к MongoDB ===');

        await client.connect();
        console.log('Подключение установлено');

        const db = client.db(dbName);

        await db.command({ ping: 1 });
        console.log('Проверка соединения: успешно');

        const info = await db.admin().command({ buildInfo: 1 });
        console.log('Версия MongoDB:', info.version);
        console.log('База данных:', dbName);

        const databases = await db.admin().listDatabases();

        console.log('\n=== Список баз данных ===');
        databases.databases.forEach(item => {
            console.log('-', item.name);
        });

        const collections = await db.listCollections().toArray();

        console.log('\n=== Коллекции ===');

        if (collections.length === 0) {
            console.log('База пока не содержит коллекций');
        } else {
            collections.forEach(item => console.log('-', item.name));
        }

        console.log('\n=== Heartbeat ===');

        for (let i = 0; i < 3; i++) {
            await db.command({ ping: 1 });
            console.log('[HEARTBEAT] Успешно:', new Date().toISOString());
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        console.log('Соединение стабильно');

    } catch (error) {
        console.error('Ошибка:', error.message);
    } finally {
        await client.close();
        console.log('\nСоединение закрыто');
    }
}

main();
