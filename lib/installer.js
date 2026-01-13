import { promises as fs } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { generateGpAlias, generateGcAlias } from '../templates/aliases.js';

/**
 * Detect the user's shell and return the profile path
 */
export async function detectShellProfile() {
    const home = homedir();
    const shell = process.env.SHELL || '';

    // Check for zsh first (more common on modern macOS)
    if (shell.includes('zsh')) {
        const zshrc = path.join(home, '.zshrc');
        return { shell: 'zsh', profile: zshrc };
    }

    // Fall back to bash
    const bashrc = path.join(home, '.bashrc');
    const bashProfile = path.join(home, '.bash_profile');

    try {
        await fs.access(bashrc);
        return { shell: 'bash', profile: bashrc };
    } catch {
        try {
            await fs.access(bashProfile);
            return { shell: 'bash', profile: bashProfile };
        } catch {
            return { shell: 'bash', profile: bashrc };
        }
    }
}

/**
 * Backup the shell profile before modifying
 */
async function backupProfile(profilePath) {
    const backupPath = `${profilePath}.backup.${Date.now()}`;
    try {
        await fs.copyFile(profilePath, backupPath);
        return backupPath;
    } catch {
        return null;
    }
}

/**
 * Check if alias already exists in profile
 */
async function aliasExists(profilePath, aliasName) {
    try {
        const content = await fs.readFile(profilePath, 'utf-8');
        const pattern = new RegExp(`^${aliasName}\\s*\\(\\s*\\)\\s*\\{`, 'm');
        return pattern.test(content);
    } catch {
        return false;
    }
}

/**
 * Check for existing aliases and return info
 */
export async function checkExistingAliases(gpAlias, gcAlias) {
    const { profile } = await detectShellProfile();
    const gpExists = await aliasExists(profile, gpAlias);
    const gcExists = await aliasExists(profile, gcAlias);

    return {
        profile,
        gpExists,
        gcExists,
        hasConflict: gpExists || gcExists
    };
}

/**
 * Remove existing alias from profile
 */
export async function removeExistingAlias(profilePath, aliasName) {
    try {
        let content = await fs.readFile(profilePath, 'utf-8');

        // Pattern to match the entire function block including comment
        const functionPattern = new RegExp(
            `# [^\\n]*${aliasName}[^\\n]*\\n` +
            `${aliasName}\\s*\\(\\s*\\)\\s*\\{[\\s\\S]*?\\n\\}\\n?`,
            'g'
        );

        // Simpler pattern without comment
        const simplePattern = new RegExp(
            `${aliasName}\\s*\\(\\s*\\)\\s*\\{[\\s\\S]*?\\n\\}\\n?`,
            'g'
        );

        content = content.replace(functionPattern, '');
        content = content.replace(simplePattern, '');
        content = content.replace(/\n{3,}/g, '\n\n');

        await fs.writeFile(profilePath, content, 'utf-8');
        return true;
    } catch {
        return false;
    }
}

/**
 * Install aliases to shell profile
 */
export async function installAliases({ gpAlias, gcAlias, cli, model, overwrite = false }) {
    try {
        const { shell, profile } = await detectShellProfile();

        const gpExists = await aliasExists(profile, gpAlias);
        const gcExists = await aliasExists(profile, gcAlias);

        if ((gpExists || gcExists) && !overwrite) {
            const existingAliases = [];
            if (gpExists) existingAliases.push(gpAlias);
            if (gcExists) existingAliases.push(gcAlias);

            return {
                success: false,
                conflict: true,
                existingAliases,
                profile
            };
        }

        // If overwriting, remove old aliases first
        if (overwrite) {
            if (gpExists) await removeExistingAlias(profile, gpAlias);
            if (gcExists) await removeExistingAlias(profile, gcAlias);
        }

        await backupProfile(profile);

        const gpContent = generateGpAlias({
            aliasName: gpAlias,
            cli,
            model
        });

        const gcContent = generateGcAlias({
            aliasName: gcAlias,
            cli,
            model
        });

        const timestamp = new Date().toISOString();
        const aliasContent = `
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AI Git Aliases - Added by @lvmk/git-alias
# Provider: ${cli.name} | Model: ${model}
# Generated: ${timestamp}
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${gpContent}

${gcContent}
`;

        await fs.appendFile(profile, aliasContent);

        return {
            success: true,
            shell,
            profile
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}
