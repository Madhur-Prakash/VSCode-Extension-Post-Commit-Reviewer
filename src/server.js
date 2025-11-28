const vscode = require('vscode');
const express = require('express');
const { exec } = require('child_process');
const axios = require('axios');
const { ConfigManager } = require('./configManager');

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

    convert_string_to_json(jsonString) {
        try {
        console.log("received jsonString:", jsonString);

        if (jsonString.startsWith("```")) {
            jsonString = jsonString.replace(/```/g, "");  // remove backticks
            jsonString = jsonString.replace(/^json/, "").trim(); // remove leading 'json'
        }

        const jsonObject = JSON.parse(jsonString);

        console.log("=".repeat(60));
        console.log("=".repeat(60));
        console.log("Converted JSON object:", jsonObject);

        return jsonObject;

    } catch (err) {
        console.log("Error decoding JSON string:", err.message);
        return null;
    }
}

    async getLastCommitDiff() {
    return new Promise((resolve, reject) => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
            console.log('❌ No workspace folder found');
            return reject(new Error('No workspace folder found'));
        }

        console.log('📁 Workspace folder:', workspaceFolder);

        // First check if this is the first commit
        exec('git rev-list --count HEAD', { cwd: workspaceFolder }, (countErr, countStdout) => {
            if (countErr) {
                vscode.window.showErrorMessage('Unable to check commit history.');
                console.log('❌ Commit count check error:', countErr.message);
                return reject(countErr);
            }

            const commitCount = parseInt(countStdout.trim(), 10);

            // If it's the first commit, handle it
            if (commitCount === 1) {
                vscode.window.showInformationMessage('This is the first commit, so there is no previous commit to compare.');
                console.log('ℹ️ First commit detected — skipping diff.');
                return resolve('');
            }

            // Not first commit, run the diff normally
            exec('git diff HEAD~1 HEAD', { cwd: workspaceFolder }, (error, stdout) => {
                if (error) {
                    vscode.window.showErrorMessage('Unable to generate the code review.');
                    console.log('❌ Git diff error:', error.message);
                    return reject(error);
                }

                console.log('✅ Git diff successful');
                resolve(stdout);
            });
        });
    });
}


    async reviewWithGroq(diff) {
        console.log('🤖 Preparing to review diff with Groq API');
        
        const config = ConfigManager.getConfig();
        const apiKey = config.groqApiKey;
        
        if (!apiKey) {
            throw new Error('Groq API key not configured. Please set it in VS Code settings.');
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
            const model = 'llama-3.3-70b-versatile';
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

            let content = response.data.choices[0].message.content;
            console.log("🟢 GROQ RESPONSE RECEIVED:", content);
            
            const jsonResponse = this.convert_string_to_json(content);
            return jsonResponse;
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
        const config = ConfigManager.getConfig();
        const port = config.serverPort || 3001;
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

        this.server.on('error', (error) => {
            console.error('❌ Server error:', error);
            if (error.code === 'EADDRINUSE') {
                vscode.window.showErrorMessage(`Port ${port} is already in use. Please change the port in settings.`);
            }
            this.server = null;
        });
    }

    stop() {
        if (this.server) {
            console.log('🛑 Stopping review server');
            vscode.window.showInformationMessage('Stopping review server...');
            return new Promise((resolve) => {
                this.server.close((err) => {
                    if (err) {
                        console.error('❌ Error stopping server:', err);
                    } else {
                        console.log('✅ Server stopped successfully');
                    }
                    this.server = null;
                    vscode.window.showInformationMessage('Review server stopped');
                    resolve();
                });
            });
        } else {
            console.log('⚠️ No server to stop');
            vscode.window.showInformationMessage('No server is currently running');
        }
    }

    onReviewComplete(callback) {
        this.reviewCompleteCallback = callback;
    }
}

module.exports = { ReviewServer };