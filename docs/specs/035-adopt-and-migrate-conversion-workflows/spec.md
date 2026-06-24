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

### Non-goals

- Reverse-engineering every internal detection heuristic.
- Changing overlay registry or compose logic.
- Interactive init/regen flows after conversion.
- Doctor diagnostics after conversion.

## Must Preserve

- `adopt --dry-run` and `adopt --json` remain non-destructive.
- `adopt` writes both persisted config and preservation artifacts only after explicit confirmation or forced overwrite path.
- `migrate` remains manifest-to-project-file conversion, not full regeneration.
- Unmatched config remains preservable instead of silently dropped.
- Conversion workflows remain explicit about which artifacts are canonical versus compatibility or preservation artifacts.

## Constraints

- Must keep analysis-only modes non-destructive.
- Must align canonical-source language with ADR 001 while preserving compatibility-manifest reality where current product still writes it.
- Must preserve explicit overwrite and backup boundaries before any write.
- Must not imply converted output is fully regenerated or validated until user runs follow-up flow.

## Assumptions

- Existing adoption heuristics remain implementation-owned; this spec defines user-visible trust and artifact contract, not mapping algorithm internals.
- `adopt` and `migrate` remain separate flows because their sources, confidence needs, and write consequences differ.
- Missing `docs/foundation.md` means ADR 001 plus current command/tests/docs evidence remain authority for conversion routing.

## Proposed Behavior

### 1. `adopt` starts as analysis report, not immediate conversion

`adopt` MUST first analyze existing `.devcontainer/` and show:

- detected features/services mapped to suggested overlays
- unmatched items with `custom/` destination implication
- suggested stack and suggested command
- whether custom patch files will be needed
- confidence framing that helps user judge whether suggested result is close match or fallback-heavy adoption

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

Write summary MUST explain why each artifact exists: project file for canonical replay intent, manifest for compatibility/reproducibility, and `custom/` for preserved non-overlayable behavior.

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

Copy SHOULD make clear that `migrate` changes canonical source, not generated `.devcontainer/` output yet.

## UX Contract

### Canonical interaction model

`adopt` and `migrate` are conversion flows, not generation flows.

User decision ladder:

1. inspect source state
2. understand what can convert cleanly and what needs preservation
3. confirm write intent only after artifact impact clear
4. land on canonical next step (`regen` or manual review)

If command cannot safely infer or cannot safely overwrite, flow stops before write phase.

### Page contract

#### `adopt` analysis view

First screenful MUST answer:

- what source was analyzed
- which overlays were detected or suggested
- what will fall back to `custom/`
- whether confidence is high enough to proceed

Analysis output MUST separate `Matched`, `Needs preservation`, and `Suggested next command/artifacts` so users can judge trust quickly.

Low-confidence or no-match state MUST route user to normal `init` instead of pressuring conversion.

#### `adopt` write confirmation

Before confirmation, output MUST label:

- canonical artifact to be written
- compatibility artifact to be written
- preservation artifacts to be written
- overwrite and backup behavior

If command cannot prompt interactively, it aborts with explicit statement that no files were written.

#### `migrate`

`migrate` MUST present as shorter bridge:

- source manifest found
- target project file path
- note that generated output is unchanged yet
- next step: `regen`

### Interaction rules

- Analysis-only modes (`--json`, `--dry-run`) never ask for confirmation and never imply pending writes already approved.
- Write mode confirmation MUST happen after artifact summary, not before analysis detail.
- Overwrite guard MUST name conflicting files and required recovery action (`--force` or manual cleanup).
- Backup messaging MUST appear before writes when backup will happen or be skipped by default.
- Success output MUST separate `written`, `preserved`, and `still needs review` information.

### Terminology and copy rules

- `canonical` refers to repository project file.
- `compatibility artifact` refers to manifest written for compatibility/reproducibility, not primary source-of-truth.
- `preservation artifact` refers to `custom/` patch output for unmatched behavior.
- `adopt` copy MUST not imply one-to-one perfect conversion when unmatched config exists.
- `migrate` copy MUST not imply `.devcontainer/` regenerated or validated yet.

### QA scenario scripts

1. `adopt --dry-run` shows matched overlays, unmatched preservation areas, suggested artifacts, and no confirmation prompt.
2. `adopt` with no recognizable mappings stops with guidance to use `init`.
3. `adopt` write flow names canonical, compatibility, and preservation artifacts before confirmation.
4. `adopt` overwrite conflict fails with named files and recovery action before any write.
5. `migrate` success states generated output unchanged and points to `regen`.

## Acceptance Criteria

| # | Criterion |
| --- | --- |
| AC-1 | `adopt` can emit analysis as JSON, human-readable dry-run, or confirmed write flow without writing files in analysis modes. |
| AC-2 | `adopt` reports matched overlay suggestions, unmatched items for `custom/`, and suggested command/stack before any write occurs. |
| AC-3 | `adopt` aborts safely when output targets already exist unless `--force` provided. |
| AC-4 | `adopt` write-mode confirmation and completion output explain which artifacts will be written, which are canonical versus compatibility/preservation artifacts, and what users should review next. |
| AC-5 | `adopt` writes root `superposition.json`, repository project file, and optional `custom/` patch artifacts when confirmed. |
| AC-6 | `adopt` preserves unmatched config instead of silently discarding it, including devcontainer and compose fragments where applicable. |
| AC-7 | `migrate` converts existing manifest into repository project file, reuses existing supported path when appropriate, states that generated output is unchanged until `regen`, and points user to `regen` afterward. |
| AC-8 | Both commands fail with targeted guidance for missing source inputs or invalid overwrite conditions. |
| AC-9 | Automated coverage exists for adopt detection/output/write guards and migrate project-file creation behavior. |
| AC-10 | Conversion flows define explicit analysis, confirmation, blocked, and success states, including artifact framing for canonical, compatibility, and preservation outputs. |
| AC-11 | Ownership is explicit: adopt owns detection/confidence/preservation planning, migrate owns manifest bridge, project-config owns project-file IO, and overlay registry remains semantic source for matchable overlay identities. |

## Evidence Basis

- `tool/commands/adopt.ts` — analysis report, confirm prompt, overwrite guard, backup path, write outputs, next steps.
- `tool/__tests__/adopt.test.ts` — dry-run, JSON output, unmatched preservation, overwrite rules, project-file reuse, backup behavior.
- `tool/commands/migrate.ts` — manifest discovery, overwrite guard, project-file creation, `regen` guidance.
- `tool/schema/project-config.ts` and manifest loading utilities — project-file path selection and answer reconstruction.
- `docs/workflows.md`, `docs/README.md`, `docs/adopt.md` — project-file-first workflow intent.

## Evidence Confidence

**Medium-High**

Adopt behavior heavily evidenced by tests. Lower confidence sits in long-term artifact strategy, not in current analysis, confirmation, overwrite, backup, or migrate bridge behavior.

## Implementation-vs-Intent Mismatches

1. `adopt` still writes root `superposition.json` as standard artifact even though broader workflow docs now center project file as canonical replay source.
2. Deprecated `adopt --project-file` flag remains accepted as no-op with warning; user-facing contract not fully cleaned up.
3. Conversion docs are less prominent than generation docs despite strong workflow-routing importance for existing repos.

## Technical Design

### Architecture Ownership

- `tool/commands/adopt.ts` owns source analysis of existing `.devcontainer/`, overlay suggestion/classification, confidence framing, unmatched-item preservation planning, overwrite/backup guards, confirmation prompt, and write summary.
- `tool/commands/migrate.ts` owns manifest discovery, overwrite guard, manifest-to-project-selection reconstruction, project-file write, and `regen` handoff.
- Overlay registry metadata remains semantic authority for adoption detection tables and overlay IDs. Adopt heuristics may infer mappings from overlay assets, but must not create overlay semantics outside registry.
- `tool/schema/project-config.ts` owns supported project-file path discovery and canonical write format.
- Manifest/schema utilities own manifest loading/version compatibility for migrate input and adopt compatibility artifact generation.
- Conversion confidence thresholds and no-match cutoff policy belong to `adopt` reporting contract, not to low-level detection helpers.

### System Boundaries

- `adopt` and `migrate` are conversion flows only. They prepare canonical inputs and preservation artifacts; they do not claim generated `.devcontainer/` is regenerated or validated.
- Analysis modes remain non-destructive.
- `adopt` may write three artifact classes in write mode only:
  - canonical project file
  - compatibility manifest
  - preservation artifacts under `.devcontainer/custom/`
- `migrate` writes canonical project file only.
- Compatibility manifest remains required output for current `adopt` steady-state implementation. Future removal or optionalization requires ADR follow-up, not opportunistic implementation drift.

### Canonical Data Flow

#### Adopt

1. Resolve source `.devcontainer/` path and load current config fragments.
2. Detect candidate overlays from features, services, extensions, scripts, and related signals.
3. Classify results into matched overlays, heuristic matches, and unmatched items requiring preservation.
4. Build proposed canonical selection plus preservation artifact plan.
5. Render analysis report or JSON output.
6. If write mode, enforce overwrite guards and backup policy, then present artifact summary and confirmation.
7. On confirmation, write project file, compatibility manifest, and any preservation patches; then emit review + `regen`/manual follow-up guidance.

#### Migrate

1. Resolve manifest path.
2. Validate manifest readability and target project-file path availability.
3. Reconstruct answers from manifest semantics.
4. Serialize canonical project file.
5. Emit success message that generated output is unchanged and `regen` is next step.

### Interfaces and Invariants

- Adopt outputs must always label artifact role: canonical, compatibility, preservation.
- No-match or low-confidence adopt path stops before write and routes user to `init`.
- Detection heuristics may evolve, but JSON and text output must preserve stable top-level categories: matched, needs preservation, suggested artifacts/next step.
- Existing supported project-file path is reused when present; otherwise default path is `.superposition.yml` unless caller explicitly chooses another output path.
- `migrate` never mutates generated output.
- Conversion success never implies validation complete; follow-up guidance must point to `regen` and review.

### Implementation Slices

1. Adopt analysis contract hardening: stable matched/unmatched/confidence reporting and suggested-command framing.
2. Adopt write-flow hardening: overwrite detection, backup visibility, artifact-role summary, non-interactive safe abort, success review guidance.
3. Preservation hardening: unmatched config captured into explicit preservation artifact plan rather than silent omission.
4. Migrate bridge hardening: manifest discovery, target-path reuse, overwrite rules, unchanged-generated-output messaging.
5. Docs alignment slice: conversion docs promoted and terminology aligned with canonical/compatibility/preservation roles.

### Risk Notes

- Adoption trust depends on confidence framing; weak no-match cutoff can create misleading “successful” conversions.
- Artifact-role confusion remains likely while `adopt` still writes manifest and project file together; summary copy must stay explicit.
- Detection heuristics sourced from overlay assets can change as overlays evolve; regression tests must lock user-visible classification behavior.
- Backup/overwrite handling spans conversion and replay utilities; mismatched defaults will confuse users moving between flows.

### Test Plan

- Adopt tests for JSON, dry-run, no-match stop, low-confidence routing, matched/unmatched classification, and suggested command output.
- Adopt write tests for confirmation gating, non-interactive safe abort, overwrite guard naming, backup created/skipped messaging, project-file reuse, and preservation artifact write results.
- Migrate tests for manifest discovery, existing target conflict, explicit output path, project-file creation, and unchanged-generated-output + `regen` guidance.
- Regression tests that adopt still writes canonical + compatibility + preservation artifacts with explicit role framing.
- Detection-regression tests for feature/service/extension/script mapping so overlay registry changes do not silently degrade adoption quality.

## Architecture Decision Impact

Aligned with ADR 001. `docs/foundation.md` absent; no additional foundation authority to reconcile.

- Governing ADR: `docs/adr/adr001-project-file-first-replay-and-regeneration.md`
- No ADR amendment needed for current scope.
- Future removal of compatibility manifest from `adopt` would require ADR follow-up.

## Open Questions

- Optional JSON or dry-run parity for `migrate` is future enhancement, not blocker for current implementation-safe framing.
- File-by-file preview of generated preservation patches remains optional UX enhancement, not required boundary for current scope.

## Routing Decision

**PM → Developer**

Reason: conversion boundaries, artifact roles, flow sequencing, risks, and tests now explicit under current ADR.
