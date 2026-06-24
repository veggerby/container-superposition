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

### Non-goals

- Interactive `init` / `regen` questionnaire.
- Discovery/preview commands unrelated to diagnostics.
- Adopt/migrate conversion flows.
- Deep implementation details of each checker beyond visible semantics.

## Must Preserve

- Read-only `doctor` never mutates files unless `--fix` specified.
- Dry-run never mutates files.
- JSON output stays available for diagnostics and fix flows.
- Automatic fixes remain restricted to safe/unattended cases.
- Manual-only findings remain visible rather than buried by auto-fix summaries.

## Constraints

- Must remain non-mutating unless `--fix` explicitly selected.
- Must keep JSON and text dispositions semantically aligned for CI and humans.
- Must preserve no-Git-index-mutation rule even when findings identify tracked generated files.
- Must route remediation guidance through ADR 001 project-file-first authority when repository project file exists.

## Assumptions

- Existing checker set and remediation registry stay current ownership boundary; this spec unifies outward contract rather than redefining every checker.
- Section-level suppression of all-pass rows may continue if final summary still proves full coverage ran.
- Missing `docs/foundation.md` means ADR 001, prior doctor specs, and live command/tests remain current authority.

## Proposed Behavior

### 1. `doctor` is sectioned diagnostic report, not flat error stream

Standard text output MUST group checks into named sections and summarize totals at end.

Sections SHOULD only surface non-pass findings for noisy categories like dependencies, port cross-validation, `.env.example` drift, and reproducibility, while still surfacing clear pass summaries where helpful.

Report order SHOULD move from environment blockers to repo drift to generated-output drift so users see highest-leverage actions first.

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
- recommended next command or manual follow-up when auto-fix cannot finish work

Fix summary SHOULD state changed files or backup path when relevant and show final run disposition.

## UX Contract

### Canonical interaction model

`doctor` has three user-visible modes with same diagnostic core:

1. diagnose only
2. diagnose, then preview fix plan (`--fix --dry-run`)
3. diagnose, then apply safe fixes (`--fix`)

Mode MUST be visible in first lines of output so users never confuse preview with write mode.

### Page contract

#### Report structure

Text output order MUST be:

1. source framing and mode
2. grouped findings by section
3. remediation plan preview when requested
4. post-fix outcome summary when writes occurred
5. final disposition summary with counts and next step

Sections SHOULD follow user action order: environment blockers first, source/config integrity next, generated-output drift last.

#### Finding row contract

Each non-pass finding MUST expose:

- severity/disposition marker
- stable finding name
- one-sentence diagnosis
- detail bullets for evidence or scope
- fixability state
- next action when unresolved

If section has no surfaced findings and product chooses to hide all-pass rows, overall summary still needs enough pass-state context that user knows command completed full check set.

### Interaction rules

- Missing or conflicting source inputs fail before any partial diagnostic sections print.
- `--fix --dry-run` MUST never show success language that implies files changed.
- `--fix` MUST preview planned automatic actions before execution in text mode.
- Findings that remain after fix run MUST stay visible in final outcome; fix summary cannot replace them.
- Manual-only findings MUST never be grouped under fixable wording.
- If automatic action skipped due to prerequisite failure, output MUST say skipped and name blocking prerequisite.

### State behavior

- Clean: no actionable findings; output ends with safe-to-proceed style disposition.
- Warning: repo usable but review needed; output names manual or risk-based follow-up.
- Error: blocking issue remains; output names next command or manual repair path.
- Dry-run with findings: preview complete, no changes made, non-zero exit implied.
- Fix-applied: output distinguishes `fixed`, `already compliant`, `skipped`, `requires manual action` per finding.

These disposition labels are canonical across text summary, JSON status, and docs.

### Copy contract

- `Fixable with --fix flag` reserved for findings auto-remediable by current command.
- `Requires manual action` reserved for findings command will not mutate.
- `Preview only` language required for dry-run mode.
- Next-step copy routes through current canonical workflow: `regen` or project-file update for reproducibility drift, not manifest-first shortcuts unless source explicitly manifest-driven.
- Final summary MUST say whether files changed.

### QA scenario scripts

1. Missing project file in `--from-project` mode fails before sectioned diagnostics begin.
2. Clean run ends with counts and explicit safe-to-proceed disposition.
3. Dry-run with fixable and manual findings shows both groups, states no files changed, exits non-zero.
4. Fix run previews actions, applies safe subset, re-runs checks, then reports fixed/skipped/manual outcomes.
5. Reproducibility finding routes user to project-file-first recovery copy.

## Acceptance Criteria

| # | Criterion |
| --- | --- |
| AC-1 | Standard `doctor` text output groups findings by diagnostic area and ends with passed/warning/error/fixable summary counts. |
| AC-2 | `doctor` supports output-path, project-file, and manifest-driven inspection, with clear failures for mutually exclusive or missing sources. |
| AC-3 | `doctor --fix` executes only automatic remediations, in deterministic prerequisite order, then re-checks and reports per-finding outcomes plus overall exit disposition. |
| AC-4 | `doctor --fix --dry-run` shows planned actions and manual-only findings without writing files, and exits non-zero when any findings exist. |
| AC-5 | Diagnostic coverage includes environment, overlays, manifest, merge strategy, port availability, project-file drift, parameters, dependencies, compose/forward-port cross-validation, `.env.example` drift, and reproducibility. |
| AC-6 | Text findings expose actionable detail lines, explicit fixability notes where safe auto-fix exists, and recommended next command or manual follow-up where it does not. |
| AC-7 | Clean, warning, error, and post-fix dispositions remain distinguishable in both text and JSON output so humans and CI can tell whether repo is safe to proceed, needs manual work, or was remediated. |
| AC-8 | JSON output exists for baseline diagnostics, fix runs, and dry-run plan mode. |
| AC-9 | Automated coverage exists for dependency findings, port cross-validation, reproducibility, dry-run behavior, and fix-run outcomes. |
| AC-10 | Diagnose, dry-run, and fix modes define distinct first-line framing, disposition vocabulary, and end states so preview, failure, and mutation outcomes cannot be confused. |
| AC-11 | Ownership is explicit: doctor orchestrates source resolution/reporting/remediation, checkers own findings, remediation registry owns fix metadata, and project-config/replay helpers own underlying state mutation details. |

## Evidence Basis

- `tool/commands/doctor.ts` — source resolution, section formatting, dry-run branch, fix execution, remediation summary.
- `tool/__tests__/commands.test.ts` and `tool/__tests__/doctor-checks.test.ts` — diagnostic sections, fix mode, dry-run, parameter and dependency findings, reproducibility, exit behavior.
- `docs/specs/004-doctor-fix/spec.md` — base auto-repair contract.
- `docs/specs/013-doctor-dependency-check/spec.md` — dependency findings and fix path.
- `docs/specs/014-doctor-compose-port-cross-validation/spec.md` — compose/forward-port validation.
- `docs/specs/016-doctor-reproducibility-check/spec.md` — regen-needed detection.
- `docs/specs/017-doctor-dry-run/spec.md` — preview-before-fix behavior.
- `docs/workflows.md` and `docs/README.md` — user-facing placement of doctor in workflow.

## Evidence Confidence

**High**

Behavior well-covered by code and tests. Remaining uncertainty sits in operating-model and architecture-boundary choices, not in diagnose, dry-run, or fix-mode semantics.

## Implementation-vs-Intent Mismatches

1. Broader docs mention `doctor` as verification step but do not yet expose full `--fix` and `--dry-run` capability surface consistently.
2. Some sections intentionally suppress all-pass output, which keeps report concise but can make feature discoverability uneven across categories.
3. Current text-mode UX is action-oriented but still heavily terminal-structured; no higher-level docs summarize remediation ordering or exit-disposition semantics in one place.

## Technical Design

### Architecture Ownership

- `tool/commands/doctor.ts` owns source resolution, mode framing, section ordering, aggregation, exit disposition, fix-plan preview, fix execution ordering, recheck sequencing, and text/JSON report composition.
- Diagnostic check implementations own evidence gathering and stable finding IDs for their domain, but they do not own cross-command workflow routing.
- Remediation registry metadata owns fix eligibility, remediation key, safety class, prerequisites, planned changes, and manual fallback contract for each auto-fixable finding.
- `tool/schema/project-config.ts` owns project-file loading/writing used by project-file drift, parameter, dependency, and reproducibility fixes.
- Generation/replay helpers own regeneration side effects when remediation chooses regeneration; doctor orchestrates them, not reimplements composition rules.
- Registry/checker text must consume canonical workflow copy owned by doctor-level reporting contract so finding details cannot drift back to manifest-first guidance.

### System Boundaries

- Diagnose-only mode never mutates files.
- Dry-run mode uses same diagnostic core and remediation planning metadata as `--fix`, but never executes writes.
- `--fix` remains all-or-nothing at command boundary: doctor decides safe subset to apply, then reports skipped/manual remainder. Selective per-finding fix targeting is out of scope for this spec.
- Doctor may update project file, manifest, generated output, env example, and backup artifacts required by safe remediations. It must not mutate Git index.
- Doctor output is canonical local and CI health contract for current checker set; wrappers may consume it, but should not redefine disposition vocabulary.

### Canonical Data Flow

1. Parse source flags and resolve exactly one inspection authority: output path, manifest, or project file.
2. Fail fast on missing/conflicting sources before printing partial sections.
3. Run full diagnostic pass and normalize findings into sectioned report model with stable finding IDs, severity, fixability, and next action.
4. If diagnose-only, render report and final disposition.
5. If dry-run, derive remediation plan from same findings, render planned auto-fixes plus manual-only findings, report preview-only disposition, exit based on remaining findings.
6. If fix mode, render planned actions, execute safe remediations in deterministic prerequisite order, record per-action outcomes, rerun checks, then render post-fix findings plus final outcome summary.

### Interfaces and Invariants

- Stable interfaces: source options, section names, finding IDs, remediation keys, disposition labels (`clean`, `warning`, `error`, `fixed`, `already compliant`, `skipped`, `requires manual action`), and JSON/text semantic parity.
- Invariants:
  - same input state produces same findings before formatting differences
  - dry-run and fix mode share same remediation eligibility logic
  - post-fix summary never hides unresolved findings
  - project-file-first recovery copy is used whenever repo project file is available
  - hidden all-pass rows are allowed only if overall output still proves full run completed

### Implementation Slices

1. Source-resolution hardening: one authority path, early conflict failures, first-line mode framing.
2. Diagnostic report contract hardening: stable section order, finding row shape, summary counts, and JSON/text parity.
3. Remediation-plan hardening: canonical safety classes, prerequisite-aware ordering, planned-change narration, manual-only separation.
4. Fix-run hardening: execution outcome capture, recheck policy, final disposition contract.
5. Copy-authority hardening: workflow routing language centralized so checker/remediation text stays project-file-first.
6. Docs/CI slice: document doctor as canonical health gate and align wrappers/tests with exit-disposition contract.

### Risk Notes

- Fix preview and fix execution can drift if remediation planning metadata and execution path evolve separately.
- Checker-specific copy embedded too deep in registry/helpers can bypass top-level workflow routing rules.
- Terse clean output can obscure trust if summary does not show enough coverage proof for humans and CI maintainers.
- Future selective-fix feature would complicate dependency ordering and current summary semantics; keep out of current scope.

### Test Plan

- Source-resolution tests for missing project file, missing manifest, conflicting flags, and project-root resolution.
- Diagnostic tests for section order, stable finding IDs, hidden-pass behavior, summary counts, and JSON/text semantic parity.
- Dry-run tests for preview-only framing, zero writes, planned auto-fix list, manual-only list, and non-zero exit when findings remain.
- Fix-run tests for deterministic remediation ordering, prerequisite skip behavior, outcome vocabulary, recheck behavior, and final unresolved-finding visibility.
- Regression tests for project-file drift, dependency repair, parameter repair, env-example drift, reproducibility drift, and no-Git-index-mutation guidance.
- CI-consumption tests for exit disposition mapping across clean, warning, error, dry-run-with-findings, and post-fix states.

## Architecture Decision Impact

Aligned with ADR 001. `docs/foundation.md` absent; no additional foundation authority to reconcile.

- Governing ADR: `docs/adr/adr001-project-file-first-replay-and-regeneration.md`
- No ADR amendment needed for this scope.

## Open Questions

- None blocking for implementation-safe framing. Selective per-finding fix targeting remains future product decision, not current architecture blocker.

## Routing Decision

**PM → Developer**

Reason: doctor ownership, report/fix flow, invariants, risks, and test strategy now explicit without ADR change.
