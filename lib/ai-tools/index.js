/**
 * AI Tools - Main entry point and menu flow
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';

import {
    getAssetTypes,
    getToolsForAssetType,
    getAssetType,
    getTool
} from './registry.js';

import {
    getAvailableAssets,
    detectTool,
    installAsset,
    installAllAssets
} from './installer.js';

/**
 * Main AI Tools setup menu
 */
export async function setupAITools() {
    console.log('');
    console.log(chalk.bold.yellow('🧠 AI Tools'));
    console.log(chalk.dim('   Install AI assets to your coding tools.\n'));

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                {
                    name: `${chalk.cyan('Install to coding tools')} ${chalk.dim('- Add AI capabilities')}`,
                    value: 'install'
                },
                new inquirer.Separator(),
                {
                    name: chalk.dim('Back to main menu'),
                    value: 'back'
                }
            ]
        }
    ]);

    if (action === 'back') {
        return null;
    }

    if (action === 'install') {
        return await installFlow();
    }

    return null;
}

/**
 * Installation flow: asset type → tool → asset selection → location
 */
async function installFlow() {
    // Step 1: Select asset type
    const assetTypes = getAssetTypes();

    const { assetTypeId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'assetTypeId',
            message: 'Select asset type:',
            choices: assetTypes.map(t => ({
                name: `${t.icon} ${chalk.cyan(t.name)} ${chalk.dim('- ' + t.description)}`,
                value: t.id
            }))
        }
    ]);

    const assetType = getAssetType(assetTypeId);
    console.log('');

    // Step 2: Select coding tool
    const supportedTools = getToolsForAssetType(assetTypeId);

    if (supportedTools.length === 0) {
        console.log(chalk.yellow(`⚠️  No coding tools support ${assetType.name} yet.\n`));
        return null;
    }

    const { toolId } = await inquirer.prompt([
        {
            type: 'list',
            name: 'toolId',
            message: 'Select coding tool:',
            choices: supportedTools.map(t => ({
                name: `${chalk.cyan(t.name)} ${chalk.dim('- ' + t.description)}`,
                value: t.id
            }))
        }
    ]);

    const tool = getTool(toolId);

    // Check if tool is installed
    const hasToolInstalled = await detectTool(toolId);
    if (!hasToolInstalled) {
        console.log(chalk.yellow(`\n⚠️  ${tool.name} not detected on your system.`));
        console.log(chalk.dim('   Assets will be installed when you set up the tool.'));
    }
    console.log('');

    // Step 3: Get available assets for this tool/type
    const assets = await getAvailableAssets(assetTypeId, toolId);

    if (assets.length === 0) {
        console.log(chalk.yellow(`⚠️  No ${assetType.name.toLowerCase()} available for ${tool.name}.\n`));
        return null;
    }

    console.log(chalk.green(`✓ Found ${assets.length} ${assetType.name.toLowerCase()} available:\n`));
    assets.forEach(asset => {
        console.log(`  • ${chalk.cyan(asset.name)} ${chalk.dim('- ' + asset.description)}`);
    });
    console.log('');

    // Step 4: Select asset(s)
    const assetChoices = [
        ...assets.map(a => ({
            name: `${chalk.cyan(a.name)} ${chalk.dim('- ' + a.description)}`,
            value: a.name
        })),
        new inquirer.Separator(),
        {
            name: chalk.green(`Install all ${assetType.name.toLowerCase()}`),
            value: '__all__'
        }
    ];

    const { selectedAsset } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedAsset',
            message: `Select ${assetType.name.toLowerCase().slice(0, -1)} to install:`,
            choices: assetChoices
        }
    ]);
    console.log('');

    // Step 5: Select installation location
    const assetConfig = tool.assets[assetTypeId];

    const { location } = await inquirer.prompt([
        {
            type: 'list',
            name: 'location',
            message: 'Where to install?',
            choices: [
                {
                    name: `${chalk.cyan('Global')} ${chalk.dim(`- ${assetConfig.globalPath}`)}`,
                    value: 'global'
                },
                {
                    name: `${chalk.cyan('Current workspace')} ${chalk.dim(`- ./${assetConfig.workspacePath}`)}`,
                    value: 'workspace'
                }
            ]
        }
    ]);
    console.log('');

    // Step 6: Install
    const spinner = ora(`Installing ${assetType.name.toLowerCase()}...`).start();

    let results;
    if (selectedAsset === '__all__') {
        results = await installAllAssets(assetTypeId, toolId, location, false);
    } else {
        const result = await installAsset(assetTypeId, toolId, selectedAsset, location, false);
        results = [{ asset: selectedAsset, ...result }];
    }
    spinner.stop();

    // Handle results
    let hasConflicts = false;
    const conflictAssets = [];

    for (const result of results) {
        if (result.exists) {
            hasConflicts = true;
            conflictAssets.push(result.asset);
        } else if (result.success) {
            console.log(chalk.green(`✓ ${result.asset} installed to ${result.path}`));
        } else if (result.error) {
            console.log(chalk.red(`✗ ${result.asset}: ${result.error}`));
        }
    }

    // Handle conflicts
    if (hasConflicts) {
        console.log(chalk.yellow(`\n⚠️  Already exists: ${conflictAssets.join(', ')}`));

        const { overwrite } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'overwrite',
                message: 'Overwrite existing?',
                default: false
            }
        ]);

        if (overwrite) {
            const spinner2 = ora('Overwriting...').start();

            for (const assetName of conflictAssets) {
                const result = await installAsset(assetTypeId, toolId, assetName, location, true);
                spinner2.stop();

                if (result.success) {
                    console.log(chalk.green(`✓ ${assetName} installed to ${result.path}`));
                } else {
                    console.log(chalk.red(`✗ ${assetName}: ${result.error}`));
                }
                spinner2.start();
            }
            spinner2.stop();
        }
    }

    console.log('');
    console.log(chalk.green(`✓ ${assetType.name} installation complete!`));
    console.log(chalk.dim(`\nThe ${assetType.name.toLowerCase()} are now available for ${tool.name} to discover.`));

    return {};
}

// Re-export for backward compatibility
export { getAvailableAssets, detectTool } from './installer.js';
export { getAssetTypes, getCodingTools, getToolsForAssetType } from './registry.js';
