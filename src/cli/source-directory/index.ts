import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

function expandHome(p: string): string {
  if (p.startsWith('~')) {
    return path.join(os.homedir(), p.slice(1));
  }
  return p;
}

async function checkWritePermission(dir: string): Promise<boolean> {
  try {
    const testFile = path.join(dir, '.pit-write-test');
    await fs.writeFile(testFile, '');
    await fs.unlink(testFile);
    return true;
  } catch {
    return false;
  }
}

export async function getSourceDirectory(): Promise<string> {
  while (true) {
    const raw = await input({
      message: 'Where should the repo be cloned?',
      default: '~/Documents/GitHub/',
    });

    const expanded = expandHome(raw.trim());

    try {
      const stat = await fs.stat(expanded);
      if (!stat.isDirectory()) {
        console.log(chalk.red(`  "${expanded}" exists but is not a directory. Please choose another path.`));
        continue;
      }
    } catch {
      try {
        await fs.mkdir(expanded, { recursive: true });
        console.log(chalk.green(`  ✅ Created ${expanded}`));
      } catch (err) {
        console.error(chalk.red(`  ❌ Could not create directory: ${err}`));
        continue;
      }
    }

    const canWrite = await checkWritePermission(expanded);
    if (!canWrite) {
      console.log(chalk.red(`  ❌ No write permission at "${expanded}". Please choose another path.`));
      continue;
    }

    return expanded;
  }
}
