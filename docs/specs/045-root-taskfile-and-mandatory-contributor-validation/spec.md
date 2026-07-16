---
spec: '045-root-taskfile-and-mandatory-contributor-validation'
title: 'Root Taskfile and Mandatory Contributor Validation Run'
status: 'Final'
qa_status: ''
priority: 'P1'
owner: 'pm'
product_approval: 'approved'
architecture_review: 'not-needed'
ux_review: 'not-needed'
created: '2026-08-20'
updated: '2026-08-20'
related_adrs:
    - 'docs/adr/adr001-project-file-first-replay-and-regeneration.md'
related_foundation:
    - 'docs/foundation.md'
related_specs:
    - 'docs/specs/039-project-local-contributor-skills-initiative/spec.md'
normative_references:
    - 'AGENTS.md'
    - 'docs/definition-of-done.md'
    - 'CONTRIBUTING.md'
    - 'package.json'
---

# Root Taskfile and Mandatory Contributor Validation Run

**Spec**: `045-root-taskfile-and-mandatory-contributor-validation`
**Status**: Final
**Created**: 2026-08-20
**Priority**: P1
**Product Approval**: approved
**Architecture Review**: not-needed
**UX Review**: not-needed

## Description

Add one root Taskfile that exposes the repository's common contributor commands through `task`, and update contributor authority so the required pre-completion validation flow explicitly includes the formatter autofix step that CI currently depends on.

## Evidence

- `package.json` — the repo already defines the canonical underlying npm scripts (`lint`, `lint:fix`, `test`, `build`, `docs:generate`, `schema:generate`, `init`).
- `AGENTS.md` — contributor authority already says `npm run lint:fix` then `npm run lint`, but the workflow is easy to skip when contributors run commands ad hoc.
- `docs/definition-of-done.md` — current DoD requires `lint:fix` and `lint`, but does not give contributors one canonical aggregate run target.
- `CONTRIBUTING.md` — current contributor guidance is missing a repo-level task-runner entrypoint for routine validation and still leans on scattered direct command examples.
- `.github/workflows/generate-docs.yml` and `.github/workflows/validate-overlays.yml` — CI runs `npm run lint`, so locally skipped autofix work can still surface as CI failures.
- `docs/overlays.md` and `overlays/task/README.md` — the catalog already documents Taskfile tooling, but this repository itself does not yet expose a root Taskfile for maintainers.

## Problem Statement

Contributors have the right underlying npm scripts, but no single repository-native task entrypoint for routine development and validation. The most expensive miss is skipping `npm run lint:fix` before `npm run lint`, which leaves formatting drift for CI to catch later. The request is to make the common local workflow more obvious and to tighten contributor authority so the required validation run is unambiguous before work is considered complete.

## User Goals / Jobs To Be Done

- As a contributor, I want one root `task` entrypoint for common repository commands so I do not have to remember the exact npm script names.
- As a contributor, I want a clearly named combined validation task that runs the required formatter autofix step before lint checks.
- As a maintainer, I want repo guidance to make this validation flow mandatory before completion so formatting-only CI failures become less likely.

## Success Signals

- Contributors can run common repo commands through one root Taskfile without changing the underlying npm-script contract.
- The documented pre-completion validation path explicitly includes `lint:fix` before `lint`.
- Contributor guidance and the Taskfile use the same command names for the recommended validation flow.

## Confidence

- Overall confidence: high
- Confidence notes: current command inventory and contributor guidance are directly evidenced; the main remaining choice is keeping the Taskfile minimal and aligned with existing npm scripts.

## Goals

- Add a root Taskfile that wraps common contributor npm scripts.
- Include explicit Taskfile targets for `lint:fix` and `docs:generate`.
- Include combined validation targets for common contributor completion flows.
- Update contributor authority so the required validation run is mandatory before completion.

## Non-Goals

- Replacing npm scripts as the source-of-truth command implementation.
- Changing CI workflows to invoke `task` instead of existing npm commands in this slice.
- Adding new build, test, or generation behavior beyond task aliases and guidance alignment.
- Broad documentation cleanup outside contributor-command and completion-guidance surfaces.

## Authority and References

This spec must align with:

- `docs/foundation.md`
- `docs/adr/adr001-project-file-first-replay-and-regeneration.md`
- `AGENTS.md`
- `docs/definition-of-done.md`
- `CONTRIBUTING.md`
- `package.json`

## Design

### Product / Behavior

Implementation must add one root Taskfile (for `task`) that exposes the repository's routine contributor commands as thin wrappers around the existing npm scripts. The Taskfile is an ergonomics layer, not a second source of command logic.

The root Taskfile must include, at minimum:

- direct tasks for the common single-step contributor commands already defined in `package.json`
- an explicit `lint:fix` task
- an explicit `docs:generate` task
- one or more clearly named combined validation tasks that contributors can use before handoff/completion

The recommended combined validation flow must run `lint:fix` before any lint check that CI also enforces.

### Technical Notes

- Prefer `Taskfile.yml` at repository root unless implementation finds a stronger repo-local reason to use another Task-supported root filename.
- Each task should delegate to the existing npm script or existing CLI command rather than duplicating shell logic.
- Combination tasks should compose existing single-purpose tasks instead of re-encoding the commands inline wherever practical.
- The minimal required contributor surface is command wrapping plus guidance alignment; avoid adding speculative convenience tasks that are not already justified by current workflows.

### Contributor Guidance Contract

The same change must update contributor authority so completion guidance points to the Taskfile-backed validation route and explicitly states that skipping the autofix step is not acceptable when handing work off.

At minimum, implementation must update:

- `AGENTS.md`
- `docs/definition-of-done.md`
- `CONTRIBUTING.md`

Those surfaces must agree on:

1. which Taskfile command(s) are the recommended contributor validation entrypoint
2. that the required validation flow includes `lint:fix` before `lint`
3. when contributors must additionally run generated-doc/schema/regeneration checks based on what changed

## Constraints

- Preserve `package.json` scripts as the canonical underlying command definitions.
- Keep guidance aligned with current DoD triggers for overlays, schema, regen, and doctor.
- Do not weaken any existing quality gates while adding the Taskfile abstraction.
- Keep scope limited to contributor workflow ergonomics and authority alignment.

## Preferences / Tradeoffs

- Prefer a small, obvious task inventory over a large catalog of aliases.
- Prefer combined validation tasks named by intent (for example, default validation vs generated-artifact validation) rather than many near-duplicate wrappers.
- Prefer guidance that tells contributors what is mandatory before completion, not merely what is convenient.

## Risks

- If the Taskfile names drift from guidance, contributors will have two competing workflows instead of one.
- If combined tasks omit regeneration-triggered work, contributors may treat the convenience command as sufficient when it is not.
- If implementation adds too many aliases, the new entrypoint will be harder to trust and maintain.

## Architecture Decision Impact

- aligned with current ADRs/foundation

## Acceptance Criteria

- [x] A root Taskfile is added and is discoverable by the standard `task` CLI from repository root.
- [x] The Taskfile provides thin-wrapper tasks for the common contributor commands already backed by existing npm scripts, explicitly including `lint:fix` and `docs:generate`.
- [x] The Taskfile provides at least one combined validation task intended for pre-completion use, and that task runs `lint:fix` before `lint`.
- [x] Combined validation coverage includes a documented path for generated-artifact work so contributors know when `docs:generate`, `schema:generate`, `init -- regen`, and `init -- doctor` are additionally required.
- [x] `AGENTS.md`, `docs/definition-of-done.md`, and `CONTRIBUTING.md` are updated in the same change to reference the Taskfile-backed validation workflow and to make the required pre-completion validation run mandatory.
- [x] Existing npm script behavior and CI command contracts remain unchanged; the Taskfile adds contributor ergonomics rather than replacing current automation.
- [x] All new or changed behavior is covered by automated tests at the appropriate level.
- [x] Documentation and workflow artifacts are updated to match the implemented or reviewed state.

## Out of Scope

- Migrating project CI from npm commands to `task`.
- Changing overlay-authoring rules or generated-artifact semantics.
- Introducing a new contributor task runner beyond the requested root Taskfile.

## Assumptions

- The repository already has access to the `task` binary in the standard maintainer/devcontainer workflow, so this change is about repo-local command definitions rather than provisioning the tool itself.
- The mandatory validation entrypoint can remain a wrapper over existing npm commands without changing their semantics.

## Definition of Done

> Filled in progressively by each role. QA sets `Status: Final` only after verifying all gates.
> Full standards in `docs/definition-of-done.md`.

### Code

- [ ] No lint errors
- [ ] No type errors
- [ ] No debug or uncommitted temporary code
- [ ] Follows project conventions

### Tests

- [ ] Unit tests cover new pure logic
- [ ] Integration tests cover system boundaries
- [ ] All tests pass
- [ ] No unjustified skipped tests
- [ ] Failure and edge cases covered

### Documentation

- [ ] Public interfaces documented
- [ ] All new documentation in Markdown
- [ ] All diagrams in Mermaid
- [ ] README updated if behavior or setup changed
- [ ] Architecture docs updated if ownership or boundaries changed

### Changelog

- [ ] `CHANGELOG.md` updated under `[Unreleased]` for user-visible changes

### Workflow artifacts

- [ ] Acceptance criteria checked off (met only — unmet left unchecked with explanation)
- [ ] `## Implementation Notes` written
- [ ] Spec status and index synchronized
- [ ] QA feedback rows marked `Done` where applicable

### Architecture

- [ ] No ADR or foundation rules silently violated
- [ ] ADR created or amended if a standing decision was made or changed

### QA verification

- [ ] All above gates verified independently
- [ ] Acceptance criteria classified: MET / CLAIMED BUT FAILED / OPEN / UNCHECKED
- [ ] No regressions introduced
- [ ] Spec set to `Final`

## Routing Decision

**PM → Developer**

The requested outcome is implementation-ready. No additional UX or ADR pass is needed before development; implementation should keep the Taskfile thin, preserve npm-script authority, and update contributor guidance in the same change so the mandatory validation flow is explicit and consistent.

## Implementation Notes

Implemented with a minimal wrapper-only `Taskfile.yml` at repo root. The task inventory stays small and delegates to existing npm scripts or `npm run init -- ...` CLI flows without changing CI contracts.

Shipped contributor entrypoints:

- `task validate` — mandatory pre-completion flow; runs `lint:fix` → `lint` → `test`
- `task validate:generated` — broader generated-artifact flow; runs `task validate` plus `docs:generate`, `schema:generate`, `regen`, and `doctor`

Documentation authority was aligned in the same change across `AGENTS.md`, `docs/definition-of-done.md`, and `CONTRIBUTING.md`, including explicit trigger guidance for when generated-artifact commands are additionally required.

Automated coverage was added in `tool/__tests__/taskfile.test.ts` to verify the root Taskfile exists, keeps wrapper tasks thin, and preserves `lint:fix` before `lint` in the mandatory validation flow.
