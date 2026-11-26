
const fs = require('fs/promises');
const path = require('path');

const VARIANT = 5;
const FILE = path.join(__dirname, `student_${VARIANT}.txt`);

async function main() {
    try {
        const studentInfo = [
            'Студент: Грудская Вероника',
            'Группа: 401',
            `Вариант: ${VARIANT}`,
            `Дата: ${new Date().toLocaleString('ru-RU')}`,
            '',
            'Любимые книги и фильмы:',
            '1. Гарри Поттер',
            '2. Интерстеллар',
            '3. Маленький принц',
            '4. Начало',
            '5. Властелин колец'
        ];

        // Подсчёт строк до добавления итоговой записи
        const initialContent = studentInfo.join('\n');
        const lineCount = studentInfo.length + 1;

        const finalContent =
            initialContent + `\n\nКоличество записей: ${lineCount}`;

        // Создание и запись файла
        await fs.writeFile(FILE, finalContent, 'utf8');

        console.log(`Создан файл: student_${VARIANT}.txt`);

        // Чтение файла
        const content = await fs.readFile(FILE, 'utf8');

        console.log('\nСодержимое файла:');
        console.log('─────────────────────────────────');
        console.log(content);
        console.log('─────────────────────────────────');

    } catch (error) {
        console.error('Ошибка:', error.message);
    }
}

main();
