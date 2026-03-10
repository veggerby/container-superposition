# Tasks: Verbose Plan Graph

**Input**: Design documents from `/docs/specs/001-verbose-plan-graph/`
**Prerequisites**: [plan.md](/workspaces/container-superposition/docs/specs/001-verbose-plan-graph/plan.md), [spec.md](/workspaces/container-superposition/docs/specs/001-verbose-plan-graph/spec.md), [research.md](/workspaces/container-superposition/docs/specs/001-verbose-plan-graph/research.md), [data-model.md](/workspaces/container-superposition/docs/specs/001-verbose-plan-graph/data-model.md), [plan-verbose-output.md](/workspaces/container-superposition/docs/specs/001-verbose-plan-graph/contracts/plan-verbose-output.md)

**Tests**: Add automated command-level coverage in `tool/__tests__/commands.test.ts`, then run manual quickstart validation plus `npm test` and `npm run lint`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g. `US1`, `US2`, `US3`)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Record the governance gate and prepare the command surface for implementation.

- [x] T001 Confirm spec commit status and review gate in `docs/specs/001-verbose-plan-graph/spec.md`
- [x] T002 Align implementation notes and execution order in `docs/specs/001-verbose-plan-graph/plan.md` before coding begins
- [x] T003 Add the `--verbose` command option registration in `scripts/init.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the shared dependency-explanation foundation that all user stories rely on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Refactor dependency resolution outputs in `tool/commands/plan.ts` to carry overlay inclusion reason data alongside resolved overlays
- [x] T005 Define shared verbose explanation formatting helpers in `tool/commands/plan.ts`
- [x] T006 Define shared verbose JSON payload shaping in `tool/commands/plan.ts`
- [x] T007 Add baseline regression coverage for option parsing and shared plan payload behavior in `tool/__tests__/commands.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Explain auto-included overlays (Priority: P1) 🎯 MVP

**Goal**: Let users see why directly selected overlays and auto-added required dependencies appear in the final plan.

**Independent Test**: Run `npm run init -- plan --stack compose --overlays grafana --verbose` and confirm the output explains `grafana` as user-selected and `prometheus` as required by `grafana`, without duplicating overlays.

### Verification for User Story 1

- [x] T008 [US1] Add verbose text-output regression coverage for direct selections and required dependencies in `tool/__tests__/commands.test.ts`
- [x] T009 [US1] Add verbose JSON regression coverage for direct selections and required dependencies in `tool/__tests__/commands.test.ts`

### Implementation for User Story 1

- [x] T010 [US1] Implement direct-selection explanation records in `tool/commands/plan.ts`
- [x] T011 [US1] Implement required-dependency explanation records in `tool/commands/plan.ts`
- [x] T012 [US1] Render the verbose dependency narration section for normal text output in `tool/commands/plan.ts`
- [x] T013 [US1] Attach verbose inclusion-reason data to JSON plan output when `--verbose` is requested in `tool/commands/plan.ts`

**Checkpoint**: User Story 1 should now be fully functional and testable on its own

---

## Phase 4: User Story 2 - Trace the full dependency path (Priority: P2)

**Goal**: Let users follow transitive dependency chains and shared-parent dependency paths without guessing how the final plan was assembled.

**Independent Test**: Run `plan --verbose` for overlays that create transitive or shared-parent dependencies and confirm each included overlay appears once with traceable path information.

### Verification for User Story 2

- [x] T014 [US2] Add regression coverage for transitive dependency path narration in `tool/__tests__/commands.test.ts`
- [x] T015 [US2] Add regression coverage for shared-parent dependency explanations without duplicate overlay entries in `tool/__tests__/commands.test.ts`

### Implementation for User Story 2

- [x] T016 [US2] Extend inclusion-reason tracking for transitive dependency paths in `tool/commands/plan.ts`
- [x] T017 [US2] Preserve multiple parent reasons while de-duplicating final overlay entries in `tool/commands/plan.ts`
- [x] T018 [US2] Render ordered dependency paths in verbose text output in `tool/commands/plan.ts`
- [x] T019 [US2] Serialize transitive paths and multi-parent reasons in verbose JSON output in `tool/commands/plan.ts`

**Checkpoint**: User Stories 1 and 2 should both work independently

---

## Phase 5: User Story 3 - Preserve concise output when not needed (Priority: P3)

**Goal**: Keep the default plan experience concise while still surfacing verbose failure context when explicitly requested.

**Independent Test**: Compare `plan` output with and without `--verbose`, then run a conflict case with `--verbose` and confirm the concise mode is unchanged while verbose mode adds explanation context.

### Verification for User Story 3

- [x] T020 [US3] Add regression coverage confirming non-verbose text and JSON output remain unchanged in `tool/__tests__/commands.test.ts`
- [x] T021 [US3] Add regression coverage for verbose conflict or invalid-selection context in `tool/__tests__/commands.test.ts`

### Implementation for User Story 3

- [x] T022 [US3] Gate verbose narration so it only renders when `--verbose` is present in `tool/commands/plan.ts`
- [x] T023 [US3] Add verbose failure-boundary explanations for conflicts and invalid overlay handling in `tool/commands/plan.ts`
- [x] T024 [US3] Ensure concise summary and verbose explanation reuse the same resolved overlay set in `tool/commands/plan.ts`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Finish documentation, changelog, and end-to-end verification.

- [x] T025 [P] Document `--verbose` usage and examples in `README.md`
- [x] T026 [P] Document verbose dependency narration behavior and examples in `docs/discovery-commands.md`
- [x] T027 Update the user-visible change summary in `CHANGELOG.md`
- [x] T028 Run manual quickstart validation and record any command adjustments in `docs/specs/001-verbose-plan-graph/quickstart.md`
- [x] T029 Run automated verification with `npm test` and `npm run lint`, then record verification results in `docs/specs/001-verbose-plan-graph/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Starts immediately
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all story work
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion and can build after US1 or in parallel if the shared resolver contract is stable
- **User Story 3 (Phase 5)**: Depends on Foundational completion and should land after US1 because it verifies backward compatibility against the new verbose path
- **Polish (Phase 6)**: Depends on the desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on other stories after Phase 2
- **User Story 2 (P2)**: Depends on the shared explanation data from Phase 2; can follow US1 once basic verbose records exist
- **User Story 3 (P3)**: Depends on the verbose output path from US1 and conflict/context behavior from the shared resolver

### Within Each User Story

- Add or update verification tasks before implementation for that story
- Extend data capture before rendering output
- Render text and JSON output after explanation data is available
- Complete story-specific regression coverage before moving on

### Parallel Opportunities

- `T025` and `T026` can run in parallel once command behavior is stable
- Within each user story, the implementation work is intentionally sequential because the changes concentrate in `tool/commands/plan.ts` and `tool/__tests__/commands.test.ts`

---

## Parallel Example: User Story 1

```bash
No safe [P] tasks inside User Story 1 because both implementation and verification concentrate in `tool/commands/plan.ts` and `tool/__tests__/commands.test.ts`.
```

## Parallel Example: User Story 2

```bash
No safe [P] tasks inside User Story 2 because transitive-path logic and its regression coverage both update shared files.
```

## Parallel Example: Polish

```bash
Task: "Document --verbose usage and examples in README.md"
Task: "Document verbose dependency narration behavior and examples in docs/discovery-commands.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate `plan --verbose` for a direct dependency case
5. Stop for review before expanding into transitive-path narration

### Incremental Delivery

1. Ship the shared explanation foundation
2. Deliver User Story 1 for direct plus required dependencies
3. Add User Story 2 for transitive and shared-parent path tracing
4. Add User Story 3 to lock in concise-mode backward compatibility and verbose failure context
5. Finish docs, changelog, and verification

### Parallel Team Strategy

1. One developer completes Setup and Foundational work
2. A second developer can prepare documentation examples once verbose output shape stabilizes
3. After US1 lands, one developer can extend transitive-path logic while another hardens concise-mode and failure-context regression coverage

---

## Notes

- All tasks use the required checklist format with IDs, optional `[P]` markers, story labels for story phases, and exact file paths
- The implementation gate from the spec still applies: no code changes should start until the spec is committed and reviewed
- Favor command-level regression tests in `tool/__tests__/commands.test.ts` because the risk is user-visible CLI behavior
