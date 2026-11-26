
const os = require('os');

const cpus = os.cpus();
const totalMemory = os.totalmem();
const freeMemory = os.freemem();

const totalGB = totalMemory / 1024 ** 3;
const freeGB = freeMemory / 1024 ** 3;
const usedGB = totalGB - freeGB;
const usedPercent = (usedGB / totalGB) * 100;

const averageSpeed = cpus.reduce((sum, cpu) => sum + cpu.speed, 0) / cpus.length;

console.log('=== Информация о процессоре ===');
console.log('Количество логических ядер:', cpus.length);
console.log('Модель процессора:', cpus[0].model);
console.log('Частоты ядер:', cpus.map(cpu => cpu.speed).join(', '), 'МГц');
console.log('Средняя частота:', averageSpeed.toFixed(0), 'МГц');

console.log('\n=== Информация о памяти ===');
console.log('Общий объём:', totalGB.toFixed(2), 'ГБ');
console.log('Свободно:', freeGB.toFixed(2), 'ГБ');
console.log('Использовано:', usedGB.toFixed(2), 'ГБ');
console.log('Процент использования:', usedPercent.toFixed(1) + '%');

console.log('\nСредняя загрузка системы:');
if (os.platform() === 'win32') {
    console.log('Недоступна для Windows');
} else {
    console.log(os.loadavg());
}

console.log('\nГруппа: 401');

if (freeMemory / totalMemory < 0.2) {
    console.log('ВНИМАНИЕ! Мало свободной оперативной памяти!');
} else {
    console.log('Память в норме');
}
