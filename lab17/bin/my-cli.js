#!/usr/bin/env node

const { Command } = require('commander');
const initCommand = require('../commands/init');

const program = new Command();

program
  .name('my-cli')
  .description('CLI-приложение для лабораторной работы №17')
  .version('1.0.0');

program
  .command('init')
  .description('Создание нового проекта')
  .option('--name <name>', 'Название проекта')
  .option('--type <type>', 'Тип проекта')
  .option('--typescript', 'Использовать TypeScript')
  .option('--prettier', 'Подключить Prettier')
  .option('--git', 'Инициализировать Git')
  .option('--no-interactive', 'Отключить интерактивный режим')
  .action(initCommand);

program.parse(process.argv);

if (process.argv.length <= 2) {
  program.help();
}
