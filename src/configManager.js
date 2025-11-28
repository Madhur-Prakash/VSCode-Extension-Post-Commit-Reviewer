const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// Load environment variables if .env file exists
try {
    const dotenv = require('dotenv');
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspaceFolder) {
        dotenv.config({ path: path.join(workspaceFolder, '.env') });
    }
} catch (error) {
    // dotenv is optional, continue without it
}

// Configuration manager
class ConfigManager {
    static getConfig() {
        const config = vscode.workspace.getConfiguration('postCommitReviewer');
        
        // Priority order: VS Code Settings > Environment Variables > Default
        const groqApiKey = config.get('groqApiKey', '') || 
                          process.env.GROQ_API_KEY || '';
        
        const model = config.get('model', '') || 
                     process.env.DEFAULT_MODEL || 
                     'llama-3.3-70b-versatile';
        
        const serverPort = config.get('serverPort', 3001);
        const autoStart = config.get('autoStart', true);
        
        return {
            groqApiKey: groqApiKey.trim(),
            model: model.trim(),
            serverPort,
            autoStart
        };
    }

    static async validateConfig() {
        const config = this.getConfig();
        if (!config.groqApiKey) {
            const result = await vscode.window.showErrorMessage(
                'Groq API Key is not configured. You can set it in VS Code settings or create a .env file.',
                'Configure in Settings',
                'Show .env Instructions',
                'Cancel'
            );
            
            if (result === 'Configure in Settings') {
                await this.configureInSettings();
            } else if (result === 'Show .env Instructions') {
                await this.showEnvInstructions();
            }
            return false;
        }
        return true;
    }

    static async configureInSettings() {
        const config = this.getConfig();
        
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your Groq API Key',
            value: vscode.workspace.getConfiguration('postCommitReviewer').get('groqApiKey', ''),
            password: true,
            ignoreFocusOut: true,
            placeHolder: 'gsk_...'
        });

        if (apiKey !== undefined) {
            if (apiKey.trim() && !apiKey.startsWith('gsk_')) {
                vscode.window.showErrorMessage('Invalid API Key format. It should start with "gsk_".');
                return;
            }

            await vscode.workspace.getConfiguration('postCommitReviewer').update(
                'groqApiKey', 
                apiKey, 
                vscode.ConfigurationTarget.Global
            );
            
            if (apiKey.trim()) {
                vscode.window.showInformationMessage('API Key configured in VS Code settings successfully!');
            } else {
                vscode.window.showWarningMessage('API Key cleared from VS Code settings.');
            }
        }
    }

    static async configureServerPort(reviewServerInstance) {
        const config = this.getConfig();
        
        const port = await vscode.window.showInputBox({
            prompt: 'Enter server port (1024-65535)',
            value: config.serverPort.toString(),
            ignoreFocusOut: true,
            validateInput: (value) => {
                const num = parseInt(value);
                if (isNaN(num) || num < 1024 || num > 65535) {
                    return 'Please enter a valid port number between 1024 and 65535';
                }
                return null;
            }
        });

        if (port === undefined) return;

        await vscode.workspace.getConfiguration('postCommitReviewer').update(
            'serverPort',
            parseInt(port),
            vscode.ConfigurationTarget.Global
        );

        vscode.window.showInformationMessage(`Server port set to ${port}`);

        const choice = await vscode.window.showInformationMessage(
            `Start the review server on the new port (${port}) now?`,
            'Yes',
            'No'
        );

        if (choice === 'Yes') {
            if (!reviewServerInstance) {
                vscode.window.showErrorMessage('Internal error: review server instance not found.');
                return;
            }

            await reviewServerInstance.stop();
            reviewServerInstance.start();
            vscode.window.showInformationMessage(`Review server restarted on port ${port}`);
        }
    }

    static async showEnvInstructions() {
        const message = `To use a .env file:

1. Create a .env file in your workspace root
2. Add: GROQ_API_KEY=your_api_key_here
3. Add: DEFAULT_MODEL=llama-3.3-70b-versatile (optional)
4. Restart VS Code or reload the window

The extension will automatically load these values.`;

        const result = await vscode.window.showInformationMessage(
            message,
            { modal: true },
            'Create .env Template',
            'Open Settings Instead'
        );

        if (result === 'Create .env Template') {
            await this.createEnvTemplate();
        } else if (result === 'Open Settings Instead') {
            await this.configureInSettings();
        }
    }

    static async createEnvTemplate() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
            return;
        }

        const envPath = path.join(workspaceFolder, '.env');
        const envTemplate = `# Post-Commit Reviewer Configuration
GROQ_API_KEY=your_groq_api_key_here
DEFAULT_MODEL=llama-3.3-70b-versatile

# Get your API key from: https://console.groq.com/keys
# Available models: llama-3.3-70b-versatile, llama-3.1-70b-versatile, mixtral-8x7b-32768
`;

        try {
            if (fs.existsSync(envPath)) {
                const result = await vscode.window.showWarningMessage(
                    '.env file already exists. Do you want to overwrite it?',
                    'Overwrite',
                    'Open Existing',
                    'Cancel'
                );
                
                if (result === 'Cancel') return;
                if (result === 'Open Existing') {
                    const envUri = vscode.Uri.file(envPath);
                    const document = await vscode.workspace.openTextDocument(envUri);
                    await vscode.window.showTextDocument(document);
                    return;
                }
            }

            fs.writeFileSync(envPath, envTemplate, 'utf8');
            vscode.window.showInformationMessage('.env template created successfully!');
            
            // Open the .env file for editing
            const envUri = vscode.Uri.file(envPath);
            const document = await vscode.workspace.openTextDocument(envUri);
            await vscode.window.showTextDocument(document);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to create .env file: ${error.message}`);
        }
    }

    static async showCurrentConfig() {
        const config = this.getConfig();
        const vsCodeSetting = vscode.workspace.getConfiguration('postCommitReviewer').get('groqApiKey', '');
        
        let details = '**Post-Commit Reviewer Configuration**\n\n';
        details += `**API Key Source:**\n`;
        
        if (vsCodeSetting) {
            details += `✅ VS Code Settings: ${vsCodeSetting.substring(0, 8)}...\n`;
        } else {
            details += `❌ VS Code Settings: Not set\n`;
        }
        
        if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith('gsk_')) {
            details += `✅ GROQ_API_KEY: ${process.env.GROQ_API_KEY.substring(0, 8)}...\n`;
        } else {
            details += `❌ GROQ_API_KEY: Not set\n`;
        }
        
        details += `\n**Current Effective Values:**\n`;
        details += `• API Key: ${config.groqApiKey ? `${config.groqApiKey.substring(0, 8)}...` : 'Not configured'}\n`;
        details += `• Model: ${config.model}\n`;
        details += `• Server Port: ${config.serverPort}\n`;
        details += `• Auto Start: ${config.autoStart}\n`;

        const panel = vscode.window.createWebviewPanel(
            'postCommitConfig',
            'Post-Commit Reviewer Configuration',
            vscode.ViewColumn.One,
            {}
        );

        panel.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Configuration</title>
                <style>
                    body { font-family: var(--vscode-font-family); padding: 20px; }
                    .config-item { margin-bottom: 10px; }
                    .success { color: var(--vscode-charts-green); }
                    .error { color: var(--vscode-charts-red); }
                </style>
            </head>
            <body>
                <div style="white-space: pre-line;">${details}</div>
            </body>
            </html>
        `;
    }
}

module.exports = { ConfigManager };