
const fs = require('fs');
const path = require('path');

class HybridFileManager {
    constructor(baseDir = './hybrid-data') {
        this.baseDir = baseDir;

        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }
    }

    // Универсальный метод создания файла
    createFile(filename, content, callback) {
        const filePath = path.join(this.baseDir, filename);

        const promise = fs.promises.writeFile(
            filePath,
            content,
            'utf8'
        ).then(() => filePath);

        if (typeof callback === 'function') {
            promise.then(result => callback(null, result))
                .catch(error => callback(error, null));

            return;
        }

        return promise;
    }

    // Универсальный метод чтения файла
    readFile(filename, callback) {
        const filePath = path.join(this.baseDir, filename);

        const promise = fs.promises.readFile(filePath, 'utf8');

        if (typeof callback === 'function') {
            promise.then(result => callback(null, result))
                .catch(error => callback(error, null));

            return;
        }

        return promise;
    }

    // Удаление файла
    deleteFile(filename, callback) {
        const filePath = path.join(this.baseDir, filename);

        const promise = fs.promises.unlink(filePath);

        if (typeof callback === 'function') {
            promise.then(() => callback(null))
                .catch(error => callback(error));

            return;
        }

        return promise;
    }
}

module.exports = HybridFileManager;
