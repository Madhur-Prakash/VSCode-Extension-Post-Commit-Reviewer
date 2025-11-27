// Direct test of the hook functionality
const http = require('http');

console.log('🔥 Testing post-commit hook...');

const data = JSON.stringify({});

const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/review-diff',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log('✅ Server responded with status:', res.statusCode);
    
    let responseData = '';
    res.on('data', (chunk) => {
        responseData += chunk;
    });
    
    res.on('end', () => {
        console.log('📨 Response:', responseData);
    });
});

req.on('error', (error) => {
    console.log('❌ Failed to connect to server:', error.message);
    console.log('💡 Make sure to start the review server first!');
});

req.write(data);
req.end();