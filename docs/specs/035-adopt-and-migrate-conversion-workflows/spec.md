# Feature Specification: Adopt and Migrate Conversion Workflows

**Spec ID**: `035-adopt-and-migrate-conversion-workflows`
**Taxonomy**: `CLI-UX`
**Created**: 2026-06-24
**Author**: PM Agent
**Status**: Implemented
**Input**: Second-pass UX/design rewrite for `adopt` and `migrate` so conversion path selection, write safety, artifact ownership, and post-conversion next steps feel clearer and lower-risk than current first-pass implementation.

---

## Request Classification

UX-forward rewrite. Not reverse-spec. Existing detection and conversion behavior remain inputs. Human-readable framing, path selection, confidence teaching, write review, and recovery guidance may change materially where current first-pass implementation still feels implementation-led instead of trust-led.

## Product Outcome

Make `adopt` and `migrate` answer six questions quickly:

1. Which command should I use for this repo?
2. What source did tool inspect?
3. How much of current setup can tool manage confidently?
4. What will stay preserved outside managed overlays?
5. What exact files will be written or left unchanged?
6. What command should I run next after conversion?

Success signals:

- users no longer need prior product knowledge to distinguish `adopt` from `migrate`
- low-confidence adoption feels safely stopped, not awkwardly half-inviting write
- migration feels like safe bridge to canonical project file, not hidden write utility
- post-conversion handoff is obvious: review, replay, validate

## Improvement Target Over Current Product

This is deliberate uplift over current first-pass conversion redesign and over prior spec text.

Target outcomes:

- replace command-name knowledge requirement with explicit path-selection teaching
- replace artifact-role review that still reads technically with more obvious ownership story
- replace write review that lists artifacts but under-teaches preservation and overwrite consequences
- replace migration success that is correct but still terse with stronger `generated output unchanged` and `what next` framing
- replace confidence label alone with clearer outcome classes: managed, preserved, manual, and blocked

## Current UX To Intentionally Supersede

1. `adopt` has confidence framing, but user still must infer whether command is good idea for their repo.
2. `migrate` shows bridge framing, but command still assumes user already knows when manifest-only repo should choose it.
3. Artifact-role tables exist, but still feel like tool internals more than ownership contract.
4. Adoption stop states are safer than before, but not yet maximally clear on why write is blocked and what safer path is.
5. Success screens tell truth, but can teach stronger post-conversion checklist and recovery path.
6. Conversion terms `managed`, `preserved`, `compatibility`, `generated output`, and `replay` still need tighter first-screen teaching.

## Primary User Questions

### Existing handwritten repo maintainer

- Should I use `adopt` or start fresh with `init`?
- What parts of my current setup will tool actually manage?
- What will it preserve untouched?

### Manifest-first repo maintainer

- Is `migrate` safe?
- Will command regenerate my workspace right now?
- What should I do immediately after project file is written?

### Reviewer / CI user

- What files were written?
- What remained manual?
- Was generated output changed or not?

## Scope

### In scope

- `adopt` analysis, dry-run, confirmation, live write, JSON shape, and success framing
- `migrate` path discovery, overwrite guard, review, confirmation policy, and success framing
- command-selection teaching and artifact ownership language shared across both commands

### Out of scope

- redesign of overlay-detection heuristics
- new conversion algorithms
- doctor checks after conversion beyond routing guidance
- removal of compatibility manifest artifact as product behavior

## Non-Goals

- Preserve current first-pass artifact narration because implementation already exists
- Let low-confidence adopt paths feel like normal write candidates
- Treat preservation artifacts as equivalent to managed overlay intent

## Design Principles

1. **Choose right path before showing write details**.
2. **Trust before convenience**.
3. **Managed vs preserved must be unmistakable**.
4. **Low confidence stops early and clearly**.
5. **Migration is bridge, not replay**.
6. **Success includes next checklist, not only write confirmation**.

## Canonical Interaction Model

### Conversion path selector

Both conversion commands MUST teach their lane explicitly.

Shared lane definitions:

- `Adopt existing handwritten setup` = infer managed overlays from current devcontainer artifacts
- `Migrate legacy manifest workflow` = create canonical project file from existing `superposition.json`

Rules:

- first screen of both commands must include one-line `This path is for...`
- if user appears to be in wrong lane, command must say so and route to better command
- command help text must explain lane choice before flags

### Artifact ownership model

Commands MUST teach same ownership labels everywhere:

- `Canonical shared intent` = project file
- `Compatibility artifact` = manifest retained for bridge/compatibility
- `Preserved customization` = `custom/` patches or unmatched config carried forward
- `Generated output` = `.devcontainer/` artifacts produced by replay, possibly unchanged by conversion step

### Adoption confidence ladder

`adopt` MUST classify into exact states:

- `High confidence`
- `Mixed confidence`
- `Low confidence`
- `No viable conversion`

And outcome framing:

- `managed confidently`
- `preserved safely`
- `needs manual review`
- `stop and use init instead`

## Page Contract

### Shared first-screen contract

Both `adopt` and `migrate` MUST begin with fixed-order rows:

1. `Mode`
2. `This path is for`
3. `Source analyzed`
4. `What will be written`
5. `Generated output`
6. `Recommended next action`

Rules:

- `Generated output` must explicitly say `unchanged by this command` when true
- if command is analysis-only, `What will be written` may say `nothing yet — preview only`
- lane-teaching row required even for experienced users

### `adopt` analysis contract

After shared first screen, human-readable `adopt` MUST render sections in exact order:

1. `Confidence`
2. `Will become managed`
3. `Will be preserved`
4. `Needs manual review`
5. `Why confidence is not higher` when confidence is not high
6. `Write review`
7. `Next step`

Rules:

- `Will become managed` groups by capability/value first, not detection source type
- `Will be preserved` explains reason for preservation, not only file path
- `Needs manual review` distinguishes unknown, ambiguous, and unsupported cases
- `Write review` teaches ownership role, action, overwrite risk, backup disposition, and generated-output effect
- explicit `none` states required

### `adopt` stop-state contract

When confidence is `Low confidence` or `No viable conversion`:

- no write confirmation prompt
- `Recommended next action` routes to `init`
- output includes `Why conversion stopped` section
- write review may still show hypothetical artifact targets, but must be visibly labeled `Not recommended to write from this analysis`

### `adopt` confirmation gate

Interactive live-write `adopt` MUST require explicit confirmation after write review.

Choices:

- `Write conversion artifacts`
- `Cancel`

Rules:

- default focus `Cancel`
- confirmation copy must restate overwrite risk and backup state plainly
- non-interactive live-write without clear approval must abort safely

### `adopt` success contract

Success output MUST render sections in exact order:

1. `Written now`
2. `Managed going forward`
3. `Preserved for now`
4. `Still needs review`
5. `Generated output status`
6. `Next checklist`

Rules:

- `Generated output status` must explicitly say changed or unchanged
- `Next checklist` contains ordered follow-up steps, not one generic hint only
- success may not imply conversion fully validated when preserved/manual items remain

### `migrate` review contract

After shared first screen, `migrate` MUST render sections in exact order:

1. `Why migrate fits this repo`
2. `Write review`
3. `What stays unchanged`
4. `Next step`

Rules:

- `Why migrate fits this repo` explains manifest-only/legacy source relationship in plain language
- `Write review` includes source manifest path, target project file path, overwrite guard state, and generated-output effect
- `What stays unchanged` explicitly names generated output and compatibility expectations until `regen`

### `migrate` confirmation policy

`migrate` currently may remain non-interactive for scripting simplicity, but if human-readable mode detects overwrite risk plus `--force`, it MUST restate that risk prominently before write.

Rules:

- overwrite guard remains blocking unless `--force`
- if future interactive confirmation added, same exact `Write conversion artifacts` / `Cancel` choices must be used for consistency

### `migrate` success contract

Success output MUST render sections in exact order:

1. `Written now`
2. `Generated output status`
3. `Next checklist`
4. `Optional validation`

Rules:

- `Generated output status` must say `unchanged by migrate`
- `Next checklist` must lead with `regen`
- optional validation should route to `doctor` after replay, not before by default

## Interaction Rules

### Copy rules

Prefer:

- `This path is for`
- `Will become managed`
- `Will be preserved`
- `Needs manual review`
- `Generated output unchanged`
- `Next checklist`
- `Review before replay`

Avoid:

- implying migration regenerated workspace immediately
- implying preserved customizations are equivalent to managed overlays
- implying low-confidence adopt is normal write path

### Recovery guidance rules

- low-confidence adopt → route to `init`
- existing project file overwrite block in `migrate` → route to explicit overwrite review or alternate output path
- adopt with many preserved/manual items → route to review project file, inspect `custom/`, then `regen`, then `doctor`

### Empty and error states

- no manifest for `migrate` → explain missing legacy source and route to `init`
- missing/invalid source directory for `adopt` → block before analysis with path correction hint
- zero strong matches in `adopt` → stop state with `init` guidance
- both project file variants present → blocked with explicit ownership conflict guidance

## Worked Examples

### High-confidence adopt

- first screen says path is for handwritten devcontainer adoption
- analysis clearly separates managed capabilities from preserved custom patches
- write review shows project file, compatibility artifact, preserved customization artifacts, backups, and generated-output effect
- success ends with checklist: review project file, `regen`, then `doctor`

### Low-confidence adopt

- first screen still teaches lane
- confidence section says write not recommended
- `Why conversion stopped` explains ambiguity/unsupported patterns
- next action routes to `init`

### Manifest-only migrate

- first screen says path is for legacy manifest workflow
- write review makes clear project file written, generated output unchanged
- success checklist leads directly to `regen`

## QA Scenario Scripts

1. `adopt --dry-run` high confidence: verify shared first screen, confidence sections, ownership-aware write review, and no confirmation.
2. `adopt` low confidence: verify stop state, `Why conversion stopped`, and `init` routing.
3. Interactive `adopt` with overwrite risk/no backup: verify explicit risk wording and confirmation gate.
4. `adopt` success with preserved artifacts: verify `Managed going forward`, `Preserved for now`, `Generated output status`, and ordered checklist.
5. `migrate` normal run: verify lane-teaching first screen, write review, generated-output-unchanged messaging, and checklist starting with `regen`.
6. `migrate --force` overwrite path: verify prominent overwrite-risk review before write.

## Acceptance Criteria

| #     | Criterion                                                                                                                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-1  | Both `adopt` and `migrate` begin human-readable output with shared first-screen rows in exact order `Mode`, `This path is for`, `Source analyzed`, `What will be written`, `Generated output`, `Recommended next action`.                                    |
| AC-2  | `adopt` analysis renders exact section order `Confidence`, `Will become managed`, `Will be preserved`, `Needs manual review`, conditional `Why confidence is not higher`, `Write review`, `Next step`, with explicit `none` states where relevant.           |
| AC-3  | `adopt` low-confidence and no-viable states stop before confirmation or write, render `Why conversion stopped`, visibly label any artifact preview as not recommended to write, and route users to `init`.                                                   |
| AC-4  | `adopt` write review teaches artifact ownership and consequence using canonical/compatibility/preserved/generated roles plus action, overwrite risk, backup disposition, and generated-output effect for each relevant artifact row.                         |
| AC-5  | Interactive live-write `adopt` offers exactly `Write conversion artifacts` and `Cancel` after write review with default focus `Cancel`; analysis-only and dry-run modes never prompt for confirmation.                                                       |
| AC-6  | `adopt` success renders exact section order `Written now`, `Managed going forward`, `Preserved for now`, `Still needs review`, `Generated output status`, `Next checklist`, and never implies fully validated conversion when preserved/manual items remain. |
| AC-7  | `migrate` renders exact section order `Why migrate fits this repo`, `Write review`, `What stays unchanged`, `Next step` after shared first screen, and clearly teaches that generated output remains unchanged until `regen`.                                |
| AC-8  | `migrate` success renders exact section order `Written now`, `Generated output status`, `Next checklist`, `Optional validation`, with `regen` as first checklist item and `doctor` positioned as follow-up after replay.                                     |
| AC-9  | Both commands use consistent lane-teaching and artifact-ownership language so users can tell `adopt existing handwritten setup` from `migrate legacy manifest workflow` without prior docs knowledge.                                                        |
| AC-10 | Generated-output status is stated explicitly on every write-capable preview/success surface and never conflated with project-file or compatibility-artifact writes.                                                                                          |
| AC-11 | JSON output for `adopt` remains semantically aligned with human-readable confidence, managed/preserved/manual-review, and artifact-write structures used in text output.                                                                                     |
| AC-12 | Automated coverage exists for shared first-screen lane teaching, low-confidence stop behavior, ownership-aware write review, overwrite-risk messaging, migrate generated-output-unchanged teaching, and ordered next-checklist guidance.                     |

## Tradeoffs

- More lane-teaching adds repeated copy, but removes command-selection ambiguity.
- Stronger stop states block some eager power users, but reduce false-confidence conversions.
- Ordered next checklists add output length, but improve safe follow-through.
- More explicit ownership language requires careful consistency across commands, but reduces canonical-vs-preserved confusion.

## Implementation Gap vs Current Product

Deliberate improvements still to build:

- `tool/commands/adopt.ts` now exposes confidence and artifact review, but still under-teaches lane choice, preservation meaning, and post-success checklist.
- `tool/commands/migrate.ts` correctly teaches bridge basics, but still writes immediately after review and under-explains lane choice and unchanged-generated-output consequences.
- shared artifact rows exist, but current copy still reads technically rather than as ownership model.
- CLI help text still under-explains when to choose `adopt` vs `migrate` vs `init`.

## Technical Design

### Architecture Ownership

- command modules keep source loading, detection, write execution, and overwrite guard behavior.
- shared conversion view model owns lane-teaching copy, ownership labels, generated-output status, and ordered next checklists.
- adopt planner owns confidence classification and managed/preserved/manual groupings.
- shared artifact review helper owns role/action/risk/backup/generated-effect rows.

### System Boundaries

- lane selection guidance belongs in command/view-model layer, not docs only.
- confidence class remains planner-owned because stop-state behavior depends on it.
- text and JSON must derive from same adopt confidence/grouping/artifact model.
- migrate may stay text-first operationally, but should still use shared structured review model.

### Implementation Slices

1. Add shared lane-teaching and next-checklist model for conversion commands.
2. Rework `adopt` analysis sections around managed/preserved/manual/outcome framing.
3. Add stronger stop-state copy and hypothetical-but-not-recommended artifact review for low-confidence adopt.
4. Rework success screens around ordered checklists and generated-output status.
5. Rework `migrate` framing around lane fit, unchanged output, and post-write checklist.
6. Align help/docs for `adopt` vs `migrate` vs `init` command choice.

### Test Plan

- Unit: lane-selection messaging, confidence-to-stop-state mapping, checklist generation, artifact ownership labels.
- Integration: high-confidence adopt dry run, low-confidence adopt stop, overwrite-risk confirm wording, migrate bridge framing, success checklist ordering.
- JSON contract: adopt normalized fields remain aligned with human-readable groupings and artifact review structures.

## Architecture Decision Impact

aligned with current ADRs/foundation

Future decision about retiring compatibility manifest by default remains separate ADR/product work.

Known repo gap: `docs/foundation.md` absent. ADR 001 remains authority.

## Open Questions

- None blocking. Whether `migrate` should later gain explicit interactive confirmation can stay separate follow-up; overwrite review and bridge teaching are higher-priority now.

## Routing Decision

**PM → Developer**

Reason: UX contract, lane-teaching model, stop-state rules, and artifact-ownership wording are concrete enough for implementation.

## Implementation Notes

Implemented second-pass conversion UX across `adopt` and `migrate`.

Changes shipped:

- both commands now lead with lane-teaching frame including `This path is for`
- `adopt` analysis now separates `Confidence`, `Will become managed`, `Will be preserved`, and `Needs manual review`
- low-confidence `adopt` now renders explicit `Why conversion stopped` plus not-recommended write review
- `adopt` success now includes `Managed going forward`, `Preserved for now`, and ordered `Next checklist`
- `migrate` now teaches lane fit, unchanged generated output, and replay-first checklist more explicitly
- CLI help text updated to distinguish handwritten adoption vs legacy manifest migration

Validation run:

- `npm run lint:fix`
- `npm run lint`
- `npm test`
