
const { Command } = require('commander');
const fs = require('fs');
const path = require('path');

const program = new Command();

program
    .name('my-cli')
    .description('CLI-приложение для лабораторной работы №17')
    .version('1.0.0')
    .option('-v, --verbose', 'подробный вывод');

program
    .command('greet <имя>')
    .description('поприветствовать пользователя')
    .action((name) => {
        console.log(
            `Привет, ${name}! Добро пожаловать в CLI-приложение группы 401.`
        );
    });

program
    .command('info')
    .description('вывести информацию о студенте')
    .action(() => {
        console.log('Группа: 401');
        console.log('Студент: Грудская Вероника Сергеевна');
        console.log('Лабораторная работа: №17');
        console.log('Дата: 26.11.2026');
    });

program
    .command('generate')
    .description('сгенерировать отчёт')
    .option('-t, --type <type>', 'тип отчёта', 'html')
    .option('-o, --output <path>', 'путь для сохранения')
    .option('-f, --force', 'перезаписать существующий файл')
    .option('--dry-run', 'показать действия без выполнения')
    .action((options) => {
        const allowedTypes = ['html', 'pdf', 'json', 'csv'];

        if (!allowedTypes.includes(options.type)) {
            console.error(`Ошибка: недопустимый тип отчёта "${options.type}".`);
            console.error('Допустимые значения: html, pdf, json, csv');
            process.exitCode = 1;
            return;
        }

        const output = options.output || `./output.${options.type}`;

        if (program.opts().verbose) {
            console.log('[VERBOSE] Запуск генерации отчёта...');
            console.log(`[VERBOSE] Тип отчёта: ${options.type}`);
            console.log(`[VERBOSE] Путь сохранения: ${output}`);
        }

        if (options.dryRun) {
            console.log(`[DRY-RUN] Будет сгенерирован отчёт типа: ${options.type}`);
            console.log(`[DRY-RUN] Файл будет сохранён в: ${output}`);
            console.log('[DRY-RUN] Действия не выполнены (режим проверки)');
            return;
        }

        if (fs.existsSync(output) && !options.force) {
            console.error(`Ошибка: файл ${output} уже существует.`);
            console.error('Используйте --force для перезаписи.');
            process.exitCode = 1;
            return;
        }

        const content = `Отчёт лабораторной работы №17\nТип: ${options.type}\nСтудент: Грудская Вероника Сергеевна\n`;
        fs.writeFileSync(output, content, 'utf8');

        console.log(`Отчёт успешно сгенерирован: ${output}`);
    });

program
    .command('convert')
    .description('конвертировать файл')
    .option('-i, --input <path>', 'исходный файл')
    .option('-o, --output <path>', 'результирующий файл')
    .option('-f, --format <format>', 'формат результата', 'json')
    .action((options) => {
        if (!options.input) {
            console.error('Ошибка: укажите исходный файл через --input.');
            process.exitCode = 1;
            return;
        }

        if (!fs.existsSync(options.input)) {
            console.error(`Ошибка: файл ${options.input} не найден.`);
            process.exitCode = 1;
            return;
        }

        const output = options.output || `converted.${options.format}`;
        const content = fs.readFileSync(options.input, 'utf8');

        if (options.format === 'json') {
            fs.writeFileSync(
                output,
                JSON.stringify({ content }, null, 2),
                'utf8'
            );
        } else {
            fs.writeFileSync(output, content, 'utf8');
        }

        console.log(`Файл успешно преобразован: ${output}`);
    });

program
    .command('init')
    .description('интерактивная инициализация проекта')
    .option('--name <name>', 'название проекта')
    .option('--type <type>', 'тип проекта')
    .option('--typescript', 'использовать TypeScript')
    .option('--prettier', 'подключить Prettier')
    .option('--git', 'инициализировать Git')
    .option('--no-interactive', 'отключить интерактивный режим')
    .action(async (options) => {
        const inquirer = require('inquirer');

        const stdinPiped = !process.stdin.isTTY;
        const interactive = options.interactive && !stdinPiped;

        let answers = {
            name: options.name,
            type: options.type,
            extras: [],
            git: Boolean(options.git),
            token: ''
        };

        if (!answers.name || !answers.type) {
            if (!interactive) {
                console.error('Ошибка: в неинтерактивном режиме необходимо указать --name и --type.');
                process.exitCode = 1;
                return;
            }

            const questions = [];

            if (!answers.name) {
                questions.push({
                    type: 'input',
                    name: 'name',
                    message: 'Введите название проекта:',
                    validate: (value) => value.trim().length > 0 || 'Название обязательно.'
                });
            }

            if (!answers.type) {
                questions.push({
                    type: 'list',
                    name: 'type',
                    message: 'Выберите тип проекта:',
                    choices: [
                        { name: 'Web-приложение', value: 'web' },
                        { name: 'CLI-утилита', value: 'cli' },
                        { name: 'Библиотека', value: 'library' },
                        { name: 'Микросервис', value: 'microservice' }
                    ]
                });
            }

            questions.push({
                type: 'checkbox',
                name: 'extras',
                message: 'Выберите дополнительные опции:',
                choices: ['TypeScript', 'ESLint', 'Prettier', 'Jest']
            });

            questions.push({
                type: 'confirm',
                name: 'git',
                message: 'Использовать Git?',
                default: true
            });

            questions.push({
                type: 'password',
                name: 'token',
                message: 'Введите токен доступа (можно оставить пустым):',
                mask: '*'
            });

            const result = await inquirer.prompt(questions);
            answers = { ...answers, ...result };
        }

        const typeNames = {
            web: 'Web-приложение',
            cli: 'CLI-утилита',
            library: 'Библиотека',
            microservice: 'Микросервис'
        };

        if (!typeNames[answers.type]) {
            console.error('Ошибка: неверный тип проекта.');
            process.exitCode = 1;
            return;
        }

        console.log(`✓ Проект "${answers.name}" успешно инициализирован!`);
        console.log(`Тип: ${typeNames[answers.type]}`);
        console.log(`Опции: ${answers.extras.join(', ') || 'не выбраны'}`);
        console.log(`Git: ${answers.git ? 'да' : 'нет'}`);
    });


const chalk = require('chalk');
const ora = require('ora');
const cliProgress = require('cli-progress');

program
    .command('process')
    .description('обработать файлы')
    .requiredOption('--files <files...>', 'список файлов')
    .option('--quiet', 'не выводить результат при успехе')
    .action(async (options) => {
        const files = options.files;
        const results = [];
        const errors = [];

        const log = (message) => {
            console.error(chalk.blue(message));
        };

        const success = (message) => {
            console.error(chalk.green(`✔ ${message}`));
        };

        const warning = (message) => {
            console.error(chalk.yellow(`⚠ ${message}`));
        };

        const error = (message) => {
            console.error(chalk.red(`✖ ${message}`));
        };

        log('Начало обработки файлов');

        const spinner = ora({
            text: 'Проверка файлов...',
            stream: process.stderr
        }).start();

        for (const file of files) {
            if (fs.existsSync(file)) {
                results.push({
                    file,
                    status: 'processed'
                });
            } else {
                errors.push(file);
            }
        }

        spinner.succeed('Проверка завершена');

        const bar = new cliProgress.SingleBar({
            format: 'Обработка |{bar}| {percentage}% | {value}/{total} | ETA: {eta}s',
            barCompleteChar: '█',
            barIncompleteChar: '░',
            hideCursor: true,
            stream: process.stderr
        });

        bar.start(files.length, 0);

        for (let i = 0; i < files.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 300));
            bar.update(i + 1);
        }

        bar.stop();

        for (const item of results) {
            success(`Файл ${item.file} обработан`);
        }

        for (const file of errors) {
            error(`Файл ${file} не найден`);
        }

        if (errors.length > 0) {
            warning(`Пропущено файлов: ${errors.length}`);
            process.exitCode = 1;
        }

        if (!options.quiet) {
            // В stdout помещаются только данные результата.
            console.log(JSON.stringify({
                processed: results,
                failed: errors
            }, null, 2));
        }
    });

program.showHelpAfterError();

program.parse(process.argv);

if (process.argv.length <= 2) {
    program.help();
}
