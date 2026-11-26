const { ObjectId } = require('mongodb');

class User {
    static validate(data, partial = false) {
        const errors = [];

        if (!partial || data.name !== undefined) {
            if (typeof data.name !== 'string' || data.name.trim().length < 2) {
                errors.push({
                    field: 'name',
                    message: 'минимум 2 символа'
                });
            }
        }

        if (!partial || data.email !== undefined) {
            if (
                typeof data.email !== 'string' ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
            ) {
                errors.push({
                    field: 'email',
                    message: 'неверный формат email'
                });
            }
        }

        if (!partial || data.group_name !== undefined) {
            if (
                typeof data.group_name !== 'string' ||
                !/^ББМО-\d{2}-\d{2}$/.test(data.group_name)
            ) {
                errors.push({
                    field: 'group_name',
                    message: 'формат должен быть ББМО-XX-XX'
                });
            }
        }

        if (!partial || data.age !== undefined) {
            if (
                !Number.isInteger(data.age) ||
                data.age < 16 ||
                data.age > 100
            ) {
                errors.push({
                    field: 'age',
                    message: 'возраст должен быть от 16 до 100'
                });
            }
        }

        if (data.course !== undefined &&
            (!Number.isInteger(data.course) || data.course < 1 || data.course > 4)) {
            errors.push({
                field: 'course',
                message: 'курс должен быть от 1 до 4'
            });
        }

        return errors;
    }

    static async findAll(db) {
        return db.collection('users').find().toArray();
    }

    static async findById(db, id) {
        if (!ObjectId.isValid(id)) return null;

        return db.collection('users').findOne({
            _id: new ObjectId(id)
        });
    }

    static async findByEmail(db, email) {
        return db.collection('users').findOne({
            email: email.trim().toLowerCase()
        });
    }

    static async create(db, data) {
        const errors = this.validate(data);

        if (errors.length) {
            const error = new Error('Validation failed');
            error.status = 400;
            error.details = errors;
            throw error;
        }

        const user = {
            name: data.name.trim(),
            email: data.email.trim().toLowerCase(),
            group_name: data.group_name,
            age: data.age,
            course: data.course || 1,
            createdAt: new Date()
        };

        if (data.password) {
            user.password = data.password;
        }

        const result = await db.collection('users').insertOne(user);

        delete user.password;

        return {
            _id: result.insertedId,
            ...user
        };
    }

    static async update(db, id, data) {
        if (!ObjectId.isValid(id)) return null;

        const errors = this.validate(data, true);

        if (errors.length) {
            const error = new Error('Validation failed');
            error.status = 400;
            error.details = errors;
            throw error;
        }

        const updateData = { ...data };

        if (updateData.name) updateData.name = updateData.name.trim();

        if (updateData.email) {
            updateData.email = updateData.email.trim().toLowerCase();
        }

        const result = await db.collection('users').findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        if (result) delete result.password;

        return result;
    }

    static async delete(db, id) {
        if (!ObjectId.isValid(id)) return null;

        return db.collection('users').deleteOne({
            _id: new ObjectId(id)
        });
    }
}

module.exports = User;