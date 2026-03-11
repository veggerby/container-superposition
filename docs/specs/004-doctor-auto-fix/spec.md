# Feature Specification: Doctor Auto-Fix

**Feature Branch**: `004-doctor-auto-fix`  
**Created**: 2026-03-11  
**Status**: Draft  
**Input**: User description: "`doctor` already validates the environment, but the `--fix` path is a placeholder. Auto-fixing common issues (missing Docker, wrong Node version, stale manifest schema) would reduce friction for new users and CI pipelines."

> Use repo-relative Markdown links for repository files. The root `README.md`
> is the only exception and may use package-friendly hosted URLs.

## Review & Approval _(mandatory before implementation)_

- **Spec Path**: `docs/specs/004-doctor-auto-fix/spec.md`
- **Commit Status**: Not Yet Committed
- **Review Status**: Pending Review
- **Implementation Gate**: No implementation code may begin until this spec is
  committed and reviewed.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Repair a blocked development environment (Priority: P1)

As a new or returning user, I want `doctor --fix` to repair common environment
problems automatically so I can continue using the tool without manually
diagnosing setup issues.

**Why this priority**: This is the direct user benefit described in the
request. Reducing setup friction is the primary outcome for adoption.

**Independent Test**: Can be fully tested by introducing a supported
environment problem, running the fix flow, and confirming the tool restores a
usable state or clearly explains what still requires manual action.

**Acceptance Scenarios**:

1. **Given** a user has a supported, fixable environment issue, **When** they
   run `doctor --fix`, **Then** the tool repairs the issue and reports the
   successful remediation steps in user-facing language.
2. **Given** a user has no fixable environment issues, **When** they run
   `doctor --fix`, **Then** the tool completes without changing the environment
   and explains that no remediation was needed.

---

### User Story 2 - Recover CI and scripted workflows quickly (Priority: P2)

As a maintainer running validation in CI or automation, I want the fix flow to
handle common repairable problems consistently so environment drift causes fewer
failed runs and less manual intervention.

**Why this priority**: Automated workflows are a high-frequency use case, but
they depend on the core remediation behavior defined in the first story.

**Independent Test**: Can be fully tested by running the diagnostic and fix
flow in a scripted environment with known repairable failures and verifying that
the final outcome is deterministic and clearly reported.

**Acceptance Scenarios**:

1. **Given** an automated workflow encounters a supported issue such as an
   incompatible runtime version or stale project metadata, **When** the fix flow
   runs, **Then** the workflow receives a clear success or failure outcome for
   each attempted remediation.
2. **Given** multiple repairable issues are present, **When** the fix flow
   executes, **Then** the user receives an ordered summary showing which issues
   were fixed, which were skipped, and which still need manual action.

---

### User Story 3 - Understand the safety boundaries of automatic fixes (Priority: P3)

As a user running environment repair, I want to know what the tool will and
will not change so I can trust the fix flow and avoid unexpected modifications.

**Why this priority**: Trust and clarity matter for adoption, but they build on
top of the core ability to repair environments.

**Independent Test**: Can be fully tested by reviewing the fix guidance and
running the command against supported and unsupported issues to confirm that the
tool communicates boundaries before and after changes.

**Acceptance Scenarios**:

1. **Given** a detected issue can be repaired automatically, **When** the user
   runs the fix flow, **Then** the tool communicates the planned remediation in
   a way that makes the expected change understandable.
2. **Given** a detected issue cannot be repaired automatically, **When** the
   fix flow completes, **Then** the tool leaves the environment unchanged for
   that issue and provides actionable manual next steps.

### Edge Cases

- What happens when the environment has a mix of fixable and non-fixable
  validation failures?
- How does the system behave when automatic repair requires permissions or
  system capabilities that are unavailable in the current environment?
- What happens when the fix flow encounters partially updated project metadata
  from an interrupted earlier run?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST provide a working `doctor --fix` flow that
  attempts remediation for supported environment issues detected by the doctor
  command.
- **FR-002**: The system MUST define and document the set of environment issues
  that are eligible for automatic repair in the initial release scope,
  including missing container tooling, incompatible runtime versions, and stale
  project metadata.
- **FR-003**: The system MUST attempt automatic remediation only for issues that
  are explicitly classified as safe and supported for unattended repair.
- **FR-004**: The system MUST leave unsupported or unsafe issues unchanged and
  provide clear manual remediation guidance for those cases.
- **FR-005**: The system MUST report the outcome of each detected issue as one
  of: fixed, already compliant, skipped, or requires manual action.
- **FR-006**: The system MUST preserve existing diagnostic behavior for users
  who run doctor without the fix option.
- **FR-007**: The system MUST behave predictably when multiple fixable issues
  are present, including a stable remediation order and a final summary of
  outcomes.
- **FR-008**: The system MUST avoid leaving project metadata in a partially
  repaired state if a fix attempt is interrupted or fails.
- **FR-009**: Users MUST be able to understand what the fix flow changed and
  what, if anything, still requires manual follow-up.
- **FR-010**: The system MUST support use in automated workflows by returning a
  result that distinguishes successful repair from unresolved failures.
- **FR-011**: The system MUST provide documentation describing when to use the
  fix flow, what changes it may make, and what limitations apply.

### Assumptions

- Automatic remediation is limited to issues the project can repair with a
  high-confidence, low-surprise outcome.
- Users expect the fix flow to prioritize restoring a usable environment over
  performing optional optimizations or preference-based changes.
- The initial scope focuses on common onboarding and CI blockers rather than
  every possible host-environment failure.

### Key Entities _(include if feature involves data)_

- **Diagnostic Finding**: A detected environment problem or compliant check
  result that the doctor command reports to the user.
- **Remediation Action**: A supported automatic repair step associated with a
  specific diagnostic finding and an expected outcome.
- **Fix Outcome Summary**: The user-facing record of what issues were fixed,
  skipped, already compliant, or left for manual resolution.

## Dependencies & Impact _(mandatory)_

- **Affected Areas**: CLI commands, diagnostic workflows, environment setup
  guidance, generated/project metadata validation, documentation, CHANGELOG.md
- **Compatibility Impact**: Backward compatible
- **Required Documentation Updates**: README, doctor command docs, onboarding or
  troubleshooting docs, CHANGELOG.md
- **Verification Plan**: Unit tests for remediation classification and outcome
  reporting, integration tests for representative repair flows, manual
  validation for onboarding scenarios, and scripted validation for CI-oriented
  flows

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At least 85% of supported onboarding environment failures covered
  by the release scope can be resolved by running the fix flow once without
  requiring manual diagnosis.
- **SC-002**: In validation runs for in-scope repair scenarios, 100% of fix
  attempts produce a clear final outcome stating whether each issue was fixed,
  skipped, already compliant, or still requires manual action.
- **SC-003**: At least 90% of users testing the feature can restore a usable
  local environment from a supported failure state in under 10 minutes using the
  documented fix flow.
- **SC-004**: CI or scripted runs affected by in-scope, repairable environment
  issues experience at least a 50% reduction in failures requiring manual
  intervention within one release cycle after launch.
