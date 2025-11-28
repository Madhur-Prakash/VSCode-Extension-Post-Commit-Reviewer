const http = require('http');

console.log('🔥 Git post-commit hook triggered');
console.log('📡 Sending request to review server...');

const options = {
    hostname: 'localhost',
    port: 2999,
    path: '/review-diff',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
};

const req = http.request(options, (res) => {
    console.log('✅ Server responded with status:', res.statusCode);
});

req.on('error', (error) => {
    console.log('❌ Failed to connect to server:', error.message);
});

req.write('{}');
req.end();
console.log('📤 Request sent to server');