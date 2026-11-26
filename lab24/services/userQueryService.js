const Joi = require('joi');

const querySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    group_name: Joi.string().pattern(/^ББМО-\d{2}-\d{2}$/),
    course: Joi.number().integer().min(1).max(4),
    age_min: Joi.number().integer().min(16).max(100),
    age_max: Joi.number().integer().min(16).max(100),
    sort: Joi.string().valid(
        'name', '-name',
        'age', '-age',
        '-created_at'
    )
});

class UserQueryService {
    static async findAll(db, query) {
        const { error, value } = querySchema.validate(query);

        if (error) {
            const err = new Error('Validation failed');
            err.status = 400;
            err.details = error.details.map(item => ({
                field: item.path.join('.'),
                message: item.message
            }));
            throw err;
        }

        const { page, limit, group_name, course, age_min, age_max, sort } = value;

        const filter = {};

        if (group_name) filter.group_name = group_name;
        if (course) filter.course = course;

        if (age_min !== undefined || age_max !== undefined) {
            filter.age = {};
            if (age_min !== undefined) filter.age.$gte = age_min;
            if (age_max !== undefined) filter.age.$lte = age_max;
        }

        const sortFields = {
            name: { name: 1 },
            '-name': { name: -1 },
            age: { age: 1 },
            '-age': { age: -1 },
            '-created_at': { createdAt: -1 }
        };

        const sortOption = sortFields[sort] || { _id: -1 };

        const collection = db.collection('users');

        const total = await collection.countDocuments(filter);

        const data = await collection.find(filter)
            .sort(sortOption)
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        return {
            data,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    }

    static async search(db, query) {
        if (!query || typeof query !== 'string') {
            const error = new Error('Укажите поисковый запрос');
            error.status = 400;
            throw error;
        }

        return db.collection('users').find(
            { $text: { $search: query } },
            { projection: { score: { $meta: 'textScore' } } }
        ).sort({
            score: { $meta: 'textScore' }
        }).toArray();
    }

    static async getStats(db) {
        const collection = db.collection('users');

        const total = await collection.countDocuments();

        const average = await collection.aggregate([
            {
                $group: {
                    _id: null,
                    averageAge: { $avg: '$age' }
                }
            }
        ]).toArray();

        const byGroup = await collection.aggregate([
            {
                $group: {
                    _id: '$group_name',
                    count: { $sum: 1 }
                }
            }
        ]).toArray();

        const byCourse = await collection.aggregate([
            {
                $group: {
                    _id: '$course',
                    count: { $sum: 1 }
                }
            }
        ]).toArray();

        return {
            total,
            averageAge: average.length
                ? Number(average[0].averageAge.toFixed(2))
                : 0,
            byGroup: Object.fromEntries(
                byGroup.map(item => [item._id, item.count])
            ),
            byCourse: Object.fromEntries(
                byCourse.map(item => [String(item._id), item.count])
            )
        };
    }

    static async exportCSV(db) {
        const users = await db.collection('users').find().toArray();

        const escape = value =>
            `"${String(value ?? '').replace(/"/g, '""')}"`;

        const rows = [
            ['ID', 'Name', 'Email', 'Group', 'Age', 'Course'],
            ...users.map(user => [
                user._id,
                user.name,
                user.email,
                user.group_name,
                user.age,
                user.course
            ])
        ];

        return '\uFEFF' + rows
            .map(row => row.map(escape).join(';'))
            .join('\n');
    }
}

module.exports = UserQueryService;