# Workflows and Regeneration

This guide covers the current project-file-first workflow.

## Canonical shared intent

Commit exactly one repository-root project file:

- `superposition.yml`
- `.superposition.yml`

That file is the canonical shared intent for generation, replay, and most remediation flows.
`superposition.json` is still written as a compatibility and reproducibility artifact, but it is not the primary steady-state config.

## Recommended flow: discover → inspect → preview → write

```bash
# Discover overlays and presets
npx container-superposition list

# Inspect one overlay or preset in more detail
npx container-superposition explain postgres

# Preview before writing
npx container-superposition plan --stack compose --overlays nodejs,postgres
npx container-superposition plan --stack compose --overlays grafana --verbose
```

Use `plan --diff` when you want to compare a planned change against existing generated output:

```bash
npx container-superposition plan --stack compose --overlays nodejs,postgres --diff
```

## Create or update shared intent with `init`

Interactive `init` writes shared project intent and, by default, scaffolds `.devcontainer/` output:

```bash
npx container-superposition init
```

When your project file already describes the intended setup, use unattended init:

```bash
npx container-superposition init --no-interactive
```

You can also start from persisted input and then adjust it:

```bash
# Start from the repository project file
npx container-superposition init --from-project

# Start from a legacy manifest during migration work
npx container-superposition init --from-manifest ./superposition.json
```

Useful variants:

```bash
# Write only the project file
npx container-superposition init --stack compose --language nodejs --no-scaffold

# Resolve persisted input relative to another repository root
npx container-superposition init --from-project --project-root ../my-project
```

## Replay shared intent with `regen`

`regen` replays the repository project file into generated output:

```bash
npx container-superposition regen
```

Optional source/root variants:

```bash
npx container-superposition regen --from-project
npx container-superposition regen --from-project --project-root ../my-project
```

Use `migrate` if the repo still has only a legacy manifest and no project file yet:

```bash
npx container-superposition migrate
npx container-superposition regen
```

## Adopt and migrate conversion flows

Use these when moving into the current model:

- `adopt` — analyze an existing handwritten `.devcontainer/`, infer managed overlays, preserve unmatched customizations, and write a repository project file plus compatibility artifacts
- `migrate` — convert a legacy `superposition.json`-only repo into the canonical project-file model without replaying generated output immediately

```bash
npx container-superposition adopt --dry-run
npx container-superposition migrate
```

## Source-selection conflicts

Persisted-input source flags are mutually exclusive and do not mix with clean-generation selection flags:

```bash
# Invalid: two persisted sources
npx container-superposition regen --from-project --from-manifest ./superposition.json

# Invalid: persisted source plus structural selection flags
npx container-superposition init --from-project --stack compose
```

## CI and unattended use

For CI or scripted regeneration, prefer committed project-file intent:

```bash
npx container-superposition init --no-interactive
npx container-superposition regen
npx container-superposition doctor
```

## Backup behavior

Commands that rewrite generated output can create backups.

- Default: backup behavior depends on whether the repo is inside Git
- `--backup`: force backup creation
- `--no-backup`: suppress backup creation where supported
- `--backup-dir <path>`: write backups to a custom location

## Legacy manifest compatibility

`superposition.json` still matters for compatibility, drift checks, and migration, but treat manifest-first operation as legacy/transition guidance.

Use these only when needed:

```bash
# Preview a legacy manifest without writing
npx container-superposition plan --from-manifest ./superposition.json

# Convert a manifest-only repo to the canonical model
npx container-superposition migrate --from-manifest ./superposition.json
```

For older manifest-first guidance that has not yet been rewritten, verify behavior against `README.md`, `docs/foundation.md`, and ADR `001` before following it literally.
