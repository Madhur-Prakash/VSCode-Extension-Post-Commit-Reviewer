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
node "%~dp0..\\..\\run_review.js" 2>nul
exit /b 0`;
    }

    getUnixHookContent() {
        return `#!/bin/sh
node "$(dirname "$0")/../../run_review.js" 2>/dev/null || true
exit 0`;
    }

    getRunnerContent() {
        const config = vscode.workspace.getConfiguration('postCommitReviewer');
        const port = config.get('serverPort', 3001);
        
        return `const http = require('http');

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
    // Silent success
});

req.on('error', () => {
    // Silent failure
});

req.write('{}');
req.end();`;
    }
}

module.exports = { HookManager };