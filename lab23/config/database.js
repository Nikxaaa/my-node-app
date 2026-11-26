const { MongoClient } = require('mongodb');

async function connectDatabase() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.DB_NAME || 'bbmo_01_23';

    const client = new MongoClient(uri);

    await client.connect();

    console.log('Подключение к MongoDB успешно');

    const db = client.db(dbName);

    return { client, db };
}

module.exports = connectDatabase;