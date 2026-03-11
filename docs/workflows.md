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
# Uses the repository project file when one exists
npx container-superposition regen

# Or select the project file explicitly
npx container-superposition regen --from-project

# Falls back to manifest discovery when no project file exists
npx container-superposition regen
```

## Regeneration With Changes

```bash
# Uses manifest as defaults, then prompts for changes
npx container-superposition init --from-manifest ./.devcontainer/superposition.json
```

## Source-Selection Conflicts

Persisted-input source flags are mutually exclusive and do not mix with
clean-generation selection flags:

```bash
# Invalid: two persisted sources
npx container-superposition regen --from-project --from-manifest ./.devcontainer/superposition.json

# Invalid: persisted source plus structural selection flags
npx container-superposition init --from-project --stack compose
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

# 2. Later: reapply the committed project file
npx container-superposition regen

# 3. Or regenerate explicitly from a manifest when that is the intended source
npx container-superposition init --from-manifest ./.devcontainer/superposition.json

# 4. Update to latest overlays
npx container-superposition@latest regen
```

## Team Workflow

For a manifest-first approach (commit only `superposition.json`), see:

- [team-workflow.md](team-workflow.md)
