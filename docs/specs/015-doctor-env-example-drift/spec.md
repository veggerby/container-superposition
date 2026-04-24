# Feature Specification: Doctor `.env.example` Drift Detection

**Spec ID**: `015-doctor-env-example-drift`
**Taxonomy**: `CLI-UX`
**Created**: 2026-04-24
**Author**: PM Agent
**Status**: Approved
**Input**: Feature assessment — `cs doctor` does not detect when `.env.example` is stale: missing keys for parameters added by new overlays, or keys left over from overlays that were removed.

## Problem Statement

When a developer adds or removes overlays and runs `cs regen`, the generated `docker-compose.yml`
and `devcontainer.json` are updated, but `.env.example` may drift from the actual parameter set
in use. A key missing from `.env.example` means a new team member who onboards by copying the
file will silently omit a required secret. A stale key left behind from a removed overlay
creates confusion about which variables are needed. Doctor should detect both directions of drift
and offer a `--fix` that regenerates `.env.example` to match the current overlay selection.

## Goals

- Detect parameter keys referenced in the current overlay selection that are absent from the
  generated `.env.example`.
- Detect keys present in `.env.example` that are no longer declared by any selected overlay.
- Allow `doctor --fix` to regenerate `.env.example` from the current project configuration.

## Non-Goals

- Validating the actual values in `.env` (the user's runtime secrets file — not committed).
- Checking whether `.env` is gitignored (separate concern).
- Modifying the parameter schema or the `.env.example` generation logic in `composer.ts`.
- Generating `.env.example` from scratch when it does not exist (that is covered by spec 012 /
  the existing parameters check in spec implemented for the parameter doctor feature).

## Design

### Env example drift check

`checkEnvExampleDrift(overlaysConfig, outputPath, workingDir)` is a new synchronous function in
`tool/commands/doctor.ts`. It returns `CheckResult[]`.

**Early return**: if no project file is present, return empty (no noise). If the output
directory has no `.env.example`, return a single pass ("No `.env.example` present — skipping
drift check") — the missing-file case is handled by the parameters check (spec 012).

**Step 1 — Collect declared parameter keys**

Call `collectOverlayParameters(overlaysConfig, selection.overlays)` where `selection` comes from
`loadProjectConfig(workingDir)`. This returns the full `ParameterDeclaration[]` for the selected
overlay set. Extract the set of unique `key` strings: `declaredKeys`.

**Step 2 — Parse `.env.example`**

Read `outputPath/.env.example`. Parse each non-comment, non-blank line as `KEY=...` (or
`KEY` alone). Extract the set of keys: `exampleKeys`. Lines starting with `#` are skipped.
Section header comments (`# --- Service ---`) are also skipped.

**Step 3 — Diff**

- `missingFromExample = declaredKeys − exampleKeys`: keys declared by overlays but absent from
  `.env.example` → **fail** ("Parameter `<KEY>` declared by overlay `<id>` is missing from
  `.env.example`").
- `staleInExample = exampleKeys − declaredKeys`: keys in `.env.example` not declared by any
  selected overlay → **warn** ("Key `<KEY>` in `.env.example` is not declared by any selected
  overlay — it may be stale").

Pass check message: "`.env.example` is in sync with `N` declared parameter(s)."

### Fix action: `env-example-regen`

Registered in `REMEDIATION_REGISTRY`:

- **Safety class**: `safe-unattended`
- **Execution kind**: `regeneration`
- **Planned changes**:
    - "Regenerate `.env.example` from current overlay selection"

`executeEnvExampleRegen(outputPath, overlaysConfig, overlaysDir, workingDir, silent)`:

1. Load project config.
2. Rebuild answers via `buildAnswersFromProjectConfig()` + `applyPresetSelections()`.
3. Call `composeDevContainer(answers, overlaysDir, { isRegen: true })` — the composer already
   regenerates `.env.example` as part of a full regen.
4. Re-check: verify drift findings are resolved.

Unknown stale keys are regenerated away (the composer rewrites `.env.example` from scratch). This
is safe because `.env.example` is a committed template, not a secrets file.

### DoctorReport changes

`DoctorReport` gains an `envExampleDrift: CheckResult[]` field.

`generateReport()` gains an `envExampleDriftChecks` parameter.

`formatAsText()` gains a ".env.example Drift" section; suppressed if all pass.

`reportToFindings()` adds:

```typescript
...checksToFindings(report.envExampleDrift, 'manifest', 'full'),
```

`executeFixRun()` calls `checkEnvExampleDrift()` in the re-check pass.

### Affected files

| File                              | Change                                                                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `tool/commands/doctor.ts`         | Add `checkEnvExampleDrift()`, `executeEnvExampleRegen()`, wire into report infrastructure, `REMEDIATION_REGISTRY`, `PRIORITY` map |
| `tool/__tests__/commands.test.ts` | Tests for: missing key (fail), stale key (warn), in-sync (pass), fix action                                                       |
| `CHANGELOG.md`                    | Entry under `### Added`                                                                                                           |

### User-visible behaviour

```
.env.example Drift:
  ✗ Parameter POSTGRES_PASSWORD declared by postgres is missing from .env.example
    → Run cs regen or use --fix to regenerate .env.example
    → Fixable with --fix flag
  ⚠ Key OLD_API_KEY in .env.example is not declared by any selected overlay — it may be stale
    → Remove OLD_API_KEY from .env.example or run --fix to regenerate
    → Fixable with --fix flag
  ✓ .env.example is in sync with 5 declared parameter(s)
```

### Backward compatibility

No changes to existing generated files or project file format. Purely additive check.

## User Scenarios & Testing

### User Story 1 — Missing key caught after overlay addition (P1)

A developer adds the `vault` overlay (which declares `VAULT_TOKEN`) to their project and runs
`cs regen`. Due to a bug or partial regen, `.env.example` is not updated. Doctor detects the
missing key immediately.

**Why this priority**: A missing key in `.env.example` silently breaks onboarding for every
future team member who copies the file as their starting `.env`.

**Independent Test**: Write a `.superposition.yml` selecting `postgres`. Write a `.env.example`
that lacks `POSTGRES_PASSWORD`. Run `doctorCommand`. Assert `fail` finding for
`POSTGRES_PASSWORD`.

**Acceptance Scenarios**:

1. **Given** `.superposition.yml` selects `postgres` (declares `POSTGRES_PASSWORD`) and
   `.env.example` does not contain `POSTGRES_PASSWORD`, **When** `cs doctor` runs, **Then** a
   `fail` finding reports "`POSTGRES_PASSWORD` declared by `postgres` is missing from
   `.env.example`".
2. **Given** the same setup with `--fix`, **When** doctor runs, **Then** `.env.example` is
   regenerated containing `POSTGRES_PASSWORD` and the re-check passes.
3. **Given** `.env.example` contains all keys for the current overlay selection, **When**
   `cs doctor` runs, **Then** the `.env.example Drift` section is suppressed.

---

### User Story 2 — Stale key caught after overlay removal (P2)

A developer removes `redis` from their project but forgets to re-run regen. `.env.example`
still contains `REDIS_PASSWORD`. Doctor warns them it is stale.

**Why this priority**: Stale `.env.example` keys cause confusion about required configuration and
may expose unneeded credentials to documentation reviewers.

**Independent Test**: Write a `.superposition.yml` without `redis`. Write a `.env.example` that
contains `REDIS_PASSWORD`. Run `doctorCommand`. Assert `warn` finding for `REDIS_PASSWORD`.

**Acceptance Scenarios**:

1. **Given** `.env.example` contains `REDIS_PASSWORD` but no selected overlay declares it,
   **When** `cs doctor` runs, **Then** a `warn` finding reports "`REDIS_PASSWORD` in `.env.example`
   is not declared by any selected overlay".
2. **Given** `--fix` is used, **When** doctor runs, **Then** `.env.example` is regenerated without
   `REDIS_PASSWORD`.

---

### Edge Cases

- `.env.example` with only comments and blank lines: treated as having zero keys; any declared
  parameters generate `fail` findings.
- Overlay with parameters but none sensitive: still checked for drift (drift check is not
  limited to sensitive parameters).
- `.env.example` present but empty (zero bytes): treated the same as all-comment case.
- No project file: return empty result (no noise).
- Compose `${VAR:-default}` references in docker-compose.yml but not in overlay `parameters:`:
  not flagged — the drift check only compares declared overlay parameters, not raw compose
  variable references.

## Requirements

### Functional Requirements

- **FR-001**: `checkEnvExampleDrift()` MUST return `fail` for each parameter key declared by a
  selected overlay that is absent from `.env.example`.
- **FR-002**: `checkEnvExampleDrift()` MUST return `warn` for each key in `.env.example` not
  declared by any selected overlay.
- **FR-003**: When `.env.example` is absent, the check MUST return a single pass (the missing-file
  scenario is handled by the parameters check in `checkParameters()`).
- **FR-004**: `executeEnvExampleRegen()` MUST regenerate `.env.example` via a full `composeDevContainer`
  call and MUST NOT leave stale keys behind.
- **FR-005**: Comment lines and blank lines in `.env.example` MUST NOT be counted as parameter keys.
- **FR-006**: When no project file is present, the check MUST return an empty result.

### Key Entities

- **`declaredKeys`**: set of parameter key strings from `collectOverlayParameters()` for the current overlay selection.
- **`exampleKeys`**: set of key strings parsed from non-comment, non-blank lines in `.env.example`.

## Dependencies & Impact

- **Affected Areas**: `tool/commands/doctor.ts`, `tool/__tests__/commands.test.ts`, `CHANGELOG.md`
- **Compatibility Impact**: None — purely additive check category.
- **Required Documentation Updates**: `CHANGELOG.md`
- **Verification Plan**: Unit tests in `commands.test.ts`; manual test after adding then removing
  an overlay from a real project file.

## Success Criteria

### Measurable Outcomes

- **SC-001**: `cs doctor` on a project where `.env.example` is missing a declared parameter
  reports a `fail` in the `.env.example Drift` section.
- **SC-002**: `cs doctor --fix` on the same setup regenerates `.env.example` and the re-check
  passes with no drift findings.
- **SC-003**: `npm test` passes with at least 3 new test cases covering: missing key, stale key,
  and fix action.
- **SC-004**: No existing doctor tests regress.

## Open Questions

| #   | Question                                                                                  | Owner | Resolution                                                                           |
| --- | ----------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------ |
| 1   | Should missing `.env.example` keys be `fail` or `warn`? Missing required params are fail; | PM    | Pending — lean toward `fail` for keys with no default, `warn` for keys with defaults |
|     | but all parameters already have defaults (required-without-default is a separate check)   |       |                                                                                      |
| 2   | Should section header comments be preserved when regenerating `.env.example`?             | PM    | The composer already handles this; not a new concern                                 |

## Out of Scope

- Validating values in the user's runtime `.env` file.
- Checking whether `.env` is listed in `.gitignore`.
- Detecting drift in `devcontainer.json` `remoteEnv` (that is covered by the parameters check).

## Implementation Notes

- `checkEnvExampleDrift` uses `collectOverlayParameters` to get the declared parameter set for the selected overlays, then diffs against lines parsed from the existing `.env.example`.
- The check returns early (no findings) when `.env.example` is absent — the parameters check is responsible for detecting its absence when required.
- `executeEnvExampleRegen` calls `composeDevContainer` with `isRegen: false` writing only to the output path, then re-reads `.env.example` to verify the file was produced.
