
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function main() {
    try {
        console.log('=== СОЗДАНИЕ ТАБЛИЦЫ ===');

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS students (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                group_name VARCHAR(20) NOT NULL,
                course INT NOT NULL,
                grade DECIMAL(3,2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB
            DEFAULT CHARSET=utf8mb4
        `);

        console.log('✔ Таблица students создана');

        console.log('\n=== INSERT ===');

        const [single] = await pool.execute(
            `INSERT INTO students (name, group_name, course, grade)
             VALUES (?, ?, ?, ?)`,
            ['Иван', 'ББМО-01-23', 2, 4.50]
        );

        console.log(
            `✔ Вставлен студент: id=${single.insertId}, affectedRows=${single.affectedRows}`
        );

        const [multiple] = await pool.execute(
            `INSERT INTO students (name, group_name, course, grade)
             VALUES (?, ?, ?, ?), (?, ?, ?, ?), (?, ?, ?, ?)`,
            [
                'Мария', 'ББМО-01-23', 2, 3.80,
                'Петр', 'ББМО-01-23', 2, 4.20,
                'Анна', 'ББМО-01-23', 3, 4.70
            ]
        );

        console.log(
            `✔ Вставлено 3 студента: affectedRows=${multiple.affectedRows}`
        );

        console.log('\n=== SELECT ===');

        const [all] = await pool.execute(
            'SELECT * FROM students ORDER BY id'
        );

        console.log('Все студенты:');
        console.table(all);

        const [group] = await pool.execute(
            `SELECT * FROM students
             WHERE group_name = ?
             ORDER BY grade DESC`,
            ['ББМО-01-23']
        );

        console.log('Студенты группы ББМО-01-23 (по оценке):');
        console.table(group);

        const [page] = await pool.execute(
            `SELECT * FROM students
             ORDER BY id
             LIMIT ? OFFSET ?`,
            [2, 0]
        );

        console.log('Пагинация (2 записи):');
        console.table(page);

        console.log('\n=== UPDATE ===');

        const [updated] = await pool.execute(
            'UPDATE students SET grade = ? WHERE id = ?',
            [4.90, single.insertId]
        );

        console.log(
            `✔ Обновление: affectedRows=${updated.affectedRows}, changedRows=${updated.changedRows}`
        );

        const [same] = await pool.execute(
            'UPDATE students SET grade = ? WHERE id = ?',
            [4.90, single.insertId]
        );

        console.log(
            `✔ Повторное обновление: affectedRows=${same.affectedRows}, changedRows=${same.changedRows}`
        );

        console.log('\n=== DELETE ===');

        const [deleted] = await pool.execute(
            'DELETE FROM students WHERE id = ?',
            [single.insertId]
        );

        console.log(
            `✔ Удалён студент: affectedRows=${deleted.affectedRows}`
        );

        console.log('\n=== ЗАЩИТА ОТ SQL-ИНЪЕКЦИИ ===');

        const maliciousInput = "'; DROP TABLE students; --";

        console.log('Попытка инъекции:', maliciousInput);

        const [safeResult] = await pool.execute(
            'SELECT * FROM students WHERE name = ?',
            [maliciousInput]
        );

        console.log(
            `✔ Параметризованный запрос безопасен. Найдено записей: ${safeResult.length}`
        );

        console.log('\n✖ Конкатенация строк могла бы привести к SQL-инъекции');
        console.log('\n✔ Задание 2 выполнено');

    } catch (error) {
        console.error('Ошибка:', error.message);
    } finally {
        await pool.end();
        console.log('\nПул соединений закрыт');
    }
}

main();
