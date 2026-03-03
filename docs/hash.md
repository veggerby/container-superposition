# Hash Command

The `hash` command produces a stable, deterministic fingerprint for a devcontainer configuration.
It lets you verify that two environments are equivalent, detect drift in CI, and commit a reproducible
stamp alongside your `superposition.json` manifest.

## Overview

```bash
# From CLI options
npx container-superposition hash --stack compose --overlays dotnet,postgres,redis

# Reading from an existing manifest (auto-discovers superposition.json)
npx container-superposition hash

# Machine-readable output
npx container-superposition hash --stack compose --overlays dotnet,postgres,redis --json

# Write full hash to .devcontainer/superposition.hash
npx container-superposition hash --write
```

## What Is Hashed

The fingerprint is a SHA-256 digest of a canonical JSON object with the following fields:

| Field | Source | Notes |
|-------|--------|-------|
| `stack` | `--stack` flag or manifest `baseTemplate` | `plain` or `compose` |
| `overlays` | Resolved overlay list (alphabetically sorted) | Includes auto-resolved dependencies |
| `preset` | `--preset` flag or manifest `preset` | `null` when no preset |
| `base` | `--base` flag or manifest `baseImage` | e.g. `bookworm`, `alpine` |
| `tool` | Tool version (major.minor only) | Stable across patch releases; truncated before hashing |

Keys in the canonical object are sorted alphabetically and the overlay list is sorted before hashing,
so the result is identical regardless of the order overlays are provided.

## Output

### Text Output (default)

```
╭ Environment Fingerprint ──────────────────────────╮
│                                                   │
│   stack        compose                            │
│   overlays     dotnet, postgres, redis            │
│   preset       (none)                             │
│   base         bookworm                           │
│   tool         0.1.3                              │
│                                                   │
│   hash         53ed972d                           │
│                                                   │
╰───────────────────────────────────────────────────╯
```

Auto-resolved dependencies are shown with an `(auto)` label:

```
overlays     grafana, prometheus (auto)
```

### JSON Output (`--json`)

```json
{
  "stack": "compose",
  "overlays": ["dotnet", "postgres", "redis"],
  "preset": null,
  "base": "bookworm",
  "tool": "0.1.3",
  "hash": "53ed972d",
  "hashFull": "53ed972da2ba0712ae15b4003aa46234e7eeba2e977e7a397453740202ebbea4"
}
```

- `hash` — first 8 hex characters, suitable for display and badges
- `hashFull` — full 64-character SHA-256 hex digest, recommended for CI comparisons

## Options

| Option | Description |
|--------|-------------|
| `--stack <type>` | Base template: `plain` or `compose` |
| `--overlays <list>` | Comma-separated overlay IDs |
| `--preset <id>` | Preset ID (optional, reflected in hash) |
| `--base <image>` | Base image/distro (e.g. `bookworm`, `alpine`) |
| `--manifest <path>` | Path to a specific `superposition.json` |
| `-o, --output <path>` | Directory to write hash file (used with `--write`) |
| `--write` | Write hash to `.devcontainer/superposition.hash` |
| `--json` | Output as JSON for scripting |

When `--stack`/`--overlays` are omitted the command searches for `superposition.json` in:

1. Current directory (`superposition.json`)
2. `.devcontainer/superposition.json`
3. Parent directory (`../superposition.json`)

## The `--write` Flag

```bash
npx container-superposition hash --write
```

Writes the **full** 64-character hash to `.devcontainer/superposition.hash` (one line, no trailing
whitespace). Commit this file alongside `superposition.json`:

```
.devcontainer/
├── devcontainer.json
├── superposition.json
└── superposition.hash   ← commit this
```

Use a custom output directory with `-o`:

```bash
npx container-superposition hash --write -o ./infra/.devcontainer
```

## CI Drift Detection

Detect when the environment has changed since the last commit:

```yaml
- name: Verify environment fingerprint
  run: |
    EXPECTED=$(cat .devcontainer/superposition.hash)
    ACTUAL=$(npx container-superposition hash --json | jq -r .hashFull)
    [ "$EXPECTED" = "$ACTUAL" ] || (echo "Environment drift detected" && exit 1)
```

Or using the short hash stored in a badge/README:

```yaml
- name: Verify short fingerprint
  run: |
    EXPECTED="53ed972d"
    ACTUAL=$(npx container-superposition hash --json | jq -r .hash)
    [ "$EXPECTED" = "$ACTUAL" ] || (echo "Environment drift detected" && exit 1)
```

## Stability Guarantees

- **Same inputs → same hash** — guaranteed for any given tool version series
- **Overlay order is irrelevant** — `postgres,redis` hashes identically to `redis,postgres`
- **Dependencies are included** — auto-resolved dependencies affect the hash (as they affect the environment)
- **Patch versions are ignored** — `0.1.3` and `0.1.99` produce the same hash; `0.2.0` does not
- **Hash changes when any input changes** — stack, overlays, preset, base image, or minor/major tool version

## Examples

### Fingerprint a Standard Web API Stack

```bash
npx container-superposition hash \
  --stack compose \
  --overlays nodejs,postgres,redis
```

### Read from Manifest and Write Hash File

```bash
# Run from the project root (manifest at .devcontainer/superposition.json)
npx container-superposition hash --write
```

### Compare Two Configurations

```bash
# Project A
HASH_A=$(npx container-superposition hash --stack compose --overlays nodejs,postgres --json | jq -r .hash)

# Project B
HASH_B=$(npx container-superposition hash --manifest ./project-b/.devcontainer/superposition.json --json | jq -r .hash)

[ "$HASH_A" = "$HASH_B" ] && echo "Environments are equivalent" || echo "Environments differ"
```

## Related Commands

- [`plan`](discovery-commands.md#plan-command) — Preview what will be generated
- [`list`](discovery-commands.md#list-command) — Browse available overlays
- [`explain`](discovery-commands.md#explain-command) — Deep dive into a specific overlay
