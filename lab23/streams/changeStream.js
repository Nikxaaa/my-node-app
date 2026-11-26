module.exports = (db, wss) => {
    const collection = db.collection('students');
    const stream = collection.watch([], { fullDocument: 'updateLookup' });

    stream.on('change', event => {
        const message = JSON.stringify({
            type: event.operationType,
            document: event.fullDocument || null,
            documentKey: event.documentKey
        });

        console.log('[CHANGE STREAM]', message);

        wss.clients.forEach(client => {
            if (client.readyState === 1) {
                client.send(message);
            }
        });
    });

    stream.on('error', error => {
        console.error('[CHANGE STREAM ERROR]', error);
    });

    return stream;
};