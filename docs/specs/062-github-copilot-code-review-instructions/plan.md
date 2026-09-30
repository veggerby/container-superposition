# Plan

## Scope and Delivery Posture

- Spec: `docs/specs/062-github-copilot-code-review-instructions/spec.md`
- Planning baseline: `f2bb9a26ee07bf4e2ef67da8b89727e338d625e8`; correction-cycle base revision: `f6a228529883e8ea9bea062a045744b3720587b6`.
- Execution profile: **Standard** — this is published repository-wide review guidance governed by GitHub platform behavior and requires durable spec-first records.
- Review gate: **INDEPENDENT** — repository-wide review guidance is a contractual control.
- Requirements authority remains `spec.md`; this plan does not change its acceptance criteria or non-goals.

## Technical Approach and Boundaries

- Add only `.github/copilot-instructions.md` as the documented repository-wide Copilot instruction entry point.
- Keep it concise and refer to existing authorities rather than duplicating their rules. Matching `.github/instructions/**/*.instructions.md` files remain path-specific supplements.
- Do not modify `AGENTS.md`, its authority boundaries, path-specific instruction files, runtime code, workflows, or generated artifacts. Do not add `CLAUDE.md`.
- Add the spec-local planning, validation, and self-check records; synchronize `docs/specs/README.md` and `docs/specs/taxonomy.md`.
- Add a concise `CHANGELOG.md` entry because this is new contributor-visible repository guidance.

## Ordered Steps

1. Create this spec before the repository-wide configuration, with stable acceptance-criterion IDs and explicit non-goals.
2. Create `.github/copilot-instructions.md` that routes reviews to the existing authority hierarchy, path-specific guidance, review focus, and conflict/escalation behavior.
3. Synchronize the new spec in the spec index and DOCS-GUIDE taxonomy and add the required contributor-visible changelog entry.
4. Inspect the changed files and instruction coverage, then run `task validate` as the required final gate.
5. Record source-revision-matched validation and a `SELF_CHECK` review-gate candidate. The first independent review returned `CHANGES_REQUESTED`; record the accepted hosted-Copilot residual risk and correct stale workflow wording, then submit the unchanged guidance for re-review without claiming it has passed.

## Affected Areas

- `.github/copilot-instructions.md` — new supported repository-wide GitHub Copilot code-review guidance.
- `docs/specs/062-github-copilot-code-review-instructions/spec.md` — requirements, implementation state, and acceptance evidence.
- `docs/specs/062-github-copilot-code-review-instructions/plan.md` — execution, boundaries, validation, and handoff plan.
- `docs/specs/062-github-copilot-code-review-instructions/artifacts/validation.md` — compact validation evidence.
- `docs/specs/062-github-copilot-code-review-instructions/review-gate.md` — self-check candidate for independent review.
- `docs/specs/README.md` and `docs/specs/taxonomy.md` — synchronized spec indexes.
- `CHANGELOG.md` — contributor-visible guidance entry under `Unreleased`.

## Architecture and Engineering Fit

| Attribute                          | Status         | Evidence / required action                                                                                                 |
| ---------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Correctness and task fit           | ALIGNED        | GitHub's documented repository-wide location is `.github/copilot-instructions.md`; the task requires it.                   |
| Architectural fit                  | ALIGNED        | The file routes to `AGENTS.md`, foundation, DoD, ADRs, specs, and path-specific guidance without changing ownership.       |
| Simplicity and proportionality     | ALIGNED        | A concise instruction file is the platform-supported configuration; no code, dependency, or abstraction is needed.         |
| Maintainability                    | ALIGNED        | Current authorities remain single sources of truth.                                                                        |
| Testability and evidence           | ALIGNED        | Static file inspection plus required repository validation are proportionate to a documentation/configuration-only change. |
| Security, privacy, and data safety | NOT_APPLICABLE | No secrets, permissions, or runtime data path change.                                                                      |
| Reliability and operability        | ALIGNED        | Conflict flagging prevents a reviewer from silently inventing policy.                                                      |
| Performance and scalability        | NOT_APPLICABLE | No runtime path changes.                                                                                                   |
| Compatibility and user impact      | ALIGNED        | Existing path-specific Copilot instructions remain in place; the new file adds repository-wide routing only.               |
| Documentation and traceability     | ALIGNED        | Spec, plan, indexes, changelog, validation evidence, and review-gate candidate are updated together.                       |

**Fit verdict:** PASS. No ADR is required because this operationalizes existing authority and does not change an architecture boundary.

## Validation Surface and Strategy — DISCOVER

- Manifest source: `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, `Taskfile.yml`, `package.json`, `.github/instructions/`, and the spec/index conventions at source revision `f2bb9a26ee07bf4e2ef67da8b89727e338d625e8`.
- Invalidation triggers: changes to the task runner/package scripts, repository instructions, acceptance criteria, the Copilot file, or affected workflow artifacts.
- Evidence profile: **Compact** — documentation/configuration-only change; `task validate` remains mandatory.

| Level               | Command / method                                                                                             | Purpose                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Instruction/manual  | Inspect `.github/copilot-instructions.md` against every `COPILOT-REVIEW-*` criterion and current authorities | Prove supported location, authority routing, review focus, and no parallel policy.             |
| Workflow artifacts  | Compare spec headers with `docs/specs/README.md` and `docs/specs/taxonomy.md`; inspect changelog placement   | Prove metadata and contributor-guidance synchronization.                                       |
| Required final gate | `task validate`                                                                                              | Required pre-handoff validation; runs formatting fix, lint/type checks, and full Vitest suite. |
| Patch hygiene       | `git diff --check` and scoped final diff inspection                                                          | Detect whitespace errors and out-of-scope changes.                                             |

### Checks not selected

- Targeted unit, integration, BDD, browser, build, generated-output, schema, regen, and doctor checks are not applicable: no executable behavior, workflow/CLI behavior, overlay/schema source, generated output, or browser UI changes. `task validate` runs the full existing unit suite as the mandatory repository gate.

## Acceptance-Criteria Evidence Plan

| Criterion          | Planned evidence                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| COPILOT-REVIEW-001 | Instruction-file inspection for supported path, authority references, and path-specific guidance selection.  |
| COPILOT-REVIEW-002 | Instruction-file inspection plus scoped diff proving conflict flagging, non-duplication, and no `CLAUDE.md`. |
| COPILOT-REVIEW-003 | Instruction-file inspection for each specified practical review concern and feedback standard.               |
| COPILOT-REVIEW-004 | Spec-local files and synchronized index/taxonomy/changelog inspection.                                       |
| COPILOT-REVIEW-005 | `task validate` result and explicit docs-only test rationale in validation evidence.                         |

## Rollback / Containment

- Revert this single documentation/configuration change to remove the repository-wide routing without affecting runtime code or existing authorities.
- The new file does not modify or replace `AGENTS.md` or path-specific instructions, so rollback restores prior behavior without migration.

## Open Questions

- None.

## Implementation Notes

- Implementation completed as planned; no production, platform configuration, generated-output, or scope change is part of this correction cycle.
- Independent review returned `CHANGES_REQUESTED` for two workflow-record defects: the hosted Copilot discovery/application residual risk lacked a maintainer disposition, and plan/evidence wording was stale. The maintainer explicitly accepted the former risk. This bounded correction records that disposition and the re-review lifecycle only.

### Convergence cycle 1

- source before / after: base `f6a228529883e8ea9bea062a045744b3720587b6`, pre-correction staged tree `ca59b1905bdb443615ba40eb08b9d901ca353881`; correction updates spec-local workflow records only.
- findings resolved: maintainer risk disposition is recorded as accepted; stale `Pending implementation`, `SELF_CHECKED`, `PENDING_ACCEPTANCE`, and pre-review wording is corrected.
- findings remaining or new: independent re-review remains required; no new product or architecture finding.
- acceptance evidence gained: explicit maintainer acceptance resolves the externally hosted Copilot behavior evidence gap as an accepted residual risk; workflow lifecycle now accurately represents `CHANGES_REQUESTED` awaiting re-review.
- validation state changed: prior passing `task validate` evidence is reused because the implementation source files, task runner, package scripts, and acceptance criteria are unchanged; only documentation/workflow records changed.
- repeated work or failures: no broad validation rerun; no repeated finding remains undisposed.
- token/invocation telemetry: one bounded correction invocation; no delegation.
- decision: CONTINUE
- next bounded action or human decision: run narrow Markdown/workflow hygiene checks, update validation provenance, then request INDEPENDENT re-review; do not claim completion.
