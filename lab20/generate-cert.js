
const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');

async function generateCertificate() {
    const certDir = path.join(__dirname, 'cert');

    if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir);
    }

    const pems = await selfsigned.generate(
        [{ name: 'commonName', value: 'localhost' }],
        {
            keySize: 2048,
            days: 365,
            algorithm: 'sha256',
            extensions: [
                {
                    name: 'basicConstraints',
                    cA: true
                },
                {
                    name: 'subjectAltName',
                    altNames: [
                        { type: 2, value: 'localhost' },
                        { type: 7, ip: '127.0.0.1' }
                    ]
                }
            ]
        }
    );

    fs.writeFileSync(
    path.join(certDir, 'server.key'),
    pems.private
);

    fs.writeFileSync(
        path.join(certDir, 'server.crt'),
        pems.cert
    );

    console.log('Сертификат и ключ успешно созданы!');
}

generateCertificate().catch(error => {
    console.error('Ошибка генерации сертификата:', error);
});
