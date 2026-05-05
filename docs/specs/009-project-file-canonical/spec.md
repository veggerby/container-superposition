# Feature Specification: Project File as Canonical Input

**Feature Branch**: `009-project-file-canonical`
**Created**: 2026-03-26
**Status**: Draft
**Input**: Simplify the two-file data model so `superposition.yml` is the single canonical input and `superposition.json` is an output-only generated artifact.
**Tracking Issue**: #134

## Review & Approval _(mandatory before implementation)_

- **Spec Path**: `docs/specs/009-project-file-canonical/spec.md`
- **Commit Status**: Committed
- **Review Status**: PENDING
- **Implementation Gate**: No implementation code may begin until this spec is committed and reviewed.

> This spec completes the vision started by [002-superposition-config-file](../002-superposition-config-file/spec.md). That spec introduced the project config file as an _optional_ input alongside the existing manifest. This spec makes it the _only_ input.

## Problem Statement

The tool has three entry points (`init`, `regen`, and the future `generate`) that disagree on which file is authoritative:

- `init` writes the project file only when `--project-file` is explicitly requested. Its default output is `.devcontainer/` with a `superposition.json` manifest inside.
- `regen` accepts either file as input, preferring the project file when present but falling back to the manifest silently.
- Future entry points (e.g. AI-powered generation) write the project file first and scaffold optionally.

This creates a state space where users can have only the manifest, only the project file, both files agreeing, or both files disagreeing — with no way to tell which is authoritative. Discrepancy detection, documentation, and onboarding all suffer from this ambiguity.

## Design Principles

1. **One source of truth.** A single file defines intent. All other files are derived from it.
2. **Input and output are distinct files with distinct purposes.** The project file (`superposition.yml`) captures what the user _wants_. The manifest (`superposition.json`) records what was _produced_.
3. **Migration over breakage.** Existing repos with only a manifest must have a clear, guided path to the new model.
4. **Offline-first.** This change must not introduce any network dependency or service requirement.

---

## User Scenarios & Testing

### User Story 1 — Project file is always produced (Priority: P1)

A developer runs the interactive setup for the first time and receives a project file as the primary persistent output, without needing to know about or request a special flag.

**Why this priority**: The project file should be the default outcome of every setup interaction, not an opt-in afterthought.

**Acceptance Scenarios**:

1. **Given** a developer runs `init` interactively, **When** the questionnaire completes, **Then** a `superposition.yml` is written at the repository root before any `.devcontainer/` output is generated.
2. **Given** a developer runs `init` with `--no-scaffold`, **When** the questionnaire completes, **Then** only `superposition.yml` is written; no `.devcontainer/` output is produced.
3. **Given** a developer runs `init` (default behavior), **When** the questionnaire completes, **Then** both `superposition.yml` and `.devcontainer/` are produced (scaffold remains the default for backward compatibility).

### User Story 2 — Regeneration uses project file exclusively (Priority: P1)

A team member runs `regen` and the tool reads only the committed project file, not a previously generated manifest buried inside `.devcontainer/`.

**Why this priority**: A single deterministic input source eliminates the "which file was used?" question and prevents silent fallback behavior.

**Acceptance Scenarios**:

1. **Given** a repository with `superposition.yml`, **When** a developer runs `regen`, **Then** the tool reads the project file and regenerates `.devcontainer/` from it.
2. **Given** a repository with only `superposition.json` and no project file, **When** a developer runs `regen`, **Then** the tool stops with an error explaining that a project file is required and suggests running a migration command.
3. **Given** a repository with both `superposition.yml` and `superposition.json` where the overlay lists differ, **When** a developer runs `regen`, **Then** the tool reads only the project file and regenerates from it (the manifest is overwritten as output).

### User Story 3 — Migration from manifest-only repos (Priority: P1)

A developer with an existing `superposition.json` but no project file can create one via a single command, preserving their current configuration.

**Why this priority**: Migration path is a prerequisite for making the project file mandatory without stranding existing users.

**Acceptance Scenarios**:

1. **Given** a `.devcontainer/superposition.json` exists and no project file is present, **When** the developer runs the migration command, **Then** a `superposition.yml` is written at the repository root that captures the manifest's stack, base image, overlays, preset, presetChoices, portOffset, target, minimal, editor, and supported customizations.
2. **Given** the migration command has been run successfully, **When** the developer subsequently runs `regen`, **Then** it succeeds using the newly created project file.
3. **Given** a `superposition.yml` already exists, **When** the developer runs the migration command, **Then** it refuses to overwrite with a clear message.

### User Story 4 — Discrepancy detection (Priority: P2)

A developer or CI step can verify that the generated output matches the declared project file intent, catching drift before it causes confusion.

**Why this priority**: Once the project file is canonical, the tool should be able to tell you when the generated output no longer reflects your intent.

**Acceptance Scenarios**:

1. **Given** a project file specifying overlays [A, B, C] and a manifest recording overlays [A, B, D], **When** the developer runs `doctor`, **Then** the tool reports the overlay discrepancy with both the project file value and the manifest value.
2. **Given** a project file and manifest that agree, **When** the developer runs `doctor`, **Then** no drift is reported for the overlay comparison.

### User Story 5 — Backward compatibility for manifest-based workflows (Priority: P3)

Existing CI scripts or automation that use `--from-manifest` continue to function during a deprecation window, with clear guidance to migrate.

**Why this priority**: Hard removal of a documented flag without a transition period damages trust.

**Acceptance Scenarios**:

1. **Given** a CI script that runs `regen --from-manifest .devcontainer/superposition.json`, **When** that script executes, **Then** the command still works but emits a deprecation warning explaining the migration path.
2. **Given** a future major version, **When** `--from-manifest` is invoked, **Then** it may be removed entirely (this spec does not require removal, only deprecation).

---

### Edge Cases

- What happens when `init` is run in a directory that already has a `superposition.yml`? The tool MUST detect this and either prompt for confirmation to overwrite or suggest using `regen` instead. It MUST NOT silently overwrite the project file.
- What happens when `--from-manifest` is combined with `--from-project`? Fails before generation, as today — these are mutually exclusive.
- What happens when a project file references overlays that no longer exist in the catalog? Fails validation with actionable error, as today.
- What happens to `--write-manifest-only`? This flag controls whether to produce a full `.devcontainer/` or only the `superposition.json` receipt. It remains valid — it controls output scope, not input source.
- What happens to `--project-file` flag on `init`? Removed. The behavior it enabled becomes the default.
- What happens when running `doctor` with no manifest (project file exists, but `.devcontainer/` has never been generated)? Doctor should report that no generated output exists to compare against, and suggest running `init` or `regen`.
- What happens to `--from-project` on `init` and `regen`? It becomes redundant since the project file is always the default input. It SHOULD be preserved as a no-op for CI readability but MAY be removed in a future version.
- What happens to `init --no-interactive` when no project file exists? It fails with an error requiring a project file or `--from-project`. The `--from-manifest` fallback is deprecated.
- What happens when `generate --adopt` reads the project file but it was produced by a different tool version? Same as `regen` — version differences do not block reading; the project file schema is forward-compatible.
- What happens with `--project-root <path>` when `--from-project` is the default? `--project-root` sets the discovery directory for the project file. It continues to work as before. If no project file exists at the specified root, the tool errors (it does not fall back to the manifest at that root).
- What happens to `hash` when the manifest is output-only? `hash` reads `superposition.json` to compute a content hash of the generated output for cache-busting. This is reading-as-diagnostic (like `doctor`), not reading-as-generation-input. It remains valid but is reclassified as a diagnostic reader (see Dependencies & Impact).

---

## Requirements

### Functional Requirements

- **FR-001**: `init` MUST write `superposition.yml` as its primary persistent output in all modes (interactive, preset, CLI flags).
- **FR-002**: `init` MUST support a flag to control whether `.devcontainer/` is also generated in the same run. The default behavior MUST be to scaffold (preserving backward compatibility).
- **FR-003**: `regen` MUST read `superposition.yml` as its sole input source when no explicit source flag is provided.
- **FR-004**: `regen` MUST NOT silently fall back to reading `superposition.json` as an input source when no project file is found. It MUST stop with guidance toward migration.
- **FR-005**: `--from-manifest` MUST remain functional during a deprecation window but MUST emit a warning directing users toward migration.
- **FR-006**: A migration command MUST exist that reads an existing `superposition.json` and produces a `superposition.yml` preserving the same effective configuration.
- **FR-007**: The migration command MUST refuse to overwrite an existing project file.
- **FR-008**: `superposition.json` MUST continue to be written by the generation pipeline as an output artifact containing resolved dependencies, generation metadata, and tool version.
- **FR-009**: No command in the standard (non-deprecated) flow MUST read `superposition.json` as a generation input.
- **FR-010**: `doctor` MUST be able to compare the project file's declared overlay list against the manifest's recorded overlay list and report differences as drift.
- **FR-011**: `--project-file` flag on `init` MUST be removed since its behavior becomes the default.
- **FR-012**: The `writeProjectConfig` step in `init` MUST occur before scaffolding, not after it.
- **FR-013**: `--from-project` MUST be preserved as an accepted flag on `init` and `regen` for CI readability, even though project-file input is now the default.
- **FR-014**: `init --no-interactive` MUST require a discovered or explicit project file. It MUST NOT fall back to `--from-manifest` in the standard flow.
- **FR-015**: The input merge priority MUST be: CLI overrides > interactive answers > project config. The manifest is no longer a merge source in the standard flow.
- **FR-016**: The migration command MUST preserve `preset`, `presetChoices`, `portOffset`, `target`, `minimal`, and `editor` from the source manifest, not only stack, base image, and overlays.
- **FR-017**: The migration command MUST preserve `customizations` (inline devcontainer patches, compose patches, env vars, scripts, files) from the source manifest when they are present.
- **FR-018**: `init` running in a directory with an existing `superposition.yml` MUST detect it and either prompt for confirmation to overwrite or suggest using `regen` instead. It MUST NOT silently overwrite the project file.
- **FR-019**: `generate` MUST use the same output model as `init`: write `superposition.yml` first, then optionally scaffold `.devcontainer/`. The existing `writeManifestYaml` helper in `generate.ts` MUST be replaced by the shared `writeProjectConfig` path.
- **FR-020**: `generate --adopt` (modify mode) MUST continue to read `superposition.yml` as input. This is already correct in the current implementation and must not regress.
- **FR-021**: The tool MUST support both `superposition.yml` and `.superposition.yml` as valid project-file names, consistent with 002 FR-001/FR-012. When both filenames are present, the tool MUST fail with a clear error message (not silently pick one).
- **FR-022**: `--project-root <path>` MUST continue to function for specifying the repository root for project-file discovery. Its semantics are unchanged: it sets the directory in which `superposition.yml` is found.
- **FR-023**: `adopt --project-file` (introduced in 002 FR-020) becomes redundant since project-file output is now standard. The flag SHOULD be preserved as a no-op during a deprecation window, then MAY be removed.

> **Design Decision — Scaffold Flag Polarity**: Issue #134 proposed `--scaffold` (opt-in scaffold) while this spec uses `--no-scaffold` (opt-out scaffold). This spec deliberately chose `--no-scaffold` to preserve backward compatibility: existing `init` invocations already produce `.devcontainer/`, so scaffold-by-default is the non-breaking choice. The `generate` command already uses `--scaffold` (opt-in) because its primary output is the project file. This asymmetry is intentional — `init` is the legacy command where backward compat matters; `generate` is the new command where project-file-first is native.

### Non-Functional Requirements

- **NFR-001**: This change MUST NOT introduce any new external dependencies or network requirements.
- **NFR-002**: This change MUST NOT alter the generated `.devcontainer/` output for any given set of overlay selections — only the input resolution path changes.
- **NFR-003**: The total line count in `scripts/init.ts` SHOULD decrease, not increase. This is a simplification.

---

### Key Entities

- **Project Configuration File** (`superposition.yml`): The committed, human-editable, repository-root declaration of desired environment setup. The single canonical input for all generation flows.
- **Generated Manifest** (`superposition.json`): A machine-generated receipt inside `.devcontainer/` recording what was actually produced, including resolved dependencies, auto-resolved overlays, tool version, and generation timestamps. Output only.
- **Generation Request**: The effective set of choices for one run, derived from the project file plus any explicit CLI overrides for that run.

---

## Dependencies & Impact

- **Supersedes**: The "manifest as input" path introduced before 002 and preserved as a fallback in the 002 spec. This spec narrows 002's edge case "the explicit manifest remains the persisted input source for that run" to a deprecated compatibility path.
- **Affected Commands**: `init`, `regen`, `doctor`, `generate`, `adopt`, new `migrate` command
- **Diagnostic Readers** (read `superposition.json` as output verification, not generation input): `doctor`, `hash`
- **Unaffected Commands**: `list`, `explain`, `plan`
- **Compatibility Impact**: Breaking for workflows that rely on `--from-manifest` as a primary input (deprecated, not removed). Non-breaking for project-file users.
- **Required Documentation Updates**: README.md, CHANGELOG.md, quickstart, workflow docs
- **Verification Plan**: Unit tests for input resolution changes, integration tests for full init/regen cycles, migration tests for manifest-to-project-file conversion, doctor drift detection tests
- **Migration Command Naming**: TBD — candidates are `cs migrate` (new subcommand) or `cs adopt --from-manifest` (mode of existing command). The migration command must be discoverable in `cs --help`. The spec does not prescribe the name.

### Downstream Issue Impact

| Issue                         | Impact                                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------------------- |
| #131 (repo intelligence)      | Benefits from single canonical input — `--adopt` always reads project file, reducing fallback complexity |
| #130 (generate --explain)     | Unaffected — explain operates on the generation result, not the input source                             |
| #132 (recipe-aware prompting) | Archetypes/presets stored in project file become first-class citizens once it's canonical                |
| #110 (team presets)           | Presets in project file become shareable directly; no need to reverse-engineer from manifest             |
| #133 (missing overlays)       | Unaffected — overlay catalog is independent of input model                                               |

### Implementation Map

Per-file disposition of affected functions and code paths:

| File                             | Function / Code Path                                  | Disposition                                                                                                                |
| -------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `scripts/init.ts`                | `buildAnswersFromManifest()` (~line 1161)             | **Move** to migration utility; remove from standard init flow                                                              |
| `scripts/init.ts`                | `loadManifest()` (~line 436)                          | **Deprecate** in standard flow; retain only behind `--from-manifest`                                                       |
| `scripts/init.ts`                | `findManifestFile()` (called by loadManifest)         | **Deprecate** alongside `loadManifest()`                                                                                   |
| `scripts/init.ts`                | `findDefaultRegenManifest()`                          | **Remove** — this implements the silent fallback that FR-004 prohibits                                                     |
| `scripts/init.ts`                | Mode detection logic (~lines 1810-1900)               | **Simplify** — remove the manifest-vs-project-file branching; project file is always primary                               |
| `scripts/init.ts`                | `writeProjectConfig` post-generation (~line 2177)     | **Move earlier** — must occur before scaffolding per FR-012                                                                |
| `tool/commands/generate.ts`      | `writeManifestYaml()` helper                          | **Replace** with shared `writeProjectConfig` path (FR-019)                                                                 |
| `tool/commands/generate.ts`      | `scanRepoSignals()` (inline)                          | **No change** from this spec (extracted by #131)                                                                           |
| `tool/commands/doctor.ts`        | Own copy of `buildAnswersFromManifest()` (~line 1231) | **Refactor** — extract shared utility if still needed for migration; doctor's diagnostic reading of manifest is unaffected |
| `tool/commands/doctor.ts`        | Drift detection                                       | **Extend** per FR-010 — compare project file vs manifest                                                                   |
| `tool/schema/project-config.ts`  | `loadProjectConfig`, `writeProjectConfig`, etc.       | **No structural changes** — already designed for this model                                                                |
| `tool/questionnaire/composer.ts` | Composition pipeline                                  | **No changes** — operates on `QuestionnaireAnswers` regardless of input source                                             |
| `tool/commands/hash.ts`          | `findManifest()` (~line 72)                           | **Reclassify** as diagnostic reader; no functional change                                                                  |

---

## Assumptions

- The project file is the team-shareable source of truth. The manifest is a build artifact.
- Existing repos using only `superposition.json` represent the legacy path. The population of these repos is small enough that a migration command and deprecation warning are sufficient — no automatic migration is needed.
- The `--from-manifest` deprecation window lasts at least one minor version cycle before potential removal.
- `doctor` already reads `superposition.json` for its own diagnostics and repair. That capability is unaffected — `doctor` reads the manifest as a diagnostic target, not as a generation input.

---

## Success Criteria

- **SC-001**: After this change, every standard `init` invocation (interactive, preset, CLI flags) produces a `superposition.yml` without requiring any additional flag.
- **SC-002**: After this change, `regen` with no flags succeeds when a project file is present and fails clearly when only a manifest is present.
- **SC-003**: A manifest-only repo can be migrated to a project-file repo in a single command, and subsequent `regen` succeeds.
- **SC-004**: `doctor` can detect and report drift between the project file and the generated manifest.
- **SC-005**: No existing test scenario is deleted — all are converted from manifest-as-input to project-file-as-input.
- **SC-006**: The `scripts/init.ts` mode detection logic is measurably simpler (fewer branches, fewer input resolution paths).
- **SC-007**: `init --no-scaffold` produces only `superposition.yml` with no `.devcontainer/` output.
- **SC-008**: No standard (non-deprecated) command reads `superposition.json` as a generation input. `doctor` and `hash` read it only as a diagnostic target.
- **SC-009**: `generate` and `init` share the same output model: project file first, scaffold optionally. `writeManifestYaml` in `generate.ts` is replaced by the shared `writeProjectConfig` path.
- **SC-010**: CHANGELOG.md and README.md are updated to document the project-file-first model and the deprecation of `--from-manifest`.
- **SC-011**: Both `superposition.yml` and `.superposition.yml` are accepted as valid project-file names; presence of both is an error.
