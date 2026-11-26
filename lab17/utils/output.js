
const chalk = require('chalk');

function success(message) {
    console.error(chalk.green(`✔ ${message}`));
}

function warning(message) {
    console.error(chalk.yellow(`⚠ ${message}`));
}

function error(message) {
    console.error(chalk.red(`✖ Ошибка: ${message}`));
}

function info(message) {
    console.error(chalk.blue(message));
}

function handleError(err) {
    error(err.message);

    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    } else {
        if (err.message === 'CONFIG_NOT_FOUND') {
            console.error('Укажите существующий файл конфигурации через --config.');
        }
    }

    process.exitCode = 1;
}

module.exports = {
    success,
    warning,
    error,
    info,
    handleError
};
