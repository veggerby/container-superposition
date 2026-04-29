# Feature Specification: Intent-Driven Generation and Safe Modify Mode

**Feature Branch**: `008-intent-driven-generation`
**Created**: 2026-03-26
**Status**: Draft
**Input**: Product review notes for AI-assisted generation, modify mode, and `--adopt` enrichment
**Tracking Issues**: #113 (primary), #130 (explain output), #131 (repo signals for adopt)

## Review & Approval _(mandatory before implementation)_

- **Spec Path**: `docs/specs/008-intent-driven-generation/spec.md`
- **Commit Status**: Committed
- **Review Status**: PENDING
- **Implementation Gate**: No implementation code may begin until this spec is committed and reviewed.

## Summary

Add an intent-driven generation surface that lets a user describe the environment they want in
natural language while preserving the existing deterministic composition pipeline.

The LLM is limited to intent extraction. All product rules, overlay selection, dependency
resolution, conflict handling, and manifest generation remain deterministic and testable.

This feature covers:

- a new prompt-driven `generate` flow
- a diff-based modify mode against an existing manifest or project file
- optional `--adopt` repository-signal enrichment
- preview-first UX with confirmation by default
- machine-readable explanation and ambiguity output

This feature does not create a second composition system. It must reuse the same mapping,
composition, planning, and file-writing pipeline already used by `init`, `regen`, and `plan`.

## Product Principles

- **LLM as extractor, not sovereign**: model output is advisory intent, never final configuration.
- **Deterministic after extraction**: mapping and diff application remain pure functions.
- **Preview before write**: interactive mode shows what will change before files are touched.
- **Ambiguity surfaced, not hidden**: uncertain intent must become an explicit user decision or a
  non-interactive failure.
- **Grounded enrichment only**: repo signals may inform extraction but must be concrete and
  inspectable.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Generate from natural language (Priority: P1)

A user describes the environment they want in plain language and expects the tool to propose a
valid configuration using the existing overlay model.

**Acceptance:**

1. `generate "Node API with Postgres and Grafana"` produces a deterministic proposal that resolves
   to existing overlay IDs, not free-form infrastructure text.
2. The resulting configuration is composed through the normal manifest/questionnaire pipeline.
3. No file writes occur until the proposal is previewed and confirmed, unless `--no-interactive`
   is set.

### User Story 2 — Preview-first approval flow (Priority: P1)

A user wants to see the interpreted result before generation changes their repository.

**Acceptance:**

1. Interactive `generate` shows:
    - interpreted intent summary
    - selected and removed overlays
    - target, minimal, and editor changes
    - manifest diff before write
2. Interactive mode asks for confirmation before writing files.
3. `--no-interactive` skips confirmation, but only when the interpreted result is unambiguous.

### User Story 3 — Safe modify mode (Priority: P1)

A user has an existing manifest or project file and wants to change it using natural language
without rebuilding the environment from scratch conceptually.

**Acceptance:**

1. `generate "add Grafana and Prometheus" --modify` loads the current source configuration and
   applies a diff-based intent instead of reinterpreting the whole stack from zero.
2. Preview output clearly separates unchanged selections from proposed additions, removals, and
   replacements.
3. Foundational changes require explicit confirmation in interactive mode:
    - language overlay replacement
    - target change
    - editor change
    - minimal-mode change
    - removals that cascade through dependencies

### User Story 4 — Ambiguity handling (Priority: P1)

A user gives a vague request and expects the tool to surface uncertainty instead of pretending the
result is obvious.

**Acceptance:**

1. Ambiguous prompts such as `"observability"` or `"local AI setup"` yield explicit ambiguity items.
2. Interactive mode presents the ambiguity and asks the user to choose or confirm the narrower
   interpretation.
3. `--no-interactive` fails with a clear error listing the unresolved ambiguities and suggested
   next input.

### User Story 5 — Explanation and traceability (Priority: P1)

A user wants to understand why a proposal was made and whether it came from the prompt, repo
signals, or deterministic product rules.

**Acceptance:**

1. The generation result includes a machine-readable explanation object.
2. Each proposed overlay or setting change can reference one or more reasons such as:
    - direct prompt match
    - inferred from repo signal
    - required dependency
    - conflict resolution choice
    - suggested but optional
3. Verbose or explain output can show ambiguities and rejected alternatives without requiring raw
   model output to be stored.

### User Story 6 — `--adopt` enrichment (Priority: P2)

A user runs prompt-driven generation inside an existing repository and wants repo signals to make
the interpretation less speculative.

**Acceptance:**

1. `generate "set this repo up for local development" --adopt` passes detected repo signals into
   extraction.
2. Repo signals are shown in explanation output so the user can tell what was inferred from the
   repository versus the prompt.
3. Missing or low-signal repositories still work; `--adopt` enriches extraction but does not
   become a hard requirement.

### User Story 7 — Provider/configuration failures are blunt (Priority: P2)

A user attempts generation without required provider configuration and expects a direct failure.

**Acceptance:**

1. Missing API key, model, or provider settings fail before generation starts.
2. The error states what is missing, where the tool looked, and how to fix it.
3. No partial writes occur on provider/configuration failure.

## CLI Contract

This spec introduces a new `generate` command rather than overloading `init`.

Rationale:

- `init` remains the direct, explicit questionnaire flow.
- `generate` communicates intent interpretation and proposal behavior clearly.
- The underlying composition engine remains shared.

Initial contract:

- `generate "<prompt>"` — create a proposal from natural language
- `generate "<prompt>" --modify` — apply a diff-style proposal to the current manifest or project
  file
- `generate "<prompt>" --adopt` — enrich extraction with repository signals
- `generate "<prompt>" --explain` — include detailed explanation output in text or JSON mode
- `generate "<prompt>" --no-interactive` — apply without confirmation only when no ambiguity
  remains

Additional flags:

- `generate "<prompt>" --scaffold` — also generate `.devcontainer/` output after writing the
  project file
- `generate "<prompt>" --from-scratch` — force from-scratch mode even when an existing project
  file is present
- `generate "<prompt>" --json` — emit machine-readable result to stdout

Naming note:

- `generate` is acceptable for discoverability in v1.
- Better names such as `design`, `compose`, or `plan` may be considered later, but are out of
  scope for this spec.

### Output Model

`generate` writes `superposition.yml` as its primary output. This aligns with the project-file-
canonical model defined in spec 009 (#134).

- From-scratch mode: writes a new `superposition.yml`
- Modify mode: reads the existing `superposition.yml`, applies the diff, writes the updated
  project file with a `.bak` backup of the original
- `--scaffold` additionally generates `.devcontainer/` through the normal composition pipeline
- Without `--scaffold`, only the project file is written

Modify mode reads the project file (`superposition.yml`), not the generated manifest
(`superposition.json`). If only a manifest exists and no project file, modify mode should
fail with guidance to run migration first (per spec 009 FR-004).

### Edge Cases

- What happens when the model returns overlay IDs not in the catalog? They appear in the
  "not matched / unsupported" section of explanation output; they are never written to the
  project file.
- What happens when the model returns an empty result? The system shows "no overlays selected"
  and asks for confirmation. Non-interactive mode fails.
- What happens when the user's prompt contradicts the existing manifest in modify mode?
  The diff is applied as-is and preview shows the resulting changes. The user confirms or
  aborts.
- What happens when `--adopt` detects signals that conflict with the prompt? Both are passed
  to extraction; the explanation output distinguishes prompt-sourced from repo-sourced
  selections.
- What happens when the same overlay appears in both `addOverlays` and `removeOverlays` in
  a modify diff? The system treats this as a no-op for that overlay and includes a warning.
- What happens when the provider returns malformed or unparseable output? The system fails
  with a clear error; no files are written.
- What happens when modify mode is used but no project file or manifest exists? The system
  falls back to from-scratch mode with a notice, or fails if `--modify` was explicit.

## Technical Design

### Architecture

The flow is intentionally split into four stages:

1. **Context collection**
    - prompt text
    - optional repo signals from `--adopt`
    - compact overlay catalog context
    - current manifest/project configuration when `--modify` is set
2. **Intent extraction**
    - provider/model produces a structured intent object, not final answers
3. **Deterministic mapping**
    - `mapIntentToAnswers()` converts extracted intent into questionnaire answers
    - `applyDiffToAnswers()` applies modify-mode intent against current answers
4. **Existing composition pipeline**
    - normal dependency resolution, conflict handling, planning, diffing, manifest generation, and
      file writing

No AI-specific composition path is allowed.

### Structured Intent Types

The model-facing output must be schema-validated and constrained to product vocabulary.

#### `ExtractedIntent`

Fields:

- `mode`: `create` | `modify`
- `requestedCapabilities`: normalized capability requests from prompt text
- `explicitOverlayIds?`: overlay IDs only when the prompt names them directly
- `settingChanges?`: target, minimal, editor, stack, or other questionnaire-level choices
- `ambiguities`: unresolved interpretation branches that require confirmation or selection
- `rationale`: compact explanation entries tied to prompt phrases or repo signals

#### `RepoSignal`

Fields:

- `kind`
- `value`
- `sourcePath`
- `confidence`
- `notes?`

Examples include detected language, package manager, test tooling, Docker/Kubernetes files, editor
metadata, CI metadata, or observability markers.

#### `GenerationExplanation`

Fields:

- `prompt`
- `repoSignals`
- `resolvedSelections`
- `resolvedDependencies`
- `resolvedConflicts`
- `alternativesConsidered?`
- `ambiguities`
- `warnings`

This object must be machine-readable and available in JSON output. Text output may summarize it.

### Preview Model

Before writing files, `generate` must build a preview object that reuses existing plan and diff
primitives.

#### `GeneratePreview`

Fields:

- `interpretedIntent`
- `overlayChanges`
- `settingChanges`
- `manifestDiff`
- `fileDiffSummary`
- `requiresConfirmation`
- `destructiveChanges`
- `ambiguities`
- `explanation`

`manifestDiff` is mandatory for modify mode and recommended for create mode whenever a baseline
manifest already exists.

### Guardrails for Modify Mode

Modify mode must classify proposals as either ordinary or destructive.

A proposal is destructive when it includes any of:

- removal or replacement of a language overlay
- target changes
- editor changes
- minimal-mode toggles
- removal of overlays that trigger dependency cascades
- regeneration steps that would delete previously generated files

Behavior:

- interactive mode: destructive proposals require an explicit approval step after preview
- non-interactive mode: destructive proposals are allowed only when the user opted into
  `--no-interactive` and no ambiguity remains
- backups continue to follow existing backup policy; preview is the primary safeguard, backup is
  secondary

### Overlay Catalog Context Strategy

The extraction step may use overlay catalog context, but the first implementation must avoid raw,
unbounded catalog injection.

Requirements:

- provide compact structured overlay metadata instead of full README bodies
- include category, tags, conflicts, dependencies, and short descriptions
- support future narrowing by category or repo signals without redesigning the interface

Using the full catalog in a compact structured form is acceptable initially while the catalog
remains manageable.

### Runtime and Dependency Constraint

This feature must preserve the current `node >=20.0.0` runtime unless a separate approval decides
otherwise.

If implementation requires a Node runtime bump to `>=22.13.0`, that change is not incidental and
must be handled as a separate platform decision with:

- explicit justification in the spec review
- documentation updates
- changelog entry calling out the platform requirement change
- CI and contributor workflow updates

## Testing Strategy

### Deterministic contract tests

Add thin contract tests around prompt-class intent mapping without binding tests to a live model.
These tests may mock the extracted intent object and validate deterministic mapping behavior.

Minimum coverage:

- from-scratch web app
- observability add-on
- AI/local LLM setup
- docs setup
- Kubernetes/tooling setup
- add/remove/replace modify actions
- ambiguity escalation cases
- destructive modify previews

### Integration tests

Add integration coverage for:

- preview-first interactive flow
- non-interactive success path
- non-interactive ambiguity failure
- missing provider configuration failure
- `--adopt` signal enrichment included in explanation output

## Functional Requirements

- **FR-001**: Natural-language generation must reuse the existing deterministic composition
  pipeline.
- **FR-002**: `mapIntentToAnswers()` and `applyDiffToAnswers()` remain pure, LLM-free logic.
- **FR-003**: Interactive `generate` defaults to preview and confirmation before writing files.
- **FR-004**: Modify mode must be diff-based against an existing configuration source.
- **FR-005**: The system must emit machine-readable explanation data for proposals.
- **FR-006**: Ambiguity must be surfaced explicitly; non-interactive mode must fail on unresolved
  ambiguity.
- **FR-007**: `--adopt` enriches extraction with concrete repo signals and exposes them in
  explanation output.
- **FR-008**: Destructive modify proposals must be identified and highlighted in preview output.
- **FR-009**: Missing provider/model configuration must fail early with clear remediation.
- **FR-010**: Overlay catalog context must use compact structured metadata rather than raw
  long-form docs.
- **FR-011**: This feature must not require a Node runtime bump unless separately approved as a
  platform change.

## Dependencies & Impact

- **Depends on**: spec 009 (#134) for the project-file-canonical output model. `generate` must
  write `superposition.yml` as primary output, consistent with the simplified init/regen model.
- **Enables**: #130 (explain output), #131 (richer repo signals for adopt), #132 (archetypes)
- **Affected Commands**: new `generate` command; no changes to `init`, `regen`, `plan`, `list`,
  `explain`, `doctor`
- **New Dependencies**: LLM provider package (e.g. `@mastra/core` or equivalent). This is the
  only command that requires network access and an API key.
- **Compatibility Impact**: Additive — no existing command behavior changes
- **Required Documentation Updates**: README.md (new command), CHANGELOG.md, quickstart
- **Verification Plan**: Contract tests for deterministic mapping, integration tests for
  preview/confirm flow, provider-failure tests, snapshot tests for representative prompt classes

## Assumptions

- The LLM is used only for intent extraction. All downstream logic is deterministic.
- The overlay catalog is small enough for compact structured injection in v1. Context-window
  optimization is a follow-up concern.
- A single validated provider implementation is sufficient for initial release. Multi-provider
  support is configuration, not architecture.
- `--adopt` repo signals are best-effort heuristics, not guarantees. Missing signals are
  acceptable; false signals must not cause silent data loss.
- The `generate` command is strictly additive. It does not replace `init` or change the
  interactive questionnaire flow.

## Success Criteria

- **SC-001**: A user can generate a valid `superposition.yml` from a natural-language prompt
  for at least five representative workload types (web API, observability, AI/LLM, docs, k8s)
  without editing the output.
- **SC-002**: Modify mode can add and remove overlays from an existing project file without
  losing unrelated settings.
- **SC-003**: Interactive mode never writes files without showing a preview and receiving
  confirmation.
- **SC-004**: Non-interactive mode fails on ambiguity rather than guessing.
- **SC-005**: Missing provider configuration fails before any file I/O with a remediation
  message.
- **SC-006**: Explanation output can distinguish prompt-sourced, repo-signal-sourced, and
  dependency-resolved selections.
- **SC-007**: All deterministic mapping logic is covered by contract tests that do not require
  a live LLM provider.

## Non-Goals for This Spec

- Richer repo-intelligence heuristics beyond an initial useful signal set (#131)
- Recipe/archetype-aware prompting beyond the base structured intent model (#132)
- Dedicated `--explain` flag as a standalone feature (#130)
- New overlay additions such as Open WebUI, pgvector/Qdrant, or k3d (#133)
- Provider-specific prompt optimization beyond what is needed for one validated implementation
- Team custom presets (#110)

These are valid follow-up items once the core generate/modify flow is merged.
