
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

class StudentDAO {
    validate(data) {
        if (data.name !== undefined) {
            if (typeof data.name !== 'string' ||
                data.name.trim().length < 2 ||
                data.name.trim().length > 100) {
                throw new Error('Имя должно содержать от 2 до 100 символов');
            }
        }

        if (data.group_name !== undefined) {
            if (!/^ББМО-\d{2}-\d{2}$/i.test(data.group_name)) {
                throw new Error('group_name не соответствует формату ББМО-XX-XX');
            }
        }

        if (data.course !== undefined) {
            if (!Number.isInteger(data.course) ||
                data.course < 1 || data.course > 4) {
                throw new Error('Курс должен быть целым числом от 1 до 4');
            }
        }

        if (data.grade !== undefined && data.grade !== null) {
            if (typeof data.grade !== 'number' ||
                data.grade < 0 || data.grade > 5) {
                throw new Error('Оценка должна быть от 0 до 5 или NULL');
            }
        }
    }

    async create(data) {
        this.validate(data);

        if (!data.name || !data.group_name || data.course === undefined) {
            throw new Error('Необходимо указать имя, группу и курс');
        }

        const [result] = await pool.execute(
            `INSERT INTO students
             (name, group_name, course, grade)
             VALUES (?, ?, ?, ?)`,
            [
                data.name.trim(),
                data.group_name,
                data.course,
                data.grade ?? null
            ]
        );

        return this.findById(result.insertId);
    }

    async findById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM students WHERE id = ?',
            [id]
        );

        return rows[0] || null;
    }

    async findAll(options = {}) {
        const limit = Math.min(
            Math.max(parseInt(options.limit) || 10, 1),
            100
        );

        const offset = Math.max(parseInt(options.offset) || 0, 0);

        const conditions = [];
        const params = [];

        if (options.group_name) {
            conditions.push('group_name = ?');
            params.push(options.group_name);
        }

        if (options.course !== undefined) {
            conditions.push('course = ?');
            params.push(options.course);
        }

        if (options.grade_min !== undefined) {
            conditions.push('grade >= ?');
            params.push(options.grade_min);
        }

        if (options.grade_max !== undefined) {
            conditions.push('grade <= ?');
            params.push(options.grade_max);
        }

        const where = conditions.length
            ? 'WHERE ' + conditions.join(' AND ')
            : '';

        const sortColumns = {
            name: 'name',
            grade: 'grade',
            created_at: 'created_at'
        };

        const sortColumn =
            sortColumns[options.sort] || 'id';

        const sortOrder =
            String(options.order).toUpperCase() === 'DESC'
                ? 'DESC'
                : 'ASC';

        const [countRows] = await pool.execute(
            `SELECT COUNT(*) AS total FROM students ${where}`,
            params
        );

        const [rows] = await pool.execute(
            `SELECT * FROM students ${where}
             ORDER BY ${sortColumn} ${sortOrder}
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const total = countRows[0].total;

        return {
            data: rows,
            pagination: {
                total,
                limit,
                offset,
                currentPage: Math.floor(offset / limit) + 1,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async update(id, data) {
        this.validate(data);

        const allowedFields = [
            'name',
            'group_name',
            'course',
            'grade'
        ];

        const fields = [];
        const values = [];

        for (const field of allowedFields) {
            if (Object.prototype.hasOwnProperty.call(data, field)) {
                fields.push(`${field} = ?`);
                values.push(
                    typeof data[field] === 'string'
                        ? data[field].trim()
                        : data[field]
                );
            }
        }

        if (fields.length === 0) {
            throw new Error('Нет данных для обновления');
        }

        values.push(id);

        const [result] = await pool.execute(
            `UPDATE students SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        return {
            affectedRows: result.affectedRows,
            changedRows: result.changedRows,
            student: await this.findById(id)
        };
    }

    async delete(id) {
        const [result] = await pool.execute(
            'DELETE FROM students WHERE id = ?',
            [id]
        );

        return result.affectedRows;
    }

    async search(query) {
        const [rows] = await pool.execute(
            'SELECT * FROM students WHERE name LIKE ? ORDER BY name',
            [`%${query}%`]
        );

        return rows;
    }

    async getStats() {
        const [summary] = await pool.execute(`
            SELECT
                COUNT(*) AS total,
                ROUND(AVG(grade), 2) AS averageGrade,
                MIN(grade) AS minGrade,
                MAX(grade) AS maxGrade
            FROM students
        `);

        const [groups] = await pool.execute(`
            SELECT group_name, COUNT(*) AS total
            FROM students
            GROUP BY group_name
        `);

        const [courses] = await pool.execute(`
            SELECT course, COUNT(*) AS total
            FROM students
            GROUP BY course
            ORDER BY course
        `);

        return {
            ...summary[0],
            byGroup: groups,
            byCourse: courses
        };
    }
}

async function main() {
    const dao = new StudentDAO();

    try {
        console.log('=== StudentDAO (ББМО-01-23) ===');

        console.log('\n--- Создание с валидацией ---');

        const student = await dao.create({
            name: 'Вероника Грудская',
            group_name: 'ББМО-01-23',
            course: 2,
            grade: 4.8
        });

        console.log(
            `✔ Создан студент: id=${student.id}, name=${student.name}`
        );

        try {
            await dao.create({
                name: 'А',
                group_name: 'ББМО-01-23',
                course: 2,
                grade: 4.5
            });
        } catch (error) {
            console.log('✖ Ошибка:', error.message);
        }

        try {
            await dao.create({
                name: 'Тестовый студент',
                group_name: 'INVALID',
                course: 2,
                grade: 4.5
            });
        } catch (error) {
            console.log('✖ Ошибка:', error.message);
        }

        console.log('\n--- Поиск по ID ---');

        const found = await dao.findById(student.id);
        console.table(found ? [found] : []);

        console.log('\n--- Пагинация ---');

        const page = await dao.findAll({
            limit: 5,
            offset: 0,
            sort: 'name',
            order: 'ASC'
        });

        console.log('Всего:', page.pagination.total);
        console.log(
            `Страница: ${page.pagination.currentPage}/${page.pagination.totalPages}`
        );
        console.table(page.data);

        console.log('\n--- Фильтры ---');

        const filtered = await dao.findAll({
            group_name: 'ББМО-01-23',
            course: 2
        });

        console.log('Найдено:', filtered.pagination.total);
        console.table(filtered.data);

        const grades = await dao.findAll({
            grade_min: 4,
            grade_max: 5,
            sort: 'grade',
            order: 'DESC'
        });

        console.log('Студенты с оценками от 4 до 5:');
        console.table(grades.data);

        console.log('\n--- Обновление ---');

        const updated = await dao.update(student.id, {
            grade: 5.0
        });

        console.log('Результат обновления:', updated);

        console.log('\n--- Поиск по имени ---');

        const searchResults = await dao.search('Вероника');
        console.table(searchResults);

        console.log('\n--- Удаление ---');

        const deleted = await dao.delete(student.id);
        console.log('Удалено записей:', deleted);

        console.log('\n--- Статистика ---');

        const stats = await dao.getStats();

        console.log('Всего студентов:', stats.total);
        console.log('Средний балл:', stats.averageGrade);
        console.log('Минимальная оценка:', stats.minGrade);
        console.log('Максимальная оценка:', stats.maxGrade);

        console.log('\nПо группам:');
        console.table(stats.byGroup);

        console.log('По курсам:');
        console.table(stats.byCourse);

        console.log('\n✔ ЗАДАНИЕ 4 ВЫПОЛНЕНО');

    } catch (error) {
        console.error('Ошибка:', error.message);
    } finally {
        await pool.end();
        console.log('Соединение с БД закрыто');
    }
}

main();
