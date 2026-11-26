const User = require('../models/user');
const bcrypt = require('bcryptjs');

class UserService {
    static async findAll(db) {
        console.log('[SERVICE] Получение списка пользователей');
        return User.findAll(db);
    }

    static async findById(db, id) {
        console.log('[SERVICE] Поиск пользователя:', id);

        const user = await User.findById(db, id);

        if (!user) {
            const error = new Error('User not found');
            error.status = 404;
            throw error;
        }

        return user;
    }

    static async findByEmail(db, email) {
        return User.findByEmail(db, email);
    }

    static async create(db, data) {
        console.log('[SERVICE] Создание пользователя:', data.email);

        const existingUser = await User.findByEmail(db, data.email);

        if (existingUser) {
            console.log('[SERVICE] Email уже существует');

            const error = new Error('Email already exists');
            error.status = 409;
            throw error;
        }

        const userData = { ...data };

        if (userData.password) {
            userData.password = await bcrypt.hash(userData.password, 10);
        }

        const user = await User.create(db, userData);

        console.log('[SERVICE] Email отправлен:', user.email);

        return user;
    }

    static async update(db, id, data) {
        console.log('[SERVICE] Обновление пользователя:', id);

        if (data.email) {
            const existingUser = await User.findByEmail(db, data.email);

            if (existingUser && existingUser._id.toString() !== id) {
                const error = new Error('Email already exists');
                error.status = 409;
                throw error;
            }
        }

        return User.update(db, id, data);
    }

    static async delete(db, id) {
        console.log('[SERVICE] Удаление пользователя:', id);
        return User.delete(db, id);
    }
}

module.exports = UserService;