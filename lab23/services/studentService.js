const StudentDAO = require('../dao/StudentDAO');

class StudentService {
    constructor(db, client) {
        this.dao = new StudentDAO(db);
        this.client = client;
    }

    create(data) {
        return this.dao.create(data);
    }

    findAll(options) {
        return this.dao.findAll(options);
    }

    findById(id) {
        return this.dao.findById(id);
    }

    update(id, data) {
        return this.dao.update(id, data);
    }

    delete(id) {
        return this.dao.delete(id);
    }

    search(query) {
        return this.dao.search(query);
    }

    getStats() {
        return this.dao.getStats();
    }

    async batchCreate(array) {
        const session = this.client.startSession();

        try {
            let result;

            await session.withTransaction(async () => {
                result = await this.dao.batchCreate(array, session);
            });

            return result;
        } finally {
            await session.endSession();
        }
    }
}

module.exports = StudentService;