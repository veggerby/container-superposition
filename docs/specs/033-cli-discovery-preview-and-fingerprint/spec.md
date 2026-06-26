# Feature Specification: CLI Discovery, Preview, and Fingerprint Commands

**Spec ID**: `033-cli-discovery-preview-and-fingerprint`
**Taxonomy**: `CLI-UX`
**Created**: 2026-06-24
**Author**: PM Agent
**Status**: Implemented
**Input**: Second-pass UX/design rewrite for `list`, `explain`, `plan`, and `hash` so read-only commands answer source, current setup, planned change, risk, and next action faster than current first-pass implementation.

---

## Request Classification

UX-forward rewrite. Not reverse-spec. Existing command set stays. Human-readable output, wording, section order, and decision framing may change materially where current first-pass implementation still feels internal, metadata-led, or overly technical.

## Product Outcome

Turn `list`, `explain`, `plan`, and `hash` into one decision ladder with one mental model:

1. discover likely fit
2. inspect why it fits
3. preview what would change
4. compare whether two intents are semantically same

Success signals:

- first-run users understand where truth comes from without reading docs first
- preview screens answer `what am I changing?` before low-level detail
- fingerprinting teaches comparison meaning without requiring internal product vocabulary
- every command teaches one safe next move, not generic capability dump

## Improvement Target Over Current Product

This is deliberate uplift over current first-pass implementation and over prior spec text.

Target outcomes:

- replace command-centric framing with task-centric framing
- replace metadata-first inspection with `fit → change → risk → next step`
- replace technical `fingerprint` emphasis with comparison-first teaching
- replace preview summaries that focus on resolved internals before current-vs-target story
- replace weak drift/confidence signaling with first-screen `Current setup`, `Planned changes`, and `Watch-outs`

## Current UX To Intentionally Supersede

1. Shared frame exists, but command bodies still feel like separate products instead of one ladder.
2. `list` recommends starts, but recommendation copy is still thin and not obviously tied to next decision.
3. `explain` uses fixed sections, but `Best for` and `Adds` remain too close to catalog metadata.
4. `plan` is stronger than before, but first screen still under-emphasizes current setup snapshot, drift/risk, and whether user is changing intent or only reconciling output.
5. `hash` still centers `Fingerprint` as term before teaching equality semantics in user language.
6. Current help/hints teach commands, but still not strong enough on `discover → inspect → preview → write/compare` workflow.

## User Questions Commands Must Answer Fast

Every human-readable read-only command MUST answer relevant subset of these questions within first screen:

1. Where did this intent come from?
2. What setup do I have now?
3. What would change if I proceed?
4. What risk, drift, or uncertainty should I notice?
5. What exact command should I run next?

## Scope

### In scope

- `list`, `explain`, `plan`, `plan --diff`, `hash`
- shared source/status framing and next-step teaching
- terminology, section ordering, comparison semantics, and preview summaries
- human output and additive JSON fields needed to keep semantic parity

### Out of scope

- write-path behavior in `init`, `regen`, `doctor`, `adopt`, or `migrate`
- removing `hash` term from CLI surface entirely
- changing command names or adding new top-level commands

## Non-Goals

- Preserve current first-pass layout because tests pass
- Preserve internal terms as default teaching language when simpler wording exists
- Collapse useful detail into hidden expert-only output

## Design Principles

1. **Task before taxonomy**.
2. **Current vs target before internals**.
3. **Comparison meaning before checksum vocabulary**.
4. **Risk visible before scroll**.
5. **One mental model across commands**.
6. **JSON stays scriptable; human output stays decision-led**.

## Canonical Interaction Model

### Decision ladder

- `list` = where should I start?
- `explain` = why would I pick this?
- `plan` = what changes if I do?
- `hash` = are these two intents effectively same?

### Shared first-screen contract

All human-readable outputs MUST begin with compact frame in fixed order:

1. `Mode`
2. `Source`
3. `Current setup`
4. `What this helps you decide`

Rules:

- `Current setup` may say `none yet`, `project file present`, `legacy manifest only`, `generated output present`, or equivalent compact summary
- no command may mention detailed file lists before this frame
- JSON output excludes frame but includes semantically equivalent fields

### Shared final-step contract

All human-readable outputs MUST end with exactly one `Next step` section containing:

- one recommended command
- one-sentence reason tied to current state

If no safe next action exists, output MUST say `No next step suggested` and explain why.

## Command Contracts

### `list`

#### Purpose

Help user choose lane fast, not browse registry mechanically.

#### Default layout

Human-readable `list` MUST render blocks in this order:

1. `Recommended starts`
2. `Common goals`
3. `Browse all overlays`
4. `How to inspect or preview next`

Rules:

- `Recommended starts` shows at most 5 rows
- each recommendation row includes `Best for`, `Includes`, and `Why start here`
- `Common goals` maps user jobs to one or more preset/overlay suggestions, not catalog categories only
- `Browse all overlays` still groups by live categories, including `messaging`
- each overlay row shows id, plain-language purpose, and fit tags if available

#### Filtered layout

Filtered `list` MUST render:

1. `Filter summary`
2. `Best matches`
3. `How to widen or inspect next`

Rules:

- if zero results, show `No matches` plus at least three recovery suggestions
- filtered mode should prefer short cards/rows over raw pipe table feel

### `explain <id>`

#### Purpose

Answer `Why this?`, `What would it add?`, `What should I watch out for?`, `How do I preview it?`

#### Layout

Human-readable `explain` MUST use exact section order:

1. `Best for`
2. `Why pick this over nearby options`
3. `What it adds`
4. `What to watch out for`
5. `Depends on`
6. `Conflicts with`
7. `Preview this change`
8. `Files, services, and ports`
9. `Try this next`

Rules:

- `Best for` uses job language
- `Why pick this over nearby options` highlights distinguishing value, not only feature list
- `What to watch out for` surfaces port conflicts, stack restrictions, sidecars, or setup expectations in plain language
- `Preview this change` includes exact recommended `cs plan ...` command and states whether preview likely means first write, update, or no-op
- empty sections render explicit `none`

### `plan`

#### Purpose

Become default trust gate before any write.

#### Default layout

Human-readable `plan` MUST render exact section order:

1. `Resolved intent`
2. `Current setup`
3. `Planned changes`
4. `Watch-outs`
5. `Why this plan looks this way`
6. `Detailed file impact`
7. `Next step`

Rules:

- `Current setup` summarizes source-of-truth status, generated-output status, and whether drift exists
- `Planned changes` focuses on add/remove/update/no-op story before file lists
- `Watch-outs` calls out auto-added overlays, conflicts skipped, stale-file cleanup, and authority mismatches
- `Detailed file impact` remains lower priority and may be long
- first screen must let user tell difference between `changing intent`, `replaying canonical intent`, and `cleaning drift`

#### `plan --diff`

`plan --diff` MUST keep same top summary, then show headline state in exact set:

- `First write`
- `Change intent and regenerate`
- `Replay canonical intent`
- `Cleanup stale generated files`
- `No material change`

Rules:

- headline appears before any diff text
- `Replay canonical intent` used when source intent unchanged but generated output drifted
- summary must remain readable within first screen even for large diffs

### `hash`

#### Purpose

Teach semantic comparison, not checksum jargon.

#### Layout

Human-readable `hash` MUST use exact section order:

1. `Comparison summary`
2. `Fingerprint`
3. `Computed from`
4. `Normalized dependencies`
5. `What equal values mean`
6. `How to compare`
7. optional `Write location`
8. `Next step`

Rules:

- `Comparison summary` comes before raw hash value and states whether command is useful for replay checking, CI equivalence, or audit logging
- `Fingerprint` may remain term of record, but `Comparison summary` and `What equal values mean` must carry primary teaching burden
- if comparing one source only, output still explains what future comparison would prove
- if writing file, output says exact path and whether contents changed

## Interaction Rules

### Terminology rules

Prefer:

- `Current setup`
- `Planned changes`
- `Watch-outs`
- `Comparison summary`
- `shared project file`
- `generated output`
- `legacy manifest`

Avoid as first-screen lead terms:

- `fingerprint` without comparison context
- `manifest` as default steady-state artifact when project file exists
- low-level metadata labels without user consequence

### Confidence and drift rules

- any command that detects source disagreement or generated-output drift must say so in first screen or first section
- drift language must distinguish `intent drift` from `generated output drift`
- auto-added dependencies and skipped conflicts belong under `Watch-outs`, not hidden in verbose-only blocks

### Empty and error states

- `list` empty filter → recovery suggestions plus suggestion to inspect recommended starts
- `explain` unknown id → `Not found`, nearest likely matches when available, and `cs list` guidance
- `plan` missing usable source → exact missing-input explanation plus route to `init` or explicit `--overlays`
- `hash` missing source → exact valid invocation patterns

## Worked Examples

### First-time discovery

- `list` starts with preset-led recommendations and common goals
- `explain` clarifies why one option fits and what to watch out for
- `plan` shows `Current setup: none yet` and `Planned changes`
- next step routes to `init` only after preview confidence established

### Existing repo change review

- `plan` starts with `Current setup: project file present, generated output drifted`
- `Planned changes` says whether repo intent changes or only replay/cleanup occurs
- `Watch-outs` names auto-added dependencies and stale cleanup

### CI equivalence check

- `hash` opens with `Comparison summary`
- output explains equal hash means same normalized overlay intent, even if file ordering/comments differ

## QA Scenario Scripts

1. Default `list`: verify `Recommended starts`, `Common goals`, grouped overlay browsing, and next action teaching.
2. Filtered `list` with zero results: verify recovery suggestions and widening guidance.
3. `explain` overlay and preset: verify fixed section order, distinguishing-value copy, and watch-out coverage.
4. `plan` from project file with drift: verify `Current setup`, `Planned changes`, and `Watch-outs` appear before detailed file impact.
5. `plan --diff`: verify one headline state appears before unified diff and can distinguish replay vs intent change.
6. `hash --write`: verify `Comparison summary`, equality semantics, normalized dependency reporting, and write-path reporting.

## Acceptance Criteria

| #     | Criterion                                                                                                                                                                                                                                                                                  |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1  | Every human-readable `list`/`explain`/`plan`/`hash` output begins with frame rows in exact order `Mode`, `Source`, `Current setup`, `What this helps you decide`; JSON output excludes frame but includes semantically equivalent state.                                                   |
| AC-2  | Default `list` renders exact top-level blocks `Recommended starts`, `Common goals`, `Browse all overlays`, and `How to inspect or preview next`, with no more than 5 recommended starts and live category coverage including `messaging`.                                                  |
| AC-3  | Filtered `list` renders `Filter summary`, `Best matches`, and `How to widen or inspect next`; zero-result output includes at least three concrete recovery suggestions.                                                                                                                    |
| AC-4  | `explain <id>` renders exact section order `Best for`, `Why pick this over nearby options`, `What it adds`, `What to watch out for`, `Depends on`, `Conflicts with`, `Preview this change`, `Files, services, and ports`, `Try this next`, with explicit `none` states for empty sections. |
| AC-5  | Human-readable `plan` renders exact section order `Resolved intent`, `Current setup`, `Planned changes`, `Watch-outs`, `Why this plan looks this way`, `Detailed file impact`, `Next step`, and first screen distinguishes intent change vs replay vs cleanup.                             |
| AC-6  | `plan --diff` repeats top summary and shows exactly one headline state from `First write`, `Change intent and regenerate`, `Replay canonical intent`, `Cleanup stale generated files`, `No material change` before any unified diff text.                                                  |
| AC-7  | Human-readable `hash` renders exact section order `Comparison summary`, `Fingerprint`, `Computed from`, `Normalized dependencies`, `What equal values mean`, `How to compare`, optional `Write location`, `Next step`, and teaches equality semantics before or alongside raw hash value.  |
| AC-8  | Any detected source disagreement, generated-output drift, auto-added dependency, or skipped conflict is surfaced in first screen or top summary sections; none may appear only in verbose/deep detail.                                                                                     |
| AC-9  | Shared `Next step` footer appears exactly once per human-readable output, recommends one valid command only, and explains why that next command fits current source/setup state.                                                                                                           |
| AC-10 | CLI help text, docs, and inline hints teach `discover → inspect → preview → write/compare` as preferred workflow; current command-by-command teaching is not acceptance authority.                                                                                                         |
| AC-11 | JSON output remains semantically aligned with text output for source labeling, current-setup state, drift state, dependency normalization, headline classification, and next-step state.                                                                                                   |
| AC-12 | Automated coverage exists for first-screen frame ordering, guided `list` blocks, explain watch-out sections, plan current-setup/drift summaries, diff headline classification, hash equality teaching, and next-step validity.                                                             |

## Tradeoffs

- More decision framing adds lines, but cuts interpretation cost.
- `Comparison summary` before raw fingerprint softens technical precision, but improves teachability.
- Stronger current-vs-target summaries require more normalization work, but prevent user confusion about replay vs change.
- More opinionated recommendations risk stale copy; metadata ownership must stay centralized.

## Implementation Gap vs Current Product

Deliberate improvements still to build:

- `tool/commands/list.ts` recommends starts, but still lacks `Common goals` and filtered outputs feel table-like rather than decision-led.
- `tool/commands/explain.ts` has fixed sections, but lacks differentiator section and stronger watch-out framing.
- `tool/commands/plan.ts` computes rich preview data, but current top summary does not yet clearly separate current setup snapshot, drift state, replay-vs-change framing, and watch-outs.
- `tool/commands/hash.ts` still leads with `Fingerprint` and does not teach comparison semantics early enough.
- shared next-step/source semantics exist, but current renderer contract still too thin for stronger current-setup teaching.

## Technical Design

### Architecture Ownership

- Command modules keep input parsing and source loading.
- Shared read-only semantics layer owns `Current setup`, drift state, replay-vs-change classification, and next-step recommendation.
- Discovery metadata adapter owns recommendation rows, common-goal mapping, fit tags, and differentiator copy.
- Hash and plan must consume one normalized comparison model so equality semantics match preview semantics.

### System Boundaries

- Human-readable layout may change; normalized semantic state remains source of truth for text and JSON.
- `Current setup` summary belongs in shared view model, not command-local string assembly.
- Recommendation/differentiator copy must be additive metadata, not scattered command heuristics.

### Implementation Slices

1. Expand shared read-only semantic model with current-setup and drift classifications.
2. Add discovery metadata for `Common goals` and nearby-option differentiators.
3. Rework `list` and `explain` around job-first and watch-out-first sections.
4. Rework `plan` summary around current-vs-target story and replay-vs-change states.
5. Rework `hash` to open with comparison teaching and reuse plan normalization.
6. Align help text and docs to one read-only decision ladder.

### Test Plan

- Unit: current-setup classification, drift-state labeling, recommendation/common-goal mapping, comparison semantics.
- Integration: `list` decision blocks, `explain` differentiator/watch-out ordering, `plan` replay-vs-change summaries, `plan --diff` headline labels, `hash` comparison summary.
- JSON contract: semantic parity for source, current setup, drift, classification, and next-step fields.

## Architecture Decision Impact

aligned with current ADRs/foundation

Known repo gap: `docs/foundation.md` absent. ADR 001 remains authority.

## Open Questions

- None blocking. Keep `hash` term in CLI surface for continuity, but human teaching should de-emphasize it by default.

## Routing Decision

**PM → Developer**

Reason: Product, UX, and technical seams are explicit enough for implementation. Main remaining work is command/view-model refactor and copy/layout execution.

## Implementation Notes

Implemented second-pass read-only UX across `list`, `explain`, `plan`, and `hash`.

Changes shipped:

- shared first-screen frame now includes `Current setup`
- `list` adds `Common goals` and clearer filtered-result recovery guidance
- `explain` adds differentiator, watch-out, and preview sections
- `plan` now leads with `Current setup`, `Planned changes`, and `Watch-outs`
- `plan --diff` supports `Replay canonical intent` headline when preview is reconciling output rather than changing intent
- `hash` now opens with `Comparison summary` and explicit equality semantics
- CLI help text updated to teach preview/current-setup framing more clearly

Validation run:

- `npm run lint:fix`
- `npm run lint`
- `npm test`
