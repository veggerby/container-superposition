---
spec: '048-cross-command-cli-guidance-relevance'
title: 'Cross-Command CLI Guidance Relevance and Redundancy Reduction'
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
    - 'docs/specs/035-adopt-and-migrate-conversion-workflows/spec.md'
    - 'docs/specs/047-cli-output-relevance-and-noise-reduction/spec.md'
normative_references:
    - 'AGENTS.md'
    - 'docs/definition-of-done.md'
---

# Cross-Command CLI Guidance Relevance and Redundancy Reduction

**Spec**: `048-cross-command-cli-guidance-relevance`
**Status**: Final
**Created**: 2026-07-17
**Priority**: P1
**Product Approval**: approved
**Architecture Review**: not-needed
**UX Review**: approved

## Description

Tighten user-facing command output across the broader CLI so follow-up guidance is relevant, non-redundant, and easy to scan. Extend the noise-reduction intent from `init`/`regen` into other command surfaces that currently repeat the same action under multiple headings, render placeholder guidance, or recommend generic next commands that add little value.

## Evidence

- `tool/ux/semantics/next-step.ts` — shared next-step logic still returns placeholder or generic commands on several surfaces, including `doctor` (`No next step suggested`) and templated `cs plan --stack <plain|compose> --overlays <ids>` for `explain`/`hash`.
- `tool/commands/explain.ts` — current text output renders `Preview this change`, `Try this next`, and a footer `Next step`, creating three forward-guidance surfaces in one response.
- Live output: `npm run init -- explain postgres` — currently shows `Preview this change`, `Try this next`, and `Next step` in the same command output.
- `tool/commands/list.ts` and live output from `npm run init -- list` — current output already includes `How to inspect or preview next`, then adds a footer `Next step` with the same workflow direction.
- `tool/commands/migrate.ts` — current output renders `Recommended next action: cs regen` in the frame, a `Next checklist` led by `run cs regen`, and a footer `Next step`, repeating the same action across three locations.
- `tool/commands/doctor/presentation.ts` — current frame and footer both fall back to `No next step suggested` for healthy runs, preserving placeholder guidance outside the `init`/`regen` scope fixed by spec `047`.
- `tool/__tests__/ux-renderers.test.ts` — current coverage explicitly enforces `Try this next` in `explain`, a single footer `Next step` for read-only commands, and migrate framing/checklist conventions, so implementation will require spec-backed test updates rather than incidental copy edits.
- `docs/specs/033-cli-discovery-preview-and-fingerprint/spec.md` — current authority requires every read-only human output to end with exactly one `Next step` and explicitly allows `No next step suggested`, which conflicts with the broader relevance/noise-reduction direction.
- `docs/specs/035-adopt-and-migrate-conversion-workflows/spec.md` and `docs/specs/034-doctor-diagnostics-and-remediation-ux/spec.md` — current command-specific specs also hard-code header/footer guidance structures that can create low-value repetition.
- `docs/discovery-commands.md`, `docs/hash.md`, and `docs/adopt.md` — command docs still describe older or more command-centric outputs, so implementation will need targeted doc alignment where command contracts change.

## Problem Statement

The repository now has a split UX policy:

- `init`/`regen` were tightened under spec `047` to suppress filler and default-follow-up noise.
- other commands still often render mechanical guidance because older specs and tests require a footer `Next step`, command-local sections like `Try this next`, or frame-level `Recommended next action` regardless of whether those layers add distinct value.

This produces three user-facing problems:

1. **repetition** — the same action appears in multiple sections (`explain`, `list`, `migrate`);
2. **low-value guidance** — healthy or straightforward flows still render placeholders or generic capability reminders (`doctor`, templated `plan` suggestions);
3. **contract drift** — cross-command output policy is inconsistent because older specs normalize filler that newer specs already reject.

## User Goals / Jobs To Be Done

- Understand the one most relevant next action, only when one is actually helpful.
- Avoid scanning repeated action advice that restates the same command in frame, body, and footer.
- Trust that when the CLI suggests a follow-up command, it is concrete and justified by the current state.

## Success Signals

- Users no longer see placeholder next-step copy on targeted human-readable command surfaces.
- Commands that already contain actionable preview/checklist sections no longer restate the same follow-up in extra footer/header sections.
- Read-only and diagnostic commands teach one consistent relevance policy instead of mixing old and new UX rules.

## Confidence

- Overall confidence: high
- Confidence notes: directly evidenced by current source, tests, live output for `list`/`explain`/`hash`, and existing specs that currently encode the redundancy.

## User Stories

**US-1** As a discovery user, I want `list` and `explain` to end with one clear action path, not multiple overlapping prompts.

**US-2** As a repo maintainer, I want healthy or straightforward commands to stay quiet when no extra action is needed.

**US-3** As a migration user, I want ordered checklist guidance without also being told the same thing in surrounding frame/footer chrome.

## Goals

- Define one cross-command policy for when to show follow-up guidance and when to omit it.
- Remove placeholder and duplicate guidance from targeted command outputs.
- Keep retained follow-up guidance concrete, state-aware, and easy to comprehend.
- Preserve each command's core decision-support contract while reducing low-value output.

## Non-Goals

- Renaming commands or changing command availability.
- Reworking generation, replay, remediation, adoption, or migration mechanics.
- Broad tone-polish across every line of CLI copy.
- Reopening ADR `001` or canonical project-file authority.

## Authority and References

This spec must align with:

- `docs/foundation.md`
- `docs/adr/adr001-project-file-first-replay-and-regeneration.md`
- `docs/specs/032-init-and-regen-guided-flows/spec.md`
- `docs/specs/033-cli-discovery-preview-and-fingerprint/spec.md`
- `docs/specs/034-doctor-diagnostics-and-remediation-ux/spec.md`
- `docs/specs/035-adopt-and-migrate-conversion-workflows/spec.md`
- `docs/specs/047-cli-output-relevance-and-noise-reduction/spec.md`

## Design

### Observed Behavior

- `explain` currently stacks three forward-guidance layers: preview command, `Try this next`, and footer `Next step`.
- `list` currently offers workflow teaching in-body and then repeats the inspect step in the footer.
- `doctor` still relies on placeholder recommendation text for healthy states.
- `migrate` repeats `cs regen` in frame, checklist, and footer.
- `plan` and `hash` are less visibly broken, but they still inherit a shared footer policy that prefers always-on next-step rendering over relevance gating.
- `init` and `regen` already have a newer relevance model from spec `047`; the broader CLI does not.

### Likely Intent

The product wants commands to teach safe workflow progression without overwhelming users. The current redundancy mostly comes from older layout contracts and shared helpers, not from a genuine need to show the same advice multiple times.

### Product / Behavior

## Canonical Interaction Model

### Cross-command guidance principle

Human-readable output on targeted commands MUST show follow-up guidance only when it adds unique decision value for that command state.

Rules:

- Placeholder copy such as `No next step suggested` MUST NOT appear in human-readable output.
- If a command has no materially useful follow-up action, the command omits that guidance layer instead of rendering filler.
- If a command already includes an explicit actionable section or ordered checklist, surrounding frame/footer guidance MUST NOT restate the same action unless it adds a distinct reason or state change.
- Retained next-step guidance MUST be concrete for the current invocation state whenever the command can derive that concrete action.
- Guidance placement is part of the UX contract; developers MUST NOT choose frame vs body vs footer ad hoc.

### Guidance surface roles

Use these surfaces consistently:

- **Frame guidance** = one-line run posture or recommended route before body content. Use only when the command needs to set user expectation before they scan details.
- **Body guidance** = actionable teaching embedded in a section whose purpose is already about decision-making, preview, or ordered follow-through.
- **Footer guidance** = one closing `Next step` block for commands whose body does not already carry the full action contract.

Rules:

- A single concrete action SHOULD appear in one primary surface only.
- Frame guidance is allowed only for commands where route selection matters before reading body detail (`doctor`, `migrate`, guardrail `init`/`regen`).
- Body guidance is preferred when the command already contains a decision or checklist section that naturally owns the action.
- Footer guidance is preferred for summary-first read-only outputs that otherwise end without an explicit route.
- When body guidance fully satisfies the next-action need, footer guidance MUST be omitted.
- When frame guidance and body guidance both exist, they MUST serve different purposes; they may not repeat the same command.

## Page Contract

### Command-family placement contract

#### 1. Discovery index: `list`

Primary guidance location: **body only**.

Rules:

- `How to inspect or preview next` remains the canonical workflow-teaching section.
- Footer `Next step` MUST be omitted in default and filtered list outputs.
- Body guidance should teach the lane (`explain` for fit, `plan` for preview) rather than recommend a single repeated footer command.

#### 2. Inspection detail: `explain`

Primary guidance location: **body only**.

Rules:

- `Preview this change` is the canonical action section because it already carries the exact preview command and state framing.
- `Try this next` MUST be removed for preview-oriented follow-up if it repeats the same action as `Preview this change`.
- Footer `Next step` MUST be omitted when `Preview this change` already provides the preview route.
- If additional body guidance remains after `Files, services, and ports`, it must add non-duplicative value such as choice refinement or caution, not restate `cs plan`.

#### 3. Preview / comparison summaries: `plan`, `hash`

Primary guidance location: **footer only when useful**.

Rules:

- `plan` MAY keep one footer `Next step` because it is the decision gate before write.
- `hash` MAY keep one footer `Next step` only when the command can derive a concrete comparison or preview follow-up from current state.
- `plan` and `hash` MUST NOT introduce extra body or frame guidance blocks for the same follow-up action.
- If the best follow-up would be generic or templated rather than state-aware, the footer is omitted.

#### 4. Diagnostic triage: `doctor`

Primary guidance location: **frame only for diagnosis mode; footer only for post-fix outcomes when still useful**.

Rules:

- `Recommended next action` may appear in the frame for actionable diagnosis states because users need triage direction before scanning buckets.
- Healthy diagnosis runs MUST omit `Recommended next action` entirely.
- Diagnose-only outputs SHOULD NOT also end with a footer `Next step` that repeats the same remediation route.
- Post-fix outcome screens MAY keep one footer `Next step` when unresolved work remains after fixes; otherwise omit it.

#### 5. Bridge conversion: `migrate`

Primary guidance location: **checklist/body only**.

Rules:

- The success `Next checklist` is the canonical follow-through surface.
- Frame `Recommended next action` MUST be omitted when it would merely pre-announce the same `cs regen` step later shown in the checklist.
- Footer `Next step` MUST be omitted on migrate success when the checklist already leads with the same action.
- Frame copy should continue teaching lane fit and generated-output status, but not duplicate replay instructions.

#### 6. `init` / `regen` guardrail

This spec does not reopen `init`/`regen`, but implementation MUST preserve spec `047` behavior and reuse the same omission-over-filler principle when shared helpers are refactored.

## Interaction Rules

### Section and order rules

- Guidance must appear after the user has enough context to understand it, but before any purely decorative closure.
- Commands with canonical body guidance (`list`, `explain`, `migrate`) should place it in the last purposeful body section.
- Commands with canonical footer guidance (`plan`, `hash`) should keep exactly one `Next step` at the end.
- Commands with triage framing (`doctor`) should place actionable guidance in the frame before counts and buckets.

### Writing rules

- Prefer exact commands derived from current invocation state.
- Prefer outcome-specific phrasing such as `preview this change`, `review generated diff`, or `run cs regen` over generic capability reminders.
- Never emit abstract signatures like `cs plan --stack <plain|compose> --overlays <ids>` when the concrete overlay, preset, or stack is already known.
- Teach workflow progression in user terms (`inspect`, `preview`, `replay`, `compare`, `fix`) before command taxonomy.
- Do not use paired headings that imply different actions when both bodies route to the same command.

## Worked Examples

### `list`

```text
How to inspect or preview next
Use `cs explain postgres` for fit, differences, and watch-outs.
Use `cs plan --stack compose --overlays postgres` before any write.
```

Notes: no footer `Next step`.

### `explain`

```text
Preview this change
- run `cs plan --stack compose --overlays postgres`
- preview whether this would be a first write, update, or no-op
```

Notes: no separate `Try this next`; no footer `Next step`.

### `plan`

```text
Next step
cs regen
replay shared project file into generated output
```

Notes: keep only when current state justifies it.

### `hash`

```text
Next step
cs plan --stack compose --overlays grafana,prometheus
preview the normalized intent you want to compare against
```

Notes: omit entirely when the command cannot derive a concrete comparison route.

### Healthy `doctor`

```text
Mode: Project diagnosis
Verdict: Healthy
Scope: selected overlays for current project
Source inspected: .devcontainer
What needs attention: nothing blocking; checks completed cleanly
```

Notes: no `Recommended next action`; no filler footer.

### `migrate`

```text
Next checklist
1. run cs regen
2. inspect regenerated output
3. commit canonical shared project file once replay looks right
```

Notes: no frame `Recommended next action`; no footer `Next step`.

### Command Scope Decision

#### In scope

- `init` and `regen` for regression prevention only
- `list`
- `explain`
- `plan`
- `hash`
- `doctor`
- `migrate`
- shared helpers/renderers/spec/test/docs updates directly coupled to those surfaces

#### Out of scope for this slice

- `adopt`

Rationale: `adopt` also has multiple guidance surfaces, but its ordered conversion checklist is more tightly bound to trust/ownership teaching and is not directly evidenced here as low-value or misleading in the same way as `explain`, `doctor`, or `migrate`. Product should reassess `adopt` only if the shared-helper refactor reveals a clean follow-on tightening or if new user evidence shows its checklist/footer pattern is similarly noisy.

### Technical Notes

- This is a product-contract change, not an architecture change.
- Likely implementation will touch shared next-step semantics plus command-local presentation logic and tests.
- No ADR work is needed unless implementation proposes a broader CLI presentation framework rewrite.

## Constraints

- Preserve ADR `001`'s project-file-first teaching.
- Preserve spec `047` outcome relevance rules for `init`/`regen`.
- Do not remove command-specific sections that carry unique information merely to reduce line count.
- Keep JSON output semantically aligned when human-readable guidance is omitted.

## Preferences / Tradeoffs

- Prefer omission over filler.
- Prefer one high-value action over multiple mechanically rendered cues.
- Prefer command-state-specific commands over generic placeholder signatures.
- Accept small command-to-command variation in layout if it prevents redundant guidance.

## Risks

- Over-normalizing could remove useful workflow teaching from first-time discovery commands.
- Under-scoping to one command would repeat the mistake that left the broader CLI inconsistent after spec `047`.
- Shared-helper changes could unintentionally regress `init`/`regen` if not covered explicitly.

## Implementation / Intent Mismatches

- Spec `033` currently requires a universal footer `Next step` and even `No next step suggested`, which now conflicts with the broader relevance direction already accepted for `init`/`regen`.
- Spec `035` currently tolerates multi-layer `regen` repetition in `migrate`, even though this is now directly counter to the user's request.
- Spec `034` still permits placeholder doctor guidance through shared semantics.

## Acceptance Criteria

- [x] A documented cross-command guidance policy exists for `list`, `explain`, `plan`, `hash`, `doctor`, and `migrate`, with `init`/`regen` explicitly preserved under spec `047`.
- [x] Targeted human-readable outputs never render placeholder next-step text such as `No next step suggested`.
- [x] No targeted command renders the same follow-up action in multiple guidance layers unless each layer carries distinct, non-overlapping user value.
- [x] `list` uses body-only workflow teaching and omits footer `Next step` in both default and filtered outputs.
- [x] `explain` uses one body-owned preview route (`Preview this change`) and omits redundant `Try this next` / footer `Next step` guidance for the same action.
- [x] `plan` and `hash` use footer-only follow-up guidance when it is concrete and state-aware for the current invocation; generic placeholder signatures are removed where a concrete action can be derived or omitted where no action adds value.
- [x] Healthy `doctor` output omits placeholder recommendation/footer guidance, while actionable doctor output uses one relevant remediation route without duplicate frame/footer repetition.
- [x] `migrate` keeps its ordered post-write checklist as the canonical follow-through surface and does not repeat the same `cs regen` instruction in surrounding frame/footer guidance.
- [x] `adopt` is explicitly documented as out of scope for this slice, with rationale captured in spec text and PM handoff.
- [x] JSON output remains semantically aligned with human-readable guidance presence/absence, using null/omitted state rather than placeholder strings where appropriate.
- [x] Automated coverage is updated for every changed command contract, including at minimum `list`, `explain`, `hash`, `doctor`, `migrate`, and regression coverage for `init`/`regen` relevance rules.
- [x] Help text and targeted docs are updated anywhere command-surface behavior or workflow teaching changes.

## Out of Scope

- Revisiting `adopt` checklist UX in this delivery.
- Full documentation modernization outside files directly affected by changed command contracts.
- Any changes to generated output, remediation logic, or overlay semantics.

## Assumptions

- The user's examples represent a general CLI guidance policy problem, not an isolated `explain` wording complaint.
- Broad request coverage requires touching multiple existing specs/contracts rather than extending spec `047` only.

## Open Questions

None.

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

Implemented cross-command guidance tightening for `list`, `explain`, `hash`, `doctor`, and `migrate` while preserving spec `047` behavior for `init`/`regen` and leaving `adopt` unchanged.

Changes shipped:

- `tool/commands/list.ts` now keeps workflow teaching in-body only and omits the duplicate footer `Next step`
- `tool/commands/explain.ts` now lets `Preview this change` own the preview action and removes redundant `Try this next` plus footer guidance
- `tool/commands/hash.ts` now derives a concrete `cs plan ...` or `cs plan --from-manifest ...` footer only when the invocation can map to a real preview command; otherwise it omits the footer
- `tool/commands/doctor/presentation.ts` now suppresses healthy-run placeholder guidance and avoids repeating the same remediation route in both frame and footer
- `tool/commands/migrate.ts` now keeps `cs regen` in the ordered checklist only, removing repeated frame/footer guidance
- `tool/ux/semantics/next-step.ts` and `tool/ux/renderers/common.ts` now use omission/null semantics instead of placeholder `No next step suggested` text for targeted read surfaces
- updated targeted tests in `tool/__tests__/ux-renderers.test.ts`, `tool/__tests__/commands.test.ts`, and `tool/__tests__/qa-blockers.test.ts`
- updated targeted docs in `docs/discovery-commands.md` and `docs/hash.md`
- updated `CHANGELOG.md` under `Unreleased`

Validation run:

- `npm test -- --run tool/__tests__/ux-renderers.test.ts tool/__tests__/commands.test.ts tool/__tests__/qa-blockers.test.ts tool/__tests__/cli-write-output.test.ts`
- `npm run init -- doctor`
- `task validate`

## Implementation-Ready PM Brief

### Scope summary

Tighten guidance relevance only for these command surfaces and directly coupled shared renderers/docs/tests:

- `list`
- `explain`
- `plan`
- `hash`
- `doctor`
- `migrate`
- regression protection for `init` / `regen`

### Locked UX contract

- `list`: body-only guidance; no footer `Next step`
- `explain`: `Preview this change` owns the action; no redundant `Try this next` or footer
- `plan` / `hash`: footer-only guidance when concrete and state-aware; otherwise omit
- `doctor`: guidance appears only for actionable diagnosis; healthy runs omit it
- `migrate`: checklist owns follow-through; no repeated frame/footer `cs regen`
- `init` / `regen`: preserve spec `047` behavior unchanged

### Acceptance focus for implementation

Implementation must:

- remove placeholder guidance from human-readable targeted surfaces
- avoid repeating the same follow-up command across frame/body/footer
- preserve project-file-first teaching without adding generic command taxonomy reminders
- keep JSON/text semantics aligned when guidance is omitted
- update targeted tests and directly affected docs/spec references in the same delivery

### Non-goals for implementation

- no `adopt` UX changes in this slice
- no command renames or workflow-mechanics changes
- no CLI-wide tone rewrite beyond guidance relevance
- no architecture or ADR expansion unless implementation proposes a new presentation framework

### Validation intent

At minimum, implementation should carry automated coverage for `list`, `explain`, `hash`, `doctor`, `migrate`, plus regression coverage proving `init` / `regen` still honor spec `047`.

## Routing Decision

**PM → Developer**

Reason: product scope and UX decisions are now locked, acceptance criteria are implementation-ready, and the work stays within existing command-presentation ownership rather than requiring architectural redesign.
