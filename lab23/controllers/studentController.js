class StudentController {
    constructor(service) {
        this.service = service;
    }

    async getAll(ctx) {
        ctx.body = await this.service.findAll(ctx.query);
    }

    async getById(ctx) {
        const student = await this.service.findById(ctx.params.id);
        if (!student) ctx.throw(404, 'Студент не найден');
        ctx.body = student;
    }

    async create(ctx) {
        ctx.status = 201;
        ctx.body = await this.service.create(ctx.request.body);
    }

    async update(ctx) {
        const student = await this.service.update(ctx.params.id, ctx.request.body);
        if (!student) ctx.throw(404, 'Студент не найден');
        ctx.body = student;
    }

    async delete(ctx) {
        const result = await this.service.delete(ctx.params.id);
        if (!result.deletedCount) ctx.throw(404, 'Студент не найден');
        ctx.body = { message: 'Студент удалён' };
    }

    async stats(ctx) {
        ctx.body = await this.service.getStats();
    }

    async search(ctx) {
        const query = String(ctx.query.q || '').trim();
        if (!query) ctx.throw(400, 'Укажите параметр q');
        ctx.body = await this.service.search(query);
    }

    async batch(ctx) {
        const result = await this.service.batchCreate(ctx.request.body);
        ctx.status = 201;
        ctx.body = {
            message: 'Пакетная вставка выполнена',
            insertedCount: result.insertedCount
        };
    }
}

module.exports = StudentController;