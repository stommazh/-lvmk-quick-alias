import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// CLI definitions with headless mode info and model presets
export const CLI_INFO = {
    claude: {
        id: 'claude',
        name: 'Claude Code',
        command: 'claude',
        headlessFlag: '--print',
        modelFlag: '--model',
        permissionFlag: '--dangerously-skip-permissions',
        models: [
            { name: 'haiku', value: 'haiku', description: 'fast, cheap' },
            { name: 'sonnet', value: 'sonnet', description: 'balanced' },
            { name: 'opus', value: 'opus', description: 'most capable' }
        ],
        buildCommand: (prompt, model) =>
            `claude --print --model ${model} --dangerously-skip-permissions "${prompt.replace(/"/g, '\\"')}"`
    },
    gemini: {
        id: 'gemini',
        name: 'Gemini CLI',
        command: 'gemini',
        headlessFlag: '--prompt',
        modelFlag: '--model',
        models: [
            { name: 'gemini-3-flash', value: 'gemini-3-flash', description: 'fast, efficient' },
            { name: 'gemini-3-pro', value: 'gemini-3-pro', description: 'advanced reasoning' }
        ],
        buildCommand: (prompt, model) =>
            `gemini --prompt "${prompt.replace(/"/g, '\\"')}" --model ${model}`
    },
    copilot: {
        id: 'copilot',
        name: 'GitHub Copilot CLI',
        command: 'copilot',
        headlessFlag: '--prompt',
        modelFlag: null,
        models: null,
        buildCommand: (prompt) =>
            `copilot --prompt "${prompt.replace(/"/g, '\\"')}"`
    },
    opencode: {
        id: 'opencode',
        name: 'OpenCode',
        command: 'opencode',
        headlessFlag: 'run',
        modelFlag: '--model',
        dynamicModels: true, // Flag to fetch models dynamically
        models: null, // Will be populated dynamically
        buildCommand: (prompt, model) =>
            `opencode run "${prompt.replace(/"/g, '\\"')}" --model ${model}`
    },
    aider: {
        id: 'aider',
        name: 'Aider',
        command: 'aider',
        headlessFlag: '--message',
        modelFlag: '--model',
        extraFlags: '--yes-always --no-auto-commits',
        models: [
            { name: 'claude-sonnet-4', value: 'claude-sonnet-4', description: 'balanced' },
            { name: 'gpt-5', value: 'gpt-5', description: 'advanced' },
            { name: 'claude-haiku-4', value: 'claude-haiku-4', description: 'fast, cheap' }
        ],
        buildCommand: (prompt, model) =>
            `aider --message "${prompt.replace(/"/g, '\\"')}" --model ${model} --yes-always --no-auto-commits`
    }
};

/**
 * Check if a command exists in the system
 */
async function commandExists(command) {
    try {
        // Use shell to ensure PATH is properly set (important for npx)
        await execAsync(`which ${command}`, {
            shell: '/bin/zsh',
            env: { ...process.env, PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin' }
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * Fetch available models for OpenCode
 */
async function fetchOpenCodeModels() {
    try {
        const { stdout } = await execAsync('opencode models', { timeout: 10000 });
        const lines = stdout.trim().split('\n').filter(l => l.trim());

        if (lines.length === 0) return null;

        // Parse models and group by provider
        const models = lines.map(line => {
            const [provider, model] = line.includes('/')
                ? line.split('/')
                : ['opencode', line];
            return {
                name: line,
                value: line,
                provider: provider,
                model: model,
                description: provider
            };
        });

        // Sort with preferred defaults first: big-pickle (stable) → glm → gpt → grok
        const priority = ['big-pickle', 'glm', 'gpt', 'grok', 'minimax'];
        models.sort((a, b) => {
            const aIdx = priority.findIndex(p => a.model.toLowerCase().includes(p));
            const bIdx = priority.findIndex(p => b.model.toLowerCase().includes(p));
            const aPriority = aIdx === -1 ? 999 : aIdx;
            const bPriority = bIdx === -1 ? 999 : bIdx;
            return aPriority - bPriority;
        });

        // Add descriptions based on model type
        return models.map((m, idx) => {
            let desc = m.provider;
            if (m.model.includes('free')) desc += ', free tier';
            if (m.model.includes('flash')) desc += ', fast';
            if (m.model.includes('nano')) desc += ', lightweight';
            if (idx === 0) desc += ' - recommended';
            return {
                name: m.name,
                value: m.value,
                description: desc
            };
        });
    } catch {
        return null;
    }
}

/**
 * Get models for a CLI (handles dynamic fetching for OpenCode)
 */
export async function getModelsForCLI(cli) {
    if (cli.id === 'opencode' && cli.dynamicModels) {
        const dynamicModels = await fetchOpenCodeModels();
        if (dynamicModels && dynamicModels.length > 0) {
            return dynamicModels;
        }
        // Fallback if fetch fails - big-pickle is stable
        return [
            { name: 'opencode/big-pickle', value: 'opencode/big-pickle', description: 'stable, recommended' },
            { name: 'opencode/glm-4.7-free', value: 'opencode/glm-4.7-free', description: 'free tier' },
            { name: 'opencode/gpt-5-nano', value: 'opencode/gpt-5-nano', description: 'lightweight' },
            { name: 'opencode/grok-code', value: 'opencode/grok-code', description: 'coding focused' }
        ];
    }
    return cli.models;
}

/**
 * Detect installed CLI tools that support headless mode
 */
export async function detectCLIs() {
    const detected = [];

    for (const [id, cli] of Object.entries(CLI_INFO)) {
        const exists = await commandExists(cli.command);
        if (exists) {
            detected.push({
                id,
                ...cli
            });
        }
    }

    return detected;
}

/**
 * Get CLI info by ID
 */
export function getCLIById(id) {
    return CLI_INFO[id] || null;
}
