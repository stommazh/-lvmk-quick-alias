/**
 * AI Tools Registry - Define supported coding tools and asset types
 */

import { homedir } from 'os';
import path from 'path';

/**
 * Asset types that can be installed to coding tools
 */
export const ASSET_TYPES = {
    skills: {
        id: 'skills',
        name: 'Skills',
        description: 'AI capability extensions',
        icon: '🧠'
    },
    agents: {
        id: 'agents',
        name: 'Agents',
        description: 'Autonomous AI agents',
        icon: '🤖'
    },
    workflows: {
        id: 'workflows',
        name: 'Workflows',
        description: 'Automated task workflows',
        icon: '⚡'
    }
};

/**
 * Supported coding tools registry
 * Each tool has its own adapter with specific paths and formats
 */
export const CODING_TOOLS = {
    antigravity: {
        id: 'antigravity',
        name: 'Antigravity',
        description: 'Google Antigravity AI coding assistant',
        // Asset configurations for this tool
        assets: {
            skills: {
                supported: true,
                globalPath: path.join(homedir(), '.gemini/antigravity/skills'),
                workspacePath: '.agent/skills',
                markerFile: 'SKILL.md',  // File that identifies a valid asset
                descriptionField: 'description'  // YAML field for description
            },
            agents: {
                supported: false  // Not yet supported
            },
            workflows: {
                supported: false  // Not yet supported
            }
        }
    },
    'claude-code': {
        id: 'claude-code',
        name: 'Claude Code',
        description: 'Anthropic Claude Code assistant',
        assets: {
            skills: {
                supported: true,
                globalPath: path.join(homedir(), '.claude/skills'),
                workspacePath: '.claude/skills',
                markerFile: 'SKILL.md',
                descriptionField: 'description'
            },
            agents: {
                supported: false
            },
            workflows: {
                supported: false
            }
        }
    },
    opencode: {
        id: 'opencode',
        name: 'OpenCode',
        description: 'OpenCode AI coding assistant',
        assets: {
            skills: {
                supported: true,
                globalPath: path.join(homedir(), '.opencode/skills'),
                workspacePath: '.opencode/skills',
                markerFile: 'SKILL.md',
                descriptionField: 'description'
            },
            agents: {
                supported: false
            },
            workflows: {
                supported: false
            }
        }
    },
    droid: {
        id: 'droid',
        name: 'Droid',
        description: 'Droid AI coding assistant',
        assets: {
            skills: {
                supported: true,
                globalPath: path.join(homedir(), '.droid/skills'),
                workspacePath: '.droid/skills',
                markerFile: 'SKILL.md',
                descriptionField: 'description'
            },
            agents: {
                supported: false
            },
            workflows: {
                supported: false
            }
        }
    }
};

/**
 * Get list of all asset types
 * @returns {Array<{id: string, name: string, description: string, icon: string}>}
 */
export function getAssetTypes() {
    return Object.values(ASSET_TYPES);
}

/**
 * Get list of all coding tools
 * @returns {Array<{id: string, name: string, description: string}>}
 */
export function getCodingTools() {
    return Object.values(CODING_TOOLS).map(tool => ({
        id: tool.id,
        name: tool.name,
        description: tool.description
    }));
}

/**
 * Get tools that support a specific asset type
 * @param {string} assetType - 'skills', 'agents', or 'workflows'
 * @returns {Array<{id: string, name: string, description: string}>}
 */
export function getToolsForAssetType(assetType) {
    return Object.values(CODING_TOOLS)
        .filter(tool => tool.assets[assetType]?.supported)
        .map(tool => ({
            id: tool.id,
            name: tool.name,
            description: tool.description
        }));
}

/**
 * Get tool configuration by ID
 * @param {string} toolId 
 * @returns {Object|null}
 */
export function getTool(toolId) {
    return CODING_TOOLS[toolId] || null;
}

/**
 * Get asset type configuration by ID
 * @param {string} assetTypeId 
 * @returns {Object|null}
 */
export function getAssetType(assetTypeId) {
    return ASSET_TYPES[assetTypeId] || null;
}
