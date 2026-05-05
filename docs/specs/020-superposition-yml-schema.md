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

1. Loads the live overlay registry (same path-resolution logic as `docs/generate-docs.ts`).
2. Extracts all overlay IDs from `OverlayMetadata` entries (excluding presets) plus preset IDs
   separately.
3. Builds a JSON Schema (draft-07) describing `ProjectConfigSelection`, including:
    - Static enums for `stack`, `baseImage`, `target`, `editor`
    - Dynamic `enum` for overlay IDs in the `overlays` array items
    - All compound types (`env`, `mounts`, `shell`, `customizations`, `parameters`)
    - The legacy category arrays (`language`, `database`, `observability`, `cloudTools`,
      `devTools`, `playwright`) as deprecated alternatives
4. Writes the result to `tool/schema/superposition.schema.json`.

## Definition of Done additions

- `npm run schema:generate` must be run (and its output committed) whenever:
    - A new overlay is added or removed
    - The `ProjectConfigSelection` type changes (new/renamed/removed fields)
    - Enum values for `stack`, `baseImage`, `target`, `editor` change
- The CI validation workflow (`generate-docs.yml`) checks that the committed schema matches
  a freshly generated one (same as the docs-sync check).

## Serialization change

`buildProjectConfigDocument` in `tool/schema/project-config.ts` is updated to place
`$schema` as the first key in the YAML output when `SUPERPOSITION_SCHEMA_URL` is set.
This mirrors the existing `withSchemaFirst` helper already used for devcontainer patches.

## Release workflow

The `publish.yml` workflow gains two steps after build:

1. `npm run schema:generate` — regenerates the schema using the published version's overlay
   set.
2. `gh release upload` — uploads `tool/schema/superposition.schema.json` as a release asset
   to the current GitHub release.
