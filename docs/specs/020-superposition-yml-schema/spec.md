# Spec 020: JSON Schema for `superposition.yml`

## Overview

Introduce a JSON Schema for `superposition.yml` / `.superposition.yml` project files. The schema
enables editor auto-complete, inline validation, and tooling integration via the `$schema`
property. It is generated automatically from source and kept in sync as part of the
Definition of Done.

## Goals

1. **Authoring guidance** — editors that support JSON Schema (VS Code, JetBrains, etc.) can
   provide completions and inline error highlighting when editing `superposition.yml`.
2. **Generated automatically** — the schema is produced by `npm run schema:generate` from the
   TypeScript types and live overlay registry, so it never goes stale.
3. **Static referrable URL** — a stable URL pointing to the `main`-branch schema can be
   added to any project's `superposition.yml` once and just works across versions.
4. **Published with each release** — the schema file is uploaded as a release asset so
   versioned pinning is also possible.
5. **Embedded in generated files** — the tool injects a `$schema` line into every
   `superposition.yml` it writes so users get validation for free without manual setup.

## Schema URL

| Purpose             | URL                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Static / latest     | `https://raw.githubusercontent.com/veggerby/container-superposition/main/tool/schema/superposition.schema.json`       |
| Versioned (per tag) | `https://raw.githubusercontent.com/veggerby/container-superposition/v{VERSION}/tool/schema/superposition.schema.json` |
| Release asset       | Attached to each GitHub release as `superposition.schema.json`                                                        |

The static URL is always current and is the one written into generated `superposition.yml` files.

## Schema file location

`tool/schema/superposition.schema.json` — committed to the repository and updated by
`npm run schema:generate`. Do not edit manually.

## Generator script

`scripts/generate-schema.ts` — run via `tsx` with `npm run schema:generate`.

The generator:

1. Imports the enum constant arrays (`STACK_VALUES`, `BASE_IMAGE_VALUES`, `TARGET_VALUES`,
   `EDITOR_VALUES`, `PROJECT_ENV_TARGET_VALUES`, `PROJECT_MOUNT_TARGET_VALUES`) directly from
   `tool/schema/project-config.ts`. These are the same arrays used at runtime for validation,
   so the schema and the parser are always in agreement.
2. Loads the live overlay registry (same path-resolution logic as `docs/generate-docs.ts`).
3. Extracts overlay IDs by category, matching the `buildCategoryLookup()` rules (incl.
   `database` + `messaging` both mapping to the `database` legacy field).
4. Builds a JSON Schema (draft-07) describing `ProjectConfigSelection`, including:
    - Enum values for `stack`, `baseImage`, `target`, `editor` derived from exported constants
    - Dynamic `enum` for `overlays` items — non-preset overlay IDs only (presets are restricted
      to the `preset` field)
    - Per-category `enum` values for the legacy arrays (`language`, `database`, etc.) using the
      same category rules as `buildCategoryLookup()`
    - All compound types (`env`, `mounts`, `shell`, `customizations`, `parameters`)
5. Writes the result to `tool/schema/superposition.schema.json`.

## Definition of Done additions

- `npm run schema:generate` must be run (and its output committed) whenever:
    - A new overlay is added or removed
    - The `ProjectConfigSelection` type changes (new/renamed/removed fields)
    - Enum values for `stack`, `baseImage`, `target`, `editor` change
- The CI validation workflow (`generate-docs.yml`) checks that the committed schema matches
  a freshly generated one (same as the docs-sync check).

## Serialization and round-trip

`buildProjectConfigDocument` in `tool/schema/project-config.ts` places `$schema` as the
first key in the YAML output. The value is taken from `selection.$schema` (the value that was
in the file when it was loaded) with `SUPERPOSITION_SCHEMA_URL` as the fallback for new files.
This means any user-pinned schema URL (e.g. a versioned release URL) is preserved on `regen`.

## Release workflow

The `publish.yml` workflow gains two steps after build:

1. `npm run schema:generate` — regenerates the schema using the published version's overlay
   set.
2. `gh release upload` — uploads `tool/schema/superposition.schema.json` as a release asset
   to the current GitHub release.
