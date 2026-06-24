# Feature Specification: Adopt and Migrate Conversion Workflows

**Spec ID**: `035-adopt-and-migrate-conversion-workflows`
**Taxonomy**: `CLI-UX`
**Created**: 2026-06-24
**Author**: PM Agent
**Status**: Draft
**Input**: Reverse-spec existing user-facing conversion workflows for `adopt` and `migrate`.

---

## Request Classification

Reverse-spec current CLI UX for turning existing devcontainer state into project-file-first workflow assets. Scope covers `adopt` and `migrate`, including confirmation, overwrite guards, backups, and output artifacts.

## Problem Statement

Product now supports two conversion-oriented workflows:

- `adopt` analyzes an existing `.devcontainer/`, suggests overlay-backed equivalent, preserves unmatched config in `custom/`, and can write new project artifacts.
- `migrate` turns existing `superposition.json` manifest into repository project file for project-file-first replay.

These flows are strategically important for bringing existing repos into current workflow, but their contract lives mostly in code and tests.

## User Goals

### Team adopting existing hand-written devcontainer

- See what existing config maps cleanly to overlays.
- Understand what cannot be mapped and will need `custom/` preservation.
- Preview suggested command and conversion result before writing files.
- Avoid accidental overwrite of existing project artifacts.

### Team moving from manifest-first to project-file-first

- Create root project file from existing manifest with minimal ceremony.
- Reuse existing supported project file path when present.
- Get immediate guidance toward `regen` after migration.

## Scope

### In scope

- `adopt` text, JSON, and dry-run analysis output.
- Detection of overlays from features, compose services, extensions, and generated scripts.
- Classification of unmatched items into custom patch preservation.
- Suggested-command output, confirmation prompt, overwrite guards, backup behavior, and write results.
- `migrate` manifest discovery, overwrite guard, project-file creation, and next-step guidance.

### Out of scope

- Reverse-engineering every internal detection heuristic.
- Changing overlay registry or compose logic.
- Interactive init/regen flows after conversion.
- Doctor diagnostics after conversion.

## Must Preserve

- `adopt --dry-run` and `adopt --json` remain non-destructive.
- `adopt` writes both persisted config and preservation artifacts only after explicit confirmation or forced overwrite path.
- `migrate` remains manifest-to-project-file conversion, not full regeneration.
- Unmatched config remains preservable instead of silently dropped.

## Proposed Behavior

### 1. `adopt` starts as analysis report, not immediate conversion

`adopt` MUST first analyze existing `.devcontainer/` and show:

- detected features/services mapped to suggested overlays
- unmatched items with `custom/` destination implication
- suggested stack and suggested command
- whether custom patch files will be needed

If nothing recognizable maps to overlays, command SHOULD stop with guidance to use normal `init` instead of writing low-confidence output.

### 2. `adopt` supports three user intents

- **JSON mode**: machine-readable analysis only
- **dry-run mode**: human-readable analysis only
- **write mode**: confirm, optionally back up, then write project artifacts

Write mode MUST be guarded by explicit confirmation prompt unless process cannot prompt, in which case it aborts safely.

### 3. Conversion output preserves both canonical source and escape hatches

Successful `adopt` MUST write:

- root `superposition.json`
- repository project file (`.superposition.yml` by default, or existing supported path)
- optional `.devcontainer/custom/` patch files when unmatched config exists

This preserves replayable canonical input while carrying forward non-overlayable behavior.

### 4. Overwrite and backup behavior is explicit

Before writing, `adopt` MUST detect pre-existing target files and require `--force` to overwrite.

When proceeding with writes, backup behavior MUST mirror broader replay philosophy:

- default skip inside git repo
- default create outside git repo
- allow explicit force/disable and custom backup dir

### 5. `migrate` is low-ceremony bridge from manifest-first to project-file-first

`migrate` MUST:

- discover manifest automatically or use explicit path
- fail clearly when no manifest found or project file already exists without `--force`
- rebuild project-file selection from manifest semantics
- write supported project file path
- end with guidance to run `regen`

## Acceptance Criteria

| # | Criterion |
| --- | --- |
| AC-1 | `adopt` can emit analysis as JSON, human-readable dry-run, or confirmed write flow without writing files in analysis modes. |
| AC-2 | `adopt` reports matched overlay suggestions, unmatched items for `custom/`, and suggested command/stack before any write occurs. |
| AC-3 | `adopt` aborts safely when output targets already exist unless `--force` provided. |
| AC-4 | `adopt` writes root `superposition.json`, repository project file, and optional `custom/` patch artifacts when confirmed. |
| AC-5 | `adopt` preserves unmatched config instead of silently discarding it, including devcontainer and compose fragments where applicable. |
| AC-6 | `migrate` converts existing manifest into repository project file, reuses existing supported path when appropriate, and points user to `regen` afterward. |
| AC-7 | Both commands fail with targeted guidance for missing source inputs or invalid overwrite conditions. |
| AC-8 | Automated coverage exists for adopt detection/output/write guards and migrate project-file creation behavior. |

## Evidence Basis

- `tool/commands/adopt.ts` — analysis report, confirm prompt, overwrite guard, backup path, write outputs, next steps.
- `tool/__tests__/adopt.test.ts` — dry-run, JSON output, unmatched preservation, overwrite rules, project-file reuse, backup behavior.
- `tool/commands/migrate.ts` — manifest discovery, overwrite guard, project-file creation, `regen` guidance.
- `tool/schema/project-config.ts` and manifest loading utilities — project-file path selection and answer reconstruction.
- `docs/workflows.md`, `docs/README.md`, `docs/adopt.md` — project-file-first workflow intent.

## Confidence

**Medium-High**

Adopt behavior heavily evidenced by tests. Lower confidence on long-term intended role of root `superposition.json` because broader docs now emphasize project-file-first workflow.

## Implementation-vs-Intent Mismatches

1. `adopt` still writes root `superposition.json` as standard artifact even though broader workflow docs now center project file as canonical replay source.
2. Deprecated `adopt --project-file` flag remains accepted as no-op with warning; user-facing contract not fully cleaned up.
3. Conversion docs are less prominent than generation docs despite strong workflow-routing importance for existing repos.

## ADR Impact

Covered by `docs/adr/adr001-project-file-first-replay-and-regeneration.md`.

No extra feature-local ADR needed unless product later removes compatibility manifest output from `adopt` or changes Git-mutation safety rules. `docs/foundation.md` remains absent during review.

## Open Questions

1. Should `adopt` continue writing root `superposition.json` long-term, or should project file become sole durable output once migration path is complete?
2. Should `adopt` eventually support preview of resulting project file/custom patches, not only suggested command and detection tables?
3. Should `migrate` gain JSON/dry-run mode for automation parity with `adopt`?
4. Long-term status of root `superposition.json` after `adopt` remains unresolved even after ADR 001; current implementation still writes it as compatibility artifact.

## Routing Decision

**PM → Developer**

Reason: current behavior and gaps clear from code/tests. Main next work is cleanup, consistency, and documentation, not blocker discovery.