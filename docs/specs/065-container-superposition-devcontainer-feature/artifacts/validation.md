# Validation Record — 065 Feature Installation Slice

- **Implementation baseline:** `c586d2589d0a51b0f87658079d8561ad38c00305` on `feat/add-local-container-superposition-devcontainer-feature`.
- **Execution date:** 2026-10-12.
- **Environment:** Linux arm64; Node `v24.21.0`; Docker client `29.8.2` / server `29.8.1`; Dev Container CLI `0.89.0`.

## Earlier Feature-installation slice

| Check                                      | Result  | Evidence                                                                                                                                                                              |
| ------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused Feature and publish workflow tests | PASS    | `npm test -- --run tool/__tests__/container-superposition-feature.test.ts tool/__tests__/publish-workflow.test.ts`: 13 tests passed                                                   |
| Feature packaging                          | PASS    | `devcontainer features package features/container-superposition --output-folder /tmp/cs-feature-package --force-clean-output-folder` produced only the collection and Feature tarball |
| Core validation / BDD / generated gate     | PASS    | Recorded prior `task validate`, `task test:bdd`, `task validate:generated`, and build evidence                                                                                        |
| Local Dev Container smoke                  | BLOCKED | GHCR rejected anonymous retrieval of the official Node Feature; installer and `cs --version` did not run                                                                              |

## Amendment compatible-effect materialization slice — 2026-10-12

### Validation surface discovered

- **Unit/transaction:** `tool/__tests__/amend.test.ts` covers receipt ownership, rollback, Git-index preservation, patch effects, setup/verify scripts, and compose overrides.
- **BDD:** `tests/behave/features/local-amendment.feature` covers the visible amendment workflow and a PostgreSQL compose-overlay path.
- **Static/build:** `npm run lint:fix`, `npm run lint`, `npm run build`; required handoff gate `task validate`.
- **Privileged/generated:** Feature Docker/GHCR smoke and `task validate:generated` remain required before final completion; neither is a safe substitute for the blocked registry access.

### Checks run

| Check                                  | Command                                                             | Source revision                | Result                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Focused amendment unit regression      | `npm test -- --run tool/__tests__/amend.test.ts`                    | `c586d258` + dirty task slices | PASS — 33 tests                                                                                                      |
| Amendment BDD                          | `npm run test:bdd -- tests/behave/features/local-amendment.feature` | `c586d258` + dirty task slices | PASS — 9 scenarios / 101 steps                                                                                       |
| Format, lint/typecheck, compiled build | `npm run lint:fix && npm run lint && npm run build`                 | `c586d258` + dirty task slices | PASS                                                                                                                 |
| Mandatory validation                   | `task validate`                                                     | `c586d258` + dirty task slices | PASS — superseded by the 2026-10-12 diagnosis rerun: 824 passed, 20 integration tests skipped by their existing gate |

### Checks not run

| Check                             | Reason                                                                                                                                                                        | Residual risk                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `task validate:generated`         | The focused gate diagnosis does not change the incomplete Feature smoke/effect-matrix scope; do not represent a generated gate as completion evidence for this partial slice. | Full generated/reproducibility evidence remains absent for the complete spec. |
| Docker/Feature smoke              | Still blocked by GHCR authentication for the official Node Feature dependency.                                                                                                | Published Feature command availability is unproven.                           |
| External immutable-catalog matrix | Not implemented in this work package.                                                                                                                                         | Catalog effect planning/materialization remains incomplete.                   |

### Acceptance criteria evidence

| Criterion | Status  | Evidence / remaining gap                                                                                                                                                                                                                         |
| --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-065-01 | NOT_MET | Feature source exists, but publication and registry-backed smoke remain blocked.                                                                                                                                                                 |
| AC-065-02 | NOT_MET | Local opt-in effects now include compatible patches, scripts, receipt-owned support files, and compose fragments; external catalogs and reference relocation remain incomplete.                                                                  |
| AC-065-03 | MET     | Prior project-file-first `regen` evidence remains unchanged.                                                                                                                                                                                     |
| AC-065-04 | NOT_MET | Local compose/personal artifact ownership is proven, but the full intended effect and catalog surface is incomplete.                                                                                                                             |
| AC-065-05 | MET     | No lifecycle automation was added; refresh only writes on explicit command invocation.                                                                                                                                                           |
| AC-065-06 | NOT_MET | Compatible compose/script artifacts are complete in tested cases; stack mismatch, local Feature/reference relocation, symlink, `.gitignore`, parameter, and team service/volume collision reject pre-write. The full effect matrix remains open. |
| AC-065-07 | MET     | Amendment guidance now documents personal compose/script/file ownership and rejection boundaries.                                                                                                                                                |
| AC-065-08 | NOT_MET | Focused unit/BDD/build evidence passes, but the required complete matrix, successful mandatory gate, generated gate, publication, and smoke evidence remain outstanding.                                                                         |

- **Review mode:** `INDEPENDENT` required; not requested.
- **Implementer self-check:** `SELF_CHECKED` for this bounded package only.
- **Validation claim:** `BLOCKED`.
- **Residual risk:** Registry smoke remains blocked; this work intentionally does not claim unsupported catalog/reference/effect families; and full generated/reproducibility validation is still absent for the incomplete spec.

## Mandatory-gate failure diagnosis — 2026-10-12

### Diagnosis

- **Reproduction status:** Not reproducible in the current dirty spec-065 worktree.
- **Source revision / environment:** baseline `c586d2589d0a51b0f87658079d8561ad38c00305` plus the recorded dirty task slices; Linux arm64, Node `v24.21.0`.
- **Observations:** `npm test -- --run tool/__tests__/publish-workflow.test.ts` passed all 11 tests. `task validate` then passed: 56 test files / 824 tests passed, with the existing 20 integration tests skipped by their environment gate. The task-owned diff to `publish-workflow.test.ts` only asserts the Feature-publish workflow permission and step; `createPackageArtifactFixture` and its `tar -C source package` archive-prefix construction are unchanged from baseline.
- **Hypotheses tested:** The reported archive-prefix failure was tested by executing the focused workflow test and the mandatory gate. Neither reproduced it. Diff inspection rules out the current Feature workflow/test slice as a modification of the failing fixture path.
- **Root cause or bounded uncertainty:** The previous failure record is stale or environment/transient; its exact historical cause cannot be established from the retained evidence. It is not induced by the current task changes and requires no unrelated fixture patch.
- **Regression-test strategy:** Retain the existing focused checksum producer/consumer test; it exercises the required `package/` prefix and passes.
- **Recommended next route:** No code correction. Use the passing mandatory-gate evidence below; preserve the task changes and retain the other spec-completion blockers.

| Check                | Command                                                     | Source revision                | Result                                                                                  |
| -------------------- | ----------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| Focused reproduction | `npm test -- --run tool/__tests__/publish-workflow.test.ts` | `c586d258` + dirty task slices | PASS — 11 tests                                                                         |
| Mandatory validation | `task validate`                                             | `c586d258` + dirty task slices | PASS — 56 files / 824 tests passed; 20 integration tests skipped by their existing gate |

- **Validation claim:** `BLOCKED` — the mandatory gate is now green, but the unchanged registry-smoke and incomplete AC-065-02/04/06/08 evidence still prevent completion.

## External immutable catalog selection slice — 2026-10-12

### Validation surface executed

| Check                                                         | Command / method                                                                               | Source revision                | Result                                                                                                                     |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Focused external-catalog and amendment transaction regression | `npm test -- --run tool/__tests__/amend.test.ts`                                               | `c586d258` + dirty task slices | PASS — 34 tests, including a committed external git catalog with exact commit receipt identity                             |
| Amendment BDD                                                 | `npm run test:bdd -- tests/behave/features/local-amendment.feature`                            | `c586d258` + dirty task slices | PASS — 10 scenarios / 111 steps, including namespace-qualified external path-catalog selection and base/index preservation |
| Mandatory validation                                          | `task validate`                                                                                | `c586d258` + dirty task slices | PASS — 56 files / 825 tests passed; existing environment-gated 20 integration tests skipped                                |
| Compiled CLI external-catalog smoke                           | Disposable Git workspace; run compiled `amend init` then `amend refresh` with `--project-root` | `c586d258` + dirty task slices | PASS — path catalog selection materialized the external Feature and recorded `path:catalogs` in the receipt                |

### Acceptance-criteria disposition

| Criterion | Status  | Evidence / remaining gap                                                                                                                                                                                        |
| --------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-065-02 | NOT_MET | External immutable git and repository-relative path catalog selection now share the managed effective registry and preserve the opt-in ownership boundary; full effect-family compatibility remains incomplete. |
| AC-065-04 | NOT_MET | External selection materializes only through the personal alternate config and preserves the team base/index in automated coverage; remaining unsupported effect families block completion.                     |
| AC-065-06 | NOT_MET | Catalog resolution occurs before all writes and then uses the existing complete-or-reject planner/transaction. The full reference-relocation/env/ignore/named-instance matrix remains open.                     |
| AC-065-08 | NOT_MET | Focused unit, BDD, compiled smoke, build, and mandatory validation pass; registry-backed Feature smoke, complete matrix, generated/reproducibility gate, and independent review remain outstanding.             |

- **Checks not run:** `task validate:generated` and Docker/GHCR Feature smoke remain intentionally deferred/blocked as recorded above. Their residual risks are unchanged: complete generated/reproducibility evidence and published Feature availability are not yet proven.
- **Review mode:** `INDEPENDENT` required; not requested.
- **Implementer self-check:** `SELF_CHECKED` for this external-catalog slice only.
- **Validation claim:** `BLOCKED` — this coherent amendment package is green, but the broader spec remains incomplete.

## Correction self-check — 2026-10-12

### Recorded source identity and validation surface

- **Baseline / HEAD:** `c586d2589d0a51b0f87658079d8561ad38c00305` (dirty worktree; no implementation commit).
- **Correction payload fingerprint:** `9350b93eea5ce3ea418c80798ee509382a5e0485368f52f64cf9ef20e8958836` (`git diff` excluding this role-owned validation record, `plan.md`, and the self-check gate); this avoids self-referential evidence hashes.
- **Environment:** Linux arm64, Node `v24.21.0`; local registry publication was not attempted.
- **Surface:** focused amendment/effect planner and publication-workflow Vitest; BDD; typecheck/format; all unit tests; generated docs/schema; root `regen`; root `doctor`; compiled output through the generated gate. Docker/GHCR release smoke is intentionally CI/release-only because it publishes/pulls a registry artifact.

### Checks run

| Check                    | Result | Evidence                                                                                                                                                        |
| ------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused regression       | PASS   | `npx vitest run tool/__tests__/amend.test.ts tool/__tests__/publish-workflow.test.ts tool/__tests__/container-superposition-feature.test.ts` — 48 tests passed. |
| Mandatory/generated gate | PASS   | `task validate:generated` — validation, BDD (61 scenarios / 433 steps), docs/schema generation, root replay, and doctor all passed.                             |
| Diff hygiene             | PASS   | `git diff --check` after the generated gate.                                                                                                                    |

### Finding dispositions (implementer SELF_CHECK)

| Finding  | Disposition          | Evidence                                                                                                                                                                                                                                                                                                                                           |
| -------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F065-001 | Corrected locally    | One effective-catalog-root, read-only effect inventory is consumed by managed composition and amendment. External compose effects, `.env.example`, namespace-safe scripts, and receipt-owned files materialize; unsupported non-patch imports reject before mutation. External compose and full PostgreSQL artifact tests cover the reproductions. |
| F065-002 | Corrected locally    | The transaction snapshots amendment input, receipt, owned artifacts, and exact Git-exclude bytes before protection/input/output writes. A fresh-init injected-failure test proves no input/state/alternate/exclude/index residue.                                                                                                                  |
| F065-003 | Corrected statically | Feature publication is isolated to a `contents: read`/`packages: write` job; action selectors are immutable SHAs; exact npm availability blocks publish; the release job pulls an OCI digest and smoke-installs the exact npm version. Live release evidence remains required.                                                                     |
| F065-004 | Partially evidenced  | Focused and mandatory/generated gates now pass against the recorded dirty identity. Live npm/GHCR publication/pull/install cannot be claimed locally.                                                                                                                                                                                              |
| F065-005 | Corrected locally    | `tool/questionnaire/overlay-effects.ts` is the narrow shared, write-free inventory seam; managed and amendment paths retain their separate materializers/policies.                                                                                                                                                                                 |

### Acceptance-criteria evidence (SELF_CHECK)

| Criterion | Status  | Evidence / limitation                                                                                   |
| --------- | ------- | ------------------------------------------------------------------------------------------------------- |
| AC-065-01 | NOT_MET | Feature source and release smoke workflow are present, but no real published registry run is available. |
| AC-065-02 | MET     | Complete-or-reject opt-in overlay behavior is covered locally; independent review remains required.     |
| AC-065-03 | MET     | Existing docs and replay behavior retained; generated gate replay passed.                               |
| AC-065-04 | MET     | Atomic personal amendment tests/BDD preserve the base and Git index.                                    |
| AC-065-05 | MET     | No lifecycle automation was added; Feature remains install-only.                                        |
| AC-065-06 | MET     | Effective-root full materialization/rejection and fresh-init rollback regressions pass.                 |
| AC-065-07 | MET     | Guidance distinguishes Feature/shared/local routes and documents rejection boundaries.                  |
| AC-065-08 | NOT_MET | Required live registry evidence and the mandated independent review are outstanding.                    |

### Skipped / residual risk

- **Live npm/GHCR publish, digest pull, and Feature container smoke:** destructive/privileged release-only checks; the new workflow blocks on exact npm availability and records digest/version evidence, but its run is still required for AC-065-01/08.
- **Independent review:** required by the spec and not performed by this implementer.

- **Review mode/status:** `SELF_CHECK` / `SELF_CHECKED`; final required mode remains `INDEPENDENT`.
- **Validation claim:** `BLOCKED` for final completion; ready to request the independent correction review, not ready for integration.

## Fresh governed rework — 2026-10-12

### Provenance and validation surface

- **Source identity:** committed baseline `c586d2589d0a51b0f87658079d8561ad38c00305`; dirty-tree fingerprint `e04794c07b1e833b3b5728740f6dce40c075a86db6ed1ecefc245a568cfef2b3` from the task payload excluding role-owned plan/validation/review records.
- **Environment:** Linux arm64; Node `v24.21.0`; no package or OCI artifact was published.
- **Selected surface:** effective-root inventory/unit, amendment transaction, managed composition characterization, release workflow static contract, local-amendment BDD, compiled build, and the mandatory/generated/reproducibility gate.

### Checks run

| Check                                                                                                                                                           | Result                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx vitest run tool/__tests__/overlay-effects.test.ts tool/__tests__/amend.test.ts tool/__tests__/composition.test.ts tool/__tests__/publish-workflow.test.ts` | PASS — 4 files / 70 tests; built-in `ollama` and namespace-qualified external catalog cases retain imported GPU effects.                                              |
| `npm run test:bdd -- tests/behave/features/local-amendment.feature`                                                                                             | PASS — 11 scenarios / 121 steps; includes `ollama` compose-import output and base/index preservation.                                                                 |
| `npm run lint:fix && npm run lint && npm run build`                                                                                                             | PASS.                                                                                                                                                                 |
| `task validate:generated`                                                                                                                                       | PASS — validation, full BDD (62 scenarios / 443 steps), docs/schema regeneration, root `regen`, and `doctor`; doctor reported Healthy with no reproducibility errors. |
| `git diff --check`                                                                                                                                              | PASS.                                                                                                                                                                 |

### Finding disposition (SELF_CHECK)

| Finding  | Disposition                 | Evidence                                                                                                                                                                                             |
| -------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F065-001 | Corrected locally           | The effective-root inventory now declares `composeImports`; amendment merges validated YAML imports before the overlay compose fragment, and `ollama` retains the `devcontainer` NVIDIA reservation. |
| F065-002 | Preserved resolved          | Existing fresh-init/refresh rollback coverage remains green in amendment tests.                                                                                                                      |
| F065-003 | Further hardened statically | The release smoke explicitly logs out of GHCR and has no credential in its environment, so the digest pull and Feature install prove anonymous access when executed by authorized release CI.        |
| F065-004 | Local matrix expanded       | Focused unit and BDD coverage now include the reproduced import family; public registry evidence remains unavailable.                                                                                |
| F065-005 | Corrected locally           | Managed compose and env materializers, plus amendment planning/materialization, consume the shared effective-root inventory rather than separately reading `compose_imports`.                        |

### Acceptance status

- **Locally supported:** AC-065-02, AC-065-04, and AC-065-06 have focused complete-effect evidence; AC-065-03, AC-065-05, and AC-065-07 retain prior generated/documentation evidence.
- **Blocked:** AC-065-01 and AC-065-08 require an authorized npm/GHCR release, anonymous immutable-digest pull, exact-package Feature install, `cs --version`, and independent review. This rework does not publish.
- **Residual risk:** public registry visibility and live Feature installation have not been exercised. The workflow now fails rather than masking an inaccessible Feature, but only release-maintainer authorization can supply the required evidence.

## Shared import/reference traversal correction — 2026-10-12

### Validation surface executed

- **Source identity:** baseline `c586d2589d0a51b0f87658079d8561ad38c00305`; implementation-payload fingerprint (including untracked `tool/__tests__/overlay-effects.test.ts`, excluding self-referential spec plan/validation/review records) `70fc19b0b6fe06011cdb5fde47f6402846ffd9ea9c24044af5331ba53a1b8d13`.
- **Environment:** Linux arm64; Node `v24.21.0`. No publication, commit, staging, or unstaging was performed.
- **Focused surface:** semantic effect resolver, legacy import compatibility, managed composition, amendment transaction, namespace-qualified external catalog, and local-amendment Behave.

| Check                                                                                                                   | Result                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx vitest run tool/__tests__/overlay-effects.test.ts tool/__tests__/amend.test.ts tool/__tests__/composition.test.ts` | PASS — 3 files / 61 tests.                                                                                                                                                                                                      |
| `npx vitest run tool/__tests__/overlay-imports.test.ts`                                                                 | PASS — 24 tests; restored existing diagnostics while retaining fail-closed traversal.                                                                                                                                           |
| `npm run test:bdd -- tests/behave/features/local-amendment.feature`                                                     | PASS — 12 scenarios / 132 steps; includes namespace-qualified imported-local-Feature rejection.                                                                                                                                 |
| `npm run build`                                                                                                         | PASS — compiled source succeeds.                                                                                                                                                                                                |
| `task validate`                                                                                                         | PASS — 57 files / 831 tests, 20 existing environment-gated integration skips. Initial run exposed five legacy diagnostic assertion mismatches; messages were restored and the finding-specific suite plus full gate were rerun. |
| `task validate:generated`                                                                                               | PASS — full BDD 63 scenarios, docs/schema generation, root regen, and doctor; doctor Healthy with no reproducibility errors.                                                                                                    |
| `git diff --check`                                                                                                      | PASS.                                                                                                                                                                                                                           |

### Finding disposition (SELF_CHECK)

| Finding  | Disposition               | Evidence                                                                                                                                                                                                                                                     |
| -------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F065-001 | Corrected locally         | Direct and imported devcontainer patches are parsed semantically. Any local relative Feature/build/compose reference is rejected before amendment writes; namespace-qualified external catalog regression snapshots the prior alternate/state and Git index. |
| F065-002 | Preserved resolved        | Existing fresh-init and prior-refresh transaction tests remain green in the focused and full gates.                                                                                                                                                          |
| F065-003 | External evidence blocker | No release/publication activity was performed.                                                                                                                                                                                                               |
| F065-004 | Locally expanded          | Focused, BDD, build, mandatory, and generated gates are source-matched to the complete payload fingerprint.                                                                                                                                                  |
| F065-005 | Corrected locally         | A closed authored-manifest registry, schema parity test, conventional-file registry, and shared semantic graph replace extension-only/direct-patch policy. Managed `applyOverlay` and amendment consume the parsed graph.                                    |

### Acceptance criteria evidence

| Criterion | Status      | Evidence / limitation                                                                                                  |
| --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| AC-065-01 | NOT_MET     | Authorized public npm/GHCR install smoke remains required.                                                             |
| AC-065-02 | MET locally | Opt-in amendment compatibility now rejects unsupported local references rather than accepting partial output.          |
| AC-065-03 | MET         | Existing project-file-first route retained; generated gate passed.                                                     |
| AC-065-04 | MET locally | Namespace-qualified catalog rejection preserves the team base, prior alternate/state, and Git index.                   |
| AC-065-05 | MET         | No lifecycle behavior changed.                                                                                         |
| AC-065-06 | MET locally | Direct/imported semantic traversal, remote Feature success, local reference rejection, and no-partial regression pass. |
| AC-065-07 | MET         | Existing guidance retained.                                                                                            |
| AC-065-08 | NOT_MET     | Independent review and authorized immutable registry evidence remain required.                                         |

- **Review mode/status:** `SELF_CHECK` / `SELF_CHECKED`; independent review remains required.
- **Validation claim:** local correction `PASS`; overall spec completion `BLOCKED` only on F065-003/F065-004 external publication evidence and independent review.
