
const fs = require('fs');
const path = require('path');

function buildProject(configPath = 'config/config.json') {
    const fullPath = path.resolve(configPath);

    if (!fs.existsSync(fullPath)) {
        throw new Error('CONFIG_NOT_FOUND');
    }

    const config = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    if (!config.name) {
        throw new Error('INVALID_CONFIG');
    }

    const distDirectory = path.resolve('dist');

    if (!fs.existsSync(distDirectory)) {
        fs.mkdirSync(distDirectory, { recursive: true });
    }

    const outputPath = path.join(distDirectory, 'my-app.js');

    const content = `// Сборка проекта ${config.name}\nconsole.log("Приложение ${config.name} запущено");\n`;

    fs.writeFileSync(outputPath, content, 'utf8');

    return {
        name: config.name,
        output: outputPath
    };
}

module.exports = { buildProject };
