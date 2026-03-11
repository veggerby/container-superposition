# Feature Specification: Shared Overlay Imports

**Feature Branch**: `005-shared-overlay-imports`  
**Created**: 2026-03-11  
**Status**: Draft  
**Input**: User description: "Documented in overlay-imports.md — many overlays share patterns (e.g., common env vars, network config, cross-distro packages). A `.shared/` mechanism would reduce maintenance burden as the overlay count grows past 77."

> Use repo-relative Markdown links for repository files. The root `README.md`
> is the only exception and may use package-friendly hosted URLs.

## Review & Approval _(mandatory before implementation)_

- **Spec Path**: `docs/specs/005-shared-overlay-imports/spec.md`
- **Commit Status**: Not Yet Committed
- **Review Status**: Pending Review
- **Implementation Gate**: No implementation code may begin until this spec is committed and reviewed.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Reuse shared overlay fragments (Priority: P1)

An overlay maintainer wants to define a shared fragment once and reference it from multiple overlays so common setup patterns stay aligned without repeated copy-paste edits.

**Why this priority**: Reducing duplication is the core value of the feature. Without reusable shared fragments, overlay maintenance cost continues to grow with every added overlay.

**Independent Test**: Can be fully tested by creating one shared fragment, referencing it from multiple overlays, generating outputs for those overlays, and confirming each generated result includes the shared content.

**Acceptance Scenarios**:

1. **Given** a maintainer has created a shared fragment for a common overlay pattern, **When** the maintainer references that fragment from multiple overlays, **Then** each overlay includes the shared content in its generated output.
2. **Given** a maintainer updates a shared fragment used by multiple overlays, **When** those overlays are generated again, **Then** each generated output reflects the updated shared content without requiring duplicate edits in every overlay.

---

### User Story 2 - Keep overlay-specific customization after shared content (Priority: P2)

A maintainer wants overlays to inherit shared fragments while still allowing each overlay to add or override its own details where needed.

**Why this priority**: Shared reuse is only practical if overlay authors can still tailor the final result for a specific language, database, or tool combination.

**Independent Test**: Can be fully tested by referencing a shared fragment from an overlay that also defines overlay-specific content and confirming the final generated output contains both the shared baseline and the overlay's own customizations in a predictable order.

**Acceptance Scenarios**:

1. **Given** an overlay references one or more shared fragments and also defines overlay-specific settings, **When** the overlay is generated, **Then** the final result contains both the shared content and the overlay-specific additions.
2. **Given** an overlay references several shared fragments in a defined order, **When** the overlay is generated, **Then** the final result applies those shared fragments in that same order before the overlay's own content.

---

### User Story 3 - Catch broken shared references early (Priority: P3)

A maintainer wants clear validation when an overlay references a missing, unsupported, or invalid shared fragment so broken reuse does not silently reach generated project output.

**Why this priority**: Reuse introduces a new failure mode. Maintainers need fast, specific feedback or shared imports will reduce confidence instead of reducing maintenance work.

**Independent Test**: Can be fully tested by creating overlays with valid and invalid shared references, running the existing validation and generation workflows, and confirming that invalid references are rejected with clear guidance while valid references still succeed.

**Acceptance Scenarios**:

1. **Given** an overlay references a shared fragment that does not exist, **When** the maintainer validates or generates that overlay, **Then** the workflow fails with a message identifying the broken reference.
2. **Given** an overlay references a shared fragment in an unsupported or invalid format, **When** the maintainer validates or generates that overlay, **Then** the workflow fails with a message explaining why the shared fragment cannot be used.

---

### User Story 4 - Understand and govern shared library usage (Priority: P4)

A repository maintainer wants shared fragments to be documented and discoverable so contributors can reuse existing patterns instead of creating new duplicates.

**Why this priority**: The maintenance benefit depends on contributors knowing what shared fragments exist and when to use them.

**Independent Test**: Can be fully tested by reviewing contributor-facing documentation and confirming it explains how to create, reference, validate, and update shared fragments and how those changes affect importing overlays.

**Acceptance Scenarios**:

1. **Given** a contributor wants to add a new overlay, **When** they consult the documentation, **Then** they can identify whether an existing shared fragment should be reused before creating duplicate overlay content.
2. **Given** a contributor wants to add or modify a shared fragment, **When** they consult the documentation, **Then** they can understand the expected structure, usage boundaries, and downstream impact on importing overlays.

### Edge Cases

- A shared fragment is referenced by many overlays and a change to that fragment would affect all of them; maintainers must be able to identify that the update has repo-wide impact before release.
- Two shared fragments contribute overlapping content and the generated result must remain deterministic so maintainers can predict the final output.
- An overlay mixes shared fragments with overlay-specific content that intentionally differs from the shared baseline and the final result must preserve that overlay's specific behavior.
- A shared fragment is moved, renamed, or deleted after overlays already reference it and validation must fail clearly instead of generating partial output.
- A contributor attempts to place unrelated or overly broad content into one shared fragment and documentation must set boundaries so the shared library stays understandable and reusable.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Maintainers MUST be able to store reusable overlay fragments in a dedicated shared area under the overlays catalog so multiple overlays can reference the same content.
- **FR-002**: Overlay manifests MUST be able to declare one or more shared fragment references as part of their overlay definition.
- **FR-003**: When an overlay references shared fragments, generated outputs MUST include the shared content in the same final result as if that content had been defined directly in the overlay.
- **FR-004**: Shared fragments MUST be applied in the order declared by the overlay, followed by the overlay's own content, so the final result is predictable and testable.
- **FR-005**: Overlay-specific content MUST remain supported after shared fragments are applied so overlays can reuse common patterns without losing the ability to specialize.
- **FR-006**: The system MUST reject shared fragment references that point outside the supported shared area.
- **FR-007**: The system MUST reject shared fragment references that are missing, unreadable, unsupported, or structurally invalid, and MUST report which overlay and reference caused the failure.
- **FR-008**: Validation workflows MUST verify shared fragment references before generation completes so maintainers receive early feedback on broken reuse.
- **FR-009**: Documentation MUST explain how to create shared fragments, when to reuse them, how importing order works, and how changes to a shared fragment affect all importing overlays.
- **FR-010**: The feature MUST preserve existing behavior for overlays that do not use shared fragments.
- **FR-011**: Maintainers MUST be able to use shared fragments for the common duplicated patterns identified in current overlay maintenance, including shared environment settings, common network configuration, and shared package-install definitions.

### Key Entities _(include if feature involves data)_

- **Shared Fragment**: A reusable overlay content unit maintained once and referenced by multiple overlays to represent a common pattern.
- **Overlay Import Reference**: A declaration in an overlay manifest that points to a shared fragment and defines the order in which that fragment is included.
- **Overlay Output**: The generated configuration and supporting files produced after base templates, shared fragments, and overlay-specific content are combined.
- **Validation Finding**: A user-visible result that identifies whether a shared fragment reference is valid and, if not, what needs to be corrected.

## Assumptions

- The repository will continue to support both fully self-contained overlays and overlays that reuse shared fragments.
- Shared fragments are intended for patterns that are common across multiple overlays, not as a substitute for every overlay-specific detail.
- Existing contributor workflows for generation, validation, and documentation remain in place; this feature expands what those workflows can process.
- The documented examples in `docs/overlay-imports.md` represent the intended user-facing behavior and should be aligned with the implemented feature.

## Dependencies & Impact _(mandatory)_

- **Affected Areas**: Overlay manifests, overlay composition rules, overlay validation workflows, contributor documentation, CHANGELOG.md, automated tests
- **Compatibility Impact**: Backward compatible
- **Required Documentation Updates**: `docs/overlay-imports.md`, overlay authoring guidance, contributor-facing README references, CHANGELOG.md
- **Verification Plan**: Unit tests for shared reference parsing and validation, composition tests covering ordered reuse and overlay-specific overrides, regression tests for overlays without shared imports, and manual validation using representative duplicated overlay patterns

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At least three existing duplicated overlay patterns can be converted into shared fragments without changing the expected generated output for their importing overlays.
- **SC-002**: In acceptance testing, 100% of overlays that reference valid shared fragments generate successfully and include the expected shared content in their final output.
- **SC-003**: In acceptance testing, 100% of overlays with missing, unsupported, or invalid shared references fail before completion with a message that identifies the broken reference.
- **SC-004**: Repository maintainers can update one shared fragment used by multiple overlays and confirm the change reaches every importing overlay in a single verification run.
- **SC-005**: Overlays that do not use shared fragments continue to generate with no user-visible behavior changes in 100% of regression test cases.
