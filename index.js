
const http = require('http');
const EventEmitter = require('events');
const logger = require('./logger');

// Класс HTTP-сервера
class AppServer extends EventEmitter {
    constructor() {
        super();

        this.server = http.createServer((req, res) => {
            this.emit('request:received', {
                url: req.url,
                method: req.method
            });

            // Обработка заказов
            const orderMatch = req.url.match(/^\/order\/(\d+)$/);

            if (req.method === 'GET' && orderMatch) {
                const orderId = orderMatch[1];

                orderHandler.processOrder(orderId);

                res.writeHead(200, {
                    'Content-Type': 'text/plain; charset=utf-8'
                });

                res.end(`Заказ #${orderId} принят в обработку`);
                return;
            }

            res.writeHead(200, {
                'Content-Type': 'text/plain; charset=utf-8'
            });

            res.end('Hello from Event-Driven Server!');
        });

        // Обработчики событий сервера
        this.on('server:started', (port) => {
            console.log(`🚀 Сервер запущен на порту ${port}`);
        });

        this.on('request:received', (request) => {
            console.log(
                `📨 Получен запрос: ${request.method} ${request.url}`
            );
        });

        this.on('server:stopped', () => {
            console.log('🛑 Сервер остановлен');
        });
    }

    start(port) {
        this.server.listen(port, () => {
            this.emit('server:started', port);
        });
    }

    stop() {
        if (this.server.listening) {
            this.server.close(() => {
                this.emit('server:stopped');
            });
        }
    }
}

// Класс обработки заказов
class OrderHandler extends EventEmitter {
    processOrder(orderId) {
        this.emit('order:start', orderId);

        setTimeout(() => {
            this.emit('order:processing', 'Идёт обработка...');

            setTimeout(() => {
                const sum = Math.floor(Math.random() * 901) + 100;

                this.emit('order:complete', {
                    orderId,
                    sum
                });
            }, 2000);

        }, 2000);
    }
}

// Вычисление числа Пи без сторонних библиотек
function calculatePi(digits = 7) {
    const precision = 30;
    const scale = 10n ** BigInt(precision);

    function arctan(inverse) {
        const q = BigInt(inverse);
        let result = 0n;
        let k = 0n;

        while (true) {
            const denominator = (2n * k + 1n) *
                (q ** (2n * k + 1n));

            const term = scale / denominator;

            if (term === 0n) {
                break;
            }

            if (k % 2n === 0n) {
                result += term;
            } else {
                result -= term;
            }

            k++;
        }

        return result;
    }

    const pi = 16n * arctan(5) - 4n * arctan(239);

    const divisor = 10n ** BigInt(precision - digits);
    const value = pi / divisor;

    const integerPart = value / (10n ** BigInt(digits));
    const fractionalPart = value % (10n ** BigInt(digits));

    return `${integerPart}.${fractionalPart
        .toString()
        .padStart(digits, '0')}`;
}

// Создание обработчика заказов
const orderHandler = new OrderHandler();

orderHandler.on('order:start', (orderId) => {
    console.log(`Заказ #${orderId} начат`);
function calculatePi(digits) {
    let pi = 0;
    let sign = 1;

    for (let i = 0; i < 100000; i++) {
        pi += sign * 4 / (2 * i + 1);
        sign *= -1;
    }

    return pi.toFixed(digits);
}

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

    res.end(`
        <h1>Грудская Вероника Сергеевна</h1>
        <h2>Группа: 401</h2>
        <h2>Число Пи: ${calculatePi(5)}</h2>
    `);
});

orderHandler.on('order:processing', (message) => {
    console.log(message);
});

orderHandler.on('order:complete', ({ orderId, sum }) => {
    const pi = calculatePi(7);

    console.log(
        `💰 Заказ #${orderId} завершён на сумму ${sum} руб. PI = ${pi}`
    );
});

// Подключение логирования
const app = new AppServer();

logger.setupLogger(app);

// Создание собственного события пользователя
class UserTracker extends EventEmitter {
    trackAction(userId, action, metadata) {
        this.emit('user:action', {
            userId: userId,
            action: action,
            timestamp: new Date().toISOString(),
            metadata: metadata,
            id: Math.random().toString(36).substr(2, 9)
        });
    }
}

const tracker = new UserTracker();

tracker.on('user:action', (event) => {
    console.log(`
👤 Пользователь ${event.userId} совершил действие "${event.action}"
    Время: ${event.timestamp}
    ID события: ${event.id}
    Доп. данные: ${JSON.stringify(event.metadata)}
    `);
});

// Тестовые вызовы
tracker.trackAction(1, 'Вход в систему', {
    browser: 'Chrome',
    group: '401'
});

tracker.trackAction(2, 'Просмотр заказа', {
    orderId: 42,
    status: 'Новый'
});

// Запуск сервера
app.start(3000);

// Эмуляция остановки через 10 секунд
setTimeout(() => {
    app.stop();
}, 10000);
