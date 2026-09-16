# Plan

## Replanning Gate and Delivery Route

- Spec: `docs/specs/055-prerelease-publish-worthy-change-gate/spec.md`
- Source baseline: `4dceff2e93427c4e70d8599af3f7d8e52a54677a` (`4dceff2`).
- Superseded reviewed implementation tree fingerprint: `060e869dedf2d4f283cc80e19dbe37a97ecdf8af`.
- Cycle-2 reviewed implementation fingerprint: `aa41876de66d2d8b9f21f0fe6c61f61ee34ef5c86458d05c5cec170163e07ccf`, independently reproduced from the recorded manifest recipe before the cycle-3 correction.
- Cycle-3 reviewed implementation fingerprint: `1ae989d71da1a3bf2c641db39ebe0cb939e634b27c70d430bb6e8440124978fb`.
- Trigger: cycle-4 correction received `INDEPENDENT / CHANGES_REQUESTED`: `VAL-055-007` and its focused validation failure repeated, the required metadata fixture is absent, and the claimed corrected-tree fingerprint is not reproducible.
- Execution profile recommendation: **Governed** — release automation remains adjacent to an irreversible npm/OIDC publication boundary.
- Route recommendation: **diagnosis/recovery first; do not launch another correction loop**. A fresh correction may return to mandatory independent review only after its complete source identity and focused evidence are reproducible.
- Review mode/status: **INDEPENDENT / CHANGES_REQUESTED**.
- Execution status: **BLOCKED; integration remains BLOCKED**.
- Authority decision: **STOP_NON_CONVERGENT**. Lead must reconcile the actual correction tree and evidence package before authorizing further implementation; no requirements or ADR decision is indicated.

## Convergence Record

### Convergence cycle 1

- source before / after: baseline `4dceff2e93427c4e70d8599af3f7d8e52a54677a`; reviewed implementation fingerprint `060e869dedf2d4f283cc80e19dbe37a97ecdf8af`; no correction has yet been attempted.
- findings resolved: none.
- findings remaining or new: `SEC-055-001` unsafe direct interpolation of dispatch input into shell; `SEC-055-002` dispatch can execute the publishing workflow from a non-`main` ref; `SEC-055-003` PR-number-only dispatch is not bound to the maintainer's intended commit; `REL-055-004` native `paths` filtering cannot enforce the complete publish-worthy rule.
- acceptance evidence gained: independent review supplied materially new security and reliability evidence. It invalidates the prior local claim for AC-055-03, AC-055-04, AC-055-05, and AC-055-07; those criteria return to `NOT_MET` pending correction evidence. AC-055-01/02/06 and documentation criteria remain provisional and must be rerun against the corrected tree.
- validation state changed: local implementation evidence previously reported `PASS`; independent review changes the delivery gate to `BLOCKED / CHANGES_REQUESTED`.
- repeated work or failures: none; this is the first correction cycle and the finding set has not recurred after a fix.
- token/invocation telemetry: `docs/specs/055-prerelease-publish-worthy-change-gate/token-usage.yml` records four prior runs, 362,063 input tokens, 39,532 output tokens, and USD 3.1995. This is telemetry only; the bounded design below, not activity, supports continuation.
- decision: **REPLAN**.
- next bounded action or human decision: implement only the four corrections and directly associated tests/docs below, then return to a new independent gate. No human product decision is necessary unless implementation cannot enforce main-ref dispatch or immutable SHA binding without broader credentials, a token fallback, or a requirements change.

### Convergence cycle 2

- source before / after: source baseline remains `4dceff2e93427c4e70d8599af3f7d8e52a54677a`; cycle-1 corrected overlay manifest `707ca934...`; focused evidence hash `c01f5290...`; no cycle-2 correction has yet been attempted.
- findings resolved with fresh focused evidence: `SEC-055-001`, `SEC-055-002`, `SEC-055-003`, and `SEC-055-004` (the prior classifier reliability finding, formerly recorded as `REL-055-004`). Their regression controls must be preserved and rerun, not redesigned.
- findings remaining or new: **HIGH `SEC-055-005`** — the manual PR job checks out and runs untrusted PR-controlled installation/build/test/package lifecycle code while the whole job has `id-token: write`; job-level permissions make the npm OIDC request endpoint/token available before the intended publish step.
- acceptance evidence gained: the focused cycle-1 evidence is material and retires findings 001–004, but independent review adds a new privilege-boundary fact. AC-055-03 and AC-055-05 are `NOT_MET`; AC-055-07 is `NOT_MET` until a regression proves no PR-controlled process can run in an OIDC-enabled job. Other locally met criteria remain provisional and must be rerun on the new manifest.
- validation state changed: cycle-1 correction evidence passed locally; independent cycle-2 review returns validation/integration to `BLOCKED / CHANGES_REQUESTED`.
- repeated work or failures: 001–004 did not recur. 005 is a new finding exposed by deeper review of job-scoped GitHub token/OIDC semantics, so there is material evidence gain rather than non-convergent repetition.
- decision: **REPLAN**.
- next bounded action: replace only the manual PR publication job with a two-job prepare/publish chain and associated contract evidence. Preserve the cycle-1 main-ref, SHA-binding, shell-safety, complete-diff classifier, shared-channel, docs, and final-release controls. No user decision is needed.

### Convergence cycle 3

- source before / after: prior cycle evidence used abbreviated identities `707ca934...` / `c01f5290...`; the reviewed cycle-2 implementation is full fingerprint `aa41876de66d2d8b9f21f0fe6c61f61ee34ef5c86458d05c5cec170163e07ccf`, independently reproduced before this correction. Cycle 3 corrects the checksum basename contract, adds executable producer/consumer artifact fixtures, and records pin provenance; its new fingerprint is recorded in implementation validation evidence.
- findings resolved: `SEC-055-005` is materially resolved by the unprivileged prepare / OIDC publisher split, explicit inert-tarball publication, and `--ignore-scripts`; findings 001–004 remain resolved on the reviewed tree.
- findings remaining or new: `REL-055-006` — the producer writes checksum entry `.prepared/package.tgz`, while the consumer requires `package.tgz`, so every otherwise-valid manual PR artifact fails closed before publish. `VAL-055-007` — static workflow assertions did not execute the producer/consumer artifact contract, and evidence does not establish provenance for the pinned Artifact/Node actions.
- acceptance evidence gained: AC-055-05 improves materially because the privilege-boundary defect from cycle 2 is resolved. AC-055-03 is `NOT_MET` because the required manual PR publish cannot pass its checksum gate. AC-055-07 is `NOT_MET` because current tests passed despite the broken producer/consumer interface and lack executable fixture and pin-provenance evidence. AC-055-05 remains provisional pending pin provenance and independent confirmation; AC-055-01/02/04/06/08/09/10 remain provisional and require regression preservation, not redesign.
- validation state changed: the recorded local `PASS` at `aa41876...` is invalidated for AC-055-03/07; review and integration return to `CHANGES_REQUESTED / BLOCKED` even though the security split itself progressed.
- progress signals: the working-tree identity materially changed in the cycle-2 security-owned files; the full fingerprint was independently reproduced; `SEC-055-005` moved from open to resolved with direct job-permission/step evidence; and the new failure has a bounded producer/consumer diagnosis.
- nonconvergence signals: no prior finding recurred and no source correction was falsely claimed. The newly exposed interface defect and evidence gaps show insufficient validation depth, but not repeated failed correction. No broad rediscovery or scope growth is warranted.
- token/invocation telemetry: no new telemetry was supplied for cycle 3; telemetry does not affect the decision.
- decision: **CONTINUE**.
- next bounded action or human decision: proceed directly with the exact correction/evidence package below; no human product decision is needed. Return the newly fingerprinted tree to mandatory independent review.

### Convergence cycle 4

- source before / after: independent review assessed cycle-3 fingerprint `1ae989d71da1a3bf2c641db39ebe0cb939e634b27c70d430bb6e8440124978fb`; no cycle-4 implementation correction has yet been attempted.
- findings resolved: all prior `SEC-055-001`–`SEC-055-005` and `REL-055-006` findings are independently resolved and must be preserved without redesign.
- finding remaining: `VAL-055-007` — the pinned `actions/download-artifact@d3f86a...` interface has no `artifact-digest` output, while the workflow reads and reports that value as transport-integrity evidence. The claim is therefore false even though the independently generated `package.sha256` still protects the tarball producer/consumer contract.
- material evidence / recurrence assessment: upstream action metadata is novel, direct interface evidence; this is not recurrence of the checksum basename defect or any security finding. The correction is localized and convergence remains measurable.
- validation state: cycle-3 local `PASS` is invalidated only for the unsupported download-digest evidence claim and the corresponding AC-055-07 evidence. Integration remains `BLOCKED / CHANGES_REQUESTED`; previously accepted security, reliability, and checksum evidence stays provisional until regression rerun.
- decision: **CONTINUE**, not STOP.
- next bounded action: remove the nonexistent download output from workflow data flow and summaries/evidence, preserve `package.sha256` verification, and add a metadata-anchored interface regression before independent re-review.

### Convergence cycle 5 (historical assessment)

- source before / after: cycle 4 started from reviewed fingerprint `1ae989d71da1a3bf2c641db39ebe0cb939e634b27c70d430bb6e8440124978fb`; the implementer claimed corrected fingerprint `08b420ab4243a740b5000026ed2d3f5bf9cb2e21408d75ce064e50f3213a0269`, but its manifest names absent `tool/__tests__/fixtures/download-artifact-v4.3.0.json`. Running the recorded recipe reports that missing file and yields only partial-manifest hash `463e03a81f7760f5c3b5ea905e8a0d8c7e41080a8f27db41bc598f51b8017a46`, so the claimed after-identity is not reproducible.
- findings resolved: none accepted in cycle 5; previously resolved `SEC-055-001`–`SEC-055-005` and `REL-055-006` remain provisional and are not reopened by this assessment.
- findings remaining or new: `VAL-055-007` repeats. The required pinned-action metadata fixture is absent, so the added contract regression cannot execute.
- acceptance evidence gained: none. AC-055-07 remains `NOT_MET`; the implementer's `MET`/`PASS` claim is invalidated. No other criterion improves in this cycle.
- validation state changed: the claimed focused result of 9/9 passing is independently contradicted by `npm test -- tool/__tests__/publish-workflow.test.ts` (exit 1; 8 passed, 1 failed with `ENOENT` for the fixture). Review and integration remain `CHANGES_REQUESTED / BLOCKED`.
- repeated work or failures: the same finding ID and focused validation failure recur after the attempted correction, the required correction artifact is absent, and the claimed scope identity cannot be reproduced. This is no material evidence gain.
- token/invocation telemetry: unavailable for cycle 5; it does not affect the decision.
- decision: **STOP_NON_CONVERGENT**.
- next bounded action or human decision: Lead must halt further correction delegation and reconcile the actual working tree against the claimed manifest/evidence. Recovery must produce one complete, reviewable source snapshot containing the required fixture, a fail-fast reproducible fingerprint, and a passing focused test before broader validation or another independent review is authorized. No requirement change or ADR is needed; integration stays blocked.

### Convergence cycle 6

- source before / after: cycle 5 is retained as historical review evidence only. The recovered source snapshot restores the missing `tool/__tests__/fixtures/download-artifact-v4.3.0.json` fixture, re-establishes a complete reviewable tree, and carries the focused workflow evidence forward in one reconciled handoff.
- findings resolved: cycle 5's repeated `VAL-055-007` failure is cleared by restoring the pinned-action metadata fixture and rerunning the contract regression against the reviewed workflow tree. Previously resolved `SEC-055-001`–`SEC-055-005` and `REL-055-006` remain preserved.
- acceptance evidence gained: the focused workflow suite now includes the metadata-fixture contract check and no longer fails with `ENOENT`. The cycle-5 statements about an absent fixture and an 8/9 result are historical only and do not describe the reconciled handoff tree.
- validation state changed: the reconciled tree may return to mandatory independent review with a complete source snapshot and passing focused evidence, while broader integration still waits on that independent confirmation.
- decision: **RETURN_TO_INDEPENDENT_REVIEW**.
- next bounded action or human decision: reviewer should assess the reconciled tree, confirm the restored fixture-backed regression and preserved security controls, and then decide whether broader validation can proceed.

## Exact Cycle-4 Bounded Correction and Evidence Requirements

1. In `.github/workflows/publish.yml`, remove `steps.download-package.outputs.artifact-digest` and every downstream `ARTIFACT_DIGEST`/`artifact_digest` output or summary line derived from it. Do not substitute another unverified value or imply that download-artifact emits a digest. Preserve the upload action's documented artifact evidence where supported, and preserve the independently generated `package.sha256`, exact manifest/path checks, `sha256sum --check`, computed tarball SHA-256, archive/identity/version checks, fixed same-run artifact selection, job permissions, and explicit inert-tarball publish command.
2. In `tool/__tests__/publish-workflow.test.ts`, add a contract regression tied to the exact pinned download action. It must prove the workflow references only outputs declared by that pin's `action.yml` and specifically reject reintroduction of `artifact-digest`. Prefer fetching/inspecting the pinned upstream metadata with immutable-SHA provenance; when network is unavailable, use a small deterministic repository-local metadata fixture/record that includes action repository, full pin, source URL, content hash, and the relevant declared-output set. The fixture is evidence of the external interface, not a reimplementation of workflow behavior, and must fail when workflow output references diverge from the recorded metadata.
3. Update `docs/specs/055-prerelease-publish-worthy-change-gate/artifacts/implementation-validation.md` to retract the false built-in download transport-digest claim, state precisely that integrity is enforced by the producer checksum manifest and consumer recomputation, identify what upload/download metadata is actually documented, and record the metadata source or local fixture provenance. Do not claim a live Artifact transport check without an authorized run.
4. Generate a fresh full scope fingerprint after correction; do not reuse `1ae989...`. Run `npm test -- tool/__tests__/publish-workflow.test.ts`, `npm run build`, `npm pack --dry-run`, `task validate`, and `git diff --check`. Record the metadata contract check mode (upstream immutable source or deterministic local fixture), source/hash, environment, exit codes, and finding/AC mapping. No live npm publish is required.
5. Return to mandatory independent review. The reviewer must resolve `VAL-055-007`, confirm the evidence no longer overstates the action interface, and regression-check the independently resolved SEC/REL controls before issuing `PASS`.

Affected boundaries are limited to `.github/workflows/publish.yml`, `tool/__tests__/publish-workflow.test.ts`, an optional deterministic fixture under `tool/__tests__/fixtures/` (or the nearest existing workflow-test fixture boundary), the spec-local implementation evidence, and this `plan.md`. No production CLI/runtime code, new dependency, action-pin change, additional workflow, credential, docs/changelog semantics, classifier behavior, or ADR is authorized.

Validation-manifest decision: **DISCOVER narrowly; do not reuse the cycle-3 PASS claim for VAL-055-007.** Reuse the established build/package/full-regression surface, adding the pinned-action metadata contract check. Invalidation triggers are the download-action pin, recorded metadata content/hash, workflow references to action outputs, checksum/summary data flow, artifact validation shell, job permissions, or publish flags. Roll back the cycle-4 workflow/test/evidence delta together if checks regress; never restore the false digest claim, weaken `package.sha256` verification, or restore the vulnerable single-job publisher. Route: **direct implementation; Governed profile; INDEPENDENT review required**. Open questions: none. ADR: not required.

## Exact Cycle-2 Correction Scope

### 1. Split PR preparation from publication at the job permission boundary

Create an unprivileged `prepare-pr-prerelease` job, guarded by `workflow_dispatch` plus `refs/heads/main`, with only `contents: read` and `pull-requests: read`; because unspecified permissions become `none`, it must have **no `id-token: write`**. Move into it all selected-PR operations: dispatch-input validation, PR API head resolution/equality check, immutable PR SHA checkout, dependency installation, GitVersion/version calculation, lint, build, tests, `npm version`, package dry-run, and final `npm pack`. Upload only the prepared `.tgz` and a checksum manifest as a run-scoped artifact after those checks pass.

Create a dependent `publish-pr-prerelease` job with `id-token: write` and the minimum read permission needed by npm trusted publishing. It must not check out PR code, install dependencies, run package build/test commands, invoke package binaries, or run any script sourced from the artifact. It may run only workflow-owned validation/publication shell and pinned actions from the trusted `main` workflow definition.

### 2. Carry immutable intent across the split without trusting PR outputs

The publication job must independently revalidate the original `pr_number`, `expected_head_sha`, and expected version shape from trusted event/run context. The prepared package version must be exactly `{base}-pr.{validated_number}.{github.run_id}`, with a valid semver base, and the package manifest name must be exactly `container-superposition`. Do not use an untrusted job output as authority for a command, artifact selector, package name, version, tag, repository, or run ID.

Use a fixed artifact name scoped to the current workflow run and a direct `needs: prepare-pr-prerelease` dependency. Download only from the current run/repository; do not accept a dispatch-supplied artifact name, run ID, repository, URL, or digest. The publisher must find exactly one regular `.tgz` and one checksum manifest, reject symlinks/unexpected files/unsafe archive member names, recompute SHA-256, and require an exact checksum match before reading the package manifest. Extract only `package/package.json` to standard output/a temporary isolated location for static JSON validation; never source or execute artifact content.

### 3. Preserve artifact provenance and transport integrity without granting PR OIDC

Use GitHub Artifact v4 upload/download actions pinned to reviewed full commit SHAs. Set a short explicit retention period and `overwrite: false`; upload only the tarball and checksum. Record only outputs documented by each exact pin: the upload action may supply its artifact ID, URL, and digest, while the pinned download action supplies no digest output. Publication evidence records the independently recomputed tarball SHA-256 and must not present an empty/nonexistent download output as transport-integrity evidence.

GitHub artifact attestations are **not** part of this correction because creating one from the untrusted preparation job requires OIDC/attestation permissions and would recreate the privilege exposure. Same-run `needs` linkage, fixed artifact selection, immutable v4 artifact behavior, and independent tarball checksum/manifest checks are the bounded provenance/integrity controls.

### 4. Publish the inert prepared tarball with the correct PR-only tag

After validation, set up Node/npm in the privileged job using an action pinned to a reviewed full commit SHA. Publish the explicit tarball path, never the working directory, using the equivalent of:

```text
npm publish "$TARBALL" --provenance --access public --ignore-scripts --tag "pr-$PR_NUMBER"
```

`--ignore-scripts` is mandatory so `prepublishOnly`, `prepack`, `prepare`, `publish`, `postpublish`, or other package lifecycle hooks cannot execute with OIDC permission. The publisher must validate the PR number again before forming the tag, must not invoke `npm version` or `npm pack`, and must retain direct publication (no `npm dist-tag`, token fallback, `latest`, or shared `prerelease`). Registry verification and summary generation may use only independently validated name/version/tag values.

## Cycle-1 Correction Design (superseded only where the cycle-2 split says so)

### 1. Treat the dispatch workflow definition as trusted `main` code

The PR publication job must require both:

```text
github.event_name == 'workflow_dispatch'
github.ref == 'refs/heads/main'
```

A dispatch made with any other selected workflow ref must produce no publishing job. The final-release and main-push jobs retain their event-specific guards. Tests must assert that every dispatch publication route has the `main`-ref guard and that no `pull_request` or `pull_request_target` event exists.

This control ensures the manually selected PR commit supplies package code, while the workflow logic that validates and publishes it comes from `main`. It does not create automatic PR publication.

### 2. Require and verify the maintainer's expected PR head SHA

`workflow_dispatch` must require both:

- `pr_number`: selected PR number;
- `expected_head_sha`: the 40-hex commit the maintainer intends to publish.

The dispatch job must:

1. receive both values through step `env`, never by inserting dispatch expressions into a `run` script;
2. validate `pr_number` as decimal digits and `expected_head_sha` as exactly 40 hexadecimal characters, normalizing SHA case if needed;
3. query `repos/${GITHUB_REPOSITORY}/pulls/${PR_NUMBER}` with the existing GitHub token and read `.head.sha`;
4. validate the API value as a 40-hex SHA;
5. compare the normalized API head SHA with the normalized required `expected_head_sha` and fail before checkout, dependency installation, OIDC use, or publication on mismatch;
6. expose only the validated number and SHA as step outputs;
7. check out that validated SHA and use it as the immutable publication source.

The required SHA is not a new product option. It closes the ambiguity in “selected PR” and makes the existing immutable-head requirement evidence-backed: the API proves PR membership/current-head identity, while the explicit input binds the run to maintainer intent. A PR update after dispatch therefore cannot silently substitute a different commit. No long-lived token, secret fallback, or write permission is added.

### 3. Remove unsafe shell interpolation and pre-validation input use

For every dispatch-job `run` step, expression values must be supplied through `env` and consumed as quoted shell variables. This includes dispatch inputs, validated step outputs, GitVersion output, and `github.run_id`. No `${{ inputs.* }}` or `${{ github.event.inputs.* }}` may appear inside a `run` body.

Commands must quote values, including `npm version "$VERSION"`, the PR-specific tag, API path components after numeric validation, and summary values. The per-PR concurrency expression must not consume raw, pre-validation dispatch input. Use a fixed workflow-owned PR-publication concurrency group (serializing/cancelling overlapping manual PR publishes) unless a safe workflow-owned grouping mechanism is demonstrated; user intent does not require concurrent dispatches.

Expressions in declarative action fields such as checkout `with.ref` may consume the already validated SHA output; they are not shell interpolation. Tests must inspect parsed step bodies and fail if raw dispatch expressions return.

### 4. Replace trigger-level `paths` classification with a complete in-job classifier

Keep only `push.branches: [main]`; remove `push.paths`. Native path filters can miss publish-worthy files because GitHub limits path-filter diff evaluation (including the documented 300-file consideration limit) and has special behavior for very large pushes. Trigger suppression therefore cannot prove AC-055-04 for every push.

Add a non-publishing `classify-main-changes` job with only `contents: read`. It must check out the pushed `github.sha` with complete history and classify the complete Git diff from `github.event.before` to `github.sha`. A small workflow-owned script at `.github/scripts/classify-publish-worthy.sh` is the single classifier implementation and reads NUL-delimited paths so unusual valid filenames cannot split records.

Classifier rules must exactly implement the spec:

- eligible exact files: `package.json`, `package-lock.json`, `.npmignore`, `tsconfig.json`, `README.md`, `LICENSE`;
- eligible trees: `scripts/**`, `templates/**`, `features/**`, `overlays/**`, and Markdown files at any depth under `docs/`;
- eligible `tool/**` except paths under any `__tests__` directory and files ending `.test.ts`, `.test.js`, `.spec.ts`, or `.spec.js`;
- everything else is non-publish-worthy;
- a mixed diff is publish-worthy if any changed path is eligible;
- additions, modifications, and deletions are all changes; rename detection is disabled so old/new paths are classified independently.

The classifier must validate both commit IDs before passing them to Git. For an all-zero `before` SHA, classify the complete `github.sha` tree. For a normal push, use the complete two-commit diff rather than event payload file lists. If a required commit cannot be resolved after full checkout, fail closed without publication and with an actionable diagnostic; do not guess “publish-worthy” or add a publishing fallback.

Expose `publish_worthy=true|false` as the classifier job output. `publish-main-prerelease` must `need` this job and run only when the output is `true`. For `false`, the classifier job succeeds and emits a concise step summary saying that the main push was non-publish-worthy; the npm publication job is skipped rather than failed. This preserves manual PR-scoped-only behavior because the classifier is reachable only from a main push and never invokes the PR job.

A workflow-owned script is preferred over duplicating inline shell and TypeScript matchers: it keeps one executable rule, adds no dependency, is outside CLI/runtime/package ownership, and can be tested directly with NUL-delimited fixtures.

## Ordered Cycle-2 Correction Steps

1. **Add the failing security contracts first.** Extend `tool/__tests__/publish-workflow.test.ts` to prove job-level privilege separation, no `id-token: write` in the PR-code job, no PR checkout/script/dependency/build/package execution in the privileged job, fixed same-run artifact selection, pinned artifact actions, strict artifact/package validation, explicit tarball publication, `--ignore-scripts`, and the correct `pr-{number}` tag. Preserve all regressions for 001–004.
2. **Create the unprivileged preparation job.** Refactor the current manual job so validation, PR API resolution, immutable checkout, all PR-controlled execution, versioning, and packing occur with read-only permissions and no OIDC. Produce one `.tgz` plus one SHA-256 manifest; upload them under a fixed run-scoped name with pinned Artifact v4 and short retention.
3. **Create the privileged inert publisher.** Add a dependent OIDC-enabled job with no checkout and no dependency/build/test/package lifecycle execution. Download the fixed current-run artifact with pinned Artifact v4, validate artifact count/type/checksum/archive paths/package name/version, and retain only validated values.
4. **Publish only the validated tarball.** Pin privileged action dependencies, invoke `npm publish` on the explicit tarball with `--provenance --access public --ignore-scripts --tag "pr-$PR_NUMBER"`, verify the exact name/version, and emit a PR-scoped summary with the independently recomputed tarball digest; report upload-artifact metadata only where its pinned interface documents it. Keep the fixed concurrency boundary across the manual chain.
5. **Recheck preserved behavior.** Assert the main prerelease classifier/channel and full-release path are structurally unchanged; no PR event, `pull_request_target`, long-lived token, `npm dist-tag`, shared `prerelease`, or `latest` route is introduced.
6. **Synchronize only directly affected wording.** Update `docs/publishing.md` and the existing consolidated `CHANGELOG.md` entry only if they currently imply PR code executes in the publisher or omit the prepared-artifact/lifecycle-disabled boundary. Do not broaden documentation work.
7. **Generate fresh evidence.** Run the discovered focused and mandatory checks; record full corrected manifest/tree identity, full evidence hash, action pin provenance, environment, exit codes, and an AC/finding map. Do not reuse the `c01f5290...` PASS claim for cycle 2.
8. **Return to mandatory independent review.** Reviewer must separately mark `SEC-055-005` resolved and confirm 001–004 remain resolved. No self-check can authorize integration.

## Affected Files and Boundaries

- `.github/workflows/publish.yml` — **required**: split manual PR preparation/publication, minimize permissions, carry the fixed current-run artifact, validate it without execution, publish the explicit tarball with lifecycle scripts disabled, and preserve all cycle-1/main/final-release controls.
- `tool/__tests__/publish-workflow.test.ts` — **required**: add the `SEC-055-005` parsed-workflow regression and artifact/package validation contract while retaining 001–004 and classifier tests.
- `docs/specs/055-prerelease-publish-worthy-change-gate/artifacts/implementation-validation.md` — **required after implementation**: supersede stale cycle-1 PASS evidence with full cycle-2 provenance and reviewer handoff data.
- `docs/publishing.md` — **conditional, wording only**: change only if prepared-artifact and lifecycle-disabled publication behavior needs maintainer explanation.
- `CHANGELOG.md` — **conditional, existing entry only**: narrow correction only if current wording becomes inaccurate; no duplicate entry.
- `.github/scripts/classify-publish-worthy.sh` — **preserve, do not redesign**: only touch if required to keep existing cycle-1 tests green; it is unrelated to 005.
- `docs/specs/055-prerelease-publish-worthy-change-gate/plan.md` — owns this replan and convergence record.

No new application module, helper dependency, reusable abstraction, credential, repository setting, or generated artifact is authorized. Out of scope remains unchanged: CLI/runtime code, overlay metadata, schema behavior/generated schema, generated devcontainer output, `dist/`, npm administration, trusted-publisher configuration, long-lived credentials, `pull_request_target`, automatic PR publication, and changes to main/full-release semantics. The independent verdict remains reviewer-owned.

## Validation Surface Discovered (DISCOVER)

- Manifest decision: **DISCOVER afresh for cycle 2; do not reuse the prior validation manifest or `c01f5290...` PASS claim**. The new job-level privilege finding invalidates the PR publication security and workflow-test portions; classifier evidence may be rerun unchanged.
- Inputs: `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, spec 055, cycle-1 plan/evidence, `.github/workflows/publish.yml`, `tool/__tests__/publish-workflow.test.ts`, `package.json` lifecycle configuration, and `SEC-055-005`.
- Invalidation triggers: changes to workflow job permissions/needs, artifact action/version/pins, npm lifecycle or publish command behavior, package name/version rules, artifact contents/selection/retention, cycle-1 classifier contract, task commands, or GitHub Artifact/OIDC semantics.
- Build: `npm run build`, because release/package behavior and workflow-test TypeScript must type-check.
- Typecheck/static analysis and formatting: `npm run lint:fix`, `npm run lint`, and final `task validate`.
- Unit/contract tests: `npm test -- tool/__tests__/publish-workflow.test.ts`; add fixture-level archive validation tests if validation is moved into a workflow-owned script. Do not create an application-layer helper solely for workflow testing.
- Workflow security tests: parse YAML and enumerate all jobs/steps. Assert exactly the intended privileged jobs have `id-token: write`; `prepare-pr-prerelease` does not. Assert every selected-PR checkout, `npm ci`, GitVersion execution, lint/build/test, `npm version`, dry-run, and pack step is only in preparation. Assert the privileged PR job has no checkout, local action from PR content, package command except explicit tarball publish/view, dependency install, or command capable of running artifact lifecycle code.
- Artifact contract tests: fixed current-run artifact name; direct `needs`; Artifact v4 upload/download and privileged setup action pinned to verified full SHAs; short retention; no overwrite; exact allowlist of one `.tgz` and checksum; no user-controlled run/repository/artifact selector; action outputs constrained to pinned metadata; regular-file/symlink/count checks; unsafe archive-name rejection; checksum recomputation; exact package-name and version/suffix validation.
- Publish-command tests: explicit validated tarball operand, `--provenance`, `--access public`, `--ignore-scripts`, and exactly `--tag "pr-$PR_NUMBER"`; reject working-directory publish, lifecycle-capable preparatory commands in the privileged job, `npm dist-tag`, `latest`, shared `prerelease`, token secrets, and shell interpolation of raw dispatch data.
- Preserved regression tests: rerun the complete 001–004 suite, classifier executable truth table, event/channel separation, and baseline comparison for full release.
- Integration/package checks: `bash -n` for any workflow-owned shell helper, `npm pack --dry-run`, `npm run build`, and `git diff --check`. Use a harmless local fixture tarball to prove checksum/name/version/path failures and that validation does not execute a fixture lifecycle script.
- BDD: not applicable. This is GitHub/npm release orchestration, not a covered CLI/generated-output flow; parsed workflow contracts plus inert archive fixtures are the appropriate executable level.
- Manual review: inspect the job permission matrix and every privileged step; verify pinned action commits against upstream releases; verify the publisher has no PR checkout/workspace dependency; compare main/final-release behavior to baseline; reconcile docs/changelog.
- CI-only/unsafe: authorized dispatch remains a live npm side effect and is deferred. Live Artifact transfer behavior, OIDC trusted-publisher eligibility, npm provenance generation, and registry tag behavior require an authorized run; static/local evidence must not claim those operational checks passed.

### Acceptance evidence required after correction

| Criterion             | Required cycle-2 corrected-tree evidence                                                                                                                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-055-01 / AC-055-02 | Preserved event/job/channel truth table proves no PR trigger and no PR path to shared `prerelease`, `latest`, comments, or misleading summary.                                                                                                                       |
| AC-055-03             | Main-ref/two-input/SHA checks remain; same-run prepared artifact is bound to the manual run; independently validated exact package version and direct `pr-{number}` tarball publication pass.                                                                        |
| AC-055-04             | Unchanged complete-diff classifier and main publish gate tests pass on the new manifest.                                                                                                                                                                             |
| AC-055-05             | Permission/step inventory proves no PR-controlled code or artifact lifecycle executes in any OIDC-enabled job; artifact publication uses `--ignore-scripts`; no token fallback, `pull_request_target`, or broadened permissions; independent security review passes. |
| AC-055-06             | Baseline comparison proves final-release trigger, tag guard, package/release outputs, summary/comment, and permissions are unchanged.                                                                                                                                |
| AC-055-07             | A dedicated 005 regression, all 001–004 regressions, archive fixtures, focused suite, build, and `task validate` pass against a full newly recorded manifest/evidence hash.                                                                                          |
| AC-055-08 / AC-055-10 | Maintainer docs accurately describe the manual PR path and do not restore automatic/shared PR guidance; change only if current text needs split-job clarification.                                                                                                   |
| AC-055-09             | Existing single Unreleased Added entry remains accurate and non-duplicative.                                                                                                                                                                                         |

### Checks deferred until implementation/authorized operation

| Check                                                                                    | Reason                                                         | Residual risk                                                                                                                     |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Focused workflow/archive tests, build, pack dry-run, `task validate`, `git diff --check` | DISCOVER mode does not execute unimplemented corrections.      | Syntax, privilege-split, archive validation, and regression failures remain until fresh evidence is recorded.                     |
| Authorized PR dispatch from `main`                                                       | Publishes an immutable npm version and moves `pr-{number}`.    | Live Artifact transfer behavior, OIDC eligibility, npm provenance, and registry behavior need controlled maintainer confirmation. |
| Attempted dispatch from non-main ref                                                     | Must not be tested by weakening the trusted workflow.          | Static guard/regression remain primary evidence.                                                                                  |
| Eligible and maintenance-only main pushes                                                | Require merged pushes; eligible case mutates shared npm state. | Full-diff and skip observability remain locally proven until authorized operation.                                                |

Evidence profile: **Expanded**, because this publishes unmerged package content at an irreversible OIDC boundary. Until a new full manifest/evidence hash and independent verdict exist: validation `BLOCKED`, review `CHANGES_REQUESTED`, execution `BLOCKED`, risk decision `PENDING_ACCEPTANCE`.

## Rollback and Containment

- Before publication, revert the cycle-2 workflow/test and any conditional docs wording together to the last independently accepted state; do **not** resume the vulnerable cycle-1 single-job PR publisher. If a safe predecessor is unavailable, disable the manual PR path while preserving main/final release behavior.
- If PR identity, artifact upload/download, checksum, file allowlist, archive safety, package name/version, or lifecycle-disabled command validation fails, fail closed before OIDC publication. Never bypass validation, publish the working directory, or add a token fallback.
- Keep the fixed manual concurrency group so overlapping dispatches cannot race the mutable `pr-{number}` tag. Same-run artifact scoping prevents a retry from selecting another run's package.
- If Artifact actions or pinned commits become unavailable/compromised, stop the manual path and replan the pins; do not unpin to a moving ref under urgency.
- Published exact versions remain immutable operational history. Do not automate unpublish or token-based tag repair. Mutable-tag remediation requires separately authorized npm administration.
- The classifier/main prerelease and final-release rollback boundaries remain unchanged and outside the 005 correction except for emergency workflow disablement.

## Architecture / ADR / Open Questions

- Architecture fit verdict: **PASS with governed controls**. Correctness/task fit, ownership, simplicity, maintainability, compatibility, and documentation are `ALIGNED`; security/reliability and test evidence are `CONCERN` only until the planned split and independent gate pass. Performance/migration are `NOT_APPLICABLE`.
- Boundary rationale: release workflow owns preparation/publication orchestration; the GitHub job is the enforceable permission boundary. Existing GitHub Artifact v4, SHA-256, npm tarball publication, and OIDC are reused; no application helper, dependency, credential, or repository setting is introduced.
- Security invariant: untrusted PR code may produce package bytes, but it cannot request OIDC credentials. The OIDC job treats those bytes as inert input, validates identity/integrity, disables lifecycle scripts, and publishes only the explicit tarball under the PR-only tag.
- ADR: **not required**. This is a feature-specific security correction inside the existing release-automation/OIDC authority, not a new durable application boundary or credential model.
- User decision: **not required**. The secure split follows existing criteria and resolved decisions; no requirement, acceptance criterion, non-goal, or product preference changes.
- Open questions: **none blocking**. Implementer must record the selected full action commit pins and upstream release provenance as evidence, not seek a product decision.
- Escalation boundary: return to Lead/user only if implementation requires broader permissions, artifact attestations from the PR job, trusted-publisher/repository setting changes, a non-OIDC credential, automatic PR execution, a different public version/tag contract, or any acceptance/non-goal change.

## Exact Bounded Correction Scope and Resume State

Authorized correction scope is limited to: (1) split the manual PR path in `.github/workflows/publish.yml` into unprivileged preparation and privileged inert-artifact publication; (2) add artifact provenance/integrity, package identity/version, lifecycle-disable, least-permission, and correct-tag controls; (3) add/update only the directly corresponding workflow tests and evidence; and (4) make docs/changelog wording changes only if required for accuracy. Preserve cycle-1 fixes 001–004, main classifier/shared prerelease behavior, and full release behavior. Do not change production CLI code or any workflow outside `.github/workflows/publish.yml`.

Resume state: **STOP_NON_CONVERGENT after cycle 5; execution and integration are BLOCKED.** The claimed cycle-4 fingerprint `08b420...` is not reproducible because its required metadata fixture is absent; the recorded recipe instead produces partial-manifest hash `463e03...`, and the focused suite fails 8/9 with `ENOENT`. `VAL-055-007` and AC-055-07 therefore remain open. Lead must reconcile the tree and evidence before authorizing a complete bounded recovery snapshot. Validation-manifest reuse is rejected: first prove fixture presence/provenance, use a fail-fast fingerprint recipe, and pass the focused workflow test; only then rerun build, pack dry-run, `task validate`, and `git diff --check`. Containment is to preserve the blocked integration state and either restore the coherent reviewed cycle-3 snapshot or replace the incomplete cycle-4 delta atomically; never accept the partial hash or restore the false digest claim. Any recovered snapshot still requires `INDEPENDENT` review. Open questions: none. ADR: not required.
