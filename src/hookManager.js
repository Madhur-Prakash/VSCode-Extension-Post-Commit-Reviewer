import { config } from 'dotenv';

const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { ConfigManager } = require('./configManager');

class HookManager {
    constructor(context) {
        this.context = context;
    }

    async setupHook() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        const gitHooksDir = path.join(workspaceFolder, '.git', 'hooks');
        
        if (!fs.existsSync(gitHooksDir)) {
            vscode.window.showErrorMessage('Git repository not found');
            return;
        }

        try {
            const runnerPath = await this.createRunnerScript();
            await this.createHookScript(gitHooksDir, runnerPath);
            vscode.window.showInformationMessage('Git post-commit hook installed successfully');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to setup hook: ${error.message}`);
        }
    }

    async createHookScript(hooksDir, runnerPath) {
        const hookFile = path.join(hooksDir, 'post-commit');
        // Always use Unix/shell format for Git hooks, even on Windows
        // Git on Windows (Git Bash/MinGW) expects shell scripts, not batch files
        const hookContent = this.getUnixHookContent(runnerPath);
        fs.writeFileSync(hookFile, hookContent);
        
        // Make hook executable on Unix systems
        if (os.platform() !== 'win32') {
            fs.chmodSync(hookFile, 0o755);
        }
    }


    async createRunnerScript() {
        const runnerFile = path.join(this.context.extensionPath, 'run_review.js');
        const runnerContent = this.getRunnerContent();
        fs.writeFileSync(runnerFile, runnerContent);
        return runnerFile;
    }

    getUnixHookContent(runnerPath) {
        const fixedRunner = runnerPath.replace(/\\/g, '/');
        
        return `#!/bin/sh
echo "[POST-COMMIT HOOK] Triggered - calling review server..."
node "${fixedRunner}"
echo "[POST-COMMIT HOOK] Hook execution completed"
exit 0`;
    }
    
    getRunnerContent() {
        const config = ConfigManager.getConfig();
        const port = config.get('serverPort', 3001);
        
        return `const http = require('http');
        const { ConfigManager } = require('./src/configManager');
        
        console.log('🔥 Git post-commit hook triggered');
        console.log('📡 Sending request to review server...');
        
        const options = {
            hostname: 'localhost',
            port: ConfigManager.getConfig().serverPort,
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
            console.log('❌ Failed to connect to server on port', ConfigManager.getConfig().serverPort, ':', error.message);
        });
        
        req.write('{}');
        req.end();
        console.log('📤 Request sent to server');`;
    }
}

module.exports = { HookManager };