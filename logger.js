
const fs = require('fs');

function setupLogger(app) {

    function writeLog(event, data) {
        const time = new Date().toISOString();

        const message = `[${time}] ${event}: ${JSON.stringify(data)}\r\n`;

        fs.appendFile('logs.txt', message, 'utf8', (err) => {
            if (err) {
                console.error('Ошибка записи лога:', err);
            }
        });
    }

    app.on('server:started', (port) => {
        writeLog('server:started', { port });
    });

    app.on('server:stopped', () => {
        writeLog('server:stopped', 'Сервер остановлен');
    });

    app.on('request:received', (request) => {
        writeLog('request:received', request);
    });
}

module.exports = {
    setupLogger
};
