# Workflows and Regeneration

This guide covers manifest-based regeneration and common workflows.

## Manifest Basics

Every generation writes a `superposition.json` manifest that records your choices. It enables:

- Reproducible environments
- Safe upgrades
- Team sharing
- Regeneration with backups

## When to Regenerate

Use `regen` or `init --from-manifest` when you:

- Add or remove overlays
- Update to newer overlay versions
- Change port offsets
- Switch base templates

Use manual edits when you:

- Adjust VS Code settings
- Add small scripts or config files
- Tweak a single setting in custom patches

## Quick Regeneration

```bash
# Finds manifest automatically
npx container-superposition regen
```

## Regeneration With Changes

```bash
# Uses manifest as defaults, then prompts for changes
npx container-superposition init --from-manifest ./.devcontainer/superposition.json
```

## Non-Interactive (CI/CD)

```bash
npx container-superposition init \
  --from-manifest ./.devcontainer/superposition.json \
  --no-interactive \
  --no-backup
```

## Backup Behavior

- Default: creates `.devcontainer.backup-<timestamp>/`
- `--no-backup`: skips backup
- `--backup-dir <path>`: writes backups to a custom location

## Example Workflow

```bash
# 1. Initial setup
npx container-superposition init --stack compose --language nodejs --database postgres

# 2. Later: add Redis and observability
npx container-superposition init --from-manifest ./.devcontainer/superposition.json

# 3. Update to latest overlays
npx container-superposition@latest regen
```

## Team Workflow

For a manifest-first approach (commit only `superposition.json`), see:

- https://github.com/veggerby/container-superposition/blob/main/docs/team-workflow.md
