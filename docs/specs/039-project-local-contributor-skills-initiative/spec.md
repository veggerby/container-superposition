# Feature Specification: Project-Local Contributor Skills Initiative

**Spec ID**: `039-project-local-contributor-skills-initiative`
**Taxonomy**: `DOCS-GUIDE`
**Created**: 2026-06-30
**Author**: PM Agent
**Status**: Final
**Input**: Opportunity backlog items 6–9 from `docs/opportunities/README.md` — add repo-local contributor skills for CLI command delivery, canonical docs alignment, workflow/Pi asset synchronization, and dogfooding/generated-artifact safety.

---

## Request Classification

Clarification and tightening pass on an existing umbrella spec.

The initiative remains **one umbrella spec**. The four skills share the same contributor workflow authority, often trigger together in one change, and would drift if specified independently.

## Problem Statement

The repository has strong contributor guidance, but most of it lives in scattered authority docs rather than in project-local Pi skills.

Repo evidence:

- `.pi/skills/` currently contains only `overlay-development`.
- `docs/opportunities/README.md` items 6–9 call out four missing non-overlay repo-local skills.
- `.pi/README.md` currently claims a `/delivery-loop` prompt, but `.pi/prompts/` contains only `overlay-audit.md` and `overlay-review.md`.
- `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, ADR `001`, and specs `030`, `033`, `034`, `037`, and `038` now define repo-specific contributor rules that are not packaged into project-local Pi guidance.
- `CONTRIBUTING.md` and `.github/instructions/dogfooding.instructions.md` confirm that this repo dogfoods generated artifacts and requires source-owned fixes.

Result: contributors and agents must reconstruct routine maintainer workflows from multiple documents, which increases workflow drift risk.

## Product Outcome

Deliver one project-local contributor-skill initiative that makes four recurring maintainer workflows directly discoverable in `.pi/skills/`:

1. CLI command delivery
2. Canonical docs alignment
3. Workflow artifact and Pi asset synchronization
4. Dogfooding and generated-artifact safety

The delivered skills must be operational playbooks, not link lists. They may cite authority documents, but they must state required contributor actions directly enough that implementation does not need to infer missing behavior from those sources.

## Scope

### In scope

- Define one initiative covering exactly four new project-local skills.
- Specify the exact file paths for those skills.
- Define what each skill must teach: triggers, read order, covered surfaces, required workflow, prohibited shortcuts, escalation conditions, and validation routing.
- Make Pi inventory synchronization requirements explicit for `.pi/README.md` and any changed Pi asset listings.
- Make workflow synchronization obligations explicit for specs, indexes, changelog, opportunities, and roadmap artifacts when the change type requires them.

### Out of scope

- Implementing the skills.
- Creating additional specs.
- Changing command behavior, docs behavior, or repository architecture outside the contributor-guidance surfaces defined here.
- Replacing `overlay-development`.
- Requiring new project-local prompts or agents.
- Changing `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, or ADR `001`.

## Non-Goals

- Four disconnected skills that duplicate or contradict each other.
- Skills that say only “follow AGENTS/spec/foundation” without stating the required workflow.
- Normalizing direct edits to generated artifacts.
- Forcing backlog, roadmap, or changelog churn for routine copy-only edits that do not meet current repo triggers.

## Must Preserve

Implementation under this spec must preserve these authorities and boundaries:

1. `AGENTS.md` remains the authoritative repo guidance for contributor automation.
2. `docs/foundation.md` remains the engineering boundary authority.
3. `docs/definition-of-done.md` remains the validation and completion authority.
4. `docs/adr/adr001-project-file-first-replay-and-regeneration.md` remains the project-file-first and generated-artifact safety authority.
5. `overlay-development` remains the project-local skill for overlay-specific implementation work.
6. Generated artifacts such as `dist/`, `docs/overlays.md`, `tool/schema/superposition.schema.json`, and the root generated `.devcontainer/` remain source-owned outputs.
7. Current command UX and modularization contracts defined by specs `033`, `034`, `037`, and `038` remain in force unless another approved spec changes them.

## Required Deliverables

Implementation must add exactly these four files:

| Path                                           | Required focus                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| `.pi/skills/cli-command-delivery/SKILL.md`     | Command-code, command-tests, command-help, and command-adjacent contributor workflow |
| `.pi/skills/canonical-docs-alignment/SKILL.md` | README/docs/help/example cleanup against current canonical workflow                  |
| `.pi/skills/workflow-sync/SKILL.md`            | Spec/index/changelog/opportunity/roadmap/Pi inventory synchronization                |
| `.pi/skills/dogfooding-safety/SKILL.md`        | Root devcontainer, generated outputs, source-owned fixes, regen/doctor safety        |

Implementation must also update these inventory surfaces when needed:

- `.pi/README.md` — required if any Pi asset claims would otherwise be false after the change
- any changed project-local Pi inventory listing that describes skills, prompts, or agents

This spec does **not** require creating new files under `.pi/prompts/` or `.pi/agents/`. If implementation leaves those directories unchanged, inventory docs must stop claiming nonexistent assets.

## Shared Contract For All Four Skills

Each delivered skill file must be self-sufficient enough for direct contributor use.

### Required sections

Each skill must include these sections or obvious equivalents:

1. `When to use this skill`
2. `Read first`
3. `Primary files and surfaces`
4. `Required workflow`
5. `Do not do this`
6. `Escalate when`
7. `Validation`
8. `Related skills`

### Direct-behavior rule

Each skill must state required contributor actions in its own prose. References to `AGENTS.md`, foundation, DoD, ADR `001`, or related specs are **authority/context**, not substitutes for missing requirements.

Unacceptable pattern:

- “Follow `AGENTS.md` and the relevant specs.”

Required pattern:

- tell the contributor what to preserve, what to update, what not to change directly, and when to escalate
- then cite the authority file that governs that rule

### Shared authority order

Unless a skill requires a narrower order, each skill must direct contributors to read:

1. `AGENTS.md`
2. `docs/foundation.md`
3. `docs/definition-of-done.md` when validation or completion scope matters
4. `docs/adr/adr001-project-file-first-replay-and-regeneration.md` when project-file-first or generated-artifact behavior is in play
5. the relevant live spec(s)
6. the live files being changed

### Shared validation routing

Across the four skills, the delivered guidance must teach these rules directly:

- run `npm run lint:fix` after formatting-affecting file changes
- run `npm run lint` for shipped changes
- run targeted tests for changed command or pure-logic areas at minimum
- run `npm test` when command refactors are broad, workflow changes are broad, or targeted coverage is insufficient
- run `npm run build` when validating compiled CLI behavior or source-vs-compiled path-sensitive flows
- run `npm run docs:generate` after overlay-source changes that affect generated overlay docs
- run `npm run schema:generate` after overlay or schema-type changes that affect generated schema
- run `npm run init -- regen` when user-visible or tooling changes affect generated output
- run `npm run init -- doctor` with no reproducibility failures before merge when generated-output workflows are affected

The skills do not need to require every command for every change. They must teach how to select the required validation surface by change type.

### Shared escalation rule

If requested work conflicts with `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, ADR `001`, or an approved feature spec, the skills must direct contributors to escalate rather than invent a local exception.

### Shared overlay boundary

The four new skills must complement `overlay-development`, not absorb it. They may point contributors to `overlay-development` when overlay-specific implementation rules become primary.

## Skill Contracts

### 1. `.pi/skills/cli-command-delivery/SKILL.md`

#### Trigger scope

This skill must be used when work changes any of the following:

- `tool/commands/**`
- `tool/cli/**`
- `scripts/**`
- `tool/__tests__/**` for command-level behavior
- `tool/ux/**` for command-facing presentation
- command-facing docs/help/examples when command behavior or wording changes

#### Required read-first set

This skill must require contributors to read, at minimum:

1. `AGENTS.md`
2. `docs/foundation.md`
3. `docs/definition-of-done.md`
4. `docs/adr/adr001-project-file-first-replay-and-regeneration.md`
5. `docs/specs/033-cli-discovery-preview-and-fingerprint/spec.md`
6. `docs/specs/034-doctor-diagnostics-and-remediation-ux/spec.md`
7. `docs/specs/037-cli-command-modularization/spec.md`
8. `docs/specs/038-doctor-and-plan-command-modularization/spec.md`
9. the live command module(s), tests, and help/docs being changed

#### Required workflow guidance

This skill must directly teach all of the following:

1. **Preserve command ownership boundaries**.
    - Keep command entry files as thin orchestrators where the repo already modularized them.
    - Do not re-monolithize `adopt`, `doctor`, or `plan`.
    - Keep analysis, presentation, and write-side logic separated where specs `037` and `038` require those seams.

2. **Preserve one normalized behavior model per command flow**.
    - Text output, JSON output, preview state, and write state must come from the same normalized command-local model where the current spec requires semantic parity.
    - Do not introduce duplicate recomputation paths that can drift.

3. **Preserve current command UX contracts unless another approved spec changes them**.
    - Read-only command guidance must remain aligned with the `discover → inspect → preview → write/compare` ladder from spec `033`.
    - `plan --diff` must preserve the headline classes `First write`, `Change intent and regenerate`, `Replay canonical intent`, `Cleanup stale generated files`, and `No material change`.
    - `doctor` must preserve the mode labels, verdict-first framing, bucket ordering, and fix-plan-before-mutation contract from spec `034`.

4. **Preserve project-file-first behavior**.
    - Treat `superposition.yml` / `.superposition.yml` as canonical shared intent.
    - Treat `superposition.json` as compatibility/reproducibility output rather than the primary steady-state source when a project file exists.
    - Keep replay, drift, remediation, and next-step guidance aligned with ADR `001`.

5. **Preserve stable command-entry exports where current tests or CLI wiring rely on them**.
    - If internal extraction moves helpers, the command entry path must continue exporting the relied-on surfaces directly or via explicit re-export.

6. **Preserve source-vs-compiled path safety**.
    - New path-sensitive logic must work from both source and compiled execution where repo patterns require that support.

7. **Update adjacent contributor surfaces in the same change when command behavior changes**.
    - Update command-facing docs/help/examples when user-visible command wording or workflow changes.
    - Update `CHANGELOG.md` when the change is user-visible.
    - Update relevant Pi guidance if contributor workflow instructions changed.

#### Prohibited shortcuts

This skill must forbid at least these shortcuts:

- editing `dist/`
- silently changing a command contract already specified elsewhere
- adding path logic that works only from source or only from compiled output
- allowing text/JSON/preview/write drift through duplicated logic
- shipping user-visible command changes without the required docs/help/changelog sync

#### Escalation cases

This skill must require escalation when:

- requested command behavior conflicts with a current spec or ADR `001`
- a user-visible command contract change has no approved spec
- the contributor cannot place a helper within command-local vs shared ownership without changing established boundaries

### 2. `.pi/skills/canonical-docs-alignment/SKILL.md`

#### Trigger scope

This skill must be used when work changes:

- `README.md`
- `tool/README.md`
- `docs/**`
- command help examples or walkthroughs
- `.pi/README.md` when contributor-facing inventory text changes

#### Required read-first set

This skill must require contributors to read, at minimum:

1. `AGENTS.md`
2. `docs/foundation.md`
3. `docs/adr/adr001-project-file-first-replay-and-regeneration.md`
4. `docs/definition-of-done.md`
5. `docs/specs/030-discovery-surface-and-docs-alignment/spec.md`
6. the relevant live command spec(s) and current command help/output when documenting command behavior

#### Required workflow guidance

This skill must directly teach all of the following:

1. **Teach the canonical project-intent model**.
    - Present `superposition.yml` / `.superposition.yml` as canonical shared input.
    - Present flat `overlays:` selection as the default explicit authoring model.
    - Present presets as an optional shortcut, not a different configuration architecture.
    - Present `superposition.json` as compatibility/reproducibility output, not the primary team-owned intent file.

2. **Teach the preview-first workflow**.
    - When docs cover command flows, the default workflow must read as `discover → inspect → preview → write`.
    - The skill must direct contributors to surface `list`, `explain`, `plan`, `plan --verbose`, and `plan --diff` as the safe path before `init` or `regen` where those flows are relevant.

3. **Label legacy guidance instead of teaching it as current best practice**.
    - Deprecated category-centric top-level fields such as `language:` or `database:` must not be taught as the default current model.
    - Manifest-first explanations may remain only when clearly framed as migration or compatibility context.
    - Internal implementation details such as `_serviceOrder` must not be presented as end-user workflow guidance.

4. **Verify examples against live behavior**.
    - Command examples must match current command names, flags, and help behavior.
    - Stale examples must be removed or rewritten rather than left in place because they still look plausible.

5. **Keep user guidance and maintainer guidance separated**.
    - End-user docs should teach the canonical user workflow.
    - Maintainer-only internals should remain in maintainer-oriented surfaces unless an approved spec broadens their audience.

6. **Keep Pi inventory docs truthful**.
    - If the change touches project-local skills, prompts, or agents, `.pi/README.md` must be checked and corrected in the same change.

#### Prohibited shortcuts

This skill must forbid at least these shortcuts:

- reintroducing manifest-first or category-centric steady-state guidance as the primary model
- documenting nonexistent Pi assets as available
- teaching internal implementation details as end-user workflow guidance without spec authority
- keeping stale examples solely because they are close enough

#### Escalation cases

This skill must require escalation when:

- live behavior and current docs disagree, and the correct product behavior is unclear
- a requested docs change would contradict ADR `001` or spec `030`
- legacy syntax is being kept without a clear migration/compatibility label

### 3. `.pi/skills/workflow-sync/SKILL.md`

#### Trigger scope

This skill must be used when work changes:

- any `docs/specs/**/spec.md`
- `docs/specs/README.md`
- `docs/specs/taxonomy.md`
- `CHANGELOG.md`
- `docs/opportunities/README.md`
- `docs/roadmap.md`
- `.pi/README.md`
- files under `.pi/skills/`, `.pi/prompts/`, or `.pi/agents/`

#### Required read-first set

This skill must require contributors to read, at minimum:

1. `AGENTS.md`
2. `docs/definition-of-done.md`
3. `docs/specs/README.md`
4. `docs/specs/taxonomy.md`
5. the live spec(s) being edited
6. `.pi/README.md`
7. `CHANGELOG.md`, `docs/opportunities/README.md`, and `docs/roadmap.md` when the change type may require them

#### Required workflow guidance

This skill must directly teach all of the following:

1. **Synchronize spec metadata in the same change when indexed fields change**.
    - If a spec title, status, taxonomy, or QA marker changes, update the matching index surfaces in the same change.
    - At minimum, keep the spec and `docs/specs/README.md` synchronized.
    - Keep `docs/specs/taxonomy.md` synchronized when taxonomy listings or status/title displays would otherwise become false.

2. **Respect workflow ownership**.
    - PM owns `Status: Draft`.
    - Developer owns `Status: Implemented` and `Implementation Notes`.
    - QA owns `QA Status` and `QA Feedback`.
    - Contributors must not delete or rewrite markers owned by another role.

3. **Update portfolio or changelog artifacts only when the change type requires it**.
    - Update `docs/opportunities/README.md` when opportunity evidence, priority, or recommended next action changes.
    - Update `docs/roadmap.md` when roadmap sequencing or commitment changes.
    - Update `CHANGELOG.md` when the shipped change is user-visible or repo guidance explicitly requires it.
    - Do not treat every copy edit as requiring roadmap or backlog churn.

4. **Keep Pi inventory truthful whenever Pi assets change**.
    - Compare `.pi/README.md` claims against the actual contents of `.pi/skills/`, `.pi/prompts/`, and `.pi/agents/`.
    - Add, remove, or correct listings so the inventory matches disk state after the change.

5. **Handle unclear artifacts conservatively**.
    - Surface stray, empty, or unclear workflow artifacts as hygiene debt unless ownership and removal intent are clear enough for safe cleanup.

#### Prohibited shortcuts

This skill must forbid at least these shortcuts:

- leaving spec metadata and spec indexes out of sync
- removing QA-owned workflow markers
- claiming Pi assets exist when they do not
- updating roadmap or backlog artifacts mechanically when the change does not affect them

#### Escalation cases

This skill must require escalation when:

- a requested status change is owned by another role
- a portfolio artifact update would imply a priority or commitment change outside the request
- a stray or orphaned workflow artifact cannot be classified safely

### 4. `.pi/skills/dogfooding-safety/SKILL.md`

#### Trigger scope

This skill must be used when work changes or reviews any of the following:

- root `.devcontainer/**`
- `.devcontainer/custom/**`
- `overlays/**`
- `templates/**`
- `features/**`
- `tool/schema/**`
- generated outputs such as `docs/overlays.md`, `tool/schema/superposition.schema.json`, or `dist/`
- reproducibility, regen, or doctor flows tied to generated output

#### Required read-first set

This skill must require contributors to read, at minimum:

1. `AGENTS.md`
2. `docs/foundation.md`
3. `docs/definition-of-done.md`
4. `docs/adr/adr001-project-file-first-replay-and-regeneration.md`
5. `CONTRIBUTING.md`
6. `.github/instructions/dogfooding.instructions.md`
7. the owning source files or governing specs for the generated artifact being changed

#### Required workflow guidance

This skill must directly teach all of the following:

1. **Treat generated outputs as source-owned artifacts**.
    - `dist/`, generated overlay docs, generated schema outputs, and the root generated `.devcontainer/` are outputs, not the default edit surface.
    - Fixes must be routed back to the owning source files whenever possible.

2. **Treat the root `.devcontainer/` as dogfooded generated output**.
    - It is expected to reflect generated composition rather than hand-tuned minimalism.
    - Duplicate or noisy generated settings are not defects by default.
    - Review root `.devcontainer/` changes for runtime, generation, or reproducibility impact rather than cosmetic deduplication.

3. **Treat `.devcontainer/custom/` as a separate review surface**.
    - `.devcontainer/custom/` is intentional override space and should receive normal authored-file review scrutiny.

4. **Route fixes to the true source**.
    - Overlay issues go back to the owning overlay files.
    - Template, feature, schema, questionnaire, or generator issues go back to the corresponding source modules.
    - The skill must explicitly warn contributors not to patch generated root output just to remove the visible symptom.

5. **Run the required regeneration and reproducibility checks when generated-output behavior is affected**.
    - Teach the exact repo triggers for `docs:generate`, `schema:generate`, `init -- regen`, and `init -- doctor`.

6. **Preserve project-file-first and git-safety boundaries**.
    - Replay and remediation authority lives in the project file plus approved source mechanisms.
    - Git-index mutation remains manual guidance, not automatic contributor automation.

#### Prohibited shortcuts

This skill must forbid at least these shortcuts:

- editing `dist/` directly
- routine direct edits to generated root `.devcontainer/` files
- treating harmless generated duplication as a defect by itself
- shipping generator-affecting changes without the required regeneration and doctor checks

#### Escalation cases

This skill must require escalation when:

- a generated artifact appears wrong but the owning source is unclear
- a requested fix would normalize direct edits to generated output
- reproducibility rules appear to conflict with the requested contributor workflow

## Acceptance Criteria

| #    | Criterion                                                                                                                                                                                                                                                                                                                                                                                            |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | The spec remains one umbrella initiative and requires exactly four project-local skill files at `.pi/skills/cli-command-delivery/SKILL.md`, `.pi/skills/canonical-docs-alignment/SKILL.md`, `.pi/skills/workflow-sync/SKILL.md`, and `.pi/skills/dogfooding-safety/SKILL.md`.                                                                                                                        |
| AC-2 | The spec explicitly requires each delivered skill to include `When to use this skill`, `Read first`, `Primary files and surfaces`, `Required workflow`, `Do not do this`, `Escalate when`, `Validation`, and `Related skills` sections, or clear equivalents.                                                                                                                                        |
| AC-3 | The spec makes direct-behavior requirements explicit: the skills may cite `AGENTS.md`, foundation, DoD, ADR `001`, and related specs as authority/context, but none of the four skills may rely on those references as substitutes for required workflow instructions.                                                                                                                               |
| AC-4 | The CLI command delivery skill requirements explicitly preserve thin-orchestrator command boundaries, one normalized command-local behavior model, current command UX contracts from specs `033` and `034`, project-file-first behavior, stable command-entry exports where relied on, source-vs-compiled path safety, and same-change updates to affected docs/help/changelog/Pi guidance surfaces. |
| AC-5 | The canonical docs alignment skill requirements explicitly teach project-file-first canonical docs, flat `overlays:` as the default explicit model, preview-first workflow, legacy-labeling rules, live-example verification, separation of end-user vs maintainer guidance, and truthful Pi inventory updates when Pi assets are touched.                                                           |
| AC-6 | The workflow sync skill requirements explicitly cover same-change synchronization of spec metadata and indexes, workflow-role ownership boundaries, conditional update rules for `CHANGELOG.md`, `docs/opportunities/README.md`, and `docs/roadmap.md`, truthful `.pi` inventory auditing, and conservative handling of unclear workflow artifacts.                                                  |
| AC-7 | The dogfooding safety skill requirements explicitly cover source-owned generated artifacts, root `.devcontainer/` dogfooding status, `.devcontainer/custom/` as a separate review surface, routing fixes to the owning source, required regeneration/reproducibility checks, and preservation of project-file-first plus git-safety boundaries.                                                      |
| AC-8 | The initiative requires `.pi/README.md` and any changed Pi inventory surface to describe only assets that actually exist after implementation; this spec does not require adding new prompts or agents.                                                                                                                                                                                              |
| AC-9 | Routing remains `PM → Developer`, and no new ADR is required unless implementation discovers that teaching these workflows would require changing existing authority rather than operationalizing it.                                                                                                                                                                                                |

## Architecture Decision Impact

Aligned with current authority.

No new ADR is required for this initiative. The work operationalizes existing repo guidance; it does not change repo architecture, project-file-first policy, or generated-artifact ownership.

If implementation discovers that one of the four skills cannot be authored without changing those rules, that change is out of scope for this spec and must be routed through ADR or foundation review.

## Open Questions

None blocking.

## Assumptions

- The maintainer-workflow gap can be closed with project-local skills plus truthful Pi inventory updates; new prompts and agents remain optional.
- `overlay-development` continues to own overlay-specific implementation guidance.
- This initiative is contributor-guidance work, not a change to end-user product behavior.

## Routing Decision

**PM → Developer**

Reason: the deliverables, file paths, skill contracts, sync obligations, non-goals, and escalation boundaries are now specific enough for implementation without a separate UX or architecture pass.

## Implementation Notes

All four project-local Pi skills were created and the Pi inventory was updated.

**Files created:**

- `.pi/skills/cli-command-delivery/SKILL.md` — covers thin-orchestrator boundaries, normalized behavior model, command UX contracts (specs 033/034), project-file-first, source-vs-compiled path safety, and same-change adjacency for docs/help/changelog/Pi guidance
- `.pi/skills/canonical-docs-alignment/SKILL.md` — covers project-intent model, preview-first workflow, legacy labeling, live-example verification, user-vs-maintainer guidance separation, and truthful Pi inventory
- `.pi/skills/workflow-sync/SKILL.md` — covers spec+index synchronization, workflow role ownership, conditional changelog/portfolio update rules, Pi inventory truthfulness, and conservative artifact handling
- `.pi/skills/dogfooding-safety/SKILL.md` — covers generated-output source ownership, root `.devcontainer/` dogfooding status, `.devcontainer/custom/` as separate authored surface, fix routing to true source, regen/doctor triggers, and project-file-first + git-safety preservation

**Files updated:**

- `.pi/README.md` — added four new skill entries; no new prompts or agents claimed
- `CHANGELOG.md` — added `Added` entry under `Unreleased`
- `docs/specs/039-.../spec.md` — status set to `Implemented`, Implementation Notes appended
- `docs/specs/README.md` — status updated to `Implemented`

**Validation:** `npm run lint:fix` and `npm run lint` pass. No code behavior, command logic, schema, or overlay files changed; no build, test, regen, or doctor runs required.

**AC status:**

- AC-1 ✅ One umbrella initiative; exactly four skill files at the required paths
- AC-2 ✅ All four skills include the required sections
- AC-3 ✅ All four skills state required actions directly; authority docs cited as references, not as substitutes
- AC-4 ✅ `cli-command-delivery` covers all seven required workflow items
- AC-5 ✅ `canonical-docs-alignment` covers all six required workflow items
- AC-6 ✅ `workflow-sync` covers all five required workflow items
- AC-7 ✅ `dogfooding-safety` covers all six required workflow items
- AC-8 ✅ `.pi/README.md` reflects only assets that exist; no new prompts or agents added
- AC-9 ✅ Routed PM → Developer; no ADR required; no existing authority was changed
