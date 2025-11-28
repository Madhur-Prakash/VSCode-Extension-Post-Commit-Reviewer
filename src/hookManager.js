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
            const runnerPath = await this.createRunnerScript();
            await this.createHookScript(gitHooksDir, runnerPath);
            vscode.window.showInformationMessage('Git post-commit hook installed successfully');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to setup hook: ${error.message}`);
        }
    }

    async createHookScript(hooksDir, runnerPath) {
        const hookFile = path.join(hooksDir, 'post-commit.bat');
        const hookContent = this.getWindowsHookContent(runnerPath);
        fs.writeFileSync(hookFile, hookContent);
    }


    async createRunnerScript() {
        const runnerFile = path.join(this.context.extensionPath, 'run_review.js');
        const runnerContent = this.getRunnerContent();
        fs.writeFileSync(runnerFile, runnerContent);
        return runnerFile;
    }


    getWindowsHookContent(runnerPath) {
    const nodePath = process.argv[0].replace(/\\/g, '\\\\'); 
    const fixedRunner = runnerPath.replace(/\\/g, '\\\\');

    return `@echo off

REM Move to repository root (important)
cd /d "%~dp0.."

echo ============================ >> hook-debug.log
echo POST-COMMIT HOOK TRIGGERED >> hook-debug.log
echo Running from: %cd% >> hook-debug.log

echo Files in directory: >> hook-debug.log
dir >> hook-debug.log

echo Node path: >> hook-debug.log
where node >> hook-debug.log

echo Running run_server.js >> hook-debug.log
node run_server.js >> hook-debug.log 2>&1
`;
    }


    getUnixHookContent(runnerPath) {
    const nodePath = process.argv[0]
        .replace(/"/g, '\\"')
        .replace(/\\/g, '/');

    const fixedRunner = runnerPath
        .replace(/"/g, '\\"')
        .replace(/\\/g, '/');

    return `#!/bin/sh
    echo "[POST-COMMIT HOOK] Triggered - calling review server..."
    "${nodePath}" "${fixedRunner}"
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