
require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

async function start() {
    const client = new MongoClient(uri, {
        heartbeatFrequencyMS: 5000,
        serverSelectionTimeoutMS: 5000
    });

    const topology = client.topology;

    client.on('serverHeartbeatSucceeded', event => {
        console.log('[HEARTBEAT] Успешно:', new Date().toISOString());
    });

    client.on('serverHeartbeatFailed', event => {
        console.log('[HEARTBEAT] Ошибка:', event.failure.message);
    });

    try {
        await client.connect();
        console.log('[INFO] Подключение установлено');

        const db = client.db(dbName);

        for (let i = 0; i < 5; i++) {
            try {
                await db.command({ ping: 1 });
                console.log('[PING] Сервер доступен');
            } catch (error) {
                console.log('[PING] Сервер недоступен:', error.message);
                console.log('[RECONNECT] Повторная попытка подключения...');

                try {
                    await client.close();
                    await client.connect();
                    console.log('[RECONNECT] Подключение восстановлено');
                } catch (reconnectError) {
                    console.log('[RECONNECT] Не удалось подключиться');
                }
            }

            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    } catch (error) {
        console.log('[ERROR]', error.message);
    } finally {
        await client.close();
        console.log('[INFO] Соединение закрыто');
    }
}

start();
