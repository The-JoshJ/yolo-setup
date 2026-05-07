import chalk from 'chalk';
import { checkPrerequisites } from './prereq-check/index.js';
import { getRepoInput } from './repo-input/index.js';
import { getSourceDirectory } from './source-directory/index.js';
import { cloneRepo } from './clone-and-setup/index.js';
import { runAgentSession } from './agent-session/index.js';

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

  console.log(chalk.cyan(BANNER));
  console.log(chalk.bold('  Welcome to YOLO Setup\n'));
  if (debug) console.log(chalk.magenta('  [debug] Debug mode enabled\n'));

  // Step 1: Check system prerequisites
  await checkPrerequisites();

  // Step 2: Get repo URL from user
  const repo = await getRepoInput();

  // Step 3: Get source directory
  const sourceDir = await getSourceDirectory();

  // Step 4: Clone repo
  const { repoDir, status } = await cloneRepo(repo, sourceDir);
  if (status === 'failed') process.exit(1);

  // Step 5: Run agent session (handles setup, secrets, verification)
  await runAgentSession(repo, repoDir, sourceDir, debug);
}

main().catch((err) => {
  console.error(chalk.red('\nFatal error:'), err);
  process.exit(1);
});

