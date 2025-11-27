const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
            await this.createHookScript(gitHooksDir);
            await this.createRunnerScript(workspaceFolder);
            vscode.window.showInformationMessage('Git post-commit hook installed successfully');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to setup hook: ${error.message}`);
        }
    }

    async createHookScript(hooksDir) {
        const isWindows = os.platform() === 'win32';
        const hookFile = path.join(hooksDir, isWindows ? 'post-commit.cmd' : 'post-commit');
        
        const hookContent = isWindows 
            ? this.getWindowsHookContent()
            : this.getUnixHookContent();

        fs.writeFileSync(hookFile, hookContent);
        
        if (!isWindows) {
            fs.chmodSync(hookFile, '755');
        }
    }

    async createRunnerScript(workspaceDir) {
        const runnerFile = path.join(workspaceDir, 'run_review.js');
        const runnerContent = this.getRunnerContent();
        
        fs.writeFileSync(runnerFile, runnerContent);
    }

    getWindowsHookContent() {
        return `@echo off
echo [POST-COMMIT HOOK] Triggered - calling review server...
node "%~dp0..\\..\\run_review.js"
echo [POST-COMMIT HOOK] Hook execution completed
exit /b 0`;
    }

    getUnixHookContent() {
        return `#!/bin/sh
echo "[POST-COMMIT HOOK] Triggered - calling review server..."
node "$(dirname "$0")/../../run_review.js"
echo "[POST-COMMIT HOOK] Hook execution completed"
exit 0`;
    }

    getRunnerContent() {
        const config = vscode.workspace.getConfiguration('postCommitReviewer');
        const port = config.get('serverPort', 3001);
        
        return `const http = require('http');

console.log('🔥 Git post-commit hook triggered');
console.log('📡 Sending request to review server...');

const options = {
    hostname: 'localhost',
    port: ${port},
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
console.log('📤 Request sent to server');`;
    }
}

module.exports = { HookManager };