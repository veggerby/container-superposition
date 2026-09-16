# Cycle-4 Corrected Implementation and Validation Evidence

- Source revision: `4dceff2e93427c4e70d8599af3f7d8e52a54677a` with the uncommitted scope fingerprint below.
- Execution profile: Governed.
- Review mode/status: **INDEPENDENT / SELF_CHECKED**. No independent review was performed by the implementer.
- Execution status: ACTIVE; integration is blocked pending the required independent review.
- Environment: Ubuntu devcontainer; Node `v24.21.0`, npm `11.19.0`, Task `3.45.4`.

## Scope fingerprint

- Scope fingerprint: `d73d2118c35bc9b132eb79dc76dbe7a78dc4bf4fd964f9d9c3f8db84c89e67db`.
- Recipe (this evidence file is excluded to avoid self-reference):

    ```bash
    files=(.github/workflows/publish.yml .github/scripts/classify-publish-worthy.sh tool/__tests__/publish-workflow.test.ts tool/__tests__/fixtures/download-artifact-v4.3.0.json docs/publishing.md CHANGELOG.md docs/specs/README.md docs/specs/055-prerelease-publish-worthy-change-gate/spec.md docs/specs/055-prerelease-publish-worthy-change-gate/plan.md)
    { for f in "${files[@]}"; do printf '%s\0' "$f"; sha256sum "$f"; done; } | sha256sum
    ```

- This supersedes cycle-3 fingerprint `1ae989d71da1a3bf2c641db39ebe0cb939e634b27c70d430bb6e8440124978fb`.

## Correction and finding disposition

| Finding         | Disposition                                | Evidence                                                                                                                                                                                                                                                                                                                                                                |
| --------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VAL-055-007     | ADDRESSED; independent disposition pending | The publisher no longer reads or reports `steps.download-package.outputs.artifact-digest`. Its artifact integrity gate remains the producer-created `package.sha256`, strict manifest/path checks, consumer-side `sha256sum --check`, and the independently recomputed tarball SHA-256. The new fixture-backed test rejects a reintroduced unsupported download output. |
| REL-055-006     | PRESERVED                                  | The producer still creates a `package.tgz` checksum entry and the executable archive fixture proves valid input passes while the old pathname and a mismatched checksum reject.                                                                                                                                                                                         |
| SEC-055-001–004 | PRESERVED                                  | Existing parsed-workflow and complete-diff classifier regressions remain in the focused suite.                                                                                                                                                                                                                                                                          |
| SEC-055-005     | PRESERVED; reconfirmation required         | The unprivileged preparation/OIDC publisher split, fixed artifact selection, inert archive checks, and `npm publish "$TARBALL" --ignore-scripts` remain asserted by the focused suite.                                                                                                                                                                                  |

## Pinned Artifact-action interface provenance

The deterministic fallback record is `tool/__tests__/fixtures/download-artifact-v4.3.0.json`. It records `actions/download-artifact` at immutable pin `d3f86a106a0bac45b974a628896c90dbdf5c8093`, the immutable raw `action.yml` URL, SHA-256 `f81d687a5bb7c2c9428a2cfc32fc099c823d56faf533e7d0e1f3cdc0e10f9cc7`, and its sole declared output: `download-path`. The current environment fetched that immutable source successfully and reproduced the recorded SHA-256. The focused regression reads the repository-local record, binds it to the workflow's exact action pin, and requires every `steps.download-package.outputs.*` reference to be declared; it specifically rejects `artifact-digest`.

`actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02` continues to record its documented upload-side artifact ID, URL, and digest. The pinned download action supplies only its documented download path; no workflow evidence claims a download transport digest. No live GitHub Artifact transport operation was authorized or performed.

## Validation surface discovered

- Build/typecheck: `npm run build`; mandatory `task validate` (format, typecheck, full unit suite).
- Workflow and contract: focused `tool/__tests__/publish-workflow.test.ts`, including executable producer/consumer archive and pinned download-action metadata contract.
- Package: `npm pack --dry-run` for release packaging behavior.
- Integrity: `git diff --check`.
- BDD: intentionally waived for this GitHub Actions/npm release-orchestration correction. This change does not alter a local CLI or generated-output workflow that Behave can safely execute; the authoritative boundary is the checked-in `publish.yml` contract plus executable artifact-validation tests that avoid live OIDC/npm side effects.
- CI-only/unsafe: dispatch, Artifact transport, npm OIDC/provenance, registry tag mutation, and eligible main push are not run locally because they can publish or mutate external state.

## Checks run

| Check                     | Command or method                                     | Source revision               | Exit code | Result                                                                                      |
| ------------------------- | ----------------------------------------------------- | ----------------------------- | --------: | ------------------------------------------------------------------------------------------- |
| Immutable action metadata | `curl` immutable raw `action.yml` plus `sha256sum`    | `4dceff2` + scope fingerprint |         0 | PASSED; hash matched the deterministic fixture and declared output set was `download-path`. |
| Focused workflow contract | `npm test -- tool/__tests__/publish-workflow.test.ts` | same                          |         0 | PASSED; 9 tests, including the new metadata contract and preserved checksum fixture.        |
| Build                     | `npm run build`                                       | same                          |         0 | PASSED.                                                                                     |
| Package dry run           | `npm pack --dry-run`                                  | same                          |         0 | PASSED; no publication occurred.                                                            |
| Mandatory validation      | `task validate`                                       | same                          |         0 | PASSED; 51 test files / 724 tests passed; 1 configured integration file / 40 tests skipped. |
| Diff integrity            | `git diff --check`                                    | same                          |         0 | PASSED; no whitespace errors.                                                               |

## Checks not run

| Check                                                       | Reason                                                                                                                                                                                                                                                                                                               | Residual risk                                                                                            |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Authorized manual PR dispatch and npm registry verification | It publishes an immutable version and moves `pr-{number}`.                                                                                                                                                                                                                                                           | Live Artifact/OIDC/provenance/registry behavior awaits maintainer authorization.                         |
| Eligible and maintenance-only main pushes                   | An eligible push updates shared `prerelease`.                                                                                                                                                                                                                                                                        | Static classifier/workflow evidence only until an authorized operation.                                  |
| BDD                                                         | Intentionally waived: this publish workflow boundary depends on GitHub Actions event context, Artifact transport, and npm/OIDC side effects that local Behave scenarios cannot safely reproduce. Static workflow assertions and executable artifact-contract tests are the authoritative substitute for this change. | None beyond static and executable workflow-contract coverage.                                            |
| Independent review                                          | Reviewer-owned mandatory gate.                                                                                                                                                                                                                                                                                       | Integration remains blocked pending independent resolution of VAL-055-007 and SEC/REL regression review. |

## Acceptance criteria evidence

| Criterion ID         | Evidence                                                                                                                                                                       | Status |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| AC-055-01, AC-055-02 | No PR trigger; only classifier-gated main publication uses `prerelease`; the PR route has no shared-channel/comment path.                                                      | MET    |
| AC-055-03            | Main-ref/two-input SHA binding, fixed artifact, executable checksum/archive contract, exact PR version, and direct `pr-{number}` tarball publication remain covered.           | MET    |
| AC-055-04            | Complete-diff classifier truth table and main gate regressions pass.                                                                                                           | MET    |
| AC-055-05            | Permission/step inventory keeps PR code out of the OIDC job; artifact lifecycle canary is not executed; no token fallback or `pull_request_target`.                            | MET    |
| AC-055-06            | Final-release trigger, permissions, publication command, comment, and summary assertions pass.                                                                                 | MET    |
| AC-055-07            | The artifact producer/consumer rejection tests and deterministic pinned-action output contract pass, along with build, pack dry run, mandatory validation, and diff integrity. | MET    |
| AC-055-08, AC-055-10 | Existing publishing guide remains accurate; no public documentation change was necessary for this internal evidence correction.                                                | MET    |
| AC-055-09            | Existing consolidated Unreleased entry remains accurate and non-duplicative.                                                                                                   | MET    |

## Implementation ladder and handoff

- Chosen rung: small local implementation. Deletion removes the false output data flow; the existing Vitest workflow test and a static JSON provenance record provide the contract check without a helper, dependency, pin change, or abstraction.
- Non-negotiables preserved: producer checksum manifest, consumer recomputation, archive/identity/version checks, OIDC privilege boundary, action pins, and inert `--ignore-scripts` publication.
- Plan deviation/scope drift: none. The bounded workflow, test, local metadata record, plan state, and spec-local evidence changed; public documentation and changelog semantics did not require revision. Pre-existing unrelated working-tree changes remain outside this correction.
- Review request: **INDEPENDENT re-review required**. Resolve `VAL-055-007` and regression-check `REL-055-006` and `SEC-055-001`–`SEC-055-005` before issuing `PASS`.

## Validation claim

- Evidence profile: Expanded, justified by the npm/OIDC trust boundary.
- Validation status: PASS for the recorded local scope fingerprint.
- Review status: SELF_CHECKED; INDEPENDENT review pending.
- Execution status: ACTIVE; integration status: BLOCKED on the required independent gate.
- Risk decision: PENDING_ACCEPTANCE for CI-only live publication behavior and independent review.
- Residual risk: Local validation proves the recorded action interface and checksum contract but cannot prove live GitHub Artifact transport, OIDC, or npm registry behavior.
