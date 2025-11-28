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
    
    // Command: Setup Git Hook
    const setupHookCmd = vscode.commands.registerCommand('post-commit-reviewer.setupHook', async () => {
        console.log('🔧 Setup hook command triggered');
        await hookManager.setupHook();
    });

    // Command: Start Server
    const startServerCmd = vscode.commands.registerCommand('post-commit-reviewer.startServer', async () => {
        console.log('🚀 Start server command triggered');
        // Validate API key presence before starting
        const isValid = await ConfigManager.validateConfig();
        if (isValid) {
            reviewServer.start();
        }
    });

    // Command: Stop Server
    const stopServerCmd = vscode.commands.registerCommand('post-commit-reviewer.stopServer', () => {
        console.log('🛑 Stop server command triggered');
        reviewServer.stop();
    });

    // Command: Show Results Panel
    const showPanelCmd = vscode.commands.registerCommand('post-commit-reviewer.showPanel', () => {
        console.log('📊 Show panel command triggered');
        reviewPanel.show();
    });

    // Command: Configure API Settings (Settings or .env)
    const configureCmd = vscode.commands.registerCommand('post-commit-reviewer.configure', async () => {
        const options = [
            'Configure in VS Code Settings',
            'Create/Edit .env File',
            'Show Current Configuration',   
            'Cancel'];
        const choice = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select configuration method for Groq API Key'
        });

        switch (choice) {
            case 'Configure in VS Code Settings':
                await ConfigManager.configureInSettings();
                break;
            case 'Create/Edit .env File':
                await ConfigManager.showEnvInstructions();
                break;
            case 'Show Current Configuration':
                await ConfigManager.showCurrentConfig();
                break;
            case 'Cancel':
                break;
            default:
                break;
        }
    });

    // Command: Configure Server Port
    const configurePortCmd = vscode.commands.registerCommand('post-commit-reviewer.configureport', async () => {
        await ConfigManager.configureServerPort();
    });

    // Command: Create .env Template
    const createEnvCmd = vscode.commands.registerCommand('post-commit-reviewer.createEnvTemplate', async () => {
        await ConfigManager.createEnvTemplate();
    });

    // Add all commands to subscriptions
    context.subscriptions.push(
        setupHookCmd, 
        startServerCmd, 
        stopServerCmd, 
        showPanelCmd, 
        configureCmd, 
        createEnvCmd,
        configurePortCmd
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
function deactivate() {
    console.log('🛑 Extension deactivating');
    if (reviewServer) {
        reviewServer.stop();
    }
}

module.exports = {
    activate,
    deactivate
};