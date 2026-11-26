
exports.findAll = async ctx => {
    const [rows] = await ctx.db.execute(
        'SELECT * FROM student_groups ORDER BY group_name'
    );

    ctx.body = rows;
};

exports.create = async ctx => {
    const { group_name } = ctx.request.body;

    if (!/^ББМО-\d{2}-\d{2}$/i.test(group_name || '')) {
        ctx.throw(400, 'Неверный формат группы');
    }

    const [result] = await ctx.db.execute(
        'INSERT INTO student_groups (group_name) VALUES (?)',
        [group_name]
    );

    ctx.status = 201;
    ctx.body = { id: result.insertId, group_name };
};

exports.students = async ctx => {
    const [rows] = await ctx.db.execute(
        `SELECT * FROM students WHERE group_name = (
            SELECT group_name FROM student_groups WHERE id = ?
        )`,
        [ctx.params.id]
    );

    ctx.body = rows;
};
