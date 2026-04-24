# Feature Specification: Make superposition.yml the Canonical Input

**Spec ID**: `008-project-file-canonical`
**Created**: 2026-03-26
**Author**: PM Agent
**Status**: Approved
**Input**: GitHub issue #134 — make `superposition.yml` the required canonical input for all generation flows

## Overview

Make `superposition.yml` (the project config file) the required, canonical input for all
generation and regeneration flows. `superposition.json` (the manifest) becomes an output-only
artifact — a generated receipt, not an input source.

## Motivation

Three entry points currently disagree on which file is authoritative, creating user confusion
and dead code paths. The newest code path (`generate`) already writes `superposition.yml`
first. This spec promotes that pattern to all entry points.

## Behavioral Changes

### `init` — Always writes `superposition.yml`

- Remove `--project-file` flag; writing the project config is now the default.
- Add `--no-scaffold` flag to skip generating `.devcontainer/` (for project-file-only runs).
- Scaffold (`.devcontainer/` generation) remains the default for backward compatibility.
- The project file is written before scaffolding; a scaffold failure does not lose the config.

### `regen` — Reads `superposition.yml` only

- Default input: the project config file auto-discovered in the repository root.
- `--from-manifest <path>` is retained as a **deprecated hidden flag** that emits a warning
  pointing toward `cs migrate`. Existing CI scripts that rely on it will still work but
  receive a deprecation notice.
- If no project file exists and `superposition.json` is present: error with actionable
  migration guidance: `Run 'cs migrate' to create a project file from your existing manifest.`
- If neither file exists: error with creation guidance.

### `superposition.json` — Output only

- Still written by `composeDevContainer` / `generateManifestOnly` as before.
- No longer read as a generation input in the standard flow.
- Still read by `doctor` for diagnostics and drift detection.

## New Commands

### `cs migrate`

One-time migration from manifest-only repositories:

1. Discovers or accepts `--from-manifest <path>` to locate `superposition.json`.
2. Loads and validates the manifest (with auto-migration for old versions).
3. Converts manifest to `ProjectConfigSelection` via the existing
   `buildAnswersFromManifest → mergeAnswers → buildProjectConfigSelectionFromAnswers` pipeline.
4. Discovers the output path for the project file (uses existing file if present, otherwise
   defaults to `.superposition.yml`); `--force` to overwrite.
5. Writes the project config YAML.
6. Prints a success message with next-step guidance (`regen` to regenerate).

## `doctor` Drift Detection

Once the project file is canonical, `doctor` can compare the two files:

- Load project file overlays (via `loadProjectConfig`).
- Load last-generated manifest overlays (via existing manifest loading).
- Report a new `project-file-drift` finding when the overlay sets differ.
- Suggest `regen` to reconcile.

## Migration Considerations

| Repo state                    | Impact                            | Action                           |
| ----------------------------- | --------------------------------- | -------------------------------- |
| Has `superposition.yml` only  | None — already correct            | —                                |
| Has `superposition.json` only | `regen` errors                    | Run `cs migrate` once            |
| Has both (consistent)         | None — regen prefers project file | —                                |
| CI using `--from-manifest`    | Warning on each run               | Switch to `cs migrate` + `regen` |

## Notes

Implementation proceeds with this spec committed. No further approval required for the
behavioral changes listed above.
