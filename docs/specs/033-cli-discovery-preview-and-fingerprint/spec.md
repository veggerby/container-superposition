# Feature Specification: CLI Discovery, Preview, and Fingerprint Commands

**Spec ID**: `033-cli-discovery-preview-and-fingerprint`
**Taxonomy**: `CLI-UX`
**Created**: 2026-06-24
**Author**: PM Agent
**Status**: Draft
**Input**: Reverse-spec existing user-facing CLI behavior for `list`, `explain`, `plan`, and `hash`.

---

## Request Classification

Reverse-spec from current command code, docs, tests, and preset catalog. Scope covers non-destructive inspection commands that help users discover overlays, inspect details, preview generation, compare planned changes, and fingerprint configurations.

## Problem Statement

Product exposes rich read-only command surface, but behavior contract split across docs and implementation. Current commands let users:

- discover overlays and presets
- inspect overlay and preset details
- preview generation plans and diffs
- compute deterministic environment fingerprints

Some output and guidance drift from current product model, especially around category naming, messaging visibility, and rerun hints.

## User Goals

### First-time user

- Discover available overlays and presets without opening source files.
- Inspect one overlay or preset deeply before selecting it.
- Preview generated files, ports, and dependencies before running generation.

### Returning user

- Compare planned change set against existing `.devcontainer/` output.
- Understand why dependencies were auto-added or why overlays were skipped.
- Export machine-readable output for scripts and CI.

### Team maintainer / automation user

- Derive stable fingerprint from manifest or explicit selections.
- Use JSON output for policy checks and tooling.

## Scope

### In scope

- `list` grouped and filtered discovery output.
- `explain` detailed overlay and preset inspection.
- `plan` normal preview, verbose dependency narration, manifest mode, and `--diff` comparison mode.
- `hash` manifest/explicit input behavior, auto-added dependency visibility, and optional file write.
- Help/error messaging and rerun hints attached to these commands.

### Out of scope

- Interactive `init` / `regen` questionnaire.
- Doctor diagnostics and fixes.
- Adopt/migrate conversion workflows.
- Underlying overlay composition semantics except where visible in preview output.

## Must Preserve

- All four commands stay read-only except `hash --write`.
- JSON output remains available for scripting.
- Plan preview remains valid from either explicit selections or existing manifest.
- Fingerprint stays deterministic for same semantic inputs.

## Proposed Behavior

### 1. `list` is default discovery index

`list` MUST provide two primary modes:

- default grouped-by-category browse mode
- filtered table mode when category, tags, or stack filter applied

Default mode SHOULD feel catalog-like and show users where overlays live.

Filtered mode SHOULD optimize for quick comparison across IDs, names, categories, ports, and dependencies.

### 2. `explain` is deep inspection surface for both overlays and presets

`explain <id>` MUST show:

- description, category, tags, compatibility
- requires / suggests / conflicts
- exposed ports
- files in overlay directory
- patch-derived devcontainer features, extensions, env, and compose services when present
- preset-specific required overlays, user choices, parameterized options, and concrete CLI examples when target is preset

If ID unknown, command MUST fail with suggestion to use discovery surface.

### 3. `plan` is safe preview surface before file writes

`plan` MUST support:

- explicit overlay-list input
- manifest-driven input
- dependency auto-resolution
- stack-compatibility skip warnings
- conflict detection before generation
- file list preview
- port mapping preview with optional offset

When `--verbose` set, `plan` MUST explain why each overlay appears in final result, including direct selection, required dependency, transitive path, skipped overlays, and conflicts.

### 4. `plan --diff` compares intention against current generated output

Diff mode MUST tell users whether planned output would:

- create files
- modify or overwrite files
- preserve `custom/` files
- remove stale generated files
- add or remove overlays
- add or remove exposed ports

Text mode SHOULD render summary plus inline unified diff where computable.

JSON mode SHOULD expose same structural categories without terminal formatting.

### 5. `hash` provides compact reproducibility fingerprint

`hash` MUST accept either:

- explicit stack + overlays inputs
- inferred manifest input when explicit inputs absent

Command MUST resolve required dependencies before hashing and mark auto-added overlays in human-readable output.

`hash --write` MUST persist full fingerprint into `.devcontainer/superposition.hash` or caller-specified output directory.

## Acceptance Criteria

| # | Criterion |
| --- | --- |
| AC-1 | `list` supports grouped default browse mode and filter-driven table mode, with JSON available in either path. |
| AC-2 | `list` filtered output renders human-readable port and dependency metadata rather than raw object stringification artifacts. |
| AC-3 | `explain` surfaces overlay metadata, files, patch-derived behavior, compose services, and preset-specific parameters/examples when applicable. |
| AC-4 | `plan` supports explicit and manifest inputs, auto-resolves dependencies, warns on stack incompatibility, and fails on unresolved conflicts. |
| AC-5 | `plan --verbose` exposes machine-readable and human-readable dependency reasoning including direct selections, dependency reasons, paths, and issues. |
| AC-6 | `plan --diff` reports file, overlay, and port changes versus existing generated output and preserves `custom/` awareness. |
| AC-7 | `hash` computes deterministic fingerprint from explicit or manifest inputs, includes auto-added dependencies in human-readable output, and optionally writes hash file. |
| AC-8 | Unknown overlays or invalid manifest/stack inputs fail with targeted guidance rather than silent fallback. |
| AC-9 | Automated coverage exists for list filtering, explain content, plan verbose/diff behavior, and hash determinism. |

## Evidence Basis

- `tool/commands/list.ts` — grouped browse mode, filtered table, help footer.
- `tool/commands/explain.ts` — overlay/preset inspection, file and patch extraction, CLI examples.
- `tool/commands/plan.ts` — plan inputs, verbose reasoning, diff output, rerun hints, compatibility and conflict handling.
- `tool/commands/hash.ts` — fingerprint inputs, dependency resolution, output/write behavior.
- `tool/cli/args.ts` — command declarations and available flags.
- `tool/__tests__/commands.test.ts` — command output, JSON behavior, verbose traces, diff scenarios, hash determinism.
- `docs/discovery-commands.md`, `docs/presets.md`, `docs/presets-architecture.md`, `docs/README.md` — user-facing explanation and current drift.

## Confidence

**Medium**

Behavior strongly evidenced in code/tests. Confidence reduced by meaningful drift between docs and actual command affordances.

## Implementation-vs-Intent Mismatches

1. `list` default browse mode collapses `messaging` into "Database & Messaging" instead of exposing standalone messaging category used elsewhere in questionnaire and schema.
2. Filter help strings omit `messaging`, though code and schema distinguish it as real category.
3. `formatAsTable()` joins raw `overlay.ports` values, so rich port objects can render as `[object Object]`.
4. `plan` success hint emits `init --overlays ...`, but `init` parser does not currently accept `--overlays`; current hint is not valid executable guidance.
5. `docs/presets.md` and `docs/presets-architecture.md` still state presets are not directly available via CLI, but parser already supports `--preset` and `--preset-param`.

## ADR Impact

No feature-local ADR needed.

Cross-feature messaging and rerun guidance are covered by `docs/adr/adr001-project-file-first-replay-and-regeneration.md`. `docs/foundation.md` remains absent, so review used existing architecture/docs/spec sources instead.

## Open Questions

1. Should messaging remain first-class discovery category everywhere, or intentionally stay grouped with database for browse simplicity?
2. Should preview commands point users toward project-file-first workflows instead of direct-generation flag recipes when generating rerun hints?
3. Should `hash` remain separate command long-term, or become sub-capability of broader plan/doctor workflow?
4. `plan` rerun hints still emit invalid `init --overlays ...` guidance and should be realigned to ADR 001 project-file-first routing.

## Routing Decision

**PM → UX**

Reason: command behavior mostly clear, but category model, preview hint wording, and docs parity need UX/content contract before implementation cleanup.