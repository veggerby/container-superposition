# Feature Specification: Adopt Command Modularization

**Spec ID**: `037-cli-command-modularization`
**Taxonomy**: `CLI-COMMAND`
**Created**: 2026-06-30
**Author**: PM Agent
**Status**: Final
**Input**: Refactor `tool/commands/adopt.ts` (currently ~1595 lines) into a more modular design that improves maintainability and code quality while preserving current behavior.

---

## Request Classification

Technical, backend-heavy refactor. This is reverse-spec and behavior-preserving work, not a UX feature.

The product contract for `adopt` is already defined by live code, `tool/__tests__/adopt.test.ts`, spec `035-adopt-and-migrate-conversion-workflows`, and ADR `001`.

## Problem Statement

`tool/commands/adopt.ts` currently mixes too many responsibilities in one command module:

- overlay-registry-driven detection table construction
- feature / service / extension / remoteEnv / script analysis
- stack and overlay suggestion logic
- expected config synthesis and custom patch generation
- confidence classification and next-step resolution
- human-readable framing and JSON output shaping
- overwrite guard, TTY confirmation, backup handling, and file writes

Observed repo evidence:

- the file is about 1595 lines long
- it currently contains roughly 38 named functions in one module
- tests for this area are concentrated in `tool/__tests__/adopt.test.ts`, which validates many behaviors through one entry surface
- the command already depends on schema, questionnaire, backup, UX rendering, and filesystem layers inside the same file

This creates three practical problems:

1. **High regression risk for routine changes** — small edits can accidentally affect unrelated concerns.
2. **Weak ownership boundaries** — pure analysis, UX framing, and write-side effects are hard to reason about separately.
3. **Poor extension path** — future fixes or adjacent refactors must keep reopening a monolithic command.

## Product Outcome

Make the `adopt` command internally modular enough that maintainers can change, test, and reason about detection, analysis, output modeling, and write execution independently, while preserving current command behavior.

Success means:

- the command entrypoint becomes a thin orchestrator instead of the primary home for all business logic
- pure logic is extractable into focused modules with explicit inputs/outputs
- write-side effects are isolated from analysis and formatting logic
- the existing `adopt` user contract remains materially unchanged
- test coverage becomes easier to target at module level without losing end-to-end command protection

## Current Behavior To Preserve

The refactor must preserve the current `adopt` behavior established by live code and tests, including:

1. registry-driven detection table construction from overlay files
2. compose-path resolution behavior for string, array, relative, and default compose paths
3. detection and deduplication semantics across:
    - features
    - docker compose services
    - VS Code extensions
    - `remoteEnv`
    - generated setup / verify script commands
4. stack suggestion and suggested overlay selection behavior
5. generation of project-file selection, compatibility manifest, and preserved `custom/` patch artifacts
6. confidence classification and stop-state behavior
7. JSON output contract currently consumed by tests
8. human-readable `adopt` flow defined in spec `035`, including section order and confirmation semantics
9. overwrite guard, TTY gating, backup behavior, and project-file discovery rules
10. ADR `001` project-file-first authority and compatibility-manifest story

## Scope

### In scope

- Refactoring `tool/commands/adopt.ts` into smaller ownership units.
- Defining the required behavior-preserving seams between:
    - detection and matching
    - analysis aggregation
    - patch / project-selection synthesis
    - confidence and artifact write models
    - CLI rendering/view-model construction
    - write planning and execution
- Preserving or re-exporting the current public entry surface needed by CLI wiring and existing tests.
- Expanding automated coverage where needed so extracted modules can be validated directly.

### Out of scope

- Changing `adopt` flags, CLI invocation shape, or command purpose.
- Changing detection heuristics or overlay-matching policy unless required to preserve existing behavior.
- Redesigning `adopt` copy, section order, next-step wording, or JSON field semantics.
- Refactoring `migrate`, `doctor`, or other commands in this spec.
- Changing manifest policy, project-file policy, or backup policy.
- Introducing new user-visible conversion capabilities.

## Non-Goals

- Shrink line count as a goal by itself without improving ownership boundaries.
- Re-open product decisions already covered by spec `035` or ADR `001`.
- Force a shared cross-command conversion framework unless technical design shows clear value.
- Rewrite tests only to match a new internal structure if behavior has not changed.

## Refactor Outcome Contract

The implementation may choose exact file names and layout, but the resulting design must clearly separate the following concern groups:

1. **Detection sources and matching rules**
    - building detection tables
    - mapping raw features, images, extensions, env signals, and scripts to overlays

2. **Analysis assembly**
    - combining detections
    - deduplicating signals
    - inferring stack / overlay suggestions
    - collecting unmatched or preserved items

3. **Config and preservation synthesis**
    - expected config construction
    - custom devcontainer patch generation
    - custom compose patch generation
    - project selection building

4. **Adopt outcome/view models**
    - confidence classification
    - artifact write review data
    - JSON response shaping
    - human-readable section payloads

5. **Command orchestration and side effects**
    - argument handling
    - filesystem preflight and overwrite guard
    - confirmation and backup flow
    - artifact writing
    - final success / stop-state dispatch

The command entrypoint should remain the canonical orchestration surface, but not the primary implementation home for all five concern groups.

## Constraints

- Keep ESM import rules from `AGENTS.md` (`.js` extensions in imports).
- Do not edit `dist/`.
- Preserve current source/compiled path behavior for any filesystem lookup logic that remains path-sensitive.
- Avoid introducing cyclic dependencies between command, schema, questionnaire, and UX layers.

## Acceptance Criteria

| #     | Criterion                                                                                                                                                                                                                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1  | `tool/commands/adopt.ts` is no longer a monolithic home for detection, analysis, rendering, and write execution logic; those concern groups are split into modular units with explicit boundaries.                                                                                                     |
| AC-2  | The CLI-level `adopt` behavior remains materially unchanged for normal, dry-run, JSON, blocked, and successful write flows, including current exit conditions and confirmation gating.                                                                                                                 |
| AC-3  | Human-readable output remains aligned with spec `035`, including the shared first-screen framing, ordered section contracts, low-confidence stop-state behavior, write review semantics, and success checklist structure.                                                                              |
| AC-4  | JSON output remains semantically aligned with current behavior, including `detections`, `unmatchedItems`, `customDevcontainerPatch`, `customComposePatch`, `suggestedStack`, `suggestedOverlays`, `suggestedCommand`, confidence fields, managed/preserved/manual-review fields, and `artifactWrites`. |
| AC-5  | Detection semantics are preserved across feature, service, extension, `remoteEnv`, and script-based signals, including exact-vs-heuristic precedence and overlay-level deduplication.                                                                                                                  |
| AC-6  | Project-file selection, compatibility manifest writing, preserved custom artifact generation, and backup / overwrite behavior remain aligned with current code and ADR `001`.                                                                                                                          |
| AC-7  | The command entry surface needed by CLI wiring remains stable; any helpers currently imported by tests or other repo code remain available either at the same path or through explicit re-exports with equivalent behavior.                                                                            |
| AC-8  | New or updated automated tests verify both extracted pure modules and top-level command behavior, so the refactor reduces reliance on only one large end-to-end test surface.                                                                                                                          |
| AC-9  | The implementation does not introduce user-visible behavior changes unless they are required to preserve documented behavior or fix a demonstrated regression discovered during extraction.                                                                                                            |
| AC-10 | `npm run lint` and the relevant `adopt` test coverage pass after the refactor; if targeted `adopt`-only execution is not maintained, `npm test` is required.                                                                                                                                           |

## Validation Expectations

Minimum validation for implementation handoff:

- targeted tests covering `adopt` behavior and any newly extracted pure modules
- `npm run lint`
- `npm test` if the repo does not keep a stable targeted `adopt` test command

Validation should explicitly cover:

- detection-table construction parity
- compose-path resolution parity
- confidence classification parity
- preserved patch synthesis parity
- overwrite / TTY / confirmation / backup flow parity
- human-readable output contract parity already asserted by `tool/__tests__/adopt.test.ts`

## Risks and Unknowns

### Main risks

- accidental behavior drift during extraction because many current tests validate behavior through one high-level command
- over-sharing modules too early with `migrate` or `doctor`, creating coupling before boundaries are proven
- under-separating write logic from pure analysis, which would preserve line count problems under new filenames

### Known repo gaps

- `docs/foundation.md` is absent, so ADR `001` remains the architecture authority for this area.
- Repo contains an empty `docs/specs/037-doctor-command-modularization/` directory, which is a numbering / workflow hygiene concern but does not block this draft.

## Technical Design

### Recommended Module Layout

Keep `tool/commands/adopt.ts` as the stable CLI entrypoint and extraction/re-export surface, then move implementation into an `adopt/` sibling directory:

- `tool/commands/adopt.ts`
    - owns CLI-facing `adoptCommand(...)`
    - performs top-level preflight (`dir` existence, `devcontainer.json` presence, dual project-file block)
    - wires detection, planning, rendering, confirmation, backup, and writes together
    - re-exports any helper functions that tests or other repo code already import from `../commands/adopt.js`
- `tool/commands/adopt/types.ts`
    - shared `DetectionTables`, `DetectionResult`, `UnmatchedItem`, `AnalysisResult`, and any new view-model/write-plan types
    - keeps boundary contracts explicit and avoids type drift across modules
- `tool/commands/adopt/detection.ts`
    - owns registry-driven table building and low-level match helpers
    - includes feature URI normalization, image-prefix extraction, score functions, and feature/image/extension match lookup
    - should continue exporting `buildDetectionTables(...)`
- `tool/commands/adopt/analysis.ts`
    - owns source-specific analyzers (`features`, `extensions`, `docker compose`, `remoteEnv`, `postCreate/postStart` scripts)
    - owns `resolveComposePaths(...)`, deduplication, stack inference, suggested overlay selection, and suggested command generation
    - assembles raw detections plus unmatched service/signal data into a normalized analysis/planning input
- `tool/commands/adopt/synthesis.ts`
    - owns expected generated config synthesis and preservation diffing
    - includes base-image inference, generated overlay command injection, expected devcontainer/compose construction, `subtractDefaults(...)`, custom patch construction, and project-file selection building
    - keeps path-sensitive template lookup isolated so source/dist candidate resolution stays correct
- `tool/commands/adopt/presentation.ts`
    - owns confidence classification, artifact review rows, JSON model shaping, and ordered section payloads for text rendering
    - should produce structured data first, leaving final string formatting to shared renderers already under `tool/ux/`
- `tool/commands/adopt/write.ts`
    - owns write-plan execution only: manifest write, project-file write, `custom/` directory creation, preserved patch serialization, and backup side effects
    - must not re-run analysis or own CLI prompting decisions

Recommended rule: extracted modules stay `adopt`-specific first. Do not introduce shared conversion helpers for `migrate` in this refactor unless a second real consumer appears during extraction. That keeps the boundary change maintainability-focused instead of creating premature cross-command coupling.

### Architecture Ownership

- **`adopt.ts` orchestrator owns**: command lifecycle, blocking/exit decisions, prompt gating, and calling order.
- **Detection layer owns**: deriving overlay candidates from registry data and source signals.
- **Analysis layer owns**: combining signals into stack/overlay suggestions and preserved/manual-review inputs.
- **Synthesis layer owns**: computing expected managed state and the residual custom patches/project selection.
- **Presentation layer owns**: turning analysis/write-plan state into confidence, artifact review, JSON payloads, and ordered section bodies.
- **Write layer owns**: filesystem mutation after approval.

Must **not** happen:

- presentation code must not inspect the filesystem directly except through already-computed artifact rows
- write code must not decide confidence, prompts, or section ordering
- analysis code must not print, prompt, or write files
- detection code must not know about backup policy, UX copy, or manifest writing

### System Boundaries

#### Stable public surface

Preserve the current import surface from `tool/commands/adopt.ts`:

- `adoptCommand`
- `analyseDevcontainer`
- `resolveComposePaths`
- `buildDetectionTables`

Implementation may move these functions internally, but `adopt.ts` should continue exporting them so CLI wiring and current tests stay stable during refactor.

#### IO vs pure logic split

Prefer a two-step boundary for maintainability:

1. thin IO wrappers load files / resolve paths / write artifacts
2. pure functions consume loaded objects and return typed results

Examples:

- keep `analyseDevcontainer(dir, ...)` as a compatibility wrapper, but delegate to an internal pure planner that accepts loaded `devcontainer` JSON and compose documents
- keep write serialization in one module so future changes to manifest/project-file outputs do not affect detection tests

### Canonical Data Flow

```mermaid
flowchart LR
    A[adoptCommand entrypoint] --> B[preflight and path discovery]
    B --> C[buildDetectionTables]
    C --> D[analysis planners]
    D --> E[synthesis of expected managed config and preserved patches]
    E --> F[presentation/view-model assembly]
    F --> G{text or JSON output]
    F --> H{write allowed?}
    H -->|no| I[stop or dry-run handoff]
    H -->|yes| J[confirmation and backup]
    J --> K[artifact write execution]
    K --> L[success summary]
```

Data-flow invariant: everything after analysis should operate on explicit typed models rather than re-reading source files or re-deriving overlay suggestions. This prevents drift between preview, JSON output, and live-write behavior.

### Recommended Implementation Sequence

#### Slice 1 — establish contracts without behavior changes

- create `tool/commands/adopt/types.ts`
- move/export shared types and small pure helpers first
- keep `adopt.ts` delegating to in-file implementations until each target module exists
- add narrow unit tests for extracted helpers only when exports or signatures change

Exit condition: no CLI behavior change; existing `adopt.test.ts` still passes.

#### Slice 2 — extract detection and compose-path logic

- move detection table construction, normalization, scoring, and matching helpers into `detection.ts`
- move `resolveComposePaths(...)` and compose-path-specific tests into `analysis.ts` or a dedicated helper inside the adopt module set
- keep compatibility re-exports from `adopt.ts`

Exit condition: detection-table and compose-path tests pass with unchanged results.

#### Slice 3 — extract signal analysis and planning

- move feature/service/extension/remoteEnv/script analyzers, deduplication, stack inference, and suggested-command generation into `analysis.ts`
- keep `analyseDevcontainer(...)` behavior identical, but split it into:
    - file-loading wrapper
    - pure analysis/planning function

Exit condition: JSON-facing analysis assertions still pass; no change to top-level output order.

#### Slice 4 — extract synthesis and preservation diffing

- move expected devcontainer/compose generation, base-image inference, generated command injection, residual patch construction, and project selection building into `synthesis.ts`
- keep template-path candidate logic together in this module to avoid duplicating source/dist path handling

Exit condition: custom patch parity tests and project-file selection tests pass unchanged.

#### Slice 5 — extract presentation/view-model logic

- move confidence classification, artifact row construction, and JSON model assembly into `presentation.ts`
- prefer a single `buildAdoptViewModel(...)` or similarly named function that produces all human-readable/JSON-ready sections from analysis + artifact state
- remove dead formatting helpers that are no longer used (`formatAnalysisTable`, `formatUnmatchedTable`) instead of moving them if they are not part of the current UX contract

Exit condition: human-readable output tests keep current section order and JSON payload keys remain unchanged.

#### Slice 6 — extract write execution

- move manifest/project/custom patch writes plus backup-related write steps into `write.ts`
- keep overwrite guard and confirmation choice in `adopt.ts`, since they are command-lifecycle decisions
- have write module accept a precomputed write plan instead of raw CLI options when possible

Exit condition: live-write tests still prove project root placement, artifact creation, and backup behavior.

#### Slice 7 — final entrypoint thinning

- reduce `tool/commands/adopt.ts` to orchestration only
- ensure imports use `.js` extensions
- confirm exports/re-exports remain stable

Exit condition: `adopt.ts` reads as a thin control-flow file rather than a logic warehouse.

### Risk Notes

#### Highest-risk seams

1. **preview/write divergence** — if preview builds one model and live write recomputes another, behavior will drift.
2. **path-sensitive template lookup** — source vs compiled candidate handling must stay centralized.
3. **public export drift** — tests currently import helpers directly from `../commands/adopt.js`.
4. **JSON/text divergence** — separate shaping paths could accidentally change confidence or unmatched-item semantics.
5. **default filtering regressions** — `subtractDefaults(...)` and expected-config synthesis are subtle and already validated by large integration tests.

#### Mitigations

- keep one canonical `AnalysisResult` / view-model path used by both text and JSON output
- do not change matching heuristics, ordering, or dedup precedence during module extraction
- preserve existing helper names via re-export until tests can be safely narrowed later
- move dead code only after proving it is not part of current tests or CLI output

### Test Plan

#### Preserve current command-level protection

Retain `tool/__tests__/adopt.test.ts` as the primary end-to-end regression suite for:

- dry-run analysis flow
- JSON contract
- low-confidence stop behavior
- overwrite guard / TTY / confirmation flow
- live write behavior and artifact placement

#### Add focused module-level tests during extraction

Recommended new test files:

- `tool/__tests__/adopt-detection.test.ts`
    - feature scoring precedence (`nodejs` beats `bun` for `node` feature)
    - extension/image match table behavior
    - local feature path exclusion
- `tool/__tests__/adopt-analysis.test.ts`
    - compose path resolution parity
    - overlay deduplication precedence (`exact` beats `heuristic`)
    - stack inference and suggested overlay/command generation
    - remoteEnv/script signal handling
- `tool/__tests__/adopt-synthesis.test.ts`
    - base-image inference
    - expected config generation
    - `subtractDefaults(...)` parity for arrays/objects/scalars
    - custom devcontainer/compose patch preservation rules
- `tool/__tests__/adopt-presentation.test.ts`
    - confidence classification thresholds
    - artifact row generation parity
    - JSON model field presence and section-order payload generation
- `tool/__tests__/adopt-write.test.ts`
    - manifest/project-file/custom patch serialization using temp dirs
    - backup-triggered side effects under controlled fixtures

#### Validation commands

Minimum implementation validation:

- `npm run lint`
- targeted Vitest coverage for extracted adopt modules if added
- `npm test` before merge because current regression protection is concentrated in `tool/__tests__/adopt.test.ts`

## Architecture Decision Impact

aligned with current ADR authority

This design stays within ADR `001` by preserving project-file-first authority, compatibility manifest writing, and generated-output-unchanged conversion semantics. No ADR amendment is required. The repo still lacks `docs/foundation.md`, so ADR `001` remains the controlling architecture reference for this work.

## Open Questions

- None blocking for PM. The design recommendation is to keep modules `adopt`-specific now and revisit sharing only after a second command proves the boundary.

## Implementation Notes

- Refactored `tool/commands/adopt.ts` into a thin orchestrator backed by `tool/commands/adopt/{types,detection,analysis,synthesis,presentation,write}.ts` while preserving the public `adopt.ts` exports for CLI wiring and existing tests.
- Added focused module-level tests in `tool/__tests__/adopt-analysis.test.ts`, `tool/__tests__/adopt-synthesis.test.ts`, and `tool/__tests__/adopt-presentation.test.ts` alongside the existing end-to-end `tool/__tests__/adopt.test.ts` coverage.
- Validation run: `npm run lint`, `npx vitest run tool/__tests__/adopt.test.ts tool/__tests__/adopt-analysis.test.ts tool/__tests__/adopt-synthesis.test.ts tool/__tests__/adopt-presentation.test.ts`, and `npm test`.
- Acceptance criteria status: AC-1 through AC-10 implemented. The refactor preserved detection, synthesis, JSON/text output, write flow, and compatibility re-exports without intentional user-visible behavior changes.

## Routing Decision

**PM → Developer**

Reason: architect concerns are now reconciled into this draft via explicit module boundaries, stable public-surface rules, data-flow constraints, implementation slices, and validation expectations. Product scope, UX preservation, and technical direction are sufficiently concrete for implementation without additional PM or architect discovery.

**QA Status**: Passed

## QA Feedback

Resolved. `adopt` is now split into focused detection, analysis, synthesis, presentation, and write modules; `tool/commands/adopt.ts` remains a thin orchestration/re-export surface; and both module-level and command-level adopt coverage pass.
