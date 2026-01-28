#!/bin/bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# pnpm Space-Saving Dev Aliases Installer
# Adds: di (dev-install), da (dev-add), dr (dev-remove)
# Auto-detects yarn/npm based on lockfile
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}📦 pnpm Space-Saving Dev Aliases Installer${NC}"
echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Detect shell config file
if [[ -f "$HOME/.zshrc" ]]; then
    SHELL_RC="$HOME/.zshrc"
    SHELL_NAME="zsh"
elif [[ -f "$HOME/.bashrc" ]]; then
    SHELL_RC="$HOME/.bashrc"
    SHELL_NAME="bash"
else
    SHELL_RC="$HOME/.zshrc"
    SHELL_NAME="zsh"
    touch "$SHELL_RC"
fi

echo -e "${YELLOW}Detected shell: ${SHELL_NAME} (${SHELL_RC})${NC}"

# Check if already installed
if grep -q "# >>> pnpm-dev-aliases >>>" "$SHELL_RC" 2>/dev/null; then
    echo -e "${GREEN}✓ Already installed! Skipping...${NC}"
    exit 0
fi

# Install pnpm if not present
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}Installing pnpm...${NC}"
    npm install -g pnpm
fi

echo -e "${YELLOW}Adding aliases to ${SHELL_RC}...${NC}"

# Append aliases to shell config
cat >> "$SHELL_RC" << 'ALIASES'

# >>> pnpm-dev-aliases >>>
# Space-saving dev install using pnpm's global store
# Commands: di (install), da (add), dr (remove)
# Auto-detects yarn/npm based on lockfile. Maintains lockfile compatibility for team.

# Detect package manager based on lockfile
_detect_pm() {
    if [[ -f "yarn.lock" ]]; then echo "yarn"
    elif [[ -f "package-lock.json" ]]; then echo "npm"
    elif [[ -f "pnpm-lock.yaml" ]]; then echo "pnpm"
    else echo "npm"; fi
}

dev-install() {
    local G=$'\033[0;32m' Y=$'\033[1;33m' B=$'\033[0;34m' N=$'\033[0m' D=$'\033[2m'
    echo "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
    echo "📦 Stealth pnpm Install (Space-Saving Mode)"
    echo "${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}"
    command -v pnpm &>/dev/null || { echo "${Y}Installing pnpm...${N}"; npm install -g pnpm; }
    if [[ -d ".git" ]]; then
        mkdir -p .git/info
        for f in pnpm-lock.yaml pnpm-workspace.yaml .pnpmfile.cjs .npmrc; do
            grep -q "^${f}$" .git/info/exclude 2>/dev/null || echo "$f" >> .git/info/exclude
        done
    fi
    if [[ -f "package.json" ]] && grep -q '"workspaces"' package.json 2>/dev/null; then
        echo "${D}Generating pnpm-workspace.yaml...${N}"
        node -e "const p=require('./package.json');let w=p.workspaces;if(w&&w.packages)w=w.packages;if(Array.isArray(w)){console.log('packages:');w.forEach(x=>console.log('  - \"'+x+'\"'))}" > pnpm-workspace.yaml 2>/dev/null
        echo "${D}Generating .pnpmfile.cjs...${N}"
        cat > .pnpmfile.cjs << 'PF'
const fs=require('fs'),path=require('path');
function getWsPkgs(){const p=new Set();try{const d=['main',...fs.readdirSync('packages').map(x=>'packages/'+x)];for(const dir of d){const f=path.join(dir,'package.json');if(fs.existsSync(f)){const pkg=JSON.parse(fs.readFileSync(f,'utf8'));if(pkg.name)p.add(pkg.name)}}}catch(e){}return p}
const ws=getWsPkgs();
function readPackage(pkg){for(const t of['dependencies','devDependencies','peerDependencies']){if(pkg[t]){for(const[n,v]of Object.entries(pkg[t])){if(ws.has(n)&&!v.startsWith('workspace:'))pkg[t][n]='workspace:*'}}}return pkg}
module.exports={hooks:{readPackage}};
PF
    fi
    grep -q "shamefully-hoist=true" .npmrc 2>/dev/null || echo "shamefully-hoist=true" >> .npmrc
    echo "" && echo "${Y}Installing via pnpm...${N}" && echo "${D}(Using global store)${N}" && echo ""
    export COREPACK_ENABLE_STRICT=0
    COREPACK_ENABLE_STRICT=0 pnpm install 2>&1 | tail -20
    echo "" && echo "${G}✨ Done! Use yarn/npm commands as normal.${N}"
}

dev-add() {
    local G=$'\033[0;32m' Y=$'\033[1;33m' B=$'\033[0;34m' N=$'\033[0m'
    local PM=$(_detect_pm)
    [[ -z "$1" ]] && { echo "Usage: da [-D|-W] <package>"; return 1; }
    echo "${B}Detected: ${PM}${N}"
    echo "${Y}Adding via ${PM}...${N}"
    if [[ "$PM" == "yarn" ]]; then yarn add "$@"
    elif [[ "$PM" == "npm" ]]; then npm install "$@"
    else pnpm add "$@"; fi
    echo "" && dev-install
    echo "${G}✓ ${PM} lockfile updated, installed via pnpm${N}"
}

dev-remove() {
    local G=$'\033[0;32m' Y=$'\033[1;33m' B=$'\033[0;34m' N=$'\033[0m'
    local PM=$(_detect_pm)
    [[ -z "$1" ]] && { echo "Usage: dr [-W] <package>"; return 1; }
    echo "${B}Detected: ${PM}${N}"
    echo "${Y}Removing via ${PM}...${N}"
    if [[ "$PM" == "yarn" ]]; then yarn remove "$@"
    elif [[ "$PM" == "npm" ]]; then npm uninstall "$@"
    else pnpm remove "$@"; fi
    echo "" && dev-install
    echo "${G}✓ ${PM} lockfile updated, installed via pnpm${N}"
}

alias di="dev-install"
alias da="dev-add"
alias dr="dev-remove"
# <<< pnpm-dev-aliases <<<
ALIASES

echo ""
echo -e "${GREEN}✓ Installed successfully!${NC}"
echo ""
echo -e "${BOLD}Available commands:${NC}"
echo -e "  ${BLUE}di${NC}  - Install deps via pnpm (space-saving)"
echo -e "  ${BLUE}da${NC}  - Add dep (auto-detects yarn/npm), reinstall via pnpm"
echo -e "  ${BLUE}dr${NC}  - Remove dep (auto-detects yarn/npm), reinstall via pnpm"
echo ""
echo -e "${YELLOW}Reloading shell...${NC}"

# Reload shell
exec $SHELL
