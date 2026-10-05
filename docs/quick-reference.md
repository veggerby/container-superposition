# Quick Reference

## Safe workflow

`superposition.yml` (or `.superposition.yml`) is the canonical shared input.
Commit it with the application code. Use a flat `overlays:` list when the team
wants explicit selections; presets are optional shorthand. Generated
`superposition.json` is a compatibility and audit receipt, not normal authoring
input.

Follow **discover → inspect → preview → write**:

```bash
# Read-only discovery
npx container-superposition list
npx container-superposition list --category messaging
npx container-superposition explain postgres

# Preview an explicit proposed selection
npx container-superposition plan --stack compose --overlays nodejs,postgres
npx container-superposition plan --stack compose --overlays nodejs,postgres --verbose
npx container-superposition plan --stack compose --overlays nodejs,postgres --diff
```

`--verbose` explains why overlays are resolved; `--diff` compares planned output
with the existing `.devcontainer/` output.

## Shared project file

```yaml
# superposition.yml
stack: compose
overlays:
    - nodejs
    - postgres
env:
    APP_ENV: development
```

After previewing, write or replay output:

```bash
# Create/update intent and generated output without prompts
npx container-superposition init --no-interactive

# Replay the committed project file later
npx container-superposition regen
```

Use `init --no-scaffold` only to write the project file without generated
output. Use `migrate` for a legacy manifest-only repository:

```bash
npx container-superposition migrate
```

## Common commands

| Command                                          | Purpose                                                       |
| ------------------------------------------------ | ------------------------------------------------------------- |
| `list`                                           | Discover recommended starts, overlays, and presets.           |
| `explain <id>`                                   | Inspect an overlay or preset's fit and trade-offs.            |
| `plan --stack <plain\|compose> --overlays <ids>` | Preview before writing.                                       |
| `plan --verbose`                                 | Explain dependency resolution and inclusion reasons.          |
| `plan --diff`                                    | Review planned change against existing generated output.      |
| `init`                                           | Interactively create/edit shared intent, then write output.   |
| `init --no-interactive`                          | Write from persisted/project inputs without prompts.          |
| `regen`                                          | Replay canonical shared project intent.                       |
| `doctor`                                         | Diagnose project health and project-file drift.               |
| `adopt --dry-run`                                | Inspect an existing handwritten devcontainer before adoption. |
| `migrate`                                        | Convert legacy `superposition.json` intent to a project file. |

All human-readable commands accept `--silent`; do not combine it with `--json`.

## Selection notes

- `plain` creates a single-image devcontainer; `compose` supports multi-service
  overlays.
- Discover live categories with `list --help`; current categories include
  `language`, `database`, `messaging`, `observability`, `cloud`, `dev`, and
  `preset`.
- Messaging overlays are `nats`, `rabbitmq`, and `redpanda`; see
  [Messaging quick start](messaging-quick-start.md).
- Use `explain <id>` rather than relying on a static overlay table for current
  compatibility, ports, dependencies, parameters, and conflicts.

## Local configuration and Git

Use `superposition.local.yml` for untracked machine-specific mounts,
environment values, editor settings, or port overrides. It enriches generated
output but is not shared replay authority. Choose whether `.devcontainer/` is
committed or ignored as a team policy; shared changes always belong in
`superposition.yml`.

See [Authoring `superposition.yml`](superposition-yml.md),
[Examples](examples.md), and [Team workflow](team-workflow.md) for details.
