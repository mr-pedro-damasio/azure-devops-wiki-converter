# Codespaces setup runbook

This runbook covers the settings that are not stored in repository files and must be configured in GitHub.

## Scope

Repository files already define:

- Dev container build and runtime behavior
- Post-create bootstrap steps
- VS Code extension recommendations
- CI workflow logic

GitHub settings define:

- Codespaces machine sizing and retention
- Codespaces prebuild policy
- Secrets and organization policy constraints

## One-time repository setup

1. Open repository settings in GitHub.
2. Open the Codespaces section.
3. Enable Codespaces if it is disabled.
4. Choose a default machine type suitable for expected workloads.
5. Configure idle timeout and retention period.
6. Enable prebuilds for the main branch.
7. Add required repository secrets.

## Recommended defaults

Use these as a starting baseline:

- Machine: 2 to 4 cores for general web/API projects
- Retention: short by default, increase only for heavy onboarding flows
- Prebuilds: enabled for main branch

Tune these values after measuring startup time and cost.

## Validation checklist

After applying settings, validate with a fresh codespace:

1. Create a new codespace from the default branch.
2. Confirm post-create setup completes.
3. Confirm terminal tools are available.
4. Confirm expected extensions are installed.
5. Confirm project startup command works.

## Troubleshooting quick checks

- If startup is slow, verify prebuild status.
- If tools are missing, check dev container build and post-create logs.
- If secrets are unavailable, verify repository or organization secret scope.
