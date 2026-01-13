#!/usr/bin/env node

import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { detectCLIs, CLI_INFO, getModelsForCLI } from '../lib/detector.js';
import { testHeadlessMode } from '../lib/tester.js';
import { installAliases, detectShellProfile } from '../lib/installer.js';
import { installReloadAlias } from '../lib/reload.js';

const VERSION = '1.0.0';

// Header
function showHeader() {
  console.log('');
  console.log(chalk.bold.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.bold('⚡ Quick Alias Setup'));
  console.log(chalk.dim(`   v${VERSION} | @lvmk/quick-alias`));
  console.log(chalk.bold.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log('');
  console.log(chalk.dim('Set up useful shell aliases to boost your productivity.'));
  console.log('');
}

// Show help
function showHelp() {
  showHeader();
  console.log('Usage:');
  console.log('  npx @lvmk/quick-alias          Run interactive setup');
  console.log('  npx @lvmk/quick-alias --help   Show this help message\n');
  console.log('Available Features:');
  console.log('  • AI Git Aliases - Auto-generate commit messages with AI');
  console.log('  • Shell Reload   - Quickly reload your shell configuration');
  console.log('');
}

// Main menu
async function showMainMenu() {
  const { feature } = await inquirer.prompt([
    {
      type: 'list',
      name: 'feature',
      message: 'What would you like to set up?',
      choices: [
        {
          name: `${chalk.cyan('AI Git Aliases')} ${chalk.dim('- Auto-generate commit messages with AI')}`,
          value: 'git'
        },
        {
          name: `${chalk.cyan('Shell Reload')} ${chalk.dim('- Quickly reload your shell configuration')}`,
          value: 'reload'
        },
        new inquirer.Separator(),
        {
          name: chalk.dim('Exit'),
          value: 'exit'
        }
      ]
    }
  ]);
  return feature;
}

// ═══════════════════════════════════════════════════════════════
// FEATURE: AI Git Aliases
// ═══════════════════════════════════════════════════════════════

async function setupGitAliases() {
  console.log('');
  console.log(chalk.bold.yellow('🤖 AI Git Aliases Setup'));
  console.log(chalk.dim('   Create gp/gc commands that use AI to generate commit messages.\n'));

  // Detect CLIs
  const spinner = ora('Detecting AI CLI tools...').start();
  const detectedCLIs = await detectCLIs();
  spinner.stop();

  if (detectedCLIs.length === 0) {
    console.log(chalk.red('❌ No supported AI CLI tools found!\n'));
    console.log('Install one of the following:\n');
    console.log(`  ${chalk.cyan('Claude Code')}: npm install -g @anthropic-ai/claude-code`);
    console.log(`  ${chalk.cyan('Gemini CLI')}: npm install -g @google/gemini-cli`);
    console.log(`  ${chalk.cyan('OpenCode')}: npm install -g opencode-ai`);
    console.log(`  ${chalk.cyan('Aider')}: pip install aider-chat\n`);
    return false;
  }

  console.log(chalk.green(`✓ Found ${detectedCLIs.length} CLI tool(s):\n`));
  detectedCLIs.forEach(cli => {
    console.log(`  • ${cli.name} (${chalk.dim(cli.command)})`);
  });
  console.log('');

  // Configure aliases
  const aliasAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'gpAlias',
      message: 'Git Push alias (stages all → AI commit → push):',
      default: 'gp'
    },
    {
      type: 'input',
      name: 'gcAlias',
      message: 'Git Commit alias (AI commit for staged files):',
      default: 'gc'
    }
  ]);
  console.log('');

  // Select provider
  const { provider } = await inquirer.prompt([
    {
      type: 'list',
      name: 'provider',
      message: 'Choose your AI provider:',
      choices: detectedCLIs.map(cli => ({
        name: cli.name,
        value: cli.id
      }))
    }
  ]);

  const selectedCLI = detectedCLIs.find(cli => cli.id === provider);
  console.log('');

  // Select model
  let selectedModel = null;

  // Fetch models (handles dynamic fetching for OpenCode)
  const modelSpinner = ora('Fetching available models...').start();
  const availableModels = await getModelsForCLI(selectedCLI);
  modelSpinner.stop();

  if (availableModels && availableModels.length > 0) {
    const modelChoices = availableModels.map((model, index) => ({
      name: index === 0
        ? `${model.name} (${model.description}) ${chalk.green('- Recommended')}`
        : `${model.name} (${model.description})`,
      value: model.value
    }));

    modelChoices.push({
      name: chalk.dim('Custom model name...'),
      value: '__custom__'
    });

    const { model } = await inquirer.prompt([
      {
        type: 'list',
        name: 'model',
        message: `Choose model for ${selectedCLI.name}:`,
        choices: modelChoices
      }
    ]);

    if (model === '__custom__') {
      const { customModel } = await inquirer.prompt([
        {
          type: 'input',
          name: 'customModel',
          message: 'Enter custom model name:',
          validate: input => input.trim() ? true : 'Required'
        }
      ]);
      selectedModel = customModel;
    } else {
      selectedModel = model;
    }
  } else {
    const { model } = await inquirer.prompt([
      {
        type: 'input',
        name: 'model',
        message: `Enter model name for ${selectedCLI.name}:`,
        validate: input => input.trim() ? true : 'Required'
      }
    ]);
    selectedModel = model;
  }
  console.log('');

  // Test CLI
  console.log(chalk.yellow('🧪 Testing AI connection...\n'));
  const testSpinner = ora('Running test...').start();
  const testResult = await testHeadlessMode(selectedCLI, selectedModel);

  if (!testResult.success) {
    testSpinner.fail(chalk.red('Test failed!'));
    console.log(chalk.dim(`Error: ${testResult.error}\n`));
    return false;
  }
  testSpinner.succeed(chalk.green(`${selectedCLI.name} is working!`));
  console.log('');

  // Install
  let currentGpAlias = aliasAnswers.gpAlias;
  let currentGcAlias = aliasAnswers.gcAlias;

  let installResult = await installAliases({
    gpAlias: currentGpAlias,
    gcAlias: currentGcAlias,
    cli: selectedCLI,
    model: selectedModel,
    overwrite: false
  });

  // Handle conflicts
  while (installResult.conflict) {
    console.log(chalk.yellow(`⚠️  Alias conflict: ${installResult.existingAliases.join(', ')}\n`));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'How to handle?',
        choices: [
          { name: 'Override existing', value: 'override' },
          { name: 'Use different names', value: 'rename' },
          { name: 'Cancel', value: 'cancel' }
        ]
      }
    ]);

    if (action === 'cancel') return false;

    if (action === 'override') {
      installResult = await installAliases({
        gpAlias: currentGpAlias,
        gcAlias: currentGcAlias,
        cli: selectedCLI,
        model: selectedModel,
        overwrite: true
      });
    }

    if (action === 'rename') {
      const newNames = await inquirer.prompt([
        { type: 'input', name: 'gpAlias', message: 'New push alias:', default: 'gpa' },
        { type: 'input', name: 'gcAlias', message: 'New commit alias:', default: 'gca' }
      ]);
      currentGpAlias = newNames.gpAlias;
      currentGcAlias = newNames.gcAlias;

      installResult = await installAliases({
        gpAlias: currentGpAlias,
        gcAlias: currentGcAlias,
        cli: selectedCLI,
        model: selectedModel,
        overwrite: false
      });
    }
  }

  if (!installResult.success) {
    console.log(chalk.red(`Failed: ${installResult.error}`));
    return false;
  }

  // Success
  console.log('');
  console.log(chalk.green('✓ AI Git Aliases installed!\n'));
  console.log(chalk.dim('Usage:'));
  console.log(`  ${chalk.cyan(currentGpAlias)}     ${chalk.dim('Stage all → AI commit → Push')}`);
  console.log(`  ${chalk.cyan(currentGcAlias)}     ${chalk.dim('AI commit for staged files')}`);
  console.log(`  ${chalk.cyan(currentGpAlias + ' -r')}  ${chalk.dim('Review AI message before commit')}`);

  return { profile: installResult.profile };
}

// ═══════════════════════════════════════════════════════════════
// FEATURE: Shell Reload
// ═══════════════════════════════════════════════════════════════

async function setupShellReload() {
  console.log('');
  console.log(chalk.bold.yellow('🔄 Shell Reload Setup'));
  console.log(chalk.dim('   Create an alias to quickly reload your shell configuration.\n'));

  const { aliasName } = await inquirer.prompt([
    {
      type: 'list',
      name: 'aliasName',
      message: 'Choose alias name for reload:',
      choices: [
        { name: `${chalk.cyan('rl')} ${chalk.dim('- short and quick')}`, value: 'rl' },
        { name: `${chalk.cyan('src')} ${chalk.dim('- classic "source" shortcut')}`, value: 'src' },
        { name: `${chalk.cyan('reload')} ${chalk.dim('- descriptive and clear')}`, value: 'reload' },
        { name: chalk.dim('Custom...'), value: '__custom__' }
      ]
    }
  ]);

  let finalAlias = aliasName;
  if (aliasName === '__custom__') {
    const { custom } = await inquirer.prompt([
      {
        type: 'input',
        name: 'custom',
        message: 'Enter custom alias name:',
        validate: input => input.trim() ? true : 'Required'
      }
    ]);
    finalAlias = custom;
  }
  console.log('');

  const result = await installReloadAlias(finalAlias);

  if (result.conflict) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: `Alias "${finalAlias}" already exists. Override?`,
        choices: [
          { name: 'Yes, override', value: 'override' },
          { name: 'No, cancel', value: 'cancel' }
        ]
      }
    ]);

    if (action === 'cancel') return false;

    const overrideResult = await installReloadAlias(finalAlias, true);
    if (!overrideResult.success) {
      console.log(chalk.red(`Failed: ${overrideResult.error}`));
      return false;
    }
  } else if (!result.success) {
    console.log(chalk.red(`Failed: ${result.error}`));
    return false;
  }

  console.log(chalk.green('✓ Shell Reload alias installed!\n'));
  console.log(chalk.dim('Usage:'));
  console.log(`  ${chalk.cyan(finalAlias)}  ${chalk.dim('Reload your shell configuration')}`);

  return { profile: result.profile };
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  showHeader();

  let continueSetup = true;
  let profilePath = null;

  while (continueSetup) {
    const feature = await showMainMenu();

    if (feature === 'exit') {
      break;
    }

    let result;
    if (feature === 'git') {
      result = await setupGitAliases();
    } else if (feature === 'reload') {
      result = await setupShellReload();
    }

    if (result && result.profile) {
      profilePath = result.profile;
    }

    console.log('');
    const { another } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'another',
        message: 'Set up another feature?',
        default: false
      }
    ]);
    continueSetup = another;
    console.log('');
  }

  // Final message
  if (profilePath) {
    console.log(chalk.bold.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.bold.green('✨ All Done!'));
    console.log(chalk.bold.green('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log('');
    console.log(chalk.dim('Reload your shell to use the new aliases:'));
    console.log(`  ${chalk.cyan(`source ${profilePath}`)}`);
    console.log('');
  } else {
    console.log(chalk.dim('Goodbye! 👋\n'));
  }
}

main().catch(err => {
  console.error(chalk.red('Error:'), err.message);
  process.exit(1);
});
