
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');
const crypto = require('crypto');

const VARIANT = 5;
const SOURCE = path.join(__dirname, `source_${VARIANT}`);
const BACKUP = path.join(__dirname, `backup_${VARIANT}`);
const CHUNK_SIZE = 512 * 1024;

const fileDefinitions = [
    ['document.txt', 'txt', 2000],
    ['notes.txt', 'txt', 5000],
    ['readme.txt', 'txt', 3000],
    ['script.js', 'js', 4000],
    ['server.js', 'js', 6000],
    ['config.json', 'json', 3000],
    ['users.json', 'json', 5000],
    ['data.json', 'json', 7000],
    ['photo.jpg', 'jpg', 10000],
    ['picture.png', 'png', 12000],
    ['animation.gif', 'gif', 8000],
    ['report.txt', 'txt', 20000],
    ['large.txt', 'txt', 1100000],
    ['large.js', 'js', 1200000],
    ['image2.jpg', 'jpg', 15000],
    ['style.css', 'css', 5000],
    ['page.html', 'html', 7000],
    ['table.csv', 'csv', 9000],
    ['icon.png', 'png', 4000],
    ['data.xml', 'xml', 6000]
];

function createTextContent(name, size) {
    const line = `  Файл ${name}   создан для лабораторной работы  `;
    const buffer = Buffer.from(line + '\n', 'utf8');

    const result = Buffer.alloc(size);

    for (let i = 0; i < size; i += buffer.length) {
        buffer.copy(result, i, 0, Math.min(buffer.length, size - i));
    }

    return result;
}

async function createSource() {
    await fsp.rm(SOURCE, { recursive: true, force: true });
    await fsp.mkdir(SOURCE, { recursive: true });

    const manifest = [];

    for (const [name, extension, size] of fileDefinitions) {
        const content = createTextContent(name, size);
        const filePath = path.join(SOURCE, name);

        await fsp.writeFile(filePath, content);

        manifest.push({
            name,
            extension,
            size: content.length
        });
    }

    const folders = ['documents', 'scripts', 'images'];

    for (const folder of folders) {
        await fsp.mkdir(path.join(SOURCE, folder), {
            recursive: true
        });

        const filePath = path.join(
            SOURCE,
            folder,
            `inside_${folder}.txt`
        );

        await fsp.writeFile(
            filePath,
            `Файл внутри папки ${folder}`,
            'utf8'
        );

        manifest.push({
            name: `${folder}/inside_${folder}.txt`,
            extension: '.txt',
            size: (await fsp.stat(filePath)).size
        });
    }

    await fsp.writeFile(
        path.join(SOURCE, 'manifest.json'),
        JSON.stringify(manifest, null, 2),
        'utf8'
    );

    console.log('Создана исходная структура');
    console.log(`Файлов по описанию: ${manifest.length + 1}`);
}

async function getFiles(directory, base = directory) {
    const result = [];
    const entries = await fsp.readdir(directory, {
        withFileTypes: true
    });

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            result.push(...await getFiles(fullPath, base));
        } else {
            result.push(path.relative(base, fullPath));
        }
    }

    return result;
}

function whitespaceTransform() {
    let pending = '';

    return new Transform({
        transform(chunk, encoding, callback) {
            const text = pending + chunk.toString('utf8');
            const lastNewline = text.lastIndexOf('\n');

            if (lastNewline === -1) {
                pending = text;
                callback();
                return;
            }

            const complete = text.slice(0, lastNewline + 1);
            pending = text.slice(lastNewline + 1);

            callback(null, complete.replace(/[ \t]+/g, ' '));
        },

        flush(callback) {
            callback(null, pending.replace(/[ \t]+/g, ' '));
        }
    });
}

async function copyFile(sourcePath, targetPath) {
    await fsp.mkdir(path.dirname(targetPath), {
        recursive: true
    });

    const extension = path.extname(sourcePath).toLowerCase();
    const stats = await fsp.stat(sourcePath);

    const streamExtensions = ['.txt', '.js', '.json'];

    if (streamExtensions.includes(extension)) {
        const streams = [
            fs.createReadStream(sourcePath, {
                highWaterMark: CHUNK_SIZE
            })
        ];

        // Вариант 5: удаляем лишние пробелы в текстовых файлах
        streams.push(whitespaceTransform());

        streams.push(
            fs.createWriteStream(targetPath, {
                highWaterMark: CHUNK_SIZE
            })
        );

        await pipeline(...streams);

        return 'stream';
    }

    // Изображения и остальные файлы копируются обычным способом
    await fsp.copyFile(sourcePath, targetPath);

    return 'ordinary';
}

async function copyDirectory() {
    await fsp.rm(BACKUP, { recursive: true, force: true });
    await fsp.mkdir(BACKUP, { recursive: true });

    const files = await getFiles(SOURCE);

    let streamCount = 0;
    let ordinaryCount = 0;
    let totalSize = 0;

    console.log(`\nОбнаружено файлов: ${files.length}`);

    for (let i = 0; i < files.length; i++) {
        const relative = files[i];

        const sourcePath = path.join(SOURCE, relative);
        const targetPath = path.join(BACKUP, relative);

        const stats = await fsp.stat(sourcePath);
        totalSize += stats.size;

        const type = await copyFile(sourcePath, targetPath);

        if (type === 'stream') {
            streamCount++;
        } else {
            ordinaryCount++;
        }

        console.log(`Копирование: ${i + 1}/${files.length}`);
    }

    console.log('\nКопирование завершено!');
    console.log(`Потоковое копирование: ${streamCount}`);
    console.log(`Обычное копирование: ${ordinaryCount}`);
    console.log(`Общий размер: ${(totalSize / 1024 / 1024).toFixed(2)} МБ`);
}

async function checksum(filePath) {
    const hash = crypto.createHash('md5');
    const stream = fs.createReadStream(filePath);

    for await (const chunk of stream) {
        hash.update(chunk);
    }

    return hash.digest('hex');
}

async function synchronize() {
    const sourceFiles = await getFiles(SOURCE);
    const backupFiles = await getFiles(BACKUP);

    const sourceSet = new Set(sourceFiles);
    const backupSet = new Set(backupFiles);

    const added = backupFiles.filter(file => !sourceSet.has(file));
    const deleted = sourceFiles.filter(file => !backupSet.has(file));
    const changed = [];

    for (const file of sourceFiles) {
        if (!backupSet.has(file)) {
            continue;
        }

        const sourcePath = path.join(SOURCE, file);
        const backupPath = path.join(BACKUP, file);

        const sourceStats = await fsp.stat(sourcePath);
        const backupStats = await fsp.stat(backupPath);

        const sourceHash = await checksum(sourcePath);
        const backupHash = await checksum(backupPath);

        if (sourceHash !== backupHash) {
            changed.push({
                file,
                sourceSize: sourceStats.size,
                backupSize: backupStats.size,
                sourceHash,
                backupHash
            });
        }
    }

    const report = [
        'ОТЧЁТ СИНХРОНИЗАЦИИ',
        `Вариант: ${VARIANT}`,
        `Дата: ${new Date().toLocaleString('ru-RU')}`,
        '',
        `Совпадают: ${sourceFiles.length - deleted.length - changed.length}`,
        `Добавлены: ${added.length}`,
        `Удалены: ${deleted.length}`,
        `Изменены: ${changed.length}`,
        '',
        'Добавленные файлы:',
        ...added,
        '',
        'Удалённые файлы:',
        ...deleted,
        '',
        'Изменённые файлы:',
        ...changed.map(item => item.file)
    ].join('\n');

    await fsp.writeFile(
        path.join(__dirname, `sync_report_${VARIANT}.txt`),
        report,
        'utf8'
    );

    console.log('\nСравнение директорий:');
    console.log(`Совпадают: ${sourceFiles.length - deleted.length - changed.length}`);
    console.log(`Добавлены: ${added.length}`);
    console.log(`Удалены: ${deleted.length}`);
    console.log(`Изменены: ${changed.length}`);
    console.log(`Отчёт: sync_report_${VARIANT}.txt`);
}

async function main() {
    try {
        await createSource();
        await copyDirectory();
        await synchronize();

        console.log('\nЗадание 5 успешно выполнено!');
    } catch (error) {
        console.error('Ошибка:', error.message);
    }
}

main();
