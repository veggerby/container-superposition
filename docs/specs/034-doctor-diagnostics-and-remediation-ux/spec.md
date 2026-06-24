# Feature Specification: Doctor Diagnostics and Remediation UX

**Spec ID**: `034-doctor-diagnostics-and-remediation-ux`
**Taxonomy**: `CLI-UX`
**Created**: 2026-06-24
**Author**: PM Agent
**Status**: Draft
**Input**: Reverse-spec existing `doctor` command behavior across diagnostics, repair, and dry-run modes.

---

## Request Classification

Reverse-spec existing CLI UX by consolidating current doctor slices and observed implementation. Scope covers read-only diagnostics, `--fix`, and `--fix --dry-run` user experience.

## Problem Statement

`doctor` now acts as product-wide health gate for generated output and project config. It validates:

- environment/tooling prerequisites
- manifest and merge integrity
- project-file drift
- parameter correctness and sensitivity risks
- overlay dependency completeness
- compose/forward-port consistency
- `.env.example` drift
- reproducibility against current project file

It also offers guided remediation summary, automated fixes for safe cases, and dry-run previews. Behavior spans multiple earlier specs but lacks one consolidated product contract.

## User Goals

### Developer diagnosing setup issue

- Run one command and see grouped findings with pass/warn/fail semantics.
- Understand which issues are safe to auto-fix versus manual.
- Get actionable next steps for each failure.

### Developer using auto-fix

- Preview planned changes before mutating files.
- Apply safe repairs in deterministic order.
- See which findings were fixed, skipped, or still require manual action.

### Team / CI maintainer

- Use JSON output for machine consumption.
- Fail builds when environment or generated output has actionable drift.
- Detect when replay/regeneration needed before merge.

## Scope

### In scope

- Standard `doctor` text and JSON diagnostic report.
- `--from-project`, `--from-manifest`, `--project-root`, and output-path resolution.
- `--fix` remediation ordering, summary, and exit disposition.
- `--fix --dry-run` preview behavior and exit codes.
- Diagnostic sections for environment, overlays, manifest, merge, ports, project-file drift, parameters, dependencies, port cross-validation, `.env.example` drift, and reproducibility.

### Out of scope

- Interactive `init` / `regen` questionnaire.
- Discovery/preview commands unrelated to diagnostics.
- Adopt/migrate conversion flows.
- Deep implementation details of each checker beyond visible semantics.

## Must Preserve

- Read-only `doctor` never mutates files unless `--fix` specified.
- Dry-run never mutates files.
- JSON output stays available for diagnostics and fix flows.
- Automatic fixes remain restricted to safe/unattended cases.

## Proposed Behavior

### 1. `doctor` is sectioned diagnostic report, not flat error stream

Standard text output MUST group checks into named sections and summarize totals at end.

Sections SHOULD only surface non-pass findings for noisy categories like dependencies, port cross-validation, `.env.example` drift, and reproducibility, while still surfacing clear pass summaries where helpful.

### 2. Source selection matches user intent

`doctor` MUST validate mutually exclusive sources and resolve working directory before checks run.

Supported modes:

- generated output path inspection
- explicit manifest inspection
- repository project-file inspection

Errors for missing project root, missing manifest, or missing project file MUST stop before partial diagnostics.

### 3. Auto-fix executes in dependency-aware order

When `--fix` set, tool MUST:

1. run diagnostics first
2. narrate planned fix actions in text mode
3. execute automatic remediations in stable order
4. skip dependent actions when prerequisites fail
5. re-run checks
6. print remediation summary with per-finding outcome and overall exit disposition

Outcome vocabulary MUST distinguish `fixed`, `already compliant`, `skipped`, and `requires manual action`.

### 4. Dry-run previews auto-fix plan without writes

When `--fix --dry-run` set, tool MUST:

- run same diagnostics as fix mode
- list each auto-fixable action with remediation key and planned changes
- separately list manual-only findings
- avoid any file writes
- exit non-zero when any findings remain, zero only when clean

### 5. Doctor doubles as project hygiene gate

Beyond host-environment checks, doctor MUST surface repo and generated-output hygiene issues users can act on before container start or merge:

- project file diverged from manifest
- unresolved or risky parameters
- missing required overlays / unknown overlay IDs
- dead or missing forwarded ports for compose stacks
- stale `.env.example`
- generated output no longer reproducible from current project file

### 6. Text output emphasizes actionability over internals

Each failing or warning finding SHOULD show:

- one-line finding name and message
- indented detail steps or context
- explicit `Fixable with --fix flag` note when applicable

Fix summary SHOULD state changed files or backup path when relevant and show final run disposition.

## Acceptance Criteria

| # | Criterion |
| --- | --- |
| AC-1 | Standard `doctor` text output groups findings by diagnostic area and ends with passed/warning/error/fixable summary counts. |
| AC-2 | `doctor` supports output-path, project-file, and manifest-driven inspection, with clear failures for mutually exclusive or missing sources. |
| AC-3 | `doctor --fix` executes only automatic remediations, in deterministic prerequisite order, then re-checks and reports per-finding outcomes plus overall exit disposition. |
| AC-4 | `doctor --fix --dry-run` shows planned actions and manual-only findings without writing files, and exits non-zero when any findings exist. |
| AC-5 | Diagnostic coverage includes environment, overlays, manifest, merge strategy, port availability, project-file drift, parameters, dependencies, compose/forward-port cross-validation, `.env.example` drift, and reproducibility. |
| AC-6 | Text findings expose actionable detail lines and explicit fixability notes where safe auto-fix exists. |
| AC-7 | JSON output exists for baseline diagnostics, fix runs, and dry-run plan mode. |
| AC-8 | Automated coverage exists for dependency findings, port cross-validation, reproducibility, dry-run behavior, and fix-run outcomes. |

## Evidence Basis

- `tool/commands/doctor.ts` — source resolution, section formatting, dry-run branch, fix execution, remediation summary.
- `tool/__tests__/commands.test.ts` and `tool/__tests__/doctor-checks.test.ts` — diagnostic sections, fix mode, dry-run, parameter and dependency findings, reproducibility, exit behavior.
- `docs/specs/004-doctor-fix/spec.md` — base auto-repair contract.
- `docs/specs/013-doctor-dependency-check/spec.md` — dependency findings and fix path.
- `docs/specs/014-doctor-compose-port-cross-validation/spec.md` — compose/forward-port validation.
- `docs/specs/016-doctor-reproducibility-check/spec.md` — regen-needed detection.
- `docs/specs/017-doctor-dry-run/spec.md` — preview-before-fix behavior.
- `docs/workflows.md` and `docs/README.md` — user-facing placement of doctor in workflow.

## Confidence

**High**

Behavior well-covered by code and tests. Remaining uncertainty mostly around long-term product positioning, not current observed behavior.

## Implementation-vs-Intent Mismatches

1. Broader docs mention `doctor` as verification step but do not yet expose full `--fix` and `--dry-run` capability surface consistently.
2. Some sections intentionally suppress all-pass output, which keeps report concise but can make feature discoverability uneven across categories.
3. Current text-mode UX is action-oriented but still heavily terminal-structured; no higher-level docs summarize remediation ordering or exit-disposition semantics in one place.

## ADR Impact

No feature-local ADR needed.

Doctor remediation authority is covered by `docs/adr/adr001-project-file-first-replay-and-regeneration.md`. Existing no-Git-index-mutation constraint remains grounded in spec `022-local-superposition-config`. `docs/foundation.md` still absent during review.

## Open Questions

1. Should future UX expose selective fix application, or preserve all-or-nothing `--fix` behavior?
2. Should doctor become canonical pre-merge gate documented alongside `plan`, given breadth of current checks?
3. Should clean-run output surface more pass-state detail for CI newcomers, or stay terse?
4. `tool/commands/doctor.ts` still contains manifest-first remediation copy in some registry entries (for example `devcontainer-regeneration`) even though broader workflow now routes through project file first.

## Routing Decision

**PM → Developer**

Reason: current behavior already concrete and heavily test-backed. Main need is consolidation and documentation, not additional UX exploration before maintenance work.