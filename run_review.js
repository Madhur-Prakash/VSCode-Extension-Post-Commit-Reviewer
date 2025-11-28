const http = require('http');


const options = {
    hostname: 'localhost',
    port: 3005,
    path: '/review-diff',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
};

const req = http.request(options, (res) => {
});

req.on('error', (error) => {
});

req.write('{}');
req.end();