import { execa } from 'execa';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import { select } from '@inquirer/prompts';

export type CloneAction = 'clone' | 'reclone' | 'skip';

export interface CloneResult {
  repoDir: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
}

async function determineAction(repo: string, repoDir: string): Promise<CloneAction> {
  try {
    await fs.access(repoDir);
    console.log(chalk.yellow(`\n  ⚠️  "${repoDir}" already exists.`));
    return select<CloneAction>({
      message: `  What would you like to do with ${repo}?`,
      choices: [
        { name: 'Re-clone (delete and clone fresh)', value: 'reclone' },
        { name: 'Skip cloning (use existing directory)', value: 'skip' },
      ],
    });
  } catch {
    return 'clone';
  }
}

export async function cloneRepo(repo: string, sourceDir: string): Promise<CloneResult> {
  const repoName = repo.split('/')[1];
  const repoDir = path.join(sourceDir, repoName);

  const action = await determineAction(repo, repoDir);

  if (action === 'skip') {
    console.log(chalk.gray(`  → Using existing directory: ${repoDir}`));
    return { repoDir, status: 'skipped' };
  }

  if (action === 'reclone') {
    try {
      await fs.rm(repoDir, { recursive: true, force: true });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`  ❌ Could not remove ${repoDir}: ${errMsg}`));
      return { repoDir, status: 'failed', error: errMsg };
    }
  }

  try {
    console.log(chalk.yellow(`\n  Cloning ${repo}...`));
    await execa('gh', ['repo', 'clone', repo, repoDir], { stdio: 'inherit' });
    console.log(chalk.green(`  ✅ Cloned to ${repoDir}\n`));
    return { repoDir, status: 'success' };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(chalk.red(`  ❌ Clone failed for ${repo}: ${errMsg}`));
    return { repoDir, status: 'failed', error: errMsg };
  }
}
