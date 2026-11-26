
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function migrate() {
    try {
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INT PRIMARY KEY AUTO_INCREMENT,
                filename VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const directory = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(directory)
            .filter(file => file.endsWith('.sql'))
            .sort();

        for (const file of files) {
            const [rows] = await pool.execute(
                'SELECT id FROM migrations WHERE filename = ?',
                [file]
            );

            if (rows.length) {
                console.log(`[SKIP] ${file}`);
                continue;
            }

            const sql = fs.readFileSync(
                path.join(directory, file), 'utf8'
            );

            await pool.query(sql);

            await pool.execute(
                'INSERT INTO migrations (filename) VALUES (?)',
                [file]
            );

            console.log(`[OK] ${file}`);
        }

        console.log('Миграции применены');
    } catch (error) {
        console.error('Ошибка миграции:', error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

migrate();
