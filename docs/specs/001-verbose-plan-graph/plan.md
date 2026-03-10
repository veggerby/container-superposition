# Implementation Plan: Verbose Plan Graph

**Branch**: `001-verbose-plan-graph` | **Date**: 2026-03-10 | **Spec**: [spec.md](/workspaces/container-superposition/docs/specs/001-verbose-plan-graph/spec.md)
**Input**: Feature specification from `/docs/specs/001-verbose-plan-graph/spec.md`

## Summary

Extend the `plan` command so `--verbose` explains dependency resolution for both direct overlay selection and manifest-driven planning from an existing `superposition.json`. The design must keep one shared resolution and explanation model so text output, JSON output, and manifest-based workflows stay consistent.

## Technical Context

**Language/Version**: TypeScript 5.3.3 on Node.js 20+  
**Primary Dependencies**: Commander, chalk, boxen, js-yaml, ora, Inquirer  
**Storage**: Filesystem-based overlay manifests, project `superposition.json` manifests, templates, and generated devcontainer artifacts  
**Testing**: Vitest unit and command tests, shell-based smoke tests, TypeScript compile checks  
**Target Platform**: Node.js CLI on Linux, macOS, and Windows developer environments  
**Project Type**: CLI scaffolding tool  
**Performance Goals**: Preserve the current fast interactive feel of the `plan` command for typical overlay selections and avoid introducing noticeable delay when verbose explanation is enabled  
**Constraints**: Preserve current concise output unless `--verbose` is requested; preserve source/dist path compatibility patterns; keep manifest-driven and overlay-list-driven planning aligned to one resolved overlay set; keep JSON and text views consistent  
**Scale/Scope**: Single command enhancement affecting `scripts/init.ts`, `tool/commands/plan.ts`, command tests, user-facing docs, and manifest-driven planning behavior

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design and before implementation._

- [x] Spec exists at `docs/specs/001-verbose-plan-graph/spec.md`.
- [x] Spec is committed and reviewed before implementation tasks or code begin.
- [x] Plan scope, compatibility impact, and complexity notes match the approved spec.
- [x] Verification scope covers tests, smoke checks, and documentation updates needed for the change.
- [x] User-visible changes include documentation updates and an `[Unreleased]` `CHANGELOG.md` entry.

## Project Structure

### Documentation (this feature)

```text
docs/specs/001-verbose-plan-graph/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── plan-verbose-output.md
└── tasks.md
```

### Source Code (repository root)

```text
scripts/
└── init.ts

tool/
├── commands/
│   └── plan.ts
├── __tests__/
│   └── commands.test.ts
├── schema/
└── utils/

docs/
├── discovery-commands.md
└── specs/

README.md
CHANGELOG.md
```

**Structure Decision**: Keep the existing CLI structure centered on `scripts/init.ts` for command options and manifest-loading hooks, and `tool/commands/plan.ts` for shared planning logic. Keep verification concentrated in `tool/__tests__/commands.test.ts`, with documentation updates in `README.md` and `docs/discovery-commands.md`.

## Phase 0: Research

### Research Goals

- Confirm the simplest way to reuse the verbose explanation model for manifest-driven planning.
- Decide how manifest-loaded overlays should appear in explanation data relative to directly requested overlays.
- Confirm failure behavior for missing or invalid manifests in verbose mode.

### Research Outputs

- [research.md](/workspaces/container-superposition/docs/specs/001-verbose-plan-graph/research.md)

## Phase 1: Design

### Data Model

- [data-model.md](/workspaces/container-superposition/docs/specs/001-verbose-plan-graph/data-model.md)

### Contracts

- [plan-verbose-output.md](/workspaces/container-superposition/docs/specs/001-verbose-plan-graph/contracts/plan-verbose-output.md)

### Quickstart

- [quickstart.md](/workspaces/container-superposition/docs/specs/001-verbose-plan-graph/quickstart.md)

## Implementation Approach

1. Extend `plan` input handling so it can build the same verbose explanation model whether overlays come from explicit flags or an existing manifest.
2. Reuse one dependency-resolution and explanation path inside `tool/commands/plan.ts` for concise, verbose, JSON, and manifest-driven planning.
3. Define manifest-aware explanation semantics so manifest-defined overlays remain distinguishable from auto-added dependencies without inventing a separate output format.
4. Add regression tests for manifest-driven verbose text output, verbose JSON output, and manifest failure paths.
5. Update README, discovery docs, quickstart guidance, and changelog entries to document manifest-driven verbose planning.

## Verification Strategy

- Add or update command tests in `tool/__tests__/commands.test.ts` for:
    - verbose text output from direct overlay selection
    - verbose text output from an existing manifest
    - verbose JSON output from an existing manifest
    - manifest failure behavior when the manifest is missing, invalid, or contains invalid overlays
    - non-verbose output remaining unchanged
- Run `npm test` for automated coverage.
- Run `npm run lint` to verify TypeScript and formatting constraints.
- Perform targeted manual validation using the commands documented in `quickstart.md`, including manifest-driven scenarios.

## Post-Design Constitution Check

- [x] Design still preserves spec-first workflow and traces directly to the approved spec.
- [x] The planned change preserves overlay contract integrity by extending the existing planning model rather than creating a parallel manifest-only explanation path.
- [x] Verification remains proportional to risk: command tests plus documentation updates are planned before merge.
- [x] Documentation synchronization is explicitly included: `README.md`, `docs/discovery-commands.md`, `quickstart.md`, and `CHANGELOG.md`.
- [x] Simplicity and compatibility remain intact: verbose mode stays opt-in and manifest-driven planning uses the same reasoning model as direct selection.

## Complexity Tracking

No constitution violations require a design exception.
