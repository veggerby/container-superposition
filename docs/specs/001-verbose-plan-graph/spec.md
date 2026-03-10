# Feature Specification: Verbose Plan Graph

**Feature Branch**: `001-verbose-plan-graph`  
**Created**: 2026-03-10  
**Status**: Draft  
**Input**: User description: "Extend the plan command with a --verbose flag that narrates the dependency resolution graph — explaining why each overlay was included, not just what was included. The principle: nothing here is magic."

## Review & Approval *(mandatory before implementation)*

- **Spec Path**: `docs/specs/001-verbose-plan-graph/spec.md`
- **Commit Status**: Not Yet Committed
- **Review Status**: Pending Review
- **Implementation Gate**: No implementation code may begin until this spec is committed and reviewed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explain auto-included overlays (Priority: P1)

A user previews a stack and wants to understand why extra overlays appear in the plan so they can trust the result before generating files.

**Why this priority**: The plan command is a decision aid. If users cannot see why dependencies were added, they cannot confidently approve the generated setup.

**Independent Test**: Can be fully tested by running `plan` with one overlay that causes at least one dependency to be included and confirming the verbose output explains each included overlay and its reason.

**Acceptance Scenarios**:

1. **Given** a user requests a plan with an overlay that requires another overlay, **When** the user adds `--verbose`, **Then** the plan explains that the requested overlay was included by user choice and the dependency was included because it is required by that overlay.
2. **Given** a dependency is included through more than one path, **When** the user adds `--verbose`, **Then** the plan shows all relevant parent reasons without duplicating the included overlay entry.

---

### User Story 2 - Trace the full dependency path (Priority: P2)

A user wants to follow the dependency chain from requested overlays to transitive dependencies so they can review complex plans without guessing how the final set was derived.

**Why this priority**: Complex overlay combinations are harder to validate by inspection. Showing the chain reduces confusion and makes the tool easier to audit.

**Independent Test**: Can be fully tested by running `plan --verbose` with overlays that produce a multi-step dependency chain and verifying the explanation identifies each step in the chain.

**Acceptance Scenarios**:

1. **Given** a requested overlay leads to a transitive dependency chain, **When** the user adds `--verbose`, **Then** the plan narrates the chain in request-to-dependency order.
2. **Given** multiple requested overlays are resolved in one plan, **When** the user adds `--verbose`, **Then** the explanation groups or orders the reasoning so a user can tell which requested overlays caused each dependency.

---

### User Story 3 - Preserve concise output when not needed (Priority: P3)

A user who only wants a quick summary should still be able to run the plan command without additional explanation noise.

**Why this priority**: The new explainability mode should add transparency without making the default workflow slower to scan.

**Independent Test**: Can be fully tested by comparing plan output with and without `--verbose` and confirming that explanation content appears only when explicitly requested.

**Acceptance Scenarios**:

1. **Given** a user runs the plan command without `--verbose`, **When** the plan is displayed, **Then** the command shows the existing summary output without dependency narration.
2. **Given** a user consumes the plan in structured output mode, **When** `--verbose` is present, **Then** the inclusion reasons are available in the structured result in addition to the standard plan data.

### Edge Cases

- A requested overlay has no dependencies and should still be explained as user-selected when `--verbose` is used.
- A dependency is required by multiple requested overlays and the explanation must show all contributing reasons without repeating the dependency as separate final selections.
- Dependency resolution stops because of a conflict or unsupported combination and the verbose output must clearly identify the last successful inclusion and the reason resolution could not continue.
- The user requests an invalid or unknown overlay and the plan must fail with a clear message instead of producing partial explanation data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The plan command MUST accept a `--verbose` option that adds a narrative explanation of dependency resolution to the plan result.
- **FR-002**: When `--verbose` is present, the plan MUST explain why every included overlay appears in the final plan, including whether it was requested directly or added as a dependency.
- **FR-003**: When an included overlay was added because another overlay required it, the plan MUST identify the parent overlay or overlays that caused that inclusion.
- **FR-004**: When dependency resolution includes transitive dependencies, the plan MUST present the explanation as a traceable chain from the user-requested overlays to each transitive inclusion.
- **FR-005**: The plan MUST avoid duplicate final inclusion entries when the same dependency is reached through multiple paths while still preserving all relevant reasons for its inclusion.
- **FR-006**: When dependency resolution cannot complete because of conflicts, unsupported combinations, or invalid overlay selections, the verbose output MUST explain the point of failure and the reason the plan cannot proceed.
- **FR-007**: When `--verbose` is not present, the plan command MUST preserve the existing concise behavior and must not require users to read dependency narration.
- **FR-008**: When the plan is requested in structured output mode together with `--verbose`, the inclusion reasons MUST be available in the structured result in a form that distinguishes direct selections from dependency-driven selections.
- **FR-009**: The explanation produced by `--verbose` MUST use the same resolved overlay set as the standard plan summary so users never see contradictory inclusion results between concise and verbose views.

### Key Entities *(include if feature involves data)*

- **Plan Request**: A user's preview request, including the chosen stack, selected overlays, and optional output flags that affect how the plan is presented.
- **Overlay Inclusion Reason**: A user-visible explanation describing why one overlay appears in the final plan, including whether it was directly requested, required by another overlay, or reached transitively through earlier inclusions.
- **Dependency Path**: The ordered relationship from one or more user-requested overlays through intermediate requirements to a final included overlay.

## Assumptions

- Users expect `--verbose` to add explanation only, not to change dependency resolution rules or the final set of included overlays.
- The same explainability data should be available to both human readers and scripted consumers when they explicitly request verbose output.
- Existing conflict and validation behavior remains in scope; this feature only expands how the reasoning is presented.

## Dependencies & Impact *(mandatory)*

- **Affected Areas**: CLI command behavior, plan output, discovery documentation, CHANGELOG.md, automated tests
- **Compatibility Impact**: Backward compatible
- **Required Documentation Updates**: README.md, discovery command documentation, CHANGELOG.md
- **Verification Plan**: Unit tests for inclusion-reason reporting, command-level tests for verbose and non-verbose output, manual validation with direct, transitive, duplicate-path, and failure scenarios

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In review testing, 100% of overlays shown in a verbose plan include an explicit human-readable reason for inclusion.
- **SC-002**: For plans with transitive dependencies, reviewers can identify the full inclusion chain for each dependency in under 30 seconds without consulting source code or overlay manifests.
- **SC-003**: In acceptance testing across representative plan scenarios, at least 90% of users correctly distinguish direct selections from auto-included dependencies after reading a single verbose plan output.
- **SC-004**: Running the plan command without `--verbose` continues to present the concise summary with no additional explanation sections in 100% of regression test cases.
