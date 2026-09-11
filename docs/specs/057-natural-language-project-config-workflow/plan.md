# Plan

## Scope and Delta

- Spec: `docs/specs/057-natural-language-project-config-workflow/spec.md`
- Source revision: `9120beec982872e3cb0cd3c5188433b68a753efd`; preserve the existing uncommitted spec-057 prompt/skill/docs work.
- Delta from the prior plan: add one read-only top-level command, `defaults`, and make `defaults --json` the first discovery step for `/project-config`. The prior prohibition on CLI work is removed only for this command.
- Reuse the existing global-default resolver/parser. Do not add schema fields, dependencies, discovery locations, merge behavior, init behavior, replay authority, or write paths.

## Technical Approach and Boundaries

1. Add a command-owned `defaults` module and thin Commander wiring. It calls the existing `loadGlobalDefaults(...)` path so validation and whole-file precedence cannot drift from eligible fresh `init`.
2. Build one normalized read-only result used by human and JSON rendering:
    - selected source path or `null`;
    - ignored lower-precedence path when both supported files exist;
    - normalized effective global document, or `{}` when neither file exists.
3. Human output should identify source/precedence and render the effective document readably; `--json` is the stable automation surface used by the Pi workflow. Diagnostics go to stderr so successful JSON stdout remains parseable.
4. “Effective” means the single validated home document after filename precedence and parser normalization. It does **not** mean final init answers: do not apply CLI overrides, select a stack-aware local-template branch, expand variables, read project config, or materialize files.
5. Invalid selected input fails non-zero with the selected path. A lower-precedence ignored file is not parsed. No-file is a successful, explicit empty result so `/project-config` can always start with the command.
6. The command may disclose values only to the invoking process's stdout; add no cache, telemetry, diagnostics persistence, or file write. Pi guidance must avoid repeating suspected credentials in summaries.
7. Update `/project-config` and `project-config-authoring` to invoke `npm run init -- defaults --json` before direct home-file fallback. The CLI output informs authoring only; accepted values must become explicit repository shared/local intent before they can affect replay.

Architecture fit: **PASS with review concern**. This adds an explicit inspection exception to the prior “non-init commands ignore home defaults” wording, but it does not change ADR 001 authority: `defaults` reports hidden bootstrap input and never feeds generation, replay, remediation, or runtime behavior. Simplicity, maintainability, performance, and compatibility are aligned by reusing the existing loader and adding no dependency. Security/privacy needs independent review because arbitrary local-template literals can be printed.

ADR impact: **none expected**. Draft/amend an ADR only if implementation needs home state to influence an existing command, persist an effective snapshot, change precedence/schema, or establish a broader configuration authority.

## Ordered Steps

1. Add `tool/commands/defaults.ts` with a small typed result builder and text/JSON presentation over `loadGlobalDefaults(...)`; keep filesystem mutation and init-answer materialization out.
2. Wire `defaults [--json]` in `tool/cli/args.ts` as an immediately dispatched read-only command, following existing command-module and error/exit conventions. Verify `--help` wording calls it inspection-only and names both supported files and precedence.
3. Add focused tests for no-file, preferred-only, legacy-specific-only, both-file precedence, invalid selected input, ignored invalid lower-precedence input, literal preservation, parseable JSON, and absence of writes. Prefer existing `tool/__tests__/global-defaults.test.ts` for resolver/CLI integration and a focused command test only if the normalized model benefits from direct unit coverage.
4. Add Behave coverage for the user-visible command. Introduce the narrowest reusable isolated-home fixture support under `tests/behave/` if needed, then prove `defaults --json` reports the selected source/effective value and leaves the workspace unchanged.
5. Amend `.pi/prompts/project-config.md` and `.pi/skills/project-config-authoring/SKILL.md` so command output is the defaults entry point, with direct file inspection only as an explicit unavailable-command fallback. Preserve plain-first selection, focused ambiguity handling, safe diffs, and post-write preview.
6. Align `README.md`, `docs/superposition-yml.md`, and `docs/quick-reference.md` with live help: describe `defaults` as read-only inspection, retain `~/.superposition.yml` as the preferred file to author, retain `~/.container-superposition.yml` precedence, and state that replay/non-init application behavior is unchanged.
7. Fold the command into the existing spec-057 `CHANGELOG.md` Unreleased `Added` entry; do not create a second entry for the same unreleased workflow. `.pi/README.md` needs no inventory change unless asset names change.
8. Run targeted tests and manual source/compiled smoke checks, then mandatory completion gates. Record source revision, dirty-tree identity, environment/HOME fixture, commands, exit codes, and concise results against the acceptance mapping.

## Affected Areas

- `tool/commands/defaults.ts` — new command-local read/result/render behavior.
- `tool/cli/args.ts` — top-level command registration, `--json`, help, and dispatch only.
- `tool/schema/project-config.ts` — reuse expected; change only if a small exported type/helper is strictly necessary, with no parser/schema/precedence behavior change.
- `tool/__tests__/global-defaults.test.ts` and optionally `tool/__tests__/defaults.test.ts` — focused loader/CLI and normalized model coverage.
- `tests/behave/features/core-tooling.feature`, `tests/behave/environment.py`, and/or `tests/behave/steps/generation_steps.py` — command acceptance and isolated home fixture support, only as needed.
- `.pi/prompts/project-config.md`, `.pi/skills/project-config-authoring/SKILL.md` — command-first defaults discovery and non-replay safety.
- `README.md`, `docs/superposition-yml.md`, `docs/quick-reference.md` — command discovery and canonical boundary wording.
- `CHANGELOG.md` — amend the existing Unreleased spec-057 entry.
- `docs/specs/057-natural-language-project-config-workflow/{spec.md,plan.md}` — canonical authorization and execution mapping.

Boundaries not to cross: no changes to global schema outputs/types, `init` application/precedence, `regen`, `plan`, `doctor`, overlays, presets, generated `.devcontainer/`, `superposition.json`, Git index, or `dist/` source. Do not add an edit/write flag or generic config command family.

## Acceptance-Criteria Mapping

| Criterion    | Planned implementation/evidence                                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-057-01–04 | Existing prompt/skill authoring, authority, plain-first, and safe-update rules; disposable project exercises remain applicable.                             |
| AC-057-05–06 | Prompt/skill begins with `defaults --json`, then uses existing `list`/`explain`/`plan`; evidence shows defaults are considered but not replayed implicitly. |
| AC-057-07–08 | Existing focused-question and post-write preview guidance plus manual prompt exercises.                                                                     |
| AC-057-09    | Confirm `.pi/README.md` remains truthful; no new Pi asset is planned.                                                                                       |
| AC-057-10    | Help/docs/changelog synchronization, focused automated tests, Behave scenario, and mandatory validation.                                                    |
| AC-057-11    | Command tests prove selected/ignored source metadata, exact precedence reuse, normalized document, and parseable JSON.                                      |
| AC-057-12    | Tests cover no-file success, selected-file validation failure, literal preservation, and before/after filesystem snapshots showing no writes.               |
| AC-057-13    | Regression tests keep `plan`/`doctor`/replay bypass behavior; architecture review confirms the command result is not passed into generation or remediation. |

## Validation Surface and Strategy (DISCOVER)

- Manifest source: `AGENTS.md`, `docs/definition-of-done.md`, `Taskfile.yml`, `package.json`, specs 033/037/038/042/049, `tool/cli/args.ts`, `tool/schema/project-config.ts`, `tool/__tests__/global-defaults.test.ts`, and Behave tooling.
- Invalidation triggers: changes to package/task scripts, CLI dispatch, global loader/result shape, Behave fixture semantics, generated schema/types, or command scope beyond read-only inspection.
- Focused unit/integration: `npx vitest run tool/__tests__/global-defaults.test.ts` plus any new defaults-command test file.
- BDD: `npm run test:bdd -- tests/behave/features/core-tooling.feature`; this is selected because a new user-visible top-level command is not covered by existing scenarios.
- Help/contract checks: `npm run init -- defaults --help`; run `defaults --json` with isolated HOME fixtures for no file, each filename, both filenames, invalid selected input, and variable-like literals. Confirm stdout parses as JSON and workspace/home hashes are unchanged.
- Compiled behavior: `npm run build`, then run `node dist/scripts/init.js defaults --json` against an isolated HOME fixture. No source/dist path-specific logic is expected, but this proves package entry wiring.
- Canonical docs: compare README/reference examples to live help and confirm wording keeps `discover → inspect → preview → write`, preferred authoring filename, and bootstrap-only authority.
- Final gate: `task validate` (mandatory). Run full `task test:bdd` before handoff because command workflow behavior changed.
- Not selected: `task validate:generated`, `schema:generate`, `docs:generate`, `regen`, and generated-output doctor checks, because no schema, overlay, generated docs, or generated output changes are authorized. If those surfaces change, stop and replan rather than silently broadening validation.
- Evidence profile: **Expanded** for the command contract (targeted + BDD + source/compiled smoke), compact for static Pi prose. Record revision/dirty state, temporary HOME/workspace, command, timestamp, exit status, and result.

## Rollback / Containment

- Revert command registration and remove `tool/commands/defaults.ts` with its tests/scenario; restore prompt/skill and docs/changelog wording together so no guidance points to a missing command.
- No migration, cache, schema, generated artifact, or user-file cleanup is required because the command is read-only.
- If disclosure wording or output proves unsafe, containment is to remove the command from help and make `/project-config` fall back to guarded direct inspection until a corrected spec is approved; do not leave a partially functional command that changes precedence or redacts values ambiguously.

## Stop Conditions

Stop and route to Lead/Interrogator before implementation continues if:

- “effective” requires merging both home files, applying CLI/project values, selecting a stack-aware branch, or changing existing precedence/parser semantics;
- the command needs to write, edit, scaffold, cache, or persist any config;
- any existing command begins consuming home defaults outside eligible fresh `init`;
- requirements expand to redaction policy, secret scanning, new output formats, schema fields, filenames, dependencies, or a general-purpose config-management command;
- deterministic JSON cannot coexist with diagnostics without changing shared CLI error contracts;
- Behave home isolation would destabilize unrelated scenarios and no narrower acceptance fixture is available;
- implementation encounters conflicting human changes in the current dirty spec-057 workspace.

## Execution and Review Recommendation

- Execution profile: **Standard** — narrow implementation, but it crosses CLI, hidden home-state inspection, tests, docs, and Pi workflow surfaces.
- Route: **direct implementation**; diagnosis first is not needed and Fast path is not eligible because this adds a public command contract.
- Review mode: **INDEPENDENT** (recommend Lead upgrade the current spec frontmatter from `SELF_CHECK`) focused on precedence reuse, stdout disclosure, no-write proof, JSON stability, and preservation of the ADR001 bootstrap-only/non-replay boundary.

## Open Questions

- No blocking product questions. `defaults --json` is the planned automation contract; exact decorative human formatting may follow existing CLI renderer conventions without becoming acceptance authority.
- No ADR is needed unless a stop condition changes global-default authority or persistence.

## Implementation Notes

- Implemented `defaults [--json]` as a command-local read-only inspection surface over the existing `loadGlobalDefaults(...)` and `resolveGlobalDefaultsPath(...)` behavior. JSON and text rendering come from one normalized result containing selected source, ignored source, supported filenames, and the normalized effective document.
- Updated `/project-config` and `/skill:project-config-authoring` to start from `npm run init -- defaults --json`, with direct home-file inspection only as an unavailable-command fallback, and retained bootstrap-only/non-replay guidance.
- Added command-focused Vitest coverage and Behave acceptance for precedence, empty state, selected invalid state, ignored invalid lower-precedence state, literal preservation, parseable JSON, and no project/home writes.
- Implementation deviation: `vitest.config.ts` now sets `testTimeout: 15000`, and the existing long-running private-catalog CLI-flow test now uses a 30000 ms case timeout, because the required full `task validate` gate repeatedly timed out existing CLI-spawn tests under full-suite load while the same tests passed when run targeted. This changes validation harness tolerance only; it does not alter CLI behavior.
- Review follow-up: `defaults` dispatch and command implementation now avoid `loadOverlaysContextWrapper()` and project catalog resolution. The command loads only the built-in overlay registry required by `loadGlobalDefaults(...)`, and regression tests cover invalid repository catalog state plus unchanged catalog cache state.
