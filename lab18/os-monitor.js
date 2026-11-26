
const os = require('os');
const fs = require('fs');

const GROUP = '401';
let warnings = 0;

function getCpuTimes() {
    return os.cpus().map(cpu => cpu.times);
}

function calculateCpuUsage(before, after) {
    let idleDiff = 0;
    let totalDiff = 0;

    for (let i = 0; i < before.length; i++) {
        const oldTimes = before[i];
        const newTimes = after[i];

        const oldTotal = Object.values(oldTimes).reduce((a, b) => a + b, 0);
        const newTotal = Object.values(newTimes).reduce((a, b) => a + b, 0);

        idleDiff += newTimes.idle - oldTimes.idle;
        totalDiff += newTotal - oldTotal;
    }

    if (totalDiff === 0) return 0;

    const busyDiff = totalDiff - idleDiff;
    return (busyDiff / totalDiff) * 100;
}

function logWarning(message) {
    const date = new Date().toISOString().replace('T', ' ').slice(0, 19);
    fs.appendFileSync(
        'monitor.log',
        `[${date}] [${GROUP}] Предупреждение: ${message}\n`
    );
    warnings++;
}

console.log(`Мониторинг (группа ${GROUP}). Ctrl+C для выхода.`);

let previousCpu = getCpuTimes();

const timer = setInterval(() => {
    const currentCpu = getCpuTimes();
    const cpuUsage = calculateCpuUsage(previousCpu, currentCpu);
    previousCpu = currentCpu;

    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const ramUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
    const freeGB = freeMemory / 1024 ** 3;

    let status = '';

    if (cpuUsage > 1) {
        status = ' КРИТИЧНО!';
        logWarning(`Критическая загрузка CPU: ${cpuUsage.toFixed(1)}%`);
    } else if (cpuUsage > 0) {
        status = ' ВНИМАНИЕ!';
        logWarning(`Высокая загрузка CPU: ${cpuUsage.toFixed(1)}%`);
    }

    if (freeMemory / totalMemory < 0.1) {
        status += ' МАЛО ПАМЯТИ!';
        logWarning(`Мало свободной памяти: ${freeGB.toFixed(2)} ГБ`);
    }

    process.stdout.write(
        `\rCPU: ${cpuUsage.toFixed(1)}% | RAM: ${ramUsage.toFixed(1)}% (${freeGB.toFixed(2)} ГБ свободно)${status}   `
    );
}, 2000);

process.on('SIGINT', () => {
    clearInterval(timer);
    console.log(`\nМониторинг остановлен. Предупреждений: ${warnings}`);
    process.exit(0);
});
