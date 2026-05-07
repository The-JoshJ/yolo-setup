# YOLO Setup

Automated developer onboarding CLI. Point it at any GitHub repo and it spins up a Copilot agent to clone, configure, install dependencies, handle secrets, and start the dev server — so new developers can go from zero to running in minutes.

## Requirements

- **Node.js** v18+ (with [nvm](https://github.com/nvm-sh/nvm))
- **Git** — `brew install git`
- **GitHub CLI** — `brew install gh` + `gh auth login`
- **GitHub Copilot CLI** — install from [GitHub Copilot in the CLI](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line) and run `copilot auth` to authenticate

## Usage

```bash
npx github:The-JoshJ/yolo-setup
```

No installation required. The CLI will walk you through:

1. **Repo URL** — paste any GitHub repo URL (e.g. `https://github.com/org/repo`)
2. **Source directory** — where to clone it (defaults to `~/Documents/GitHub/`)
3. **Agent setup** — Copilot takes over: reads the repo, installs dependencies, configures your environment
4. **Secrets** — if any API keys or tokens are needed, you'll be prompted to paste them securely (input is hidden, values never logged)
5. **Server** — the dev server starts automatically once setup is complete

## Flags

| Flag | Description |
|---|---|
| `--heal [dir]` | Skip setup and send a repair agent into an existing repo directory to diagnose and fix whatever is broken |
| `--debug` | Show raw agent output — full tool calls, session info, and the prompt sent to the agent |

### Heal mode

If a setup failed partway through or the dev server won't start, run the repair agent against the existing directory:

```bash
# Pass the directory inline
npx github:The-JoshJ/yolo-setup --heal ~/Documents/GitHub/my-repo

# Or let it prompt you
npx github:The-JoshJ/yolo-setup --heal
```

The heal agent inspects the current state of the repo, identifies what's wrong, fixes it, and hands off to the dev server — same as a normal setup run.

### Debug mode

Shows the full unfiltered agent output including tool calls, session name, manifest paths, and the exact prompt sent to Copilot:

```bash
npx github:The-JoshJ/yolo-setup --debug
npx github:The-JoshJ/yolo-setup --heal ~/Documents/GitHub/my-repo --debug
```

## How it works

YOLO Setup is an agent-first CLI. Instead of pre-scripted setup steps, a Copilot agent analyzes the repo from scratch and synthesizes the correct setup process — adapting to whatever stack, tooling, or quirks the repo has.

Secrets are handled safely: the agent never sees secret values. It identifies what's needed, the CLI collects them via hidden input, and they're written to a temporary file that only shell commands can read.

## Development

```bash
git clone https://github.com/The-JoshJ/yolo-setup
cd yolo-setup
npm install
npm start        # run from source with tsx
npm run build    # bundle to dist/cli.cjs
```
