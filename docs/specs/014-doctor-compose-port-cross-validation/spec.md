# Feature Specification: Doctor Compose / Port Cross-Validation

**Spec ID**: `014-doctor-compose-port-cross-validation`
**Taxonomy**: `CLI-UX`
**Created**: 2026-04-24
**Author**: PM Agent
**Status**: Draft
**Input**: Feature assessment — `cs doctor` does not cross-check that ports declared in `devcontainer.json` `forwardPorts` match ports actually exposed by Docker Compose services, nor that compose service ports are accessible through the devcontainer configuration.

## Problem Statement

`cs doctor` already checks that individual overlay port declarations do not collide, but it never
verifies cross-file consistency: a port that is `EXPOSE`d or bound in `docker-compose.yml` may be
absent from `devcontainer.json` `forwardPorts` (making it inaccessible from the host), or
`forwardPorts` may list a port that no compose service actually exposes (dead entry). These
mismatches are invisible until the developer tries to connect to a service and finds it
unreachable or wonders why a port they never requested is being forwarded.

## Goals

- Detect ports in `devcontainer.json` `forwardPorts` that do not correspond to any exposed port
  across the compose services in `docker-compose.yml`.
- Detect ports exposed by compose services that are absent from `forwardPorts` (informational
  warning, not a hard failure — some ports are intentionally internal).
- Operate on the generated output files, not the overlay sources, so the check reflects the
  actual composed result.

## Non-Goals

- Checking that ports are not in use on the host machine at doctor-run time (that is a runtime
  concern, not a configuration concern).
- Modifying the port allocation algorithm in `composer.ts`.
- Detecting intra-container port conflicts between services (already handled by the port
  uniqueness check during composition).
- Auto-fixing missing `forwardPorts` entries — the right fix is a `cs regen` once overlays are
  corrected; port additions require overlay-level decisions.

## Design

### Port cross-validation check

`checkPortCrossValidation(outputPath)` is a new synchronous function in
`tool/commands/doctor.ts`. It operates on the generated output directory and returns
`CheckResult[]`.

**Early return**: if there is no `docker-compose.yml` in `outputPath` (plain devcontainer stack),
return a single pass ("No compose stack — port cross-validation skipped").

**Step 1 — Collect forwarded ports**

Parse `devcontainer.json` from `outputPath`. Extract `forwardPorts` array. Each entry may be a
bare port number, a `"host:container"` string, or a `"container/proto"` string. Normalise to the
integer container port. If `devcontainer.json` has no `forwardPorts` key, treat as empty array.

**Step 2 — Collect exposed compose ports**

Parse `docker-compose.yml` from `outputPath`. For each service, collect:

- `ports:` entries (short form `"host:container"`, `"container"`, `"host:container/proto"`; long
  form object with `target`). Normalise to the integer container (target) port.
- `expose:` entries (container-internal; not host-forwarded but still reachable within the
  devcontainer network).

Build two sets:
- `boundPorts` — ports present in `ports:` (host-forwarded)
- `exposedPorts` — ports present in `expose:` only (container-internal)

**Step 3 — Cross-check**

1. For each port in `forwardPorts`: if it is not in `boundPorts ∪ exposedPorts` →
   **fail** ("Port `<N>` is listed in `forwardPorts` but is not exposed by any compose service").
2. For each port in `boundPorts` that is not in `forwardPorts` →
   **warn** ("Port `<N>` is bound by a compose service but is not in `forwardPorts` — it may be
   inaccessible from the host").
3. `exposedPorts`-only entries that are absent from `forwardPorts` are **not** reported (internal
   communication is intentional).

Pass check message: "`N` forwarded port(s) all match compose service declarations."

### Fix eligibility

Port cross-validation findings are **not auto-fixable** (`manual-only`). The correct resolution
is to edit the overlay's `devcontainer.patch.json` or run `cs regen` after fixing the overlay.
Both unknown forwarded ports (typos) and missing `forwardPorts` (coverage gaps) require the
developer to make an intentional decision.

### DoctorReport changes

`DoctorReport` gains a `portCrossValidation: CheckResult[]` field.

`generateReport()` gains a `portCrossValidationChecks` parameter.

`formatAsText()` gains a "Port Cross-Validation" section that shows only failures and warnings;
the section is suppressed entirely if all checks pass (matching the conventions for the
`dependencies` and `parameters` sections).

`reportToFindings()` adds:
```typescript
...checksToFindings(report.portCrossValidation, 'ports', 'full'),
```

`executeFixRun()` calls `checkPortCrossValidation()` in the re-check pass.

`doctorCommand()` calls `checkPortCrossValidation(outputPath)` and passes results to
`generateReport()`.

### Port normalisation rules

The normalisation helper `parseContainerPort(entry: string | number): number | null` extracts
the container-side port from any `ports:` or `forwardPorts:` entry format:

| Input                  | Result |
| ---------------------- | ------ |
| `5432`                 | `5432` |
| `"5432"`               | `5432` |
| `"5432/tcp"`           | `5432` |
| `"5433:5432"`          | `5432` |
| `"5433:5432/tcp"`      | `5432` |
| `{ target: 5432 }`     | `5432` |
| `"0.0.0.0:5433:5432"`  | `5432` |

Returns `null` for unparseable entries (log a warning, skip the entry).

### Affected files

| File                              | Change                                                         |
| --------------------------------- | -------------------------------------------------------------- |
| `tool/commands/doctor.ts`         | Add `checkPortCrossValidation()`, `parseContainerPort()`, wire into report infrastructure, `PRIORITY` map |
| `tool/__tests__/commands.test.ts` | Tests for: no compose stack (skip), matching ports (pass), forward-only port (fail), bound-only port (warn), mixed scenario |
| `CHANGELOG.md`                    | Entry under `### Added`                                        |

### User-visible behaviour

```
Port Cross-Validation:
  ✗ Port 9090 is listed in forwardPorts but is not exposed by any compose service
    → Remove port 9090 from forwardPorts or add it to a compose service
  ⚠ Port 5432 is bound by postgres service but is not in forwardPorts — it may be inaccessible
    → Add 5432 to forwardPorts in your overlay's devcontainer.patch.json, then run cs regen
  ✓ Port 6379 (redis): forwarded and exposed — OK
```

### Backward compatibility

No changes to generated files or project file format. Purely additive check on existing output.

## User Scenarios & Testing

### User Story 1 — Stale `forwardPorts` entry caught (P1)

A developer removed the `prometheus` overlay from their project but `forwardPorts` retained
port `9090`. Doctor now flags the orphaned entry instead of silently forwarding a port to
nowhere.

**Why this priority**: A `forwardPorts` entry with no backing service is confusing and indicates
an inconsistent configuration. It is the clearest actionable signal.

**Independent Test**: Write a `devcontainer.json` with `forwardPorts: [9090]` and a
`docker-compose.yml` with no service exposing 9090. Run `doctorCommand`. Assert `fail` finding
mentioning port 9090 not exposed by any service.

**Acceptance Scenarios**:

1. **Given** `forwardPorts: [9090]` and no compose service exposes 9090, **When** `cs doctor`
   runs, **Then** a `fail` finding reports "Port 9090 is listed in forwardPorts but is not
   exposed by any compose service".
2. **Given** `forwardPorts: [5432]` and postgres exposes `5432`, **When** `cs doctor` runs,
   **Then** no failure is reported for port 5432.

---

### User Story 2 — Silently inaccessible compose port flagged (P2)

A developer composed `redis` and `postgres` but their devcontainer patch never added the postgres
port to `forwardPorts`. Doctor warns them that port 5432 is bound but not forwarded.

**Why this priority**: Missing `forwardPorts` is easy to overlook and causes "connection refused"
errors that are hard to diagnose without knowing about `forwardPorts`.

**Independent Test**: Write a `docker-compose.yml` with postgres exposing port `5432` on the
host. Write a `devcontainer.json` with `forwardPorts: [6379]`. Run `doctorCommand`. Assert
a `warn` finding for port 5432.

**Acceptance Scenarios**:

1. **Given** postgres exposes host port 5432 and `forwardPorts` does not include 5432, **When**
   `cs doctor` runs, **Then** a `warn` finding reports port 5432 not in `forwardPorts`.
2. **Given** all compose ports are also in `forwardPorts`, **When** `cs doctor` runs, **Then**
   the port cross-validation section is suppressed (all pass).

---

### User Story 3 — Plain devcontainer stack skipped (P3)

A developer uses a plain devcontainer (no Docker Compose). Doctor skips port cross-validation
gracefully.

**Acceptance Scenarios**:

1. **Given** no `docker-compose.yml` in the output directory, **When** `cs doctor` runs, **Then**
   port cross-validation returns a single pass and the section is suppressed in text output.

---

### Edge Cases

- `forwardPorts` absent from `devcontainer.json`: treated as empty — warn for every bound port.
- Compose service with only `expose:` (not `ports:`): not warned if absent from `forwardPorts`
  (intentionally container-internal).
- Port `0` or invalid port entries: skip with a debug trace, do not report as a failure.
- Compose file not parseable: return a single `fail` ("Could not parse docker-compose.yml for
  port cross-validation — file may be malformed").

## Requirements

### Functional Requirements

- **FR-001**: `checkPortCrossValidation()` MUST return `fail` for each port in `forwardPorts`
  that is not in the set of ports declared in the compose `ports:` or `expose:` blocks.
- **FR-002**: `checkPortCrossValidation()` MUST return `warn` for each port in compose `ports:`
  blocks that is absent from `forwardPorts`.
- **FR-003**: Ports present only in compose `expose:` blocks (not `ports:`) MUST NOT generate
  a warning if absent from `forwardPorts`.
- **FR-004**: When no `docker-compose.yml` is present in the output directory, the check MUST
  return a single pass and generate no findings.
- **FR-005**: The check MUST support all `ports:` entry formats (short string, long object,
  IP-prefixed) using `parseContainerPort()`.
- **FR-006**: Findings MUST be marked `manual-only` (no auto-fix).

### Key Entities

- **`boundPorts`**: set of integer container ports declared in compose `ports:` blocks (host-accessible).
- **`exposedPorts`**: set of integer container ports declared in compose `expose:` blocks only.
- **`forwardedPorts`**: set of integer ports from `devcontainer.json` `forwardPorts`.

## Dependencies & Impact

- **Affected Areas**: `tool/commands/doctor.ts`, `tool/__tests__/commands.test.ts`, `CHANGELOG.md`
- **Compatibility Impact**: None — purely additive check category.
- **Required Documentation Updates**: `CHANGELOG.md`
- **Verification Plan**: Unit tests in `commands.test.ts`; manual test with a real compose-based
  project file.

## Success Criteria

### Measurable Outcomes

- **SC-001**: `cs doctor` on an output directory where `forwardPorts` contains a port not in any
  compose service reports a `fail` within the Port Cross-Validation section.
- **SC-002**: `cs doctor` on a plain devcontainer (no `docker-compose.yml`) produces no output
  in the Port Cross-Validation section.
- **SC-003**: `npm test` passes with at least 3 new test cases covering: no compose stack, stale
  forwarded port, missing forwarded port.
- **SC-004**: No existing doctor tests regress.

## Open Questions

| #   | Question                                                                              | Owner | Resolution |
| --- | ------------------------------------------------------------------------------------- | ----- | ---------- |
| 1   | Should bound-but-not-forwarded ports be `warn` or `info`? Both options are defensible | PM    | Pending — lean toward `warn` to surface it visibly |
| 2   | Should `--fix` add missing `forwardPorts` entries by patching the project file?       | PM    | Pending — deferred; unclear which overlay owns the port |

## Out of Scope

- Checking host-side port availability at runtime.
- Modifying how `composer.ts` generates `forwardPorts`.
- Validating that overlay-level port declarations match compose file declarations (that is the
  overlay-reviewer agent's job).
