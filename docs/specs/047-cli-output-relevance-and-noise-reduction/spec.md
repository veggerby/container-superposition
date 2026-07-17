---
spec: '047-cli-output-relevance-and-noise-reduction'
title: 'CLI Output Relevance and Noise Reduction'
status: 'Final'
qa_status: ''
priority: 'P1'
owner: 'pm'
product_approval: 'approved'
architecture_review: 'not-needed'
ux_review: 'approved'
created: '2026-07-17'
updated: '2026-07-17'
related_adrs:
    - 'docs/adr/adr001-project-file-first-replay-and-regeneration.md'
related_foundation:
    - 'docs/foundation.md'
related_specs:
    - 'docs/specs/032-init-and-regen-guided-flows/spec.md'
    - 'docs/specs/033-cli-discovery-preview-and-fingerprint/spec.md'
    - 'docs/specs/034-doctor-diagnostics-and-remediation-ux/spec.md'
normative_references:
    - 'AGENTS.md'
    - 'docs/definition-of-done.md'
---

# CLI Output Relevance and Noise Reduction

**Spec**: `047-cli-output-relevance-and-noise-reduction`
**Status**: Final
**Created**: 2026-07-17
**Priority**: P1
**Product Approval**: approved
**Architecture Review**: not-needed
**UX Review**: approved

## Description

Tighten write-flow CLI output so users see only information that helps them act. Remove placeholder and duplicate output, especially in `init` and `regen`, and make next-step guidance context-relevant rather than mechanically present.

## Evidence

- `docs/specs/047-cli-output-relevance-and-noise-reduction/artifacts/init-first-run-output.txt` — first-run `init` currently shows both `Recommended next action: No next step suggested` and a success-screen `Next step / No next step suggested` block.
- `docs/specs/047-cli-output-relevance-and-noise-reduction/artifacts/regen-clean-output.txt` — clean `regen` currently repeats source/config framing and defaults to `cs doctor` as the recommended next action.
- `tool/cli/run.ts` — current success rendering always prints `Next step`, and current preflight rendering is preceded by additional mode/source boxes.
- `tool/ux/semantics/next-step.ts` — current shared next-step resolver hardcodes `cs doctor` for `regen` and provides no meaningful `init` success next step.
- `tool/utils/summary.ts` and `tool/__tests__/summary.test.ts` — legacy summary helper still teaches `Verify setup: npx container-superposition doctor` after regular `init`.
- `docs/specs/032-init-and-regen-guided-flows/spec.md` — existing authority already says first-run `init` next step should likely open the workspace, while `regen` should likely review diff or run `doctor`; current output is looser than that intent.

## Problem Statement

Current write-flow output still contains low-value noise in three ways:

1. placeholder guidance appears as user-visible output (`No next step suggested`), which answers no user question;
2. framing information is repeated across run header, preflight lead-in, and success screen;
3. post-write guidance is not relevance-filtered, so `doctor` can be suggested by default even when the run was a normal successful `init` or a clean replay with no special validation need.

This weakens the product goal from spec 032: short, action-first output that teaches the project-file-first model without overwhelming the user.

## User Goals / Jobs To Be Done

- Understand what just changed without re-reading the same source/setup context.
- See one useful next action only when it actually helps.
- Avoid being pushed into extra commands after a normal successful setup.

## Success Signals

- Successful `init` and `regen` runs fit the current mental model with fewer repeated sections.
- Users never see `No next step suggested` as a rendered recommendation.
- `doctor` is suggested only when the current run leaves a meaningful validation need.

## Confidence

- Overall confidence: high
- Confidence notes: directly evidenced by live command output, current spec text, and current next-step/success rendering code.

## User Stories

**US-1** As a first-run user, I want `init` to end with only the actions I still need, so I am not told to run extra commands that do not help me continue.

**US-2** As a repeat user, I want `regen` to explain what changed without repeating already-shown source/config blocks.

**US-3** As a maintainer, I want shared next-step logic and legacy summary helpers to agree on when `doctor` is actually relevant.

## Goals

- Remove placeholder or null-value success content from normal CLI output.
- Make next-step guidance conditional on user value, not section template completeness.
- Reduce repeated framing in `init`/`regen` write flows without reopening command architecture.

## Non-Goals

- Redesign `list`, `explain`, `plan`, `hash`, `doctor`, `adopt`, or `migrate` layouts.
- Rewrite the guided question flow from spec 032.
- Change generation, replay, backup, or doctor remediation behavior.
- Replace the project-file-first mental model from ADR 001.

## Authority and References

This spec must align with:

- `docs/foundation.md`
- `docs/adr/adr001-project-file-first-replay-and-regeneration.md`
- `docs/specs/032-init-and-regen-guided-flows/spec.md`
- `docs/specs/034-doctor-diagnostics-and-remediation-ux/spec.md`

## Design

### Observed Behavior

- First-run `init` currently renders `Recommended next action: No next step suggested` before work, then prints a second `Next step` section with the same placeholder after success.
- Clean `regen` currently recommends `cs doctor` by default and repeats source/config context in both the top frame and an additional boxed preflight lead-in.
- Legacy summary utilities and tests still encode `doctor` as the regular post-`init` verification step.

### Likely Intent

The product wants a short, confidence-building flow where each line earns its place. Existing specs already favor one meaningful next action, concise success, and workflow-specific guidance rather than generic capability dumping.

### Product / Behavior

#### 1. Relevance-gated next steps for write flows

`init` and `regen` MUST render a `Next step` section only when there is a materially helpful follow-up action.

Rules:

- Placeholder text such as `No next step suggested` MUST NOT appear in human-readable framing or success output.
- A clean successful first-run `init` MUST omit next-step guidance entirely.
- `init` MAY render a follow-up action only when the run outcome itself creates a concrete manual step.
- `regen` SHOULD recommend `doctor` only when the replay outcome or repo state makes validation materially useful; otherwise clean steady-state replay should prefer diff review when output changed or omit `Next step` when it did not.

#### 2. No duplicate context between framing and preflight

`init` and `regen` MUST NOT restate the same mode/source/config facts in an extra preflight-introduction block when those facts are already present in the required framing screen.

Rules:

- The framing screen remains the primary place for run posture and source.
- Preflight may retain `Source` and `Intent` as part of its fixed section contract, but auxiliary headings or boxes that merely restate `Running in CLI mode`, `Running from Project Config`, or equivalent source/config summaries SHOULD be removed.
- Success output MUST stay outcome-focused and must not re-explain unchanged source authority.

#### 3. Shared next-step semantics stay aligned across surfaces

Any shared or fallback helper used for `init`/`regen` completion messaging MUST follow the same relevance rules as the main write flow.

Rules:

- Legacy summary helpers, tests, and docs MUST NOT continue teaching `doctor` as the default post-`init` step.
- If a command has no worthwhile follow-up action, the section is omitted rather than filled with null-state copy.
- Human-readable wording and test expectations must align with spec 032's project-file-first teaching.

### Technical Notes

- This is a product-scope clarification, not a command-boundary change.
- Existing shared renderers/semantics may be refined, but the work should stay within `init`/`regen` write-flow presentation plus any directly coupled next-step helper(s).
- No ADR change is needed unless implementation expands this into a cross-command next-step policy rewrite.

### Canonical Interaction Model

This spec narrows spec 032's templated framing and success contracts for `init` and `regen` only.

Rules:

- `Recommended next action` in the framing screen becomes conditional for `init`/`regen`; omit the row when no single materially helpful action exists.
- `Next step` in the success screen becomes conditional for `init`/`regen`; omit the section when no single materially helpful action exists.
- When either surface does render follow-up guidance, it MUST render exactly one concrete action and one short reason.
- `Manual review` remains the last section, but SHOULD also be omitted when empty rather than printing `none`.

### Interaction Rules

#### First-run `init`

- Clean first-run `init` MUST omit `Recommended next action` in framing.
- Clean first-run `init` MUST omit `Next step` in success.
- Clean first-run `init` MUST NOT suggest `doctor`, `regen`, editor-specific commands, or reopen/rebuild instructions by default.
- If a future `init` outcome introduces a real follow-up requirement, that action may appear, but only when it is caused by the run outcome itself.

Rationale: first-run `init` has already completed the meaningful CLI action. Environment-entry guidance is tool- and editor-dependent, so default advice is more likely to add noise than help.

#### Clean `regen`

- Clean `regen` MUST NOT default to `cs doctor`.
- Clean `regen` SHOULD show `Next step` only when generated output changed materially.
- When shown for a clean changed `regen`, the canonical action is `review generated diff`.
- Clean no-op `regen` MUST omit `Next step`.
- `doctor` remains valid only when the replay result, warnings, or repository state create an actual validation need.

Rationale: `regen` is a replay/update action, so post-run guidance should stay adjacent to what just changed rather than route users into diagnostics by habit.

### Writing Rules

- Prefer omission over filler.
- Prefer repository-state actions over generic capability reminders.
- Do not render placeholder text such as `No next step suggested` anywhere user-visible.
- Do not repeat run posture or source authority in extra boxed preflight intro blocks once framing has already taught it.
- Use outcome wording, not instruction-theater: e.g. `review generated diff` rather than `validate regenerated output` unless there is a real validation concern.
- Keep success copy action-first: changed/preserved facts first, optional follow-up second.

### Worked Examples

#### Example: first-run `init` with no special follow-up

```text
Mode: New setup
Source: CLI selection — flags resolved for this run
Shared project file: will create on write
Generated output: ./.devcontainer
Local-only config: Ignored by this run

Source
CLI selection — flags resolved for this run

...

Changed
- shared project file created
- generated output written

Preserved
- custom/ patches when present
- local-only config not used
```

Notes:

- no `Recommended next action` row
- no `Next step` section
- no `Manual review` section when empty

#### Example: clean `regen` with generated changes

```text
Mode: Replay shared setup
Source: shared project file — /tmp/.../.superposition.yml
Shared project file: .superposition.yml
Generated output: ./.devcontainer
Local-only config: Ignored by this run
Recommended next action: review generated diff

Source
shared project file — /tmp/.../.superposition.yml

...

Changed
- generated output written

Preserved
- custom/ patches when present
- local-only config not used

Next step
review generated diff
confirm regenerated files match the intended setup change
```

Notes:

- no extra boxed preflight intro duplicating mode/source/config
- no `cs doctor` recommendation on clean replay

### QA Scenario Scripts

1. Clean first-run `init`: verify framing omits `Recommended next action`, success omits `Next step`, and no placeholder copy appears.
2. Clean changed `regen`: verify framing may show `Recommended next action: review generated diff`, success shows `Next step` with the same action, and no `cs doctor` default appears.
3. Clean no-op `regen`: verify both framing and success omit next-step guidance entirely.
4. `init` or `regen` with warnings/manual follow-up: verify `doctor` or another follow-up appears only when directly justified by the run outcome.
5. `init` and `regen` preflight: verify no extra introductory box restates already-shown run posture or source/config facts.

## Constraints

- Preserve spec 032 framing and preflight authority unless this spec explicitly narrows it.
- Preserve ADR 001's project-file-first teaching.
- Avoid broad changes to non-write command surfaces.

## Risks

- Over-tightening could remove helpful onboarding guidance if `init` success becomes too sparse.
- Under-tightening could preserve the current pattern of mechanically rendering low-value sections.

## Acceptance Criteria

- [x] Successful human-readable `init` and `regen` flows never render `No next step suggested` in framing, preflight, or success output.
- [x] Clean first-run `init` omits next-step guidance entirely: no `Recommended next action` row in framing, no `Next step` section in success, and no default suggestion for `cs doctor`, `regen`, reopen/rebuild, or editor-specific follow-up.
- [x] Clean changed `regen` may show one next-step action only, and when it does the canonical action is `review generated diff` with one short reason.
- [x] Clean no-op `regen` omits next-step guidance entirely in both framing and success.
- [x] `doctor` appears as post-run guidance for `init` or `regen` only when the specific run outcome creates a meaningful validation or remediation need.
- [x] `init`/`regen` write flows do not include extra boxed or titled preflight lead-in blocks that only restate already-shown mode/source/config information.
- [x] Empty `Manual review` sections are omitted rather than rendered with filler or `none` text.
- [x] Shared next-step helpers, summary helpers, related tests, and directly coupled docs/help text stay aligned with these rules and no longer encode `doctor` as the regular default post-`init` step.
- [x] Existing project-file-first framing, mandatory preflight section order, and success-section intent from spec 032 remain intact aside from the output-tightening changes above.
- [x] Automated coverage verifies at minimum: clean first-run `init`, clean changed `regen`, clean no-op `regen`, and a warning/manual-follow-up path where `doctor` remains justified.
- [x] Documentation and workflow artifacts required by the implemented command-surface change are updated in the same delivery.

## Out of Scope

- Rewording all CLI copy for tone consistency.
- Reclassifying `doctor` recommendations across read-only commands.
- Changing JSON output shape unless needed to preserve text/JSON semantic parity for omitted next-step state.

## Assumptions

- The user's example (`cs doctor` after `cs init` feels unnecessary) represents the main product concern, not a request to remove all post-write guidance.

## Open Questions

- None.

## Definition of Done

> Filled in progressively by each role. QA sets `Status: Final` only after verifying all gates.
> Full standards in `docs/definition-of-done.md`.

### Code

- [ ] No lint errors
- [ ] No type errors
- [ ] No debug or uncommitted temporary code
- [ ] Follows project conventions

### Tests

- [ ] Unit tests cover new pure logic
- [ ] Integration tests cover system boundaries
- [ ] All tests pass
- [ ] No unjustified skipped tests
- [ ] Failure and edge cases covered

### Documentation

- [ ] Public interfaces documented
- [ ] All new documentation in Markdown
- [ ] All diagrams in Mermaid
- [ ] README updated if behavior or setup changed
- [ ] Architecture docs updated if ownership or boundaries changed

### Changelog

- [ ] `CHANGELOG.md` updated under `[Unreleased]` for user-visible changes

### Workflow artifacts

- [ ] Acceptance criteria checked off (met only — unmet left unchecked with explanation)
- [ ] `## Implementation Notes` written
- [ ] Spec status and index synchronized
- [ ] QA feedback rows marked `Done` where applicable

### Architecture

- [ ] No ADR or foundation rules silently violated
- [ ] ADR created or amended if a standing decision was made or changed

### QA verification

- [ ] All above gates verified independently
- [ ] Acceptance criteria classified: MET / CLAIMED BUT FAILED / OPEN / UNCHECKED
- [ ] No regressions introduced
- [ ] Spec set to `Final`

## Implementation Notes

Implemented output tightening for `init`/`regen` write flows and directly coupled helpers.

Changes shipped:

- `tool/cli/run.ts` now omits `Recommended next action` from `init`/`regen` framing, removes duplicate preflight intro boxes, omits empty `Manual review`, and renders success `Next step` only when a follow-up action is materially useful
- clean changed `regen` now points to `review generated diff`; clean no-op `regen` omits follow-up guidance; warning-bearing `init`/`regen` runs keep `cs doctor` only when warnings justify it
- output-change detection now ignores compatibility-manifest timestamp churn so clean no-op `regen` does not surface false-positive follow-up guidance
- `tool/ux/semantics/next-step.ts` and `tool/utils/summary.ts` now align helper defaults with the tightened UX contract and no longer teach `doctor` as the default post-`init` action
- added focused coverage in `tool/__tests__/cli-write-output.test.ts` plus updated summary-helper expectations in `tool/__tests__/summary.test.ts`

Validation run:

- `npm test -- --run tool/__tests__/cli-write-output.test.ts tool/__tests__/summary.test.ts`
- `npm run lint`
- `task validate`

## Implementation-Ready PM Brief

### Scope summary

Tighten only `init`/`regen` output relevance for successful write flows and directly coupled helpers. Implementation should remove redundant framing, suppress low-value next-step guidance, omit empty `Manual review`, and keep tests/docs/helpers aligned with the approved wording rules.

### Required behavior

- Clean first-run `init`: omit next-step guidance everywhere.
- Clean changed `regen`: prefer `review generated diff` as the single follow-up action.
- Clean no-op `regen`: omit next-step guidance everywhere.
- Remove duplicate boxed preflight intros that merely restate framing.
- Omit empty `Manual review` sections.
- Keep any remaining `doctor` recommendation outcome-driven rather than default-driven.

### Likely implementation surfaces

- `tool/cli/run.ts`
- `tool/ux/semantics/next-step.ts`
- `tool/utils/summary.ts`
- `tool/__tests__/**` covering write-flow output and summary helpers
- Any directly coupled help/docs text that still teaches the old default next steps

### Non-goals for implementation

- No redesign of other commands or broader CLI tone.
- No change to write semantics, generation behavior, backup behavior, or project-file authority.
- No cross-command next-step policy rewrite beyond surfaces directly coupled to `init`/`regen`.

### QA intent

QA should verify outcome relevance, not just copy changes: placeholder guidance removed, clean first-run `init` stays quiet after success, clean changed `regen` points to diff review, clean no-op `regen` stays quiet, empty `Manual review` stays omitted, and `doctor` still appears when warnings or remediation needs justify it.

## Routing Decision

**PM → Developer**

Reason: product scope, UX decisions, and architecture boundaries are now sufficiently locked. This is an implementation-slice tightening of existing command presentation, not a new cross-cutting architecture problem.
