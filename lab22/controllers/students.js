
const cache = require('../services/cache');

function validate(data) {
    if (!data.name || data.name.trim().length < 2 ||
        data.name.trim().length > 100) {
        throw new Error('Имя должно содержать от 2 до 100 символов');
    }

    if (!/^ББМО-\d{2}-\d{2}$/i.test(data.group_name || '')) {
        throw new Error('Неверный формат группы');
    }

    if (!Number.isInteger(data.course) ||
        data.course < 1 || data.course > 4) {
        throw new Error('Курс должен быть от 1 до 4');
    }

    if (data.grade != null &&
        (Number(data.grade) < 0 || Number(data.grade) > 5)) {
        throw new Error('Оценка должна быть от 0 до 5');
    }
}

exports.findAll = async ctx => {
    const limit = Math.min(Math.max(Number(ctx.query.limit) || 10, 1), 100);
    const offset = Math.max(Number(ctx.query.offset) || 0, 0);
    const key = `students:${limit}:${offset}`;

    const saved = cache.get(key);
    if (saved) {
        ctx.body = saved;
        return;
    }

    const [rows] = await ctx.db.execute(
        'SELECT * FROM students ORDER BY id LIMIT ? OFFSET ?',
        [limit, offset]
    );

    const [count] = await ctx.db.execute(
        'SELECT COUNT(*) AS total FROM students'
    );

    const result = {
        data: rows,
        pagination: {
            total: count[0].total,
            limit,
            offset,
            pages: Math.ceil(count[0].total / limit)
        }
    };

    cache.set(key, result);
    ctx.body = result;
};

exports.findById = async ctx => {
    const [rows] = await ctx.db.execute(
        'SELECT * FROM students WHERE id = ?',
        [ctx.params.id]
    );

    if (!rows.length) {
        ctx.throw(404, 'Студент не найден');
    }

    ctx.body = rows[0];
};

exports.create = async ctx => {
    const data = ctx.request.body;
    validate(data);

    const [result] = await ctx.db.execute(
        `INSERT INTO students (name, group_name, course, grade)
         VALUES (?, ?, ?, ?)`,
        [data.name.trim(), data.group_name, data.course, data.grade ?? null]
    );

    cache.clear();

    ctx.status = 201;
    ctx.body = {
        message: 'Студент создан',
        id: result.insertId
    };
};

exports.update = async ctx => {
    const data = ctx.request.body;
    validate(data);

    const [result] = await ctx.db.execute(
        `UPDATE students
         SET name = ?, group_name = ?, course = ?, grade = ?
         WHERE id = ?`,
        [
            data.name.trim(),
            data.group_name,
            data.course,
            data.grade ?? null,
            ctx.params.id
        ]
    );

    if (!result.affectedRows) {
        ctx.throw(404, 'Студент не найден');
    }

    cache.clear();
    ctx.body = { message: 'Данные студента обновлены' };
};

exports.remove = async ctx => {
    const [result] = await ctx.db.execute(
        'DELETE FROM students WHERE id = ?',
        [ctx.params.id]
    );

    if (!result.affectedRows) {
        ctx.throw(404, 'Студент не найден');
    }

    cache.clear();
    ctx.body = { message: 'Студент удалён' };
};

exports.stats = async ctx => {
    const [summary] = await ctx.db.execute(`
        SELECT COUNT(*) AS total,
               ROUND(AVG(grade), 2) AS averageGrade
        FROM students
    `);

    const [groups] = await ctx.db.execute(`
        SELECT group_name, COUNT(*) AS total
        FROM students GROUP BY group_name
    `);

    ctx.body = {
        total: summary[0].total,
        averageGrade: summary[0].averageGrade,
        byGroup: groups
    };
};

exports.batch = async ctx => {
    const students = ctx.request.body;

    if (!Array.isArray(students) || students.length === 0) {
        ctx.throw(400, 'Ожидается непустой массив студентов');
    }

    if (students.length > 100) {
        ctx.throw(400, 'Максимум 100 студентов за один запрос');
    }

    const connection = await ctx.db.getConnection();

    try {
        await connection.beginTransaction();

        for (const student of students) {
            validate(student);

            await connection.execute(
                `INSERT INTO students (name, group_name, course, grade)
                 VALUES (?, ?, ?, ?)`,
                [
                    student.name.trim(),
                    student.group_name,
                    student.course,
                    student.grade ?? null
                ]
            );
        }

        await connection.commit();
        cache.clear();

        ctx.status = 201;
        ctx.body = {
            created: students.length,
            transaction: 'committed'
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};
