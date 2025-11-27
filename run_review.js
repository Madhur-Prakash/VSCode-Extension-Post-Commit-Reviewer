const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/review-diff',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
};

const req = http.request(options, (res) => {
    // Silent success
});

req.on('error', () => {
    // Silent failure
});

req.write('{}');
req.end();