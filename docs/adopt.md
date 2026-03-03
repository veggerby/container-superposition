# Adopt Command

The `adopt` command helps you **migrate an existing `.devcontainer/` configuration** to Container Superposition's overlay-based workflow.

It scans your current `devcontainer.json` and any linked `docker-compose.yml` files, matches their contents against all available overlays, and produces:

1. **`superposition.json`** — the manifest written to the **project root** (next to your `src/`, `package.json`, etc.), ready to commit and share with your team
2. **`.devcontainer/custom/devcontainer.patch.json`** — any config that has no overlay equivalent (custom features, extensions, mounts, remoteEnv, etc.)
3. **`.devcontainer/custom/docker-compose.patch.yml`** — any compose services that have no overlay equivalent

The custom patches in `custom/` are automatically merged on every `regen`, so your project-specific configuration is never lost.

## Quick Start

```bash
# Analyse your existing .devcontainer/ (prints a report, writes nothing)
npx container-superposition adopt --dry-run

# Run the analysis and write the generated files
npx container-superposition adopt

# Force-overwrite any existing superposition.json / custom/ files
npx container-superposition adopt --force
```

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

| Option                | Description                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| `-d, --dir <path>`    | Path to the existing `.devcontainer/` directory (default: `./.devcontainer`) |
| `--dry-run`           | Print the analysis without writing any files                                 |
| `--force`             | Overwrite existing `superposition.json` / `custom/` files                    |
| `--backup`            | Force a backup even when inside a git repo                                   |
| `--no-backup`         | Disable backup creation even when it would normally be performed             |
| `--backup-dir <path>` | Custom backup directory location                                             |
| `--json`              | Output analysis as JSON (useful for scripting)                               |

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

Suggested command:
  container-superposition init --stack compose --language nodejs --database postgres,redis

💡 Custom patches will be written to .devcontainer/custom/ to preserve
   any configuration that has no overlay equivalent.
```

## After Adopt

Once `adopt` has run:

1. **Review `superposition.json`** — verify the detected overlays are correct; add or remove as needed.
2. **Review `custom/` patches** — inspect what was preserved and trim anything no longer needed.
3. **Regenerate** — rebuild your `.devcontainer/` from the manifest:
    ```bash
    npx container-superposition regen
    ```
4. **Commit `superposition.json`** and, if applicable, `custom/` patches.

## JSON Output

Use `--json` to get machine-readable output for scripting or CI workflows:

```bash
npx container-superposition adopt --dry-run --json | jq .suggestedOverlays
```

The JSON object contains:

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
    "suggestedCommand": "container-superposition init --stack compose --language nodejs --database postgres,redis",
}
```

## See Also

- [Team Workflow](team-workflow.md) — Manifest-first team collaboration workflow
- [Custom Patches](custom-patches.md) — How `custom/` patches are merged
- [Workflows and Regeneration](workflows.md) — Regeneration and backup details
- [Quick Reference](quick-reference.md) — All commands at a glance
