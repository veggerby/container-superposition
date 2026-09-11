# Engineering Foundation

## Purpose

This file records stable repository-local product, domain, architecture, and engineering expectations for Container Superposition. It is authority for humans and automation when changing the CLI, composition engine, schemas, overlays, generated artifacts, and contributor workflow.

Keep this document specific to this repository. Process rules for agents and contributors belong in `AGENTS.md`, delivery artefacts, or skills unless they define a stable engineering boundary for this project.

## Product and domain

Container Superposition is a project-file-first devcontainer generator. Users select a base stack, overlays, presets, parameters, and project-level settings, then the tool materializes normal `.devcontainer/` output that can be inspected and edited.

Primary users are developers and teams who want reproducible devcontainer setup without maintaining one-off scaffolding from scratch. Maintainers also use the repository to author built-in overlays, templates, schemas, docs, and workflow guidance.

Core domain terms:

- `superposition.yml` or `.superposition.yml` - canonical shared project intent.
- `superposition.local.yml` - optional machine-local enrichment that must not become shared team intent.
- `superposition.json` - generated compatibility and audit receipt, not primary steady-state authority when a project file exists.
- Overlay - a modular capability declared under `overlays/<id>/overlay.yml` plus generated-output fragments.
- Preset - a reusable selection pattern that can expand to overlays and parameters.
- Catalog - the built-in or externally declared overlay and preset source used to build the effective registry.

Explicit non-scope: the generated `.devcontainer/` output remains standard devcontainer configuration. The tool should not become a proprietary runtime platform, mutate Git index state, or silently take ownership of unrelated repository files.

## System context

The published package runs as a local Node.js 20+ CLI through `container-superposition` or `cs`. It uses Commander and Inquirer for command routing and prompts, reads YAML/JSON/Markdown project inputs, and writes project configuration plus `.devcontainer/` artifacts.

Runtime environments include local development shells, VS Code Dev Containers, GitHub Codespaces-compatible generated output, and CI jobs that validate overlays, generated docs, schemas, and release packaging. External integrations are intentionally narrow: npm publishing, GitHub Actions, Docker/devcontainer-compatible output, and optional user-declared private catalogs fetched from git/archive/path sources.

## Scope legend

This document uses explicit scope markers so rules are not confused:

- **[Tool code]** — applies to this repository's implementation, structure, source files, tests, and generated repo artifacts
- **[Tool contract]** — applies to how the tool behaves for users
- **[Tool input/output]** — applies to user-authored inputs or generated outputs such as `superposition.yml`, `superposition.json`, `.devcontainer/`, overlay metadata, and generated docs/schema
- **[Both]** — applies to both implementation and user-facing tool behavior

## Principles

- **[Tool input/output] Repository project file is the canonical shared intent**. `superposition.yml` or `.superposition.yml` is the durable input for generation, replay, remediation, and team workflows.
- **[Tool contract] Generated output stays normal and editable**. The tool materializes standard `.devcontainer/` files that users can inspect and edit; generated output is not a proprietary runtime format.
- **[Both] Composition and replay must stay deterministic**. The same project file, overlays, and parameters should produce the same generated result and diagnostics, and the implementation must preserve that determinism.
- **[Tool input/output] Overlay capabilities stay modular and explicit**. Base templates provide the starting shape; overlays add capabilities through declared metadata, merge rules, and optional generated artifacts.
- **[Tool contract] Safety beats silent mutation**. The tool may update project artifacts needed for generation and remediation, but must not silently mutate unrelated state or the Git index.
- **[Tool code] Generated artifacts in this repository are owned at the source**. `dist/`, generated overlay docs, and generated schema files are outputs of source files and must be regenerated, not hand-edited.

## Repository structure and ownership

- `scripts/` owns CLI entry points, source-vs-compiled path resolution, and command bootstrap wiring.
- `tool/cli/` owns shared command orchestration and command-line behavior composition.
- `tool/commands/` owns command-specific workflows such as preview, adoption, migration, diagnostics, hashing, and discovery.
- `tool/questionnaire/`, `tool/utils/merge.ts`, and related helpers own selection normalization and deterministic devcontainer composition.
- `tool/schema/` owns project-file and local/global config types plus generated schema source logic.
- `templates/`, `features/`, and `overlays/` own reusable generation inputs.
- `docs/`, `docs/specs/`, `docs/adr/`, `docs/opportunities/`, and `docs/agent-evals/` own product, architecture, planning, evaluation, and workflow authority.
- `dist/`, `docs/overlays.md`, and `tool/schema/*.schema.json` are generated outputs and must be regenerated from source rather than hand-edited.

## Architecture

### Layers / structure

The repository is organized around a small CLI and a composition engine:

- **CLI and command orchestration** — `scripts/` and `tool/cli/` coordinate interactive and non-interactive workflows.
- **Command logic** — `tool/commands/` owns preview, migration, adoption, diagnostics, and related command behavior.
- **Composition engine** — `tool/questionnaire/`, `tool/utils/merge.ts`, and related helpers resolve selections into generated devcontainer artifacts.
- **Schema and configuration model** — `tool/schema/` defines repository project-file types, manifest handling, loaders, and derived schema outputs.
- **Catalog and templates** — `templates/`, `features/`, and `overlays/` hold the reusable building blocks that generation composes.
- **Documentation and workflow artifacts** — `docs/`, `docs/specs/`, `docs/adr/`, and `docs/opportunities/` capture product, architecture, and planning authority.

### Ownership rules

- **[Tool input/output] Project file authority** lives in `superposition.yml` / `.superposition.yml`.
- **[Tool input/output] Compatibility and replay receipts** live in `superposition.json`, but that manifest is output-first rather than the primary long-term source of truth.
- **[Tool input/output] Generated `.devcontainer/` output** is a materialized artifact derived from project intent plus preserved custom patches.
- **[Tool input/output] Overlay metadata** belongs in `overlays/*/overlay.yml`; generated overlay reference docs and schema outputs must be regenerated from overlay sources.
- **[Tool code] Compiled output** in `dist/` is derived from TypeScript source and must not be edited directly.

### Boundary rules

- **[Tool code]** Command modules should prefer thin orchestration over large mixed-responsibility files.
- **[Tool code]** Path-sensitive logic must work from both source and compiled locations using candidate-path resolution patterns.
- **[Tool code]** New overlay categories or overlay-type changes must be reflected in both schema types and questionnaire/composer logic in the same change.
- **[Tool contract]** Custom project intent should be preserved through explicit project-file or `custom/` mechanisms, not through undocumented mutation of generated files.

## Technology choices

| Concern                  | Choice               | Notes                                                                  |
| ------------------------ | -------------------- | ---------------------------------------------------------------------- |
| Language                 | TypeScript 5.3.3     | Source of truth for CLI and tool logic                                 |
| Runtime                  | Node.js 20+          | Declared in `package.json` and `AGENTS.md`                             |
| Module system            | ESM                  | Imports must use `.js` extensions even from `.ts` sources              |
| CLI framework            | Commander + Inquirer | Commander for argument parsing; Inquirer prompts for interactive flows |
| Test runner              | Vitest               | `npm test` runs the unit and command-level suites                      |
| Formatter                | Prettier             | Enforced through `npm run lint`                                        |
| Schemas / config formats | JSON, YAML, Markdown | Project config and overlay metadata are human-editable text artifacts  |

## Non-negotiable standards

- **[Tool code]** Use `.js` file extensions in local ESM imports.
- **[Tool code]** Do not edit `dist/` directly.
- **[Tool code]** Do not edit generated `docs/overlays.md` directly; regenerate it from overlay sources.
- **[Tool code]** Do not edit generated schema files directly; regenerate them from source types and overlays.
- **[Tool input/output]** Overlay conflicts are bidirectional.
- **[Tool input/output]** Docker Compose overlays must keep the logical network key `devnet` declared inline; do not use `external: true`. The generated `docker-compose.yml` owns the final `networks.devnet.name` value from shared project config or the repo-derived default.
- **[Tool code]** Feature work follows spec-first development with a spec committed under `docs/specs/` before implementation.
- **[Tool code]** User-visible changes should be reflected in `CHANGELOG.md`.

## Engineering quality expectations

- **Correctness:** Changes prove behavior through targeted tests first, then required validation gates before handoff. User-visible workflow changes need Behave coverage or an explicit existing-coverage justification.
- **Simplicity:** Preserve thin command orchestration and avoid speculative abstractions, new dependencies, or framework behavior not demanded by a spec or ADR.
- **Maintainability:** Keep ownership boundaries visible. Shared behavior belongs in shared modules, while command-specific behavior belongs in command modules.
- **Testability:** Deterministic generation, schema validation, command output, and doctor findings should be reproducible in unit, command-level, and Behave tests where relevant.
- **Security and privacy:** Project files and generated outputs must not embed private catalog credentials or secret literals where repository authority forbids them.
- **Reliability and operability:** `regen` and `doctor` must use stable project-file authority and produce actionable diagnostics without mutating unrelated state.
- **Compatibility:** Public project-file fields, generated schema, docs, and command hints must remain aligned. Breaking behavior needs explicit spec, docs, and changelog treatment.
- **Documentation:** README, docs index, reference docs, specs, ADRs, changelog, and generated schema outputs stay synchronized with user-visible behavior.

## Validation and release expectations

- `task validate` is the required local pre-completion gate. It runs formatting fixes, lint/type checks, and the Vitest suite.
- `task validate:generated` is required or expected when changes affect overlays, generated schemas, generated docs, generated output, or reproducibility behavior.
- `npm run test:bdd` / `task test:bdd` validates Behave acceptance scenarios for user-visible workflow and overlay behavior.
- `npm run schema:generate` regenerates project/local/global schema outputs after config type or overlay changes.
- `npm run docs:generate` regenerates overlay reference docs after overlay changes.
- `npm run init -- regen` and `npm run init -- doctor` validate replay and reproducibility when generated-output behavior changes.
- Release packaging is npm-based and mediated by GitHub Actions according to repository publishing documentation.

## Data, security, and privacy

- User-authored project files may contain environment values, parameters, mounts, catalog declarations, and local-only overrides. Shared files should avoid literal secrets.
- `superposition.local.yml` is machine-local input and should not be tracked. Doctor checks warn when local-only config or generated output is tracked unsafely.
- Private catalog declarations are trusted-code inputs. Git catalogs require immutable commits, archive catalogs require SHA-256 integrity, and v1 forbids inline credentials and external ID shadowing.
- The tool must not mutate the Git index automatically. It may print manual remediation guidance when tracked generated or local-only files need attention.

## Operational notes

- This is a local CLI and generated-artifact tool, not a hosted service. Operational evidence primarily comes from local command output, generated files, reproducibility checks, and GitHub Actions logs.
- Common failures should be diagnosed through `cs doctor`, targeted command tests, Behave scenarios, schema regeneration checks, and generated diff review.
- Repository-local contributor skills under `.pi/skills/` provide focused delivery evidence for CLI command work, documentation alignment, workflow sync, dogfooding safety, overlay development, overlay requirements capture, and overlay solution discovery.

## Documentation map

- `README.md` - user quickstart and high-level command guide.
- `docs/README.md` - documentation index and route into user, architecture, and contributor docs.
- `docs/superposition-yml.md` - canonical project-file authoring reference.
- `docs/workflows.md`, `docs/filesystem-contract.md`, `docs/adopt.md`, and command docs - workflow and generated-artifact behavior.
- `docs/foundation.md` - stable architecture and engineering authority.
- `docs/adr/` - standing architectural decisions and exceptions.
- `docs/specs/` - feature-specific product, design, implementation, and QA authority.
- `docs/definition-of-done.md` - quality gates and completion criteria.
- `CONTRIBUTING.md` and `Taskfile.yml` - contributor setup and runnable validation entry points.
- `.github/instructions/` - additional GitHub Copilot-oriented maintainer instructions; reconcile with `AGENTS.md` and this file when conflicts are found.

## Known constraints

- **[Tool code]** The repository supports both source execution and compiled execution, so path resolution must account for both layouts.
- **[Tool contract]** Generated output is intentionally editable, but deterministic regeneration and doctor remediation depend on the repository project file remaining authoritative.
- **[Both]** Some older docs still reflect earlier product phases and may need follow-up alignment with ADR `001` and current workflows.

## Active ADRs

| ID                                                              | Title                                                        | Status   | Summary                                                                                                                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [001](adr/adr001-project-file-first-replay-and-regeneration.md) | Project-file-first replay and regeneration workflow          | Proposed | Makes the repository project file the canonical shared input for generation, replay, and remediation while retaining the manifest as a generated compatibility artifact. |
| [002](adr/adr002-versioned-private-catalog-resolution.md)       | Versioned private catalog resolution and namespace semantics | Proposed | Defines the effective registry, namespace qualification, immutable identity, and no-override rules for external overlay and preset catalogs.                             |
