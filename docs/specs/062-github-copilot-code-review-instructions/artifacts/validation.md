# Validation Evidence

## Validation surface discovered

- Manifest source: `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, `Taskfile.yml`, `package.json`, `.github/instructions/`, and spec workflow conventions.
- Original planning baseline: `f2bb9a26ee07bf4e2ef67da8b89727e338d625e8`; implementation/correction base revision: `f6a228529883e8ea9bea062a045744b3720587b6`.
- Reused implementation evidence identity: pre-correction staged tree `ca59b1905bdb443615ba40eb08b9d901ca353881`. The implementation guidance and validation inputs are unchanged in this correction; only spec-local workflow records are being corrected.
- Evidence profile: **Compact** — documentation/configuration-only change.
- Build/typecheck/static analysis: `task validate` includes TypeScript and formatting checks.
- Lint/format: `task validate` runs `lint:fix` then `lint`.
- Unit tests: `task validate` runs the full Vitest suite.
- Targeted executable tests / BDD / integration / browser / generated-output checks: not applicable; this change adds no executable behavior, CLI/workflow behavior, generated output, overlay/schema source, or browser surface.
- Manual checks: instruction coverage assertion; workflow-index, changelog, and scoped-diff inspection.

## Checks run

| Check                    | Command or method                                                                            | Source revision                                              | Exit code | Result                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| Required final gate      | Reused recorded `task validate`                                                              | Implementation tree unchanged from `ca59b190…`               | 0         | PASSED — 54 test files / 804 tests passed; 1 integration test file / 20 tests skipped by its existing integration gate |
| Instruction coverage     | Reused Python assertion over `.github/copilot-instructions.md`; verified no root `CLAUDE.md` | Implementation tree unchanged from `ca59b190…`               | 0         | PASSED                                                                                                                 |
| Patch hygiene            | Re-run `git diff --cached --check` after the record correction                               | Current staged correction worktree                           | 0         | PASSED                                                                                                                 |
| Workflow synchronization | Re-inspected spec, plan, validation, and review-gate lifecycle records                       | Current staged correction worktree                           | 0         | PASSED                                                                                                                 |
| Pre-merge doctor         | `npm run init -- doctor`                                                                     | PR #187 branch HEAD `c4df641`                                | 0         | PASSED: Healthy; 0 blocking, 0 fix now, 0 manual, 21 healthy; no Reproducibility errors or files changed               |
| PR feedback final gate   | `task validate`                                                                              | PR #187 branch HEAD `c4df641` + four spec-local record edits | 0         | PASSED: 54 test files / 805 tests passed; existing integration gate skipped 1 file / 20 tests                          |

## Checks not run

| Check                                               | Reason                                                         | Residual risk                                                              |
| --------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Targeted unit/integration/BDD/browser tests         | No executable behavior or testable runtime path changed.       | Copilot platform application behavior remains external to this repository. |
| Build                                               | No compiled code or package output changed.                    | None for this documentation/configuration-only scope.                      |
| Generated validation, schema/docs generation, regen | No overlays, schemas, generators, or generated output changed. | None for this scope.                                                       |

## Acceptance criteria evidence

| Criterion ID       | Evidence                                                                                                                                                                                        | Status |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| COPILOT-REVIEW-001 | `.github/copilot-instructions.md` is at GitHub's documented repository-wide location and names AGENTS, foundation, DoD, ADRs/specs, and matching path-specific instructions.                    | MET    |
| COPILOT-REVIEW-002 | The instruction requires conflicts to be flagged; scoped file/status inspection confirms no `CLAUDE.md` and no changes to authority documents.                                                  | MET    |
| COPILOT-REVIEW-003 | The instruction lists correctness/regressions, ownership/scope, validation/tests/BDD, generated artifacts, docs/specs/changelog, severity/actionability, and unsupported approval restrictions. | MET    |
| COPILOT-REVIEW-004 | Spec, in-folder plan, validation record, review-gate candidate, index/taxonomy rows, and changelog entry exist.                                                                                 | MET    |
| COPILOT-REVIEW-005 | `task validate` passed; targeted executable tests are not applicable for documentation/configuration-only guidance and the rationale is recorded here.                                          | MET    |

- Review mode: `INDEPENDENT`
- Review status: `PASS` (correction cycle 1 independently re-reviewed)
- Execution status: `CLOSED` (local integration committed as `7ac82e6`; PR #187 remains open; no merge claimed)
- Risk decision: `ACCEPTED` by the maintainer — GitHub controls whether and how hosted Copilot discovers and applies repository instructions; local validation cannot prove hosted behavior.

## Validation claim

Validation status: `PASS`

Residual risk: the maintainer has accepted that GitHub controls whether and how hosted Copilot discovers and applies repository instructions, which local validation cannot prove. Independent re-review passed. Local integration was committed as `7ac82e6` and opened as PR #187; PR merge remains pending.
