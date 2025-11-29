# AI Post-Commit Code Review Extension

A VS Code extension that automatically reviews your committed code using AI.
Just commit your changes, and the extension analyzes your diff for possible security issues, logical errors, and risky patterns using Groq LLMs.

It installs a Git post-commit hook, runs a lightweight local review server, and displays structured AI feedback directly inside VS Code.

## Features

- **Automatic Code Review**: Triggers after every Git commit via post-commit hooks
- **AI-Powered Analysis**: Uses Groq's Llama3 model for intelligent code review
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **Real-time Results**: Displays review results directly in VS Code
- **Issue Detection**: Identifies logic errors, security risks, performance issues, and code smells
- **Actionable Feedback**: Provides explanations, reasons, and suggested fixes
- **Support for Multiple VS Code Workspaces**: Automatically manages the review server for each opened workspace folder 

## Requirements

- VS Code 1.106.0 or higher
- Node.js (for the local review server)
- Git repository
- Groq API key (free at [console.groq.com](https://console.groq.com))

## Installation

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MadhurPrakash.post-commit-reviewer) or download the `.vsix` file from the [Releases](https://github.com/Madhur-Prakash/VSCode-Extension-Post-Commit-Reviewer/releases).

---

## Setup Instructions

1. **Install the extension**
2. **Get a Groq API key** from [console.groq.com](https://console.groq.com)
3. **Ensure a Git Repository Exists:**
   - Navigate to your project folder in VS Code
   - Initialize a Git repository if not already done:
     ```bash
     git init
     ```
4. Install the Git Hook
   - From the Command Palette:
      ```bash
      Post-Commit Reviewer: Setup Git Hook
      ```
      >This creates a post-commit hook that triggers reviews after each commit.
5. **Configure the API key**:
   - Open command palette **`Ctrl+Shift+P`** on windows or **`Cmd+Shift+P`** on macOS
      ```bash
      Post-Commit Reviewer: Configure API Settings
      ```
   - Enter your Groq API key

6. **Start the Review Server**
   - The server starts automatically whenever you open a folder.
You can still manage it manually:
      ```bash
      Post-Commit Reviewer: Start Review Server
      Post-Commit Reviewer: Stop Review Server
      ```
7. **Commit Normally**
   - Make Git commits as usual. The extension will automatically review your changes.
---

## How It Works

1. **Commit Code**: Make a Git commit as usual
2. **Hook Triggers**: Post-commit hook automatically calls the local server
3. **Diff Analysis**: Server extracts the commit diff
4. **AI Review**: Diff is sent to Groq's Llama3 for analysis
5. **Results Display**: Review results appear in VS Code panel


## Extension Settings

- You can configure the following settings through command palette:

   ### Commands

   - **`Post-Commit Reviewer: Configure API Settings`** - Set your Groq API key
   - **`Post-Commit Reviewer: Setup Git Hook`** - Install the post-commit hook
   - **`Post-Commit Reviewer: Show Review Panel`** - Open the review results panel
   - **`Post-Commit Reviewer: Start Review Server`** - Start the local review server
   - **`Post-Commit Reviewer: Stop Review Server`** - Stop the local review server
   - **`Post-Commit Reviewer: Configure Server Port`** - Configure Server Port
   - **`Post-Commit Reviewer: Toggle Auto-Start Server`** - Enable/disable auto-start of the review server
   - **`Post-Commit Reviewer: Create .env Template`** - Generate a .env template file for environment variables

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
- Node must be installed for the local server to run

---

**Enjoy automated code reviews!** 
