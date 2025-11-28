const vscode = require('vscode');

class ReviewPanel {
    constructor(context) {
        this.context = context;
        this.panel = null;
        this.currentResults = null;
    }

    show() {
        console.log('📊 Showing review panel');
        if (this.panel) {
            console.log('🔄 Panel exists, revealing');
            this.panel.reveal();
            return;
        }

        console.log('🆕 Creating new webview panel');
        this.panel = vscode.window.createWebviewPanel(
            'postCommitReview',
            'Code Review Results',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.onDidDispose(() => {
            console.log('🗑️ Panel disposed');
            this.panel = null;
        });

        this.updateContent();
    }

    displayResults(results) {
        console.log('📊 Displaying review results:', results);
        
        // Ensure results is an object
        if (typeof results === 'string') {
            try {
                this.currentResults = JSON.parse(results);
            } catch (e) {
                console.error('Failed to parse results:', e);
                this.currentResults = { issues: [] };
            }
        } else {
            this.currentResults = results || { issues: [] };
        }
        
        vscode.commands.executeCommand('setContext', 'postCommitReviewer.hasResults', true);
        
        if (!this.panel) {
            console.log('📝 Creating new panel');
            this.show();
        } else {
            console.log('🔄 Updating existing panel');
            this.updateContent();
        }

        // Show notification
        const issueCount = results.issues?.length || 0;
        console.log('📊 Issue count:', issueCount);
        if (issueCount > 0) {
            vscode.window.showWarningMessage(`Code review found ${issueCount} issue(s)`, 'View Results')
                .then(selection => {
                    if (selection === 'View Results') {
                        this.show();
                    }
                });
        } else {
            vscode.window.showInformationMessage('Code review completed - no issues found');
        }
    }

    updateContent() {
        if (!this.panel) return;

        const html = this.getWebviewContent();
        this.panel.webview.html = html;
    }

    getWebviewContent() {
        if (!this.currentResults) {
            return this.getEmptyStateHtml();
        }

        const issues = this.currentResults.issues || [];
        const issueCount = issues.length;
        console.log(`📊 issues are: ${issues}`);

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Review Results</title>
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            padding: 20px; 
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
        }
        .header { 
            border-bottom: 1px solid var(--vscode-panel-border); 
            padding-bottom: 15px; 
            margin-bottom: 20px; 
        }
        .issue { 
            border: 1px solid var(--vscode-panel-border); 
            border-radius: 6px; 
            padding: 15px; 
            margin-bottom: 15px; 
            background: var(--vscode-editor-background);
        }
        .issue-title { 
            font-weight: bold; 
            color: var(--vscode-errorForeground); 
            margin-bottom: 8px; 
        }
        .issue-section { 
            margin-bottom: 10px; 
        }
        .issue-label { 
            font-weight: bold; 
            color: var(--vscode-descriptionForeground); 
        }
        .issue-content { 
            margin-left: 10px; 
            white-space: pre-wrap; 
        }
        .no-issues { 
            text-align: center; 
            color: var(--vscode-descriptionForeground); 
            font-style: italic; 
        }
        .lines { 
            font-family: var(--vscode-editor-font-family); 
            background: var(--vscode-textCodeBlock-background); 
            padding: 5px; 
            border-radius: 3px; 
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>Code Review Results</h2>
        <p>Total Issues: <strong>${issueCount}</strong></p>
    </div>
    
    ${issueCount === 0 ? 
        '<div class="no-issues">No issues found in the latest commit. Great job! 🎉</div>' :
        issues.map((issue, index) => `
            <div class="issue">
                <div class="issue-title">${this.escapeHtml(issue.title || `Issue ${index + 1}`)}</div>
                
                <div class="issue-section">
                    <div class="issue-label">Explanation:</div>
                    <div class="issue-content">${this.escapeHtml(issue.explanation || 'No explanation provided')}</div>
                </div>
                
                <div class="issue-section">
                    <div class="issue-label">Why it's a problem:</div>
                    <div class="issue-content">${this.escapeHtml(issue.reason || 'No reason provided')}</div>
                </div>
                
                <div class="issue-section">
                    <div class="issue-label">Suggested fix:</div>
                    <div class="issue-content">${this.escapeHtml(issue.suggested_fix || 'No fix suggested')}</div>
                </div>
                
                ${issue.lines ? `
                <div class="issue-section">
                    <div class="issue-label">Affected lines:</div>
                    <div class="issue-content lines">${this.escapeHtml(issue.lines)}</div>
                </div>
                ` : ''}
            </div>
        `).join('')
    }
</body>
</html>`;
    }

    getEmptyStateHtml() {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Review Results</title>
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            padding: 20px; 
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            text-align: center;
        }
        .empty-state {
            margin-top: 50px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="empty-state">
        <h2>Code Review Results</h2>
        <p>No reviews available yet.</p>
        <p>Make a commit to trigger an automatic code review.</p>
    </div>
</body>
</html>`;
    }

    escapeHtml(text) {
        const div = { innerHTML: '' };
        div.textContent = text;
        return div.innerHTML;
    }
}

module.exports = { ReviewPanel };