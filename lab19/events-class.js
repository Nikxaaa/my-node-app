
const EventEmitter = require('events');

class DatabaseConnection extends EventEmitter {
    connect() {
        console.log('[EVENT] Подключение к БД...');
        this.emit('connect');
    }

    query(sql) {
        console.log(`[EVENT] Выполнение запроса: ${sql}`);
        this.emit('query', sql, '50 записей');
    }

    close() {
        this.emit('close');
    }

    error(message) {
        this.emit('error', new Error(message));
    }
}

const db = new DatabaseConnection();

console.log('=== DatabaseConnection (группа ББМО-01-23) ===');

db.on('connect', () => {
    console.log('[EVENT] Соединение установлено');
});

db.on('query', (sql, result) => {
    console.log(`[EVENT] Результат: ${result}`);
});

db.on('close', () => {
    console.log('[EVENT] Соединение закрыто');
});

db.on('error', (error) => {
    console.log('[EVENT] Ошибка:', error.message);
});

db.connect();
db.query('SELECT * FROM students');
db.query('INSERT INTO students');
db.close();

console.log('\n=== Демонстрация ошибки ===');
db.error('Connection timeout');

console.log('\n=== Демонстрация отсутствия обработчика error ===');

const unsafeDb = new DatabaseConnection();

try {
    unsafeDb.error('Ошибка без слушателя');
} catch (error) {
    console.log('Процесс перехватил исключение:', error.message);
}
