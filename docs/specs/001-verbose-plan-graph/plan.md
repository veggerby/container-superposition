# Implementation Plan: Verbose Plan Graph

**Branch**: `001-verbose-plan-graph` | **Date**: 2026-03-10 | **Spec**: [spec.md](/workspaces/container-superposition/docs/specs/001-verbose-plan-graph/spec.md)
**Input**: Feature specification from `/docs/specs/001-verbose-plan-graph/spec.md`

## Summary

Extend the `plan` command with an opt-in verbose mode that narrates dependency resolution without changing the resolved overlay set, default text output, or conflict behavior. The design attaches inclusion-reason data to the existing dependency resolver so the same reasoning can be rendered in both human-readable and JSON outputs.

## Technical Context

**Language/Version**: TypeScript 5.3.3 on Node.js 20+  
**Primary Dependencies**: Commander, chalk, boxen, js-yaml, ora, Inquirer  
**Storage**: Filesystem-based overlay manifests, templates, and generated devcontainer artifacts  
**Testing**: Vitest unit/command tests, shell-based smoke tests, TypeScript compile checks  
**Target Platform**: Node.js CLI on Linux/macOS/Windows developer environments  
**Project Type**: CLI scaffolding tool  
**Performance Goals**: Keep `plan` output generation effectively instantaneous for typical overlay sets and add explanation data without materially changing perceived CLI responsiveness  
**Constraints**: Preserve current concise output unless `--verbose` is requested; preserve source/dist path compatibility patterns; keep JSON and text views consistent with one dependency-resolution result  
**Scale/Scope**: Single command enhancement affecting `scripts/init.ts`, `tool/commands/plan.ts`, command tests, and user-facing docs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design and before implementation.*

- [x] Spec exists at `docs/specs/001-verbose-plan-graph/spec.md`.
- [ ] Spec is committed and reviewed before implementation tasks or code begin.
  Planning may proceed because this phase only produces design documentation. Implementation remains blocked until the spec is committed and reviewed.
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
├── questionnaire/
├── schema/
└── utils/

docs/
├── discovery-commands.md
└── specs/

README.md
CHANGELOG.md
```

**Structure Decision**: Use the existing CLI command structure centered on `scripts/init.ts` for option registration and `tool/commands/plan.ts` for planning logic, with regression coverage in `tool/__tests__/commands.test.ts` and user guidance in `README.md` plus `docs/discovery-commands.md`.

## Phase 0: Research

### Research Goals

- Confirm the least-complex way to expose inclusion reasons without creating a second dependency-resolution algorithm.
- Decide how verbose text and JSON output should represent direct selections, required dependencies, transitive chains, and multi-parent dependencies.
- Confirm documentation and verification expectations for a user-visible CLI option.

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

1. Extend CLI option registration for `plan` to accept `--verbose` without altering existing defaults.
2. Refactor dependency resolution in `tool/commands/plan.ts` so it emits explanation metadata alongside `resolved` and `autoAdded`.
3. Render verbose explanation sections only when requested in text output.
4. Include structured inclusion-reason data in JSON output when `--verbose` is requested.
5. Add regression tests for direct selections, required dependencies, transitive dependencies, duplicate-parent dependencies, and non-verbose backward compatibility.
6. Update README, discovery docs, and `CHANGELOG.md` to document the new mode and its intent.

## Verification Strategy

- Add or update command tests in `tool/__tests__/commands.test.ts` for:
  - verbose text output showing direct and dependency-driven reasons
  - verbose JSON output containing structured inclusion reasons
  - multi-parent dependency explanation without duplicate final overlay entries
  - non-verbose output remaining unchanged
- Run `npm test` for automated coverage.
- Run `npm run lint` to verify TypeScript and formatting constraints.
- Perform targeted manual validation with representative commands from `quickstart.md`.

## Post-Design Constitution Check

- [x] Design still preserves spec-first workflow; no implementation work is authorized until the spec is committed and reviewed.
- [x] The planned change preserves overlay contract integrity by reusing the existing dependency-resolution path for concise and verbose outputs.
- [x] Verification remains proportional to risk: command tests plus documentation updates are planned before merge.
- [x] Documentation synchronization is explicitly included: `README.md`, `docs/discovery-commands.md`, and `CHANGELOG.md`.
- [x] Simplicity and compatibility remain intact: verbose mode is opt-in and does not change default behavior or path-resolution patterns.

## Complexity Tracking

No constitution violations require a design exception. The only open governance gate is spec commit/review, which blocks implementation rather than planning.
