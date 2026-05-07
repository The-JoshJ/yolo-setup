import { execa } from 'execa';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { stripVTControlCharacters } from 'util';

// Lines to suppress — tool call blocks (●, │, └) and TUI chrome
const NOISE_PATTERNS = [
  /^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/,         // spinner frames
  /^\s*$/,                       // blank lines
  /^>\s*$/,                      // bare prompt chars
  /^[●•]\s/,                     // tool call headers  (● Search, ● Run shell...)
  /^[│┌└├─]/,                    // tool call body/border box-drawing chars
  /^\s*[│┌└├─]/,                 // indented box-drawing chars
  /└\s*\d+\s*(lines?)?\.{0,3}$/, // "└ 17 lines..."
];

function isNoisyLine(line: string): boolean {
  const clean = stripVTControlCharacters(line).trim();
  return NOISE_PATTERNS.some((p) => p.test(clean));
}

async function runCopilotPretty(args: string[]): Promise<void> {
  const proc = execa('copilot', args, { stdout: 'pipe', stderr: 'pipe', reject: false });

  const printLine = (line: string) => {
    const clean = stripVTControlCharacters(line).trim();
    if (!isNoisyLine(clean) && clean.length > 0) {
      console.log(`  ${chalk.cyan('🤖')} ${clean}`);
    }
  };

  // Buffer chunks and flush on newlines — copilot streams LLM tokens individually
  // so we must reassemble complete lines before printing
  async function consumeStream(stream: NodeJS.ReadableStream) {
    let buf = '';
    for await (const chunk of stream) {
      buf += String(chunk);
      const lines = buf.split('\n');
      for (let i = 0; i < lines.length - 1; i++) printLine(lines[i]);
      buf = lines[lines.length - 1]; // hold incomplete last line
    }
    if (buf.length > 0) printLine(buf); // flush remainder
  }

  const stdoutTask = proc.stdout ? consumeStream(proc.stdout) : Promise.resolve();
  const stderrTask = proc.stderr ? consumeStream(proc.stderr) : Promise.resolve();

  await Promise.all([stdoutTask, stderrTask, proc]);
}

const PIT_DIR = path.join(os.homedir(), '.pit');
const COLLECT_SCRIPT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..', 'scripts', 'collect-secrets.sh',
);

function generateSessionName(): string {
  return `agent-${randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

function secretsManifestPath(sessionName: string): string {
  return path.join(PIT_DIR, `secrets-manifest-${sessionName}.json`);
}

function buildAgentPrompt(repoUrl: string, repoDir: string, sessionName: string): string {
  const manifestPath = secretsManifestPath(sessionName);
  return `You are setting up a GitHub repository for a new developer using the PIT setup tool.

IMPORTANT: All output must be plain text only. Do not use markdown formatting, headers (##),
bold (**text**), bullet points, or code fences. This output renders directly in a terminal.

## Context
- Repository: ${repoUrl}
- Cloned to: ${repoDir}
- Session name: ${sessionName}
- Secrets manifest path: ${manifestPath}

## Your Task
Set up this repository so the developer can start working immediately.

### Step 1: Analyze the repo
Read these files from ${repoDir} to understand what setup is required:
- README.md (primary source of truth for setup instructions)
- package.json (scripts, dependencies, engines)
- .nvmrc or .node-version (required Node.js version)
- .env.example or .env.staging (required environment variables)
- Makefile, requirements.txt, go.mod (if present — alternative tech stacks)

Note any discrepancies between README and config files — config files win over README.

### Step 2: Handle Node.js version
If .nvmrc exists, switch to the required version using:
  source ~/.nvm/nvm.sh && nvm use
IMPORTANT: Always source nvm before using it — it is a shell function, not a binary.

### Step 3: Handle secrets
Check if all required environment variables are set in the current environment.
If any are missing, write a JSON manifest describing ALL missing secrets at once — do not pause more than once.

Write this file: ${manifestPath}
Format:
{
  "session": "${sessionName}",
  "secrets": [
    { "name": "VAR_NAME", "instructions": "Step-by-step human instructions for obtaining this value" },
    ...
  ]
}

Then exit immediately. A hardcoded collection script will read this manifest, prompt the human,
and resume this session. DO NOT write a bash script. DO NOT prompt for secrets directly.
DO NOT include secret values in this conversation. DO NOT read secret values from any file.

### Step 4: Install dependencies
Run the appropriate install command for this repo (npm install, yarn, pnpm install, etc.).
Suppress verbose output where possible.
If the repo uses @shipt/* packages, ensure ~/.npmrc is configured for the Harness registry:
  //pkg.harness.io/pkg/P7NidaekTweGP3QiQixe1A/shipt-npm-prod/npm/:_authToken=\${CI_NPM_TOKEN}
  @shipt:registry=https://pkg.harness.io/pkg/P7NidaekTweGP3QiQixe1A/shipt-npm-prod/npm/

### Step 5: Configure environment
If .env.staging or .env.example exists but .env.local does not, copy it:
  cp .env.staging .env.local
To write specific secrets from the env file into .env.local, use shell redirection only —
never print or echo secret values.

### Step 6: Start and verify
Start the dev server using the appropriate script from package.json
(dev, start:dev, start:local, start, etc.).
Wait for it to start and report the port it is listening on.
Once the server is confirmed running, print a plain-text summary (no markdown, no headers,
no bullet symbols — just clean lines) and exit. Example format:

  Setup complete for <repo>
  Server running at http://localhost:<port>
  Node: <version>
  Time: ~<N> minutes

### Fallback heuristics (if README has no setup instructions)
- package.json with scripts.dev → npm run dev
- package.json with scripts.start → npm start
- Makefile with setup/install target → make setup
- requirements.txt → pip install -r requirements.txt && python main.py
- go.mod → go mod download && go run .

### On any failure
Diagnose the error from output, attempt to fix it, and retry before reporting failure.
Be specific about what went wrong and what was tried.
`;
}

export async function runAgentSession(
  repoUrl: string,
  repoDir: string,
  sourceDir: string,
  debug = false,
): Promise<void> {
  await fs.mkdir(PIT_DIR, { recursive: true });

  const sessionName = generateSessionName();
  const manifestPath = secretsManifestPath(sessionName);

  console.log(chalk.bold(`\n  🤖 Starting agent session: ${chalk.cyan(sessionName)}\n`));

  const prompt = buildAgentPrompt(repoUrl, repoDir, sessionName);

  if (debug) {
    console.log(chalk.magenta('[debug] Session name:'), sessionName);
    console.log(chalk.magenta('[debug] Manifest path:'), manifestPath);
    console.log(chalk.magenta('[debug] Collect script:'), COLLECT_SCRIPT);
    console.log(chalk.magenta('[debug] Source dir:'), sourceDir);
    console.log(chalk.magenta('[debug] Repo dir:'), repoDir);
    console.log(chalk.magenta('\n[debug] Agent prompt:\n') + chalk.gray('─'.repeat(60)));
    console.log(chalk.gray(prompt));
    console.log(chalk.magenta(chalk.gray('─'.repeat(60)) + '\n'));
  }

  // Initial agent spawn
  if (debug) console.log(chalk.magenta('[debug] Spawning initial agent...\n'));
  const spawnArgs = ['-n', sessionName, '--allow-all', '--add-dir', sourceDir, '-p', prompt];
  if (debug) {
    await execa('copilot', spawnArgs, { stdio: 'inherit' }).catch(() => {});
  } else {
    await runCopilotPretty(spawnArgs);
  }

  // Loop: collect secrets if manifest exists, then resume agent — repeat until no manifest
  let resumeCount = 0;
  while (await fs.access(manifestPath).then(() => true).catch(() => false)) {
    resumeCount++;
    console.log(chalk.yellow('\n  🔑 Secrets needed — collecting...\n'));
    if (debug) console.log(chalk.magenta(`[debug] Resume cycle #${resumeCount}, manifest found at ${manifestPath}\n`));

    // collect-secrets.sh needs interactive stdio for read -s, but does NOT resume the agent
    await execa('bash', [COLLECT_SCRIPT, sessionName], { stdio: 'inherit' }).catch(() => {});

    // Resume the agent through our pretty printer so tool calls are filtered
    const envFile = path.join(PIT_DIR, `secrets-${sessionName}.env`);
    const resumePrompt = `Secrets have been written to ${envFile} in KEY=VALUE format. Apply them using shell commands only — DO NOT read or print the file contents into this conversation. To make them available for install commands, run: source ${envFile}. To write specific values into .env.local, use shell redirection without echoing values. Delete the secrets file when setup is complete: rm -f ${envFile}. Continue setup from where you left off.`;
    const resumeArgs = [`--resume=${sessionName}`, '--allow-all', '-p', resumePrompt];

    if (debug) {
      console.log(chalk.magenta(`[debug] Resuming session with prompt:\n${resumePrompt}\n`));
      await execa('copilot', resumeArgs, { stdio: 'inherit' }).catch(() => {});
    } else {
      await runCopilotPretty(resumeArgs);
    }

    if (debug) console.log(chalk.magenta(`[debug] Resume cycle #${resumeCount} complete, checking for manifest again...\n`));
  }

  if (debug) console.log(chalk.magenta('[debug] No manifest found — session complete. Cleaning up...\n'));

  // Cleanup ~/.pit directory
  await fs.rm(PIT_DIR, { recursive: true, force: true });
}
