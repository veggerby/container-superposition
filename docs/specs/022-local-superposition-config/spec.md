# Feature Specification: Local Superposition Config

**Spec ID**: `022-local-superposition-config`
**Taxonomy**: `PROJECT`
**Created**: 2026-06-03
**Author**: PM Agent
**Status**: Final
**Input**: Add a local-only config file for enriching generated devcontainer output, with `devcontainerGitignore` alignment, warnings, docs, tests, and possible Git index cleanup.

## Problem Statement

Developers need personal devcontainer additions, such as mounting `$HOME/.codex`, without committing those settings to shared `superposition.yml`. Today they must either edit generated `.devcontainer` output, which regen overwrites, or add shared project config that may expose machine-specific paths.

This is risky when generated `.devcontainer` files are committed: local-only settings can leak into Git unless generation clearly aligns with `devcontainerGitignore` and warns when output is tracked.

## Goals

- Provide repository-root `superposition.local.yml` for local-only enrichment during `init` and `regen`.
- Reuse existing project-config shapes for local `env`, `mounts`, `shell`, and `customizations` where safe.
- Keep shared setup deterministic from `superposition.yml`; local config must never rewrite or affect committed project file.
- Warn users when local config is present but generated `.devcontainer` output is not ignored.
- Give clear path to untrack already-tracked generated files when `devcontainerGitignore: true` is enabled.
- Document naming, precedence, examples, Git behavior, and safety constraints.

## Non-Goals

- Supporting multiple local config filenames.
- Allowing local config to change core shared setup choices such as `stack`, `baseImage`, `overlays`, `preset`, `outputPath`, `target`, `editor`, `minimal`, or `devcontainerGitignore`.
- Automatically committing, staging, or unstaging files during normal `init` or `regen`.
- Making local config part of reproducibility checks except as explicit local-input disclosure.
- Supporting local config discovery outside repository root.

## Proposed Behavior

### File name and discovery

- Supported local config filename: `superposition.local.yml`.
- Discovery location: repository root only, beside canonical `superposition.yml` or `.superposition.yml`.
- File is optional. Absence preserves existing behavior.
- `.superposition.local.yml` is not supported; if present, tool ignores it and docs tell users to rename.

### Allowed fields

`superposition.local.yml` may contain only local enrichment fields:

```yaml
$schema: https://raw.githubusercontent.com/veggerby/container-superposition/main/tool/schema/superposition.local.schema.json

mounts:
    - source: ${HOME}/.codex
      destination: /home/vscode/.codex
      type: bind
      target: devcontainerMount

env:
    CODEX_HOME:
        value: /home/vscode/.codex
        target: remoteEnv

shell:
    aliases:
        cx: codex

customizations:
    devcontainerPatch:
        customizations:
            vscode:
                settings:
                    terminal.integrated.defaultProfile.linux: zsh
```

Allowed top-level keys:

- `$schema`
- `env`
- `mounts`
- `shell`
- `customizations`

Unsupported top-level keys cause validation error before generation.

### Merge order and precedence

Generation applies local config after shared project config and before target-specific final output is written:

1. Base template
2. Overlays
3. Port offsets
4. Shared project `env`, `mounts`, `shell`, `customizations`
5. Local `env`, `mounts`, `shell`, `customizations`
6. Target-specific patches
7. Files written

Precedence rules:

- Local arrays append using existing merge/dedupe behavior.
- Local maps deep-merge and override conflicting scalar keys from shared config.
- Local `customizations.devcontainerPatch` and `customizations.dockerComposePatch` use same patch validation and merge behavior as shared `customizations`.
- Local config must affect generated output only; it must not update `superposition.yml`, `.superposition.yml`, or `superposition.json` intent fields beyond local-input disclosure if architect chooses manifest metadata.

### Gitignore behavior

When `superposition.local.yml` exists:

- If effective `devcontainerGitignore === true`, generation writes `outputPath/.gitignore` as today and prints concise confirmation that local config is safe from output commits if output files are untracked.
- If effective `devcontainerGitignore !== true` or absent, generation warns that `.devcontainer` output may contain local-only settings and should not be committed. Warning includes remediation: set `devcontainerGitignore: true` in `superposition.yml` or remove local config before committing generated output.
- Tool MUST ensure `superposition.local.yml` itself is ignored by Git by appending `superposition.local.yml` to repository `.gitignore` if missing, with message. If the `.gitignore` write fails, implementation MUST warn with exact line to add.

Tracked generated files case:

- Normal `init` and `regen` MUST NOT run `git rm`, modify Git index, or silently untrack files.
- If `devcontainerGitignore === true` and `git ls-files -- <outputPath>` returns tracked generated files, tool MUST warn that `.gitignore` does not untrack existing files and print:

```bash
git rm -r --cached -- .devcontainer
```

using actual `outputPath`.

- Architecture decision: `doctor --fix` MUST NOT offer Git index repair in initial implementation. Any future opt-in repair that runs `git rm -r --cached -- <outputPath>` requires explicit UX plus ADR/foundation review and must align with spec `017-doctor-dry-run`.

### Canonical interaction model

User sees local-config feedback only after command has found and parsed shared project config enough to know `outputPath` and effective `devcontainerGitignore`. Messages must use resolved output path shown relative to repository root when possible, for example `.devcontainer`; use absolute path only when output is outside repository root.

Reading order for `init` and `regen` output when `superposition.local.yml` exists:

1. Local config detection line.
2. Validation result or validation error.
3. Git safety warning or safe-state confirmation.
4. Generation summary and written files.

Primary user action is one of:

- continue normally when local config is safe;
- set `devcontainerGitignore: true` before committing generated output;
- add `superposition.local.yml` to root `.gitignore` if not already ignored;
- run printed `git rm -r --cached -- <outputPath>` command manually when generated output is tracked.

The CLI must not open interactive prompts during normal `init` or `regen` for local-config safety. Local-config guidance is inline terminal output, not modal, paged, or hidden behind verbose mode.

### Interaction rules

- Detection message appears once per command when `superposition.local.yml` exists.
- Warnings appear on stderr. Safe-state confirmations may appear on stdout with other generation summary lines.
- Validation errors appear before any write and must stop command with non-zero exit.
- Git detection failure must not block generation. Show no tracked-file warning when Git status cannot be checked, unless implementation can print a debug/verbose diagnostic without user-facing noise.
- Do not print warnings when `superposition.local.yml` is absent.
- Do not mention unsupported `.superposition.local.yml` during every run unless that file exists. If it exists, warn once and say it is ignored.
- Do not imply `.gitignore` untracks files. Always distinguish "ignored for new files" from "already tracked".
- When output path is not `.devcontainer`, every message and command must use actual `outputPath`.
- If root `.gitignore` auto-edit is implemented, print exactly what changed. If warn-only is implemented, print exact line to add.

### Canonical wording

Use these labels consistently in CLI output and docs:

- `superposition.local.yml`: "local config"
- `superposition.yml`: "shared project config"
- `.devcontainer`: "generated output" or "generated devcontainer output"
- `devcontainerGitignore`: "generated output ignore setting"
- `git rm -r --cached -- <outputPath>`: "untrack generated output"

Do not call local config "profile", "private project config", "user config", or "override file". Do not call `git rm -r --cached` a delete operation without clarifying it removes files from Git index only.

Example output when local config exists and `devcontainerGitignore` is disabled:

```text
⚠ Local config detected: superposition.local.yml
  Generated .devcontainer output may include local-only settings.
  Before committing, set devcontainerGitignore: true in superposition.yml or remove local config changes from generated output.
```

Example output when local config exists and output ignore setting is safe:

```text
Local config detected: superposition.local.yml
Generated .devcontainer output is ignored for new files.
```

Example output when `devcontainerGitignore` is true but files are tracked:

```text
⚠ .devcontainer is ignored for new files, but existing generated files are still tracked by Git.
  To untrack generated output: git rm -r --cached -- .devcontainer
```

Example output when root `.gitignore` lacks local config entry and implementation is warn-only:

```text
⚠ superposition.local.yml is not ignored by Git.
  Add this line to root .gitignore: superposition.local.yml
```

Example output when root `.gitignore` is auto-edited:

```text
Added superposition.local.yml to root .gitignore.
```

Example validation error:

```text
Unsupported local config keys in superposition.local.yml: stack, overlays
Allowed top-level keys: $schema, env, mounts, shell, customizations.
```

Example ignored filename warning:

```text
⚠ Ignoring .superposition.local.yml.
  Rename it to superposition.local.yml in repository root to use local config.
```

### State behavior

- Local config has no persisted state beyond generated output and optional root `.gitignore` edit if architecture chooses auto-edit.
- `superposition.yml`, `.superposition.yml`, and `superposition.json` must not gain local values.
- Re-running `regen` must produce same local-config messages for same filesystem/Git state, except root `.gitignore` auto-edit message changes to no warning after entry exists.
- If validation fails, generated files must remain byte-for-byte unchanged.
- If local config is removed, subsequent `regen` must stop printing local-config messages and must generate from shared project config only.

### Empty, loading, validation, and error states

- Empty local config file is valid only if parser already treats empty YAML as empty object; otherwise show file-specific parse error. It must behave as no local enrichment but still trigger Git safety checks because file exists.
- Empty allowed sections, such as `mounts: []`, are valid and produce no generated changes.
- Parse errors must name `superposition.local.yml` and line/column when parser provides them.
- Unsupported keys must list keys in file order, comma-separated.
- Local config schema errors must reference local config, not shared project config.
- No loading/progress spinner is required. If command has existing spinner behavior, local-config warnings must not be overwritten by spinner redraw.

### Docs wording contract

Docs must show local config as optional repository-root file for personal generated-output enrichment. First paragraph should answer: "Use `superposition.local.yml` for machine-specific mounts, env, shell aliases, or editor customizations that should not be committed to shared config."

Docs must include, in this order:

1. File name and repository-root location.
2. Allowed fields.
3. Minimal example mounting `${HOME}/.codex`.
4. Merge order summary: local config applies after shared project config.
5. Git safety: add `superposition.local.yml` to root `.gitignore`; prefer `devcontainerGitignore: true`; ignored files already tracked remain tracked.
6. Manual untrack command using actual default path: `git rm -r --cached -- .devcontainer`.
7. Unsupported `.superposition.local.yml` note.

Docs must not suggest committing generated local output as workflow.

### QA scenario scripts

1. **First-time safe path**: Create `superposition.local.yml` with Codex mount, set `devcontainerGitignore: true`, run `regen`, verify first visible local message says local config detected and generated output ignored for new files.
2. **Unsafe output path**: Remove `devcontainerGitignore`, run `regen`, verify warning tells user not to commit generated output and names `superposition.yml` setting.
3. **Tracked generated output**: Track `.devcontainer/devcontainer.json`, set `devcontainerGitignore: true`, run `regen`, verify warning says ignored files remain tracked and prints `git rm -r --cached -- .devcontainer`.
4. **Invalid local key**: Add `stack: compose` to local config, run `regen`, verify command fails before writes and error names `superposition.local.yml` plus allowed keys.
5. **Wrong filename**: Create `.superposition.local.yml` only, run `regen`, verify file is ignored and warning says rename to `superposition.local.yml`.

## Technical Design

### Architecture Ownership

**Owns new logic:**

- `tool/schema/project-config.ts` owns discovery, parsing, validation, normalization, and types for `superposition.local.yml`.
- `tool/cli/run.ts` owns command sequencing, loading shared + local config, merging answer inputs, validation-before-write gating, and local-config user messages.
- `tool/questionnaire/composer.ts` owns applying already-merged local enrichment to generated artifacts. It must not discover or parse local config.
- `tool/utils/gitignore.ts` owns idempotent root `.gitignore` mutation/reuse for adding `superposition.local.yml`.
- New `tool/utils/git.ts` (or equivalent) owns non-mutating Git queries: root detection, ignore checks, and tracked-file listing.
- `scripts/generate-schema.ts` owns emitting both shared and local JSON schemas.

**Must not own new logic:**

- Overlay loader/registry must not know local config exists.
- Merge utility must not know shared vs local source; it only applies deterministic merge semantics.
- Doctor remediation registry must not run Git index mutation for this feature in initial implementation.
- `superposition.json` manifest must not persist local values or local-input metadata in initial implementation.
- Generated `.devcontainer/` files must not become source of local config truth.

### Schema and Types

Add explicit local-config model near project config types:

```typescript
export const LOCAL_PROJECT_CONFIG_FILENAME = 'superposition.local.yml' as const;
export const IGNORED_LOCAL_PROJECT_CONFIG_FILENAME = '.superposition.local.yml' as const;
export const SUPERPOSITION_LOCAL_SCHEMA_URL =
    'https://raw.githubusercontent.com/veggerby/container-superposition/main/tool/schema/superposition.local.schema.json';

export interface LocalProjectConfigSelection {
    $schema?: string;
    env?: ProjectConfigSelection['env'];
    mounts?: ProjectConfigSelection['mounts'];
    shell?: ProjectConfigSelection['shell'];
    customizations?: ProjectConfigSelection['customizations'];
}

export interface LoadedLocalProjectConfig {
    file: ProjectConfigFileEntry;
    selection: LocalProjectConfigSelection;
}
```

Parser requirements:

- `findLocalProjectConfig(projectRoot)` checks repository root only for `superposition.local.yml`.
- `findIgnoredLocalProjectConfig(projectRoot)` checks `.superposition.local.yml` only to print ignored-file warning.
- `loadLocalProjectConfig(overlaysConfig, projectRoot)` may reuse existing `parseProjectEnv`, `parseMounts`, `parseProjectShell`, and `parseCustomizations` helpers.
- Allowed keys exactly: `$schema`, `env`, `mounts`, `shell`, `customizations`.
- Unsupported keys error must be local-specific: `Unsupported local config keys in superposition.local.yml: stack, overlays` plus allowed list.
- Empty YAML handling: `yaml.load()` returning `undefined` or `null` is treated as `{}` for local config only, so empty file is valid and still triggers Git safety checks.
- Shared `loadProjectConfig()` behavior remains unchanged unless existing parser already supports empty shared configs.

Generated schemas:

- Keep existing `tool/schema/superposition.schema.json` unchanged except if shared types move.
- Add generated `tool/schema/superposition.local.schema.json` from same `env`, `mounts`, `shell`, and `customizations` definitions.
- Local schema uses `additionalProperties: false`, title `Superposition Local Configuration`, and `$id` matching `SUPERPOSITION_LOCAL_SCHEMA_URL`.
- `npm run schema:generate` writes both schema files; CI/schema-sync checks must include both.
- Docs examples must use local schema URL in `$schema`.

### Config Loading and Merge Order

Canonical command flow for `init` and `regen`:

1. Resolve `projectRoot` from cwd / `--project-root`.
2. Load overlays registry.
3. Load shared project config (`superposition.yml` or `.superposition.yml`) where existing command path requires it.
4. Load local config from `projectRoot/superposition.local.yml` if present.
5. Validate local config before backup, project-file write, customization materialization, or generated-output writes.
6. Build shared `QuestionnaireAnswers` from shared project config / manifest / CLI / interactive inputs as today.
7. Merge local enrichment into answers after shared answers and CLI mode selection, but before `composeDevContainer()` / `generateManifestOnly()`.
8. Print local-config messages after final `answers.outputPath` and `answers.devcontainerGitignore` are known, before spinner starts.
9. Generate output.

Local merge helper should be pure and testable:

```typescript
function applyLocalConfigToAnswers(
    answers: QuestionnaireAnswers,
    local: LocalProjectConfigSelection | undefined
): QuestionnaireAnswers;
```

Merge semantics:

- `projectEnv`: deep map merge; local variable entries override shared entries by variable name.
- `projectMounts`: append local mounts after shared mounts; existing mount dedupe happens downstream in current devcontainer/compose merge paths.
- `projectShell.aliases`: local aliases override shared alias names.
- `projectShell.snippets`: append local snippets after shared snippets.
- `customizations`: deep merge with local last writer wins; local `devcontainerPatch` and `dockerComposePatch` apply after shared project customizations but before target-specific patches.

Important sequencing fix: existing `writeProjectConfigCustomizations()` materializes shared `customizations` into `.devcontainer/custom/` before composition. Local `customizations` must not be written there. Implementation should pass combined customizations only to `composeDevContainer()` and write only shared `projectConfig.selection.customizations` to custom directory when existing behavior requires it.

Effective full generation order:

1. Base template
2. Overlays
3. Shared + local first-class `env` / `mounts`
4. Docker Compose merge
5. Port offsets
6. Shared + local `shell`
7. Existing `.devcontainer/custom/` patches
8. Shared + local project-config `customizations`
9. Target-specific patches
10. Files written

This adjusts PM order by placing target patches last and keeping existing custom-directory patches before project-config customizations. If implementation cannot preserve this safely, PM must update acceptance order before approval.

### Safety with `devcontainerGitignore`

Chosen policy: auto-append `superposition.local.yml` to root `.gitignore` when local config exists and line is missing.

Rationale: repo already mutates root `.gitignore` for overlay gitignore fragments and backup patterns; local config leak prevention is safety-critical and idempotent. No ADR needed.

Implementation details:

- Use `appendGitignoreSection(path.join(projectRoot, '.gitignore'), 'container-superposition local config', ['superposition.local.yml'])`.
- Print `Added superposition.local.yml to root .gitignore.` only when utility returns `true`.
- Do not add `.superposition.local.yml`; it is unsupported and ignored.
- When local config absent, do not touch root `.gitignore`.
- If `.gitignore` write fails, warn with exact fallback line and continue generation:
  `⚠ superposition.local.yml is not ignored by Git.` / `Add this line to root .gitignore: superposition.local.yml`.

Generated output safety:

- If local config exists and effective `answers.devcontainerGitignore === true`, `composeDevContainer()` continues writing `outputPath/.gitignore` (`*`, `!.gitignore`) through existing `ensureOutputGitignore()`.
- CLI prints safe-state confirmation before generation. Existing composer line can still report file write/up-to-date.
- If local config exists and effective setting is not `true`, CLI warns on stderr before generation.
- Local safety warnings are skipped for `--no-scaffold` / manifest-only generation because no generated devcontainer output receives local enrichment. Local config should not be applied to `generateManifestOnly()`.

### Git Index Handling

Normal `init` and `regen` must remain non-mutating for Git index.

Add non-mutating helpers:

```typescript
interface GitQueryResult<T> {
    ok: boolean;
    value?: T;
}

function listTrackedFilesUnder(projectRoot: string, outputPath: string): GitQueryResult<string[]>;
function isPathIgnored(projectRoot: string, relPath: string): GitQueryResult<boolean>;
```

Rules:

- Use `git -C <projectRoot> ls-files -- <relativeOutputPath>` for tracked generated output detection.
- Use actual `answers.outputPath`, display relative to project root when possible.
- If Git command fails or repo absent, suppress user-facing tracked-file warning.
- Never run `git rm`, `git add`, `git update-index`, or staging commands from `init` / `regen`.
- If tracked files exist and `devcontainerGitignore === true`, warn:
  `⚠ .devcontainer is ignored for new files, but existing generated files are still tracked by Git.`
  `To untrack generated output: git rm -r --cached -- .devcontainer`

Decision: no `doctor --fix` untrack repair in initial implementation. Git index mutation is outside current doctor fix safety classes and would need explicit UX plus likely ADR/foundation amendment. `doctor` may later add detection-only finding, but not required for this spec.

### CLI Commands Affected

- `init` (default and explicit): loads local config after shared config/interactive/CLI inputs, applies enrichment to generated output, writes/updates shared project config without local fields, emits local safety messages.
- `regen`: loads local config with shared project config only, applies enrichment, emits safety messages, never writes shared project config.
- `--project-root`: local discovery uses resolved project root, not original cwd.
- `--from-manifest`: local config not supported because discovery is defined beside shared project config. Warn only for `.superposition.local.yml` if it exists in project root; do not apply local config without shared project config.
- `--no-scaffold` / manifest-only: do not apply local config and do not print generated-output safety messages.
- `doctor`: no behavior change required initially. Reproducibility checks should disclose local config presence as non-error note/warning only if check output already supports local inputs; local config must not cause reproducibility failure.
- `migrate`, `adopt`, `list`, `plan`, `explain`, `hash`: no local config application.

### System Boundaries and Invariants

Invariants:

- Shared project config remains deterministic and serializes without local fields.
- `superposition.json` remains derived from shared answers only; no local env/mount/shell/customization values are persisted.
- Missing `superposition.local.yml` is exact no-op for existing tests/snapshots.
- Validation failure happens before backup and before writes; output remains byte-for-byte unchanged.
- Local config may affect generated output only for commands that write devcontainer output.
- Target-specific patch remains final generated-output layer.
- Git detection failure never blocks generation.

Privacy/security:

- CLI never logs local env values or mount source values beyond static file/path guidance.
- Docs must not suggest putting secrets in local config; existing `.env` secret guidance still applies.
- Auto-added `.gitignore` line reduces accidental local file leak but does not claim generated output is safe if tracked.

Performance/reliability:

- One local YAML read max per command.
- At most two Git subprocesses, only when local config exists.
- Git queries use explicit `--` path separator.

### Canonical Data Flow

```text
repo root
  ├─ shared project config ──parse──► ProjectConfigSelection ──► shared answers
  ├─ superposition.local.yml ─parse──► LocalProjectConfigSelection
  └─ CLI / interactive / manifest inputs ─────────────────────► base answers

shared/base answers + local selection
  └─ applyLocalConfigToAnswers(local last)
       ├─ projectEnv / projectMounts / projectShell
       └─ customizations (in-memory only)

answers
  └─ composeDevContainer()
       ├─ base template + overlays
       ├─ first-class env/mount/shell
       ├─ custom directory patches
       ├─ project-config customizations
       ├─ target patch
       └─ generated output files
```

### Failure Modes and Regression Risks

- Local values accidentally serialized into `superposition.yml` during `init` update. Test project-file byte diff.
- Local values accidentally persisted into `superposition.json`. Test manifest absence of local env/mounts/customizations.
- Local customizations written into `.devcontainer/custom/`, converting local intent into project customization. Test no local custom files materialized.
- Validation after backup/write causing dirty output on error. Test invalid local key preserves output bytes.
- CLI merge order override wrong for env/shell aliases. Unit test pure merge helper.
- `devcontainerGitignore` warning uses default `.devcontainer` when custom `outputPath` set. Command test custom path.
- Git command fails outside repo or in worktree/submodule. Test no throw.
- Root `.gitignore` auto-append surprises due duplicate variants. Utility already exact-line dedup only; acceptable, document exact behavior.
- Local schema drifts from runtime parser. Schema generation test and `npm run schema:generate` CI.

### Implementation Slices

1. **Types/parser slice**: add local filename constants, local types, discovery, parser, unsupported-key validation, empty-file handling, wrong-filename warning helper; unit tests.
2. **Pure merge slice**: add `applyLocalConfigToAnswers()` with env/mount/shell/customization merge semantics; unit tests for override/append/no-op.
3. **CLI sequencing slice**: wire `init` and `regen`, ensure validation before writes, skip manifest-only/from-manifest, preserve shared config serialization.
4. **Git safety slice**: add git query utility, root `.gitignore` auto-append, output ignore warnings, tracked-file warning, custom output path display; command/integration tests.
5. **Composer sequencing slice**: ensure project-config `customizations` can be applied in-memory after custom-directory patches and before target patches without writing local customizations to `.devcontainer/custom/`.
6. **Schema/docs slice**: generate local schema, update docs in required order, update README if needed, update CHANGELOG.
7. **Regression slice**: run targeted tests, `npm run schema:generate`, `npm run lint:fix`, `npm run lint`, `npm test`, `npm run init -- regen`, `npm run init -- doctor`.

### Test Plan

Unit tests:

- `project-config` local parser accepts allowed keys, empty file, empty allowed sections.
- Rejects unsupported keys in file order with local-specific message.
- Ignores missing local file.
- Detects `.superposition.local.yml` warning condition without applying it.
- `applyLocalConfigToAnswers()` env override, mount append, shell alias override/snippet append, customization deep merge.
- Git utility returns tracked files, returns empty, and fails closed outside Git repo.

Integration/command tests:

- `regen` with local Codex mount and `devcontainerGitignore: true` writes mount, output `.gitignore`, root `.gitignore` line, leaves shared project file bytes unchanged.
- No local file keeps existing generation output unchanged.
- Invalid local key fails before writes; compare output file bytes and project file bytes.
- Local env overrides shared env in generated `remoteEnv`/compose output.
- `devcontainerGitignore` false/absent emits stderr warning.
- Tracked generated output emits untrack command and `git ls-files` remains unchanged after `regen`.
- Custom `outputPath` messages and command use actual relative path.
- Git detection failure/non-repo does not fail generation.
- Manifest-only does not apply local config and does not print local warnings.
- Local customizations affect generated `devcontainer.json` but are not written into shared project file, manifest, or `.devcontainer/custom/`.

Generated artifact tests:

- `npm run schema:generate` updates `tool/schema/superposition.local.schema.json`.
- Local schema rejects `stack` and accepts `$schema`, `env`, `mounts`, `shell`, `customizations`.
- Docs contain required wording and untrack command.

### Architecture Decision Impact

Aligned with current architecture and documented merge strategy: stateless composition, deterministic merge, generated output owns no source truth, existing root `.gitignore` mutation utility reused. `docs/foundation.md` is still missing; review used `AGENTS.md`, `docs/architecture.md`, `docs/filesystem-contract.md`, `docs/merge-strategy.md`, and related specs `002`, `016`, `017`, `020`, and `021` instead.

No ADR required for local config or root `.gitignore` auto-append because repo already performs comparable root `.gitignore` writes. New ADR or foundation amendment required before any feature runs `git rm --cached` or otherwise mutates Git index automatically.

## Workflow Review Notes

- `docs/foundation.md` is required by agent workflow but is absent from this repository. PM review could not read it. This is a repository workflow/documentation gap, not a local-config product blocker.
- Foundation substitute review used existing canonical docs: `AGENTS.md`, `docs/architecture.md`, `docs/filesystem-contract.md`, `docs/merge-strategy.md`, and related specs `002`, `016`, `017`, `020`, and `021`.
- No conflict was found with available architecture or ADR guidance. `docs/adr/` is also absent.
- Separate repo-maintenance work should create or restore `docs/foundation.md`; implementation of this spec must not invent foundation rules or silently bypass future foundation guidance if the file appears before build work starts.

## Requirements

- **FR-001**: System MUST discover `superposition.local.yml` in repository root during `init` scaffold generation and `regen`.
- **FR-002**: System MUST ignore missing `superposition.local.yml` without behavior change.
- **FR-003**: System MUST validate local config before writing generated output.
- **FR-004**: System MUST reject unsupported local config keys with file-specific, actionable error.
- **FR-005**: System MUST support local `env`, `mounts`, `shell`, and `customizations` using same formats and validation as `superposition.yml`.
- **FR-006**: System MUST apply local config after shared project config so local scalar/map settings can override shared generated-output values for that developer only.
- **FR-007**: System MUST NOT persist local config values into canonical project config.
- **FR-008**: System MUST warn when local config exists and effective `devcontainerGitignore` is not `true`.
- **FR-009**: System MUST write or preserve `outputPath/.gitignore` when `devcontainerGitignore: true` exactly as current behavior requires.
- **FR-010**: System MUST detect tracked files under `outputPath` when local config exists and `devcontainerGitignore: true`, then warn with untrack command if any are tracked.
- **FR-011**: Normal `init` and `regen` MUST NOT modify Git index.
- **FR-012**: Docs MUST instruct users to add `superposition.local.yml` to root `.gitignore` and generated output to ignore rules when local config is used.
- **FR-013**: JSON Schema support MUST include local config schema or equivalent editor validation path for allowed local fields.
- **FR-014**: Tests MUST cover discovery, validation rejection, merge order, warnings, gitignore output behavior, and tracked-file warning.
- **FR-015**: CHANGELOG MUST mention local config and Git safety warning behavior under `Unreleased`.

## Acceptance Criteria

- [x]   1. **Local mount applied**: Given root `superposition.yml` with `devcontainerGitignore: true` and root `superposition.local.yml` containing mount for `${HOME}/.codex`, when `regen` runs, then generated `devcontainer.json` includes that mount and `superposition.yml` remains unchanged. Verify with integration test comparing generated JSON and project file bytes.
- [x]   2. **Missing local file no-op**: Given no `superposition.local.yml`, when existing tests run for `regen`, then generated output matches current snapshots/fixtures. Verify with regression test.
- [x]   3. **Unsupported core key rejected**: Given `superposition.local.yml` contains `stack: compose`, when generation runs, then command fails before writing output with `Unsupported local config keys in superposition.local.yml: stack` and allowed-key guidance. Verify no generated files changed.
- [x]   4. **Local overrides shared generated values**: Given shared `env.DEBUG=false` and local `env.DEBUG=true`, when generation runs, then effective generated target contains `DEBUG=true` only where merge semantics allow override. Verify generated artifact.
- [x]   5. **Warning without devcontainerGitignore**: Given local config exists and `devcontainerGitignore` is absent or false, when generation runs, then stderr/stdout contains local-config warning and remediation. Verify with command test.
- [x]   6. **Output gitignore with true**: Given local config exists and `devcontainerGitignore: true`, when generation runs, then `outputPath/.gitignore` contains `*` and `!.gitignore`. Verify file content.
- [x]   7. **Tracked output warning**: Given local config exists, `devcontainerGitignore: true`, and Git index tracks a file under `outputPath`, when generation runs inside Git repo, then command warns that tracked files remain tracked and prints `git rm -r --cached -- <outputPath>`. Verify with temp Git repo test.
- [x]   8. **No Git index mutation**: Given tracked output files, when `regen` runs, then `git ls-files -- <outputPath>` still lists files after run. Verify with temp Git repo test.
- [x]   9. **Local file ignore guidance**: Given root `.gitignore` lacks `superposition.local.yml`, when generation runs with local config, then implementation either appends ignore entry or prints exact add-line guidance. Verify chosen behavior by test.
- [x]   10. **Docs and schema updated**: Given docs and schema generation, when user reads `docs/superposition-yml.md` or local config docs, then examples describe `superposition.local.yml`, allowed fields, warning behavior, and untrack command. Verify docs include examples and schema validates allowed fields.

## Dependencies & Impact

- **Affected Areas**: project-config parser, generation input resolution, composer merge order, CLI output, Git detection utility, schema generation, docs, tests, CHANGELOG.
- **Compatibility Impact**: Backward compatible when no local config exists. New warnings appear only when local config exists or ignored output is already tracked.
- **Required Documentation Updates**: `docs/superposition-yml.md`, `docs/team-workflow.md`, `docs/filesystem-contract.md`, README if current setup docs mention committed `.devcontainer`, schema docs, CHANGELOG.
- **Architecture Decision Impact**: No ADR required for local config or root `.gitignore` auto-append; this aligns with existing root `.gitignore` mutation behavior. New ADR/foundation review required before any automatic Git index mutation such as `git rm --cached`. `docs/foundation.md` is missing, so implementation must re-check it only if restored before code work; otherwise use available architecture docs named in Workflow Review Notes.

## Risks

- Local config could undermine reproducibility if users mistake generated output for shared source. Mitigate via warnings and `devcontainerGitignore` guidance.
- Automatic root `.gitignore` edits may surprise users. Mitigate through exact CLI message and docs; architect-selected policy is idempotent auto-append with warn-only fallback on write failure.
- Git detection can fail outside Git repos. Treat as no tracked-file warning and do not fail generation.
- Local paths using `${HOME}` may not resolve as expected in devcontainer mount syntax. Docs should use tested mount formats.

## Out of Scope

- Per-user profiles or multiple local config layers.
- Secret management beyond existing env/template behavior.
- Remote team policy enforcement for Git commits.
- Reworking generated `.devcontainer` commit strategy beyond warning/untrack guidance.

## Implementation Notes

- Added `superposition.local.yml` discovery, validation, empty-file handling, unsupported `.superposition.local.yml` warning, local schema URL, and runtime parsing for allowed fields only.
- Added local merge helper for env, mounts, shell, and customizations; CLI applies local enrichment only for generated devcontainer output, not manifest-only/from-manifest flows, and never writes local values to shared project config.
- Added root `.gitignore` auto-append for `superposition.local.yml`, generated-output safety messages, tracked-output Git query, and no Git index mutation.
- Added `tool/schema/superposition.local.schema.json`, docs updates, changelog entry, and local-config tests covering parser, merge, warnings, gitignore output, invalid-key no-write behavior, and tracked-file detection.
- QA fix: fresh `init` now loads and validates `superposition.local.yml` even when no shared project config exists, before project-file or generated-output writes; added regression tests for fresh-init local mount application and invalid local key no-write behavior.
- Validation run: `npm run schema:generate`; `npm run lint:fix`; `npm run lint`; `npx vitest run tool/__tests__/local-config.test.ts tool/__tests__/gitignore.test.ts tool/__tests__/project-mounts.test.ts tool/__tests__/project-env.test.ts tool/__tests__/project-shell.test.ts`; `npm test`; `npm run init -- regen`; `npm run init -- doctor` (passes with two existing suggested-overlay warnings, no reproducibility errors).
- QA-fix validation run: `npx vitest run tool/__tests__/local-config.test.ts`; `npm run lint:fix`; `npm run lint`.

## Success Criteria

- Developers can add a local mount, run `regen`, and see generated devcontainer output updated without editing shared config.
- Repos using local config receive clear warning unless generated output is ignored.
- Existing tracked generated files are detected and users receive safe untrack guidance.
- Unit and integration tests cover local config merge and Git safety behavior.
