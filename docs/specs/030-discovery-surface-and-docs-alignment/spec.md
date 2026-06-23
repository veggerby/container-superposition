# Feature Specification: Discovery Surface and Canonical Docs Alignment

**Spec ID**: `030-discovery-surface-and-docs-alignment`
**Taxonomy**: `CLI-UX, DOCS-GUIDE`
**Created**: 2026-06-22
**Author**: Workflow Orchestrator
**Status**: Draft
**Input**: Opportunity backlog items 1, 3, and 5 from `docs/opportunities/README.md` — fix discovery surface gaps, align docs/help/examples to one canonical model, and make preview-first planning workflow easy to find.

---

## Request Classification

Existing behavior and repo evidence clear enough for direct spec authoring. No blocker user questions found.

This spec intentionally bundles three related backlog items because they share same user problem: users cannot reliably discover current overlays and safest current workflow from first-party surfaces.

- Opportunity 1: Discovery surface clarity and docs alignment
- Opportunity 3: Command and doc model simplification sweep
- Opportunity 5: Power-user planning workflow visibility

## Problem Statement

Current product surfaces disagree with current product model.

Observed repo evidence:

- `docs/opportunities/README.md` records that default `list` output omits `messaging` category despite live messaging overlays.
- Same opportunity notes filtered `list --category ...` tables can render port values as `[object Object]`.
- `README.md`, `tool/README.md`, `docs/quick-reference.md`, `docs/examples.md`, `docs/team-workflow.md`, and `docs/messaging-quick-start.md` still teach deprecated category-centric config, stale CLI flags, or manifest-first workflows.
- `plan`, `--verbose`, and `plan --diff` exist but are not consistently presented as safe preview path before writing files.

Result: first-run users learn wrong config shape, power users miss safer preview tools, and discovery trust drops because catalog/docs/help disagree.

## User Goals

### First-time user

- Find current overlays through `list` output without missing live categories.
- Copy examples that match current canonical `superposition.yml` model.
- Understand safe path: preview first, then generate.

### Returning user / team maintainer

- See one consistent mental model across README, docs, examples, and command help.
- Use `superposition.yml` with flat `overlays:` as default authoring pattern.
- Avoid deprecated flags/examples that create cleanup or migration work.

### Power user

- Discover `plan`, `plan --verbose`, and `plan --diff` quickly.
- Compare intended changes before `init`/`regen` writes output.

## Scope

### In scope

- Fix discovery output gaps in `list` for current overlay categories and port rendering.
- Rewrite first-party docs/help/examples to teach one canonical config model.
- Promote preview-first workflow in top-level docs and quick-reference surfaces.
- Align messaging examples with current command and config model.
- Define deprecation cleanup for stale examples and stale terminology.

### Out of scope

- Adding new overlays, presets, or categories.
- Redesigning preset system itself.
- New planning engine behavior beyond discoverability and wording.
- External/private catalog support.

## Must Preserve

- `superposition.yml` remains canonical generation input.
- Advanced users can still specify overlays directly without presets.
- Existing `plan`, `plan --verbose`, and `plan --diff` semantics remain unchanged unless another spec changes them.

## Proposed Behavior

### 1. Discovery surfaces reflect live catalog

Default overlay discovery output MUST include every live top-level category intended for user selection, including `messaging`.

Category-filtered tabular output MUST render ports and similar structured fields as human-readable values, never raw object stringification like `[object Object]`.

### 2. Canonical docs model becomes flat `overlays:` + project-file-first

Primary docs and examples MUST teach:

- project-file-first workflow
- `superposition.yml` / `.superposition.yml` canonical input
- flat `overlays:` selection as default explicit authoring model
- `preset` as optional shortcut, not alternate configuration architecture

Docs MUST stop teaching deprecated category-centric top-level fields like `language:` / `database:` as primary model except where explicitly documented for backward compatibility or migration context.

### 3. Preview-first workflow becomes explicit

Top-level onboarding docs MUST present preview path before generation:

1. discover overlays/presets
2. preview with `plan`
3. inspect reasons with `--verbose`
4. inspect diff when changing existing config with `plan --diff`
5. run `init` or `regen`

### 4. Stale command examples removed or reframed

Docs/help/examples MUST stop presenting stale patterns as current guidance, including:

- `--postgres` style examples when canonical examples should use current overlay/config forms
- `cs list --presets` when current discovery path differs
- `_serviceOrder` references in end-user docs
- manifest-first team workflow examples that center `superposition.json` instead of project file

Migration-only docs may still mention old patterns when clearly marked as legacy or transition-only.

## UX Contract

### Information hierarchy

- README quickstart leads with `init`, canonical `superposition.yml`, `plan`, `regen`.
- Quick reference and examples mirror same order.
- Messaging guide uses same command vocabulary and config model as README.

### Copy contract

- Say `superposition.yml` is canonical input.
- Say flat `overlays:` is preferred explicit selection model.
- Present presets as guided shortcut for common jobs, not hidden expert feature.
- Present `plan` as preview, `plan --verbose` as explanation, `plan --diff` as change review.

### Error/edge presentation

- Discovery output never exposes implementation formatting artifacts like `[object Object]`.
- If category filtering omits results, wording must make absence explicit rather than silently hiding live category families.

## Acceptance Criteria

| # | Criterion |
|---|---|
| AC-1 | Default discovery output includes all live user-facing overlay categories, including `messaging`, when applicable to current catalog. |
| AC-2 | Category-filtered discovery tables render port metadata in human-readable form and never display `[object Object]`. |
| AC-3 | `README.md`, `tool/README.md`, `docs/quick-reference.md`, `docs/examples.md`, `docs/team-workflow.md`, and `docs/messaging-quick-start.md` teach current canonical workflow rather than deprecated manifest-first or category-centric primary guidance. |
| AC-4 | Primary examples use `superposition.yml` plus flat `overlays:` as preferred explicit selection model, with any legacy syntax clearly labeled as migration/compatibility-only if retained. |
| AC-5 | First-run docs surface `plan`, `plan --verbose`, and `plan --diff` as preview-first workflow before file generation or regeneration. |
| AC-6 | End-user docs do not present stale flags, stale examples, or implementation internals (`_serviceOrder`) as current recommended workflow. |
| AC-7 | Changes preserve current command semantics for `init`, `regen`, and `plan`; this spec only changes discovery rendering and user guidance, not planning/generation behavior. |
| AC-8 | Automated coverage exists for any CLI rendering bug fixed under this spec, including category presence and human-readable field rendering. |

## ADR Impact

Aligned.

No new architecture decision required. Work stays within existing project-file-first product direction.

## Open Questions

None blocking spec completion.

## Routing Decision

**PM → Developer**

Reason: UX contract and scope boundaries now explicit; no further architecture pass required.
