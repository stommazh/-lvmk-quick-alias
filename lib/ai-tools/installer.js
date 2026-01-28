/**
 * AI Tools Installer - Generic installation logic using tool configurations
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getTool, CODING_TOOLS } from './registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Assets directory relative to lib/ai-tools/
const ASSETS_DIR = path.join(__dirname, '../../assets');

/**
 * Copy directory recursively, skipping unwanted files
 */
async function copyDir(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        // Skip unwanted directories/files
        if (entry.name === '__pycache__' || entry.name === '.DS_Store') continue;

        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

/**
 * Check if a directory exists
 */
async function dirExists(dirPath) {
    try {
        await fs.access(dirPath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get available assets of a specific type for a specific tool
 * @param {string} assetType - 'skills', 'agents', 'workflows'
 * @param {string} toolId - 'antigravity', 'claude-code', etc.
 * @returns {Promise<Array<{name: string, description: string, path: string}>>}
 */
export async function getAvailableAssets(assetType, toolId) {
    const assets = [];
    const tool = getTool(toolId);

    if (!tool || !tool.assets[assetType]?.supported) {
        return assets;
    }

    const assetConfig = tool.assets[assetType];
    const assetsPath = path.join(ASSETS_DIR, assetType, toolId);

    try {
        const entries = await fs.readdir(assetsPath, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isDirectory()) {
                const assetPath = path.join(assetsPath, entry.name);
                const markerPath = path.join(assetPath, assetConfig.markerFile);

                try {
                    const content = await fs.readFile(markerPath, 'utf-8');
                    // Extract description from YAML frontmatter
                    const descField = assetConfig.descriptionField || 'description';
                    const descMatch = content.match(new RegExp(`${descField}:\\s*["']?([^"'\\n]+)["']?`));
                    const description = descMatch
                        ? descMatch[1].substring(0, 60) + (descMatch[1].length > 60 ? '...' : '')
                        : 'No description';

                    assets.push({
                        name: entry.name,
                        description,
                        path: assetPath
                    });
                } catch {
                    // Skip directories without marker file
                }
            }
        }
    } catch {
        // Assets directory doesn't exist for this tool/type
    }

    return assets;
}

/**
 * Detect if a coding tool is configured on the system
 * @param {string} toolId 
 * @returns {Promise<boolean>}
 */
export async function detectTool(toolId) {
    const tool = getTool(toolId);
    if (!tool) return false;

    // Check if any asset type's global path exists
    for (const assetConfig of Object.values(tool.assets)) {
        if (assetConfig.supported && assetConfig.globalPath) {
            // Check parent directory (e.g., ~/.gemini/antigravity for skills)
            const parentDir = path.dirname(assetConfig.globalPath);
            if (await dirExists(parentDir)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Check if an asset already exists at target location
 */
export async function assetExists(assetName, targetDir) {
    const assetPath = path.join(targetDir, assetName);
    return await dirExists(assetPath);
}

/**
 * Get target directory for installation
 * @param {string} toolId 
 * @param {string} assetType 
 * @param {'global'|'workspace'} location 
 * @returns {string|null}
 */
export function getTargetDir(toolId, assetType, location) {
    const tool = getTool(toolId);
    if (!tool || !tool.assets[assetType]?.supported) {
        return null;
    }

    const assetConfig = tool.assets[assetType];

    if (location === 'global') {
        return assetConfig.globalPath;
    } else {
        return path.join(process.cwd(), assetConfig.workspacePath);
    }
}

/**
 * Install an asset to a coding tool
 * @param {string} assetType - 'skills', 'agents', 'workflows'
 * @param {string} toolId - Target tool ID
 * @param {string} assetName - Name of asset to install
 * @param {'global'|'workspace'} location - Where to install
 * @param {boolean} overwrite - Overwrite existing
 * @returns {Promise<{success: boolean, path?: string, error?: string, exists?: boolean}>}
 */
export async function installAsset(assetType, toolId, assetName, location, overwrite = false) {
    const assets = await getAvailableAssets(assetType, toolId);
    const asset = assets.find(a => a.name === assetName);

    if (!asset) {
        return { success: false, error: `Asset '${assetName}' not found for ${toolId}` };
    }

    const targetDir = getTargetDir(toolId, assetType, location);
    if (!targetDir) {
        return { success: false, error: `${assetType} not supported for ${toolId}` };
    }

    const targetPath = path.join(targetDir, assetName);

    // Check if already exists
    if (!overwrite && await assetExists(assetName, targetDir)) {
        return { success: false, exists: true, path: targetPath };
    }

    try {
        // Remove existing if overwriting
        if (overwrite) {
            try {
                await fs.rm(targetPath, { recursive: true, force: true });
            } catch {
                // Ignore if doesn't exist
            }
        }

        // Copy asset directory
        await copyDir(asset.path, targetPath);

        return { success: true, path: targetPath };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Install all available assets of a type to a tool
 * @param {string} assetType 
 * @param {string} toolId 
 * @param {'global'|'workspace'} location 
 * @param {boolean} overwrite 
 * @returns {Promise<Array<{asset: string, success: boolean, path?: string, error?: string}>>}
 */
export async function installAllAssets(assetType, toolId, location, overwrite = false) {
    const assets = await getAvailableAssets(assetType, toolId);
    const results = [];

    for (const asset of assets) {
        const result = await installAsset(assetType, toolId, asset.name, location, overwrite);
        results.push({
            asset: asset.name,
            ...result
        });
    }

    return results;
}

/**
 * Get display path for user feedback
 */
export function getDisplayPath(toolId, assetType, location, assetName) {
    const targetDir = getTargetDir(toolId, assetType, location);
    if (!targetDir) return null;
    return path.join(targetDir, assetName);
}
