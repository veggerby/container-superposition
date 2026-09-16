# Plan

## Scope and Context

- Canonical spec: `docs/specs/059-cli-silent-mode/spec.md`
- Planning baseline: source revision `654c3fa`; the delegated working tree began clean. The spec workspace is task-provided and untracked at planning time; implementation must preserve it and must not revise its requirements, acceptance criteria, or non-goals.
- Add `--silent` to `init`, `regen`, `list`, `defaults`, `explain`, `plan`, `doctor`, `adopt`, `hash`, and `migrate`. Keep normal text behavior and every existing JSON schema unchanged when `--silent` is absent.
- The JSON-capable commands are currently `list`, `defaults`, `explain`, `plan`, `doctor`, `adopt`, and `hash`. `init`, `regen`, and `migrate` do not expose `--json`; do not add JSON support to them as part of this work.
- No overlay, schema, project-file, catalog, generation-content, or migration-format change is authorized.

## Technical Approach and Boundaries

1. **Own the public option and conflict at the CLI boundary.** Add a small shared option-registration helper in `tool/cli/` and use it for every command in `tool/cli/args.ts`. Register `--silent` consistently, declare or validate its conflict with `--json` on the seven JSON-capable commands, and perform conflict rejection before any `.action(...)` callback, catalog loading, command analysis, or write path. Reuse Commander and its lifecycle/option facilities; add no dependency and do not duplicate conflict checks inside ten command implementations.
2. **Use one invocation-scoped routine-output policy, not a logging framework.** Add a narrow CLI-owned output-mode utility (for example `tool/cli/output.ts`) that can activate silent mode for the single command invocation before dispatch. It should suppress routine `console.log` and `console.warn` output while leaving `console.error` available for failures. Keep the mechanism process-local, synchronous to command activation, restorable for focused tests, and free of command/domain knowledge. This is proportionate to the existing direct-console surface and avoids threading a flag through every composer, renderer, and command helper.
3. **Cover output paths that bypass `console.log`/`console.warn`.** `init`/`regen` use Ora in `tool/cli/run.ts`; explicitly disable the spinner when the invocation output mode is silent. Audit the targeted command paths for direct `process.stdout`/`process.stderr` writes and third-party progress output. Do not suppress Commander conflict errors, `console.error`, or the final boxed failure in `main()`.
4. **Preserve interaction and operational semantics.** Carry `silent` from parsing into the shared invocation policy without changing `CliArgs.config`, input precedence, prompt selection, TTY checks, confirmations, backups, writes, command models, or exit decisions. Inquirer prompt streams must remain usable; silent mode suppresses routine tool presentation, not the interaction needed to provide the same inputs. Do not use stdout/stderr redirection that would hide prompts or error diagnostics.
5. **Preserve deep tool behavior without broad edits.** Existing generation progress in `tool/questionnaire/composer.ts`, summary output in `tool/utils/summary.ts`, backup notices, command-local renderers, ordinary warnings, and conversion guidance should be suppressed by the CLI boundary policy. Do not spread `silent?: boolean` through domain/composition APIs or convert all existing output calls unless a proven bypass requires a small targeted adjustment.
6. **Protect error visibility.** Exercise representative validation, lookup, and runtime failures under `--silent`. If a failure is understandable only because a command currently places essential diagnostic text on a routine channel, make the smallest command-local correction while preserving normal wording and exit behavior; do not suppress or redesign errors.
7. **Keep JSON independent.** Valid `--json` invocations must bypass silent mode because the combination is rejected. Preserve exact JSON models and parseable stdout for all seven JSON-capable commands, including `plan --diff-format json` behavior where it is already a machine-output path; do not infer silent mode from JSON or vice versa.

### Design-quality and architecture fit

- **Ownership:** `tool/cli/` owns option registration, pre-dispatch validation, and invocation output policy. `tool/commands/` retains command workflow ownership; `tool/questionnaire/` retains composition and prompting. The CLI boundary must not become generation or project-file authority.
- **Simplicity/proportionality:** a small shared CLI policy plus explicit Ora handling is preferred over a new logger, dependency, renderer hierarchy, or invasive option propagation. Commander is the maintained commodity capability for option parsing/conflicts.
- **Maintainability:** central registration prevents command drift; a complete command/help test matrix guards future additions. Global console interception is acceptable only at the single-process CLI boundary and must be narrowly scoped/restorable; do not expose it as a general application logging abstraction.
- **Testability:** subprocess tests are the primary contract evidence because they observe real Commander dispatch, stdout, stderr, exit status, prompts/TTY posture, and filesystem effects together. Direct command tests remain useful only for focused output-policy mechanics.
- **Reliability/compatibility:** preserve normal and JSON behavior, command effects, exit codes, source/compiled entry behavior, and project-file-first authority. Silent mode changes presentation only.
- **Security/privacy/performance:** no new persisted state, telemetry, secrets handling, network behavior, or meaningful performance cost is expected. Failure diagnostics remain visible.
- **Architecture verdict:** aligned with `docs/foundation.md` ownership and thin-orchestration rules, with an implementation concern around globally patched output methods. Keep that patch at the CLI invocation boundary and independently review bypass/restoration behavior.
- **ADR impact:** none expected. Stop and request ADR/Lead direction if implementation requires a general logging subsystem, environment-variable contract, output-destination contract, cross-process protocol, or standing change to command/domain ownership.

## Ordered Steps

1. Add focused tests for the shared CLI output-mode primitive and Commander registration/conflict behavior before changing command output. Include restoration after success/failure so the test process cannot leak silent state.
2. Introduce the narrow `tool/cli/` output-mode/option helper. Define a single help description for `--silent`, shared registration for all commands, and pre-action conflict rejection for JSON-capable commands.
3. Update all ten command registrations in `tool/cli/args.ts`. Activate silent mode before command action work, including the default `init` route, and return the silent state in `CliArgs` only where `main()` needs it for explicit non-console emitters. Ensure overlay/catalog loading remains inside actions and therefore after conflict rejection.
4. Update `tool/cli/run.ts` so Ora is disabled in silent mode while init/regen parsing, prompts, generation, writes, summaries, success, warnings, and failure handling retain their existing control flow. Audit directly called generation/summary/backup paths and make only targeted bypass fixes.
5. Audit `tool/commands/{list,defaults,explain,plan,doctor,adopt,hash,migrate}.ts` and their immediate presentation/type modules. Avoid command-specific suppression branches when the shared policy already covers output; add an option type field only if required for an explicit bypass. Confirm failure diagnostics still use the preserved error channel.
6. Add subprocess-level Vitest coverage, preferably in a focused `tool/__tests__/cli-silent-mode.test.ts`, with reusable temporary workspace/HOME fixtures. Cover all ten commands, all seven JSON conflicts, valid JSON regressions, representative warnings/failures, and effect/exit parity. Keep existing `cli-write-output`, `global-defaults`, `commands`, `ux-renderers`, and `adopt` tests unchanged except where shared helpers make a small reuse update appropriate.
7. Add explicit Behave scenarios in `tests/behave/features/core-tooling.feature` and the narrowest shared assertions in `tests/behave/steps/generation_steps.py`. Cover option discovery, silent read-only/write/diagnostic/conversion flows, an observable silent failure, and pre-work conflict rejection with no artifact write.
8. Update public docs against live help: add the cross-command mode and conflict rule to `README.md` and `docs/quick-reference.md`; update directly affected command option/reference surfaces such as `docs/discovery-commands.md`, `docs/adopt.md`, and `docs/hash.md` where they enumerate `--json` or command options. Preserve the canonical discover → inspect → preview → write and project-file-first guidance.
9. Add one consolidated `CHANGELOG.md` entry under `[Unreleased]` → `Added` for the new cross-command `--silent` option; do not duplicate it under `Changed` or `Fixed`.
10. Run targeted tests and BDD during iteration, verify source and compiled help/behavior, then run the full required gates. Record commands, source revision/dirty-tree identity, environment, timestamps, exit codes, and concise AC evidence for implementation handoff.
11. Hand implementation directly to an independent reviewer. The review must inspect every command registration, output bypasses, JSON/conflict ordering, error visibility, no-write proof, and normal-mode regressions before merge.

## Affected Areas

- `tool/cli/args.ts` — all ten public option registrations, centralized pre-action conflict/order enforcement, and dispatch activation.
- `tool/cli/output.ts` (new; exact name may follow local convention) — narrow invocation-scoped silent-output policy and shared option helper if kept together.
- `tool/cli/run.ts` — carry silent state through init/regen and disable Ora without changing workflow behavior.
- `tool/commands/list.ts`, `defaults.ts`, `explain.ts`, `plan.ts`, `doctor.ts`, `adopt.ts`, `hash.ts`, `migrate.ts` — audit only; change only for proven output bypasses or essential failure diagnostics.
- `tool/commands/plan/types.ts`, `tool/commands/doctor/types.ts`, `tool/commands/adopt/types.ts`, and command-local option interfaces — likely unchanged under boundary-owned suppression; add `silent` only if an explicit emitter cannot consult the shared mode safely.
- `tool/questionnaire/composer.ts`, `tool/questionnaire/questionnaire.ts`, `tool/utils/summary.ts`, `tool/utils/backup.ts` — suppression audit boundary; avoid broad edits because their operational/domain behavior is unchanged.
- `tool/__tests__/cli-silent-mode.test.ts` (new) and, only as needed, `cli-write-output.test.ts`, `global-defaults.test.ts`, `commands.test.ts`, `ux-renderers.test.ts`, or `adopt.test.ts` — CLI contract and regression evidence.
- `tests/behave/features/core-tooling.feature` — public silent-mode scenarios.
- `tests/behave/steps/generation_steps.py` — reusable assertions for empty stdout/stderr or unchanged command-owned artifacts, only if existing file assertions are insufficient.
- `README.md`, `docs/quick-reference.md`, `docs/discovery-commands.md`, `docs/adopt.md`, `docs/hash.md` — public behavior, option, and JSON-conflict documentation.
- `CHANGELOG.md` — one Unreleased `Added` entry.

### Boundaries not to cross

- Do not edit `dist/`, generated overlay docs, generated schemas, overlay manifests, project-config schemas/types, generated `.devcontainer/` content, or `docs/specs/059-cli-silent-mode/spec.md`.
- Do not add `--json` to `init`, `regen`, or `migrate`; do not add an environment alias, verbosity levels, output files, a logger dependency, or a general logging framework.
- Do not alter normal human-readable layouts from specs 047/048, JSON payloads, prompt/confirmation policy, write ownership, generated artifacts, exit semantics, or error suppression policy.

## Explicit BDD Plan

Add focused scenarios to `tests/behave/features/core-tooling.feature` using existing inline fixtures and source CLI execution:

1. **Option advertisement matrix:** a `Scenario Outline` runs `<command> --help` for `init`, `regen`, `list`, `defaults`, `explain`, `plan`, `doctor`, `adopt`, `hash`, and `migrate`, then asserts successful exit and `--silent` in stdout. Use command fragments that let Commander reach command help without performing work.
2. **Read-only silent behavior:** run `list --silent` (and optionally `defaults --silent` with isolated HOME) and assert successful exit with empty stdout/stderr and no workspace artifacts.
3. **Write parity:** run a valid non-interactive `init ... --silent`, assert empty routine output and the same canonical project/generated files already asserted by the normal init scenario. Follow with `regen --silent` and assert success plus retained artifacts.
4. **Diagnostic behavior:** run `doctor --from-project --silent` after a valid replay; assert its existing success/failure status semantics and empty routine output. Add a failing silent invocation such as an unknown `explain` target and assert the nonzero status plus a clear stderr diagnostic.
5. **Conversion behavior:** provide a minimal legacy manifest, run `migrate --silent`, assert empty routine output and creation of the canonical project file while generated output remains untouched.
6. **Conflict/no-work behavior:** run `hash --stack plain --overlays nodejs --write --output .devcontainer --silent --json`; assert nonzero exit, observable conflict diagnostic, and absence of `.devcontainer/superposition.hash`. A Vitest matrix, not BDD duplication, should exhaustively repeat the conflict for all seven JSON-capable commands.

Add only narrow reusable steps such as `the command stdout should be empty` and `the command stderr should be empty`; reuse existing status, contains, exists, and does-not-exist steps. Run the focused feature during iteration and the full Behave suite before handoff.

## Acceptance-Criteria Validation Map

| Criterion | Planned implementation and evidence                                                                                                                                                                                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-059-01 | Source assertion/CLI subprocess matrix verifies `--silent` in help and successful parsing for all ten commands; BDD option-advertisement outline provides public-contract coverage.                                                                                                                                  |
| AC-059-02 | Subprocess success matrix runs minimal valid silent invocations for all ten commands and asserts no routine stdout/stderr; targeted warning/progress cases cover generation logs, Ora, guidance, summaries, and ordinary warnings.                                                                                   |
| AC-059-03 | Paired normal/silent fixture runs compare status and command-owned filesystem hashes/models for representative read-only (`list`/`defaults`/`plan`), write (`init`/`regen`/`hash --write`), diagnostic (`doctor`), and conversion (`adopt`/`migrate`) paths; prompt/TTY logic is regression-tested where applicable. |
| AC-059-04 | Table-driven subprocess tests reject `--silent --json` for `list`, `defaults`, `explain`, `plan`, `doctor`, `adopt`, and `hash`; hash write-conflict test and BDD scenario prove rejection before command-owned writes.                                                                                              |
| AC-059-05 | Silent failure tests for lookup/input and init/diagnostic failures assert nonzero status and clear stderr; conflict tests assert their diagnostic remains visible while routine output is absent.                                                                                                                    |
| AC-059-06 | Existing JSON tests plus a seven-command parseability matrix run valid `--json` without `--silent`, compare key fields/status, and assert no human contamination. Include `plan --diff-format json` regression if touched by shared option handling.                                                                 |
| AC-059-07 | New focused CLI contract suite provides complete option/conflict matrices and representative family/effect coverage; existing command suites remain regression gates.                                                                                                                                                |
| AC-059-08 | The explicit Behave scenarios above are added and both focused and full `test:bdd` commands are recorded.                                                                                                                                                                                                            |
| AC-059-09 | Live source and compiled `--help` checks for all commands are compared with README/reference wording; directly affected JSON option tables state the incompatibility.                                                                                                                                                |
| AC-059-10 | Review confirms one consolidated `[Unreleased]` → `Added` changelog entry and no duplicate category entry.                                                                                                                                                                                                           |
| AC-059-11 | Handoff records targeted Vitest, focused/full Behave, build/source+compiled smoke, `task validate`, and `npm run init -- doctor`, including doctor output with no Reproducibility errors.                                                                                                                            |

## Validation Surface and Strategy (DISCOVER)

- **Manifest source:** `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, `Taskfile.yml`, `package.json`, specs 047/048/059, `tool/cli/{args,run}.ts`, command option/output modules, `cli-write-output.test.ts`, `commands.test.ts`, `ux-renderers.test.ts`, `global-defaults.test.ts`, and `tests/behave/features/core-tooling.feature` with shared steps.
- **Invalidation triggers:** changes to Commander registration/lifecycle, output utility semantics, Ora or Inquirer behavior, command option types, package scripts, BDD runner/steps, generated-output behavior, or JSON models. Re-discover validation if any dependency, schema, overlay, or generated-content scope appears.
- **Focused unit/contract tests:** `npx vitest run tool/__tests__/cli-silent-mode.test.ts tool/__tests__/cli-write-output.test.ts tool/__tests__/global-defaults.test.ts tool/__tests__/commands.test.ts tool/__tests__/ux-renderers.test.ts` (trim during iteration to changed assertions, then run the relevant set). Include any directly affected `adopt.test.ts` cases if prompt/output mechanics change.
- **BDD iteration:** `npm run test:bdd -- tests/behave/features/core-tooling.feature`.
- **Full BDD gate:** `task test:bdd` because the option changes public command/workflow behavior across named Definition-of-Done flows.
- **Build/source/compiled contract:** `npm run build`; inspect `npm run init -- <command> --help` and `node dist/scripts/init.js <command> --help` for the ten-command matrix, then smoke representative silent, JSON, conflict, write, and failure invocations from disposable workspaces/HOME directories.
- **Static/format/full unit gate:** `task validate` (mandatory; includes `lint:fix`, lint/typecheck/format, and full Vitest).
- **Pre-merge doctor:** `npm run init -- doctor`; record that no Reproducibility errors are present. This is required by AC-059-11 even though generated output is not expected to change.
- **Documentation/manual contract:** compare exact option spelling/description and JSON incompatibility against live source and compiled help; verify documented examples preserve the canonical project-file-first workflow.
- **Not selected by default:** `task validate:generated`, `npm run docs:generate`, `npm run schema:generate`, and root `regen`, because no overlays, schemas, generated docs, or generated-output contents change. If implementation touches those sources or changes materialized output, stop, re-evaluate scope, and run the generated validation gate rather than silently widening the change.
- **Evidence profile:** Expanded. Record source revision and dirty-tree identity, Node/npm environment, temporary workspace/HOME setup, command, timestamp, exit code, stdout/stderr assertion, filesystem evidence, and reviewer identity. No implementation checks have been run during planning.

## Rollout, Rollback, and Containment

- **Rollout:** ship as one atomic public-contract change: all ten registrations, centralized suppression/conflict behavior, tests, BDD, docs, and changelog together. There is no feature flag, migration, persisted state, or staged command rollout; partial command coverage is not acceptable.
- **Rollback:** revert shared option/output policy, all ten registrations, explicit Ora handling, tests/scenarios, docs, and changelog as one unit. Existing non-silent and JSON behavior should then be restored without user-file cleanup.
- **Data containment:** conflict validation must occur before catalog loading or command work. Use the hash write-conflict fixture as the durable no-write sentinel; also inspect temporary workspaces after rejected write-capable calls.
- **Failure containment:** if any command bypasses suppression or error diagnostics disappear, do not ship a partial subset. Disable/remove `--silent` across the command surface until the shared boundary is corrected; do not leave inconsistent command behavior.
- **Global-state containment:** always restore output hooks in direct tests and on thrown/rejected callbacks. The real CLI runs one command per process, but tests may share a process; leaked suppression is a blocking defect.

## Risks and Dependencies

- **Output bypass risk:** Ora writes outside normal console methods; future direct stream writes could bypass the shared policy. Mitigate with explicit Ora handling, targeted source audit, and subprocess stdout/stderr assertions.
- **Error-loss risk:** some existing commands mix errors with supporting `console.log` guidance. Mitigate with representative silent failure tests and the rule that required nonzero diagnostics stay on the preserved error path.
- **Global interception risk:** changing console methods can leak across asynchronous work or tests. Limit activation to the single CLI invocation, provide restoration, avoid concurrent command execution, and independently review lifecycle behavior.
- **Prompt risk:** redirecting whole streams would hide Inquirer and alter interaction policy. Suppress routine emitters rather than stdout/stderr globally, and preserve TTY/prompt behavior.
- **Conflict-order risk:** loading catalogs or writing before conflict validation violates AC-059-04. Keep all work inside post-validation actions and prove absence of the hash artifact.
- **Cross-command drift risk:** manual repeated option definitions can diverge. Use one registration helper and complete command/help/conflict matrices.
- **Compatibility risk:** JSON and normal text are established contracts. Preserve all models/layouts when silent is absent and retain existing regression suites.
- **Dependency decision:** no new dependency. Commander, existing console usage, and Ora's own silent capability are sufficient.

## Execution and Route Recommendation

- **Execution profile:** **Standard** — the implementation is mechanically modest but spans a public cross-command contract, output channels, write/no-write ordering, tests, BDD, and docs.
- **Route:** **direct implementation**. Diagnosis first is not needed; the source surfaces and product contract are sufficiently clear. Fast path is not eligible because consistency and scripting compatibility span every command.
- **Review mode:** **INDEPENDENT required after implementation**, superseding self-check as the effective gate for this handoff. Review must occur before merge and focus on command completeness, conflict-before-work ordering, output bypasses, error visibility, JSON stability, and operational parity.
- **Handoff:** continue directly to Implementer after this plan; no further product interrogation is required.

## Open Questions and Stop Conditions

- No blocking questions remain. Exact internal helper names may follow repository convention without changing this approach or the spec contract.
- Route back to Lead/Interrogator if implementation indicates that prompt rendering itself must be suppressed, `init`/`regen`/`migrate` need JSON support, failure diagnostics require a new stream contract, or requirements/non-goals need revision.
- Stop for architecture decision/ADR consideration if a general logger, environment-variable mode, output destination, durable global output policy, or cross-process protocol becomes necessary.
- Stop and replan if suppressing routine output requires changes to generated content, schema, overlay behavior, project-file authority, or command effects.

## Implementation Notes

- To be updated by the Implementer only when implementation materially deviates from this plan; deviations must not alter the spec contract.

### Convergence cycle 1

- source before / after: `654c3fa83a7c3fd0e50528aaf78b9f79fc4cd3e5` / current dirty tree at that base (`CHANGELOG.md`, `README.md`, `docs/quick-reference.md`, BDD files, CLI files, and task-local untracked files).
- findings resolved: none yet; correction authorization is conditional on current applicability.
- findings remaining or new: `F-059-001` (silent nonzero `doctor` result has no diagnostic), `F-059-002` (regression coverage lacks representative command-family/parity and output-hook restoration evidence), `F-059-003` (the three directly affected command docs omit the public silent/conflict contract).
- acceptance evidence gained: the first independent review bounded the gaps to these three stable findings; no requirements or architecture change was identified.
- validation state changed: no correction validation has run yet.
- repeated work or failures: none; current-tree inspection confirms all three findings apply (`doctor` only emits its blocking report through suppressible `console.log`, tests only cover help/conflict/init, and the named docs lack `--silent` guidance).
- token/invocation telemetry: prior cycle recorded in `token-usage.yml` (four invocations; reviewer evidence is material).
- decision: CONTINUE.
- next bounded action or human decision: implement the three review findings only, then rerun the invalidated focused, BDD, build/source/compiled, validation, doctor, and diff checks. Review mode remains `INDEPENDENT` pending re-review.

### Convergence cycle 2 — correction execution

- source revision / tree identity: `654c3fa83a7c3fd0e50528aaf78b9f79fc4cd3e5`; existing task-owned dirty files and untracked spec/test/output-helper files were preserved. `git diff --check` passed after validation.
- implementation ladder: **rung 2 (reuse existing CLI boundary and console policy)**. The existing invocation-scoped output utility already suppresses routine output without a dependency or new logging abstraction. The minimal doctor-local `console.error` diagnostic preserves the nonzero outcome; the existing subprocess fixture pattern and BDD steps cover parity/restoration. No trust, write, or prompt boundary was broadened.
- `F-059-001` **RESOLVED**: `doctor` receives `silent` and emits a concise `console.error` diagnostic only when its result is nonzero; its normal and JSON report models remain unchanged. Vitest and BDD assert status 1, empty routine stdout, and visible stderr.
- `F-059-002` **RESOLVED**: `tool/__tests__/cli-silent-mode.test.ts` covers command help for all ten commands, JSON conflict/no-write for all seven JSON commands, silent read/write/regen parity, diagnostic failure, `adopt`/`migrate` conversion family behavior, JSON parseability, and output-hook restoration after async success and failure. BDD adds the public matrix plus read, write, diagnostic, conversion, and conflict flows.
- `F-059-003` **RESOLVED**: `docs/adopt.md`, `docs/discovery-commands.md`, and `docs/hash.md` document `--silent`, its preservation of failures/behavior, and the pre-work `--silent`/`--json` rejection contract.
- plan deviations: none. Ordinary-warning suppression is part of the specified and implemented `--silent` contract; no separate warning flag, new JSON support, generated artefact changes, or scope expansion were introduced.

## Validation execution (EXECUTE)

- validation surface reused from the plan's DISCOVER manifest: CLI parsing/output policy, command contract subprocess tests, public BDD, TypeScript build, source/compiled CLI smoke, static/format/full unit gate, documentation contract, and doctor.
- executed against the recorded revision above in the current dirty task tree:

| Check                                    | Result | Evidence                                                                                                                                                                                                                                                                      |
| ---------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused Vitest command suite             | PASSED | `npx vitest run tool/__tests__/cli-silent-mode.test.ts tool/__tests__/cli-write-output.test.ts tool/__tests__/global-defaults.test.ts tool/__tests__/commands.test.ts tool/__tests__/ux-renderers.test.ts tool/__tests__/adopt.test.ts`: 175 passed, 20 pre-existing skipped. |
| Focused BDD                              | PASSED | `npm run test:bdd -- tests/behave/features/core-tooling.feature`: 29 scenarios, 170 steps passed.                                                                                                                                                                             |
| Full BDD                                 | PASSED | `task test:bdd`: 40 scenarios, 265 steps passed.                                                                                                                                                                                                                              |
| Build and source/compiled contract smoke | PASSED | `npm run build`; source (`npx tsx scripts/init.ts`) and compiled silent `list` produced empty stdout/stderr; compiled help matrix found `--silent` on all ten commands; compiled JSON parsed; compiled hash conflict was nonzero, diagnostic-visible, and wrote no hash.      |
| Required validation                      | PASSED | `task validate`: lint/format/typecheck and full Vitest, 53 files passed; 742 tests passed, 40 existing skipped; one integration suite remained conditionally skipped.                                                                                                         |
| Doctor                                   | PASSED | `npm run init -- doctor`: Project diagnosis Healthy; blocking 0, Reproducibility errors 0.                                                                                                                                                                                    |
| Diff hygiene                             | PASSED | `git diff --check` passed.                                                                                                                                                                                                                                                    |

- corrected check attempt: the first smoke assertion invoked source through `npm run init`, whose npm-script banner made stdout nonempty; this was a harness assertion mismatch, not a CLI failure. The source check was rerun directly with `npx tsx scripts/init.ts` and passed as recorded above.

### Checks not run

| Check                                                           | Reason                                                                                                              | Residual risk                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `task validate:generated`, docs/schema generation, root `regen` | No overlay, schema, generated-doc, or generated-output source changed; these are explicitly outside scope.          | No generated-output regression evidence beyond existing command/BDD fixtures and doctor. |
| `npm run test:integration`                                      | Existing conditional integration suite is skipped unless `INTEGRATION=true`; not relevant to CLI-option correction. | External integration environment was not exercised.                                      |

### Acceptance criteria evidence

| Criterion ID | Status | Evidence                                                                                                                                    |
| ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-059-01    | MET    | Ten-command help matrix in Vitest, BDD, and compiled smoke.                                                                                 |
| AC-059-02    | MET    | Silent read, write/regen, doctor, and conversion subprocess/BDD scenarios show no routine output; shared boundary covers all registrations. |
| AC-059-03    | MET    | Paired normal/silent read/write parity plus init/regen and conversion artifact assertions.                                                  |
| AC-059-04    | MET    | Seven-command conflict matrix and hash no-write Vitest/BDD/compiled checks.                                                                 |
| AC-059-05    | MET    | Silent doctor nonzero diagnostic asserted by Vitest and BDD; conflict remains visible.                                                      |
| AC-059-06    | MET    | Seven-command valid JSON parseability test and compiled JSON smoke.                                                                         |
| AC-059-07    | MET    | Focused contract suite covers full registration/conflict surface and representative family parity.                                          |
| AC-059-08    | MET    | New core-tooling BDD scenarios; focused and full BDD passed.                                                                                |
| AC-059-09    | MET    | Help matrix plus README/quick reference and directly affected adopt/discovery/hash docs.                                                    |
| AC-059-10    | MET    | One consolidated `[Unreleased]` → `Added` entry in `CHANGELOG.md`.                                                                          |
| AC-059-11    | MET    | Targeted, focused/full BDD, build/smoke, `task validate`, and doctor results above.                                                         |

- validation status: **PASS** for implementation evidence; execution status **ACTIVE**; review mode **INDEPENDENT**, review status **NOT_STARTED** (re-review pending).
- residual risk: routine-output interception is process-global by design; direct restoration coverage passes, but independent review should specifically recheck hook lifecycle and future direct stream emitters. No risk acceptance is requested.
- handoff: ready for the required independent re-review; not represented as merge-complete until that gate passes.

### Convergence cycle 3 — warning-contract follow-up

- source revision: `6fc3cb938a0a1b70aee0da4ecc8b43427885cf7b`.
- diagnosis: `tool/cli/output.ts` suppresses both `console.log` and `console.warn`, while retaining `console.error`; `spec.md` and `README.md` already require/describe suppression of ordinary non-fatal warnings. The absolute `docs/ux.md` “No silent operations” claim and cycle-2 statement that no warning suppression was introduced were stale and contradictory.
- decision: by normal CLI convention and the established contract, `--silent` suppresses ordinary non-fatal warnings. A separate `--no-warn`-style option is neither warranted nor authorized because it would introduce an overlapping output mode/verbosity control outside the spec.
- changes: add direct warning/error-boundary coverage; clarify public references and the consolidated changelog entry; add `evidence.md`. No runtime behavior changed and no BDD feature edit was needed: existing core-tooling silent-mode scenarios already exercise the unchanged command behavior.
- plan deviation: none; this corrects stale contract documentation and evidence only. Final validation and the subsequent independent review remain required.
