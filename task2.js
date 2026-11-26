
const fs = require('fs/promises');
const path = require('path');

const VARIANT = 5;
const ROOT = path.join(__dirname, `project_${VARIANT}`);

const descriptions = {
    src: 'Папка исходного кода',
    modules: 'Папка модулей программы',
    components: 'Папка компонентов программы',
    utils: 'Папка вспомогательных функций',
    data: 'Папка данных',
    input: 'Папка входных данных',
    output: 'Папка выходных данных',
    temp: 'Папка временных файлов'
};

async function createStructure() {
    try {
        const directories = [
            'src',
            'src/modules',
            'src/components',
            'src/utils',
            'data',
            'data/input',
            'data/output',
            'temp'
        ];

        // Создание каталогов
        for (const dir of directories) {
            await fs.mkdir(path.join(ROOT, dir), {
                recursive: true
            });
        }

        // Вариант нечётный: создаём папки 1, 2, 3
        for (let i = 1; i <= 3; i++) {
            await fs.mkdir(
                path.join(ROOT, 'src/components', String(i)),
                { recursive: true }
            );
        }

        // Создание info.txt во всех папках
        for (const dir of directories) {
            const fullPath = path.join(ROOT, dir);
            const name = path.basename(dir);
            const description = descriptions[name] || 'Вложенная папка';

            await fs.writeFile(
                path.join(fullPath, 'info.txt'),
                description,
                'utf8'
            );
        }

        for (let i = 1; i <= 3; i++) {
            await fs.writeFile(
                path.join(ROOT, 'src/components', String(i), 'info.txt'),
                `Вложенная папка номер ${i}`,
                'utf8'
            );
        }

        console.log('Исходная структура создана:');
        await printTree(ROOT);

        // Перемещение temp внутрь data
        await fs.rename(
            path.join(ROOT, 'temp'),
            path.join(ROOT, 'data/temp')
        );

        // Переименование output в results
        await fs.rename(
            path.join(ROOT, 'data/output'),
            path.join(ROOT, 'data/results')
        );

        // Удаление перемещённой папки temp
        await fs.rm(path.join(ROOT, 'data/temp'), {
            recursive: true,
            force: true
        });

        console.log('\nОбновлённая структура:');
        await printTree(ROOT);

        console.log('\nЗадание 2 выполнено!');

    } catch (error) {
        console.error('Ошибка:', error.message);
    }
}

// Рекурсивный вывод дерева каталогов
async function printTree(directory, prefix = '') {
    const entries = await fs.readdir(directory, {
        withFileTypes: true
    });

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const last = i === entries.length - 1;

        console.log(
            prefix + (last ? '└── ' : '├── ') + entry.name
        );

        if (entry.isDirectory()) {
            await printTree(
                path.join(directory, entry.name),
                prefix + (last ? '    ' : '│   ')
            );
        }
    }
}

createStructure();
