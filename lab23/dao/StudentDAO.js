const { ObjectId } = require('mongodb');

class StudentDAO {
    constructor(db) {
        this.collection = db.collection('students');
    }

    validate(data, partial = false) {
        if (!partial && (!data.name || !data.group_name || data.grade === undefined)) {
            throw new Error('Необходимо указать name, group_name и grade');
        }

        if (data.name !== undefined && typeof data.name !== 'string') {
            throw new Error('Имя должно быть строкой');
        }

        if (data.group_name !== undefined && typeof data.group_name !== 'string') {
            throw new Error('Группа должна быть строкой');
        }

        if (data.grade !== undefined &&
            (typeof data.grade !== 'number' || data.grade < 0 || data.grade > 10)) {
            throw new Error('Оценка должна быть числом от 0 до 10');
        }
    }

    async create(data) {
        this.validate(data);
        const student = { ...data, createdAt: new Date() };
        const result = await this.collection.insertOne(student);
        return this.findById(result.insertedId);
    }

    async findById(id) {
        if (!ObjectId.isValid(id)) throw new Error('Некорректный ID');
        return this.collection.findOne({ _id: new ObjectId(id) });
    }

    async findAll(options = {}) {
        const page = Math.max(1, Number(options.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(options.limit) || 10));
        const filter = {};

        if (options.group_name) filter.group_name = options.group_name;

        const sort = options.sort === 'name' ? { name: 1 } : { _id: -1 };

        const items = await this.collection.find(filter)
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        return {
            items,
            page,
            limit,
            total: await this.collection.countDocuments(filter)
        };
    }

    async update(id, data) {
        if (!ObjectId.isValid(id)) throw new Error('Некорректный ID');
        this.validate(data, true);

        const result = await this.collection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: data },
            { returnDocument: 'after' }
        );

        return result;
    }

    async delete(id) {
        if (!ObjectId.isValid(id)) throw new Error('Некорректный ID');
        return this.collection.deleteOne({ _id: new ObjectId(id) });
    }

    async search(query) {
        return this.collection.find(
            { $text: { $search: query } },
            { projection: { score: { $meta: 'textScore' } } }
        ).sort({ score: { $meta: 'textScore' } }).toArray();
    }

    async getStats() {
        return this.collection.aggregate([
            {
                $group: {
                    _id: '$group_name',
                    studentsCount: { $sum: 1 },
                    averageGrade: { $avg: '$grade' }
                }
            },
            { $sort: { _id: 1 } }
        ]).toArray();
    }

    async batchCreate(array, session) {
        if (!Array.isArray(array) || array.length === 0) {
            throw new Error('Передайте непустой массив студентов');
        }

        array.forEach(student => this.validate(student));

        const documents = array.map(student => ({
            ...student,
            createdAt: new Date()
        }));

        return this.collection.insertMany(documents, { session });
    }
}

module.exports = StudentDAO;