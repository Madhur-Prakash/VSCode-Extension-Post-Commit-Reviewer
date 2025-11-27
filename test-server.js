const express = require('express');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

app.post('/review-diff', async (req, res) => {
    console.log('Review request received');
    
    exec('git diff HEAD~1 HEAD', (error, stdout) => {
        if (error) {
            console.error('Git error:', error);
            return res.json({ success: false, error: error.message });
        }
        
        console.log('Diff extracted:', stdout.length, 'characters');
        res.json({ 
            success: true, 
            review: { 
                issues: [
                    {
                        title: "Test Issue",
                        explanation: "This is a test review",
                        reason: "Testing the system",
                        suggested_fix: "No fix needed",
                        lines: "All lines"
                    }
                ]
            }
        });
    });
});

const server = app.listen(3001, () => {
    console.log('Test server running on port 3001');
});

process.on('SIGINT', () => {
    server.close();
    process.exit(0);
});