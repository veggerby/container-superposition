# Data Model: Doctor Auto-Fix

## Entity: DiagnosticFinding

**Purpose**: Represents one doctor check result before or after remediation.

**Fields**:

- `id`: stable identifier for the finding type
- `category`: `environment`, `overlay`, `manifest`, `merge`, or `ports`
- `name`: user-facing label
- `status`: `pass`, `warn`, or `fail`
- `message`: concise result summary
- `details`: optional explanatory lines
- `fixEligibility`: `automatic`, `manual-only`, or `not-applicable`
- `remediationKey`: stable remediation identifier when automation is possible
- `recheckScope`: the targeted check group that must be re-run after a fix

**Validation rules**:

- `id` must be stable across text and JSON output for the same issue class
- `fixEligibility: automatic` requires a non-empty `remediationKey`
- `status: pass` must not produce a remediation action
- `recheckScope` must map to an existing doctor check or check group

## Entity: RemediationAction

**Purpose**: Defines a supported automatic repair for a finding type.

**Fields**:

- `key`: stable remediation identifier
- `findingId`: target finding type
- `safetyClass`: `safe-unattended` or `requires-manual-action`
- `executionKind`: `shell-command`, `manifest-migration`, `regeneration`, or `no-op`
- `preconditions`: ordered list of capabilities required before execution
- `plannedChanges`: user-facing description of the intended repair
- `manualFallback`: manual guidance when preconditions are not met

**Validation rules**:

- `safe-unattended` actions must describe all required preconditions explicitly
- `executionKind: shell-command` must declare the exact command family it relies on
- `executionKind: manifest-migration` and `regeneration` must identify the files they can modify
- every action must provide `manualFallback`

## Entity: FixExecution

**Purpose**: Captures one attempted remediation during a `doctor --fix` run.

**Fields**:

- `findingId`: finding being addressed
- `remediationKey`: action selected for execution
- `attempted`: whether execution was actually started
- `outcome`: `fixed`, `already-compliant`, `skipped`, or `requires-manual-action`
- `reason`: concise explanation for the outcome
- `commands`: optional executed commands or helper names
- `changedFiles`: optional list of modified files
- `backupPath`: optional backup directory used for rollback safety
- `rechecked`: whether targeted diagnostics were re-run after the action

**Validation rules**:

- `fixed` requires either `commands` or `changedFiles`
- `already-compliant` must indicate that no mutation was required
- `skipped` must explain the blocking dependency or ordering reason
- `requires-manual-action` must include actionable follow-up guidance

## Entity: FixRun

**Purpose**: Represents the full `doctor --fix` execution.

**Fields**:

- `outputPath`: target devcontainer path under validation
- `requestedJson`: whether machine-readable output was requested
- `initialFindings`: ordered list of findings before remediation
- `executions`: ordered list of `FixExecution` records
- `finalFindings`: findings after targeted re-checks
- `summary`: aggregate counts by outcome
- `exitDisposition`: `success`, `repaired-with-warnings`, or `unresolved-failures`

**Validation rules**:

- `initialFindings` and `finalFindings` must use the same finding IDs when the issue class still exists
- `executions` must follow the remediation ordering rules
- `summary` counts must reconcile with the execution list
- `exitDisposition` must match the final unresolved-state rules used by the CLI

## Entity: FixOutcomeSummary

**Purpose**: Provides the user-facing rollup for terminal output and JSON consumers.

**Fields**:

- `fixedCount`
- `alreadyCompliantCount`
- `skippedCount`
- `manualActionCount`
- `unresolvedCount`
- `orderedOutcomes`: per-finding outcome list in display order

**Validation rules**:

- every fixable or attempted finding appears exactly once in `orderedOutcomes`
- `manualActionCount` includes in-scope repair classes that could not run automatically
- `unresolvedCount` must be non-zero whenever `exitDisposition` is `unresolved-failures`

## Relationships

- one `DiagnosticFinding` may map to zero or one `RemediationAction`
- one `FixRun` contains many `DiagnosticFinding` and `FixExecution` records
- one `FixExecution` references exactly one `DiagnosticFinding` and one `RemediationAction`
- one `FixRun` produces one `FixOutcomeSummary`

## State Notes

- Baseline `doctor` still produces findings without executions.
- `doctor --fix` first builds findings, then selects eligible actions, then executes actions in a stable prerequisite-first order.
- Re-checks update only the finding groups affected by a remediation instead of recomputing unrelated categories.
- If a repair cannot run safely, the finding remains visible and resolves to `requires manual action`.
