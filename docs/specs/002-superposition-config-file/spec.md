# Feature Specification: Project Configuration File

**Feature Branch**: `002-superposition-config-file`  
**Created**: 2026-03-11  
**Status**: Final  
**Input**: Add a repository-root project config file so teams and automation can generate the same environment from committed declarative setup instead of reconstructing long CLI commands.

> Use repo-relative Markdown links for repository files. The root `README.md`
> is the only exception and may use package-friendly hosted URLs.

## Review & Approval _(mandatory before implementation)_

- **Spec Path**: `docs/specs/002-superposition-config-file/spec.md`
- **Commit Status**: Committed
- **Review Status**: Approved
- **Implementation Gate**: No implementation code may begin until this spec is committed and reviewed.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate from committed project config (Priority: P1)

A project maintainer defines the desired development environment in a single repository-root config file so any teammate can generate the same stack, overlay set, output target, and supported customizations without reconstructing a long command.

**Why this priority**: This is the core user value. It turns setup intent into a durable, reviewable project artifact instead of a one-off shell command.

**Independent Test**: Place a valid `.superposition.yml` or `superposition.yml` in the repository root, run the generation flow without supplying the equivalent long-form options, and confirm the generated output matches the declared stack, overlay selection, output location, and supported customization settings.

**Acceptance Scenarios**:

1. **Given** a repository with a valid project config file in its root that defines stack, overlay selections, output location, and supported customization settings, **When** a maintainer runs the generation flow from that repository root, **Then** the tool uses those values as the starting configuration for generation.
2. **Given** a repository with a committed project config file, **When** a teammate clones the repository and runs the same generation flow from a fresh checkout, **Then** they receive the same effective project setup without needing the original author’s shell history or copied command examples.
3. **Given** a repository with an existing hand-crafted `.devcontainer/`, **When** a maintainer runs `adopt --project-file`, **Then** the tool writes a repository-root project config that captures the inferred stack, overlay selections, output path, and supported customization inputs from the adopted setup.

---

### User Story 2 - Use config-driven setup in automation (Priority: P2)

A team uses the same committed project config file in CI or scripted workflows so environment generation is repeatable, unattended, and insulated from copied command examples.

**Why this priority**: Declarative setup is most valuable when it works in unattended workflows and shared operational contexts.

**Independent Test**: Run the generation flow in a non-interactive context from a repository that contains a valid project config file and confirm it completes with no prompt for values already defined in the file, while still allowing explicit per-run overrides.

**Acceptance Scenarios**:

1. **Given** a non-interactive workflow and a valid project config file, **When** the generation flow starts, **Then** it completes using the file-defined values without requiring interactive answers for those settings.
2. **Given** a repository where the committed project config file is unchanged, **When** the automation workflow runs repeatedly, **Then** each run resolves the same requested configuration and any direct command overrides affect only that run.
3. **Given** a repository with a valid project config file and no conflicting persisted-input flag or clean-generation selection flags, **When** a user runs `init --no-interactive` or `regen` in the default project-file mode, **Then** the tool uses the project file as the persisted input source without requiring `--from-project`.

---

### User Story 3 - Correct invalid or ambiguous config quickly (Priority: P3)

A contributor receives clear guidance when the project config file is invalid, incomplete, or ambiguous so they can fix the committed source of truth instead of debugging generated output or hidden fallback behavior.

**Why this priority**: Declarative workflows only improve team reliability if configuration problems are surfaced clearly and early.

**Independent Test**: Introduce invalid entries, unsupported values, missing required selections for non-interactive use, or ambiguous file conditions and verify the tool stops before generation with actionable guidance tied to the file content or repository state.

**Acceptance Scenarios**:

1. **Given** a project config file with unsupported keys, unsupported values, or conflicting selections, **When** the generation flow validates the file, **Then** it stops before generating files and reports each issue in terms the contributor can correct.
2. **Given** both supported project config filenames are present in the same repository, **When** the generation flow starts, **Then** it stops and instructs the user to keep only one project config file so the source of truth is unambiguous.

### Edge Cases

- What happens when no project config file exists? The current interactive and flag-driven flows remain available without behavior changes.
- What happens when a project config file defines only part of the setup? The tool uses the provided values and continues to collect any still-required missing choices through the existing flow.
- How does the system handle explicit command input that conflicts with the project config file? Explicit command input takes precedence for that run, and the user can still keep the file as the shared default.
- How does the system handle an explicit manifest-based run? The explicit manifest remains the persisted input source for that run, and the project config file does not silently override it.
- How does the system handle explicit project-file or manifest-source flags that are combined with each other or with clean-generation selection flags such as stack, overlay, or preset selection? It fails before generation and tells the user to choose exactly one persisted input source for that run.
- How does the system handle `init --no-interactive` or `regen` when a valid project config file exists and no other persisted-input source or clean-generation selection flags are provided? It may use the project file implicitly as the persisted input source for that run.
- How does the system handle supported customizations such as environment settings, custom container definitions, or additional generated features? Those values are treated as first-class generation inputs and must round-trip through the project config file without being dropped.
- How does the system handle unsupported overlay IDs, invalid categories, or conflicting selections in the project config file? It fails validation before generation and explains the invalid entries.
- How does the system handle both `.superposition.yml` and `superposition.yml` in one repository? It treats this as an error to avoid ambiguity.
- How does the system handle `adopt --project-file` when a repository already contains a supported project config file? It reuses that file path, and it must still stop on dual-file ambiguity so the source of truth stays deterministic.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST support exactly two project-level configuration filenames for this feature: `.superposition.yml` and `superposition.yml`.
- **FR-002**: The system MUST look for the project config file only in the repository root from which the generation flow is run.
- **FR-003**: The system MUST treat the project config file as the default persisted input source for standard initialization when an explicit manifest input is not provided.
- **FR-004**: The system MUST read project config values into the same setup decisions already available through interactive answers and direct command input, including stack choice, overlay selections, preset selections, output location, and other generation options that materially affect the resulting setup.
- **FR-005**: The system MUST allow every supported clean-generation input that materially affects generated output to be declared in `.superposition.yml` or `superposition.yml` instead of requiring a long command.
- **FR-006**: The system MUST support declaring customization inputs in the project config file, including custom container definitions, environment-related settings, additional generated features, and other first-class generation customizations that affect the resulting devcontainer output.
- **FR-007**: The system MUST preserve declared project-config customization inputs through generation so the resulting output reflects the same customization values selected for that run.
- **FR-008**: Users MUST be able to generate a project environment from a valid project config file without re-entering values already defined in that file.
- **FR-009**: The system MUST allow explicit command input supplied for a run to override conflicting values from the project config file for that run only.
- **FR-010**: The system MUST preserve the current interactive and flag-driven behavior for users who do not provide a project config file.
- **FR-011**: The system MUST validate the project config file before generating output and MUST report invalid YAML, unsupported keys, unsupported values, missing required values, or conflicting selections with actionable correction guidance.
- **FR-012**: The system MUST stop and report an ambiguity error when both supported project config filenames are present in the same repository.
- **FR-013**: The system MUST produce the same effective project setup from a project config file as it would from an equivalent set of direct user selections across the full supported declaration surface.
- **FR-014**: The system MUST allow a partially defined project config file to act as shared defaults while still collecting any remaining required choices through the existing user flow.
- **FR-015**: The system MUST keep explicit manifest-based runs as a separate persisted-input mode and MUST NOT silently merge project config values into a run that was explicitly started from a manifest.
- **FR-016**: The system MUST support an explicit `--from-project` source-selection mode for both initialization and regeneration flows so users can deliberately choose the repository project file as the persisted input source for a run.
- **FR-017**: The system MUST allow `init --no-interactive` and `regen` to use the repository project file implicitly when a valid project config file exists and no other persisted-input source flag or clean-generation selection flags are supplied.
- **FR-018**: The system MUST reject conflicting persisted-input source combinations before generation, including `--from-project` with `--from-manifest` and either source-selection mode combined with clean-generation selection flags such as stack, overlay, or preset selection.
- **FR-019**: The system MUST document how teams create, commit, validate, and use the project config file in local development, regeneration, and automation workflows, including how parity with clean generation applies to supported customization inputs and how source-selection conflicts are resolved.
- **FR-020**: The system MUST allow `adopt --project-file` to write a repository-root project config that represents the inferred adopted setup using the same supported declaration surface as other project-config workflows.

### Key Entities _(include if feature involves data)_

- **Project Configuration File**: The committed repository-root definition of desired setup choices, including filename, declared setup values, supported customization inputs, and whether it is the only supported config file present.
- **Generation Request**: The effective set of choices used for one generation run after combining defaults, project config values, any explicit command input, and, when explicitly requested, manifest-based input, including supported customization inputs.
- **Customization Input**: A supported user-configurable generation setting beyond basic stack and overlay selection, such as custom container definitions, environment-related settings, or additional generated features that alter the final output.
- **Validation Result**: The user-facing outcome of checking the project config file, including syntax problems, unsupported entries, conflict findings, ambiguity conditions, and corrective guidance.

## Dependencies & Impact _(mandatory)_

- **Affected Areas**: Standard initialization workflow, clean-generation parity, supported customization handling, manifest-based regeneration boundaries, project-file based regeneration boundaries, CLI usage patterns, onboarding workflow, CI/CD workflow, user documentation
- **Compatibility Impact**: Backward compatible
- **Required Documentation Updates**: README.md, workflow and examples documentation, quickstart guidance, CHANGELOG.md
- **Verification Plan**: Unit tests for config resolution and validation, integration tests for config-driven generation, smoke tests for representative stacks, manual validation for onboarding and automation flows

## Assumptions

- The project config file becomes the team-readable source of truth for default setup intent, including supported customization inputs, but it does not remove support for current interactive, flag-driven, or explicit manifest-based flows.
- Explicit command input remains the highest-precedence input for a single run so users can make temporary overrides without editing the shared config file.
- `--from-project` and `--from-manifest` are mutually exclusive persisted-input modes rather than additive sources for one run.
- A single repository should contain at most one supported project config file so the source of truth stays deterministic and easy to explain.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In validation testing, 95% of fresh repository checkouts that contain a valid project config file can generate the intended environment without requiring users to reconstruct setup options from prior command history.
- **SC-002**: In representative automation tests, 100% of successful non-interactive generation runs complete without prompting for any value already defined in the project config file and without changing the committed project config file.
- **SC-003**: In usability review, at least 90% of maintainers can define or update a project’s shared setup intent within 10 minutes using the documented config file workflow.
- **SC-004**: In invalid-configuration tests, 90% of failures identify the problematic file condition or config entry and the required correction in the first error output seen by the user.
- **SC-005**: In parity validation, every supported customization that can be expressed through the clean generation path can also be declared in the project config file and produces the same final generated output.
- **SC-006**: In CLI validation tests, 100% of runs that combine conflicting persisted-input source flags or mix a persisted-input source with clean-generation selection flags fail before generation with a source-conflict error that identifies the invalid combination.
