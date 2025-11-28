const vscode = require('vscode');
const express = require('express');
const { exec } = require('child_process');
const axios = require('axios');

class ReviewServer {
    constructor(context) {
        this.context = context;
        this.server = null;
        this.app = express();
        this.reviewCompleteCallback = null;
        
        this.setupRoutes();
    }

    setupRoutes() {
        this.app.use(express.json());
        
        this.app.post('/review-diff', async (req, res) => {
            console.log('🔥 POST /review-diff received');
            try {
                console.log('📝 Getting last commit diff...');
                const diff = await this.getLastCommitDiff();
                if (!diff) {
                    console.log('❌ No diff found');
                    return res.json({ success: false, message: 'No diff found' });
                }
                console.log('✅ Diff extracted:', diff.length, 'characters');

                console.log('🤖 Sending to Groq for review...');
                const review = await this.reviewWithGroq(diff);
                console.log('✅ Review completed:', review.issues?.length || 0, 'issues found');
                
                if (this.reviewCompleteCallback) {
                    console.log('📤 Calling review complete callback');
                    this.reviewCompleteCallback(review);
                }
                
                res.json({ success: true, review });
            } catch (error) {
                console.error('❌ Review error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok' });
        });
    }

    async getLastCommitDiff() {
        return new Promise((resolve, reject) => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceFolder) {
                console.log('❌ No workspace folder found');
                reject(new Error('No workspace folder found'));
                return;
            }
            console.log('📁 Workspace folder:', workspaceFolder);

            exec('git diff HEAD~1 HEAD', { cwd: workspaceFolder }, (error, stdout) => {
                if (error) {
                    console.log('❌ Git diff error:', error.message);
                    reject(error);
                    return;
                }
                console.log('✅ Git diff successful');
                resolve(stdout);
            });
        });
    }

    async reviewWithGroq(diff) {
        console.log('🤖 Preparing to review diff with Groq API');
        const config = vscode.workspace.getConfiguration('postCommitReviewer');
        const apiKey = config.get('groqApiKey');
        
        if (!apiKey) {
            throw new Error('Groq API key not configured');
        }

        const prompt = `You are an expert senior software engineer and code reviewer.

Analyze the following Git Diff from a new commit.  
Identify any problems or potential issues including logic errors, security risks, performance issues, bad patterns, code smells, or missing checks.

For each issue, provide:  
1. Explanation  
2. Why it is a problem  
3. Suggested fix  
4. Which lines of the diff are affected

The diff is below:

${diff}

Return your response in strict JSON using this structure:

{
  "issues": [
    {
      "title": "",
      "explanation": "",
      "reason": "",
      "suggested_fix": "",
      "lines": ""
    }
  ]
}`;

        try {
            console.log("🔵 GROQ CALL TRIGGERED — sending diff to Groq");
            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 4000,
                top_p: 1,
                stream: false
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });

            if (!response.data || !response.data.choices || !response.data.choices[0]) {
                throw new Error('Invalid response from Groq API');
            }

            const content = response.data.choices[0].message.content;
            console.log("🟢 GROQ RESPONSE RECEIVED:", content.slice(0, 100));
            return content.trim();

        } catch (error) {
            console.error('Error generating groq review', error);
            
            if (error.response) {
                const status = error.response.status;
                const message = error.response.data?.error?.message || 'Unknown API error';
                throw new Error(`API Error (${status}): ${message}`);
            } else if (error.code === 'ENOTFOUND') {
                throw new Error('Network error: Unable to connect to Groq API');
            } else {
                throw new Error(`Generation failed: ${error.message}`);
            }
        }
    }

    start() {
        const config = vscode.workspace.getConfiguration('postCommitReviewer');
        const port = config.get('serverPort', 3001);
        console.log('🚀 Starting review server on port', port);

        if (this.server) {
            console.log('⚠️ Server already running');
            vscode.window.showWarningMessage('Review server is already running');
            return;
        }

        this.server = this.app.listen(port, () => {
            console.log('✅ Review server started on port', port);
            vscode.window.showInformationMessage(`Review server started on port ${port}`);
        });
    }

    stop() {
        if (this.server) {
            console.log('🛑 Stopping review server');
            this.server.close();
            this.server = null;
            vscode.window.showInformationMessage('Review server stopped');
        }
    }

    onReviewComplete(callback) {
        this.reviewCompleteCallback = callback;
    }
}

module.exports = { ReviewServer };