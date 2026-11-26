
const { buildProject } = require('../services/buildService');
const { success, handleError } = require('../utils/output');
const ora = require('ora');

function registerBuildCommand(program) {
    program
        .command('build')
        .description('сборка проекта')
        .option('-c, --config <path>', 'путь к конфигурации', 'config/config.json')
        .option('--dry-run', 'проверка без сборки')
        .action(async (options) => {
            if (options.dryRun) {
                console.log('DRY-RUN: сборка не выполнялась.');
                return;
            }

            const spinner = ora({
                text: 'Сборка проекта...',
                stream: process.stderr
            }).start();

            try {
                const result = buildProject(options.config);
                spinner.succeed('Сборка завершена');
                success(`Результат: ${result.output}`);
            } catch (err) {
                spinner.fail('Сборка не выполнена');
                handleError(err);
            }
        });
}

module.exports = registerBuildCommand;
