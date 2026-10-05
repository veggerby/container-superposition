# Independent Review Gate

- Review mode: **INDEPENDENT**
- Reviewed source revision: `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`
- Reviewed tracked-tree fingerprint: `25cf7281b08a879c7b91971b29a2dc2ca57bb9ca49565e5222fb7854c018f623` from `git diff --no-ext-diff HEAD | sha256sum`
- Working tree: intentionally non-clean; all 22 tracked Spec 030-relevant changed files and spec-local untracked artifacts were reviewed
- Verdict: **CHANGES_REQUESTED**
- Execution status: **BLOCKED**
- Integration status: **NOT_READY**; no final integration is claimed
- Risk status: **PENDING_ACCEPTANCE**; this reviewer does not accept the open documentation/traceability risk
- Required acceptance authority for any waiver: repository maintainer/product owner; correction is recommended instead
- Follow-up route: **IMPLEMENT** the complete bounded batch below, rerun targeted documentation/CLI checks plus `task validate`, then return for independent re-review

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
