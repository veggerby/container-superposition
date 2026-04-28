# Feature Specification: Verbose Plan Graph

**Spec ID**: `001-verbose-plan-graph`
**Created**: 2026-03-10  
**Status**: Final  
**Input**: User description: "Extend the plan command with a --verbose flag that narrates the dependency resolution graph — explaining why each overlay was included, not just what was included. The principle: nothing here is magic. Scope update: it should also be possible to run plan including --verbose on an existing manifest."

## User Scenarios & Testing

### User Story 1 - Explain auto-included overlays (Priority: P1)

A user previews a stack and wants to understand why extra overlays appear in the plan so they can trust the result before generating files.

**Why this priority**: The plan command is a decision aid. If users cannot see why dependencies were added, they cannot confidently approve the generated setup.

**Independent Test**: Can be fully tested by running `plan` with one overlay that causes at least one dependency to be included and confirming the verbose output explains each included overlay and its reason.

**Acceptance Scenarios**:

1. **Given** a user requests a plan with an overlay that requires another overlay, **When** the user adds `--verbose`, **Then** the plan explains that the requested overlay was included by user choice and the dependency was included because it is required by that overlay.
2. **Given** a dependency is included through more than one path, **When** the user adds `--verbose`, **Then** the plan shows all relevant parent reasons without duplicating the included overlay entry.

---

### User Story 2 - Explain plans loaded from a manifest (Priority: P2)

A user reviews an existing `superposition.json` manifest and wants the same verbose dependency narration without re-entering overlay selections manually.

**Why this priority**: Manifest-driven workflows are already part of the product. Verbose explanation should work there too, or users will get different levels of transparency depending on how they invoke the plan.

**Independent Test**: Can be fully tested by running `plan` from an existing manifest with `--verbose` and confirming the explanation covers the manifest-defined overlays and any resolved dependencies.

**Acceptance Scenarios**:

1. **Given** a user runs the plan from an existing manifest, **When** the user adds `--verbose`, **Then** the plan explains why each overlay in the manifest-driven result was included using the same reasoning model as direct overlay selection.
2. **Given** the manifest includes overlays that produce required dependencies, **When** the user adds `--verbose`, **Then** the plan explains both the manifest-defined overlays and the auto-included dependencies without requiring duplicate manual input.

---

### User Story 3 - Trace the full dependency path (Priority: P3)

A user wants to follow the dependency chain from requested overlays to transitive dependencies so they can review complex plans without guessing how the final set was derived.

**Why this priority**: Complex overlay combinations are harder to validate by inspection. Showing the chain reduces confusion and makes the tool easier to audit.

**Independent Test**: Can be fully tested by running `plan --verbose` with overlays that produce a multi-step dependency chain and verifying the explanation identifies each step in the chain.

**Acceptance Scenarios**:

1. **Given** a requested overlay leads to a transitive dependency chain, **When** the user adds `--verbose`, **Then** the plan narrates the chain in request-to-dependency order.
2. **Given** multiple requested overlays are resolved in one plan, **When** the user adds `--verbose`, **Then** the explanation groups or orders the reasoning so a user can tell which requested overlays caused each dependency.

---

### User Story 4 - Preserve concise output when not needed (Priority: P4)

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
- A user attempts to plan from a missing or invalid manifest and the command must fail with a clear message instead of producing incomplete verbose explanation output.

## Requirements

### Functional Requirements

- **FR-001**: The plan command MUST accept a `--verbose` option that adds a narrative explanation of dependency resolution to the plan result.
- **FR-002**: When `--verbose` is present, the plan MUST explain why every included overlay appears in the final plan, including whether it was requested directly or added as a dependency.
- **FR-003**: When an included overlay was added because another overlay required it, the plan MUST identify the parent overlay or overlays that caused that inclusion.
- **FR-004**: When dependency resolution includes transitive dependencies, the plan MUST present the explanation as a traceable chain from the user-requested overlays to each transitive inclusion.
- **FR-005**: The plan MUST avoid duplicate final inclusion entries when the same dependency is reached through multiple paths while still preserving all relevant reasons for its inclusion.
- **FR-006**: When dependency resolution cannot complete because of conflicts, unsupported combinations, or invalid overlay selections, the verbose output MUST explain the point of failure and the reason the plan cannot proceed.
- **FR-007**: When the plan command is run from an existing `superposition.json` manifest, `--verbose` MUST provide the same dependency explanation coverage as overlay-list-driven planning.
- **FR-008**: When manifest-driven planning fails because the manifest is missing, invalid, or references invalid overlays, the command MUST produce a clear failure message and MUST NOT produce misleading partial verbose results.
- **FR-009**: When `--verbose` is not present, the plan command MUST preserve the existing concise behavior and must not require users to read dependency narration.
- **FR-010**: When the plan is requested in structured output mode together with `--verbose`, the inclusion reasons MUST be available in the structured result in a form that distinguishes direct selections from dependency-driven selections.
- **FR-011**: The explanation produced by `--verbose` MUST use the same resolved overlay set as the standard plan summary so users never see contradictory inclusion results between concise and verbose views.

### Key Entities _(include if feature involves data)_

- **Plan Request**: A user's preview request, including the chosen stack, selected overlays, and optional output flags that affect how the plan is presented.
- **Manifest-Based Plan Request**: A preview request loaded from an existing `superposition.json` manifest instead of explicit overlay flags, while preserving the same user-visible planning semantics.
- **Overlay Inclusion Reason**: A user-visible explanation describing why one overlay appears in the final plan, including whether it was directly requested, required by another overlay, or reached transitively through earlier inclusions.
- **Dependency Path**: The ordered relationship from one or more user-requested overlays through intermediate requirements to a final included overlay.

## Assumptions

- Users expect `--verbose` to add explanation only, not to change dependency resolution rules or the final set of included overlays.
- The same explainability data should be available to both human readers and scripted consumers when they explicitly request verbose output.
- Existing conflict and validation behavior remains in scope; this feature only expands how the reasoning is presented.
- Existing manifest-driven workflows should use the same explanation model as direct overlay selection rather than introducing a separate reasoning format.

## Dependencies & Impact

- **Affected Areas**: CLI command behavior, manifest-driven planning workflows, plan output, discovery documentation, CHANGELOG.md, automated tests
- **Compatibility Impact**: Backward compatible
- **Required Documentation Updates**: README.md, discovery command documentation, CHANGELOG.md
- **Verification Plan**: Unit tests for inclusion-reason reporting, command-level tests for verbose and non-verbose output, manifest-driven planning validation, and manual validation with direct, transitive, duplicate-path, manifest, and failure scenarios

## Success Criteria

### Measurable Outcomes

- **SC-001**: In review testing, 100% of overlays shown in a verbose plan include an explicit human-readable reason for inclusion.
- **SC-002**: Users can run a verbose plan from an existing manifest and receive the same class of inclusion explanations as they do from direct overlay selection in 100% of acceptance scenarios.
- **SC-003**: For plans with transitive dependencies, reviewers can identify the full inclusion chain for each dependency in under 30 seconds without consulting source code or overlay manifests.
- **SC-004**: In acceptance testing across representative plan scenarios, at least 90% of users correctly distinguish direct selections from auto-included dependencies after reading a single verbose plan output.
- **SC-005**: Running the plan command without `--verbose` continues to present the concise summary with no additional explanation sections in 100% of regression test cases.
