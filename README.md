# AI Post-Commit Code Review Extension

Automatically reviews your committed code using AI (Groq's Llama3) immediately after Git commits. Get instant feedback on code quality, security issues, performance problems, and best practices violations.

## Features

- **Automatic Code Review**: Triggers after every Git commit via post-commit hooks
- **AI-Powered Analysis**: Uses Groq's Llama3 model for intelligent code review
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Real-time Results**: Displays review results directly in VS Code
- **Issue Detection**: Identifies logic errors, security risks, performance issues, and code smells
- **Actionable Feedback**: Provides explanations, reasons, and suggested fixes

## Requirements

- VS Code 1.106.0 or higher
- Node.js (for the local review server)
- Git repository
- Groq API key (free at [console.groq.com](https://console.groq.com))

## Setup

1. **Install the extension**
2. **Get a Groq API key** from [console.groq.com](https://console.groq.com)
3. **Configure the API key**:
   - Open VS Code settings
   - Search for "Post-Commit Reviewer"
   - Set your Groq API key in `postCommitReviewer.groqApiKey`
4. **Setup Git hook**:
   - Open Command Palette (`Ctrl+Shift+P`)
   - Run "Post-Commit Reviewer: Setup Git Hook"
5. **Start the review server**:
   - Run "Post-Commit Reviewer: Start Review Server"
   - Or enable auto-start in settings

## Extension Settings

This extension contributes the following settings:

- `postCommitReviewer.groqApiKey`: Your Groq API key for code review
- `postCommitReviewer.serverPort`: Port for the local review server (default: 3001)
- `postCommitReviewer.autoStart`: Automatically start the review server when VS Code opens

## How It Works

1. **Commit Code**: Make a Git commit as usual
2. **Hook Triggers**: Post-commit hook automatically calls the local server
3. **Diff Analysis**: Server extracts the commit diff
4. **AI Review**: Diff is sent to Groq's Llama3 for analysis
5. **Results Display**: Review results appear in VS Code panel

## Commands

- `Post-Commit Reviewer: Setup Git Hook` - Install the post-commit hook
- `Post-Commit Reviewer: Start Review Server` - Start the local review server
- `Post-Commit Reviewer: Stop Review Server` - Stop the local review server
- `Post-Commit Reviewer: Show Review Panel` - Open the review results panel

## Architecture

```
├── extension.js          # Main extension entry point
├── src/
│   ├── server.js         # Node.js backend server
│   ├── hookManager.js    # Git hook installation
│   └── reviewPanel.js    # VS Code UI panel
└── run_review.js         # Generated hook runner script
```

## Known Issues

- Requires internet connection for AI analysis
- Large diffs may take longer to process
- Git hook setup requires write permissions to `.git/hooks/`

## Release Notes

### 0.0.1

Initial release:
- AI-powered post-commit code review
- Cross-platform Git hook support
- Real-time results in VS Code
- Groq Llama3 integration

---

**Enjoy automated code reviews!** 🚀
