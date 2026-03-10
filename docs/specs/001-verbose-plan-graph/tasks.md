# Tasks: Verbose Plan Graph

**Input**: Design documents from `/docs/specs/001-verbose-plan-graph/`
**Prerequisites**: [plan.md](/workspaces/container-superposition/docs/specs/001-verbose-plan-graph/plan.md), [spec.md](/workspaces/container-superposition/docs/specs/001-verbose-plan-graph/spec.md), [research.md](/workspaces/container-superposition/docs/specs/001-verbose-plan-graph/research.md), [data-model.md](/workspaces/container-superposition/docs/specs/001-verbose-plan-graph/data-model.md), [plan-verbose-output.md](/workspaces/container-superposition/docs/specs/001-verbose-plan-graph/contracts/plan-verbose-output.md), [quickstart.md](/workspaces/container-superposition/docs/specs/001-verbose-plan-graph/quickstart.md)

**Tests**: Add automated command-level coverage in `tool/__tests__/commands.test.ts`, then run manual quickstart validation plus `npm test` and `npm run lint`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. `US1`, `US2`, `US3`)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Record the approved governance state and prepare the command surface for the expanded scope.

- [x] T001 Record approved spec commit status and review gate in `docs/specs/001-verbose-plan-graph/spec.md`
- [x] T002 Align implementation sequencing notes for the manifest-driven scope in `docs/specs/001-verbose-plan-graph/plan.md`
- [x] T003 Update `plan` command option and argument wiring for manifest-driven verbose planning in `scripts/init.ts`
- [x] T004 Record the revised implementation baseline and pending manifest validation in `docs/specs/001-verbose-plan-graph/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared request normalization and explanation model that every story depends on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Refactor plan request normalization to support overlay-list and manifest inputs in `tool/commands/plan.ts`
- [x] T006 Define shared inclusion-reason and dependency-path helpers for all plan modes in `tool/commands/plan.ts`
- [x] T007 Define shared verbose JSON payload shaping for overlay-list and manifest inputs in `tool/commands/plan.ts`
- [x] T008 Add baseline regression coverage for request parsing and shared plan payload behavior in `tool/__tests__/commands.test.ts`
- [x] T009 Add fixture support for manifest-driven command tests in `tool/__tests__/commands.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin following the documented story dependencies

---

## Phase 3: User Story 1 - Explain auto-included overlays (Priority: P1) 🎯 MVP

**Goal**: Let users see why directly selected overlays and auto-added required dependencies appear in the final plan.

**Independent Test**: Run `npm run init -- plan --stack compose --overlays grafana --verbose` and confirm the output explains `grafana` as directly selected and `prometheus` as required by `grafana`, without duplicate overlay entries.

### Verification for User Story 1

- [x] T010 [US1] Add verbose text-output regression coverage for direct selections and required dependencies in `tool/__tests__/commands.test.ts`
- [x] T011 [US1] Add verbose JSON regression coverage for direct selections and required dependencies in `tool/__tests__/commands.test.ts`

### Implementation for User Story 1

- [x] T012 [US1] Implement direct-selection explanation records for overlay-list planning in `tool/commands/plan.ts`
- [x] T013 [US1] Implement required-dependency explanation records for overlay-list planning in `tool/commands/plan.ts`
- [x] T014 [US1] Render the verbose dependency narration section for direct overlay selection in `tool/commands/plan.ts`
- [x] T015 [US1] Attach verbose inclusion-reason data to JSON plan output for direct overlay selection in `tool/commands/plan.ts`

**Checkpoint**: User Story 1 should now be fully functional and testable on its own

---

## Phase 4: User Story 2 - Explain plans loaded from a manifest (Priority: P2)

**Goal**: Let users run `plan --verbose` from an existing `superposition.json` manifest and receive the same explanation quality they get from direct overlay selection.

**Independent Test**: Run `npm run init -- plan --from-manifest superposition.json --verbose` and confirm the explanation treats manifest-defined overlays as the root set while still explaining auto-added dependencies separately.

### Verification for User Story 2

- [x] T016 [US2] Add regression coverage for verbose text output from manifest-driven planning in `tool/__tests__/commands.test.ts`
- [x] T017 [US2] Add regression coverage for verbose JSON output from manifest-driven planning in `tool/__tests__/commands.test.ts`
- [x] T018 [US2] Add regression coverage for missing, invalid, and semantically broken manifests in `tool/__tests__/commands.test.ts`

### Implementation for User Story 2

- [x] T019 [US2] Load manifest-defined overlay roots into the shared plan request model in `tool/commands/plan.ts`
- [x] T020 [US2] Implement manifest-root explanation records that distinguish saved configuration from dependency-driven inclusions in `tool/commands/plan.ts`
- [x] T021 [US2] Prevent partial verbose output when manifest-driven planning fails in `tool/commands/plan.ts`
- [x] T022 [US2] Render manifest-driven verbose narration using the shared explanation model in `tool/commands/plan.ts`
- [x] T023 [US2] Attach manifest input metadata to verbose JSON plan output in `tool/commands/plan.ts`

**Checkpoint**: User Stories 1 and 2 should both work independently

---

## Phase 5: User Story 3 - Trace the full dependency path (Priority: P3)

**Goal**: Let users follow transitive dependency chains and shared-parent paths in both direct and manifest-driven planning without guessing how the final plan was assembled.

**Independent Test**: Run `plan --verbose` for overlays that create transitive or shared-parent dependencies and confirm each included overlay appears once with traceable path information, regardless of whether the roots came from flags or a manifest.

### Verification for User Story 3

- [x] T024 [US3] Add regression coverage for transitive dependency path narration in `tool/__tests__/commands.test.ts`
- [x] T025 [US3] Add regression coverage for shared-parent dependency explanations without duplicate overlay entries in `tool/__tests__/commands.test.ts`

### Implementation for User Story 3

- [x] T026 [US3] Extend inclusion-reason tracking for transitive dependency paths in `tool/commands/plan.ts`
- [x] T027 [US3] Preserve multiple parent reasons while de-duplicating final overlay entries in `tool/commands/plan.ts`
- [x] T028 [US3] Render ordered dependency paths in verbose text output for overlay-list and manifest inputs in `tool/commands/plan.ts`
- [x] T029 [US3] Serialize transitive paths and multi-parent reasons in verbose JSON output in `tool/commands/plan.ts`

**Checkpoint**: User Stories 1 through 3 should all be independently functional

---

## Phase 6: User Story 4 - Preserve concise output when not needed (Priority: P4)

**Goal**: Keep the default plan experience concise while surfacing verbose failure context only when users explicitly request it.

**Independent Test**: Compare `plan` output with and without `--verbose`, then run conflict, invalid-overlay, and stack-incompatible cases with `--verbose` and confirm concise mode is unchanged while verbose mode adds failure context.

### Verification for User Story 4

- [x] T030 [US4] Add regression coverage confirming non-verbose text and JSON output remain unchanged for overlay-list and manifest inputs in `tool/__tests__/commands.test.ts`
- [x] T031 [US4] Add regression coverage for verbose conflict, invalid-overlay, and stack-incompatible skip context in `tool/__tests__/commands.test.ts`

### Implementation for User Story 4

- [x] T032 [US4] Gate verbose narration so it only renders when `--verbose` is present in `tool/commands/plan.ts`
- [x] T033 [US4] Add verbose failure-boundary explanations for conflicts, invalid overlays, stack-incompatible skips, and manifest failures in `tool/commands/plan.ts`
- [x] T034 [US4] Ensure concise summary and verbose explanation reuse the same resolved overlay set in `tool/commands/plan.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Finish docs, changelog, and end-to-end verification for the expanded scope.

- [x] T035 [P] Document direct-selection and manifest-driven `--verbose` examples in `README.md`
- [x] T036 [P] Document manifest-driven verbose planning behavior and examples in `docs/discovery-commands.md`
- [x] T037 Update the user-visible change summary for manifest-driven verbose planning in `CHANGELOG.md`
- [x] T038 Update validation steps and outcomes for manifest-driven planning in `docs/specs/001-verbose-plan-graph/quickstart.md`
- [x] T039 Run automated verification with `npm test` and `npm run lint`, then record the results in `docs/specs/001-verbose-plan-graph/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all story work
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion and should follow US1 because it extends the same command surface and explanation model to manifest inputs
- **User Story 3 (Phase 5)**: Depends on Foundational completion and should follow US1 and US2 because it builds on the shared explanation records across both input modes
- **User Story 4 (Phase 6)**: Depends on Foundational completion and should land after US1 through US3 because it validates backward compatibility and failure behavior across the full verbose path
- **Polish (Phase 7)**: Depends on the desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other stories after Phase 2
- **User Story 2 (P2)**: Depends on the shared explanation data from Phase 2 and should follow US1 once direct-selection verbose records are stable
- **User Story 3 (P3)**: Depends on the verbose output path from US1 and the manifest-root model from US2
- **User Story 4 (P4)**: Depends on the full verbose path from US1 through US3 so concise-mode and failure-boundary regressions are measured against the completed behavior

### Within Each User Story

- Add or update verification tasks before implementation for that story
- Extend shared data capture before rendering output
- Render text and JSON output after explanation data is available
- Complete story-specific regression coverage before moving on

### Parallel Opportunities

- `T035` and `T036` can run in parallel once command behavior is stable
- Within each user story, the work is intentionally sequential because the changes concentrate in `tool/commands/plan.ts` and `tool/__tests__/commands.test.ts`

---

## Parallel Example: User Story 2

```bash
No safe [P] tasks inside User Story 2 because manifest input handling, explanation rendering, and command regression coverage all update shared files.
```

## Parallel Example: Polish

```bash
Task: "Document direct-selection and manifest-driven --verbose examples in README.md"
Task: "Document manifest-driven verbose planning behavior and examples in docs/discovery-commands.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate `plan --verbose` for a direct dependency case
5. Stop for review before expanding into manifest-driven planning

### Incremental Delivery

1. Ship the shared explanation foundation
2. Deliver User Story 1 for direct plus required dependencies
3. Add User Story 2 for manifest-driven verbose planning
4. Add User Story 3 for transitive and shared-parent path tracing across both input modes
5. Add User Story 4 to lock in concise-mode backward compatibility and verbose failure context
6. Finish docs, changelog, and verification

### Parallel Team Strategy

1. One developer completes Setup and Foundational work
2. After US1 lands, one developer can extend manifest input handling while another prepares the manifest-driven documentation examples
3. After US2 lands, the same command owner should complete transitive-path and failure-context work because those changes remain concentrated in shared files

---

## Notes

- All tasks use the required checklist format with IDs, optional `[P]` markers, story labels for story phases, and exact file paths
- The approved spec gate is closed; execution readiness now depends on completing implementation, verification, and documentation tasks cleanly
- Favor command-level regression tests in `tool/__tests__/commands.test.ts` because the risk is user-visible CLI behavior
