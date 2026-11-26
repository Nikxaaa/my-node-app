
const os = require('os');

function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    return `${hours} ч ${minutes} мин ${secs} сек`;
}

console.log('=== Информация о системе (группа 401) ===');
console.log('Платформа:', os.platform());
console.log('Тип ОС:', os.type());
console.log('Архитектура:', os.arch());
console.log('Версия ОС:', os.release());
console.log('Имя хоста:', os.hostname());
console.log('Время работы:', formatUptime(os.uptime()));

switch (os.platform()) {
    case 'win32':
        console.log('\nВы работаете в Windows');
        break;
    case 'linux':
        console.log('\nВы работаете в Linux');
        break;
    case 'darwin':
        console.log('\nВы работаете в macOS');
        break;
    default:
        console.log('\nНеизвестная платформа');
}
