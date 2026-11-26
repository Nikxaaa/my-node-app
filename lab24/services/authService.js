const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

function createTokens(user) {
    const payload = {
        sub: user._id.toString(),
        role: user.role || 'user'
    };

    return {
        accessToken: jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' }),
        refreshToken: jwt.sign(
            { ...payload, type: 'refresh' },
            REFRESH_SECRET,
            { expiresIn: '7d' }
        )
    };
}

async function register(db, data) {
    const users = db.collection('users');

    const existing = await users.findOne({ email: data.email });

    if (existing) {
        const error = new Error('Пользователь с таким email уже существует');
        error.status = 409;
        throw error;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = {
        name: data.name,
        email: data.email,
        group_name: data.group_name,
        age: data.age,
        course: data.course,
        password: hashedPassword,
        role: 'user',
        created_at: new Date()
    };

    const result = await users.insertOne(user);
    user._id = result.insertedId;

    delete user.password;

    return {
        user,
        ...createTokens(user)
    };
}

async function login(db, email, password) {
    const user = await db.collection('users').findOne({ email });

    if (!user || !user.password) {
        const error = new Error('Неверный email или пароль');
        error.status = 401;
        throw error;
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
        const error = new Error('Неверный email или пароль');
        error.status = 401;
        throw error;
    }

    const safeUser = { ...user };
    delete safeUser.password;

    return {
        user: safeUser,
        ...createTokens(safeUser)
    };
}

async function refresh(db, token) {
    let payload;

    try {
        payload = jwt.verify(token, REFRESH_SECRET);
    } catch {
        const error = new Error('Недействительный или просроченный refresh-токен');
        error.status = 401;
        throw error;
    }

    if (payload.type !== 'refresh') {
        const error = new Error('Неверный тип токена');
        error.status = 401;
        throw error;
    }

    const user = await db.collection('users').findOne(
        { _id: new ObjectId(payload.sub) },
        { projection: { password: 0 } }
    );

    if (!user) {
        const error = new Error('Пользователь не найден');
        error.status = 404;
        throw error;
    }

    return createTokens(user);
}

module.exports = { register, login, refresh };