# Feature Specification: Target-Aware Generation

**Feature Branch**: `007-target-aware-generation`  
**Created**: 2026-03-11  
**Status**: Draft  
**Input**: User description: "`--target codespaces|gitpod|devpod` flags exist, but"

> Use repo-relative Markdown links for repository files. The root `README.md`
> is the only exception and may use package-friendly hosted URLs.

## Review & Approval _(mandatory before implementation)_

- **Spec Path**: `docs/specs/007-target-aware-generation/spec.md`
- **Commit Status**: Committed
- **Review Status**: Pending Review
- **Implementation Gate**: No implementation code may begin until this spec is committed and reviewed.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate a workspace that matches the chosen target (Priority: P1)

A user selects a deployment target during generation and expects the produced workspace files to be tailored to that environment rather than only receiving compatibility warnings.

**Why this priority**: The `--target` option is most valuable when it changes the generated result in a meaningful, reliable way for the chosen environment.

**Independent Test**: Can be fully tested by generating the same stack for different targets and confirming that each result includes only the environment-specific guidance and workspace artifacts needed for that target.

**Acceptance Scenarios**:

1. **Given** a user generates a configuration with `--target codespaces`, **When** generation completes, **Then** the output includes target-specific workspace artifacts and guidance for GitHub Codespaces.
2. **Given** a user generates a configuration with `--target gitpod`, **When** generation completes, **Then** the output includes target-specific workspace artifacts and guidance for Gitpod.
3. **Given** a user generates a configuration with `--target devpod`, **When** generation completes, **Then** the output includes target-specific workspace artifacts and guidance for DevPod.

---

### User Story 2 - Preserve one source configuration across targets (Priority: P2)

A user wants to reuse the same high-level stack choices for multiple development environments without manually editing generated files after each run.

**Why this priority**: Multi-environment teams need predictable output from the same input choices so they can support local and hosted workspace options without manual rework.

**Independent Test**: Can be fully tested by generating equivalent configurations for at least two targets from the same selected overlays and confirming the user does not need manual file edits to begin using either result.

**Acceptance Scenarios**:

1. **Given** a user selects overlays that are supported on more than one target, **When** the user generates output for different targets, **Then** each generated result reflects the same intended capabilities while adapting only the target-specific workspace details.
2. **Given** a user regenerates from an existing manifest that already specifies a target, **When** regeneration runs, **Then** the generated result matches that target's expected workspace artifacts and instructions.

---

### User Story 3 - Avoid misleading or partial target output (Priority: P3)

A user needs clear behavior when a selected target cannot support part of the requested setup so they do not receive workspace files that imply support that is not actually available.

**Why this priority**: Target-aware generation must remain trustworthy. Partial or misleading output is worse than a clear failure or warning because it shifts debugging effort to the user.

**Independent Test**: Can be fully tested by requesting a combination that is incompatible with a target and confirming the generation result either produces a valid target-aware fallback or stops with a clear explanation of what cannot be generated.

**Acceptance Scenarios**:

1. **Given** a selected overlay is incompatible with the chosen target, **When** generation runs, **Then** the user receives a clear explanation of the incompatibility and the output does not include misleading target-specific artifacts for the unsupported behavior.
2. **Given** a target requires special workspace metadata that the current selection cannot support, **When** generation runs, **Then** the user receives a clear message describing what was omitted or why generation cannot proceed.

---

### User Story 4 - Keep local generation unchanged when target-specific behavior is not needed (Priority: P4)

A user targeting local development should continue to receive the existing local-oriented output without extra cloud-workspace files or instructions.

**Why this priority**: The feature should extend target support without making the default local workflow noisier or more confusing.

**Independent Test**: Can be fully tested by generating with `--target local` and confirming the output remains aligned with the current local-first workflow.

**Acceptance Scenarios**:

1. **Given** a user generates with `--target local`, **When** generation completes, **Then** the output remains free of Codespaces-, Gitpod-, and DevPod-specific workspace artifacts.

### Edge Cases

- A manifest created for one target is regenerated after the user switches the target, and the stale target-specific artifacts from the previous target must not remain behind as if still valid.
- A selected target supports the requested overlays but has different port exposure or startup expectations, and the generated guidance must reflect the target-specific behavior without changing the intended application stack.
- A user omits `--target`, and the generated output must continue to behave consistently with the default local workflow.
- A user selects a target value that is recognized by the CLI but lacks target-specific generation rules, and the command must fail clearly rather than silently generating generic output that appears tailored.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST treat the selected deployment target as a generation input that can change the produced workspace artifacts, generated instructions, and target-specific metadata.
- **FR-002**: The system MUST generate target-specific workspace artifacts for `codespaces`, `gitpod`, and `devpod` when those targets are selected and the requested stack is compatible with the target.
- **FR-003**: The system MUST continue to generate the existing local-oriented output when `local` is selected or when no target is explicitly provided.
- **FR-004**: The system MUST ensure that target-specific output reflects the same requested stack, overlays, and user-selected capabilities across targets unless a target-specific incompatibility prevents that outcome.
- **FR-005**: When a target-specific artifact is generated, the system MUST also generate user-facing guidance that explains how the produced workspace is intended to be used in that target environment.
- **FR-006**: When a selected overlay or capability is incompatible with the chosen target, the system MUST provide a clear explanation of the incompatibility before or during generation.
- **FR-007**: The system MUST NOT generate target-specific artifacts that imply unsupported behavior for the selected target.
- **FR-008**: When generation proceeds with omissions or substitutions caused by target rules, the system MUST explicitly tell the user what changed from the requested configuration.
- **FR-009**: Regeneration from an existing manifest MUST reproduce the target-aware output associated with the manifest's target without requiring users to re-enter target-specific choices manually.
- **FR-010**: When the generation target changes between runs, the system MUST update the output so that obsolete target-specific artifacts from the previous target no longer appear as active configuration for the new target.
- **FR-011**: The system MUST keep target-aware output behavior backward compatible for existing local workflows and for manifests that do not declare a non-local target.
- **FR-012**: Target-aware generation MUST be documented in user-facing command help and documentation with examples for each supported non-local target.

### Key Entities _(include if feature involves data)_

- **Deployment Target**: The environment the user intends to run the generated workspace in, including local, Codespaces, Gitpod, and DevPod.
- **Target-Aware Workspace Artifact**: Any generated file, metadata, or instruction set that exists specifically to make the workspace usable in a selected deployment target.
- **Generation Request**: The user's chosen stack, overlays, target, and output preferences that together define the expected generated result.
- **Compatibility Decision**: A user-visible determination describing whether a requested capability can be produced for the selected target and what outcome follows from that determination.

## Assumptions

- The gap implied by the user prompt is that `--target` currently influences validation and guidance more than generated output, and this feature closes that gap.
- Target-aware behavior should focus on generated workspace artifacts and user guidance, not on changing the semantic meaning of selected overlays.
- The set of supported non-local targets in scope is limited to `codespaces`, `gitpod`, and `devpod`; adding new targets is out of scope for this feature.
- The feature should preserve a single consistent user workflow for both initial generation and regeneration from an existing manifest.

## Dependencies & Impact _(mandatory)_

- **Affected Areas**: CLI generation and regeneration workflows, manifest handling, templates, generated workspace files, user documentation, CHANGELOG.md, automated tests
- **Compatibility Impact**: Backward compatible
- **Required Documentation Updates**: `README.md`, `docs/deployment-targets.md`, target-related command help, `CHANGELOG.md`
- **Verification Plan**: Unit tests for target rule selection, integration tests for generation and regeneration across targets, smoke tests for representative target-aware stacks, and manual validation of generated workspace artifacts and instructions for `local`, `codespaces`, `gitpod`, and `devpod`

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In acceptance testing, 100% of generated outputs for `codespaces`, `gitpod`, and `devpod` include the target-specific workspace artifacts and setup guidance defined for that target.
- **SC-002**: In validation runs using the same stack selections across supported targets, users can start from generated output without manual target-specific file edits in at least 90% of representative scenarios.
- **SC-003**: In regression testing, 100% of `--target local` generations remain free of non-local target artifacts unless the user explicitly selects a non-local target.
- **SC-004**: In incompatible-target scenarios, 100% of failed or adjusted generations clearly identify the unsupported capability and the resulting action before the user attempts to use the workspace.
- **SC-005**: In review testing, a user can correctly identify which target a generated workspace was prepared for within 30 seconds by reading only the generated files and guidance.
