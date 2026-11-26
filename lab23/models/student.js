const studentSchema = {
    $jsonSchema: {
        bsonType: 'object',
        required: ['name', 'group_name', 'grade'],
        properties: {
            _id: {
                bsonType: 'objectId'
            },
            name: {
                bsonType: 'string',
                minLength: 2,
                description: 'Имя студента обязательно'
            },
            group_name: {
                bsonType: 'string',
                minLength: 2,
                description: 'Группа обязательна'
            },
            grade: {
                bsonType: ['int', 'double', 'decimal'],
                minimum: 0,
                maximum: 10,
                description: 'Оценка от 0 до 10'
            },
            createdAt: {
                bsonType: 'date'
            }
        }
    }
};

module.exports = studentSchema;