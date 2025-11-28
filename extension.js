const vscode = require('vscode');

// Global variables to maintain state
let reviewServer;
let hookManager;
let reviewPanel;

/**
 * This method is called when your extension is activated
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('🚀 Post-Commit Reviewer extension activated');

    // 1. Safe Import Strategy
    // We import these inside activate with try-catch to prevent the extension 
    // from crashing entirely if a dependency is missing.
    let ConfigManager, ReviewServer, HookManager, ReviewPanel;

    try {
        // Load ConfigManager first
        const configModule = require('./src/configManager');
        ConfigManager = configModule.ConfigManager;
        
        // Load other modules
        const serverModule = require('./src/server');
        ReviewServer = serverModule.ReviewServer;
        
        const hookModule = require('./src/hookManager');
        HookManager = hookModule.HookManager;
        
        const panelModule = require('./src/reviewPanel');
        ReviewPanel = panelModule.ReviewPanel;

    } catch (error) {
        console.error('❌ Failed to load modules:', error);
        vscode.window.showErrorMessage('Post-Commit Reviewer failed to load modules. Did you run "npm install"?');
        return; // Stop activation if modules fail
    }

    // 2. Initialize Components
    try {
        reviewServer = new ReviewServer(context);
        hookManager = new HookManager(context);
        reviewPanel = new ReviewPanel(context);

        // Wire up the review completion event
        reviewServer.onReviewComplete((results) => {
            console.log('📨 Review results received, updating panel...');
            reviewPanel.displayResults(results);
        });

    } catch (error) {
        console.error('❌ Failed to initialize classes:', error);
        vscode.window.showErrorMessage('Failed to initialize Reviewer components: ' + error.message);
        return;
    }

    // 3. Register Commands
    
    // Configure API Settings
    const configureCmd = vscode.commands.registerCommand(
        'post-commit-reviewer.configure',
        async () => {
            const apiKey = await vscode.window.showInputBox({
                prompt: 'Enter Groq API Key',
                placeHolder: 'gsk_************************',
                ignoreFocusOut: true
            });

            if (apiKey) {
                await vscode.workspace
                    .getConfiguration('postCommitReviewer')
                    .update('groqApiKey', apiKey, vscode.ConfigurationTarget.Global);

                vscode.window.showInformationMessage('API key saved successfully!');
            }
        }
    );

    // Configure Server Port
    const configurePortCmd = vscode.commands.registerCommand(
        'post-commit-reviewer.configureport',
        async () => {
            const port = await vscode.window.showInputBox({
                prompt: 'Enter Server Port',
                placeHolder: '3001',
                ignoreFocusOut: true
            });

            if (port && !isNaN(Number(port))) {
                await vscode.workspace
                    .getConfiguration('postCommitReviewer')
                    .update('serverPort', Number(port), vscode.ConfigurationTarget.Global);

                vscode.window.showInformationMessage(`Server port set to ${port}`);
            } else {
                vscode.window.showErrorMessage('Invalid port number');
            }
        }
    );

    // Create .env template
    const createEnvCmd = vscode.commands.registerCommand(
        'post-commit-reviewer.createEnvTemplate',
        async () => {
            const ws = vscode.workspace.workspaceFolders?.[0];
            if (!ws) {
                vscode.window.showErrorMessage('Open a folder first');
                return;
            }

            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(ws.uri.fsPath, '.env');

            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, 'GROQ_API_KEY=\nSERVER_PORT=3001\n');
                vscode.window.showInformationMessage('.env template created');
            } else {
                vscode.window.showWarningMessage('.env already exists');
            }
        }
    );
    // Command: Setup Git Hook
    const setupHookCmd = vscode.commands.registerCommand('post-commit-reviewer.setupHook', async () => {
        console.log('🔧 Setup hook command triggered');
        await hookManager.setupHook();
    });

    // Command: Start Server
    const startServerCmd = vscode.commands.registerCommand('post-commit-reviewer.startServer', () => {
        console.log('🚀 Start server command triggered');
        reviewServer.start();
    });

    // Command: Stop Server
    const stopServerCmd = vscode.commands.registerCommand('post-commit-reviewer.stopServer', async () => {
        console.log('🛑 Stop server command triggered');
        await reviewServer.stop();
    });

    // Command: Show Results Panel
    const showPanelCmd = vscode.commands.registerCommand('post-commit-reviewer.showPanel', () => {
        console.log('📊 Show panel command triggered');
        reviewPanel.show();
    });



    // Add all commands to subscriptions
    context.subscriptions.push(
        setupHookCmd, 
        startServerCmd, 
        stopServerCmd, 
        showPanelCmd
    );

    console.log('✅ Commands registered successfully');

    // 4. Auto-Start Logic
    // Check configuration and auto-start server if enabled
    const config = ConfigManager.getConfig();
    if (config.autoStart) {
        console.log('🔄 Auto-start enabled, checking configuration...');
        // We do a silent check here. If invalid, we don't nag the user on startup,
        // we just log it. They will be prompted when they try to use it.
        ConfigManager.validateConfig().then((isValid) => {
            if (isValid) {
                reviewServer.start();
            } else {
                console.log('⚠️ Auto-start skipped: API Key not configured.');
            }
        });
    }
}

/**
 * This method is called when your extension is deactivated
 */
async function deactivate() {
    console.log('🛑 Extension deactivating');
    if (reviewServer) {
        await reviewServer.stop();
    }
}

module.exports = {
    activate,
    deactivate
};