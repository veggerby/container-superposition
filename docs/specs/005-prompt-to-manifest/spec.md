# Feature Specification: Prompt-to-Manifest — AI-Powered Intent-Driven Environment Scaffolding

**Feature Branch**: `005-prompt-to-manifest`
**Created**: 2026-03-20
**Status**: Final
**Input**: Add an AI-powered `generate` command (backed by Mastra) that accepts a natural-language prompt and produces a validated `superposition.yml` manifest — or a full generated devcontainer scaffold — by mapping user intent to the existing overlay catalog and running it through the standard composition pipeline.

> Use repo-relative Markdown links for repository files. The root `README.md`
> is the only exception and may use package-friendly hosted URLs.

## Review & Approval _(mandatory before implementation)_

- **Spec Path**: `docs/specs/005-prompt-to-manifest/spec.md`
- **Commit Status**: Committed
- **Review Status**: Approved
- **Implementation Gate**: No implementation code may begin until this spec is committed and reviewed.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Generate a manifest from a natural-language prompt (Priority: P1)

A developer describes their desired environment in plain English and gets a `superposition.yml` manifest without knowing the overlay taxonomy.

**Why this priority**: This is the core user value. Removing the cognitive burden of knowing which overlays to select makes the tool accessible to new contributors and cross-team audiences.

**Independent Test**: Run `generate --prompt "Python app with postgres"` and confirm the generated `superposition.yml` contains at least the `python` and `postgres` overlays.

**Acceptance Scenarios**:

1. **Given** a user runs `cs generate --prompt "Python 3.12 app with postgres, redis and playwright"`, **When** an OpenAI API key is in the environment, **Then** the tool writes a `superposition.yml` containing at minimum the `python`, `postgres`, `redis`, and `playwright` overlays.
2. **Given** no API key is configured, **When** the user runs `cs generate`, **Then** the tool exits with a clear, human-readable error message explaining what key is missing and how to set it.
3. **Given** `--no-interactive` is passed, **When** the LLM produces valid intent, **Then** the file is written without a confirmation prompt.

---

### User Story 2 — Modify an existing manifest with a natural-language diff (Priority: P1)

A developer with an existing `superposition.yml` expresses an incremental change without editing YAML manually.

**Why this priority**: Most real-world usage is incremental. Supporting modify-mode without forcing a full re-generation protects existing manifest content.

**Independent Test**: Create a `superposition.yml` and run `generate --prompt "add jaeger and remove otel-collector"`. Confirm the diff is applied and the original is backed up to `superposition.yml.bak`.

**Acceptance Scenarios**:

1. **Given** a `superposition.yml` is present and the user runs `cs generate --prompt "add jaeger"`, **When** the LLM returns a `ManifestDiff` containing `addOverlays: ['jaeger']`, **Then** `jaeger` is added to the overlay list in the written manifest.
2. **Given** a `superposition.yml` is present, **When** the generate command runs in modify mode, **Then** the original file is backed up to `superposition.yml.bak` before the new file is written.
3. **Given** `--from-scratch` is passed alongside an existing manifest, **When** the generate command runs, **Then** it ignores the existing manifest and performs full intent extraction.

---

### User Story 3 — Scaffold a full `.devcontainer/` from scratch (Priority: P2)

A developer uses `--scaffold` to skip the manifest-only step and immediately generate the full devcontainer output.

**Why this priority**: Many solo developers prefer the faster single-step path directly to a working `.devcontainer/`.

**Independent Test**: Run `generate --scaffold --prompt "Node monorepo with pnpm and TypeScript"` and confirm a `.devcontainer/devcontainer.json` is produced.

**Acceptance Scenarios**:

1. **Given** the user runs `cs generate --scaffold --prompt "Node.js with postgres"`, **When** the LLM intent maps successfully, **Then** both a `superposition.yml` and a `.devcontainer/` folder are produced.
2. **Given** `--scaffold` is combined with an existing manifest in modify mode, **When** the generate command runs, **Then** the diff is applied and the full devcontainer is re-composed.

---

### User Story 4 — Adopt an existing repo and generate a manifest (Priority: P2)

A developer uses `--adopt` to let the tool scan the repository for language/framework signals and combine those signals with the prompt.

**Why this priority**: Repo adoption is the practical on-ramp for brownfield projects. The LLM enriches the signal-based analysis with intent.

**Independent Test**: Run `generate --adopt --prompt "add observability"` in a repo that contains Node.js signals and confirm the result includes the `nodejs` overlay plus observability overlays.

**Acceptance Scenarios**:

1. **Given** the repo contains `package.json` and the user runs `cs generate --adopt --prompt "add observability"`, **When** the LLM receives both the repo signals and the prompt, **Then** the generated manifest includes language overlays inferred from the repo plus the requested observability overlays.

---

### User Story 5 — Pure function testability (Priority: P1)

The mapper functions are fully testable without any LLM interaction.

**Why this priority**: The deterministic pipeline must remain reliable and independently testable regardless of LLM availability or quota.

**Independent Test**: Call `mapIntentToAnswers` with a fixture `EnvironmentIntent` and confirm the returned `QuestionnaireAnswers` matches expected overlay assignments. Call `applyDiffToAnswers` with a fixture diff and confirm the overlay list is mutated correctly.

**Acceptance Scenarios**:

1. **Given** a fixed `EnvironmentIntent` with `{ language: ['nodejs'], services: ['postgres'] }`, **When** `mapIntentToAnswers` is called, **Then** `answers.language` contains `'nodejs'` and `answers.database` contains `'postgres'`.
2. **Given** existing `QuestionnaireAnswers` with `database: ['otel-collector']` and a `ManifestDiff` with `{ addOverlays: ['jaeger'], removeOverlays: ['otel-collector'] }`, **When** `applyDiffToAnswers` is called, **Then** the resulting answers contain `jaeger` and do not contain `otel-collector`.

---

## Architecture

### File Layout

```
tool/
  commands/
    generate.ts          # command handler (all modes)
  ai/
    intent.ts            # EnvironmentIntent + ManifestDiff types + Zod schemas
    mapper.ts            # mapIntentToAnswers() + applyDiffToAnswers()
    agent.ts             # Mastra agent setup + generate()/diff() wrappers
    overlay-context.ts   # serialise overlay catalog → LLM context string
```

### Mode Detection

| Condition                                            | Mode                                      |
| ---------------------------------------------------- | ----------------------------------------- |
| No existing `superposition.yml`, no `--from-scratch` | Generate (from scratch)                   |
| `superposition.yml` present, no `--from-scratch`     | Modify                                    |
| `--from-scratch` passed                              | Generate (from scratch, overrides modify) |
| `--scaffold` added to either mode                    | Full scaffold                             |
| `--adopt` added to either mode                       | Repo-scan enrichment                      |

### Data Types

#### `EnvironmentIntent`

```typescript
interface EnvironmentIntent {
    stack: Stack;
    baseImage?: BaseImage;
    language?: string[];
    runtimeVersions?: Record<string, string>;
    services?: string[];
    tools?: string[];
    observability?: string[];
    cloudTools?: string[];
    containerName?: string;
    goals?: string[];
}
```

#### `ManifestDiff`

```typescript
interface ManifestDiff {
    addOverlays: string[];
    removeOverlays: string[];
    changeStack?: Stack;
    changeBaseImage?: BaseImage;
    changeContainerName?: string;
}
```

### Integration Contracts

- **AI must not bypass the overlay model.** The overlay catalog is passed to the LLM as context; the LLM may only select from it, never invent IDs.
- **No network calls without API key.** Fail clearly with a human-readable error if `OPENAI_API_KEY` (or configured provider key) is absent.
- **Backup before mutate.** Modify mode writes `superposition.yml.bak` before overwriting.
- **Pure functions are LLM-free.** `mapIntentToAnswers`, `applyDiffToAnswers`, and `buildOverlayContextString` contain no AI calls and are fully Vitest-testable.
- **Standard pipeline unchanged.** `QuestionnaireAnswers` flows into the existing `generateManifestOnly` / `composeDevContainer` path unchanged.

### Explainer Output Format

```
Interpreted request as:
  • Add: jaeger, prometheus
  • Remove: otel-collector
  • Stack unchanged: compose

Resolved changes:
  • Added: jaeger (tracing UI)
  • Added: prometheus (metrics)
  • Removed: otel-collector

Assumptions:
  • Existing manifest retained for all other settings
```

### Confirmation Loop (Interactive Mode)

- Accept and write
- Edit interactively (feeds back into standard questionnaire)
- Abort

`--no-interactive` skips confirmation and writes directly.

---

## Design Decisions

1. **Mastra v1.15.0** is chosen for its structured output support (Zod schema → typed `generate()` call).
2. **OpenAI** is the default provider; the model string (`openai/gpt-4o-mini`) is configurable via the `CS_AI_MODEL` environment variable.
3. **Zod v4** is added as a production dependency for schema validation.
4. **`superposition.yml`** is the primary manifest file (as opposed to `superposition.json`) for the generate command output, to match the project config file convention.
5. The `--adopt` flag reuses the existing repo-scan logic from [`tool/commands/adopt.ts`](../../tool/commands/adopt.ts) rather than duplicating detection tables.

---

## Related Files

- [`tool/questionnaire/composer.ts`](../../tool/questionnaire/composer.ts) — `generateManifestOnly`, `composeDevContainer`, `prepareOverlaysForGeneration`, `resolveDependencies`
- [`tool/commands/adopt.ts`](../../tool/commands/adopt.ts) — existing repo-scanning logic reused in `--adopt` mode
- [`tool/commands/plan.ts`](../../tool/commands/plan.ts) — explainer output style reference
- [`tool/schema/types.ts`](../../tool/schema/types.ts) — `QuestionnaireAnswers`, `OverlayMetadata`
- [`tool/schema/overlay-loader.ts`](../../tool/schema/overlay-loader.ts) — `buildOverlaysConfigFromManifests`
- [`tool/schema/project-config.ts`](../../tool/schema/project-config.ts) — `PROJECT_CONFIG_FILENAMES` for manifest detection
- [`overlays/`](../../overlays/) — overlay catalog
