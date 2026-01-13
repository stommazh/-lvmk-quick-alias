/**
 * Build the CLI command string for the template based on provider
 */
function buildCLICommand(cli, model) {
    switch (cli.id) {
        case 'claude':
            return `claude --print --model ${model} --dangerously-skip-permissions "$prompt"`;
        case 'gemini':
            return `gemini --prompt "$prompt" --model ${model}`;
        case 'copilot':
            return `copilot --prompt "$prompt"`;
        case 'opencode':
            return `opencode run "$prompt" --model ${model}`;
        case 'aider':
            return `aider --message "$prompt" --model ${model} --yes-always --no-auto-commits`;
        default:
            return `${cli.command} ${cli.headlessFlag} "$prompt" ${cli.modelFlag ? `${cli.modelFlag} ${model}` : ''}`;
    }
}

/**
 * Generate the gp (git push) alias function
 */
export function generateGpAlias({ aliasName, cli, model }) {
    const cliCommand = buildCLICommand(cli, model);

    return `# Git Push with AI Commit Message (${aliasName} alias)
# Provider: ${cli.name} | Model: ${model}
${aliasName}() {
    local GREEN=$'\\033[0;32m'
    local YELLOW=$'\\033[1;33m'
    local BLUE=$'\\033[0;34m'
    local RED=$'\\033[0;31m'
    local NC=$'\\033[0m'
    local BOLD=$'\\033[1m'
    local DIM=$'\\033[2m'
    
    local review_mode=false
    local user_message=""
    
    if [[ "$1" == "-r" ]]; then
        review_mode=true
        shift
        user_message="$*"
    else
        user_message="$*"
    fi

    if ! command -v git &> /dev/null; then
        echo "\${RED}Error:\${NC} git is not installed"
        return 1
    fi

    if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
        echo "\${RED}Error:\${NC} Not a git repository"
        return 1
    fi

    if git ls-files -u | grep -q .; then
        echo "\${RED}Error:\${NC} Unresolved merge conflicts"
        return 1
    fi

    local current_branch=$(git branch --show-current 2>/dev/null)
    if [ -z "$current_branch" ]; then
        echo "\${RED}Error:\${NC} Detached HEAD state"
        return 1
    fi

    local has_staged=false
    local has_unstaged=false
    local has_untracked=false
    
    ! git diff --cached --quiet && has_staged=true
    ! git diff --quiet && has_unstaged=true
    [ -n "$(git ls-files --others --exclude-standard 2>/dev/null)" ] && has_untracked=true

    if [ "$has_staged" = false ] && [ "$has_unstaged" = false ] && [ "$has_untracked" = false ]; then
        echo "\${YELLOW}Nothing to commit\${NC} - working tree clean"
        local unpushed=$(git log @{u}.. --oneline 2>/dev/null | wc -l | tr -d ' ')
        if [ "$unpushed" -gt 0 ] 2>/dev/null; then
            echo "\${DIM}You have \${unpushed} unpushed commit(s)\${NC}"
            echo -n "\${YELLOW}Push existing commits? [Y/n]:\${NC} "
            read push_only
            if [[ ! "$push_only" =~ ^[nN] ]]; then
                git push origin "$current_branch" 2>&1 && echo "\${GREEN}✓ Pushed\${NC}"
            fi
        fi
        return 0
    fi

    if ! git remote get-url origin > /dev/null 2>&1; then
        echo "\${YELLOW}Warning:\${NC} No remote 'origin' configured"
        local skip_push=true
    else
        local skip_push=false
    fi

    echo "\${BOLD}\${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${NC}"
    echo "\${BOLD}🚀 Git Push with AI Commit Message\${NC}"
    echo "\${BOLD}\${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${NC}"

    local commit_message=""
    
    if [ -n "$user_message" ]; then
        echo ""
        echo "\${GREEN}✓\${NC} Using provided commit message"
        commit_message="$user_message"
    else
        if ! command -v ${cli.command} &> /dev/null; then
            echo "\${RED}Error:\${NC} ${cli.name} is not installed"
            return 1
        fi

        echo ""
        echo "\${YELLOW}[1/4]\${NC} 🔍 Analyzing git changes..."
    
        local staged_diff=$(git diff --cached 2>/dev/null | head -500)
        local unstaged_diff=$(git diff 2>/dev/null | head -500)
        local untracked_files=$(git ls-files --others --exclude-standard 2>/dev/null | head -50)
    
        local prompt="Analyze the following git changes and generate a commit message following the Conventional Commits specification with bullet-point changelog style.

## Commit Message Format:
<type>(<scope>): <short summary>

- <bullet point describing a specific change>
- <bullet point describing another change>

## Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

## Rules:
1. Subject line: max 50 chars, imperative mood, no period
2. Body uses bullet points (- ) to list specific changes
3. Each bullet should be concise and actionable

## Git Changes:

### Staged Changes:
\${staged_diff:-\\"(none)\\"}

### Unstaged Changes:
\${unstaged_diff:-\\"(none)\\"}

### Untracked Files:
\${untracked_files:-\\"(none)\\"}

OUTPUT ONLY THE COMMIT MESSAGE, nothing else."

        echo "\${YELLOW}[2/4]\${NC} 🤖 Generating commit message with ${cli.name}..."
        echo "\${DIM}     (this may take a few seconds...)\${NC}"
    
        local temp_file=$(mktemp)
        local error_file=$(mktemp)
    
        ${cliCommand} > "$temp_file" 2> "$error_file"
        local exit_code=$?
    
        if [ $exit_code -ne 0 ] || [ ! -s "$temp_file" ]; then
            echo "\${RED}Error:\${NC} Failed to generate commit message"
            cat "$error_file" 2>/dev/null
            rm -f "$temp_file" "$error_file"
            return 1
        fi
    
        commit_message=$(cat "$temp_file")
        rm -f "$temp_file" "$error_file"
    
        echo ""
        echo "\${GREEN}Generated Commit Message:\${NC}"
        echo "$commit_message"
    
        if [ "$review_mode" = true ]; then
            echo ""
            echo -n "\${YELLOW}Proceed with this commit message? [Y/n/e(dit)]:\${NC} "
            read confirm
    
            case "$confirm" in
                [nN]) echo "\${YELLOW}Aborted.\${NC}"; return 0 ;;
                [eE])
                    local edit_file=$(mktemp)
                    echo "$commit_message" > "$edit_file"
                    \${EDITOR:-vim} "$edit_file"
                    commit_message=$(cat "$edit_file")
                    rm -f "$edit_file"
                    ;;
            esac
        fi
    fi

    echo ""
    echo "\${YELLOW}[3/4]\${NC} 📦 Staging and committing changes..."
    
    git add -A
    
    if git diff --cached --quiet; then
        echo "\${YELLOW}Nothing to commit\${NC}"
        return 0
    fi
    
    if ! git commit -m "$commit_message" 2>&1; then
        echo "\${RED}Error:\${NC} Failed to commit"
        return 1
    fi
    
    echo "\${GREEN}✓\${NC} Changes committed"

    if [ "$skip_push" = true ]; then
        echo "\${YELLOW}Skipping push\${NC} - no remote"
        echo "\${BOLD}\${GREEN}✨ Done!\${NC}"
        return 0
    fi

    echo ""
    echo "\${YELLOW}[4/4]\${NC} 🚀 Pushing to remote..."
    
    local push_output
    push_output=$(git push origin "$current_branch" 2>&1)
    local push_exit=$?
    
    if [ $push_exit -eq 0 ]; then
        echo "\${GREEN}✓ Pushed to origin/$current_branch\${NC}"
        local mr_url=$(echo "$push_output" | grep -oE 'https?://[^ ]+' | grep -iE '(merge|pull)' | head -1)
        if [ -n "$mr_url" ]; then
            echo ""
            echo "\${BLUE}📎 Create Merge Request:\${NC}"
            echo "   \${BOLD}$mr_url\${NC}"
        fi
    else
        if echo "$push_output" | grep -q "no upstream"; then
            git push --set-upstream origin "$current_branch" 2>&1 && echo "\${GREEN}✓ Pushed\${NC}"
        else
            echo "\${RED}Error:\${NC} Push failed"
            echo "\${DIM}$push_output\${NC}"
            return 1
        fi
    fi

    echo ""
    echo "\${BOLD}\${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${NC}"
    echo "\${BOLD}\${GREEN}✨ Done!\${NC}"
    echo "\${BOLD}\${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${NC}"
}`;
}

/**
 * Generate the gc (git commit) alias function
 */
export function generateGcAlias({ aliasName, cli, model }) {
    const cliCommand = buildCLICommand(cli, model);

    return `# Git Commit with AI Message (${aliasName} alias)
# Provider: ${cli.name} | Model: ${model}
${aliasName}() {
    local GREEN=$'\\033[0;32m'
    local YELLOW=$'\\033[1;33m'
    local BLUE=$'\\033[0;34m'
    local RED=$'\\033[0;31m'
    local NC=$'\\033[0m'
    local BOLD=$'\\033[1m'
    local DIM=$'\\033[2m'
    
    local review_mode=false
    local user_message=""
    
    if [[ "$1" == "-r" ]]; then
        review_mode=true
        shift
        user_message="$*"
    else
        user_message="$*"
    fi

    if ! command -v git &> /dev/null; then
        echo "\${RED}Error:\${NC} git is not installed"
        return 1
    fi

    if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
        echo "\${RED}Error:\${NC} Not a git repository"
        return 1
    fi

    if git diff --cached --quiet; then
        echo "\${YELLOW}Nothing to commit\${NC} - no staged changes"
        echo "\${DIM}Stage changes first: git add <files>\${NC}"
        return 0
    fi

    echo "\${BOLD}\${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${NC}"
    echo "\${BOLD}📝 Git Commit with AI Message\${NC}"
    echo "\${BOLD}\${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${NC}"

    local commit_message=""
    
    if [ -n "$user_message" ]; then
        echo ""
        echo "\${GREEN}✓\${NC} Using provided commit message"
        commit_message="$user_message"
    else
        if ! command -v ${cli.command} &> /dev/null; then
            echo "\${RED}Error:\${NC} ${cli.name} is not installed"
            return 1
        fi

        echo ""
        echo "\${YELLOW}[1/2]\${NC} 🔍 Analyzing staged changes..."
    
        local staged_diff=$(git diff --cached 2>/dev/null | head -500)
    
        local prompt="Analyze the following staged git changes and generate a commit message following the Conventional Commits specification with bullet-point changelog style.

## Commit Message Format:
<type>(<scope>): <short summary>

- <bullet point describing a specific change>
- <bullet point describing another change>

## Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

## Rules:
1. Subject line: max 50 chars, imperative mood, no period
2. Body uses bullet points (- ) to list specific changes
3. Each bullet should be concise and actionable

## Staged Changes:
\${staged_diff}

OUTPUT ONLY THE COMMIT MESSAGE, nothing else."

        echo "\${YELLOW}[2/2]\${NC} 🤖 Generating commit message with ${cli.name}..."
        echo "\${DIM}     (this may take a few seconds...)\${NC}"
    
        local temp_file=$(mktemp)
        local error_file=$(mktemp)
    
        ${cliCommand} > "$temp_file" 2> "$error_file"
        local exit_code=$?
    
        if [ $exit_code -ne 0 ] || [ ! -s "$temp_file" ]; then
            echo "\${RED}Error:\${NC} Failed to generate commit message"
            cat "$error_file" 2>/dev/null
            rm -f "$temp_file" "$error_file"
            return 1
        fi
    
        commit_message=$(cat "$temp_file")
        rm -f "$temp_file" "$error_file"
    
        echo ""
        echo "\${GREEN}Generated Commit Message:\${NC}"
        echo "$commit_message"
    
        if [ "$review_mode" = true ]; then
            echo ""
            echo -n "\${YELLOW}Proceed with this commit message? [Y/n/e(dit)]:\${NC} "
            read confirm
    
            case "$confirm" in
                [nN]) echo "\${YELLOW}Aborted.\${NC}"; return 0 ;;
                [eE])
                    local edit_file=$(mktemp)
                    echo "$commit_message" > "$edit_file"
                    \${EDITOR:-vim} "$edit_file"
                    commit_message=$(cat "$edit_file")
                    rm -f "$edit_file"
                    ;;
            esac
        fi
    fi

    echo ""
    echo "\${YELLOW}📦 Committing...\${NC}"
    
    if ! git commit -m "$commit_message" 2>&1; then
        echo "\${RED}Error:\${NC} Failed to commit"
        return 1
    fi

    echo ""
    echo "\${BOLD}\${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${NC}"
    echo "\${BOLD}\${GREEN}✨ Done!\${NC}"
    echo "\${BOLD}\${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\${NC}"
}`;
}
