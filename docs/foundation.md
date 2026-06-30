# Engineering Foundation

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
- **[Tool input/output]** Docker Compose networks in overlays must be declared inline with `name: devnet`; do not use `external: true`.
- **[Tool code]** Feature work follows spec-first development with a spec committed under `docs/specs/` before implementation.
- **[Tool code]** User-visible changes should be reflected in `CHANGELOG.md`.

## Known constraints

- **[Tool code]** The repository supports both source execution and compiled execution, so path resolution must account for both layouts.
- **[Tool contract]** Generated output is intentionally editable, but deterministic regeneration and doctor remediation depend on the repository project file remaining authoritative.
- **[Both]** Some older docs still reflect earlier product phases and may need follow-up alignment with ADR `001` and current workflows.

## Active ADRs

| ID                                                              | Title                                               | Status   | Summary                                                                                                                                                                  |
| --------------------------------------------------------------- | --------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [001](adr/adr001-project-file-first-replay-and-regeneration.md) | Project-file-first replay and regeneration workflow | Proposed | Makes the repository project file the canonical shared input for generation, replay, and remediation while retaining the manifest as a generated compatibility artifact. |
