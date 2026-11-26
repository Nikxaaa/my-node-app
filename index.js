
const http = require('http');

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

const PORT = 3000;

server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
