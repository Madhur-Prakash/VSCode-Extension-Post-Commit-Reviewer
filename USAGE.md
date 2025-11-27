# Usage Guide

## Quick Start

1. **Install Extension**: Install the AI Post-Commit Code Reviewer extension in VS Code

2. **Get Groq API Key**:
   - Visit [console.groq.com](https://console.groq.com)
   - Sign up for a free account
   - Generate an API key

3. **Configure Extension**:
   - Open VS Code Settings (`Ctrl+,`)
   - Search for "Post-Commit Reviewer"
   - Set your Groq API key in `postCommitReviewer.groqApiKey`

4. **Setup Git Hook**:
   - Open Command Palette (`Ctrl+Shift+P`)
   - Run: `Post-Commit Reviewer: Setup Git Hook`

5. **Start Server**:
   - Run: `Post-Commit Reviewer: Start Review Server`
   - Or enable `postCommitReviewer.autoStart` in settings

6. **Test It**:
   - Make any code change
   - Commit with `git commit -m "test"`
   - Review results will appear automatically

## Commands

- `Post-Commit Reviewer: Setup Git Hook` - Install post-commit hook
- `Post-Commit Reviewer: Start Review Server` - Start local server
- `Post-Commit Reviewer: Stop Review Server` - Stop local server  
- `Post-Commit Reviewer: Show Review Panel` - Open results panel

## Settings

- `postCommitReviewer.groqApiKey` - Your Groq API key (required)
- `postCommitReviewer.serverPort` - Server port (default: 3001)
- `postCommitReviewer.autoStart` - Auto-start server (default: true)

## Troubleshooting

**Server won't start**: Check if port 3001 is available or change the port in settings

**No reviews appearing**: Ensure the Git hook is installed and the server is running

**API errors**: Verify your Groq API key is correct and has quota remaining

**Hook not triggering**: Check that `.git/hooks/post-commit` exists and is executable