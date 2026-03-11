# Feature Specification: Project Configuration File

**Feature Branch**: `002-superposition-config-file`  
**Created**: 2026-03-11  
**Status**: Draft  
**Input**: User description: "This is your only open issue and the highest-leverage change. It replaces intent lives in shell history with a version-controlled, declarative source of truth. The infrastructure is mostly there (YAML parsing, CLI flag merging into `QuestionnaireAnswers`), so the gap is manageable. This also unlocks better CI/CD stories and team onboarding. FULL ISSUE FROM GITHUB Summary Support a .superposition.yml (or superposition.yml) project-level config file as an alternative to long CLI flags. This makes the tool declarative and stable for teams — CI scripts and shared repos no longer depend on command history or README copy-paste. Motivation Right now, intent lives in:"

> Use repo-relative Markdown links for repository files. The root `README.md`
> is the only exception and may use package-friendly hosted URLs.

## Review & Approval _(mandatory before implementation)_

- **Spec Path**: `docs/specs/002-superposition-config-file/spec.md`
- **Commit Status**: Not Yet Committed
- **Review Status**: Pending Review
- **Implementation Gate**: No implementation code may begin until this spec is committed and reviewed.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Generate from committed project config (Priority: P1)

A project maintainer defines the desired development environment in a config file stored with the repository so any teammate can generate the same setup without reconstructing a long command.

**Why this priority**: This is the core user value. It turns setup intent into a durable, reviewable project artifact instead of a one-off shell command.

**Independent Test**: Place a valid project config file in a repository, run the generation flow without supplying the equivalent long-form options, and confirm the expected development environment is produced.

**Acceptance Scenarios**:

1. **Given** a repository with a valid project config file that defines stack and overlay selections, **When** a maintainer runs the generation flow, **Then** the tool uses the config file values to generate the requested development environment.
2. **Given** a repository with a valid project config file committed to source control, **When** a teammate clones the repository and runs the same generation flow, **Then** they receive the same effective project setup without needing the original author’s shell history.

---

### User Story 2 - Use config-driven setup in automation (Priority: P2)

A team uses the same committed project config file in CI or scripted workflows so environment generation is repeatable and does not rely on copied command examples.

**Why this priority**: Declarative setup is most valuable when it works in unattended workflows and shared operational contexts.

**Independent Test**: Run the generation flow in a non-interactive context from a repository that contains a valid project config file and confirm it completes with no prompt for values already defined in the file.

**Acceptance Scenarios**:

1. **Given** a non-interactive workflow and a valid project config file, **When** the generation flow starts, **Then** it completes using the file-defined values without requiring interactive answers for those settings.
2. **Given** a repository where the committed config file is unchanged, **When** the automation workflow runs repeatedly, **Then** each run resolves the same requested configuration.

---

### User Story 3 - Correct invalid or ambiguous config quickly (Priority: P3)

A contributor receives clear guidance when the project config file is invalid, incomplete, or ambiguous so they can fix the source of truth instead of debugging generated output.

**Why this priority**: Declarative workflows only improve team reliability if configuration problems are surfaced clearly and early.

**Independent Test**: Introduce invalid entries, missing required selections, or ambiguous file conditions and verify the tool stops before generation with actionable guidance.

**Acceptance Scenarios**:

1. **Given** a project config file with unsupported or conflicting values, **When** the generation flow validates the file, **Then** it stops before generating files and reports each issue in terms the contributor can correct.
2. **Given** both supported project config filenames are present in the same repository, **When** the generation flow starts, **Then** it stops and instructs the user to keep only one project config file.

### Edge Cases

- What happens when no project config file exists? The current interactive and flag-driven flows remain available without behavior changes.
- What happens when a project config file defines only part of the setup? The tool uses the provided values and continues to collect any still-required missing choices through the existing flow.
- How does the system handle explicit command input that conflicts with the project config file? Explicit command input takes precedence for that run, and the user can still keep the file as the shared default.
- How does the system handle unsupported overlay IDs, invalid categories, or conflicting selections in the project config file? It fails validation before generation and explains the invalid entries.
- How does the system handle both `.superposition.yml` and `superposition.yml` in one repository? It treats this as an error to avoid ambiguity.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST support a project-level configuration file named `.superposition.yml` or `superposition.yml` as an input source for environment generation.
- **FR-002**: The system MUST read project configuration values from the repository root and apply them to the same setup decisions currently available through interactive answers and command input.
- **FR-003**: Users MUST be able to generate a project environment from a valid project config file without re-entering values already defined in that file.
- **FR-004**: The system MUST allow explicit command input supplied for a run to override conflicting values from the project config file for that run only.
- **FR-005**: The system MUST preserve the current behavior for users who do not provide a project config file.
- **FR-006**: The system MUST validate the project config file before generating output and MUST report invalid, unsupported, missing, or conflicting entries with actionable correction guidance.
- **FR-007**: The system MUST stop and report an ambiguity error when both supported project config filenames are present in the same repository.
- **FR-008**: The system MUST produce the same effective project setup from a project config file as it would from an equivalent set of direct user selections.
- **FR-009**: The system MUST support storing overlay selections, stack choice, output location, and other generation options that materially affect the resulting project setup.
- **FR-010**: The system MUST allow a partially defined project config file to act as shared defaults while still collecting any remaining required choices through the existing user flow.
- **FR-011**: The system MUST document how teams create, commit, and use the project config file in local development and automation workflows.

### Key Entities _(include if feature involves data)_

- **Project Configuration File**: The committed project-level definition of desired setup choices, including stack, overlay selections, output preferences, and other generation inputs.
- **Generation Request**: The effective set of choices used for one generation run after combining defaults, project config values, and any explicit command input.
- **Validation Result**: The user-facing outcome of checking the project config file, including detected errors, ambiguous conditions, and corrective guidance.

## Dependencies & Impact _(mandatory)_

- **Affected Areas**: Project generation workflow, CLI usage patterns, onboarding workflow, CI/CD workflow, user documentation
- **Compatibility Impact**: Backward compatible
- **Required Documentation Updates**: README.md, docs pages covering workflows and examples, CHANGELOG.md
- **Verification Plan**: Unit tests for config resolution and validation, integration tests for config-driven generation, smoke tests for representative stacks, manual validation for onboarding and automation flows

## Assumptions

- The project config file becomes the team-readable source of truth for setup intent, but it does not remove support for the current interactive or flag-driven flows.
- Explicit command input remains the highest-precedence input for a single run so users can make temporary overrides without editing the shared config file.
- A single repository should contain at most one supported project config file to keep behavior deterministic and easy to explain.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In validation testing, 95% of fresh repository checkouts that contain a valid project config file can generate the intended environment without requiring users to reconstruct setup options from prior command history.
- **SC-002**: In representative automation tests, 100% of successful non-interactive generation runs complete without prompting for any value already defined in the project config file.
- **SC-003**: In usability review, at least 90% of maintainers can define or update a project’s shared setup intent within 10 minutes using the documented config file workflow.
- **SC-004**: In invalid-configuration tests, 90% of failures identify the problematic setting and the required correction in the first error output seen by the user.
