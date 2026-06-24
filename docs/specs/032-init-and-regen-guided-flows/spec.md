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

### Out of scope

- Overlay discovery commands (`list`, `explain`, `plan`, `hash`).
- Doctor diagnostics and repair UX.
- Adopt and migrate conversion workflows.
- Overlay composition internals beyond externally visible prompt outcomes.

## Must Preserve

- `superposition.yml` / `.superposition.yml` stays persisted source-of-truth for replay workflows.
- Presets remain optional; manual overlay composition remains available.
- Generated output remains normal files users can edit directly.
- Non-interactive runs remain possible from persisted input and CLI selections.

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

Non-interactive and replay flows MUST make source visible:

- manifest replay banner when running from manifest
- project-file replay banner when running from project file
- override banner when replay source is reused with one-run overrides

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

Before write, tool MUST show configuration summary.

During write, tool MUST show spinner-based progress.

After success, tool MUST show mode-specific next steps:

- init: copy `.env`, open workspace, reopen in container, run `doctor`
- regen: rebuild container, test changes, review `custom/`
- manifest-only / no-scaffold: commit persisted config and use replay commands later

Warnings about security (`docker-sock`), target mismatch, port-count risk, and missing port offset SHOULD appear in summary output when applicable.

## Acceptance Criteria

| # | Criterion |
| --- | --- |
| AC-1 | `init` detects zero/one/two repository project files and behaves as create/update/fail respectively before generation proceeds. |
| AC-2 | Interactive questionnaire supports preset-first and custom-first starts, with preset-specific follow-up choices only when preset selected. |
| AC-3 | Overlay selection auto-adds `requires:` dependencies and forces explicit user-driven conflict resolution before continuing. |
| AC-4 | Replay runs from project file or manifest present distinct non-interactive status banners and preserve one-run CLI overrides without rewriting source selection semantics for future runs. |
| AC-5 | `init` writes or updates repository project file on successful runs, including final selected overlays, preset metadata, output path, editor, target, and parameters. |
| AC-6 | Local config flows warn or fail clearly for ignored local config files, unsupported local keys, tracked generated output, and unsafe shareable output when `devcontainerGitignore` is not enabled. |
| AC-7 | Backup behavior is visible to user and defaults to skip inside git repos unless explicitly forced. |
| AC-8 | Success output provides mode-specific next steps for init, regen, and manifest-only/no-scaffold runs. |
| AC-9 | Automated coverage exists for replay mode, project-file write/update behavior, local-config safety messaging, and summary/next-step behavior. |

## Evidence Basis

- `tool/cli/run.ts` — source detection, replay banners, project-file write, local safety, summary, spinner, success/error flow.
- `tool/cli/args.ts` — source-flag conflicts, preset/param parsing, non-interactive gating.
- `tool/questionnaire/questionnaire.ts` — prompt order, preset/custom entry, dependency/conflict loops, target/editor/parameter prompts.
- `tool/questionnaire/presets.ts` — preset expansion and non-interactive choice resolution.
- `tool/schema/project-config.ts` — project/local config loading, validation, answer hydration, persistence.
- `tool/utils/summary.ts` — warnings, tips, next-step generation.
- `tool/__tests__/commands.test.ts`, `tool/__tests__/local-config.test.ts`, `tool/__tests__/summary.test.ts`, `tool/__tests__/presets.test.ts` — behavioral coverage for replay, local safety, next steps, preset structure.
- `docs/ux.md`, `docs/workflows.md`, `docs/presets.md` — user-facing intent and current messaging.

## Confidence

**Medium-High**

Core flow strongly evidenced by code and tests. Lower confidence on exact intended prompt-count philosophy because docs and implementation diverge.

## Implementation-vs-Intent Mismatches

1. `docs/ux.md` promises 5–8 questions and per-question confirmation/checkmarks; current questionnaire can exceed that and does not print confirmation after every answer.
2. `docs/ux.md` describes non-interactive mode as distinct blue-box flow; current implementation has several replay/status variants, plus automatic project-file write behavior not called out there.
3. `tool/utils/summary.ts` still recommends committing `superposition.json` in some flows, while broader docs now push project-file-first workflow.

## ADR Impact

Covered by `docs/adr/adr001-project-file-first-replay-and-regeneration.md`.

No feature-local ADR needed beyond this cross-feature replay authority decision. `docs/foundation.md` still absent during review, so alignment used `AGENTS.md`, `docs/architecture.md`, `docs/filesystem-contract.md`, `docs/merge-strategy.md`, and related specs.

## Open Questions

1. Should future UX contract optimize for fewer prompts by default, or preserve current exhaustive prompt set when no project file exists?
2. Should project-file auto-write on every `init` remain unconditional product contract, or become explicit/optional in future guidance?
3. `docs/architecture.md` still states “no update command” and “no state tracking,” which conflicts with observed replay model. Docs cleanup needed under ADR 001.

## Routing Decision

**PM → UX**

Reason: existing behavior clear enough to spec, but prompt-count philosophy, replay wording, and summary copy need UX-level contract refinement before future implementation changes.