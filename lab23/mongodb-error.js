const { MongoClient } = require('mongodb');

async function testConnection() {
    const client = new MongoClient(
        'mongodb://localhost:27099',
        { serverSelectionTimeoutMS: 3000 }
    );

    try {
        console.log('Проверка неправильного URI...');
        await client.connect();
    } catch (error) {
        console.log('[ERROR] Подключение не удалось:', error.message);
        console.log('[ERROR] Код:', error.code);
    } finally {
        await client.close();
        console.log('Проверка завершена');
    }
}

testConnection();