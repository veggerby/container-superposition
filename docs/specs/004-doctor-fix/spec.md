# Feature Specification: `doctor --fix` — Interactive Auto-Repair

**Spec ID**: `004-doctor-fix`
**Created**: 2026-03-19
**Status**: Final
**Input**: GitHub issue: Implement `doctor --fix` — interactive auto-repair for environment issues

## Summary

The `doctor` command validates the environment. The `--fix` path was a placeholder. This spec
describes the full implementation of an interactive, safe, deterministic auto-repair flow for
common environment issues.

## Initial Auto-Fix Scope

| #   | Issue class                                                   | Automation condition                                              |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | Stale or legacy `superposition.json` metadata                 | Always supported (manifest migration)                             |
| 2   | Derived `.devcontainer/` drift or missing generated artifacts | Supported when a valid manifest is present (regeneration)         |
| 3   | Unsupported Node runtime                                      | Supported only when `nvm`, `fnm`, or `volta` is already available |
| 4   | Docker / Compose tooling drift                                | Supported only when a known safe host repair command is available |

## Outcome Vocabulary

Every finding evaluated by the fix flow resolves to exactly one of:

- **`fixed`** — tool changed the environment and targeted re-check now passes
- **`already compliant`** — fix path found no change was needed
- **`skipped`** — not attempted because an earlier failure or prerequisite blocked it
- **`requires manual action`** — issue remains; automation is unsafe or unavailable

## Data Model

### `DiagnosticFinding`

Fields: `id`, `category`, `name`, `status`, `message`, `details?`, `fixEligibility`, `remediationKey?`, `recheckScope`

### `RemediationAction`

Fields: `key`, `findingId`, `safetyClass`, `executionKind`, `preconditions`, `plannedChanges`, `manualFallback`

### `FixExecution`

Fields: `findingId`, `remediationKey`, `attempted`, `outcome`, `reason`, `commands?`, `changedFiles?`, `backupPath?`, `rechecked`

### `FixRun`

Fields: `outputPath`, `requestedJson`, `initialFindings`, `executions`, `finalFindings`, `summary`, `exitDisposition`

## CLI Contract

- `doctor` without `--fix` — no change to current diagnostics behavior
- `doctor --fix` — diagnose → remediate in stable order → re-check → print summary
- `doctor --fix --json` — same flow, machine-readable JSON output

## Remediation Ordering

Prerequisites before dependents:

1. Stale manifest migration (must complete before regeneration)
2. Missing artifacts / devcontainer drift (regeneration from manifest)
3. Node version fix (only if version manager available)
4. Docker tooling fix (only if repair command available)
