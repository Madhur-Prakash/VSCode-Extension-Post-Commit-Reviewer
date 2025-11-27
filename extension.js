const vscode = require('vscode');
const { ReviewServer } = require('./src/server');
const { HookManager } = require('./src/hookManager');
const { ReviewPanel } = require('./src/reviewPanel');

let reviewServer;
let hookManager;
let reviewPanel;

function activate(context) {
    console.log('Post-Commit Reviewer extension activated');

    reviewServer = new ReviewServer(context);
    hookManager = new HookManager(context);
    reviewPanel = new ReviewPanel(context);

    // Register commands
    const setupHookCmd = vscode.commands.registerCommand('post-commit-reviewer.setupHook', () => {
        hookManager.setupHook();
    });

    const startServerCmd = vscode.commands.registerCommand('post-commit-reviewer.startServer', () => {
        reviewServer.start();
    });

    const stopServerCmd = vscode.commands.registerCommand('post-commit-reviewer.stopServer', () => {
        reviewServer.stop();
    });

    const showPanelCmd = vscode.commands.registerCommand('post-commit-reviewer.showPanel', () => {
        reviewPanel.show();
    });

    context.subscriptions.push(setupHookCmd, startServerCmd, stopServerCmd, showPanelCmd);

    // Auto-start server if configured
    const config = vscode.workspace.getConfiguration('postCommitReviewer');
    if (config.get('autoStart')) {
        reviewServer.start();
    }

    // Set up review result handler
    reviewServer.onReviewComplete((results) => {
        reviewPanel.displayResults(results);
    });
}

function deactivate() {
    if (reviewServer) {
        reviewServer.stop();
    }
}

module.exports = {
    activate,
    deactivate
};
