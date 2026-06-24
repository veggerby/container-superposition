# Feature Specification: Init and Regen Guided Flows

**Spec ID**: `032-init-and-regen-guided-flows`
**Taxonomy**: `CLI-UX`
**Created**: 2026-06-24
**Author**: PM Agent
**Status**: Draft
**Input**: Reverse-spec existing interactive CLI UX for first-run generation, replay, and local-safety flows.

---

## Request Classification

Reverse-spec from existing docs, code, tests, presets, and project-config behavior. Scope narrow to `init` / `regen` user-facing flow, not discovery commands or doctor/adopt workflows.

## Problem Statement

`init` and `regen` act as primary onboarding and repeat-use CLI surfaces. Current behavior spans:

- first-run guided questionnaire
- non-interactive replay from project file or manifest
- automatic project-file persistence on `init`
- local-only customization safeguards
- backup, summary, progress, and success guidance

Behavior exists across docs, code, and tests, but intent fragmented and some user-facing guidance drifts from implementation.

## User Goals

### First-time user

- Start from preset or manual overlay selection without knowing repo internals.
- Make stack, image, overlay, output, and editor choices in guided order.
- See concise summary before files are written.
- Finish with clear next steps.

### Returning user

- Re-run from committed project file or existing manifest without re-answering everything.
- Override small details for one run without mutating source-of-truth unexpectedly.
- Get backup behavior and replay messaging that explain what happened.

### Team maintainer using local-only config

- Layer local env, mounts, shell, and customizations safely.
- Avoid accidentally committing local-only generated output.
- Get explicit warnings when local config is ignored, invalid, or unsafe to share.

## Scope

### In scope

- Interactive questionnaire sequence for `init`.
- Preset-first entry decision, preset expansion, and optional customization.
- Stack, base image, overlay, conflict-resolution, target, editor, output, and parameter prompts.
- `init` / `regen` replay modes from project file or manifest.
- Automatic project-file write/update behavior during `init`.
- Backup messages, summary box, spinner, success box, warnings, and next steps.
- Local config detection, gitignore assistance, and tracked-file safety warnings.
- Source-selection and flag-conflict validation before generation.

### Non-goals

- Overlay discovery commands (`list`, `explain`, `plan`, `hash`).
- Doctor diagnostics and repair UX.
- Adopt and migrate conversion workflows.
- Overlay composition internals beyond externally visible prompt outcomes.

## Must Preserve

- `superposition.yml` / `.superposition.yml` stays persisted source-of-truth for replay workflows.
- Presets remain optional; manual overlay composition remains available.
- Generated output remains normal files users can edit directly.
- `custom/` remains preserved escape hatch rather than hidden internal mechanism.
- Non-interactive runs remain possible from persisted input and CLI selections.

## Constraints

- Must align with ADR 001 project-file-first replay authority.
- Must not auto-mutate Git index; tracked generated files still require manual `git rm --cached` follow-up when needed.
- Must preserve both interactive and unattended replay paths.
- Must keep warning, blocked, and success states understandable in plain terminal output without relying on docs lookup.

## Assumptions

- Existing questionnaire, replay, and summary primitives remain ownership boundary for this work; spec clarifies behavior, not command taxonomy.
- Manifest replay remains compatibility path, not steady-state shared workflow.
- Missing `docs/foundation.md` means ADR 001 plus live workflow docs remain current authority for cross-feature routing.

## Proposed Behavior

### 1. `init` always frames generation around persisted project state

`init` MUST detect existing repository project files before prompting.

- If exactly one supported project file exists, that file seeds defaults and is updated after run.
- If both supported project files exist, command fails before prompting.
- If none exists, `init` writes `.superposition.yml` by default after collecting final answers.

This makes guided setup and future replay part of one flow, not separate opt-in feature.

### 2. Questionnaire starts with entry choice, then narrows decisions progressively

Interactive `init` MUST present choices in roughly this order:

1. preset vs custom start
2. base template
3. preset expansion choices when applicable
4. base image / custom image
5. overlay selection and optional preset/manifest customization
6. conflict resolution when selection invalid
7. container name, output path, port offset
8. editor profile
9. deployment target only when compatibility warning matters
10. overlay parameters for selected overlays

Prompts SHOULD appear one decision at time and adapt to prior selections.

### 3. Replay modes distinguish source and override intent

Non-interactive and replay flows MUST make source visible before writes begin:

- manifest replay banner when running from manifest
- project-file replay banner when running from project file
- override banner when replay source is reused with one-run overrides
- targeted failure guidance when source flags conflict or when clean-generation flags are mixed with persisted-source replay

Replay flows MUST support backup creation before overwriting existing generated output, with default behavior differing inside vs outside git repos.

### 4. Overlay selection auto-resolves dependencies and forces explicit conflict cleanup

When users choose overlays manually or customize preset/manifest selections:

- required dependencies are auto-added
- missing overlays from older manifests are skipped with warning
- conflicting overlays trigger explicit remove-choice loop
- user cannot continue until at least one side of conflict is removed

### 5. Local-only config gets explicit safety contract

When `superposition.local.yml` exists, generation MUST:

- apply only supported local-only fields
- ensure root `.gitignore` contains local config ignore entry when possible
- explain whether generated output is safely ignored for new files
- warn when existing tracked generated files still need manual untracking
- fail before writes when local config contains unsupported keys
- warn when ignored dotfile variant `.superposition.local.yml` exists instead of supported filename

### 6. Completion feedback summarizes output and next steps by mode

Before write, tool MUST show configuration summary that answers three questions clearly: what source was used, what will be written, and what user still needs to do manually.

During write, tool MUST show spinner-based progress.

After success, tool MUST show mode-specific next steps:

- init: copy `.env`, open workspace, reopen in container, run `doctor`
- regen: rebuild container, test changes, review `custom/`
- manifest-only / no-scaffold: commit persisted config and use replay commands later

Warnings about security (`docker-sock`), target mismatch, port-count risk, missing port offset, and tracked generated files that still need manual untracking SHOULD appear in summary output when applicable.

## UX Contract

### Canonical interaction model

First visible step depends on mode:

- fresh `init`: start with source-of-truth framing, then entry choice (`Preset` or `Build my own`)
- `init` with existing project file: show that file will seed answers before first prompt
- `regen` / replay path: show replay banner before any summary, backup, or write step
- invalid multi-source input: fail before any prompt or spinner

Prompt sequence contract:

1. choose starting path
2. answer only branch-specific follow-up prompts
3. review conflict/dependency consequences immediately after overlay changes
4. review write summary once, after all decisions collected
5. enter write phase only after summary shown

Questionnaire MUST never ask for information already fixed by chosen source, flags, or prior answers.

### Interaction rules

- Preset path MUST identify preset as starting point, then separate preset-driven choices from optional custom overlay changes.
- Manual path MUST present overlay composition as first-class path, not fallback or advanced-only path.
- Dependency auto-adds MUST be announced in same interaction where selection changes, before user advances.
- Conflict resolution MUST block forward progress until selection becomes valid.
- Deployment target prompt appears only when target choice changes compatibility guidance or warning copy.
- Parameter prompts appear after final overlay set is known.
- Replay overrides MUST be framed as one-run overrides; copy must not imply persisted source changed unless command will rewrite project file.

### State behavior

- Existing project file seeds defaults; user edits from those defaults rather than re-answering from blank state.
- Existing manifest replay state stays read-only unless flow explicitly persists updated project state.
- Summary state MUST persist chosen source, selected overlays, output path, editor, target, backup plan, and outstanding manual follow-up.
- Local-only config warnings MUST persist into summary and success output when manual cleanup still required.
- Spinner state MUST communicate write-in-progress only; warnings and decisions belong before or after spinner, not inside it.

### Copy and feedback contract

- Use `project file` for canonical replay source; use `manifest` only for compatibility or explicit manifest replay.
- Summary MUST include explicit labels for `Source`, `Will write`, and `Manual follow-up`.
- If backup will be skipped because repo is under git, say so explicitly.
- If backup will be created, show destination before writes begin.
- Success state MUST distinguish `Init complete` from `Regeneration complete`.
- Local config warnings MUST say whether problem is auto-protected, needs manual untracking, or blocks write.
- Empty-warning state: if no manual follow-up remains, summary says so instead of leaving section absent.

### QA scenario scripts

1. Fresh repo, no project file: user sees entry choice first, summary names `.superposition.yml` as file to be created, success gives init next steps.
2. Repo with one project file: user sees seeded-state framing before prompts, summary names same file as update target.
3. Replay with overrides: banner names replay source and one-run override intent before writes.
4. Overlay conflict: user cannot exit conflict loop without removing at least one conflicting overlay.
5. Local config with tracked generated files: warning appears before write, repeats in summary, success still tells user manual untracking remains.

## Acceptance Criteria

| # | Criterion |
| --- | --- |
| AC-1 | `init` detects zero/one/two repository project files and behaves as create/update/fail respectively before generation proceeds. |
| AC-2 | Interactive questionnaire supports preset-first and custom-first starts, with preset-specific follow-up choices only when preset selected. |
| AC-3 | Overlay selection auto-adds `requires:` dependencies and forces explicit user-driven conflict resolution before continuing. |
| AC-4 | Replay runs from project file or manifest present distinct non-interactive status banners and preserve one-run CLI overrides without rewriting source selection semantics for future runs. |
| AC-5 | `init` writes or updates repository project file on successful runs, including final selected overlays, preset metadata, output path, editor, target, and parameters. |
| AC-6 | Local config flows warn or fail clearly for ignored local config files, unsupported local keys, tracked generated output, and unsafe shareable output when `devcontainerGitignore` is not enabled. |
| AC-7 | Source-selection conflicts fail before writes with targeted guidance that tells users whether to switch to `init`, `regen`, `--from-project`, or `--from-manifest`. |
| AC-8 | Backup behavior is visible to user and defaults to skip inside git repos unless explicitly forced. |
| AC-9 | Summary and success output explicitly state source used, files or directories being updated, manual follow-up for tracked files or `custom/`, and mode-specific next steps. |
| AC-10 | Automated coverage exists for replay mode, project-file write/update behavior, local-config safety messaging, and summary/next-step behavior. |
| AC-11 | Ownership is explicit: `run.ts` owns source framing/persistence orchestration, questionnaire owns prompt order and conflict loop, project-config owns persisted config IO, and summary utilities own rendering only. |
| AC-12 | Empty, warning, and blocked states are defined for fresh init, seeded init, replay, local-config safety, and conflict-resolution paths. |

## Evidence Basis

- `tool/cli/run.ts` — source detection, replay banners, project-file write, local safety, summary, spinner, success/error flow.
- `tool/cli/args.ts` — source-flag conflicts, preset/param parsing, non-interactive gating.
- `tool/questionnaire/questionnaire.ts` — prompt order, preset/custom entry, dependency/conflict loops, target/editor/parameter prompts.
- `tool/questionnaire/presets.ts` — preset expansion and non-interactive choice resolution.
- `tool/schema/project-config.ts` — project/local config loading, validation, answer hydration, persistence.
- `tool/utils/summary.ts` — warnings, tips, next-step generation.
- `tool/__tests__/commands.test.ts`, `tool/__tests__/local-config.test.ts`, `tool/__tests__/summary.test.ts`, `tool/__tests__/presets.test.ts` — behavioral coverage for replay, local safety, next steps, preset structure.
- `docs/ux.md`, `docs/workflows.md`, `docs/presets.md` — user-facing intent and current messaging.

## Evidence Confidence

**Medium-High**

Core flow strongly evidenced by code and tests. Lower confidence only on prompt-budget policy, not on source framing, replay, local-safety, or summary-state behavior.

## Implementation-vs-Intent Mismatches

1. `docs/ux.md` promises 5–8 questions and per-question confirmation/checkmarks; current questionnaire can exceed that and does not print confirmation after every answer.
2. `docs/ux.md` describes non-interactive mode as distinct blue-box flow; current implementation has several replay/status variants, plus automatic project-file write behavior not called out there.
3. `tool/utils/summary.ts` still recommends committing `superposition.json` in some flows, while broader docs now push project-file-first workflow.

## Technical Design

### Architecture Ownership

- `tool/cli/run.ts` owns mode selection, source discovery, source-conflict failures, replay framing, backup policy messaging, local-config safety messaging, project-file persistence after successful `init`, and success-path routing.
- `tool/questionnaire/questionnaire.ts` owns interactive decision order, seeded defaults, preset/custom branching, dependency auto-add notices, conflict-resolution loop, and parameter prompting after final overlay set is known.
- `tool/questionnaire/presets.ts` owns preset expansion and preset-choice hydration only. It must not choose replay mode or persistence behavior.
- `tool/schema/project-config.ts` owns project-file discovery, read/write, manifest/project answer hydration, local-config validation, and canonical serialization of persisted selection.
- `tool/utils/summary.ts` owns rendering of summary, warnings, tips, and next steps from already-resolved run state. It must not rediscover source mode or invent workflow routing from partial inputs.
- `tool/cli/args.ts` owns flag exclusivity and CLI surface declaration. It must not duplicate source-resolution behavior already owned by `run.ts`.

### System Boundaries

- Canonical replay authority stays repository project file when present.
- Manifest replay remains compatibility input only; it may seed answers, but it does not redefine steady-state source-of-truth semantics.
- Local-only config may enrich generated output, but it does not write back into shared project-file state or manifest state.
- Generated `.devcontainer/` output remains materialized artifact, not canonical source.
- Git safety stops at warnings, ignore-file updates, and manual untrack guidance. No automatic Git index mutation.

### Canonical Data Flow

1. Resolve project root and parse CLI flags.
2. Detect persisted sources: project file first, manifest only when explicitly requested or used for legacy compatibility flow.
3. Load shared project config and local config before questionnaire so defaults and safety messages use final repository context.
4. Hydrate answer defaults from project file or manifest, then merge CLI overrides.
5. Run questionnaire only for decisions still unset; questionnaire owns preset expansion, overlay dependency resolution, and conflict cleanup.
6. Materialize final answer set, then validate source conflicts, local-config safety, and output-path/backup plan before writes.
7. Show summary with explicit `Source`, `Will write`, and `Manual follow-up` sections.
8. If write proceeds, generate output, write/update project file for successful `init`, preserve shared customizations, then emit mode-specific success guidance.

### Interfaces and Invariants

- Input sources: CLI flags, repository project file, optional local config, optional manifest, interactive answers.
- Output artifacts: repository project file, generated `.devcontainer/`, optional `superposition.json`, optional backups, optional root `.gitignore` entry for local config.
- Invariants:
  - successful `init` persists canonical shared selection back to repository project file unless command is explicitly manifest-only or no-scaffold path already defined elsewhere
  - replay banners and summary framing use one source label for entire run
  - questionnaire never re-asks value fixed by source or flag
  - dependency auto-add may happen automatically; conflict removal always requires explicit user choice
  - local-only values never become shared persisted defaults

### Implementation Slices

1. Source-of-truth framing hardening: unify project-file detection, manifest-compatibility messaging, and invalid multi-source failures.
2. Questionnaire contract hardening: seeded-init framing, preset/custom branch order, dependency/conflict loop, parameter-after-final-selection rule.
3. Summary contract hardening: explicit source/write/manual-follow-up sections plus backup visibility.
4. Local-config safety hardening: unsupported-key failure, ignored-dotfile warning, tracked-generated-file warning, gitignore assistance.
5. Success/next-step hardening: mode-specific copy aligned with project-file-first replay.
6. Docs cleanup slice: stale architecture/workflow copy updated to same source model.

### Risk Notes

- `write-manifest-only` and `--no-scaffold` paths can drift from normal `init` persistence rules if summary and success copy branch late.
- Existing docs still contain manifest-first language; implementation-safe framing depends on docs cleanup landing with command-copy cleanup.
- Source framing currently spans `args.ts`, `run.ts`, and `summary.ts`; duplicated copy risks inconsistent replay guidance.
- Seeded questionnaire defaults can silently mask one-run overrides if precedence order is not regression-tested.

### Test Plan

- Command tests for zero/one/two project-file detection, seeded `init`, manifest replay, project replay, and source-conflict failures.
- Questionnaire tests for preset/custom entry, dependency auto-add announcement, blocking conflict loop, and parameter prompt ordering.
- Local-config tests for unsupported keys, ignored filename warning, gitignore assistance, tracked generated output warning, and non-persistence of local-only values.
- Summary tests for explicit source/write/manual-follow-up sections, backup shown/skipped behavior, and mode-specific next steps.
- Regression tests for `write-manifest-only` and `--no-scaffold` so source framing and persistence semantics stay coherent.

## Architecture Decision Impact

Aligned with ADR 001. `docs/foundation.md` absent; no additional foundation authority to reconcile.

- Governing ADR: `docs/adr/adr001-project-file-first-replay-and-regeneration.md`
- No ADR amendment needed for this scope.

## Open Questions

- Prompt-budget language remains UX guidance, not architecture invariant. Questionnaire branching may reduce prompts, but exact count is not contractual.
- Repository still needs stale `docs/architecture.md` replacement or rewrite so docs authority matches ADR 001 and workflow docs.

## Routing Decision

**PM → Developer**

Reason: ownership, data flow, invariants, slices, risks, and test surface now implementation-safe under ADR 001.
