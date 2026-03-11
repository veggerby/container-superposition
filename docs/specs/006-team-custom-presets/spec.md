# Feature Specification: Team Custom Presets

**Feature Branch**: `006-team-custom-presets`  
**Created**: 2026-03-11  
**Status**: Draft  
**Input**: User description: "The preset system is shipped and parameterized, but teams"

> Use repo-relative Markdown links for repository files. The root `README.md`
> is the only exception and may use package-friendly hosted URLs.

## Review & Approval _(mandatory before implementation)_

- **Spec Path**: `docs/specs/006-team-custom-presets/spec.md`
- **Commit Status**: Committed
- **Review Status**: Pending Review
- **Implementation Gate**: No implementation code may begin until this spec is committed and reviewed.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Define a team preset once and reuse it (Priority: P1)

A team maintainer defines a reusable preset that captures the team's preferred stack, required capabilities, and the high-level choices developers are allowed to make, so new projects start from the same baseline without recreating overlay selections manually.

**Why this priority**: The main business value is standardization. If teams cannot define their own reusable preset, they remain limited to shipped presets or one-off manual selection.

**Independent Test**: Can be fully tested by creating one team-managed preset, starting a new project from it, and confirming the generated plan reflects the team's baseline choices without requiring manual overlay reconstruction.

**Acceptance Scenarios**:

1. **Given** a team has defined a reusable preset for its standard stack, **When** a maintainer starts a new environment from that preset, **Then** the preset's required capabilities are preselected as the team's baseline.
2. **Given** a team-managed preset offers approved high-level choices, **When** a maintainer selects one of those choices, **Then** the resulting plan reflects the chosen variant while preserving the rest of the team baseline.

---

### User Story 2 - Let developers consume team presets with the same ease as shipped presets (Priority: P2)

A developer discovers a team-managed preset during setup and can choose it the same way they would choose a built-in preset, so adopting the team standard does not require reading internal preset files or memorizing overlay combinations.

**Why this priority**: Reuse only works if the consumer experience is simple. Teams gain little from custom presets if developers still need to understand the underlying composition details.

**Independent Test**: Can be fully tested by presenting both shipped and team-managed presets during setup and confirming a developer can choose the team preset and complete setup without manual overlay selection.

**Acceptance Scenarios**:

1. **Given** a repository provides one or more team-managed presets, **When** a developer enters the setup flow, **Then** the available team presets are visible alongside the built-in choices with enough description to make a selection.
2. **Given** a developer selects a team-managed preset, **When** setup finishes, **Then** the resulting environment records which preset was used and any choices that were made so the result can be reproduced.

---

### User Story 3 - Keep team preset usage safe and understandable over time (Priority: P3)

A maintainer or developer can tell when a team-managed preset is incomplete, invalid, or no longer compatible with the requested environment, so the team does not silently generate broken standards.

**Why this priority**: Team-owned configuration increases flexibility, but it also increases the risk of drift and invalid definitions. Safe failure is necessary for trust.

**Independent Test**: Can be fully tested by attempting to use an invalid or incompatible team-managed preset and confirming the user receives a clear explanation and no misleading partial result.

**Acceptance Scenarios**:

1. **Given** a team-managed preset references unsupported or conflicting capabilities, **When** a user tries to use it, **Then** the system stops and explains the issue in terms the user can act on.
2. **Given** a team-managed preset is missing required descriptive or selection data, **When** the preset is discovered or selected, **Then** the system identifies it as invalid instead of presenting it as a normal reusable option.

### Edge Cases

- A repository contains both a team-managed preset and a shipped preset with similar names, and users must be able to distinguish which one they are selecting.
- A team-managed preset is present but is not compatible with the current base stack, and it must not be offered as if it were selectable.
- A team-managed preset extends business rules through high-level choices, and a user-provided choice falls outside the allowed set.
- A previously generated project references a team-managed preset that has since been removed or renamed, and users must be told how that affects reproducibility.
- Multiple team-managed presets exist in the same repository, and users must be able to identify the intended one without inspecting raw configuration files.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST allow a team to define reusable team-managed presets in project-controlled configuration rather than limiting reusable presets to shipped definitions only.
- **FR-002**: A team-managed preset MUST be able to declare a reusable baseline of required capabilities for a supported environment type.
- **FR-003**: A team-managed preset MUST be able to offer approved high-level parameter choices so teams can standardize variants without requiring developers to choose individual capabilities manually.
- **FR-004**: During setup and preview workflows, the system MUST surface valid team-managed presets as selectable options in the same user journey as shipped presets.
- **FR-005**: The system MUST clearly identify whether a selectable preset is team-managed or shipped so users can distinguish organization-specific standards from built-in presets.
- **FR-006**: When a user selects a team-managed preset, the system MUST apply the preset baseline and the chosen parameter values consistently across the resulting environment plan and generated project metadata.
- **FR-007**: The system MUST record the selected team-managed preset identity and any selected parameter values so the resulting environment can be reproduced later.
- **FR-008**: The system MUST validate team-managed presets before use and MUST reject presets that are incomplete, invalid, internally conflicting, or incompatible with the requested environment type.
- **FR-009**: When a team-managed preset cannot be used, the system MUST provide a clear, actionable explanation and MUST NOT continue with a misleading partial preset result.
- **FR-010**: Teams MUST be able to maintain more than one team-managed preset in a repository so different approved starting points can coexist.
- **FR-011**: Team-managed presets MUST remain optional; users who do not want them must still be able to proceed with shipped presets or manual composition.
- **FR-012**: Documentation and discovery guidance MUST explain how teams define, choose, and maintain team-managed presets as part of the standard team workflow.

### Key Entities _(include if feature involves data)_

- **Team-Managed Preset**: A reusable team-owned environment definition that expresses a standard starting point, supported environment scope, descriptive metadata, and approved configuration choices.
- **Preset Parameter Choice**: A named high-level option within a preset that allows a user to select among approved variants while staying inside the team standard.
- **Preset Selection Record**: The reproducible record of which preset was chosen and which parameter values were selected for a generated environment.

## Assumptions

- Teams want the same general preset experience they already have with shipped presets, but with ownership inside their own repository or workflow.
- Team-managed presets should support existing team-standardization workflows rather than replacing manual composition entirely.
- Reproducibility matters for both first-time setup and later regeneration or review of the environment definition.
- Invalid team-managed presets should fail early and clearly instead of being partially applied.

## Dependencies & Impact _(mandatory)_

- **Affected Areas**: Preset discovery and selection flows, team workflow documentation, manifest or generated metadata, validation rules, preview and generation workflows, CHANGELOG.md
- **Compatibility Impact**: Backward compatible
- **Required Documentation Updates**: README.md, `docs/presets.md`, `docs/team-workflow.md`, CHANGELOG.md
- **Verification Plan**: Acceptance tests for defining and selecting team-managed presets, validation tests for invalid and incompatible presets, regression tests for shipped preset and manual workflows, and manual verification of reproducibility records

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In acceptance testing, a team can define at least two distinct reusable presets and successfully start environments from each without manually rebuilding the underlying capability selection.
- **SC-002**: In guided setup testing, at least 90% of developers can select the correct team-managed preset and complete setup on their first attempt without consulting raw configuration files.
- **SC-003**: In reproducibility testing, 100% of environments created from a team-managed preset retain enough selection information for a reviewer to identify the preset used and the parameter values chosen.
- **SC-004**: In validation testing, 100% of invalid or incompatible team-managed presets are rejected before environment generation begins, with an actionable explanation shown to the user.
- **SC-005**: Existing shipped preset and manual composition workflows continue to pass their current acceptance coverage with no new required steps for users who do not adopt team-managed presets.
