import { execa } from 'execa';
import chalk from 'chalk';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

interface ToolStatus {
  name: string;
  installed: boolean;
  version?: string;
}

async function checkGit(): Promise<ToolStatus> {
  try {
    const { stdout } = await execa('git', ['--version']);
    const version = stdout.replace('git version ', '').trim();
    return { name: 'git', installed: true, version };
  } catch {
    return { name: 'git', installed: false };
  }
}

async function checkGh(): Promise<ToolStatus> {
  try {
    const { stdout } = await execa('gh', ['--version']);
    const match = stdout.match(/gh version ([^\s]+)/);
    return { name: 'gh', installed: true, version: match?.[1] ?? 'unknown' };
  } catch {
    return { name: 'gh', installed: false };
  }
}

async function checkNvm(): Promise<ToolStatus> {
  const nvmScript = path.join(os.homedir(), '.nvm', 'nvm.sh');
  try {
    await fs.access(nvmScript);
    try {
      const { stdout } = await execa('bash', ['-c', `source ${nvmScript} && nvm --version`]);
      return { name: 'nvm', installed: true, version: stdout.trim() };
    } catch {
      return { name: 'nvm', installed: true, version: 'unknown' };
    }
  } catch {
    return { name: 'nvm', installed: false };
  }
}

async function checkCopilot(): Promise<ToolStatus> {
  try {
    const { stdout } = await execa('copilot', ['--version']);
    const match = stdout.match(/(\d+\.\d+\.\d+)/);
    return { name: 'copilot', installed: true, version: match?.[1] ?? 'unknown' };
  } catch {
    return { name: 'copilot', installed: false };
  }
}

async function checkGhAuth(): Promise<boolean> {
  try {
    await execa('gh', ['auth', 'status']);
    return true;
  } catch {
    return false;
  }
}

async function checkBrew(): Promise<boolean> {
  try {
    await execa('brew', ['--version']);
    return true;
  } catch {
    return false;
  }
}

function displayStatus(tools: ToolStatus[]) {
  console.log(chalk.bold('\n  Checking prerequisites...\n'));
  for (const tool of tools) {
    if (tool.installed) {
      console.log(`  ${chalk.green('✅')} ${chalk.bold(tool.name)} ${chalk.gray(tool.version ?? '')}`);
    } else {
      console.log(`  ${chalk.red('❌')} ${chalk.bold(tool.name)} ${chalk.red('not found')}`);
    }
  }
  console.log();
}

export async function checkPrerequisites(): Promise<void> {
  const [git, gh, nvm, copilot] = await Promise.all([
    checkGit(),
    checkGh(),
    checkNvm(),
    checkCopilot(),
  ]);

  displayStatus([git, gh, nvm, copilot]);

  const hasBrew = await checkBrew();

  if (!git.installed) {
    if (!hasBrew) {
      console.error(chalk.red('  ❌ git not found. Please install Homebrew first: https://brew.sh'));
      process.exit(1);
    }
    console.log(chalk.yellow('  Installing git via Homebrew...'));
    try {
      await execa('brew', ['install', 'git'], { stdio: 'inherit' });
      console.log(chalk.green('  ✅ git installed successfully'));
    } catch {
      console.error(chalk.red('  ❌ Failed to install git. Please install manually: https://git-scm.com'));
      process.exit(1);
    }
  }

  if (!gh.installed) {
    if (!hasBrew) {
      console.error(chalk.red('  ❌ gh not found. Please install Homebrew first: https://brew.sh'));
      process.exit(1);
    }
    console.log(chalk.yellow('  Installing gh (GitHub CLI) via Homebrew...'));
    try {
      await execa('brew', ['install', 'gh'], { stdio: 'inherit' });
      console.log(chalk.green('  ✅ gh installed successfully'));
    } catch {
      console.error(chalk.red('  ❌ Failed to install gh. Please install manually: https://cli.github.com'));
      process.exit(1);
    }
  }

  if (!nvm.installed) {
    console.log(chalk.yellow('  Installing nvm...'));
    try {
      await execa('bash', [
        '-c',
        'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash',
      ], { stdio: 'inherit' });

      const nvmScript = path.join(os.homedir(), '.nvm', 'nvm.sh');
      try {
        await fs.access(nvmScript);
        console.log(chalk.green('  ✅ nvm installed successfully'));
        console.log(chalk.gray('  Note: Open a new terminal to use nvm commands directly'));
      } catch {
        console.error(chalk.red('  ❌ nvm install script ran but nvm.sh not found.'));
        console.error(chalk.red('     Please open a new terminal and run: source ~/.nvm/nvm.sh'));
        process.exit(1);
      }
    } catch {
      console.error(chalk.red('  ❌ Failed to install nvm.'));
      console.error(chalk.red('     Please install manually: https://github.com/nvm-sh/nvm'));
      process.exit(1);
    }
  }

  if (!copilot.installed) {
    console.error(chalk.red('  ❌ copilot CLI not found.'));
    console.error(chalk.red('     Install from: https://github.com/github/copilot-cli'));
    process.exit(1);
  }

  const isAuthed = await checkGhAuth();
  if (!isAuthed) {
    console.log(chalk.yellow('\n  gh is not authenticated. Starting login flow...'));
    try {
      await execa('gh', ['auth', 'login'], { stdio: 'inherit' });
      const authedNow = await checkGhAuth();
      if (!authedNow) {
        console.error(chalk.red('  ❌ gh authentication failed. Please run: gh auth login'));
        process.exit(1);
      }
      console.log(chalk.green('  ✅ gh authenticated successfully'));
    } catch {
      console.error(chalk.red('  ❌ gh authentication failed. Please run: gh auth login'));
      process.exit(1);
    }
  }

  console.log(chalk.green('  ✅ All prerequisites satisfied\n'));
}
