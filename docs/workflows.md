# Workflows and Regeneration

This guide covers project-config driven generation, manifest-based regeneration,
and common workflows.

## Project Config Workflow

Commit exactly one project config file at the repository root:

- `.superposition.yml`
- `superposition.yml`

Use it when you want standard `init` runs to start from committed defaults
instead of a copied command line.

```bash
npx container-superposition init
```

Use `--no-interactive` when the config fully describes the intended setup and
you want unattended generation:

```bash
npx container-superposition init --no-interactive
```

Direct CLI flags still win for that run only:

```bash
npx container-superposition init --no-interactive --output ./tmp-devcontainer
```

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
npx container-superposition init --no-interactive

# Or keep using an explicit manifest when you want that mode
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

- [team-workflow.md](team-workflow.md)
