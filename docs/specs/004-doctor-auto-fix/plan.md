# Implementation Plan: Doctor Auto-Fix

**Branch**: `004-doctor-auto-fix` | **Date**: 2026-03-17 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `docs/specs/004-doctor-auto-fix/spec.md`

## Summary

Implement a real `doctor --fix` flow for safe, deterministic environment repair. The design adds a remediation registry to `tool/commands/doctor.ts`, defines an explicit fix outcome model for terminal and JSON consumers, and scopes automatic repair to supported issue classes such as stale manifest metadata, derived devcontainer drift, incompatible Node runtimes when a supported version manager is available, and supported container-tooling drift when the host exposes a known safe repair command.

## Technical Context

**Language/Version**: TypeScript 5.3.3 on Node.js 20+  
**Primary Dependencies**: Commander, chalk, boxen, js-yaml, ora, Inquirer, Node.js standard library (`fs`, `path`, `child_process`, `net`)  
**Storage**: Filesystem-based `superposition.json` manifests, generated `.devcontainer/` artifacts, overlay manifests, and temporary backup/rollback files  
**Testing**: Vitest unit and command tests, shell-based smoke tests where workflow scripts are affected, TypeScript compile checks, targeted manual validation of host/tooling repair flows  
**Target Platform**: Node.js CLI on Linux, macOS, and Windows developer environments, with some auto-fixes gated on supported host tools such as Node version managers or known Docker startup/install commands  
**Project Type**: CLI scaffolding tool  
**Performance Goals**: Preserve current fast diagnostics for `doctor`; no-op or already-compliant `doctor --fix` runs should remain near current command latency, and remediation should re-run only the checks needed to produce a deterministic final summary  
**Constraints**: Preserve existing `doctor` diagnostics when `--fix` is not requested; only execute explicitly safe unattended remediations; avoid partial metadata writes through backup plus atomic file replacement where possible; keep source/dist path handling compatible; support machine-readable outcomes for CI and scripted runs  
**Scale/Scope**: Single command enhancement centered on `tool/commands/doctor.ts`, with supporting reuse of manifest migration and generation helpers, command tests, quick-reference/README documentation, and changelog updates

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design and before implementation._

- [x] Spec exists at `docs/specs/004-doctor-auto-fix/spec.md`.
- [x] Spec is committed and reviewed before implementation tasks or code begin.
- [x] Plan scope, compatibility impact, and complexity notes match the approved spec.
- [x] Verification scope covers tests, smoke checks, and documentation updates needed for the change.
- [x] User-visible changes include documentation updates and an `[Unreleased]` `CHANGELOG.md` entry.

## Project Structure

### Documentation (this feature)

```text
docs/specs/004-doctor-auto-fix/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── doctor-fix.md
└── tasks.md
```

### Source Code (repository root)

```text
scripts/
└── init.ts

tool/
├── commands/
│   └── doctor.ts
├── questionnaire/
│   └── composer.ts
├── schema/
│   ├── manifest-migrations.ts
│   └── types.ts
├── utils/
│   └── backup.ts
└── __tests__/
    └── commands.test.ts

docs/
├── quick-reference.md
├── overlay-imports.md
└── publishing.md

README.md
CHANGELOG.md
```

**Structure Decision**: Keep CLI option wiring in `scripts/init.ts` and concentrate remediation behavior in `tool/commands/doctor.ts`. Reuse existing manifest migration and generation helpers instead of inventing a parallel fix engine, and keep verification primarily in `tool/__tests__/commands.test.ts` with documentation updates in `README.md`, `docs/quick-reference.md`, and doctor-adjacent docs that already reference the command.

## Phase 0: Research

### Research Goals

- Define the initial auto-fix scope so it matches the spec while preserving the project’s safety boundaries.
- Decide how `doctor --fix` should model planned actions, execution ordering, and final outcomes for both text and JSON consumers.
- Decide how manifest migration and regeneration can be applied without leaving generated metadata in a partially repaired state.
- Confirm how host-environment fixes should behave when the required package manager, daemon control, or version manager is unavailable.

### Research Outputs

- [research.md](research.md)

## Phase 1: Design

### Data Model

- [data-model.md](data-model.md)

### Contracts

- [doctor-fix.md](contracts/doctor-fix.md)

### Quickstart

- [quickstart.md](quickstart.md)

## Implementation Approach

1. Introduce a structured doctor remediation model so each diagnostic finding can declare its status, manual guidance, fix eligibility, supported automation preconditions, and execution handler without changing baseline `doctor` behavior.
2. Implement a deterministic remediation registry for the initial scope:
   - project-local metadata migration for stale or legacy `superposition.json`
   - regeneration of derived devcontainer artifacts from a valid manifest after metadata repair
   - runtime repair for unsupported Node versions when a supported version manager such as `nvm`, `fnm`, or `volta` is already available
   - container-tooling repair for supported Docker/Compose drift only when a known safe host command is available; otherwise report `requires manual action`
3. Execute fixes in a stable order that restores prerequisites before dependent file repairs, then re-run targeted diagnostics to produce a final issue-by-issue summary with `fixed`, `already compliant`, `skipped`, or `requires manual action`.
4. Preserve state safety by using backup-plus-replace mechanics for manifest and generated artifact repairs, with explicit rollback or recovery guidance if a remediation step fails mid-flow.
5. Extend the `doctor` output contract so `--fix` works consistently for terminal users and machine-readable automation, including distinct exit outcomes for fully repaired vs unresolved states.
6. Add regression coverage for no-op fix runs, supported successful fixes, mixed fixable/non-fixable runs, interrupted or failed metadata repair, and JSON/text summaries.
7. Update README, quick-reference material, and changelog guidance to document supported fixes, safety limits, and CI usage.

## Verification Strategy

- Add or update command tests in `tool/__tests__/commands.test.ts` for:
    - baseline `doctor` behavior remaining unchanged without `--fix`
    - `doctor --fix` no-op behavior when nothing is repairable
    - manifest migration and regeneration flows producing deterministic summaries
    - mixed fixable and manual-only findings
    - JSON output for `doctor --fix --json`
    - exit behavior that distinguishes repaired vs unresolved runs
    - unsupported repair environments such as missing Node version managers or unavailable Docker repair commands
- Run `npm test` for automated coverage.
- Run `npm run lint` to verify TypeScript and formatting constraints.
- Run `npm run test:smoke` if doctor workflow changes touch shared generation/regeneration paths.
- Perform targeted manual validation using the steps captured in `quickstart.md`, including one project-local metadata repair and one host-tooling repair fallback case.

## Post-Design Constitution Check

- [x] Design still preserves spec-first delivery and traces directly to the approved feature spec.
- [x] Overlay and generated-file contract integrity is preserved by reusing manifest migration and generation helpers rather than introducing undocumented side paths.
- [x] Verification remains proportional to risk: command tests, lint, and smoke validation are planned before merge.
- [x] Documentation synchronization is explicit: README, quick reference, doctor-adjacent docs, feature quickstart, and `CHANGELOG.md` are in scope.
- [x] Simplicity and compatibility remain intact: `doctor` without `--fix` keeps its current diagnostic contract, and new file operations will reuse existing source/dist-safe helpers and backup patterns.

## Complexity Tracking

No constitution violations require a design exception.
