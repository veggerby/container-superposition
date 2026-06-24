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

### Non-goals

- Interactive `init` / `regen` questionnaire.
- Doctor diagnostics and fixes.
- Adopt/migrate conversion workflows.
- Underlying overlay composition semantics except where visible in preview output.

## Must Preserve

- All four commands stay read-only except `hash --write`.
- JSON output remains available for scripting.
- Plan preview remains valid from either explicit selections or existing manifest.
- Preview surfaces stay safe even when current generated output missing, partial, or stale.
- Fingerprint stays deterministic for same semantic inputs.

## Constraints

- Must remain read-only except explicit `hash --write` artifact creation.
- Must align next-step guidance with ADR 001 project-file-first routing.
- Must keep JSON output script-safe even when human-readable recovery guidance changes.
- Must preserve `custom/` as user-owned preserved area in preview and diff framing.

## Assumptions

- Command set stays `list`, `explain`, `plan`, `hash`; this spec clarifies contract, not command taxonomy.
- Preview surfaces may inspect generated output and manifest state, but they do not become remediation flows.
- Missing `docs/foundation.md` means ADR 001 plus current command/docs evidence remain authority for routing language.

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

Output SHOULD separate "what this adds" from "what this depends on" so users can scan impact quickly.

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

When no existing generated output exists, diff mode MUST degrade into explicit first-write preview instead of vague empty diff.

Text mode SHOULD render summary plus inline unified diff where computable.

JSON mode SHOULD expose same structural categories without terminal formatting.

### 5. `hash` provides compact reproducibility fingerprint

`hash` MUST accept either:

- explicit stack + overlays inputs
- inferred manifest input when explicit inputs absent

Command MUST resolve required dependencies before hashing and mark auto-added overlays in human-readable output.

Human-readable output SHOULD also state which source was hashed so fingerprints remain explainable in bug reports and CI logs.

`hash --write` MUST persist full fingerprint into `.devcontainer/superposition.hash` or caller-specified output directory.

## UX Contract

### Canonical interaction model

These commands form one read-only discovery ladder:

1. `list` answers what exists
2. `explain` answers what one item does
3. `plan` answers what selected inputs would generate
4. `plan --diff` answers what would change here
5. `hash` answers whether two semantic inputs are same configuration

Each command MUST stand alone, but next-step guidance SHOULD move user forward on this ladder rather than sideways to unrelated flows.

### Page contract

#### `list`

- Default view: browseable grouped catalog, with categories visible even when only few overlays exist in group.
- Filtered view: compact comparison table optimized for scan, not prose.
- Empty filter result: explicit `No overlays match current filters` style message plus hint to clear or broaden filters.
- JSON mode: same underlying groups/rows without terminal-only formatting.

#### `explain`

- First screenful MUST identify whether target is overlay or preset.
- Output MUST separate `What this adds`, `Depends on`, and `Conflicts with` style sections so users can scan impact fast.
- Unknown ID failure MUST suggest `list` as recovery path.
- If inspected item has no ports, dependencies, conflicts, or patch-derived additions, output says none rather than silently omitting section.

#### `plan`

- First block names source: explicit selections or manifest-derived selections.
- Preview MUST show final resolved overlay set before file list or port list.
- Warnings for skipped overlays, compatibility exclusions, and conflicts MUST appear before diff/details that depend on final set.
- `--verbose` adds reasoning depth, not different planning outcome.
- `--diff` MUST state whether this is first write, update, or cleanup scenario before showing detailed file changes.

#### `hash`

- Human-readable output MUST show fingerprint plus hashed source summary.
- Auto-added dependencies MUST be called out near source summary, not buried after fingerprint.
- `--write` success state MUST name file path written.

### Interaction rules

- Help and footer hints MUST only recommend executable next commands valid for current source model.
- `plan` next-step guidance depends on context: use `init` for no canonical project state yet, `regen` for repo with canonical project file, `doctor` for verification, not invalid overlay-flag recipes.
- JSON mode suppresses prose-only recovery nudges inside payload, but command exits and stderr guidance still reflect same recovery path.
- Diff mode MUST preserve `custom/` framing as preserved user-owned area, not stale generated output.

### Terminology rules

- `category` names MUST match live user-facing taxonomy everywhere filters, tables, and browse headings appear.
- `preview` means no writes.
- `first write` means no comparable generated output exists yet.
- `fingerprint` means deterministic hash of resolved semantic inputs, not raw manifest bytes.

### QA scenario scripts

1. `list` default mode shows grouped catalog and includes live `messaging` category when catalog contains matching overlays.
2. `list --category messaging` returns human-readable rows or explicit empty-state message; never `[object Object]`.
3. `explain <bad-id>` fails with recovery path to discovery.
4. `plan --diff` in repo without generated output says first-write preview, not empty diff.
5. `plan` help/success hints never suggest unsupported `init --overlays ...` path.
6. `hash` human output names hashed source and auto-added dependency overlays before or beside fingerprint.

## Acceptance Criteria

| # | Criterion |
| --- | --- |
| AC-1 | `list` supports grouped default browse mode and filter-driven table mode, with JSON available in either path. |
| AC-2 | `list` filtered output renders human-readable port and dependency metadata rather than raw object stringification artifacts. |
| AC-3 | `explain` surfaces overlay metadata, files, patch-derived behavior, compose services, and preset-specific parameters/examples when applicable. |
| AC-4 | `plan` supports explicit and manifest inputs, auto-resolves dependencies, warns on stack incompatibility, and fails on unresolved conflicts. |
| AC-5 | `plan --verbose` exposes machine-readable and human-readable dependency reasoning including direct selections, dependency reasons, paths, and issues. |
| AC-6 | `plan --diff` reports file, overlay, and port changes versus existing generated output, preserves `custom/` awareness, and explains first-write scenarios when no generated output exists yet. |
| AC-7 | Preview and explain surfaces use executable next-step guidance aligned with ADR 001 project-file-first workflows; no help or success hint may point users to invalid flag combinations or unsupported commands. |
| AC-8 | `hash` computes deterministic fingerprint from explicit or manifest inputs, includes auto-added dependencies in human-readable output, states hashed source, and optionally writes hash file. |
| AC-9 | Unknown overlays or invalid manifest/stack inputs fail with targeted guidance rather than silent fallback. |
| AC-10 | Automated coverage exists for list filtering, explain content, plan verbose/diff behavior, and hash determinism. |
| AC-11 | Ownership is explicit: overlay registry owns semantic metadata, command modules own view composition, and shared discovery formatting owns category labels, source labels, and reusable next-step hints. |
| AC-12 | Category labels, source labels, and preview-result framing stay consistent across text, JSON-adjacent messaging, help copy, and docs updates. |

## Evidence Basis

- `tool/commands/list.ts` — grouped browse mode, filtered table, help footer.
- `tool/commands/explain.ts` — overlay/preset inspection, file and patch extraction, CLI examples.
- `tool/commands/plan.ts` — plan inputs, verbose reasoning, diff output, rerun hints, compatibility and conflict handling.
- `tool/commands/hash.ts` — fingerprint inputs, dependency resolution, output/write behavior.
- `tool/cli/args.ts` — command declarations and available flags.
- `tool/__tests__/commands.test.ts` — command output, JSON behavior, verbose traces, diff scenarios, hash determinism.
- `docs/discovery-commands.md`, `docs/presets.md`, `docs/presets-architecture.md`, `docs/README.md` — user-facing explanation and current drift.

## Evidence Confidence

**Medium**

Behavior strongly evidenced in code/tests. Lower confidence sits in long-term information architecture choices, not in current browse, inspect, preview, diff, or fingerprint behavior.

## Implementation-vs-Intent Mismatches

1. `list` default browse mode collapses `messaging` into "Database & Messaging" instead of exposing standalone messaging category used elsewhere in questionnaire and schema.
2. Filter help strings omit `messaging`, though code and schema distinguish it as real category.
3. `formatAsTable()` joins raw `overlay.ports` values, so rich port objects can render as `[object Object]`.
4. `plan` success hint emits `init --overlays ...`, but `init` parser does not currently accept `--overlays`; current hint is not valid executable guidance.
5. `docs/presets.md` and `docs/presets-architecture.md` still state presets are not directly available via CLI, but parser already supports `--preset` and `--preset-param`.

## Technical Design

### Architecture Ownership

- `tool/commands/list.ts` owns catalog browse and filter presentation only.
- `tool/commands/explain.ts` owns deep inspection view composition for one overlay or preset.
- `tool/commands/plan.ts` owns resolved preview graph, verbose dependency reasoning, diff classification, and no-write comparison against current generated output.
- `tool/commands/hash.ts` owns deterministic fingerprint generation and optional hash-file write only.
- Overlay registry metadata loaded through schema/questionnaire utilities remains semantic authority for category IDs, dependencies, stack support, tags, and raw ports.
- Shared human-readable labels, category titles, rerun hints, and port/dependency formatting should come from single discovery/presentation contract rather than each command inventing copy independently.
- `tool/cli/args.ts` owns CLI surface and help wiring, but command-specific recovery hints belong with command implementations or shared discovery helpers, not parser declarations.

### System Boundaries

- Discovery commands stay read-only except `hash --write`.
- `plan` may read manifest and existing generated output, but it does not mutate project state or remediate drift.
- `hash` remains separate automation boundary. `plan` preview semantics and `hash` fingerprint semantics must evolve without breaking scriptable fingerprint consumers.
- `custom/` stays user-owned preserved area in preview and diff framing; discovery commands may report it, not reinterpret it.

### Canonical Data Flow

1. CLI parser dispatches command and flags.
2. Command loads overlay registry and optional manifest/generated-output inputs.
3. Command resolves semantic selection set and dependency effects.
4. Command converts resolved semantics into command-specific view model:
   - catalog rows/groups for `list`
   - metadata sections for `explain`
   - preview graph, diff buckets, and reasoning trace for `plan`
   - canonical hash input object for `hash`
5. Command renders text or JSON from same resolved model so human and script surfaces cannot diverge semantically.
6. Optional next-step guidance derives from repository context and source model already known to command, never from hardcoded invalid flag recipes.

### Interfaces and Invariants

- Category IDs remain canonical machine values from overlay metadata. User-facing labels may group or title them, but filter names and explain output must not contradict machine taxonomy.
- `messaging` remains first-class taxonomy value across filters, docs, and outputs. Browse mode may visually group categories only if grouped heading still preserves discoverability of `messaging` as selectable category.
- `plan --verbose` changes explanation depth only, not overlay resolution outcome.
- `plan --diff` must classify first-write, update, and cleanup scenarios before showing detailed file changes.
- `hash` input normalization must resolve dependency additions before hashing and must hash semantic inputs, not raw manifest bytes.
- JSON and text outputs may differ in formatting, not in resolved overlays, categories, issues, or next-step meaning.

### Implementation Slices

1. Discovery taxonomy alignment: make category labels, filter help, and grouped browse headings consistent, including `messaging`.
2. Shared presentation helpers: normalize ports, dependency lists, source labels, and next-step hints once for all discovery commands.
3. `list` hardening: empty states, filtered table formatting, no raw object stringification.
4. `explain` hardening: stable section order, explicit `none` states, preset-specific parameter/examples contract.
5. `plan` hardening: repository-context-aware next-step routing, verbose reasoning parity, first-write diff framing, preserved `custom/` messaging.
6. `hash` hardening: source summary, auto-added dependency visibility, stable optional file-write contract.

### Risk Notes

- Taxonomy drift likely if category titles and filter enums stay duplicated across schema, command help, and docs.
- Help/footer hints can rot faster than command behavior; invalid runnable examples are high-trust failures.
- `plan` and `hash` share dependency-resolution concepts but currently own separate logic paths; script-facing determinism risk if they diverge.
- Diff output can under-report user-owned `custom/` semantics if file buckets classify only generated files.

### Test Plan

- `list` tests for grouped default browse, `messaging` discoverability, empty filter state, JSON parity, and port/dependency formatting.
- `explain` tests for overlay vs preset framing, explicit empty sections, files/patch/services visibility, and unknown-ID recovery guidance.
- `plan` tests for explicit vs manifest sources, verbose reasoning parity, conflict/skip handling, first-write diff framing, update diff framing, and next-step routing based on repo context.
- `hash` tests for deterministic output, dependency auto-add visibility, manifest vs explicit source summaries, and `--write` path reporting.
- Regression tests that text and JSON modes share same resolved overlay set and issue classification.

## Architecture Decision Impact

Aligned with ADR 001. `docs/foundation.md` absent; no additional foundation authority to reconcile.

- Governing ADR: `docs/adr/adr001-project-file-first-replay-and-regeneration.md`
- No ADR amendment needed for this scope.

## Open Questions

- None blocking for implementation-safe framing. Future consolidation of preview and verification surfaces remains optional roadmap work, not current boundary decision.

## Routing Decision

**PM → Developer**

Reason: taxonomy authority, command boundaries, invariants, slices, and validation surface now locked without ADR change.
