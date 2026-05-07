import chalk from 'chalk';
import path from 'path';
import os from 'os';
import { input } from '@inquirer/prompts';
import { checkPrerequisites } from './prereq-check/index.js';
import { getRepoInput } from './repo-input/index.js';
import { getSourceDirectory } from './source-directory/index.js';
import { cloneRepo } from './clone-and-setup/index.js';
import { runAgentSession, runHealSession } from './agent-session/index.js';

const BANNER = `
░▒▓█▓▒░░▒▓█▓▒░░▒▓██████▓▒░░▒▓█▓▒░      ░▒▓██████▓▒░        ░▒▓███████▓▒░▒▓████████▓▒░▒▓████████▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓███████▓▒░  
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░     ░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░      ░▒▓█▓▒░         ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ 
░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░     ░▒▓█▓▒░░▒▓█▓▒░      ░▒▓█▓▒░      ░▒▓█▓▒░         ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░░▒▓█▓▒░ 
 ░▒▓██████▓▒░░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░     ░▒▓█▓▒░░▒▓█▓▒░       ░▒▓██████▓▒░░▒▓██████▓▒░    ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓███████▓▒░  
   ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░     ░▒▓█▓▒░░▒▓█▓▒░             ░▒▓█▓▒░▒▓█▓▒░         ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░        
   ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░     ░▒▓█▓▒░░▒▓█▓▒░             ░▒▓█▓▒░▒▓█▓▒░         ░▒▓█▓▒░   ░▒▓█▓▒░░▒▓█▓▒░▒▓█▓▒░        
   ░▒▓█▓▒░    ░▒▓██████▓▒░░▒▓████████▓▒░▒▓██████▓▒░       ░▒▓███████▓▒░░▒▓████████▓▒░  ░▒▓█▓▒░    ░▒▓██████▓▒░░▒▓█▓▒░
`;

async function main() {
  const debug = process.argv.includes('--debug');
  const healIdx = process.argv.indexOf('--heal');
  const heal = healIdx !== -1;

  console.log(chalk.cyan(BANNER));
  console.log(chalk.bold('  Welcome to YOLO Setup\n'));
  if (debug) console.log(chalk.magenta('  [debug] Debug mode enabled\n'));

  await checkPrerequisites();

  if (heal) {
    // Heal mode — skip clone, go straight to repair agent
    const argDir = process.argv[healIdx + 1];
    const rawDir = argDir && !argDir.startsWith('--')
      ? argDir
      : await input({ message: 'Which repo directory needs healing?', default: `~/Documents/GitHub/` });

    const repoDir = rawDir.startsWith('~')
      ? path.join(os.homedir(), rawDir.slice(1))
      : path.resolve(rawDir);

    console.log(chalk.yellow(`\n  🩺 Heal mode — diagnosing ${chalk.bold(repoDir)}\n`));
    await runHealSession(repoDir, debug);
    return;
  }

  // Normal setup flow
  const repo = await getRepoInput();
  const sourceDir = await getSourceDirectory();
  const { repoDir, status } = await cloneRepo(repo, sourceDir);
  if (status === 'failed') process.exit(1);
  await runAgentSession(repo, repoDir, sourceDir, debug);
}

main().catch((err) => {
  console.error(chalk.red('\nFatal error:'), err);
  process.exit(1);
});

