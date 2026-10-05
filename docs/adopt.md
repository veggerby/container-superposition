# Adopt Command

The `adopt` command helps you **migrate an existing `.devcontainer/` configuration** to Container Superposition's overlay-based workflow.

If you do **not** want team migration and only need a personal local layer on top of an existing team-owned devcontainer, use [`amend`](local-devcontainer-amendment.md) instead. `amend` keeps shared project intent out of the repository, writes local-only artifacts under `.container-superposition/`, and launches through a generated alternate config.

`adopt` scans your current `devcontainer.json` and any linked `docker-compose.yml` files, matches their contents against all available overlays, and writes a project-file-first conversion:

1. **`.superposition.yml`** (or the existing `superposition.yml`) — the canonical repository-root shared intent, containing the inferred stack, flat `overlays:` selection, output path, and supported customizations
2. **`superposition.json`** — a generated compatibility/audit receipt; do not hand-edit it as steady-state team configuration
3. **`.devcontainer/custom/devcontainer.patch.json`** — config with no overlay equivalent (custom features, extensions, mounts, remote environment, and similar settings)
4. **`.devcontainer/custom/docker-compose.patch.yml`** — compose services with no overlay equivalent

The custom patches in `custom/` are preserved and merged on every `regen`. Review the project file and patches before replaying them; adoption itself does not regenerate the devcontainer.

## Quick Start

```bash
# Personal-only local layer without team migration: use amend, not adopt
npx container-superposition amend init

# Inspect an existing .devcontainer/ before writing anything
npx container-superposition adopt --dry-run

# Write canonical shared intent, the compatibility receipt, and any preserved patches
npx container-superposition adopt

# Review the inferred project intent, then replay it
npx container-superposition regen

# Overwrite existing conversion artifacts only after reviewing the write risk
npx container-superposition adopt --force
```

`adopt --project-file` is deprecated and has no additional effect: `adopt` writes the project file by default.

## Docker Compose Devcontainers

`adopt` fully supports compose-based devcontainers. It reads the
`dockerComposeFile` field in `devcontainer.json` to locate the right compose
file(s), including:

- **Single file** (string): `"dockerComposeFile": "docker-compose.yml"`
- **Multiple files** (array): `"dockerComposeFile": ["base.yml", "override.yml"]`
- **Relative paths** pointing outside the `.devcontainer/` directory:
  `"dockerComposeFile": "../docker-compose.yml"`

All referenced compose files are analysed. Every service with a recognised
image (postgres, redis, grafana, jaeger, …) is mapped to the corresponding
overlay. Services with no overlay equivalent are written to
`custom/docker-compose.patch.yml` so they are preserved across regenerations.

## How It Works

### Detection

The command builds its detection tables **dynamically from the overlay registry** — there are no hardcoded overlay names. For every overlay it reads:

| Source                                                         | What is extracted         |
| -------------------------------------------------------------- | ------------------------- |
| `devcontainer.patch.json` → `features`                         | Feature URI → overlay ID  |
| `devcontainer.patch.json` → `customizations.vscode.extensions` | Extension ID → overlay ID |
| `docker-compose.yml` → service `image`                         | Image prefix → overlay ID |

When multiple overlays share the same feature (e.g. both `nodejs` and `bun`
include the Node.js devcontainer feature), the one whose ID best matches the
feature's own name wins.

### Detection signals (in priority order)

1. **Devcontainer features** — e.g. `ghcr.io/devcontainers/features/node:1` → `nodejs` (confidence: **exact**)
2. **Docker Compose service images** — e.g. `postgres:16-alpine` → `postgres` (confidence: **exact**)
3. **VS Code extensions** — e.g. `ms-python.python` → `python` (confidence: **heuristic**)
4. **Remote environment variables** — e.g. `POSTGRES_*` → `postgres` (confidence: **heuristic**)

### Unmatched items → `custom/`

Anything that cannot be mapped to an overlay is preserved in the `custom/`
directory, which is merged automatically on every `regen`:

| Unmatched item                                  | Written to                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| Unknown features                                | `custom/devcontainer.patch.json` → `features`                         |
| Unknown VS Code extensions                      | `custom/devcontainer.patch.json` → `customizations.vscode.extensions` |
| Custom `mounts`                                 | `custom/devcontainer.patch.json` → `mounts`                           |
| Non-default `remoteUser`                        | `custom/devcontainer.patch.json` → `remoteUser`                       |
| Custom `postCreateCommand` / `postStartCommand` | `custom/devcontainer.patch.json`                                      |
| Unknown compose services                        | `custom/docker-compose.patch.yml` → `services`                        |

## Backup Behaviour

The same backup logic as `regen` is used:

| Condition                    | What happens                   |
| ---------------------------- | ------------------------------ |
| Inside a git repo (default)  | No backup — git tracks history |
| Outside a git repo (default) | Backup created automatically   |
| `--backup` flag              | Backup always created          |
| `--no-backup` flag           | Backup always skipped          |

Backups are placed next to the `.devcontainer/` directory as
`.devcontainer.backup-<timestamp>/`, and the corresponding glob patterns are
automatically added to `.gitignore`.

## Options

| Option                | Description                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `-d, --dir <path>`    | Path to the existing `.devcontainer/` directory (default: `./.devcontainer`)                        |
| `--dry-run`           | Print the analysis without writing any files                                                        |
| `--force`             | Overwrite existing conversion artifacts (project file, compatibility receipt, or `custom/` patches) |
| `--backup`            | Force a backup even when inside a git repo                                                          |
| `--no-backup`         | Disable backup creation even when it would normally be performed                                    |
| `--backup-dir <path>` | Custom backup directory location                                                                    |
| `--project-file`      | Deprecated no-op; `adopt` writes the repository-root project file by default                        |
| `--silent`            | Suppress routine output, including ordinary warnings, while preserving errors and writes            |
| `--json`              | Output analysis as JSON (useful for scripting; incompatible with `--silent`)                        |

`--silent` and `--json` cannot be combined. The CLI rejects the combination before it analyzes or writes adopt artifacts.

## Example Output

```
╭──────────────────────╮
│  🔍 Adopt Analysis   │
╰──────────────────────╯

Analysing .devcontainer/devcontainer.json...
Analysing .devcontainer/docker-compose.yml...

Detected features / services → suggested overlays
────────────────────────────────────────────────────────────────────────────────
Source                                                    →   Overlay               Confidence
────────────────────────────────────────────────────────────────────────────────────────────────
ghcr.io/devcontainers/features/node:1                     →   nodejs                exact
service: postgres (image: postgres:16-alpine)             →   postgres              exact
service: redis (image: redis:7-alpine)                    →   redis                 exact

Items with no overlay equivalent → custom/
────────────────────────────────────────────────────────────────────────────────
Source                                                      Action
────────────────────────────────────────────────────────────────────────────────────────────────
ghcr.io/corp/internal-tools:1                               No overlay covers this feature — preserve in custom/devcontainer.patch.json
service: my-app (image: my-registry/my-app:latest)          No overlay covers this service — preserve in custom/docker-compose.patch.yml

💡 Custom patches will be written to .devcontainer/custom/ to preserve
   any configuration that has no overlay equivalent.
```

Use the detected stack and overlays to review the project file that `adopt` writes. For the example above, its shared intent should use the canonical flat selection model:

```yaml
stack: compose
overlays:
    - nodejs
    - postgres
    - redis
```

## After Adopt

Once `adopt` has run:

1. **Review `.superposition.yml` or `superposition.yml`** — this is the shared intent to correct when inferred overlays or settings need adjustment.
2. **Review `custom/` patches** — inspect what was preserved and trim anything no longer needed.
3. **Preview** — inspect the resolved configuration before writing generated output:
    ```bash
    npx container-superposition plan --stack compose --overlays nodejs,postgres,redis
    npx container-superposition plan --stack compose --overlays nodejs,postgres,redis --verbose
    npx container-superposition plan --stack compose --overlays nodejs,postgres,redis --diff
    ```
4. **Regenerate** — rebuild `.devcontainer/` from the canonical project file:
    ```bash
    npx container-superposition regen
    ```
5. **Commit the project file** and any intended `custom/` patches. `superposition.json` is a generated compatibility/audit receipt, not the team-owned configuration to hand-edit.

## JSON Output

Use `--json` to get machine-readable output for scripting or CI workflows:

```bash
npx container-superposition adopt --dry-run --json | jq .suggestedOverlays
```

Relevant JSON fields include:

```jsonc
{
    "dir": "/absolute/path/to/.devcontainer",
    "detections": [
        {
            "source": "ghcr.io/devcontainers/features/node:1",
            "overlayId": "nodejs",
            "confidence": "exact",
            "sourceType": "feature",
        },
        // ...
    ],
    "unmatchedItems": [
        {
            "source": "ghcr.io/corp/internal-tools:1",
            "reason": "No overlay covers this feature — preserve in custom/devcontainer.patch.json",
        },
        // ...
    ],
    "customDevcontainerPatch": {
        /* or null */
    },
    "customComposePatch": {
        /* or null */
    },
    "suggestedStack": "compose",
    "suggestedOverlays": ["nodejs", "postgres", "redis"],
}
```

## See Also

- [Team Workflow](team-workflow.md) — Project-file-first team collaboration workflow
- [Custom Patches](custom-patches.md) — How `custom/` patches are merged
- [Workflows and Regeneration](workflows.md) — Regeneration and backup details
- [Quick Reference](quick-reference.md) — All commands at a glance
