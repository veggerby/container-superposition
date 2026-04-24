# Feature Specification: Doctor Overlay Dependency Resolution Check

**Spec ID**: `013-doctor-dependency-check`
**Taxonomy**: `CLI-UX`
**Created**: 2026-04-24
**Author**: PM Agent
**Status**: Approved
**Input**: Feature assessment — `cs doctor` does not validate that selected overlays satisfy their own dependency requirements; missing `requires:` entries are only caught at regen time.

## Problem Statement

`cs doctor` checks many things about an existing `.devcontainer/` setup but never validates that
the overlay set declared in the project file is self-consistent. If a project file includes
`grafana` but omits the required `prometheus`, the error only surfaces when `cs regen` runs or
when the user opens the devcontainer. Doctor should catch these problems immediately, with a
clear message and — where safe — fix them automatically.

The same gap applies to `suggests:` (advisory recommendations never surfaced) and to overlays
listed in the project file that no longer exist in the registry (typos, removed overlays).

## Goals

- Detect missing `requires:` overlays between the project file's overlay set and the overlay
  registry before regen or container startup.
- Detect overlay IDs in the project file that are not present in the overlay registry.
- Surface `suggests:` recommendations as informational notices (not failures).
- Allow `doctor --fix` to add missing required overlays to the project file and re-run
  generation.

## Non-Goals

- Validating `conflicts:` — conflict detection already happens during composition.
- Changing the dependency resolution logic in `composer.ts`.
- Checking transitive suggestions (only direct `suggests:` from selected overlays).

## Design

### Dependency resolution check

`checkDependencies(overlaysConfig, workingDir)` loads the project file via `loadProjectConfig()`
and returns early (empty result) if none exists.

For each overlay ID in `selection.overlays`:

1. **Unknown overlay**: overlay ID not in `overlaysConfig.overlays` → `fail` ("Overlay `<id>`
   not found in registry — it may have been removed or misspelled").
2. **Missing required overlay**: for each ID in `overlay.requires`, check if the full resolved
   set (project overlays + auto-resolved via `resolveImplicitDependencies`) covers it. If not →
   `fail` ("Overlay `<id>` requires `<dep>` which is not in your project file").
3. **Missing suggested overlay**: for each ID in `overlay.suggests`, check if it is present in
   the resolved set. If not → `warn` ("Overlay `<id>` suggests `<dep>` — consider adding it for
   better observability / functionality").

The check uses the same resolution helpers used by `composer.ts` so the rules are identical.

Pass check message: "`N` overlay(s) selected; all dependencies satisfied."

### Fix action: `dependency-fix`

Registered in `REMEDIATION_REGISTRY`:

- **Safety class**: `safe-unattended`
- **Execution kind**: `regeneration`
- **Planned changes**:
    - "Add missing required overlay(s) to project file"
    - "Regenerate devcontainer configuration from updated project file"

`executeDependencyFix(outputPath, overlaysConfig, overlaysDir, workingDir, silent)`:

1. Load project config.
2. Identify missing required overlays (same logic as the check).
3. Add them to `selection.overlays`.
4. Write updated project file with `writeProjectConfig()`.
5. Rebuild answers from updated config and call `composeDevContainer()`.
6. Re-check: verify no dependency failures remain.

Unknown overlay IDs (not in registry) are **not** auto-fixable — marked `manual-only`.
Suggested overlays are never auto-added — always `not-applicable`.

### DoctorReport changes

`DoctorReport` gains a `dependencies: CheckResult[]` field.
`generateReport()` gains a `dependenciesChecks` parameter.
`formatAsText()` gains a "Dependencies" section that shows failures and warnings;
suppresses the section entirely if all pass.
`reportToFindings()` includes `checksToFindings(report.dependencies, 'manifest', 'full')`.
`executeFixRun()` calls `checkDependencies()` in the re-check pass.

### Affected files

| File                              | Change                                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `tool/commands/doctor.ts`         | Add `checkDependencies()`, `executeDependencyFix()`, wire into report infrastructure, `REMEDIATION_REGISTRY`, `PRIORITY` map |
| `tool/__tests__/commands.test.ts` | Tests for unknown overlay, missing required, suggestion warn, fix action                                                     |
| `CHANGELOG.md`                    | Entry under `### Added`                                                                                                      |

### User-visible behaviour

```
Dependencies:
  ✗ Overlay grafana requires prometheus which is not in your project file
    → Add prometheus to the overlays: list in .superposition.yml
    → Fixable with --fix flag
  ⚠ Overlay postgres suggests grafana — consider adding it for observability
  ✓ All other overlay dependencies satisfied
```

### Backward compatibility

No changes to existing generated files or project file format. Purely additive check.

## User Scenarios & Testing

### User Story 1 — Missing required overlay detected and fixed (P1)

A developer has `grafana` in their project file but forgot to add `prometheus` (which grafana
requires). They run `cs doctor` and immediately see the problem instead of discovering it when
the devcontainer fails to build.

**Why this priority**: Missing required overlays cause silent failures at startup. This is the
most actionable fix doctor can offer — it unblocks the user immediately.

**Independent Test**: Write a `.superposition.yml` selecting `grafana` without `prometheus`.
Run `doctorCommand`. Assert output contains dependency failure mentioning `prometheus`.

**Acceptance Scenarios**:

1. **Given** a project file with `overlays: [grafana]`, **When** `cs doctor` runs, **Then** a
   `fail` finding reports "`grafana` requires `prometheus` which is not in your project file".
2. **Given** the same setup with `--fix`, **When** doctor runs, **Then** `prometheus` is added
   to the project file and `cs regen` is run automatically; the final check passes.
3. **Given** a project file with `overlays: [grafana, prometheus]`, **When** `cs doctor` runs,
   **Then** the dependencies section shows a pass with no failures.

---

### User Story 2 — Unknown overlay ID caught (P2)

A developer misspells an overlay ID (`nodjs` instead of `nodejs`) in their project file. Doctor
catches it immediately rather than letting it silently be ignored during generation.

**Why this priority**: Typos in the project file produce no error today — the overlay is simply
not applied. Doctor should surface this.

**Independent Test**: Write a `.superposition.yml` with `overlays: [nodjs]`. Run
`doctorCommand`. Assert a `fail` finding mentioning `nodjs` not found in registry.

**Acceptance Scenarios**:

1. **Given** `overlays: [nodjs]` in project file, **When** `cs doctor` runs, **Then** a `fail`
   finding reports "`nodjs` not found in overlay registry — check for typos".
2. **Given** `overlays: [nodejs]`, **When** `cs doctor` runs, **Then** no unknown-overlay
   failure appears.

---

### User Story 3 — Suggestions surfaced as informational (P3)

A user has `postgres` selected. The postgres overlay suggests `prometheus` and `grafana` for
observability. Doctor shows these as soft recommendations, not failures.

**Why this priority**: Suggestions are optional by definition; showing them as warnings without
blocking is a quality-of-life improvement.

**Independent Test**: Write a `.superposition.yml` with `overlays: [postgres]` (postgres
suggests `prometheus`, `grafana`). Run `doctorCommand`. Assert warn-level findings for each
suggestion, no failures.

**Acceptance Scenarios**:

1. **Given** `overlays: [postgres]` (postgres suggests prometheus, grafana), **When** `cs doctor`
   runs, **Then** two `warn` findings appear suggesting prometheus and grafana; no failure.
2. **Given** `overlays: [postgres, prometheus, grafana]`, **When** `cs doctor` runs, **Then** no
   suggestion warnings appear for postgres.

---

### Edge Cases

- Project file with no overlays: return a single pass ("no overlays selected").
- Overlay that requires itself: guard against infinite recursion (not expected but safe to handle).
- `requires:` chain (A requires B which requires C, project has A and C but not B): each missing
  level reported individually.
- Auto-resolved dependencies already in the manifest but not in the project file: not flagged
  (the resolver adds them automatically; this mirrors drift-check behaviour).

## Requirements

### Functional Requirements

- **FR-001**: `checkDependencies()` MUST return `fail` for each overlay in the project file that
  references a non-existent registry ID.
- **FR-002**: `checkDependencies()` MUST return `fail` for each `requires:` entry of a selected
  overlay that is absent from the resolved overlay set.
- **FR-003**: `checkDependencies()` MUST return `warn` for each `suggests:` entry of a selected
  overlay that is absent from the resolved overlay set.
- **FR-004**: `executeDependencyFix()` MUST add missing required overlays to the project file
  and regenerate; it MUST NOT add suggested overlays.
- **FR-005**: Unknown overlay IDs MUST be marked `manual-only` (no auto-fix).
- **FR-006**: The check MUST use the same dependency resolution logic as `composer.ts` (no
  duplication; shared helpers).
- **FR-007**: When no project file is present, the check MUST return an empty result (no noise).

### Key Entities

- **ResolvedOverlaySet**: the set of overlay IDs after implicit dependency resolution — used as
  the reference for missing-dep detection.
- **DependencyFinding**: a `CheckResult` enriched with `sourceOverlay` and `missingOverlay` for
  accurate error messages.

## Dependencies & Impact

- **Affected Areas**: `tool/commands/doctor.ts`, `tool/__tests__/commands.test.ts`, `CHANGELOG.md`
- **Compatibility Impact**: None — purely additive new check category.
- **Required Documentation Updates**: `CHANGELOG.md`
- **Verification Plan**: Unit tests in `commands.test.ts`; manual test with a project file that
  has a real missing dependency.

## Success Criteria

### Measurable Outcomes

- **SC-001**: `cs doctor` on a project file missing a `requires:` dependency reports a `fail`
  within the Dependencies section within the existing doctor runtime (no perceptible extra
  latency).
- **SC-002**: `cs doctor --fix` on the same setup produces a project file with the missing overlay
  added and a passing re-check.
- **SC-003**: `npm test` passes with at least 3 new test cases covering: unknown ID, missing
  required, suggestion warn.
- **SC-004**: No existing doctor tests regress.

## Open Questions

| #   | Question                                                                        | Owner | Resolution                                       |
| --- | ------------------------------------------------------------------------------- | ----- | ------------------------------------------------ |
| 1   | Should transitive `suggests` (suggests of suggests) be surfaced or only direct? | PM    | Pending — lean toward direct only to avoid noise |
| 2   | Should `dependency-fix` add suggested overlays when user passes `--suggest`?    | PM    | Pending                                          |

## Out of Scope

- Changing the dependency resolver in `composer.ts`.
- Validating that `conflicts:` declarations are bidirectional (already covered by `overlay-consistency` agent).
- Surfacing overlay version constraints (overlays don't have versions today).

## Implementation Notes

- `checkDependencies` reads raw YAML as a fallback when `loadProjectConfig` throws for unknown overlay IDs, allowing the check to detect the unknown ID itself.
- Comparison is against `projectFileSet` (the overlay IDs explicitly listed in the project file), not the resolved set — otherwise transitive auto-resolved dependencies would always appear satisfied.
- `suggests` mismatches are surfaced as `warn`; `requires` mismatches as `fail` with `fixable: true` and remediation key `dependency-fix`.
- The Dependencies section in `formatAsText` shows the pass summary alongside any suggestion warnings (i.e., the pass line is shown when there are no `fail` results, even if `warn` results exist).
