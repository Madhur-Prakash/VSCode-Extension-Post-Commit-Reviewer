const vscode = require('vscode');

let reviewServer;
let hookManager;
let reviewPanel;

function activate(context) {
    console.log('🚀 Post-Commit Reviewer extension activated');
    
    try {
        console.log('📦 Loading modules...');
        const { ReviewServer } = require('./src/server');
        const { HookManager } = require('./src/hookManager');
        const { ReviewPanel } = require('./src/reviewPanel');
        console.log('✅ Modules loaded successfully');

        reviewServer = new ReviewServer(context);
        hookManager = new HookManager(context);
        reviewPanel = new ReviewPanel(context);
        console.log('✅ All components initialized');
    } catch (error) {
        console.error('❌ Failed to initialize components:', error);
        vscode.window.showErrorMessage('Post-Commit Reviewer failed to initialize: ' + error.message);
        return;
    }

    // Register commands
    const setupHookCmd = vscode.commands.registerCommand('post-commit-reviewer.setupHook', () => {
        console.log('🔧 Setup hook command triggered');
        hookManager.setupHook();
    });

    const startServerCmd = vscode.commands.registerCommand('post-commit-reviewer.startServer', () => {
        console.log('🚀 Start server command triggered');
        reviewServer.start();
    });

    const stopServerCmd = vscode.commands.registerCommand('post-commit-reviewer.stopServer', () => {
        console.log('🛑 Stop server command triggered');
        reviewServer.stop();
    });

    const showPanelCmd = vscode.commands.registerCommand('post-commit-reviewer.showPanel', () => {
        console.log('📊 Show panel command triggered');
        reviewPanel.show();
    });

    context.subscriptions.push(setupHookCmd, startServerCmd, stopServerCmd, showPanelCmd);
    console.log('✅ Commands registered');

    // Auto-start server if configured
    const config = vscode.workspace.getConfiguration('postCommitReviewer');
    if (config.get('autoStart')) {
        console.log('🔄 Auto-starting server');
        reviewServer.start();
    }

    // Set up review result handler
    reviewServer.onReviewComplete((results) => {
        console.log('📨 Review results received, displaying in panel');
        reviewPanel.displayResults(results);
    });
}

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
