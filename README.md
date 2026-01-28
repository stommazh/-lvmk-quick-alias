# @khanglvm/quick-alias

⚡ Quick shell alias setup - boost your terminal productivity!

## Quick Install

```bash
# Interactive (all features)
npx @khanglvm/quick-alias
```

## Features

- **🤖 AI Commit** - Auto-generate commit messages with AI
- **🔄 Shell Reload** - Hot-reload shell config
- **📦 Stealth pnpm** - Use pnpm in yarn/npm projects transparently

---

## AI Commit

Set up `gp` and `gc` commands for AI-generated commit messages.

```bash
gp                 # Stage all → AI commit → Push
gc                 # AI commit for staged files
gp -r              # Review AI message before commit
gp "custom msg"    # Use your own message
```

**Supported AI CLIs:** Claude, Gemini, Copilot, OpenCode

---

## Shell Reload

Quick alias to reload your shell configuration:

```bash
rl     # or src, reload
```

---

## Stealth pnpm

**Use pnpm in yarn/npm projects without changing any config files.**

Projects continue using `yarn` and `npm` commands as normal, while you get 80% disk space savings via pnpm's global store.

### Commands

```bash
di     # Install via pnpm (yarn/npm commands still work!)
da     # Add dep (updates yarn.lock/package-lock.json for team)
dr     # Remove dep (updates lockfile for team)
```

### How it works

| What | Benefit |
|:-----|:--------|
| **Installs via pnpm** | 80% disk savings via content-addressable store |
| **yarn/npm commands work** | `yarn dev`, `npm run build` work normally after `di` |
| **Auto-generates configs** | `pnpm-workspace.yaml`, `.pnpmfile.cjs` created automatically |
| **No git changes** | All generated files added to `.git/info/exclude` |
| **Team compatibility** | `da`/`dr` use yarn/npm to update lockfiles |

### Example

```bash
# You (using stealth pnpm)
cd ~/project && di                # Install via pnpm, saves space
yarn dev                          # Works normally!
da lodash                         # Install lodash, updates lock file, reinstalls via pnpm

# Your teammate (using yarn)
cd ~/project && yarn install      # Uses your updated yarn.lock
yarn dev                          # Works as expected
```

---

## Requirements

- Node.js >= 18.0.0
- zsh or bash shell

## License

MIT
