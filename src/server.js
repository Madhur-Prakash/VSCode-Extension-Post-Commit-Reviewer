const vscode = require('vscode');
const express = require('express');
const { exec } = require('child_process');
const Groq = require('groq-sdk');

class ReviewServer {
    constructor(context) {
        this.context = context;
        this.server = null;
        this.app = express();
        this.groq = null;
        this.reviewCompleteCallback = null;
        
        this.setupRoutes();
    }

    setupRoutes() {
        this.app.use(express.json());
        
        this.app.post('/review-diff', async (req, res) => {
            try {
                const diff = await this.getLastCommitDiff();
                if (!diff) {
                    return res.json({ success: false, message: 'No diff found' });
                }

                const review = await this.reviewWithGroq(diff);
                
                if (this.reviewCompleteCallback) {
                    this.reviewCompleteCallback(review);
                }
                
                res.json({ success: true, review });
            } catch (error) {
                console.error('Review error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });
    }

    async getLastCommitDiff() {
        return new Promise((resolve, reject) => {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceFolder) {
                reject(new Error('No workspace folder found'));
                return;
            }

            exec('git diff HEAD~1 HEAD', { cwd: workspaceFolder }, (error, stdout) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(stdout);
            });
        });
    }

    async reviewWithGroq(diff) {
        const config = vscode.workspace.getConfiguration('postCommitReviewer');
        const apiKey = config.get('groqApiKey');
        
        if (!apiKey) {
            throw new Error('Groq API key not configured');
        }

        if (!this.groq) {
            this.groq = new Groq({ apiKey });
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

        const completion = await this.groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama3-8b-8192',
            temperature: 0.1,
        });

        const response = completion.choices[0]?.message?.content;
        try {
            return JSON.parse(response);
        } catch (e) {
            return { issues: [{ title: 'Parse Error', explanation: 'Failed to parse AI response', reason: 'Invalid JSON', suggested_fix: 'Check API response', lines: '' }] };
        }
    }

    start() {
        const config = vscode.workspace.getConfiguration('postCommitReviewer');
        const port = config.get('serverPort', 3001);

        if (this.server) {
            vscode.window.showWarningMessage('Review server is already running');
            return;
        }

        this.server = this.app.listen(port, () => {
            vscode.window.showInformationMessage(`Review server started on port ${port}`);
        });
    }

    stop() {
        if (this.server) {
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