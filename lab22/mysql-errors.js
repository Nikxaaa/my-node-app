
require('dotenv').config();
const mysql = require('mysql2/promise');

let pool;

function createPool() {
    const newPool = mysql.createPool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    newPool.on('connection', () => {
        console.log('[POOL] Новое соединение создано');
    });

    return newPool;
}

async function showErrors() {
    console.log('\n=== ДЕМОНСТРАЦИЯ ОШИБОК ===');

    // Сетевая ошибка
    try {
        const badConnection = await mysql.createConnection({
            host: 'localhost',
            port: 9999,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });
        await badConnection.end();
    } catch (error) {
        console.log(`[${error.code}] Сервер недоступен: localhost:9999`);
    }

    // Ошибка авторизации
    try {
        const badConnection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: 'WrongPassword123',
            database: process.env.DB_NAME
        });
        await badConnection.end();
    } catch (error) {
        console.log(`[${error.code}] Неверный пароль`);
    }

    // Синтаксическая ошибка
    try {
        await pool.query('SELECT * FRM students');
    } catch (error) {
        console.log(`[${error.code}] Синтаксическая ошибка SQL`);
    }

    // Таблица для проверки ограничений
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS errors_demo (
            id INT PRIMARY KEY,
            name VARCHAR(100) NOT NULL
        ) ENGINE=InnoDB
    `);

    await pool.execute('DELETE FROM errors_demo');

    // Дублирование первичного ключа
    await pool.execute(
        'INSERT INTO errors_demo (id, name) VALUES (?, ?)',
        [1, 'Иван']
    );

    try {
        await pool.execute(
            'INSERT INTO errors_demo (id, name) VALUES (?, ?)',
            [1, 'Петр']
        );
    } catch (error) {
        console.log(`[${error.code}] Дублирование ключа`);
    }

    // NULL в обязательном поле
    try {
        await pool.execute(
            'INSERT INTO errors_demo (id, name) VALUES (?, ?)',
            [2, null]
        );
    } catch (error) {
        console.log(`[${error.code}] NULL в NOT NULL столбце`);
    }

    // Нарушение внешнего ключа
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS error_parent (
            id INT PRIMARY KEY
        ) ENGINE=InnoDB
    `);

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS error_child (
            id INT PRIMARY KEY AUTO_INCREMENT,
            parent_id INT,
            FOREIGN KEY (parent_id) REFERENCES error_parent(id)
        ) ENGINE=InnoDB
    `);

    try {
        await pool.execute(
            'INSERT INTO error_child (parent_id) VALUES (?)',
            [999999]
        );
    } catch (error) {
        console.log(`[${error.code}] Нарушение внешнего ключа`);
    }
}

async function createBigData() {
    console.log('\n=== СОЗДАНИЕ 100000 ЗАПИСЕЙ ===');

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS big_data (
            id INT PRIMARY KEY AUTO_INCREMENT,
            value VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB
    `);

    await pool.execute('TRUNCATE TABLE big_data');

    const batchSize = 1000;
    const total = 100000;

    for (let start = 0; start < total; start += batchSize) {
        const values = [];
        const placeholders = [];

        for (let i = start; i < start + batchSize; i++) {
            placeholders.push('( ? )');
            values.push(`Тестовая запись ${i + 1}`);
        }

        await pool.execute(
            `INSERT INTO big_data (value) VALUES ${placeholders.join(',')}`,
            values
        );

        if ((start + batchSize) % 10000 === 0) {
            console.log(
                `[INSERT] Создано: ${start + batchSize} / ${total}`
            );
        }
    }

    console.log('✔ Создано 100000 записей');
}

async function compareMemory() {
    console.log('\n=== СРАВНЕНИЕ ПАМЯТИ ===');

    const before = process.memoryUsage().heapUsed;

    const [rows] = await pool.query(
        'SELECT * FROM big_data'
    );

    const after = process.memoryUsage().heapUsed;

    console.log(`Получено записей: ${rows.length}`);
    console.log(
        `Память после SELECT: ${((after - before) / 1024 / 1024).toFixed(2)} МБ`
    );

    // Освобождаем ссылку на массив перед потоковым чтением
    rows.length = 0;

    if (global.gc) {
        global.gc();
    }

    console.log('\n=== ПОТОКОВОЕ ЧТЕНИЕ ===');

    const connection = await pool.getConnection();
    const streamBefore = process.memoryUsage().heapUsed;

    let count = 0;

    await new Promise((resolve, reject) => {
        const stream = connection.connection.query(
    'SELECT * FROM big_data'
).stream({ highWaterMark: 1000 });

        stream.on('data', () => {
            count++;

            if (count % 10000 === 0) {
                console.log(
                    `[STREAM] Получено: ${count} (${count / 1000}%)`
                );
            }
        });

        stream.on('end', resolve);
        stream.on('error', reject);
    }).finally(() => {
        connection.release();
    });

    const streamAfter = process.memoryUsage().heapUsed;

    console.log(`✔ Поток обработал записей: ${count}`);
    console.log(
        `Изменение heap-памяти: ${((streamAfter - streamBefore) / 1024 / 1024).toFixed(2)} МБ`
    );
}

async function transactionDemo() {
    console.log('\n=== ТРАНЗАКЦИЯ ===');

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS transaction_demo (
            id INT PRIMARY KEY AUTO_INCREMENT,
            code VARCHAR(30) UNIQUE NOT NULL
        ) ENGINE=InnoDB
    `);

    await pool.execute('DELETE FROM transaction_demo');

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();
        console.log('Начало транзакции');

        await connection.execute(
            'INSERT INTO transaction_demo (code) VALUES (?)',
            ['FIRST']
        );
        console.log('✔ INSERT 1 выполнен');

        await connection.execute(
            'INSERT INTO transaction_demo (code) VALUES (?)',
            ['SECOND']
        );
        console.log('✔ INSERT 2 выполнен');

        // Повтор кода FIRST вызовет ошибку уникальности
        await connection.execute(
            'INSERT INTO transaction_demo (code) VALUES (?)',
            ['FIRST']
        );

        await connection.commit();
        console.log('COMMIT выполнен');

    } catch (error) {
        await connection.rollback();
        console.log(`[${error.code}] INSERT 3 не выполнен`);
        console.log('✔ Rollback выполнен');

    } finally {
        connection.release();
        console.log('Соединение возвращено в пул');
    }

    const [rows] = await pool.execute(
        'SELECT * FROM transaction_demo'
    );

    console.log(`Записей после транзакции: ${rows.length}`);
}

async function main() {
    try {
        pool = createPool();

        pool.on('error', error => {
            console.error('[POOL ERROR]', error.code);
        });

        console.log('✔ Пул MySQL создан');

        await showErrors();
        await createBigData();
        await compareMemory();
        await transactionDemo();

        console.log('\n✔ ЗАДАНИЕ 3 ВЫПОЛНЕНО');

    } catch (error) {
        console.error('Ошибка выполнения:', error);
    } finally {
        if (pool) {
            await pool.end();
            console.log('Пул соединений закрыт');
        }
    }
}

main();
