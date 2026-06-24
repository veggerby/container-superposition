# Feature Specification: Preset-Led Onboarding for Common Jobs-to-be-Done

**Spec ID**: `031-preset-led-onboarding-for-common-jobs`
**Taxonomy**: `CLI-UX, DOCS-GUIDE`
**Created**: 2026-06-22
**Author**: Workflow Orchestrator
**Status**: Draft
**Input**: Opportunity backlog item 4 from `docs/opportunities/README.md` — steer first-run users toward opinionated presets for common jobs-to-be-done instead of forcing large-catalog selection first.

---

## Request Classification

User-facing onboarding problem. Existing repo evidence sufficient for PM+UX finalization without blocker discovery round.

## Problem Statement

Current product has enough overlays and options to create choice overload for first-run users.

Observed repo evidence:

- Opportunity backlog records 94 catalog items and 13 existing presets.
- `docs/presets.md` documents strong preset value, but README and some entry surfaces still emphasize manual composability first.
- Opportunity notes preset-first guidance appears secondary in some entrypoints.

Result: users face catalog breadth before job-oriented starting points, increasing onboarding friction and failed self-service setup.

## User Goals

### First-time user

- Start from common goal like web API, microservice, docs site, or full-stack app.
- Get sane defaults without understanding full overlay catalog first.
- Still retain option to customize after preset selection.

### Experienced user

- Keep direct overlay selection available.
- Understand when preset path is fastest and when manual overlay path is better.

### Team maintainer / docs author

- Recommend consistent onboarding path across README, examples, and preset docs.
- Reduce cognitive load without hiding composability power.

## Scope

### In scope

- Make preset-first onboarding explicit in first-run docs and interactive guidance where current product already supports it.
- Define jobs-to-be-done framing for preset entrypoints.
- Clarify customization path after selecting preset.
- Define fallback path for users whose need does not fit preset.

### Out of scope

- Creating brand-new preset execution engine.
- Removing direct overlay selection.
- Private/versioned preset catalogs.
- Guaranteeing every possible stack has preset coverage in this slice.

## Must Preserve

- Direct overlay-driven workflow remains supported.
- Presets remain optional shortcut, not mandatory abstraction.
- Users can still add/remove overlays after preset expansion when current product supports it.

## Proposed Behavior

### 1. Presets become recommended first-run path for common jobs

First-run surfaces SHOULD recommend presets first for users whose need matches common jobs:

- web API
- microservice
- documentation site
- full-stack application
- other currently supported preset scenarios documented by product

### 2. Manual overlay path remains visible as advanced/flexible path

Docs and interactive copy MUST make clear that users can:

- start from preset for speed
- or start from direct overlay selection for bespoke stacks

Neither path should imply other path is deprecated.

### 3. Preset flow explains customization handoff

When preset is recommended, docs and onboarding copy MUST also explain that user can customize after preset selection by:

- choosing preset options (`presetChoices`) where applicable
- adding overlays not included in preset
- removing non-required overlays when supported by current flow

### 4. Job-based docs/examples point to preset equivalents

Docs/examples for common stacks SHOULD show:

- preset-first path
- equivalent explicit overlay path when useful for transparency or automation

This keeps onboarding approachable without hiding resulting stack composition.

## UX Contract

### Entry decision

User should quickly answer: “Does one of these common outcomes match my project?”

If yes:

- choose preset path

If no:

- choose direct overlay path

### Copy contract

- Present presets as fastest way to get started.
- Present overlays as flexible composition layer.
- Avoid language implying presets are toy mode or overlays are only expert path.
- Use job-focused labels before implementation-focused labels when introducing preset choices.

### State/navigation contract

- First-run docs link from generic getting-started surfaces to preset guide.
- Preset guide links back to explicit overlay/config equivalents.
- Customization step appears after preset recommendation, not hidden in later deep docs.

## Acceptance Criteria

| #    | Criterion                                                                                                                                                                              |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | First-run documentation recommends presets as default starting path for common jobs-to-be-done while preserving direct overlay selection as supported alternative.                     |
| AC-2 | README and related getting-started surfaces point users to preset-oriented entry guidance when their use case matches a common preset.                                                 |
| AC-3 | `docs/presets.md` and linked onboarding surfaces explain how users customize after selecting a preset, including `presetChoices` and overlay-level additions/removals where supported. |
| AC-4 | At least core common scenarios documented by current product have job-oriented preset guidance and, where useful, equivalent explicit overlay/config examples for transparency.        |
| AC-5 | Guidance clearly tells users what to do when no preset fits: use flat `overlays:` or direct interactive overlay selection.                                                             |
| AC-6 | This spec does not remove or hide advanced composability; it changes recommendation order and explanatory copy only.                                                                   |
| AC-7 | If interactive questionnaire copy or menu ordering changes under this spec, tests or snapshots cover new recommendation wording/order.                                                 |

## ADR Impact

Aligned.

No new ADR required. Product behavior stays within current preset architecture.

## Assumptions

1. Existing preset catalog is sufficient for first ship of preset-led onboarding improvements.
2. Work may adjust docs and current questionnaire wording/order, but not preset expansion semantics.

## Routing Decision

**PM → Developer**

Reason: UX contract, scope, and preservation rules explicit. No further architecture discovery required.
