
const os = require('os');

const interfaces = os.networkInterfaces();
let mainInterface = null;

console.log('=== Сетевые интерфейсы ===');

for (const [name, addresses] of Object.entries(interfaces)) {
    console.log('\nИнтерфейс:', name);

    for (const address of addresses) {
        const internal = address.internal;

        let mac = address.mac;
        if (mac && mac !== '00:00:00:00:00:00') {
            mac = mac.split(':').slice(0, 3).join(':') + ':**:**:**';
        }

        console.log('IP:', address.address);
        console.log('Тип:', address.family);
        console.log('MAC:', mac);
        console.log('Внутренний:', internal ? 'да' : 'нет');

        if (!internal && address.family === 'IPv4' && !mainInterface) {
            mainInterface = `${name} (${address.address})`;
        }
    }
}

console.log('\nВсего интерфейсов:', Object.keys(interfaces).length);
console.log('Основной интерфейс:', mainInterface || 'Не найден');

const user = os.userInfo();

console.log('\n=== Информация о пользователе ===');
console.log('Имя пользователя:', user.username);
console.log('Домашняя директория:', user.homedir);
console.log('Оболочка:', user.shell || 'Не определена');

if (process.platform !== 'win32') {
    console.log('UID:', user.uid);
    console.log('GID:', user.gid);
}

console.log('\nГруппа: 401');

if (user.username.toLowerCase() === 'root') {
    console.log('Проверка root: пользователь является root!');
} else {
    console.log('Проверка root: нет');
}
