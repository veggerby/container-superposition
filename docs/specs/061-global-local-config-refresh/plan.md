# Plan

## Scope and Delivery Posture

- Spec: `docs/specs/061-global-local-config-refresh/spec.md`
- Planning source revision: `d23694bb838c84a7d90f6086a8260d85a7812982`
- Execution profile: **Standard** — the change adds a public command and destructive-adjacent replacement path across CLI wiring, config semantics, tests, and user documentation.
- Review gate: **INDEPENDENT** — required by the spec for overwrite/backup safety and the public CLI contract.
- Route recommendation: **direct implementation**, followed by targeted validation, the full required gates, and independent review. Diagnosis-first work is not needed because this is a confirmed feature with bounded behavior and existing semantics to reuse.
- Requirements authority remains `spec.md`; this plan does not alter its acceptance criteria or non-goals.

## Technical Approach and Boundaries

- Keep `tool/commands/defaults.ts` as the command-specific orchestration boundary. The refresh flow should load and validate all source inputs, decide whether approval is required, stage the serialized result, create a collision-safe sibling backup when replacing, and only then atomically replace the repository local file.
- Keep `tool/cli/args.ts` responsible only for the public `defaults refresh-local` command shape, `--force` and command help, and dispatch. Preserve the existing `defaults [--json]` inspection behavior while adding the nested write action; do not route refresh through `init`.
- Reuse `tool/schema/project-config.ts` for selected home-file discovery, selected-file errors, project-file loading, local-template parsing, meaningful-template checks, and local-config serialization. Extract/export the existing spec-042 materialization and selected-stack compatibility helpers from their current init-only location rather than implementing a second merge/validation model for refresh. Both fresh-init scaffolding and refresh must consume the same helpers.
- For a direct template, do not require or infer a project stack. For a stack-aware template, load the canonical repository project file and require its validated `stack`; never consult `initDefaults` or the existing local file for stack selection.
- Treat replacement as a transaction-like sequence: finish discovery, parsing, materialization, compatibility validation, serialization, TTY/force gating, and explicit confirmation before backup or target writes; reserve a distinct timestamped sibling backup using exclusive creation; clean up any staged temporary file on failure; and rename the staged file into place only after backup succeeds. Never overwrite a colliding backup or alter either home defaults file.
- Keep backup naming and creation local to this single-file refresh contract unless a genuinely compatible shared helper emerges. Existing directory backup behavior and doctor’s non-collision-safe file helper are precedents, not safe drop-in implementations.
- Preserve the authority boundary: refresh is the sole new explicit home-default read/write path. `regen`, `doctor`, `plan`, replay-style `init`, and other commands remain unchanged and continue to consume repository inputs only.
- No new dependency, schema shape, migration, generated-output behavior, or Git-index behavior is required.

## Ordered Implementation Steps

1. **Establish shared template semantics without changing init behavior.**
    - Move or export the direct-vs-stack-aware discriminator, `common + selected branch` merge/compaction, meaningful-result handling, and selected-stack compatibility validation from `tool/cli/run.ts` into the existing config ownership surface in `tool/schema/project-config.ts` (or a narrowly named sibling schema/config module if that avoids an ownership tangle).
    - Update fresh `init` scaffolding to call that single shared implementation and retain all current spec-042 behavior, including `ports: []`, append/override rules, selected-branch-only compatibility checks, literal preservation, and no-op empty templates.
    - Add focused pure unit assertions only where current command tests do not directly exercise the extracted seam.

2. **Implement the refresh command workflow and safe file transaction.**
    - Extend `tool/commands/defaults.ts` with a refresh-specific entry point/model while preserving the existing inspection result and output.
    - Load the selected global defaults with existing precedence and path-specific error behavior; reject no selected file, absent/empty `localConfigTemplate`, or invalid selected content before repository writes.
    - Resolve canonical project stack only for stack-aware templates, materialize and compatibility-check the selected payload, serialize through the existing local-config serializer, and reject unusable results.
    - If the local file is absent, create it without a replacement prompt. If it exists, use the established stdin-and-stdout TTY convention for a safe-default explicit confirmation; noninteractive replacement requires `--force`, and cancellation/refusal occurs before backup.
    - For approved/forced replacement, create exactly one exclusive, timestamped sibling backup (with deterministic collision suffixing or retry), report its path, and atomically install the staged local file. Ensure backup failure leaves the original target unchanged and no stale temporary file remains.
    - Return clear success/refusal/error output without exposing or expanding authored personal values beyond the existing validated serialization contract.

3. **Wire the public CLI contract.**
    - Update `tool/cli/args.ts` so `cs defaults` remains the current read-only inspection action and `cs defaults refresh-local [--force]` dispatches the new workflow.
    - Include command help for replacement confirmation, noninteractive `--force`, selected-file precedence, sibling backups, and explicit bootstrap/synchronization-only authority. Preserve applicable `--silent` behavior for the new executable path; do not add unrelated flags or JSON output not required by the spec.
    - Verify help and dispatch from both source execution and compiled output; this change introduces no new `__dirname` path logic.

4. **Add safety-focused automated coverage.**
    - Extend `tool/__tests__/global-defaults.test.ts` command coverage for both filename-selection cases, selected invalid source errors, no selected source/no usable template, direct creation without confirmation, stack-aware plain/compose materialization, literal and mount-target preservation, missing/invalid canonical stack authority, interactive confirm/cancel, noninteractive refusal, forced replacement, reported backup content, collision-safe backup allocation, backup failure, and all required no-write/no-home-mutation paths.
    - Add focused unit coverage for shared materialization/compatibility and backup-name reservation/atomic replacement seams if those can be tested more precisely than subprocess command cases.
    - Retain and run existing negative tests proving `regen`, `doctor`, `plan`, and replay-style `init` ignore invalid home defaults.
    - Add a focused scenario to `tests/behave/features/core-tooling.feature` for the public refresh route (at minimum direct creation from selected defaults, with stack-aware/project-file behavior if concise). Keep collision/failure injection in Vitest because the Behave harness has no stable clock/filesystem-failure controls; command-level subprocess tests provide the appropriate executable evidence for those branches.

5. **Synchronize user-facing documentation in the implementation change.**
    - Update `README.md`, `docs/quick-reference.md`, and `docs/superposition-yml.md` to describe `defaults refresh-local`, precedence, direct versus stack-aware behavior, the `--force` replacement guard, timestamped sibling backup, and the explicit sync-only/non-replay authority boundary.
    - Fold the feature into the existing `[Unreleased]` global-defaults/defaults entry in `CHANGELOG.md` as one consolidated `Added` item rather than duplicating it under another category.
    - Do not change spec status/index metadata until the role that owns implementation/review state performs that workflow transition.

6. **Validate, inspect the diff, and hand off for independent review.**
    - Run the targeted unit/command and focused Behave checks during iteration, then the full required validation, build, and repository health checks listed below.
    - Inspect the final diff for accidental generated files, home-path leakage, schema output changes, weakened no-write ordering, or changes outside this plan’s file boundary.
    - Record command provenance and map results to every `GLC-REFRESH-*` criterion before requesting the mandated independent review.

## Affected Areas and Ownership

- `tool/schema/project-config.ts` — shared global/local config parsing, template materialization/compatibility seam, project-stack loading, and serialization; no global or local schema shape change.
- `tool/cli/run.ts` — replace private init materialization logic with the shared helper while preserving fresh-init scaffolding behavior; it must not gain refresh orchestration.
- `tool/commands/defaults.ts` — owns refresh preflight, approval/force gating, collision-safe backup, atomic local-file write, and refresh output alongside preserved read-only inspection.
- `tool/cli/args.ts` — owns nested command registration, flags, help, and dispatch only.
- `tool/__tests__/global-defaults.test.ts` — primary unit and subprocess command regression surface for selection, materialization, safety, and authority isolation.
- `tests/behave/features/core-tooling.feature` — user-visible public workflow acceptance scenario; reuse existing home/workspace fixture steps where sufficient.
- `tests/behave/steps/generation_steps.py` — change only if a small reusable assertion is needed for a reported timestamped sibling backup; avoid adding clock-dependent behavior to BDD.
- `README.md`, `docs/quick-reference.md`, `docs/superposition-yml.md` — command discovery and global/local config guidance.
- `CHANGELOG.md` — consolidated `[Unreleased]` user-visible feature entry.
- Explicitly out of bounds: `dist/`, generated schemas, overlay sources/docs, generated `.devcontainer/`, Git index state, global-default schema fields, project/local runtime semantics, and replay/remediation command authority.

## Architecture and Engineering Fit

| Attribute                          | Status         | Evidence / implementation constraint                                                                                                                                   |
| ---------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Correctness and task fit           | ALIGNED        | The spec defines selection, stack authority, approval, backup ordering, and no-write outcomes with stable AC IDs.                                                      |
| Architectural fit                  | ALIGNED        | Command orchestration stays in `tool/commands/`; config semantics stay in `tool/schema/`; ADR 001 project-file-first replay remains unchanged.                         |
| Simplicity and proportionality     | ALIGNED        | Reuse current loader/serializer/materialization semantics and platform filesystem primitives; add no dependency or new runtime layer.                                  |
| Maintainability and decoupling     | ALIGNED        | One shared template model serves init and refresh; CLI wiring does not own filesystem behavior; command-specific backup logic is not prematurely generalized.          |
| Testability and evidence           | ALIGNED        | Pure merge/backup seams plus subprocess command tests and one Behave workflow cover behavior at the right levels.                                                      |
| Security, privacy, and data safety | ALIGNED        | Only validated local-config fields are copied; literals are not expanded; backup is exclusive and sibling-confined; home files and Git index are never mutated.        |
| Reliability and operability        | ALIGNED        | Validation and approval precede writes; backup precedes replacement; staged atomic install and cleanup limit partial-write risk; output reports the recovery artifact. |
| Performance and scalability        | NOT_APPLICABLE | The command reads and writes a few small local YAML files; no persistent service or large-data path is introduced.                                                     |
| Compatibility and user impact      | ALIGNED        | Existing `defaults`, init scaffolding, and replay flows stay intact; the new behavior is explicit and additive.                                                        |
| Documentation and traceability     | ALIGNED        | Help, three user-doc surfaces, changelog, AC mapping, and independent review are planned in the same delivery.                                                         |

**Architecture decision:** PASS. The feature applies existing config and project-authority decisions without changing a durable cross-system boundary. **No ADR or ADR amendment is needed.** If implementation cannot share materialization semantics without changing spec-042 behavior or ADR-001 authority, stop and route that conflict to Lead rather than creating a second model.

## Validation Surface and Strategy — DISCOVER

- Manifest source: discovered from `AGENTS.md`, `docs/definition-of-done.md`, `Taskfile.yml`, `package.json`, the spec, local `cli-command-delivery` guidance, and nearby tests at source revision `d23694bb838c84a7d90f6086a8260d85a7812982`.
- Invalidation triggers: changes to package scripts/Taskfile, test harness, CLI/config modules named above, spec acceptance criteria, foundation/ADR authority, or repository validation guidance require rediscovery.
- Evidence profile: **Expanded**, because replacement safety and a public CLI contract require branch-specific proof and independent review.

### Selected checks

| Level                     | Command / method                                                                                                                                                              | Purpose                                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format/type/static        | `npm run lint:fix` then `npm run lint`                                                                                                                                        | Required formatting, TypeScript, and Prettier gate. Review `lint:fix` diff before commit.                                                                 |
| Targeted unit/command     | `npx vitest run tool/__tests__/global-defaults.test.ts` plus any new focused defaults/config test file                                                                        | Fast evidence for all refresh branches, backup collision/failure, and existing init/replay isolation.                                                     |
| BDD                       | `npm run test:bdd -- tests/behave/features/core-tooling.feature`                                                                                                              | Public command/help and end-user refresh workflow evidence.                                                                                               |
| Full unit regression      | `npm test` (included again by `task validate`)                                                                                                                                | Detect cross-command/config regressions after shared-helper extraction.                                                                                   |
| Required final gate       | `task validate`                                                                                                                                                               | Repository-required pre-handoff gate: format fix, lint, and full Vitest suite.                                                                            |
| Build/compiled CLI        | `npm run build`, then invoke `node dist/scripts/init.js defaults refresh-local --help` and a temporary-workspace happy path                                                   | Prove Commander nesting and compiled command behavior; do not edit `dist/` manually or commit it unless repository policy explicitly tracks build output. |
| Replay isolation / health | Run targeted tests first, then `npm run init -- regen` and `npm run init -- doctor` before merge                                                                              | Confirm repository replay remains project-file-first and has no reproducibility errors.                                                                   |
| Documentation/manual      | Inspect `cs defaults --help`, `cs defaults refresh-local --help`, interactive cancel, non-TTY refusal, forced replacement output, backup path/content, and `git diff --check` | Verify copy, safe default, recovery reporting, no leaked home values, and clean patch.                                                                    |

### Checks intentionally not selected

- `npm run schema:generate` / generated schema diff: not required because the spec forbids schema-shape changes. If implementation changes config types that drive schema output, this skip is invalidated and schema generation plus committed output becomes mandatory.
- `npm run docs:generate`: not required because no overlay metadata or generated overlay documentation changes.
- Full `task validate:generated`: not selected initially because refresh writes only `superposition.local.yml` and does not alter generated devcontainer composition. Escalate to it if implementation changes generated-output behavior, schema sources, overlays, or reproducibility results.
- Browser/E2E checks: not applicable to a terminal-only local CLI.
- Migration/data checks: not applicable; no persisted schema migration is introduced.

## Acceptance-Criteria Evidence Map

| Criteria        | Planned evidence                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GLC-REFRESH-001 | Unit loader assertions plus subprocess command cases for both-file precedence and preferred-file fallback; output/error references prove selected source.                             |
| GLC-REFRESH-002 | Subprocess cases for absent source, parse/validation failure, absent/empty template, unchanged workspace snapshot, and unchanged home fixture.                                        |
| GLC-REFRESH-003 | Command test and focused Behave scenario proving direct-template creation without an interactive gate.                                                                                |
| GLC-REFRESH-004 | Pure materialization tests and plain/compose command cases proving merge rules, selected-branch exclusion, mount semantics, and literal preservation.                                 |
| GLC-REFRESH-005 | Command cases with absent project file, invalid project file, and missing/invalid stack; snapshots prove no target, backup, or fallback to local/`initDefaults`.                      |
| GLC-REFRESH-006 | TTY-capable command test for safe-default prompt plus cancellation; unchanged target and no backup asserted.                                                                          |
| GLC-REFRESH-007 | Non-TTY subprocess refusal without `--force`, then forced success after all validation; target and backup assertions distinguish outcomes.                                            |
| GLC-REFRESH-008 | Focused backup helper tests with fixed timestamp/collision and injected copy failure, plus replacement command test proving exactly one distinct sibling backup precedes install.     |
| GLC-REFRESH-009 | Forced/approved replacement command test asserting refreshed YAML, original backup bytes, and reported backup path.                                                                   |
| GLC-REFRESH-010 | Table-driven no-write tests across invalid defaults, compatibility error, cancellation, noninteractive refusal, and backup failure; compare target/home bytes and repository entries. |
| GLC-REFRESH-011 | Existing invalid-home tests for replay-style init/regen/plan/doctor retained and rerun; shared-helper extraction must not add loader calls to those paths.                            |
| GLC-REFRESH-012 | Commander help assertions, manual source/compiled help inspection, and review of README/quick-reference/config-guide/changelog changes.                                               |
| GLC-REFRESH-013 | Targeted Vitest suite, focused unit tests, Behave scenario, full `task validate`, compiled smoke, and independent review evidence.                                                    |

All implementation evidence should record command, source revision, environment, executor, timestamp, exit code, and relevant artifact/output path. No acceptance criterion may be claimed met solely from plan text.

## Rollback / Containment

- Code rollback is one feature commit/revert boundary: remove nested CLI wiring and refresh orchestration, restore init’s prior helper placement if necessary, and revert associated tests/docs. Existing `defaults` inspection and init scaffolding must remain functional throughout rollback.
- A user can recover a replaced local file by copying the reported sibling backup back to `superposition.local.yml`; the command must never auto-delete that backup.
- Contain write risk by operating only on the repository-root `superposition.local.yml`, one sibling backup, and a cleaned-up sibling temp file. Do not touch generated output, project intent, home defaults, Git index, or unrelated repository files.
- If backup creation, staging, or final installation fails, stop further writes, preserve the original target, retain a successfully created backup for manual recovery, and report the failure/path clearly.
- If shared-helper extraction causes any init or replay regression, do not ship a refresh-local-specific duplicate as a workaround; revert the extraction/feature slice and resolve the ownership conflict before retrying.

## Risks / Dependencies

- **Highest risk:** backup collision or partial replacement could destroy local rework. Mitigate with exclusive backup creation, staged atomic install, failure injection, byte-for-byte backup assertions, and independent review.
- Commander parent/subcommand behavior could accidentally break existing `cs defaults` inspection. Preserve direct action tests and verify source plus compiled help/dispatch.
- Moving spec-042 materialization helpers could alter subtle `ports: []`, array append, selected-branch validation, or literal behavior. Keep one implementation and rerun all existing global-default tests before adding refresh assertions.
- TTY prompt tests can be environment-sensitive. Reuse the repository’s established pseudo-TTY/test conventions rather than weakening production TTY checks; keep non-TTY safety covered with ordinary subprocess tests.
- Project config loading may include external catalog validation even though refresh only needs canonical stack. Use the canonical validated loader rather than a partial YAML parser; do not weaken project-file validity to optimize this command.
- Documentation must not imply continuous synchronization or replay authority. Independent review should explicitly check this wording and the no-home-read behavior of unrelated commands.

## Open Questions

None. Confirmation copy and exact TTY classification are explicitly bounded by the spec and existing repository conventions; implementation can choose safe wording and the established stdin+stdout TTY check without changing requirements.

## Implementation Notes

- Update this section only if implementation diverges from the plan; any divergence that changes requirements, acceptance criteria, or non-goals must be routed back to Lead/Interrogator.
