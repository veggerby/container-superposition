# Feature Specification: Doctor `--fix --dry-run` Flag

**Spec ID**: `017-doctor-dry-run`
**Taxonomy**: `CLI-FLAG`
**Created**: 2026-04-24
**Author**: PM Agent
**Status**: Approved
**Input**: Feature assessment — `cs doctor --fix` applies changes immediately with no preview; users have no way to understand what would change before committing to auto-repair.

## Problem Statement

`cs doctor --fix` is a powerful command that modifies the project file and regenerates the
devcontainer in one step. Users — especially those new to the project — have no way to preview
what changes `--fix` would make before applying them. This makes `--fix` feel risky and
discourages adoption. A `--dry-run` modifier should show exactly what would change without
writing anything, enabling confident use of `--fix`.

## Goals

- Add a `--dry-run` flag (usable only in combination with `--fix`) that prints a human-readable
  plan of what each fix action would do without executing any file writes.
- Show the planned changes for every auto-fixable finding: which files would be written, which
  keys would be added to the project file, and what regen would regenerate.
- Exit with a non-zero exit code when there are findings that would be fixed (so CI can detect
  "fix needed" without applying the fix).

## Non-Goals

- Implementing a diff of generated file content (file-level diff is an enhancement, not
  required for the initial implementation).
- Applying partial fixes (dry-run is all-or-nothing: show the plan for all auto-fixable findings
  or none).
- Changing any existing `--fix` behaviour (dry-run is a separate flag, not a modifier to the
  existing logic).
- Supporting `--dry-run` without `--fix` (without `--fix`, there is nothing to dry-run; the
  combination is invalid).

## Design

### CLI flag

`doctor` gains a new option: `--dry-run` (boolean, default `false`).

The Commander declaration:

```typescript
.option('--dry-run', 'Show what --fix would change without writing anything')
```

Validation: if `--dry-run` is set but `--fix` is not set, print an error and exit:

```
Error: --dry-run requires --fix. Use: cs doctor --fix --dry-run
```

### Dry-run execution flow

When `--fix --dry-run` is used:

1. Run all doctor checks as normal (same as `--fix`).
2. Collect all auto-fixable findings by consulting `REMEDIATION_REGISTRY` for each finding's
   remediation key.
3. For each auto-fixable finding, look up the `RemediationAction.plannedChanges` array in
   `REMEDIATION_REGISTRY`. These are already stored as human-readable strings per the existing
   spec 004 design.
4. Print the dry-run plan (see "User-visible behaviour" below).
5. **Do not call `executeSingleFix()` or `executeFixRun()`** — no writes occur.
6. Exit with code `1` if there are auto-fixable findings (to support CI use); exit with `0` if
   all findings are already clean.

### Integration with `executeFixRun`

`executeFixRun(findings, options)` gains a `dryRun: boolean` parameter (default `false`).

When `dryRun` is `true`:

- Skip all `executeSingleFix()` calls.
- Return a summary marked as `{ dryRun: true, plannedActions: RemediationPlan[] }`.

`RemediationPlan` (new type):

```typescript
interface RemediationPlan {
    findingName: string;
    remediationKey: string;
    plannedChanges: string[];
    safetyClass: string;
}
```

### Output format

```
Doctor dry-run — changes that --fix would apply:
══════════════════════════════════════════════════

  [1] parameters-regen (safe-unattended)
      Finding: "Missing required parameter: POSTGRES_PASSWORD"
      Would:
        • Add missing parameters with overlay defaults to project file
        • Regenerate devcontainer configuration from project file

  [2] dependency-fix (safe-unattended)
      Finding: "Overlay grafana requires prometheus which is not in your project file"
      Would:
        • Add missing required overlay(s) to project file
        • Regenerate devcontainer configuration from updated project file

  [3] env-example-regen (safe-unattended)
      Finding: "Parameter POSTGRES_PASSWORD is missing from .env.example"
      Would:
        • Regenerate .env.example from current overlay selection

──────────────────────────────────────────────────
  3 fix action(s) would be applied. Run without --dry-run to apply.

Findings that require manual action (not auto-fixable):
  ✗ Overlay nodjs not found in overlay registry — check for typos
    → Edit .superposition.yml to correct the overlay ID
```

When there are no auto-fixable findings:

```
Doctor dry-run — no auto-fixable findings. Nothing to apply.
```

### JSON output (--format json)

When `--format json` is used with `--fix --dry-run`, the JSON output gains a `dryRun` key:

```json
{
  "dryRun": true,
  "plannedActions": [
    {
      "findingName": "Missing required parameter: POSTGRES_PASSWORD",
      "remediationKey": "parameters-regen",
      "plannedChanges": ["Add missing parameters with overlay defaults to project file", "Regenerate devcontainer configuration from project file"],
      "safetyClass": "safe-unattended"
    }
  ],
  "manualFindings": [...]
}
```

### Exit codes

| Scenario                                            | Exit code |
| --------------------------------------------------- | --------- |
| Dry-run with auto-fixable findings                  | `1`       |
| Dry-run with only manual findings (no auto-fixable) | `1`       |
| Dry-run with no findings at all (everything passes) | `0`       |
| `--dry-run` without `--fix` (invalid combination)   | `1`       |

### Affected files

| File                              | Change                                                                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool/commands/doctor.ts`         | Add `--dry-run` option, `RemediationPlan` type, dry-run branch in `executeFixRun`, dry-run output section in `formatAsText`                         |
| `tool/__tests__/commands.test.ts` | Tests for: dry-run output lists planned actions, no writes occur, exit code 1 with findings, exit code 0 clean, invalid `--dry-run` without `--fix` |
| `CHANGELOG.md`                    | Entry under `### Added`                                                                                                                             |

### User-visible behaviour

See the output format section above. The key constraint: no files are modified when `--dry-run`
is active — not the project file, not any generated file, not `.env.example`.

### Backward compatibility

`--dry-run` is a new flag — no existing behaviour changes. `--fix` without `--dry-run` continues
to work exactly as before. The new `dryRun` parameter on `executeFixRun` defaults to `false`.

## User Scenarios & Testing

### User Story 1 — Safe preview before first `--fix` use (P1)

A developer is onboarding to a project and sees 3 doctor failures. Before running `--fix`, they
run `cs doctor --fix --dry-run` to understand what will change.

**Why this priority**: `--fix` modifies the project file and regenerates. Without a preview,
users are reluctant to use it. Dry-run is the single biggest adoption unblock for `--fix`.

**Independent Test**: Set up a project with a missing required parameter and a missing required
overlay dependency. Run `doctorCommand --fix --dry-run`. Assert no files were written and output
contains both planned actions.

**Acceptance Scenarios**:

1. **Given** a project with a missing required parameter, **When** `cs doctor --fix --dry-run`
   runs, **Then** the output lists the `parameters-regen` planned action and the project file is
   not modified.
2. **Given** `--dry-run` without `--fix`, **When** the command runs, **Then** an error is printed
   and the command exits with code 1.
3. **Given** no fixable findings, **When** `cs doctor --fix --dry-run` runs, **Then** output
   reports "no auto-fixable findings" and exits with code 0.

---

### User Story 2 — CI "fix needed" detection (P2)

A CI pipeline runs `cs doctor --fix --dry-run` and fails the build when doctor would make
changes, forcing the developer to run `cs doctor --fix` locally before merging.

**Acceptance Scenarios**:

1. **Given** auto-fixable findings exist, **When** `cs doctor --fix --dry-run` runs in CI,
   **Then** exit code is `1`.
2. **Given** all checks pass, **When** `cs doctor --fix --dry-run` runs in CI, **Then** exit
   code is `0`.

---

### Edge Cases

- Manual-only findings with no auto-fixable ones: still exit `1` (there are problems), still
  show the manual section, show "0 auto-fixable actions".
- All findings are manual-only: dry-run output should clarify that `--fix` would not resolve
  them automatically.
- `--dry-run` used with `--format json`: produce JSON with the `dryRun` structure above.

## Requirements

### Functional Requirements

- **FR-001**: When `--fix --dry-run` is specified, `cs doctor` MUST NOT write any files.
- **FR-002**: The dry-run output MUST list every auto-fixable finding with its `remediationKey`
  and `plannedChanges`.
- **FR-003**: The dry-run output MUST list manual-only findings separately.
- **FR-004**: `cs doctor --fix --dry-run` MUST exit with code `1` when any findings exist (auto-
  fixable or manual).
- **FR-005**: `cs doctor --fix --dry-run` MUST exit with code `0` when all checks pass.
- **FR-006**: `--dry-run` without `--fix` MUST print an error message and exit with code `1`.
- **FR-007**: `--fix --dry-run` with `--format json` MUST include a `dryRun: true` key and
  `plannedActions` array in the JSON output.

## Dependencies & Impact

- **Affected Areas**: `tool/commands/doctor.ts`, `tool/__tests__/commands.test.ts`, `CHANGELOG.md`
- **Compatibility Impact**: None — `--dry-run` is a new flag; no existing behaviour changes.
- **Required Documentation Updates**: `CHANGELOG.md`; update `cs doctor --help` output implicitly
  via Commander option declaration.
- **Verification Plan**: Unit tests verifying no writes occur; exit code assertions.

## Success Criteria

### Measurable Outcomes

- **SC-001**: `cs doctor --fix --dry-run` on a project with fixable findings produces output
  listing all planned actions and exits with code 1.
- **SC-002**: No files in the project directory or output directory are modified when `--dry-run`
  is active.
- **SC-003**: `npm test` passes with at least 4 new test cases: dry-run output, no-write
  guarantee, exit codes, invalid flag combination.
- **SC-004**: No existing doctor tests regress.

## Open Questions

| #   | Question                                                                                 | Owner | Resolution                                                                                |
| --- | ---------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------- |
| 1   | Should `--dry-run` show a file-level diff of generated output (e.g. what regen would add | PM    | Pending — defer; full diff requires dry compose which is expensive. Leave for a follow-up |
|     | to devcontainer.json)?                                                                   |       |                                                                                           |
| 2   | Should `--dry-run` without `--fix` be silently ignored instead of an error?              | PM    | Pending — lean toward error: the combination is meaningless and should be caught early    |

## Out of Scope

- File-content diffing (showing before/after for generated files).
- Partial dry-run (dry-running only some fix actions).
- Storing the dry-run plan to a file for later application.

## Implementation Notes

- `executeFixRun` gains a `dryRun: boolean` parameter (default `false`); when true it skips all `executeSingleFix` calls and returns the planned actions without writing anything.
- The `RemediationPlan` interface is defined in `doctor.ts` with fields `findingName`, `remediationKey`, `plannedChanges`, and `safetyClass`.
- The dry-run branch in `doctorCommand` runs before the normal fix branch; `--dry-run` without `--fix` exits immediately with code 1 and an error message.
- Exit code for dry-run with any findings (auto-fixable or manual) is `1`; exit code `0` only when all checks pass.
