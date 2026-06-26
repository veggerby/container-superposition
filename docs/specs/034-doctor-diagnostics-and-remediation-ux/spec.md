# Feature Specification: Doctor Diagnostics and Remediation UX

**Spec ID**: `034-doctor-diagnostics-and-remediation-ux`
**Taxonomy**: `CLI-UX`
**Created**: 2026-06-24
**Author**: PM Agent
**Status**: Implemented
**Input**: Second-pass UX/design rewrite for `doctor` so diagnosis feels like project-health triage first, remediation feels reviewable before write, and maintainer-only catalog validation stays explicitly separate from normal project diagnosis.

---

## Request Classification

UX-forward rewrite. Not reverse-spec. Existing checks and safe remediations remain inputs. Report order, labels, healthy-noise handling, maintainership mode framing, and remediation guidance may change materially where current first-pass implementation still feels checker-shaped instead of action-shaped.

## Product Outcome

Make `doctor` answer five questions within first screen:

1. Is repo healthy, degraded, or blocked?
2. What matters most right now?
3. Can command fix any of it safely?
4. What will change if I allow fixes?
5. What exact action should I take next?

Success signals:

- users know verdict without parsing long section list
- healthy runs feel trustworthy without noisy `already healthy` spam
- fix mode reads like reviewable plan, not opaque helper magic
- maintainers can still validate full catalog, but default users never confuse catalog health with project health

## Improvement Target Over Current Product

This is deliberate uplift over current first-pass doctor redesign and over prior spec text.

Target outcomes:

- replace generic triage with stronger `verdict + top actions` first screen
- replace passed-check dump with compact proof-of-coverage by default
- replace technical `--all-overlays` feel with explicit maintainer/catal​og framing in human output
- replace linear finding reading with stronger `do now / can fix now / review later` action buckets
- replace remediation previews that show action rows only with clearer consequence and file-change summaries

## Current UX To Intentionally Supersede

1. Triage header exists, but summary still asks user to read too many rows before knowing what to do.
2. Selected-overlay default improved scope, but human output still does not clearly distinguish `project diagnosis` from `catalog validation` mode.
3. Passed checks can still compete visually with actionable issues.
4. Healthy output proves coverage, but can still feel more like section report than crisp verdict card.
5. Fix plan lists actions, but user consequence and likely changed artifacts are still too easy to skim past.
6. Current wording teaches capability, but not enough `what should I do next?` urgency.

## Primary User Questions

### Project user

- Is current setup broken?
- What should I fix first?
- Can tool fix this safely?

### Maintainer

- Am I diagnosing one repo or validating overlay catalog quality?
- Which mode did I run?
- Where do I look for broad catalog issues?

### CI / automation

- What disposition should gate pipeline?
- What changed vs remained manual?
- Can JSON and text be trusted as same state model?

## Scope

### In scope

- `doctor`
- `doctor --fix`
- `doctor --fix --dry-run`
- selected-overlay project diagnosis by default
- explicit full-catalog validation mode
- verdict framing, bucket ordering, healthy-run compression, fix-plan UX, and final disposition reporting

### Out of scope

- new diagnostic domains
- selective per-finding fix targeting
- init/regen conversion flows
- interactive remediation for every manual issue

## Non-Goals

- Preserve current first-pass doctor layout because tests pass
- Preserve equal visual weight between healthy findings and urgent findings
- Use `doctor` as hidden maintainer command by default

## Design Principles

1. **Verdict first**.
2. **Project mode by default**.
3. **Action beats taxonomy**.
4. **Healthy proof without healthy noise**.
5. **Preview consequences before mutation**.
6. **Maintainer mode must feel opt-in and explicit**.

## Canonical Interaction Model

### Doctor modes

Doctor has four user-visible modes:

- `Project diagnosis`
- `Project fix preview`
- `Project safe fixes`
- `Catalog validation`

Rules:

- first visible line must be exact mode label
- `Catalog validation` appears only with explicit opt-in mode/flag
- all other default flows are project-scoped diagnosis/fix flows

### Top-level verdicts

Every run resolves to one verdict from exact set:

- `Blocked`
- `Needs action`
- `Can fix now`
- `Healthy`

Rules:

- verdict appears in first screen and final screen
- `Can fix now` means safe auto-fixes exist and no unresolved blocker outranks them
- `Needs action` means manual or non-auto-fix follow-up exists without current hard block

## Page Contract

### 1. Verdict header

First visible output MUST contain rows in exact order:

1. `Mode`
2. `Verdict`
3. `Scope`
4. `Source inspected`
5. `What needs attention`
6. `Recommended next action`

Rules:

- `Scope` must say `selected overlays for current project`, `legacy manifest context`, or `full overlay catalog`, as applicable
- `What needs attention` is compact summary sentence, not count dump only
- first screen must let user know whether this is project diagnosis or maintainer validation without reading body sections

### 2. Count strip

Immediately after verdict header, output MUST show compact counts strip with exact labels:

- `blocking`
- `fix now`
- `manual`
- `healthy`

Rules:

- counts must reconcile with later buckets
- counts strip stays one line or one compact block
- counts never replace verdict sentence; both required

### 3. Action buckets

Human-readable findings MUST render in this order:

1. `Do now`
2. `Can fix now`
3. `Review next`
4. `Healthy checks`

Rules:

- `Healthy checks` omitted when any higher-priority bucket already fills first screen, unless user asked verbose detail
- `Healthy checks` on mixed runs should summarize by category/count by default, not list every healthy item
- full healthy detail may appear only in verbose or catalog-maintainer modes

### 4. Finding card contract

Each finding block MUST contain:

- severity badge
- short title
- why user should care
- action label from exact set `blocked`, `auto-fix available`, `manual follow-up`, `healthy`
- exact next remediation command or manual step when available

Expanded detail order:

1. `Why this matters`
2. `Evidence`
3. `How to fix`
4. `Affected files or artifacts`

### 5. Fix preview contract

Before any mutation, fix-capable modes MUST render `Fix plan` with one row per remediation including:

- finding
- action to apply
- expected effect
- affected files/artifacts
- skip/prerequisite notes
- safety class

Rules:

- `Project fix preview` headline must say `No files changed`
- live fix mode prints identical plan before confirmation
- if zero auto-fixes exist, `Fix plan` says `Nothing safe to apply` and routes user to manual work

### 6. Confirmation gate

Interactive live-fix mode MUST require explicit confirmation after fix plan.

Choices:

- `Apply fixes`
- `Cancel`

Rules:

- default focus `Cancel`
- confirmation copy must restate whether fixes target project file, generated output, compatibility artifacts, or environment only
- non-interactive live fix still prints identical fix plan before applying changes

### 7. Post-fix outcome contract

After remediation attempt, output MUST render sections in exact order:

1. `Fixed now`
2. `Skipped`
3. `Still needs action`
4. `Healthy checks`
5. `Next step`

Rules:

- if blockers remain, final verdict stays `Blocked`
- `Skipped` must state reason, not only name
- `Healthy checks` after fix should remain compact summary unless run was fully healthy

### 8. Healthy run contract

Healthy runs MUST remain short and confidence-building.

Required lines/facts:

- exact scope inspected
- source inspected
- checks run count
- `No files changed`
- next safe step

Rules:

- healthy output should fit in one terminal page for typical project diagnosis
- healthy project runs should prefer summary like `selected overlays healthy (4 checks across 2 overlays)` over listing every pass row

## Overlay Validation Scope

### Default project diagnosis

Default `doctor` MUST validate only overlays selected for current project/manifest context plus dependency-derived context needed to assess that project.

Rules:

- default human output MUST NOT list unrelated repo overlays as healthy noise
- default `Scope` label must say project-scoped language, not generic overlay validation

### Full catalog validation

Repo-wide overlay validation is explicit maintainer mode.

Rules:

- CLI flag may remain `--all-overlays`, but human-readable mode/scope copy MUST call this `Catalog validation`
- footer and help text should explain this is broader than normal project health
- catalog validation may show fuller healthy detail than project mode

## Interaction Rules

### Ordering rules

Detailed findings SHOULD appear by actionability order:

1. source authority / missing canonical input
2. environment blockers
3. generated-output drift and reproducibility
4. parameters / dependencies / compatibility
5. advisory or hygiene issues

### Copy rules

Prefer:

- `Verdict`
- `Do now`
- `Can fix now`
- `Review next`
- `Project diagnosis`
- `Catalog validation`
- `No files changed`

Avoid:

- bare `warning` without user consequence
- equal prominence for healthy and broken states
- ambiguous catalog-vs-project language

### Recovery guidance rules

Source-authority and drift findings MUST route toward:

- shared project file review/update
- `regen` for replay from canonical intent
- `migrate` for legacy manifest bridge
- explicit manual cleanup only when tool cannot safely perform it

## Empty and Edge-State Rules

- no project file and no manifest → clear missing-source explanation and route to `init`
- fix mode with manual-only issues → no confirmation gate, explicit `Nothing safe to apply`
- dry-run with zero planned fixes → explicit `Nothing safe to apply` + manual follow-up route
- catalog validation with no issues → healthy output must still clearly say full catalog mode ran

## Worked Examples

### Normal broken project

- header says `Mode: Project diagnosis`
- verdict `Blocked`
- `Do now` lists top blockers with why and next fix step
- `Healthy checks` summarized only briefly

### Dry-run remediation

- header says `Mode: Project fix preview`
- verdict `Can fix now`
- `Fix plan` lists file effects and consequence
- footer says `No files changed`

### Maintainer catalog audit

- header says `Mode: Catalog validation`
- scope says `full overlay catalog`
- body may include broader healthy detail than normal project mode

## QA Scenario Scripts

1. Project diagnosis with mixed findings: verify verdict header, count strip, and `Do now` / `Can fix now` / `Review next` ordering.
2. Healthy project diagnosis: verify compact healthy summary, no passed-check spam, and trust facts.
3. `doctor --fix --dry-run`: verify `Project fix preview`, identical fix-plan rows, and `No files changed` wording.
4. Interactive `doctor --fix`: verify explicit confirmation after fix plan and before mutation.
5. Partial remediation success: verify `Fixed now`, `Skipped`, `Still needs action`, and final verdict reconciliation.
6. `doctor --all-overlays`: verify mode/scope change to catalog validation and broader scope messaging.

## Acceptance Criteria

| #     | Criterion                                                                                                                                                                                                                                       |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1  | First visible doctor output is verdict header with rows in exact order `Mode`, `Verdict`, `Scope`, `Source inspected`, `What needs attention`, `Recommended next action`, before any finding-detail sections.                                   |
| AC-2  | Immediately after verdict header, doctor shows compact counts strip with exact labels `blocking`, `fix now`, `manual`, `healthy`, and these counts reconcile with later buckets and post-fix outcomes.                                          |
| AC-3  | Human-readable project-mode findings render action buckets in exact order `Do now`, `Can fix now`, `Review next`, `Healthy checks`, with `Healthy checks` summarized or omitted by default when higher-priority buckets already need attention. |
| AC-4  | Default `doctor` scope is selected/current-context overlays only; human-readable mode/scope copy frames this as project diagnosis, not generic overlay validation, and unrelated repository overlays do not appear as healthy noise.            |
| AC-5  | Explicit full-catalog validation remains available only through opt-in mode/flag and renders human-readable mode label `Catalog validation` with scope `full overlay catalog`.                                                                  |
| AC-6  | Diagnose-only, dry-run, live-fix, and catalog runs use exact mode labels `Project diagnosis`, `Project fix preview`, `Project safe fixes`, and `Catalog validation`, and final screens repeat matching mode semantics.                          |
| AC-7  | Every fix-capable run prints `Fix plan` before any mutation, with one row per remediation naming finding, action, expected effect, affected artifacts, skip/prerequisite notes, and safety class.                                               |
| AC-8  | Interactive live-fix mode offers exactly `Apply fixes` and `Cancel` after fix plan with default focus `Cancel`; manual-only runs skip confirmation and state `Nothing safe to apply`.                                                           |
| AC-9  | Post-fix output renders exact section order `Fixed now`, `Skipped`, `Still needs action`, `Healthy checks`, `Next step`; unresolved blockers remain visible and preserve `Blocked` verdict when applicable.                                     |
| AC-10 | Healthy project runs state exact scope inspected, source inspected, checks count, `No files changed`, and next safe step while remaining compact and avoiding per-overlay passed-check spam by default.                                         |
| AC-11 | Finding cards surface user consequence and exact next fix/manual step in addition to severity and raw evidence; no actionable finding may appear without a stated consequence.                                                                  |
| AC-12 | Automated coverage exists for verdict-header ordering, project-vs-catalog scope framing, healthy-summary compression, fix-plan preview parity, confirmation defaults, post-fix bucket reconciliation, and JSON/text mode parity.                |

## Tradeoffs

- More verdict framing adds output structure, but sharply lowers triage cost.
- Compact healthy summaries reduce proof detail, but remove noise and can expand in verbose/maintainer modes.
- Catalog validation stays one flag away, but stronger human copy prevents mode confusion.
- More explicit consequence/action text requires normalized finding copy, but improves trust and remediation speed.

## Implementation Gap vs Current Product

Deliberate improvements still to build:

- `tool/commands/doctor.ts` now scopes overlay validation correctly by default, but mode/scope wording still under-teaches project diagnosis vs catalog validation.
- current buckets still preserve too much healthy detail relative to actionable findings on some runs.
- fix-plan rendering includes technical actions, but user-consequence summaries and artifact-target emphasis remain thin.
- healthy runs prove coverage, but can still read more like report sections than crisp verdict card.
- CLI help text still under-explains catalog validation as maintainer-only broader mode.

## Technical Design

### Architecture Ownership

- doctor checker implementations keep evidence gathering and remediation execution.
- normalized doctor view model owns verdict, scope label, count strip, action buckets, finding consequence text, and fix/outcome summaries.
- human renderer decides compression rules for `Healthy checks` based on mode and verbosity.
- help/next-step routing layer owns project-vs-catalog teaching.

### System Boundaries

- checkers emit findings and evidence only; they do not control final wording or bucket prominence.
- catalog validation mode and project diagnosis mode share normalized state model but differ in scope label and healthy-detail compression policy.
- JSON remains machine contract; text and JSON must derive from same normalized verdict/scope/bucket model.

### Implementation Slices

1. Expand normalized doctor model with explicit `scope` and `verdict summary` text.
2. Add healthy-summary compression rules and project-vs-catalog mode labels.
3. Rework finding cards around consequence and next action.
4. Rework fix-plan rows around expected effect and artifact targets.
5. Align help text and footer wording for project diagnosis vs catalog validation.

### Test Plan

- Unit: verdict mapping, project-vs-catalog scope labeling, healthy-summary compression, finding consequence formatting.
- Integration: mixed diagnosis ordering, healthy compact output, dry-run/live fix-plan parity, catalog validation framing.
- JSON contract: parity for mode, verdict, scope, counts, action buckets, fix plan, and outcomes.

## Architecture Decision Impact

aligned with current ADRs/foundation

Known repo gap: `docs/foundation.md` absent. ADR 001 remains authority.

## Open Questions

- None blocking. Keep `--all-overlays` flag for now; human-readable copy should carry maintainership framing even if CLI flag stays technical.

## Routing Decision

**PM → Developer**

Reason: UX contract, scope behavior, bucket model, and technical seams are explicit enough for implementation without new architecture discovery.

## Implementation Notes

Implemented second-pass doctor UX on top of scoped overlay validation and existing remediation plumbing.

Changes shipped:

- default human-readable mode now frames normal runs as `Project diagnosis`
- explicit `Catalog validation` wording now appears for `--all-overlays`
- header now uses `Verdict`, `Scope`, and `What needs attention`
- healthy output compresses passed noise into `Healthy checks` summary by default
- action buckets now read `Do now`, `Can fix now`, and `Review next`
- fix preview wording now uses `Project fix preview — No files changed`
- JSON parity extended with `scope`
- CLI help text now teaches project diagnosis vs maintainer catalog validation

Validation run:

- `npm run lint:fix`
- `npm run lint`
- `npm test`
