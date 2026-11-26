
const fs = require('fs');
const { Readable, Transform, Writable } = require('stream');
const { pipeline } = require('stream/promises');

const GROUP = 'ББМО-01-23';
const TOTAL = 10000;

const stats = {
    generated: 0,
    validated: 0,
    enriched: 0,
    filtered: 0,
    written: 0,
    errors: 0
};

fs.writeFileSync('errors.log', '');

function logError(message) {
    const line = `[${new Date().toLocaleString('ru-RU')}] [${GROUP}] ${message}\n`;
    fs.appendFileSync('errors.log', line);
}

function generateStudents() {
    return Readable.from((async function* () {
        for (let id = 1; id <= TOTAL; id++) {
            const student = {
                id,
                name: `Студент ${id}`,
                group: GROUP,
                course: (id % 4) + 1,
                grade: id % 100 === 0 ? 2 : 3 + (id % 3)
            };

            // Создаём 13 некорректных записей для проверки
            if (id <= 13) {
                student.name = '';
            }

            stats.generated++;
            yield student;

            if (id % 100 === 0) {
                await new Promise(resolve => setImmediate(resolve));
            }
        }
    })(), {
        objectMode: true,
        highWaterMark: 100
    });
}

class ValidateTransform extends Transform {
    constructor() {
        super({ objectMode: true, highWaterMark: 16 });
    }

    _transform(student, encoding, callback) {
        if (!student.id || !student.name || student.grade < 1 || student.grade > 5) {
            stats.errors++;
            logError(`Ошибка валидации: id=${student.id}, отсутствует имя или некорректная оценка`);
            callback();
            return;
        }

        stats.validated++;
        callback(null, student);
    }
}

class EnrichTransform extends Transform {
    constructor() {
        super({ objectMode: true, highWaterMark: 16 });
    }

    _transform(student, encoding, callback) {
        student.averageGrade = Number((student.grade - 0.2).toFixed(1));
        stats.enriched++;
        callback(null, student);
    }
}

class FilterTransform extends Transform {
    constructor() {
        super({ objectMode: true, highWaterMark: 16 });
    }

    _transform(student, encoding, callback) {
        if (student.grade > 3) {
            stats.filtered++;
            callback(null, student);
        } else {
            callback();
        }
    }
}

class FormatTransform extends Transform {
    constructor() {
        super({ objectMode: true, highWaterMark: 16 });
    }

    _transform(student, encoding, callback) {
        const row = [
            student.id,
            student.name,
            student.group,
            student.course,
            student.grade,
            student.averageGrade
        ].join(',') + '\n';

        callback(null, row);
    }
}

async function runPipeline() {
    console.log('=== Конвейер обработки данных ===');
    console.log(`Группа: ${GROUP}`);
    console.log(`Источник: ${TOTAL} студентов`);
    console.log('Фильтр: оценка > 3\n');

    const start = Date.now();
    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 10000);

    const destination = fs.createWriteStream('students.csv', {
        highWaterMark: 16
    });

    destination.write('id,name,group,course,grade,averageGrade\n');

    destination.on('drain', () => {
        console.log('[DRAIN] Буфер записи освобождён');
    });

    destination.on('error', error => {
        logError(`Ошибка записи файла: ${error.message}`);
    });

    const progress = new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            callback(null, chunk);
        }
    });

    // Счётчик прогресса расположен перед записью CSV
    const counter = new Writable({
        write(chunk, encoding, callback) {
            stats.written++;

            if (stats.written % 1000 === 0) {
                const percent = Math.round(stats.written / TOTAL * 100);
                console.log(`[PROGRESS] ${percent}% | Записано: ${stats.written}`);
            }

            callback();
        }
    });

    // Для подсчёта записей используем отдельный проход через Transform
    const countTransform = new Transform({
        transform(chunk, encoding, callback) {
            stats.written++;
            if (stats.written % 1000 === 0) {
                const percent = Math.round(stats.written / TOTAL * 100);
                console.log(`[PROGRESS] ${percent}% | Записано: ${stats.written}`);
            }
            callback(null, chunk);
        }
    });

    try {
        await pipeline(
            generateStudents(),
            new ValidateTransform(),
            new EnrichTransform(),
            new FilterTransform(),
            new FormatTransform(),
            countTransform,
            destination,
            { signal: controller.signal }
        );
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('✖ Обработка отменена по таймауту');
        } else {
            console.log('✖ Ошибка конвейера:', error.message);
            logError(`Ошибка конвейера: ${error.message}`);
        }
    } finally {
        clearTimeout(timeout);
    }

    const elapsed = (Date.now() - start) / 1000;

    console.log('\n=== Результаты ===');
    console.log('Всего сгенерировано:', stats.generated);
    console.log('Прошло валидацию:', stats.validated);
    console.log('Обогащено:', stats.enriched);
    console.log('Отфильтровано:', stats.filtered);
    console.log('Записано в CSV:', stats.written);
    console.log('Ошибок:', stats.errors);
    console.log('Время выполнения:', elapsed.toFixed(2), 'сек');
    console.log(
        'Средняя скорость:',
        Math.round(stats.generated / Math.max(elapsed, 0.001)),
        'записей/сек'
    );

    console.log('\nФайл: students.csv');
    console.log('Журнал ошибок: errors.log');

    console.log('\n=== Демонстрация backpressure ===');
    console.log('Используется небольшой буфер highWaterMark: 16');
    console.log('Запись выполняется через pipeline() с автоматическим управлением потоком');

    console.log('\n=== Отмена по таймауту ===');
    console.log('Запускаем отдельный поток с таймаутом 1 секунда...');

    const abortController = new AbortController();

    const slowSource = Readable.from(
        (async function* () {
            for (let i = 0; i < 1000; i++) {
                yield `Запись ${i}\n`;
            }
        })()
    );

    const slowTransform = new Transform({
        transform(chunk, encoding, callback) {
            setTimeout(() => callback(null, chunk), 20);
        }
    });

    const slowDestination = new Writable({
        write(chunk, encoding, callback) {
            callback();
        }
    });

    const abortTimer = setTimeout(() => {
        abortController.abort();
    }, 1000);

    try {
        await pipeline(
            slowSource,
            slowTransform,
            slowDestination,
            { signal: abortController.signal }
        );

        console.log('Поток завершился до таймаута');
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('✖ Таймаут! Обработка отменена');
            console.log('✔ Потоки закрыты, ресурсы освобождены');
        } else {
            console.log('Ошибка:', error.message);
        }
    } finally {
        clearTimeout(abortTimer);
    }

    console.log('\n=== Сравнение с async iterator ===');

    const asyncStart = Date.now();
    let asyncCount = 0;

    for await (const student of generateStudents()) {
        if (student.name && student.grade > 3) {
            asyncCount++;
        }
    }

    const asyncTime = (Date.now() - asyncStart) / 1000;

    console.log(`[ASYNC] Обработано записей: ${asyncCount}`);
    console.log(`Время: ${asyncTime.toFixed(2)} сек`);
    console.log('✔ Демонстрация завершена');

    console.log('\nПервые строки students.csv:');
    console.log(
        fs.readFileSync('students.csv', 'utf8')
            .split('\n')
            .slice(0, 5)
            .join('\n')
    );

    console.log('\nПервые строки errors.log:');
    console.log(
        fs.readFileSync('errors.log', 'utf8')
            .split('\n')
            .slice(0, 5)
            .join('\n') || 'Ошибок нет'
    );
}

runPipeline().catch(error => {
    console.error('[FATAL]', error);
});
