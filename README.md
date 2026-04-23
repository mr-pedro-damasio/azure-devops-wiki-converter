# azure-devops-wiki-converter

Convert an Azure DevOps Wiki into Microsoft Word documents while preserving folder structure, hyperlinks, and embedded images.

This repository is currently in the project-definition stage. The development environment is ready, and the next milestone is to define the MVP, stack, and implementation approach for the converter.

## Project goal

The goal of this project is to export Azure DevOps Wiki content into a set of Word documents that remain usable outside Azure DevOps. The output should preserve the original wiki hierarchy, keep links working where possible, and render images correctly in the generated documents.

## Current status

- Project initialization is in progress.
- Repository documentation has been converted from the starter template to the project context.
- Product-definition work is tracked in `docs/PLAN.md`.
- No converter implementation has been added yet.

## Development environment

The repository includes a reproducible development environment for both local Dev Containers and GitHub Codespaces.

### Quick start

#### Option A: Local Dev Container

1. Open this folder in VS Code.
2. Run the command `Dev Containers: Reopen in Container`.
3. Wait for the build and post-create setup to complete.

When setup finishes, the script prints `Dev container is ready.`

#### Option B: GitHub Codespaces

1. Create a new codespace from this repository.
2. Wait for container creation and post-create setup.
3. Open the project in the web editor or desktop VS Code.

The same `.devcontainer/devcontainer.json` is used in both modes.

## Environment details

The container is built from `mcr.microsoft.com/devcontainers/base:ubuntu`.

Installed OS packages:

- `build-essential`
- `curl`
- `ca-certificates`

Enabled Dev Container features:

- `common-utils`
- `node`

Baseline host requirements declared in the dev container:

- `cpus`: `2`
- `memory`: `4gb`
- `storage`: `16gb`

## VS Code customization

The container installs these VS Code extensions:

- `ms-azuretools.vscode-docker`
- `esbenp.prettier-vscode`
- `google.geminicodeassist`
- `anthropic.claude-code`

## Post-create automation

After the container is created, VS Code runs `bash .devcontainer/postCreateCommand.sh`.

That script currently:

1. Marks the workspace as a safe Git directory.
2. Installs the Claude Code CLI.
3. Configures the official Claude plugin marketplace.
4. Installs the `ralph-loop` plugin.

## Repository layout

```text
.
|-- .devcontainer/
|-- docs/
|   |-- PLAN.md
|   |-- architecture/
|   `-- runbooks/
|-- scripts/
|-- AGENTS.md
|-- CLAUDE.md
`-- README.md
```

## Planning and docs

- `docs/PLAN.md`: Active milestone tracking for project setup and definition.
- `docs/architecture/`: Reserved for architecture and project-definition notes.
- `docs/runbooks/codespaces-setup.md`: GitHub-side Codespaces setup checklist.

## Codespaces settings outside the repository

Some Codespaces settings are not stored in this repository and still need to be configured in GitHub, including:

- Default machine size
- Retention and idle timeout
- Prebuild policy
- Repository or organization secrets

For the full checklist, see `docs/runbooks/codespaces-setup.md`.

## Next milestone

Milestone 3 will define the converter's target users, non-goals, MVP scope, and primary technology stack before implementation begins.