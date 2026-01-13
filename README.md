# @lvmk/quick-alias

⚡ Quick shell alias setup - boost your terminal productivity!

## Features

- **🤖 AI Git Aliases** - Auto-generate commit messages with AI
- **🔄 Shell Reload** - Quickly reload your shell configuration
- More features coming soon...

## Quick Start

```bash
npx @lvmk/quick-alias
```

## AI Git Aliases

Set up `gp` and `gc` commands that use AI (Claude, Gemini, etc.) to automatically generate commit messages.

```bash
gp                 # Stage all → AI generates commit → Push
gc                 # AI generates commit for staged files
gp -r              # Review AI message before commit
gp "custom msg"    # Use your own message
```

### Supported AI CLI Tools
- Claude Code (`claude`)
- Gemini CLI (`gemini`)
- GitHub Copilot CLI (`copilot`)
- OpenCode (`opencode`)
- Aider (`aider`)

## Shell Reload

Set up a quick alias to reload your shell configuration:

```bash
rl     # or src, reload - your choice!
```

## Requirements

- Node.js >= 18.0.0
- zsh or bash shell
- For AI features: One of the supported AI CLI tools

## License

MIT
