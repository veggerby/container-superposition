# Independent Review Gate

- Review mode: **INDEPENDENT**
- Reviewed source revision: `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`
- Reviewed tracked-tree fingerprint: `272cc9d2d515434ecce43310eccdf07a9ecb6f7dda2ae54439461e6f6fba57b8` from `git diff --no-ext-diff HEAD | sha256sum`
- Working tree: intentionally non-clean; all 29 tracked Spec 030-relevant changed files were considered, with the complete R5–R7 correction diff and owning artifacts inspected
- Verdict: **CHANGES_REQUESTED**
- Execution status: **BLOCKED**
- Integration status: **NOT_READY**; no final integration is claimed
- Risk status: **PENDING_ACCEPTANCE**; this reviewer does not accept the remaining documentation/traceability risk
- Required acceptance authority for any waiver: repository maintainer/product owner; correction is recommended instead
- Follow-up route: **IMPLEMENT** the remaining batched R6/R7 corrections recorded in the latest re-review below, rerun targeted documentation/CLI checks plus `task validate`, then return for independent re-review

## Evidence provenance and reviewed scope

Authority consulted:

- `AGENTS.md`
- `docs/foundation.md`
- `docs/definition-of-done.md`
- ADR 001
- Spec 030 `spec.md`, `plan.md`, and `artifacts/implementation-evidence.md`
- `docs/specs/README.md`, `docs/specs/taxonomy.md`, changelog, opportunity backlog, and roadmap
- all tracked files in the reviewed diff, including CLI source/tests, the six named guides, adjacent changed docs, `docs/adopt.md`, and the dogfooding instruction
- additional end-user/maintainer guides surfaced by the Spec 030 stale-guidance scan

The reported correction fingerprint was independently reproduced exactly. Reviewer-owned creation of this untracked record does not change that tracked-tree fingerprint.

## Findings

### Medium

#### SPEC030-R5 — OPEN (recurring): the authorized AC-6 correction still recommends invalid `plan` commands

`docs/adopt.md:168-170` recommends `plan`, `plan --verbose`, and `plan --diff` without `--overlays` or `--from-manifest`. `.github/instructions/dogfooding.instructions.md:48-49` repeats `plan` and `plan --diff` without required selection input. Independent execution of `npm run init -- plan` exits 1 with `--overlays is required for plan command`.

This is equivalent to the prior stale-guidance finding and therefore retains `SPEC030-R5`. It blocks AC-6 even though the manifest-first/deprecated-flag portion of the prior finding was corrected.

Required action: replace every no-input `plan` example with a live supported invocation carrying the intended stack/flat overlay selection (or a clearly supported compatibility input), and verify each documented command against current help/runtime behavior.

Disposition suggestion: **AUTOMATE** with a lightweight docs-command/example check where practical.

#### SPEC030-R6 — OPEN: stale category/manifest guidance remains across the complete first-party documentation scope

The reviewed tree leaves current guidance that conflicts with Spec 030, ADR 001, or repository rules:

- `docs/custom-patches.md:18` and `:323` use category-centric `--language`/`--database` generation as the primary workflow, despite this file being changed in the candidate.
- `docs/filesystem-contract.md:23` calls `superposition.json` the file that “enables regeneration,” and `:54` tells users to commit it without identifying it as a generated compatibility/audit receipt.
- `docs/creating-overlays.md:626` and `:632` use stale `--postgres`, `--redis`, and `--my-overlay` flags as runnable examples.
- `docs/presets.md:320` instructs maintainers to register presets in prohibited legacy `overlays/index.yml`; `:345` directs users to inspect `superposition.json` rather than canonical project intent.
- `docs/deployment-targets.md:10`, `:24-25`, and `:105` retain category-centric primary examples, while `:112` centers manifest persistence as regeneration authority.

This is a single bounded documentation-alignment batch, not separate serialized nitpicks. It means flat `overlays:` and project-file-first guidance is not yet consistently canonical across relevant first-party examples, so AC-4 and AC-6 are not met.

Required action: align the listed surfaces in one pass; preserve manifest references only as generated receipt, compatibility, command-specific inspection, or migration context; replace invalid flags and the legacy index instruction with current overlay metadata/project-file workflows.

Disposition suggestion: **DOCUMENT** the canonical wording pattern and **AUTOMATE** the highest-signal stale-token checks.

#### SPEC030-R7 — OPEN: workflow records contradict the reviewed candidate and weaken evidence provenance

`docs/specs/030-discovery-surface-and-docs-alignment/spec.md:176-186` says the CLI work was “previously shipped,” no Behave scenario was added, and no CLI/source/test files changed. The reviewed uncommitted candidate actually changes `tool/commands/list.ts`, `tool/cli/args.ts`, `tool/__tests__/commands.test.ts`, `tests/behave/features/core-tooling.feature`, and `tests/behave/steps/generation_steps.py`. The changelog addition records only guide alignment and does not clearly record the filtered-list port-rendering correction.

The spec-local evidence file is more accurate, but the owning spec's completion notes are false for the candidate being reviewed. This violates workflow traceability and prevents treating `Status: Implemented` as a trustworthy handoff record.

Required action: reconcile the implementation notes and changelog with the actual candidate scope, including the added Behave scenario and filtered-list rendering change. Keep historical correction-cycle context, but distinguish committed baseline behavior from this uncommitted candidate accurately.

Disposition suggestion: **DOCUMENT**; consider an artifact-consistency check if this class recurs.

### High / Low

No additional high- or low-severity findings. The complete material batch is `SPEC030-R5` through `SPEC030-R7`.

## Acceptance-criteria classification

| Criterion | Status  | Independent evidence                                                                                                                                                                                 |
| --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1      | MET     | Default `list` output derives all live categories and existing focused coverage asserts `messaging`; live `list --category messaging` returned NATS, RabbitMQ, and Redpanda.                         |
| AC-2      | MET     | Filtered output uses `formatPortMetadata`; live messaging output rendered readable rich port tokens and no `[object Object]`; focused unit and BDD regressions are present.                          |
| AC-3      | MET     | The six explicitly named guides now consistently lead with canonical project files, flat overlays, and preview-before-write guidance.                                                                |
| AC-4      | NOT_MET | `docs/custom-patches.md` and `docs/deployment-targets.md` retain category-centric primary examples; broader first-party guidance remains inconsistent (SPEC030-R6).                                  |
| AC-5      | MET     | The named onboarding/quick-reference guides visibly surface `plan`, `--verbose`, and `--diff` before writes.                                                                                         |
| AC-6      | NOT_MET | Invalid no-input `plan` commands and additional stale flags/index/manifest authority remain (SPEC030-R5, SPEC030-R6).                                                                                |
| AC-7      | MET     | Runtime changes are confined to discovery rendering/help wording; no `init`, `regen`, or `plan` generation semantics changed. The workflow-record contradiction is tracked separately as SPEC030-R7. |
| AC-8      | MET     | Unit coverage asserts readable filtered port metadata and absence of `[object Object]`; Behave adds the corresponding user-visible scenario and negative assertion step.                             |

## Validation/context manifest gap analysis

### Reused exact-tree evidence

The implementer evidence matches the independently reproduced tracked fingerprint `25cf7281…`:

- `task validate` passed: lint/type/format plus 806 tests; 20 normally gated integration tests skipped.
- focused Vitest passed: 94 tests.
- focused Behave passed: 36 scenarios / 206 steps for the earlier CLI correction.
- live help, adopt dry-run, Prettier, and diff hygiene checks passed as recorded.

This evidence is source-tree-matched and remains valid for the areas it exercises; it is not treated as independent approval.

### Independent checks performed

- Reproduced `HEAD` and tracked fingerprint; inspected status, full changed-file inventory, scoped diffs, and `git diff --check` (passed).
- Ran `npm run init -- plan --help`, `adopt --help`, and `list --category messaging` (all command executions succeeded).
- Ran `npm run init -- plan` with no selection; it failed as documented in SPEC030-R5.
- Searched relevant first-party docs for stale flags, category-centric examples, manifest-first authority, `_serviceOrder`, and legacy index guidance; manually classified retained matches.
- Reviewed all six named guide files in full, plus all changed adjacent docs and workflow records.

### Intentionally skipped

- Full `task validate` and focused suites were not duplicated because exact-fingerprint evidence already exists and executable regressions are not the blocker.
- Build, generated-doc/schema validation, regen, and doctor were not run: no overlay/schema/generated-output behavior changed, and they cannot clear the documentation/evidence findings.
- Browser/E2E checks are not applicable to this terminal/documentation change.

## Architecture and engineering fit

| Attribute                        | Status         | Evidence / action                                                                                              |
| -------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------- |
| Correctness and task fit         | CONCERN        | Discovery rendering works, but documented commands include known failures.                                     |
| Architectural fit / ownership    | ALIGNED        | List rendering remains command-owned; project-file authority is correctly established in the six named guides. |
| Simplicity / proportionality     | ALIGNED        | Small local formatter and existing test layers are proportionate; no dependency or ADR is needed.              |
| Maintainability                  | ALIGNED        | Port formatting is isolated and typed.                                                                         |
| Testability / evidence           | CONCERN        | Runtime regression coverage is good; workflow records contradict the candidate.                                |
| Security / privacy / data safety | NOT_APPLICABLE | No secret, permission, or data-handling boundary changed.                                                      |
| Reliability / operability        | CONCERN        | Invalid documented preview commands undermine the promised safe path.                                          |
| Performance / scalability        | NOT_APPLICABLE | Formatting/documentation-only impact.                                                                          |
| Compatibility / user impact      | CONCERN        | Stale and invalid examples can route users away from canonical project intent.                                 |
| Documentation / traceability     | CONFLICT       | SPEC030-R5 through R7 conflict with AC-4/AC-6 and honest completion evidence.                                  |

No ADR or re-plan is required. The correction is a bounded documentation/workflow-artifact batch.

## Residual risk and route

Known residual risk is that users and contributors following first-party guidance can hit an immediate `plan` failure, use unsupported flags/legacy registration, or treat generated manifest state as replay authority. The owning completion record also misstates the candidate scope. This reviewer does not accept that risk.

Route: implement `SPEC030-R5`, `SPEC030-R6`, and `SPEC030-R7` together; verify all corrected examples against live help/runtime; rerun targeted stale-guidance scans, `git diff --check`, and mandatory `task validate`; then request one independent re-review. Do not claim final integration.

## Implementer self-check — R5–R7 correction batch

- Review mode / status: **SELF_CHECK / SELF_CHECKED**. This addendum does not amend the independent `CHANGES_REQUESTED` verdict above, set an independent verdict, or claim integration.
- Finding disposition: `SPEC030-R5` **RESOLVED_PENDING_INDEPENDENT_REVIEW** — all corrected `plan` examples now carry valid `--stack` and `--overlays` input, including the root dogfooding selection. `SPEC030-R6` **RESOLVED_PENDING_INDEPENDENT_REVIEW** — the listed first-party guides use project-file-first / flat overlays and retain manifest material only as compatibility, audit, migration, or inspection context. `SPEC030-R7` **RESOLVED_PENDING_INDEPENDENT_REVIEW** — spec notes and changelog now identify the candidate's list rendering, command test, and Behave work accurately.
- Evidence: exact commands, source revision, final tracked-tree fingerprint, validation surface, BDD justification, stale-token scan, doctor result, and skips are recorded in `artifacts/implementation-evidence.md`.
- Handoff: request one independent re-review of the full R5–R7 batch. Integration remains **NOT_READY** pending that review.

---

# Independent re-review — authorized R5–R7 correction batch

## Result and provenance

- Review mode: **INDEPENDENT**
- Source revision: `HEAD 12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`
- Reviewed tracked fingerprint: `272cc9d2d515434ecce43310eccdf07a9ecb6f7dda2ae54439461e6f6fba57b8`
- Evidence provenance: the task handoff supplied that expected post-implementation fingerprint; the reviewer independently reproduced it with `git diff --no-ext-diff HEAD | sha256sum`. Exact-tree implementer evidence in `artifacts/implementation-evidence.md` was reused for the full validation, focused Vitest, focused Behave, and doctor checks. Reviewer execution was limited to gap-targeted live examples/help, stale-guidance scans, diff hygiene, and changed-document/artifact inspection.
- Verdict: **CHANGES_REQUESTED**
- Execution status: **BLOCKED**
- Integration status: **NOT_READY**
- Risk status: **PENDING_ACCEPTANCE**
- Required acceptance authority for a waiver: repository maintainer/product owner. The reviewer does not accept the risk.

## Batched findings

### Medium

#### SPEC030-R5 — RESOLVED: corrected preview commands are accepted by the live CLI

The corrected compose `plan`, `plan --verbose`, `plan --diff`, and root dogfooding plain-stack commands all exited 0. `plan --help` confirms `--stack`, `--overlays`, `--verbose`, and `--diff`. The original invalid no-input-command defect is closed.

Disposition suggestion: **AUTOMATE** a small executable-doc check if this class recurs.

#### SPEC030-R6 — OPEN (recurring): the claimed full first-party alignment still contains stale or false current guidance

The correction improves the named files but does not complete AC-4/AC-6:

- `docs/custom-patches.md:481` tells standard generated-project users to inspect `cat superposition.json`, and `docs/filesystem-contract.md:24` places the generated receipt at repository root. Normal generation writes it to the configured output path (`.devcontainer/superposition.json` by default); the reviewed root tree has no root receipt. The corrected command therefore fails in the documented normal workflow.
- `docs/deployment-targets.md:8-23` and `:101-113` say the project-file `target:` is previewed, but the shown `plan` command has no target input. Live `plan --help` exposes no `--target`, and independent output for the Codespaces example contains only stack/overlay intent, not `target: codespaces`. The write can therefore differ materially from what was previewed.
- The first-party end-user scope still teaches deprecated category/manifest-first workflows: `docs/examples/custom-patches-example.md:19` (a changed candidate file directly adjacent to the corrected custom-patch guide), `docs/messaging-comparison.md:42,68,103,121-127`, `docs/minimal-and-editor.md:16-314`, and `docs/workflows.md:63`. The minimal/editor guide also says `regen` reads and regenerates from the manifest. These are current runnable recommendations without legacy/migration labels.

This is one recurring R6 finding, batched rather than split into serial file-level findings. Required action: correct the receipt location and target-preview claim, then align or explicitly label the listed current first-party examples in one pass.

Disposition suggestion: **DOCUMENT** the canonical example pattern and **AUTOMATE** high-signal stale-token and generated-receipt-path checks.

#### SPEC030-R7 — OPEN (recurring): the changelog correction is outside `[Unreleased]`

The spec implementation notes now truthfully identify the candidate CLI, unit-test, and Behave scope. However, both the canonical-guides entry and the newly added filtered-list rendering entry are at `CHANGELOG.md:55` and `:64`, under the historical `## [0.1.13] - 2026-07-27` heading at line 24 rather than under `## [Unreleased]` at line 8. This contradicts `AGENTS.md` and the Definition of Done and makes the completion traceability false for the current candidate.

Required action: record the current candidate under `[Unreleased]` without rewriting a released section or duplicating the same unreleased item across categories.

Disposition suggestion: **AUTOMATE** a changelog-heading ownership check.

### High / Low

No additional high- or low-severity findings. All material findings identified in this pass are batched above.

## Acceptance-criteria classification

| Criterion | Status  | Independent evidence                                                                                                                              |
| --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1      | MET     | Prior exact-tree regression evidence remains applicable; live `list --category messaging` exited 0 and returned NATS, RabbitMQ, and Redpanda.     |
| AC-2      | MET     | Live filtered messaging output used readable `Ports:` tokens and contained no `[object Object]`; exact-tree unit/BDD evidence remains applicable. |
| AC-3      | MET     | The six explicitly named guides retain project-file-first, flat-overlay, preview-before-write guidance.                                           |
| AC-4      | NOT_MET | Current first-party examples still use category-centric primary commands, and corrected receipt/preview guidance is inaccurate (SPEC030-R6).      |
| AC-5      | MET     | Named onboarding surfaces continue to expose `plan`, `--verbose`, and `--diff` before writes.                                                     |
| AC-6      | NOT_MET | Stale category/manifest guidance and a wrong receipt command remain current end-user recommendations (SPEC030-R6).                                |
| AC-7      | MET     | R5–R7 changes are documentation/workflow-only; no `init`, `regen`, or `plan` semantics changed.                                                   |
| AC-8      | MET     | Exact-tree focused Vitest/Behave evidence covers category presence, readable port rendering, and absence of object stringification.               |

## Validation/context manifest gap analysis

### Reused exact-tree evidence

At fingerprint `272cc9d2…`, implementer evidence reports:

- `task validate`: passed, including lint/type/format and 806 tests; 20 normally gated integration tests skipped.
- focused Vitest: passed, 94 tests.
- focused Behave: passed, 36 scenarios / 206 steps.
- `npm run init -- doctor`: passed with no reproducibility error.

The fingerprint was supplied in the handoff and independently reproduced. This evidence is accepted as source-tree-matched execution evidence, not as independent approval.

### Independent checks performed

| Check                                                                                                                                              | Result                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `git rev-parse HEAD`; `git branch --show-current`; `git status --short`; `git diff --name-status HEAD`; `git diff --no-ext-diff HEAD \| sha256sum` | Confirmed `12f3dd65…`, `main`, intentional non-clean tree, 29 tracked changed files, fingerprint `272cc9d2…`.                 |
| `git diff --check HEAD`                                                                                                                            | Passed; no whitespace errors.                                                                                                 |
| `npm run init -- plan --stack compose --overlays nodejs,postgres` and variants with `--verbose` / `--diff`                                         | All exited 0.                                                                                                                 |
| Root dogfooding plain-stack `plan` and `plan --diff` with the documented overlay list                                                              | Both exited 0.                                                                                                                |
| `npm run init -- plan --stack compose --overlays nodejs,postgres,docker-in-docker`                                                                 | Exited 0, but output did not preview the documented Codespaces target.                                                        |
| `npm run init -- list --category preset`                                                                                                           | Exited 0 and listed metadata-driven presets including `web-api`.                                                              |
| `npm run init -- list --category messaging`                                                                                                        | Exited 0; three messaging overlays rendered readable port metadata; no `[object Object]`.                                     |
| Live help for `init`, `plan`, `regen`, `adopt`, `migrate`, and `list`                                                                              | Confirmed corrected option names; `plan` has no target/project-file input.                                                    |
| Targeted scans over corrected and adjacent first-party docs                                                                                        | Found the R6 locations above; retained manifest/index references in the corrected preset guide itself were correctly labeled. |
| Full R5–R7 unstaged diff and owning spec/plan/evidence/changelog review                                                                            | R5 correction is valid; R6 and R7 remain open as recorded.                                                                    |

### Intentionally skipped

- Full `task validate`, focused Vitest, focused Behave, and doctor were not duplicated because exact-fingerprint implementer evidence exists and the blockers are documentation/traceability findings.
- Build, generated-doc/schema generation, and `regen` were not run because R5–R7 contain no source, overlay, schema, or generated-output changes.
- Mutating `init --no-interactive` examples were not executed in the repository root. Their options were checked through live help; the review did not risk rewriting project output.
- Browser/E2E checks are not applicable.

## Architecture and engineering fit

- Architectural ownership and proportionality: **ALIGNED** — no code, dependency, or ADR change is needed for this correction batch.
- Correctness, compatibility, and operability: **CONCERN** — some current commands preview different intent than the prose promises or point at the wrong receipt path.
- Documentation and traceability: **CONFLICT** — AC-4/AC-6 remain unmet and changelog ownership violates the completion gate.
- Security/privacy/performance: **NOT_APPLICABLE**.

## Residual risk and route

Residual risk is that users following first-party guidance can inspect a nonexistent receipt, preview overlays without previewing the deployment target they are about to write, or continue category/manifest-first workflows. The current candidate is also recorded under a released changelog section rather than `[Unreleased]`. No residual risk is accepted by this reviewer.

Route: **IMPLEMENT** the complete remaining R6/R7 batch, then rerun live corrected examples, focused stale-guidance scans, `git diff --check`, and mandatory `task validate`; request independent re-review. If the team chooses not to correct the listed first-party scope, route to the repository maintainer/product owner for explicit risk acceptance rather than integrating silently.

---

# Independent final-tree review — governed thirteen-file completion candidate

## Result and provenance

- Review mode: **INDEPENDENT**
- Recorded UTC: `2026-10-05T09:12:37Z`
- Reviewed source revision: `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`
- Reviewed pre-gate tracked-tree fingerprint: `b922611f24d923a363d4d4a854765c1bf18bf67e18de7772bd1dc7ebe5bf06b8` from `git diff HEAD --binary | sha256sum`; this exactly matches the delegated expected fingerprint. This reviewer-owned append changes the fingerprint after review.
- Untracked inventory provenance: `docs/specs/030-discovery-surface-and-docs-alignment/artifacts/current-guidance-inventory.md`, SHA-256 `2517b5b44c8fb99dc5c25547391382822a950f45e2910689f8c027dbfd57d103`.
- Working tree: intentionally non-clean; 43 tracked changed paths and the one spec-local untracked inventory were reviewed without reverting or overwriting unrelated partial work.
- Verdict: **CHANGES_REQUESTED**
- Execution status: **BLOCKED**
- Integration status: **NOT_READY**
- Risk status: **PENDING_ACCEPTANCE**
- Required acceptance authority for a waiver: repository maintainer/product owner. This reviewer does not accept the remaining documentation and changelog risk.
- Follow-up route: **IMPLEMENT** the two bounded corrections below, rerun their focused checks plus the mandatory gate, then request independent re-review. No re-plan, requirements clarification, or ADR is needed.

## Context and validation-manifest gap analysis

Authority and scope inspected:

- `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, ADR 001, Spec 030, its plan, prior review candidate, implementation evidence, and current-guidance inventory.
- The complete `HEAD` diff, all six named guides, the thirteen-file correction batch, `CONTRIBUTING.md`, `docs/filesystem-contract.md`, `docs/team-workflow.md`, CLI source/tests, changelog, docs index, spec indexes/taxonomy, opportunity backlog, and roadmap.
- The inventory's expanded enumeration was independently reproduced at **274 paths** with SHA-256 `11f62b1c871e8ac958e2858d95b121c149c719120b188dad6c9706fed807cc03`. The thirteen corrected guidance paths are present. `docs/README.md` still routes users to current project-file, workflow, examples, filesystem, contributor, and spec authorities; no new canonical document requires an additional index entry.

Gaps found in the supplied manifest/evidence:

1. The inventory classifies `docs/presets.md` as current aligned, but it does not validate the guide's concrete selection against live conflict resolution. The advertised explicit project-file example fails.
2. The completion evidence says the current changelog entries are under `[Unreleased]` and released `0.1.13` history is restored, but the same canonical-guides entry remains newly added under `0.1.13` as well.
3. The latest implementer evidence names the revision but does not record the delegated final tracked fingerprint. The reviewer independently established exact-tree provenance before executing checks.

## Batched findings

### Medium

#### SPEC030-R5 — RESOLVED

The previously invalid no-input preview commands remain corrected. Concrete `plan` commands now carry stack/overlay input, and the independently exercised corrected examples are accepted except for the separate conflicting selection under recurring R6.

Disposition suggestion: **AUTOMATE** executable documentation checks for concrete preview examples.

#### SPEC030-R6 — OPEN (recurring): the exhaustive guidance inventory misses a non-runnable current recommendation

`docs/presets.md:184-201` presents `nodejs,postgres,redis,otel-collector,prometheus,grafana,loki` as an explicit project-file-first selection to preview and then write with `init --no-interactive`. Independent execution of the exact line-200 command exits 1 because `nodejs` and `grafana` conflict. This is not a deliberately failing conflict demonstration; the prose tells users to proceed to the write command.

The same file is classified “Current aligned” at `artifacts/current-guidance-inventory.md:197`, so the exhaustive inventory and runnable-example claim are false for the reviewed final tree. The thirteen-file batch itself is present and its corrected concrete examples are valid; this remaining defect is in the preserved candidate's broader first-party guidance.

Required action: replace the preset-equivalent selection with a live conflict-free selection (and keep the YAML and command identical), execute the exact preview, and update the inventory/evidence classification honestly.

Disposition suggestion: **AUTOMATE** concrete `plan` examples where practical; **DOCUMENT** intentional non-zero examples explicitly.

#### SPEC030-R7 — OPEN (recurring): the same candidate is still recorded in released history and `[Unreleased]`

`CHANGELOG.md:26` correctly records canonical guide alignment under `[Unreleased]`, but `CHANGELOG.md:63` also adds the same candidate under released `0.1.13`. The `git diff HEAD` confirms both are additions from this candidate. This violates the repository rule to keep one consolidated current-unreleased entry and contradicts the evidence claim that released `0.1.13` history was restored unchanged.

Required action: retain the current candidate only under `[Unreleased]`; remove the candidate-added duplicate from the released section without altering unrelated released history.

Disposition suggestion: **AUTOMATE** a changelog ownership/duplicate check.

### High / Low

No additional high- or low-severity findings. The material final-tree findings are batched above.

## Acceptance-criteria classification

| Criterion | Status  | Independent evidence                                                                                                                                                                                                                   |
| --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1      | MET     | Default `list` derives categories from the live catalog; independent output includes `messaging` with NATS, RabbitMQ, and Redpanda. Existing unit coverage also asserts the category.                                                  |
| AC-2      | MET     | Filtered messaging output renders readable numeric and structured port tokens and contains no `[object Object]`; independent unit/BDD gates pass.                                                                                      |
| AC-3      | MET     | All six named guides teach project-file-first, flat-overlay, preview-before-write guidance; retained manifest references are labeled compatibility/migration/receipt context.                                                          |
| AC-4      | MET     | Primary project examples use `superposition.yml` plus flat `overlays:`; the thirteen-file stale category/index/receipt correction is present. The invalid preset combination is classified under AC-6 rather than configuration shape. |
| AC-5      | MET     | README and first-run/quick-reference surfaces visibly place `plan`, `--verbose`, and `--diff` before `init`/`regen`.                                                                                                                   |
| AC-6      | NOT_MET | A current first-party preset example recommends a concrete selection that live `plan` rejects, while the inventory calls it aligned (SPEC030-R6).                                                                                      |
| AC-7      | MET     | Runtime changes are limited to list rendering/help wording. Full tests pass, and no `init`, `regen`, or `plan` generation semantics changed.                                                                                           |
| AC-8      | MET     | Unit and Behave coverage assert filtered structured-port readability and absence of `[object Object]`; the independent focused Behave run passes.                                                                                      |

## Validation surface evidence

### Independently executed against the reviewed fingerprint

| Check                                                                       | Result                 | Evidence / scope                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Revision, status, full diff inventory, expected fingerprint                 | PASSED                 | Reproduced `HEAD 12f3dd65…`, intentional dirty tree, 43 tracked changed paths, and fingerprint `b922611f…`.                                                                                                                                                                                         |
| `git diff --check HEAD`                                                     | PASSED                 | No whitespace errors.                                                                                                                                                                                                                                                                               |
| Expanded first-party Markdown enumeration and targeted stale-guidance scans | PARTIAL / FINDING      | Reproduced 274-path inventory hash; retained legacy tokens were manually classified. Runnable inspection exposed SPEC030-R6.                                                                                                                                                                        |
| Live default and filtered `list`                                            | PASSED                 | Default output includes messaging; filtered output has readable rich ports and no object stringification.                                                                                                                                                                                           |
| Broad concrete one-line `plan` example sweep                                | FAILED (documentation) | Valid examples and explicit negative demonstrations behaved as expected; the current `docs/presets.md` recommendation unexpectedly exits 1 with `nodejs`/`grafana` conflict. Placeholder authoring examples and cwd-specific legacy-manifest examples were not treated as standalone root commands. |
| `task validate`                                                             | PASSED                 | Independently ran `lint:fix`, lint/typecheck, and full Vitest: 54 files passed, 1 skipped; 806 tests passed, 20 normally gated integration tests skipped. The tracked fingerprint remained unchanged.                                                                                               |
| `npm run test:bdd -- tests/behave/features/core-tooling.feature`            | PASSED                 | 36 scenarios and 206 steps passed, including the filtered-port regression.                                                                                                                                                                                                                          |
| `npm run init -- doctor`                                                    | PASSED                 | Healthy: 21 checks, 0 blocking, 0 reproducibility errors, no files changed.                                                                                                                                                                                                                         |
| Changelog/spec/index/docs-index review                                      | FAILED (traceability)  | Spec/index/taxonomy agree on `Implemented`, but the candidate changelog entry is duplicated into released history (SPEC030-R7).                                                                                                                                                                     |

### Intentionally skipped

- `npm run build`: not required for this source-run CLI/docs gate; `task validate` typechecked the changed TypeScript and exercised the CLI logic through tests. Residual compiled-entrypoint risk is low but not used to waive either blocker.
- `npm run docs:generate` and `npm run schema:generate`: implementer reports both passed with no generated diff; the reviewed overlay changes are README-only, not overlay metadata/schema changes. Repeating write-capable generators would not clear R6/R7.
- `npm run init -- regen`: no generated-output behavior changed under Spec 030; independent doctor reported no reproducibility error.
- Browser/E2E checks: not applicable to this terminal/documentation change.

## Architecture and engineering fit

| Attribute                        | Status         | Evidence / required action                                                                      |
| -------------------------------- | -------------- | ----------------------------------------------------------------------------------------------- |
| Correctness and task fit         | CONCERN        | CLI rendering is correct; one current runnable guide example fails.                             |
| Architectural fit / ownership    | ALIGNED        | List rendering remains command-owned and docs now follow project-file authority.                |
| Simplicity / proportionality     | ALIGNED        | Local formatting helper and existing test layers are proportionate; no dependency or ADR added. |
| Maintainability                  | ALIGNED        | Port formatting is isolated and typed.                                                          |
| Testability / evidence           | CONCERN        | Runtime coverage is strong, but example validation and changelog evidence are incomplete.       |
| Security / privacy / data safety | NOT_APPLICABLE | No security or data boundary changed.                                                           |
| Reliability / operability        | CONCERN        | The preset guide routes users into a known conflict before write.                               |
| Performance / scalability        | NOT_APPLICABLE | No material performance path changed.                                                           |
| Compatibility / user impact      | CONCERN        | A copied first-party selection cannot be generated.                                             |
| Documentation / traceability     | CONFLICT       | R6 leaves AC-6 unmet; R7 violates changelog/DoD traceability.                                   |

Fit verdict: **CONCERNS**. No ADR or architecture decision is required.

## Residual risk and route

Residual risk is that users copying the preset guide hit a conflict and cannot follow the advertised preview-to-write flow, while release history falsely records the same uncommitted candidate in both current and released sections. This reviewer does not accept either risk.

Required route: **IMPLEMENT** `SPEC030-R6` and `SPEC030-R7` as one bounded correction, preserve unrelated dirty changes, execute the corrected preset preview, run changelog/inventory scans plus `git diff --check` and `task validate`, then return the exact resulting tree for **INDEPENDENT** re-review. If correction is declined, only the repository maintainer/product owner may explicitly accept the residual risk; execution remains blocked until that decision is recorded.

---

# Independent re-review — final R6/R7 correction

## Result and provenance

- Review mode: **INDEPENDENT**
- Recorded UTC: `2026-10-05T09:25:39Z`
- Reviewed source revision: `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`
- Reviewed pre-gate tracked fingerprint: `629c5e96e55fd19b42cc83fdc887b950f371698d9d89f79819ace4556805ff67` from `git diff HEAD --binary | sha256sum`; this exactly matches the delegated expected fingerprint. This reviewer-owned append changes the fingerprint after review.
- Working tree: intentionally non-clean; 43 tracked changed paths and the spec-local untracked guidance inventory were reviewed without reverting or rewriting history.
- Evidence provenance: current-tree independent command execution below, direct inspection of the full preset prose, changelog sections, source/tests, six named guides, inventory, spec, plan, and implementation evidence; earlier exact-source independent evidence was reused only where the final correction did not touch the exercised source or generated-output boundary.
- Verdict: **PASS**
- Execution status: **ACTIVE**
- Integration status: **READY_FOR_INTEGRATION**
- Risk status: **NONE**
- Residual-risk acceptance authority: **not required**
- Follow-up route: **integrate**; no implementation, re-plan, clarification, waiver, or ADR is required.

## Batched finding dispositions

### Medium

- **SPEC030-R5 — RESOLVED.** Valid selection inputs remain present in preview commands.
- **SPEC030-R6 — RESOLVED.** `docs/presets.md` now uses the same conflict-free `python,postgres,redis,otel-collector,prometheus,grafana,loki` selection in its project-file prose and executable preview. The exact preview exited 0, resolved all seven overlays, and reported no conflict. The expanded inventory, owning spec, plan cycle 11, and implementation evidence consistently record this fourteenth guide correction.
- **SPEC030-R7 — RESOLVED.** The candidate has one canonical-guides entry and one filtered-list entry under `[Unreleased]`; neither entry appears under released `0.1.13`. Released history remains otherwise intact in the reviewed diff.

No open high-, medium-, or low-severity findings were identified. Recurring-finding disposition remains **AUTOMATE** for executable documentation examples and changelog-section ownership if this defect class recurs.

## Acceptance-criteria classification

| Criterion | Status | Independent evidence |
| --- | --- | --- |
| AC-1 | MET | Live default `list` output includes the `messaging` category and NATS, RabbitMQ, and Redpanda; unit/full validation passes. |
| AC-2 | MET | Live filtered messaging output renders readable numeric and structured `Ports:` values and contains no `[object Object]`; focused Behave and unit/full validation pass. |
| AC-3 | MET | Full review of the six named guides confirms project-file-first, flat-overlay, preview-before-write guidance; retained manifest mentions are compatibility, migration, or generated-receipt context. |
| AC-4 | MET | Primary examples use `superposition.yml` and flat `overlays:`. Expanded-root stale-token review found only explicitly historical/prohibitive category/index references. |
| AC-5 | MET | Named first-run guides surface `plan`, `plan --verbose`, and `plan --diff` before `init`/`regen`. |
| AC-6 | MET | The final preset prose is internally consistent and its exact command succeeds; the expanded inventory and targeted scans expose no unlabeled current stale flag, `_serviceOrder`, or operative legacy-index recommendation. |
| AC-7 | MET | Runtime changes remain confined to discovery rendering/help wording; no `init`, `regen`, or `plan` generation semantics changed, and the full suite passes. |
| AC-8 | MET | Command-level and Behave regressions assert readable filtered port metadata and absence of object stringification; current-tree checks pass. |

## Validation/context manifest gap analysis

The supplied expected fingerprint was reproduced before review. The latest implementer evidence names the correct revision and correction content but does not state this final fingerprint; independent execution therefore re-established exact-tree provenance. Inventory, spec, evidence, and plan now agree on the fourteen-guide correction, conflict-free preset selection, and removal of only the duplicate released changelog entry. Spec status, spec index, and taxonomy all agree on `Implemented`.

### Independently executed against fingerprint `629c5e96…`

| Check | Result | Evidence / scope |
| --- | --- | --- |
| Revision, status, fingerprint, 43-path inventory, `git diff --check HEAD` | PASSED | Expected revision/fingerprint reproduced; no whitespace errors. |
| Exact corrected preset preview | PASSED | `npm run init -- plan --stack compose --overlays python,postgres,redis,otel-collector,prometheus,grafana,loki` exited 0 and resolved the documented selection. |
| Full preset prose and changelog section review | PASSED | YAML and command selections match; `[Unreleased]` retains both candidate entries; released `0.1.13` contains neither duplicate. |
| Live default and filtered messaging discovery | PASSED | Default output includes messaging; filtered output has readable ports and no `[object Object]`. |
| Targeted current-guidance scans and six-guide preview-order review | PASSED | Remaining category/index/internal signals are historical, prohibitive, or authority text rather than current stale workflow guidance. |
| `task validate` | PASSED | `lint:fix`, lint/typecheck, and Vitest passed: 54 files passed, 1 skipped; 806 tests passed, 20 normally gated integration tests skipped. Fingerprint remained unchanged. |
| `npm run test:bdd -- tests/behave/features/core-tooling.feature` | PASSED | 36 scenarios and 206 steps passed, including filtered-port rendering and negative object-stringification coverage. |

### Reused or intentionally skipped

- Current-candidate implementer evidence reports `npm run docs:generate`, `npm run schema:generate`, and `npm run init -- doctor` passing with no generated changes or blocking/reproducibility findings. The final R6/R7 correction only changes preset prose, changelog placement, and workflow records, so repeating those checks would not add finding-specific evidence.
- `npm run build` was intentionally skipped: this review uses the source-run CLI, `task validate` typechecks and exercises the changed TypeScript, and this is not release packaging. Residual compiled-entrypoint risk is low and does not affect either corrected finding.
- `npm run init -- regen` was skipped because generated-output semantics did not change; browser/E2E checks are not applicable.

## Architecture and engineering fit

- Correctness/task fit, architecture/ownership, simplicity, maintainability, testability, reliability, compatibility, documentation, and traceability: **ALIGNED**.
- Security/privacy/data safety, performance/scalability: **NOT_APPLICABLE**.
- No dependency, migration, architecture-boundary, or ADR change was introduced.

## Residual risk and disposition

No material known residual risk remains for Spec 030. Normally gated integration tests and compiled-output execution were not selected, but the relevant source-run behavior, full unit gate, focused BDD, documentation examples, workflow provenance, and changelog ownership all pass on the reviewed tree. No authority is asked to accept risk.
