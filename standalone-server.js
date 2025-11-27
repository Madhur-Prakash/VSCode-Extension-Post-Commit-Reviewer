const express = require('express');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

app.post('/review-diff', async (req, res) => {
    console.log('🔥 POST /review-diff received');
    
    try {
        console.log('📝 Getting last commit diff...');
        
        const diff = await new Promise((resolve, reject) => {
            exec('git diff HEAD~1 HEAD', (error, stdout) => {
                if (error) {
                    console.log('❌ Git diff error:', error.message);
                    reject(error);
                    return;
                }
                console.log('✅ Git diff successful');
                resolve(stdout);
            });
        });
        
        if (!diff) {
            console.log('❌ No diff found');
            return res.json({ success: false, message: 'No diff found' });
        }
        
        console.log('✅ Diff extracted:', diff.length, 'characters');
        console.log('📄 Diff content preview:', diff.substring(0, 200) + '...');
        
        // Mock review for testing
        const mockReview = {
            issues: [
                {
                    title: "Test Issue Found",
                    explanation: "This is a test review to verify the system works",
                    reason: "Testing the post-commit review system",
                    suggested_fix: "No fix needed - this is just a test",
                    lines: "All modified lines"
                }
            ]
        };
        
        console.log('✅ Mock review completed:', mockReview.issues.length, 'issues found');
        res.json({ success: true, review: mockReview });
        
    } catch (error) {
        console.error('❌ Review error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const server = app.listen(3001, () => {
    console.log('🚀 Standalone review server started on port 3001');
    console.log('💡 Make a commit to test the hook!');
});

process.on('SIGINT', () => {
    console.log('🛑 Shutting down server...');
    server.close();
    process.exit(0);
});