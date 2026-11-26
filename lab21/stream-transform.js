
const { Readable, Transform, Writable } = require('stream');

const GROUP = 'ББМО-01-23';

class UpperCaseTransform extends Transform {
    constructor() {
        super();
    }

    _transform(chunk, encoding, callback) {
        const result = `[BBMO-01-23] ${chunk.toString().toUpperCase()}`;
        callback(null, result);
    }
}

class JsonParserTransform extends Transform {
    constructor() {
        super({ writableObjectMode: false, readableObjectMode: true });
    }

    _transform(chunk, encoding, callback) {
        try {
            const object = JSON.parse(chunk.toString());
            callback(null, object);
        } catch (error) {
            callback(error);
        }
    }
}

class FilterTransform extends Transform {
    constructor() {
        super({ objectMode: true });
    }

    _transform(student, encoding, callback) {
        if (student.group === GROUP) {
            callback(null, student);
        } else {
            callback();
        }
    }
}

async function main() {
    console.log('=== UpperCaseTransform ===');

    const upper = new UpperCaseTransform();

    upper.on('data', chunk => {
        console.log('Выход:', chunk.toString());
    });

    upper.write('группа ббмо-01-23');
    upper.write('студент вероника грудская');
    upper.end();

    await new Promise(resolve => upper.on('end', resolve));

    console.log('\n=== JsonParserTransform ===');

    const jsonParser = new JsonParserTransform();

    jsonParser.on('data', object => {
        console.log('[JSON]', object);
    });

    jsonParser.write('{"id":1,"name":"Иван","group":"ББМО-01-23"}');
    jsonParser.write('{"id":2,"name":"Мария","group":"ББМО-02-23"}');
    jsonParser.end();

    await new Promise(resolve => jsonParser.on('end', resolve));

    console.log('\n=== FilterTransform / Object Mode ===');

    const students = [
        { id: 1, name: 'Иван', group: 'ББМО-01-23' },
        { id: 2, name: 'Мария', group: 'ББМО-02-23' },
        { id: 3, name: 'Пётр', group: 'ББМО-01-23' }
    ];

    const readable = Readable.from(students);
    const filter = new FilterTransform();

    const writable = new Writable({
        objectMode: true,
        write(student, encoding, callback) {
            console.log('[OBJECT]', student);
            callback();
        }
    });

    await new Promise((resolve, reject) => {
        readable
            .pipe(filter)
            .pipe(writable)
            .on('finish', resolve)
            .on('error', reject);
    });

    console.log('\n=== Асинхронный итератор ===');

    const asyncReadable = Readable.from([
        'Данные 1',
        'Данные 2',
        'Данные 3'
    ]);

    let index = 0;

    for await (const chunk of asyncReadable) {
        index++;
        console.log(`[ASYNC] Получен чанк ${index}: ${chunk}`);
    }

    console.log('[ASYNC] Поток завершён');

    console.log('\n=== Цепочка Transform ===');

    const chainSource = Readable.from([
        'первая строка',
        'вторая строка',
        'третья строка'
    ]);

    const chainUpper = new UpperCaseTransform();

    const chainWriter = new Writable({
        write(chunk, encoding, callback) {
            console.log('[RESULT]', chunk.toString());
            callback();
        }
    });

    chainSource
        .pipe(chainUpper)
        .pipe(chainWriter)
        .on('finish', () => {
            console.log('✔ Цепочка потоков завершена');
        });
}

main().catch(error => {
    console.error('[ERROR]', error);
});
