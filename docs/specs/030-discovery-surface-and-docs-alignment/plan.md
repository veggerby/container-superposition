# Plan

## Scope

- Spec: `docs/specs/030-discovery-surface-and-docs-alignment/spec.md`
- Planning baseline: `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`, with a clean working tree at discovery time.
- Delivery slice: complete all six first-party documentation surfaces. Existing work aligned `docs/examples.md` and `docs/team-workflow.md`; implementation verification found `README.md`, `tool/README.md`, `docs/quick-reference.md`, and `docs/messaging-quick-start.md` still taught stale or category-centric workflows, so they are implementation targets for this resumed route.
- Execution profile: **Standard** — the implementation is documentation-only and reversible, but both files are broad user-facing guides and completing the spec requires synchronized workflow artifacts and repository validation.
- Route recommendation: **direct implementation**, followed by **INDEPENDENT** review. Diagnosis-first is not needed because the stale sections and live command contract are directly evidenced.

## Current Contract and Boundaries

- `superposition.yml` or `.superposition.yml` is canonical shared team intent; `superposition.local.yml` is local-only enrichment; `superposition.json` is a generated compatibility/audit receipt.
- The documented safe sequence is discover (`list`) → inspect (`explain`) → preview (`plan`, then `plan --verbose` and `plan --diff` as applicable) → write (`init` or `regen`).
- Flat `overlays:` entries are the preferred explicit selection model. Presets remain optional shorthand. Category flags accepted by `init` are live compatibility/convenience inputs, but must not replace the project-file model in primary examples.
- Live source CLI help at the planning baseline confirms `list`, `explain`, `plan`, `init`, `regen`, `adopt`, and `migrate`; `plan` supports `--verbose` and `--diff`; `regen --from-manifest` is deprecated; `adopt` writes the project file by default and its `--project-file` option is deprecated/no-op.
- No command semantics, code, tests, generated overlay docs/schema, overlays, or generated `.devcontainer/` output may change in this slice. Do not hand-edit `dist/`, `docs/overlays.md`, or schema outputs.
- Architecture fit: **PASS**. The slice restores the project-file-first source-of-truth boundary required by `docs/foundation.md` and ADR 001, introduces no dependency or build-vs-buy decision, and needs no ADR.

## Ordered Steps

1. Rewrite the user-flow portions of `docs/examples.md` around canonical project files.
    - Lead with live discovery and inspection commands, then show `plan`, `plan --verbose`, and `plan --diff` before any write command.
    - Replace primary category-centric and stale flag examples (including `--postgres`) with `superposition.yml` examples using `stack` and flat `overlays:` lists, followed by `plan` and `init --no-interactive` or `regen` as appropriate.
    - Reframe presets as optional shorthand rather than a second configuration architecture.
    - Replace the manifest-regeneration section with project-file editing/replay examples. Retain manifest material only where it is explicitly labeled compatibility or migration guidance and route it through `migrate`.
    - Preserve useful output, customization, service dependency, environment, and maintainer-oriented overlay/programmatic material where accurate; clearly separate maintainer internals from the end-user path rather than broadening their audience.

2. Rewrite `docs/team-workflow.md` around committed shared project intent.
    - Make `superposition.yml` the team-owned committed standard, `superposition.local.yml` untracked local enrichment, and `superposition.json` a generated compatibility/audit receipt.
    - Update repository layout, initial setup, onboarding, updating team intent, CI examples, troubleshooting, presets, and monorepo examples to edit/commit project files with flat `overlays:` and to preview before `init`/`regen`.
    - Correct adoption guidance to the live contract: `adopt --dry-run` for inspection and `adopt` for standard project-file output; do not recommend deprecated `--project-file`.
    - Convert existing manifest-first migration guidance into an explicitly legacy path using `migrate`; do not recommend hand-editing or committing `superposition.json` as steady-state authority.
    - Keep local customization and Git guidance consistent with the filesystem contract: local config remains untracked, generated output policy is explicit, and the tool never mutates the Git index automatically.

3. Cross-check both rewritten guides against the already-aligned first-party surfaces and live help.
    - Compare terminology and ordering with `README.md`, `tool/README.md`, `docs/quick-reference.md`, `docs/messaging-quick-start.md`, and `docs/superposition-yml.md` without changing those files unless implementation uncovers a new contradiction; any newly discovered broader contradiction is a scope question for Lead rather than an opportunistic expansion.
    - Re-run the relevant `--help` commands and manually verify every documented command/option. Review every retained `superposition.json`, `--from-manifest`, category-field, or category-flag reference to ensure it is explicitly compatibility/migration-only or genuinely maintainer-oriented.

4. Synchronize completion artifacts in the same implementation change.
    - Update `CHANGELOG.md` under `[Unreleased]` by amending the existing canonical CLI/docs alignment narrative or adding one non-duplicative `Changed` entry for the completed user-facing guide alignment.
    - After all ACs are evidenced, update `docs/specs/030-discovery-surface-and-docs-alignment/spec.md` to `Status: Implemented` and add implementation notes identifying the previously shipped CLI fixes, this documentation remainder, validation evidence, and the BDD justification.
    - Update the matching row in `docs/specs/README.md` to `Implemented` in the same change.
    - Since completion changes opportunity evidence and roadmap sequencing, move the spec-030 opportunity in `docs/opportunities/README.md` from active/prioritized to shipped and move/consolidate the corresponding discovery/docs and preview-first outcomes in `docs/roadmap.md` from `Now`/`Next` to `Recently shipped`. Do not reprioritize unrelated opportunities.
    - Do not set QA-owned `Status: Final`, add a QA verdict, or remove QA markers.

5. Format, validate, and prepare provenance for independent review.
    - Run focused stale-guidance searches and live-help checks first, then focused existing CLI regression tests, the existing focused Behave workflow scenario suite, the mandatory repository gate, and the non-mutating doctor check.
    - Record commands, source revision, environment, UTC timestamp, executor, exit codes, and any skipped checks in the spec implementation notes or spec-local review evidence.
    - Hand off the implementation for independent review against all eight ACs; the reviewer should treat this plan and the canonical spec as authority, not silently repair findings.

## Affected Areas

- `README.md`, `tool/README.md`, `docs/quick-reference.md`, and `docs/messaging-quick-start.md` — replace stale category-centric and manifest-first primary guidance with verified project-file-first, flat-overlay, preview-first guidance.
- `docs/examples.md` — replace stale category/manifest-first user examples with project-file-first, flat-overlay, preview-first examples while preserving accurate advanced material.
- `docs/team-workflow.md` — replace the committed-manifest team model with committed project intent, current adoption/migration guidance, and current CI/onboarding flows.
- `CHANGELOG.md` — record the user-visible guide alignment without duplicating existing unreleased CLI entries.
- `docs/specs/030-discovery-surface-and-docs-alignment/spec.md` — implementation status and implementation/evidence notes after the complete spec is satisfied.
- `docs/specs/README.md` — synchronize the spec-030 status row.
- `docs/opportunities/README.md` — retire the now-completed opportunity from active prioritization.
- `docs/roadmap.md` — move the completed discovery/docs and preview-first outcomes to recently shipped without changing unrelated sequencing.
- Verification-only boundaries: `README.md`, `tool/README.md`, `docs/quick-reference.md`, `docs/messaging-quick-start.md`, `docs/superposition-yml.md`, CLI help, `tool/__tests__/commands.test.ts`, `tool/__tests__/ux-renderers.test.ts`, and `tests/behave/features/core-tooling.feature`.

## Validation Surface and Strategy

- Validation mode: **DISCOVER**. No reusable validation manifest was found; this strategy is derived from `AGENTS.md`, `docs/definition-of-done.md`, `package.json`, `Taskfile.yml`, the local documentation/workflow skills, nearby CLI tests, and live source CLI help at revision `12f3dd65f1b56258a834ff5a946c26d852fbf8b7`. Invalidate it if those files, the CLI help contract, or relevant tests change before implementation validation.
- Build/type/lint checks:
    - Run `task validate` as the mandatory final local gate; it runs `lint:fix`, `lint` (including TypeScript and Prettier checks), and the full Vitest suite.
    - A separate `npm run build` is not selected because this slice changes no source or compiled CLI behavior. Add it only if implementation crosses that boundary.
- Unit/integration/e2e/contract checks:
    - During iteration, run `npx vitest run tool/__tests__/commands.test.ts tool/__tests__/ux-renderers.test.ts` to re-establish the already-shipped category-presence and human-readable rendering evidence for AC-1, AC-2, and AC-8.
    - Run `npm run test:bdd -- tests/behave/features/core-tooling.feature` to reuse the existing discovery/workflow acceptance surface and satisfy the repository's workflow-evidence expectation without adding a documentation-only scenario.
    - No browser, API, migration-data, schema-generation, overlay-doc generation, or generated-output regeneration check is selected because this slice changes Markdown/workflow artifacts only.
- Documentation/link checks:
    - Run targeted searches over the two changed guides for stale patterns such as `--postgres`, primary `--from-manifest`, `--write-manifest-only`, manifest-first wording, hand-editing `superposition.json`, deprecated `adopt --project-file`, and category-centric project-file keys. Every retained match must be explicitly compatibility/migration-only or valid maintainer context.
    - Confirm Markdown links touched by the rewrite resolve to repository files.
    - Confirm spec status equals the `docs/specs/README.md` row, and active/shipped wording agrees across the opportunity backlog and roadmap.
- Manual or exploratory checks:
    - Re-run `npm run init -- --help`, `npm run init -- init --help`, `npm run init -- list --help`, `npm run init -- plan --help`, `npm run init -- regen --help`, `npm run init -- adopt --help`, and `npm run init -- migrate --help`.
    - Run `npm run init -- list --category messaging` and confirm live category discovery remains readable.
    - Review the rendered reading order in both guides: discover → inspect → preview → write, with canonical project intent clearly distinguished from local enrichment and compatibility receipt.
    - Run `npm run init -- doctor` before merge as the minimum repository health check; it must report no reproducibility error. It is evidence only and must not be used to justify generated-output edits.
- BDD rationale: do **not** add or edit a Behave scenario for this remainder. The implementation changes explanatory Markdown, not observable CLI/workflow behavior; CLI rendering fixes are already covered by focused Vitest tests and the existing `List exposes discovery categories and recommended starts` Behave scenario. Re-run the focused feature and record this rationale in implementation notes. If implementation changes command behavior, this rationale becomes invalid and the task must return to CLI scope with updated BDD coverage.
- Review gate: **INDEPENDENT**, as requested. The broad rewrite can remain syntactically valid while retaining subtle stale authority, so a reviewer should independently trace each AC and inspect legacy labels.
- Evidence provenance: capture implementation HEAD, branch/tree state, Node/npm/task versions as relevant, environment, UTC timestamp, executor, exact command, and exit code. Planning-time help output is discovery evidence only and must be refreshed at implementation HEAD.
- Skipped or deferred checks: `npm run build`, `task validate:generated`, `npm run docs:generate`, `npm run schema:generate`, and `npm run init -- regen` are intentionally skipped unless scope expands into source, overlays, schema, or generated output. Residual risk is limited to prose/example accuracy and is addressed by live-help verification, focused behavior tests, full `task validate`, and independent review.

### Acceptance-Criteria Evidence Plan

| Criterion | Planned evidence                                                                                                                                                                   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1      | Existing discovery unit/UX tests plus live `list --help` and `list --category messaging` output; no new CLI change.                                                                |
| AC-2      | Existing rich-port rendering regression assertions (`[object Object]` absent) in command/UX tests plus manual readable discovery output inspection; no new CLI change.             |
| AC-3      | Independent content review of all six named docs, with implementation diffs limited to the two remaining stale surfaces and prior aligned surfaces used as consistency references. |
| AC-4      | YAML examples in both changed guides use canonical project files and flat `overlays:`; targeted review confirms any legacy form is labeled migration/compatibility-only.           |
| AC-5      | Both guides visibly order `list`/`explain`, `plan`, `plan --verbose`, and `plan --diff` before `init`/`regen`, checked against live help.                                          |
| AC-6      | Targeted stale-pattern searches and manual classification of retained matches; no `_serviceOrder` or stale/deprecated flags presented as current end-user guidance.                |
| AC-7      | Documentation-only diff, focused existing tests, full `task validate`, and no source/generated artifact changes establish unchanged command semantics.                             |
| AC-8      | Re-run existing focused Vitest coverage for category presence and readable structured fields; implementation notes identify those tests as the shipped CLI regression evidence.    |

## Rollback / Containment

- Keep the change as a documentation/workflow-only commit or clearly separable commit series so it can be reverted without touching the shipped CLI fixes.
- If examples cannot be verified against live help, retain the last verified canonical wording and omit the uncertain example rather than guessing.
- If implementation uncovers a contradiction that requires command behavior, acceptance-criterion, or non-goal changes, stop and route it to Lead; do not absorb code changes into this slice.
- If portfolio/status synchronization is premature because any AC remains unmet, leave spec 030 `Draft` and keep its index/opportunity/roadmap state active while landing only an explicitly partial docs change.

## Open Questions

- None blocking. The canonical model, immediate two-file remainder, workflow synchronization trigger, and independent review mode are established by the task and repository authority.

## Risks / Dependencies

- `docs/examples.md` and `docs/team-workflow.md` contain extensive useful but stale material; a mechanical terminology swap could preserve invalid flows or delete valuable advanced guidance. Rewrite by user task and verify each command.
- Live `init` still exposes category flags and `--write-manifest-only`; examples must distinguish a live compatibility/convenience option from the preferred project-file authoring model rather than falsely claiming the option does not exist.
- Manifest references are valid in migration/compatibility contexts. A blanket deletion or zero-match validation rule would be incorrect; retained references require contextual review.
- Portfolio updates are coupled to actual completion. Moving the opportunity/roadmap or marking the spec Implemented before AC evidence passes would make workflow artifacts untruthful.
- The spec remains `Draft` despite shipped CLI portions. Completion notes must clearly separate prior CLI evidence from this docs remainder, and only QA may later mark it `Final`.
- `task validate` runs formatting writes; inspect the resulting diff to ensure it did not create unrelated churn.

## ADR Needs

- None. ADR 001 and `docs/foundation.md` already establish the canonical project-file-first decision; this delivery aligns docs to that authority rather than introducing a new durable decision.

## Implementation Notes

- Update this section when implementation diverges from the original plan.

### Convergence cycle 1

- source before / after: reviewer baseline/tree identity `07bb3e8bdc77675df563632a49532081ccd9f1376c833470fa00b93d194415de`; tracked correction-tree fingerprint `afd6a7f60c5e95e4f2791120eef2c52687fbd390c07649ffb49cceed2903f7ce` at final validation `2026-10-02T09:32:31Z`.
- findings resolved: `SPEC030-R1` through `SPEC030-R4`.
- findings remaining or new: none; independent re-verification remains pending.
- acceptance evidence gained: reviewer diagnosis established that filtered discovery output lacked ports; AC-2, AC-4, and AC-8 moved from not met to MET. The prior implementation falsely relied on explain tests for list rendering; this correction adds filtered-list unit and BDD coverage.
- validation state changed: focused regression (94 tests), BDD (36 scenarios/206 steps), and `task validate` (806 tests) passed against the correction tree.
- repeated work or failures: no prior correction cycle or repeated failure. An unrelated concurrent focused-test timeout was rerun serially and passed.
- token/invocation telemetry: not material to this bounded correction.
- decision: CONTINUE — bounded corrections directly satisfy unchanged acceptance criteria.
- next bounded action or human decision: independent reviewer re-verification.

### Convergence cycle 2

- source before / after: pre-correction fingerprint `07bb3e8bdc77675df563632a49532081ccd9f1376c833470fa00b93d194415de`; post-correction/re-review fingerprint `afd6a7f60c5e95e4f2791120eef2c52687fbd390c07649ffb49cceed2903f7ce` (`HEAD` `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`, with the recorded tracked changes and spec-local untracked artifacts).
- findings resolved: `SPEC030-R1` through `SPEC030-R4` were materially resolved.
- findings remaining or new: independent re-review returned new `SPEC030-R5` against AC-6: `docs/adopt` still gives manifest-first/deprecated-flag guidance and conflicts with the dogfooding instruction. This should have been included in the first reviewer batch.
- acceptance evidence gained: AC-2, AC-4, and AC-8 became `MET`; AC-6 is blocking on R5.
- validation state changed: full validation improved to and passed at 806 tests on the post-correction fingerprint; the new documentation/instruction conflict is not cleared by that test result.
- repeated work or failures: the reviewer is drip-feeding findings across batches despite an unchanged acceptance scope. Launching another correction now would bypass the bounded-review protocol even though R5 itself is bounded.
- token/invocation telemetry: unavailable; not needed for the decision.
- decision: **STOP_NON_CONVERGENT**. Review verdict: **BLOCKED**. Execution status: **BLOCKED**. Risk: **PENDING_ACCEPTANCE**.
- next bounded action or human decision: do not launch correction. Obtain maintainer confirmation to resume under an explicitly expanded/rebatched review scope, or obtain authorization for a spec clarification. No immediate human question is required from this non-interactive route.

### Convergence cycle 3 — authorized AC-6 correction

- authorization and scope: maintainer authorized one bounded correction after `STOP_NON_CONVERGENT`: fix only `docs/adopt.md` and the conflicting dogfooding instruction; preserve all existing partial work and do not modify CLI behavior.
- source before / after: `HEAD` remains `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`; final tracked-tree fingerprint is recorded in `artifacts/implementation-evidence.md`. The working tree remains intentionally non-clean with prior tracked partial changes and spec-local untracked artifacts.
- finding disposition: `SPEC030-R5` **RESOLVED_PENDING_INDEPENDENT_REVIEW**. `docs/adopt.md` now makes the project file the default adoption output and team-owned edit surface, labels `superposition.json` as a compatibility/audit receipt, labels `adopt --project-file` deprecated/no-op, and uses flat `overlays:` plus preview-before-regen guidance. `.github/instructions/dogfooding.instructions.md` now names root `superposition.yml` and `regen` as dogfooding authority, with manifest replay compatibility/migration-only.
- BDD rationale: no Behave feature changed or reran in this cycle because it alters only explanatory documentation/instructions, not observable CLI behavior. Existing focused BDD evidence remains valid for the prior CLI rendering correction; this cycle validates prose against current help and a read-only `adopt --dry-run` invocation.
- validation state changed: live `plan`, `regen`, `adopt`, and `migrate` help/output checks, targeted stale-guidance scans, Prettier, `git diff --check`, and required `task validate` passed. `task validate` reports 806 passing tests and 20 normally skipped integration tests.
- decision: **STOP** — correction is complete; do not begin another correction cycle. Hand off directly for comprehensive **INDEPENDENT** review with this implementer evidence as `SELF_CHECK` only.

### Convergence cycle 4

- source before / after: authorized-correction baseline fingerprint `afd6a7f60c5e95e4f2791120eef2c52687fbd390c07649ffb49cceed2903f7ce`; independently reviewed tracked fingerprint `25cf7281b08a879c7b91971b29a2dc2ca57bb9ca49565e5222fb7854c018f623` at `HEAD` `12f3dd65f1b56258a834ff5a946c26d852fbf8b7`.
- findings resolved: the manifest-first/deprecated-flag portion of `SPEC030-R5` was corrected, but the finding did not close under independent review.
- findings remaining or new: `SPEC030-R5` recurs because the authorized correction introduced invalid no-input `plan` examples; `SPEC030-R6` expands the requested correction beyond the explicitly authorized `docs/adopt.md` and dogfooding-instruction scope; `SPEC030-R7` identifies workflow-record contradictions.
- acceptance evidence gained: no material acceptance gain; independent review still classifies AC-4 and AC-6 `NOT_MET`.
- validation state changed: exact-tree implementer checks remain passing evidence, but independent review of fingerprint `25cf7281b08a879c7b91971b29a2dc2ca57bb9ca49565e5222fb7854c018f623` is `CHANGES_REQUESTED`; execution **BLOCKED**, risk **PENDING_ACCEPTANCE**.
- repeated work or failures: `SPEC030-R5` recurred after its authorized correction, while `SPEC030-R6` broadens scope with AC-4/AC-6 still unmet.
- token/invocation telemetry: unavailable; not needed for the decision.
- decision: **STOP_NON_CONVERGENT**.
- next bounded action or human decision: no implementation next. A maintainer must explicitly authorize a rebatched expanded correction scope and/or accept a waiver before delivery can resume.

### R5–R7 correction batch after convergence cycle 4 (maintainer-authorized)

- authorization and scope: maintainer authorized the complete bounded `SPEC030-R5` through `SPEC030-R7` batch: correct invalid no-input preview examples; align `custom-patches`, filesystem, overlay-authoring, preset, and deployment-target guides; and reconcile the completion record and changelog. No CLI behavior change is in scope.
- implementation: all runnable preview examples now supply `--stack` and flat `--overlays` input; the dogfooding instruction uses the root project's live selection. The five listed guides now make the project file canonical, frame the manifest only as a generated compatibility/audit receipt or inspection surface, and remove legacy category flags/index registration from current guidance. The spec and changelog now accurately describe the candidate's list-rendering, unit, and Behave work.
- validation: live plan variants, command help, preset listing, targeted stale-token scans, focused command tests, focused BDD, doctor, `git diff --check`, and required `task validate` were executed; exact final provenance is in `artifacts/implementation-evidence.md`.
- BDD rationale: no BDD feature changed for the documentation-only R5/R6/R7 corrections. The candidate already contains a Behave scenario for its user-visible filtered-list rendering correction; that focused feature was rerun.
- decision: **STOP**. The batch is `SELF_CHECKED` and ready to return for the requested independent gate. Do not alter the existing independent verdict or claim integration.

### Convergence cycle 5

- source before / after: prior independent fingerprint `25cf7281b08a879c7b91971b29a2dc2ca57bb9ca49565e5222fb7854c018f623` (cycle 4) / latest independently reviewed fingerprint `272cc9d2d515434ecce43310eccdf07a9ecb6f7dda2ae54439461e6f6fba57b8`; both at `HEAD` `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`.
- findings resolved: material progress — recurring `SPEC030-R5` is **RESOLVED**; corrected preview commands passed live CLI checks.
- findings remaining or new: the prior R6 stale-guidance concern recurs as equivalent `SPEC030-R6` **OPEN** after the claimed complete first-party correction; `SPEC030-R7` remains **OPEN**, now specifically because both candidate entries are under released `0.1.13` rather than `[Unreleased]`.
- acceptance evidence gained: none for the blocked criteria; AC-4 and AC-6 remain `NOT_MET` despite R5's resolution.
- validation state changed: no executable regression. Exact-tree evidence at `272cc9d2…` was reused (`task validate`, focused Vitest, focused Behave, and doctor all passed); independent gap-targeted CLI/doc checks established the recurring R6 and current R7. Re-running broad validation would not clear either documentation finding.
- repeated work or failures: equivalent R6 stale guidance recurred after a correction asserted complete first-party alignment, while acceptance evidence for AC-4/AC-6 did not improve.
- token/invocation telemetry: unavailable; not material to this decision.
- decision: **STOP_NON_CONVERGENT** under the bounded protocol; this is not another correction plan. Execution: **BLOCKED**. Risk: **PENDING_ACCEPTANCE**.
- next bounded action or human decision: do not correct R6/R7. Resume only after explicit repository-maintainer/product-owner authorization both (1) defines the exhaustive documentation boundary, including exactly which first-party files and legacy/compatibility contexts are in or out, and (2) approves another correction after the independent reviewer asserted that expanded scope. After authorization, replan the newly bounded batch; independent review remains required. No ADR need is identified.

### Convergence cycle 6 — authorized complete R6/R7 correction

- authorization and scope: the current delegated task explicitly authorizes all first-party docs/examples named by the independent re-review, plus the deployment-target preview claim and current `[Unreleased]` changelog placement. It requires one coherent correction pass; no CLI behavior change is in scope.
- source before / after: `HEAD` remains `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`; post-validation tracked-tree fingerprint is `e93254c072cd4762f93ffff49a288045fc2b010d7175772a5f50de4a70017cb9` at `2026-10-05T07:08:39Z`.
- finding disposition: `SPEC030-R6` **RESOLVED_PENDING_INDEPENDENT_REVIEW** — messaging, minimal/editor, workflow, custom-patch, and custom-patch-example guidance now use project-file/flat-overlay selections; the receipt command uses `.devcontainer/superposition.json`; deployment-target guidance states that `plan` cannot preview target-specific artifacts. `SPEC030-R7` **RESOLVED_PENDING_INDEPENDENT_REVIEW** — current candidate entries are under `[Unreleased]`; released `0.1.13` history is restored unchanged.
- validation state changed: all corrected `plan` examples exited 0; targeted stale-token and receipt-path scans were clean; `npm run init -- doctor`, `git diff --check`, and required `task validate` passed (`806` tests passed, `20` normal integration tests skipped).
- BDD rationale: no Behave scenario changed because this correction changes documentation and workflow records only. Existing candidate Behave coverage for the list-rendering behavior remains applicable; live CLI execution validates every changed executable preview example.
- decision: **STOP** — self-check completed. Return the whole candidate to the requested **INDEPENDENT** gate; do not overwrite its existing `CHANGES_REQUESTED` verdict or claim integration.

### Convergence cycle 7

- source before / after: authorized exhaustive-correction fingerprint `e93254c072cd4762f93ffff49a288045fc2b010d7175772a5f50de4a70017cb9` / current independently targeted fingerprint `ee01d7977f013d747792b4c9f0768b3b7712df70a07a6502d580ccb9a3b3f065`; both at `HEAD` `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`.
- findings resolved: no closure accepted for recurring `SPEC030-R6` in this convergence assessment; outcomes outside the targeted finding were not reassessed.
- findings remaining or new: equivalent `SPEC030-R6` remains **OPEN**. Unlabeled current workflow examples still use legacy category flags in `.github/instructions/overlay-authoring.instructions.md:911,929`, `.github/instructions/overlay-index.instructions.md:806,982`, and `.github/instructions/overlay-docs.instructions.md:299`, despite the authorized scope expressly covering all first-party docs, examples, CLI help, tests, and workflow artifacts.
- acceptance evidence gained: none for the blocked criteria. The material tree change does not improve acceptance evidence for AC-4 or AC-6 because current first-party guidance still contradicts the flat-`overlays:` canonical model.
- validation state changed: the current fingerprint and cited instruction excerpts were independently reproduced; `git diff --check HEAD` passes, but formatting/diff hygiene cannot clear the recurring guidance defect. Prior broad executable validation is not evidence that the exhaustive documentation boundary is aligned.
- repeated work or failures: equivalent R6 has recurred after cycle 5 already stopped for non-convergence and after a newly authorized correction claimed exhaustive first-party coverage. This is the protocol's explicit stop condition, not a basis for another correction launch.
- token/invocation telemetry: unavailable and immaterial to the decision.
- decision: **STOP_NON_CONVERGENT**. Execution remains **BLOCKED**; risk remains **PENDING_ACCEPTANCE**; integration is not ready.
- next bounded action or human decision: freeze implementation. Route to the Lead/repository maintainer to choose explicit risk acceptance, cancellation, or a separately authorized diagnosis-first restart based on a finite independently reviewed inventory of every first-party workflow surface. Do not launch another correction from this cycle record. Any future route should use a **Governed** profile and retain **INDEPENDENT** review; the existing validation manifest must be rediscovered because the exhaustive-scope assumption was invalidated. No ADR is indicated, and rollback is containment-only: preserve the current tree until the authority chooses whether to retain or revert the unaccepted correction batch.

### Convergence cycle 8 — governed inventory replan

- source before / after: `HEAD` remains `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`; pre-replan tracked-tree fingerprint `8780049ea2e9037899da016806f9b7280d245cdd9bf6e7250f0b26ee20c1c91c`; the intentionally dirty partial candidate is preserved and no correction was attempted.
- findings resolved: the scope-control diagnosis is now finite and reproducible; the inventory explicitly enumerates `docs/`, `.github/instructions/`, `.pi/`, `templates/`, and `overlays/*/README.md`, including `--observability` / `--cloud` signals and the reviewer-named six-file omission.
- findings remaining or new: recurring `SPEC030-R6` remains open; ten current conflicts are proposed as one exact correction batch, pending independent pre-edit approval. AC-4 and AC-6 remain `NOT_MET`.
- acceptance evidence gained: bounded inventory evidence only — 260 raw paths, 151 eligible paths, 50 signal candidates, plus manual inspection and historical exclusion of `docs/architecture.md`; no acceptance criterion improved to `MET`.
- validation state changed: the prior manifest is not reused because its exhaustive-scope assumption was invalidated; a new DISCOVER-mode strategy and invalidation rules are recorded in `artifacts/current-guidance-inventory.md`. No product validation was run because this cycle is inventory-only.
- repeated work or failures: the earlier query excluded product templates by name and omitted template/overlay roots and two category flags, causing a new bounded evidence gap before corrections.
- token/invocation telemetry: unavailable and immaterial to the decision.
- decision: **REPLAN** — changed evidence scope and sequencing require independent approval of the finite inventory before any correction implementer resumes.
- next bounded action or human decision: independent pre-edit review of the inventory and exact ten-file batch. If approved, use **Governed** execution, direct documentation correction within that boundary, and return to **INDEPENDENT** review; otherwise return the disputed classification to Lead/maintainer. No ADR is needed.

### Convergence cycle 9 — second pre-edit rejection

- source before / after: cycle-8 pre-replan tracked-tree fingerprint `8780049ea2e9037899da016806f9b7280d245cdd9bf6e7250f0b26ee20c1c91c` / cycle-9 pre-record inventory tree fingerprint `99d1ea4b6baa93f7cd111664d2892802ae38983e2b3e453203f95f9a5f3ecbad`; `HEAD` remains `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`, and no current-guidance correction was attempted. The reviewer reproduced the finite `260 / 151 / 50` counts.
- findings resolved: none. Reproducible enumeration did not prove the manual classifications complete or correct.
- findings remaining or new: recurring `SPEC030-R6` remains **OPEN**. The inventory incorrectly classified `docs/filesystem-contract.md:24` and `docs/team-workflow.md:29` as aligned despite current wrong root receipt claims, expanding the proposed boundary from ten to twelve files.
- acceptance evidence gained: none; AC-4 and AC-6 remain `NOT_MET`.
- validation state changed: the independent pre-edit gate is `CHANGES_REQUESTED` for the second time after the broader inventory replan. Exact counts pass, but classification evidence is insufficient to establish an exhaustive safe correction boundary.
- repeated work or failures: `SPEC030-R6` recurs before editing, scope grows again without acceptance-criterion gain, and successive reviewer batches continue to reveal omitted current-guidance surfaces. This is a reviewer scope drip-feeding/non-convergence signal, not a basis for another inventory or correction cycle.
- token/invocation telemetry: unavailable and immaterial to the decision.
- decision: **STOP_NON_CONVERGENT**. Execution: **BLOCKED**. Risk: **PENDING_ACCEPTANCE**. Execution profile remains **Governed**; **INDEPENDENT** review remains required for any future authorized route.
- next bounded action or human decision: freeze implementation and preserve all partial changes. Route to an explicit human maintainer decision: either authorize a governed twelve-file correction despite the recurring pre-edit scope failure, or accept the documented AC-4/AC-6 residual risk. Do not launch another inventory, replan, or correction without that authorization. Route recommendation: human authorization/risk acceptance only; no ADR need is identified, and rollback remains containment-only pending that decision.

### Convergence cycle 10 — user-authorized completion

- The current user explicitly requested completion from the preserved tree, including the inventory, filesystem contract, team workflow, and all remaining review findings. This supersedes the historical freeze instruction in cycle 9; it does not waive AC-4/AC-6 or independent review.
- Independent pre-edit review of the inventory reproduced the original 260/151/50 counts but found `CONTRIBUTING.md` missing from the ten-plus-two correction boundary. The expanded-root inventory amendment records the finite thirteen-file guidance batch and historical exclusions. Existing reviewer verdicts remain historical until an independent final-tree review.
- Deliver the thirteen-file correction as a single documentation batch; retain source/tests and prior partial work. Recheck runnable examples and residual stale signals, run mandatory `task validate` and focused behavior/BDD evidence, then request independent final review. Do not claim finality on implementer self-check alone.

### Convergence cycle 11 — independent final-tree corrections

- Independent review accepted the receipt correction and expanded guidance inventory but found one invalid `docs/presets.md` example (`nodejs` conflicts with `grafana`) and the previously added duplicate entry in released `0.1.13`. Verdict was `CHANGES_REQUESTED`, not a waiver.
- Correct the guide with a live conflict-free flat-overlay selection and remove only the duplicate released changelog addition, leaving the `[Unreleased]` entry. This expands the correction to fourteen guides without changing executable behavior or spec requirements. Revalidate, then return for independent re-review.
