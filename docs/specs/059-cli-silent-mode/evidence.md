# Follow-up Evidence — Warning Suppression Contract

- **Source revision:** `6fc3cb938a0a1b70aee0da4ecc8b43427885cf7b`
- **Execution / review mode:** ACTIVE / INDEPENDENT PASS (integrated; no findings)
- **Integration record:** independently reviewed uncommitted follow-up tree checksum `15bc16323d0498a58bec4aa1754561aa17696406febf0b113cd9b76e205aa225`; review result PASS with no findings.
- **Scope:** resolve the reported silent-mode documentation mismatch only; no option, output-routing, or generated-output expansion.

## Decision

`--silent` suppresses ordinary non-fatal warnings. No `--no-warn` or similar flag is warranted.

### Repository evidence

1. `tool/cli/output.ts` already replaces both `console.log` and `console.warn` for a silent invocation, while retaining `console.error` for failure diagnostics.
2. The canonical contract in `spec.md` (Resolved Decisions and AC-059-02) expressly includes ordinary non-fatal warnings in routine output suppressed by `--silent`.
3. `README.md` already states that `--silent` suppresses warnings. By normal CLI convention, a silent/quiet flag suppresses routine warning presentation; adding a second warning-specific flag would create an overlapping, unsupported output mode and violate the spec's non-goal of verbosity levels.
4. The stale `docs/ux.md` absolute claim, “No silent operations,” conflicts with the public opt-in automation mode. The prior plan also inaccurately said no warning suppression was introduced. These follow-up changes align those claims and the command-reference/changelog wording with the existing implementation and canonical contract.

## Implementation Ladder Decision

- **Chosen rung:** 1–2: no runtime code change; reuse the existing CLI output boundary.
- **Why:** the implementation already suppresses `console.warn`; only durable contract clarification and a direct regression assertion were missing.
- **Non-negotiables checked:** `console.error` remains unsuppressed, `--silent --json` pre-work rejection is unchanged, and no prompts, writes, generated output, or command semantics are changed.

## Validation Surface (DISCOVER)

- **Focused contract/unit:** `tool/__tests__/cli-silent-mode.test.ts` for the console policy and CLI subprocess contract.
- **BDD:** `tests/behave/features/core-tooling.feature` remains applicable; no scenario edit is needed because command behavior is unchanged. Run its focused feature and the required full BDD gate.
- **Required gates:** `task validate`; `npm run init -- doctor` (minimum pre-merge doctor); documentation diff review.
- **Not applicable:** generated validation, docs/schema generation, and root regen: no overlay, schema, generated-doc source, or generated-output behavior changed.

## Checks Run

| Check                   | Result | Evidence                                                                                                                                                                                             |
| ----------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused silent contract | PASSED | `npx vitest run tool/__tests__/cli-silent-mode.test.ts` — 1 file, 8 tests passed; includes direct assertion that ordinary `console.warn` output is suppressed while `console.error` remains visible. |
| Full BDD                | PASSED | `task test:bdd` — 6 features, 40 scenarios, and 265 steps passed. No BDD feature edit was needed because this follow-up does not alter command behavior.                                             |
| Required validation     | PASSED | `task validate` — format fix, lint/typecheck, and Vitest completed: 53 files/743 tests passed; 1 integration file/40 tests remained conditionally skipped.                                           |
| Doctor                  | PASSED | `npm run init -- doctor` — Healthy; 0 blocking and 0 Reproducibility errors.                                                                                                                         |
| Diff hygiene            | PASSED | `git diff --check` exited successfully.                                                                                                                                                              |

## Acceptance Criteria Evidence

| Criterion | Status | Follow-up evidence                                                                                            |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| AC-059-02 | MET    | Existing `console.warn` suppression plus direct focused regression test and synchronized user-facing wording. |
| AC-059-05 | MET    | Focused regression asserts `console.error` remains visible; no error-channel behavior changed.                |
| AC-059-07 | MET    | Focused contract suite now directly covers the warning/error boundary.                                        |
| AC-059-08 | MET    | Existing BDD scenarios remain behaviorally sufficient; rationale recorded above; full BDD passed.             |
| AC-059-09 | MET    | UX, command-reference, quick-reference, changelog, and canonical spec/plan claims are synchronized.           |
| AC-059-10 | MET    | Existing consolidated Unreleased Added entry now explicitly includes ordinary warnings.                       |
| AC-059-11 | MET    | Focused test, full BDD, `task validate`, and doctor all passed at the recorded revision.                      |

## Residual Risk

The process-global console interception remains the existing design risk; restoration coverage exists and is unchanged. This follow-up adds no runtime mechanism. Review should verify that wording remains confined to routine non-fatal warnings and does not imply suppression of failure diagnostics.

## Validation Claim

- **Validation status:** PASS
- **Execution status:** ACTIVE
- **Review status:** INDEPENDENT PASS; no findings. The follow-up is integrated into the canonical spec-local evidence and remains uncommitted by instruction.
- **Skipped checks:** `task validate:generated`, docs/schema generation, root regen, and integration tests (`INTEGRATION=true`) were not run because no generated-output source, schema, overlay, or external integration behavior changed. Residual risk is limited to those unexercised unrelated surfaces.
