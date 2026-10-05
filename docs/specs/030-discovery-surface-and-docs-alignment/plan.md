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
