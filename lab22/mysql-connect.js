
require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
    let connection;

    console.log('=== Одиночное соединение ===');

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('✔ Подключение установлено');

        const [rows] = await connection.execute(`
            SELECT
                VERSION() AS mysql_version,
                DATABASE() AS database_name,
                CURRENT_USER() AS currentUser
        `);

        console.table(rows);
    } catch (error) {
        console.error('Ошибка подключения:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('✖ Соединение закрыто');
        }
    }

    console.log('\n=== Пул соединений ===');

    let pool;

    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        const [rows] = await pool.execute(`
            SELECT
                VERSION() AS mysql_version,
                DATABASE() AS database_name,
                CURRENT_USER() AS currentUser
        `);

        console.table(rows);
        console.log('✔ Пул соединений работает');
    } catch (error) {
        console.error('Ошибка пула:', error.message);
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

testConnection();
