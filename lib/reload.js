import { promises as fs } from 'fs';
import { detectShellProfile } from './installer.js';

/**
 * Check if alias exists in profile
 */
async function aliasExists(profilePath, aliasName) {
    try {
        const content = await fs.readFile(profilePath, 'utf-8');
        // Check for alias or function
        const aliasPattern = new RegExp(`^alias\\s+${aliasName}=`, 'm');
        const funcPattern = new RegExp(`^${aliasName}\\s*\\(\\s*\\)\\s*\\{`, 'm');
        return aliasPattern.test(content) || funcPattern.test(content);
    } catch {
        return false;
    }
}

/**
 * Remove existing alias from profile
 */
async function removeExistingAlias(profilePath, aliasName) {
    try {
        let content = await fs.readFile(profilePath, 'utf-8');

        // Remove alias line
        const aliasPattern = new RegExp(`^alias\\s+${aliasName}=[^\\n]*\\n?`, 'gm');
        content = content.replace(aliasPattern, '');

        // Clean up empty lines
        content = content.replace(/\n{3,}/g, '\n\n');

        await fs.writeFile(profilePath, content, 'utf-8');
        return true;
    } catch {
        return false;
    }
}

/**
 * Install shell reload alias
 */
export async function installReloadAlias(aliasName, overwrite = false) {
    try {
        const { shell, profile } = await detectShellProfile();

        const exists = await aliasExists(profile, aliasName);

        if (exists && !overwrite) {
            return {
                success: false,
                conflict: true,
                profile
            };
        }

        if (exists && overwrite) {
            await removeExistingAlias(profile, aliasName);
        }

        // Generate the alias
        const timestamp = new Date().toISOString();
        const aliasContent = `
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Shell Reload Alias - Added by @lvmk/quick-alias
# Generated: ${timestamp}
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
alias ${aliasName}="source ${profile}"
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
