# Tasks: Project Configuration File

**Input**: Design documents from `docs/specs/002-superposition-config-file/`
**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [init-project-config.md](contracts/init-project-config.md), [quickstart.md](quickstart.md)

**Tests**: Add automated coverage for config discovery, precedence, no-config fallback, manifest isolation, validation failures, and customization parity in `tool/__tests__/commands.test.ts`, `tool/__tests__/composition.test.ts`, `tool/__tests__/manifest-only.test.ts`, and `tool/__tests__/minimal-and-editor.test.ts`, then run `npm test`, `npm run lint`, and `npm run test:smoke`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. `US1`, `US2`, `US3`)
- Include exact repo-relative file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Record the approved spec gate and align the feature docs with the implementation baseline before code changes.

- [x] T001 Confirm approved spec status and implementation gate in `docs/specs/002-superposition-config-file/spec.md`
- [x] T002 Align implementation sequencing and verification scope in `docs/specs/002-superposition-config-file/plan.md`
- [x] T003 Align parity examples and validation steps in `docs/specs/002-superposition-config-file/quickstart.md`
- [x] T004 [P] Record supported project-config surface and customization parity expectations in `docs/specs/002-superposition-config-file/contracts/init-project-config.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the shared project-config schema and merge-path support that every story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Define project-config file discovery, parsed shape, and validation helpers in `tool/schema/project-config.ts`
- [x] T006 Extend shared config types and `QuestionnaireAnswers` parity fields in `tool/schema/types.ts`
- [x] T007 Update supported config schema entries for project-config parity in `tool/schema/config.schema.json`
- [x] T008 Refactor answer-source merging to accept project-config defaults alongside manifest and CLI inputs in `scripts/init.ts`
- [x] T009 Add foundational regression coverage for project-config discovery, merge precedence, and dual-file ambiguity in `tool/__tests__/commands.test.ts`
- [x] T010 Add fixture coverage for supported customization parity inputs in `tool/__tests__/composition.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in priority order

---

## Phase 3: User Story 1 - Generate from committed project config (Priority: P1) 🎯 MVP

**Goal**: Let maintainers define the full supported generation intent, including supported customizations, in one repository-root config file and generate the same output as clean generation.

**Independent Test**: Put a valid `.superposition.yml` in the repository root with stack, overlays, output path, and supported customization inputs such as custom container definitions, environment-related settings, and additional generated features, run `npm run init`, and confirm the generated output matches equivalent clean-generation input without re-entering declared values.

### Verification for User Story 1

- [x] T011 [US1] Add command regression coverage for valid project-config driven generation in `tool/__tests__/commands.test.ts`
- [x] T012 [US1] Add composition parity coverage for project-config custom image and container definition inputs in `tool/__tests__/composition.test.ts`
- [x] T013 [US1] Add parity coverage for environment-related settings and additional generated features in `tool/__tests__/minimal-and-editor.test.ts`

### Implementation for User Story 1

- [x] T014 [US1] Load repository-root `.superposition.yml` and `superposition.yml` defaults into the standard init flow in `scripts/init.ts`
- [x] T015 [US1] Map project-config selections into the clean-generation answer model in `tool/schema/project-config.ts`
- [x] T016 [US1] Preserve supported customization inputs through generation and summary rendering in `scripts/init.ts`
- [x] T017 [US1] Ensure project-config driven answers produce the same composed output as equivalent clean-generation input in `tool/questionnaire/composer.ts`
- [x] T018 [US1] Keep generated run summaries accurate for project-config sourced generation in `tool/utils/summary.ts`

**Checkpoint**: User Story 1 should now be fully functional and testable on its own

---

## Phase 4: User Story 2 - Use config-driven setup in automation (Priority: P2)

**Goal**: Let teams run unattended generation from a committed project config while preserving per-run overrides and explicit manifest isolation.

**Independent Test**: Run `npm run init` in a non-interactive repository with a valid project config and confirm declared values are not prompted again, direct CLI flags override only that run, and `--from-manifest` remains isolated from project-config defaults.

### Verification for User Story 2

- [x] T019 [US2] Add non-interactive command regression coverage for project-config defaults and CLI override precedence in `tool/__tests__/commands.test.ts`
- [x] T020 [US2] Add manifest-isolation regression coverage for project-config and `--from-manifest` interactions in `tool/__tests__/manifest-only.test.ts`
- [x] T021 [US2] Add regression coverage for no-config fallback to current interactive and flag-driven behavior in `tool/__tests__/commands.test.ts`
- [x] T022 [US2] Add regression coverage for partial project-config defaults that still require remaining answers in `tool/__tests__/commands.test.ts`

### Implementation for User Story 2

- [x] T023 [US2] Apply project-config values as default persisted input for standard init without prompting for already-declared values in `scripts/init.ts`
- [x] T024 [US2] Preserve partial project-config values as shared defaults while collecting only unresolved required answers in `scripts/init.ts`
- [x] T025 [US2] Preserve run-scoped CLI override precedence over project-config defaults in `scripts/init.ts`
- [x] T026 [US2] Keep explicit manifest mode isolated from repository project-config defaults in `scripts/init.ts`

**Checkpoint**: User Stories 1 and 2 should both work independently

---

## Phase 5: User Story 3 - Correct invalid or ambiguous config quickly (Priority: P3)

**Goal**: Stop invalid, unsupported, conflicting, or ambiguous project-config input before generation and point users to the corrective action.

**Independent Test**: Introduce invalid YAML, unsupported keys, unsupported customization values, conflicting selections, missing non-interactive requirements, and both supported filenames, then confirm generation stops before output with actionable guidance tied to the repository state or config entry.

### Verification for User Story 3

- [x] T027 [US3] Add command regression coverage for invalid YAML, unsupported keys, and unsupported values in `tool/__tests__/commands.test.ts`
- [x] T028 [US3] Add regression coverage for conflicting selections, missing required non-interactive values, and dual-file ambiguity in `tool/__tests__/commands.test.ts`
- [x] T029 [US3] Add regression coverage for unsupported customization declarations outside the clean-generation surface in `tool/__tests__/commands.test.ts`

### Implementation for User Story 3

- [x] T030 [US3] Validate project-config syntax, supported keys, supported values, and conflicting selections before generation in `tool/schema/project-config.ts`
- [x] T031 [US3] Report repository-root ambiguity and non-interactive missing-value failures with actionable guidance in `scripts/init.ts`
- [x] T032 [US3] Reject unsupported customization declarations that fall outside the supported clean-generation surface in `tool/schema/project-config.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish documentation, changelog, and end-to-end verification for the declarative workflow.

- [x] T033 [P] Document project-config usage, parity scope, and supported customization examples in `README.md`
- [x] T034 [P] Document local and CI workflow examples for project config in `docs/workflows.md`
- [x] T035 [P] Document project-config parity examples and customization cases in `docs/examples.md`
- [x] T036 Update the user-visible project-config change summary in `CHANGELOG.md`
- [x] T037 Run the maintainer workflow review for SC-003 and record the outcome in `docs/specs/002-superposition-config-file/quickstart.md`
- [x] T038 Record final verification steps and observed outcomes in `docs/specs/002-superposition-config-file/quickstart.md`
- [x] T039 Run `npm test`, `npm run lint`, and `npm run test:smoke`, then record the results in `docs/specs/002-superposition-config-file/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user story work
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion and should follow US1 because it extends the same answer-resolution path into unattended and manifest-sensitive flows
- **User Story 3 (Phase 5)**: Depends on Foundational completion and should follow US1 and US2 because validation rules depend on the final supported project-config surface and precedence behavior
- **Polish (Phase 6)**: Depends on the desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other stories after Phase 2
- **User Story 2 (P2)**: Depends on the project-config merge path from US1 and extends it to automation, overrides, and manifest isolation
- **User Story 3 (P3)**: Depends on the supported config surface from US1 and the precedence rules from US2 so failure behavior matches the completed feature

### Within Each User Story

- Add or update verification tasks before implementation for that story
- Land project-config loading and normalization before parity-sensitive generation changes
- Complete precedence and failure-handling behavior before final docs and smoke validation

### Parallel Opportunities

- `T003` and `T004` can run in parallel during Setup
- `T009` and `T010` can run in parallel after the foundational schema shape is settled
- `T012` and `T013` can run in parallel once project-config mapping is defined
- `T033`, `T034`, and `T035` can run in parallel after behavior is stable

---

## Parallel Example: User Story 1

```bash
Task: "Add composition parity coverage for project-config custom image and container definition inputs in tool/__tests__/composition.test.ts"
Task: "Add parity coverage for environment-related settings and additional generated features in tool/__tests__/minimal-and-editor.test.ts"
```

## Parallel Example: Polish

```bash
Task: "Document project-config usage, parity scope, and supported customization examples in README.md"
Task: "Document local and CI workflow examples for project config in docs/workflows.md"
Task: "Document project-config parity examples and customization cases in docs/examples.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate project-config driven generation against equivalent clean-generation output
5. Stop for review before extending into unattended and failure-handling behavior

### Incremental Delivery

1. Land project-config discovery, typing, and merge foundations
2. Deliver User Story 1 for repository-root config driven generation with customization parity
3. Add User Story 2 for automation, CLI overrides, no-config fallback, and manifest isolation
4. Add User Story 3 for validation, ambiguity handling, and corrective guidance
5. Finish docs, changelog, and full verification

### Parallel Team Strategy

1. One developer completes Setup and Foundational work
2. After the project-config schema and merge path are stable, one developer can drive US1 implementation while another prepares the parity-focused verification cases
3. After US1 is stable, the same command owner should complete US2 and US3 because they concentrate in `scripts/init.ts` and shared validation helpers

---

## Notes

- All tasks use the required checklist format with IDs, optional `[P]` markers, story labels for story phases, and exact repo-relative file paths
- The approved spec gate is already satisfied; execution readiness now depends on completing implementation, verification, and documentation tasks cleanly
- Favor command-level and composition-level regression tests because the risk is user-visible generation behavior and customization parity drift
