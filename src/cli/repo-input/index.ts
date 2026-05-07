import { input } from '@inquirer/prompts';
import chalk from 'chalk';

function normalizeGithubUrl(raw: string): string | null {
  const cleaned = raw
    .trim()
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/^github\.com\//, '')
    .replace(/\.git$/, '');

  const match = cleaned.match(/^([\w.-]+)\/([\w.-]+)$/);
  return match ? `${match[1]}/${match[2]}` : null;
}

export async function getRepoInput(): Promise<string> {
  while (true) {
    const raw = await input({
      message: chalk.bold('What repo would you like to set up today?'),
      transformer: (val) => val.trim(),
    });

    const normalized = normalizeGithubUrl(raw);
    if (normalized) return normalized;

    console.log(
      chalk.red(
        `\n  ❌ Couldn't parse "${raw.trim()}" as a GitHub repo.\n  Try: github.com/owner/repo or https://github.com/owner/repo\n`,
      ),
    );
  }
}
