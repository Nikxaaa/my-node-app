
const fs = require('fs/promises');
const path = require('path');

const VARIANT = 5;
const MAX_SIZE = 10 * 1024 * 1024;

async function scanDirectory(directory) {
    const files = [];
    let folderCount = 0;

    async function scan(currentPath) {
        const entries = await fs.readdir(currentPath, {
            withFileTypes: true
        });

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);

            if (entry.isDirectory()) {
                folderCount++;
                await scan(fullPath);
            } else if (entry.isFile()) {
                const stats = await fs.stat(fullPath);

                // Вариант 5: пропускаем файлы больше 10 МБ
                if (stats.size > MAX_SIZE) {
                    continue;
                }

                files.push({
                    name: entry.name,
                    path: path.relative(directory, fullPath),
                    extension: path.extname(entry.name) || '[без расширения]',
                    size: stats.size
                });
            }
        }
    }

    await scan(directory);

    return { files, folderCount };
}

function formatSize(bytes) {
    return {
        bytes,
        kb: (bytes / 1024).toFixed(2),
        mb: (bytes / 1024 / 1024).toFixed(2)
    };
}

async function main() {
    try {
        const argument = process.argv[2] || '.';
        const directory = path.resolve(argument);

        const stat = await fs.stat(directory);

        if (!stat.isDirectory()) {
            throw new Error('Указанный путь не является папкой');
        }

        console.log(`Анализ директории: ${directory}`);

        const { files, folderCount } =
            await scanDirectory(directory);

        const totalSize = files.reduce(
            (sum, file) => sum + file.size, 0
        );

        // Группировка файлов по расширениям
        const extensions = {};

        for (const file of files) {
            if (!extensions[file.extension]) {
                extensions[file.extension] = [];
            }

            extensions[file.extension].push(file);
        }

        const largest = [...files]
            .sort((a, b) => b.size - a.size)
            .slice(0, 5);

        const smallest = [...files]
            .sort((a, b) => a.size - b.size)
            .slice(0, 5);

        const report = {
            directory,
            variant: VARIANT,
            ignoredFilesLargerThan: '10 MB',
            totalFiles: files.length,
            totalFolders: folderCount,
            totalSize: formatSize(totalSize),
            extensions,
            largestFiles: largest,
            smallestFiles: smallest
        };

        console.log('\nСтатистика:');
        console.log(`Папок: ${folderCount}`);
        console.log(`Файлов: ${files.length}`);
        console.log(`Размер: ${formatSize(totalSize).mb} МБ`);
        console.log(`Размер в байтах: ${totalSize}`);

        console.log('\nРасширения файлов:');

        for (const [extension, list] of Object.entries(extensions)) {
            const size = list.reduce(
                (sum, file) => sum + file.size, 0
            );

            console.log(
                `${extension}: ${list.length} файлов, ` +
                `${formatSize(size).kb} КБ`
            );
        }

        console.log('\nТоп-5 самых больших файлов:');

        largest.forEach((file, index) => {
            console.log(
                `${index + 1}. ${file.name} - ` +
                `${formatSize(file.size).kb} КБ`
            );
        });

        console.log('\nТоп-5 самых маленьких файлов:');

        smallest.forEach((file, index) => {
            console.log(
                `${index + 1}. ${file.name} - ` +
                `${formatSize(file.size).kb} КБ`
            );
        });

        const reportPath = path.join(
            __dirname,
            `report_${VARIANT}.json`
        );

        await fs.writeFile(
            reportPath,
            JSON.stringify(report, null, 2),
            'utf8'
        );

        console.log(`\nОтчёт сохранён: report_${VARIANT}.json`);

    } catch (error) {
        console.error('Ошибка анализа:', error.message);
    }
}

main();
