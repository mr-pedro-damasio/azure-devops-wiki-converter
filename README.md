# project-template-devcontainer

This repository is a minimal project template focused on a reproducible setup for both VS Code Dev Containers and GitHub Codespaces.

It gives you a ready-to-use Ubuntu-based development environment with common utilities, Node.js, useful editor extensions, and post-create bootstrapping.

## What this template contains

- `.devcontainer/devcontainer.json`: Main Dev Container configuration.
- `.devcontainer/Dockerfile`: Base image and OS-level packages.
- `.devcontainer/postCreateCommand.sh`: One-time setup that runs after container creation.
- `AGENTS.md`: Agent workflow and contribution guardrails.
- `CLAUDE.md`: Claude-specific quick start that references `@AGENTS.md` and `docs/PLAN.md`.
- `docs/PLAN.md`: Living implementation plan/checklist template.

## Project scaffolding

This template now includes a practical default structure:

```text
.
|-- .devcontainer/
|-- .github/workflows/
|-- .vscode/
|-- config/
|-- docs/
|   |-- PLAN.md
|   |-- architecture/
|   `-- runbooks/
|-- scripts/
|-- src/
|-- tests/
|-- AGENTS.md
|-- CLAUDE.md
`-- README.md
```

Use this as a starting point and trim/expand to match your stack.

## Quick start

### Option A: Local Dev Container

1. Open this folder in VS Code.
2. Run the command: `Dev Containers: Reopen in Container`.
3. Wait for the build and post-create setup to complete.

When setup finishes, the script prints:

`Dev container is ready.`

### Option B: GitHub Codespaces

1. Click **Code** in GitHub and open a new codespace from this repository.
2. Wait for container creation and post-create setup.
3. Open the project in the web editor or desktop VS Code.

The same `.devcontainer/devcontainer.json` is used in both modes.

## Environment details

The container is built from:

- `mcr.microsoft.com/devcontainers/base:ubuntu`

During image build, these packages are installed:

- `build-essential`
- `curl`
- `ca-certificates`

Dev Container features enabled:

- `common-utils` (with Zsh installed and configured as default shell, package upgrades enabled)
- `node` (Node.js tooling)

The dev container declares baseline host requirements:

- `cpus`: `2`
- `memory`: `4gb`
- `storage`: `16gb`

These values are guidance for compatible hosts and help define a sensible baseline for Codespaces sizing.

## Configuration ownership (in-repo vs GitHub settings)

Use this table to know where each control lives.

| Area | Controlled in repository | Controlled in GitHub settings |
|---|---|---|
| Container image, features, bootstrap, users | `.devcontainer/devcontainer.json`, `.devcontainer/Dockerfile`, `.devcontainer/postCreateCommand.sh` | No |
| Editor recommendations and defaults | `.vscode/extensions.json` and `customizations` in `.devcontainer/devcontainer.json` | No |
| CI checks and automation | `.github/workflows/*.yml` | Actions permissions/policies |
| Secrets used by code or workflows | Referenced in code/workflows | Repository or organization secrets |
| Codespaces machine type and retention | No | Codespaces settings |
| Codespaces prebuilds | No | Codespaces prebuild configuration |

## Codespaces settings checklist (outside repository files)

Apply these settings in GitHub after creating a repository from this template:

1. Enable Codespaces for the repository.
2. Set a default machine type that matches expected project size.
3. Configure idle timeout and retention period.
4. Configure prebuilds for the main branch (and key feature branches if needed).
5. Add required repository or organization secrets.

For a copy-paste runbook, see `docs/runbooks/codespaces-setup.md`.

## VS Code customization included

The template auto-installs these extensions in the container:

- `ms-azuretools.vscode-docker`
- `esbenp.prettier-vscode`
- `google.geminicodeassist`
- `anthropic.claude-code`

## Post-create automation

After the container is created, VS Code runs:

- `bash .devcontainer/postCreateCommand.sh`

This script does the following:

1. Marks the mounted workspace as a safe Git directory.
2. Installs the Claude Code CLI globally:
   - `npm install -g @anthropic-ai/claude-code`
3. Ensures the official Claude plugin marketplace is configured.
4. Installs the plugin:
   - `ralph-loop@claude-plugins-official`

If marketplace setup commands report "already exists" style errors, the script continues safely.

## How to customize this template

## 1) Add more language/tool features

Edit `.devcontainer/devcontainer.json` and add entries under `features`.

## 2) Add apt packages

Edit `.devcontainer/Dockerfile` and extend the `apt-get install` list.

## 3) Add bootstrap steps

Edit `.devcontainer/postCreateCommand.sh` for tools that should be installed after container creation.

Tips:

- Keep `set -euo pipefail` in shell scripts for safer execution.
- Use idempotent commands where possible so rebuilds do not fail.

## Rebuild and troubleshoot

- Rebuild container after Dockerfile or feature changes:
  - `Dev Containers: Rebuild Container`
- If post-create setup fails, inspect terminal output and rerun manually:
  - `bash .devcontainer/postCreateCommand.sh`

For Codespaces-specific checks, see `docs/runbooks/codespaces-setup.md`.

## Template intent

Use this template as a base for any repository where you want:

- Consistent local development environments
- Fast onboarding for new contributors
- Reduced "works on my machine" drift

Add your project code and project-specific docs on top of this foundation.