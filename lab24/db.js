const { MongoClient } = require('mongodb');

let client;
let db;

async function connectDB() {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.DB_NAME;

    client = new MongoClient(uri);
    await client.connect();

    db = client.db(dbName);

    console.log('[INFO] MongoDB подключена');

    const users = db.collection('users');

    await users.createIndex(
        { email: 1 },
        { unique: true }
    );

    const indexes = await users.indexes();

    const textIndex = indexes.find(index =>
        Object.values(index.key || {}).includes('text')
    );

    if (textIndex) {
        await users.dropIndex(textIndex.name);
    }

    await users.createIndex({
        name: 'text',
        email: 'text'
    });

    console.log('[INFO] Индексы пользователей созданы');

    return db;
}

function getDB() {
    if (!db) {
        throw new Error('База данных не подключена');
    }

    return db;
}

async function closeDB() {
    if (client) {
        await client.close();
    }
}

module.exports = { connectDB, getDB, closeDB };