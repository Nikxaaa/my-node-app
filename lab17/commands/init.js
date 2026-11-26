
const inquirer = require('inquirer');
const fs = require('fs');
const path = require('path');

async function initCommand(options) {
    let answers = {
        name: options.name,
        type: options.type,
        typescript: options.typescript || false,
        prettier: options.prettier || false,
        git: options.git || false
    };

    const interactive = options.interactive !== false && process.stdin.isTTY;

    if (!answers.name || !answers.type) {
        if (!interactive) {
            console.error('Ошибка: в неинтерактивном режиме необходимо указать --name и --type');
            process.exitCode = 1;
            return;
        }

        const questions = [];

        if (!answers.name) {
            questions.push({
                type: 'input',
                name: 'name',
                message: 'Введите название проекта:',
                validate: value => value.trim() !== '' || 'Название обязательно'
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

        answers = { ...answers, ...await inquirer.prompt(questions) };
    }

    if (!answers.name || !answers.type) {
        console.error('Ошибка: необходимо указать название и тип проекта.');
        process.exitCode = 1;
        return;
    }

    const projectPath = path.resolve(process.cwd(), answers.name);

    if (fs.existsSync(projectPath)) {
        console.error(`Ошибка: папка ${answers.name} уже существует.`);
        process.exitCode = 1;
        return;
    }

    fs.mkdirSync(projectPath, { recursive: true });

    fs.writeFileSync(
        path.join(projectPath, 'package.json'),
        JSON.stringify({
            name: answers.name,
            version: '1.0.0',
            description: `Проект типа ${answers.type}`,
            scripts: {
                start: 'node index.js'
            }
        }, null, 2)
    );

    fs.writeFileSync(
        path.join(projectPath, 'index.js'),
        "console.log('Проект успешно запущен!');\n"
    );

    console.log(`✓ Проект "${answers.name}" успешно инициализирован!`);
    console.log(`Тип: ${answers.type}`);
    console.log(`TypeScript: ${answers.typescript ? 'да' : 'нет'}`);
    console.log(`Prettier: ${answers.prettier ? 'да' : 'нет'}`);
    console.log(`Git: ${answers.git ? 'да' : 'нет'}`);
}

module.exports = initCommand;
