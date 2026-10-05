# container-superposition

[![Validate Overlays](https://github.com/veggerby/container-superposition/actions/workflows/validate-overlays.yml/badge.svg)](https://github.com/veggerby/container-superposition/actions/workflows/validate-overlays.yml)
[![Build DevContainers](https://github.com/veggerby/container-superposition/actions/workflows/build-devcontainers.yml/badge.svg)](https://github.com/veggerby/container-superposition/actions/workflows/build-devcontainers.yml)
[![npm version](https://badge.fury.io/js/container-superposition.svg)](https://www.npmjs.com/package/container-superposition)

Composable devcontainer scaffolds that collapse into normal, editable configs.

## Development Policy

This project follows spec-first development. Every feature MUST start with a
reviewed spec committed under `docs/specs/` before implementation code is
written.

## Quickstart

`superposition.yml` (or `.superposition.yml`) is the canonical shared input.
Commit it to the repository. Use a flat `overlays:` list for explicit team
selection; presets are optional shortcuts. `superposition.json` is a generated
compatibility receipt, not the normal file to edit.

```bash
# Discover and inspect the current catalog (read-only).
npx container-superposition list
npx container-superposition explain postgres

# Preview before any write. --verbose explains resolution; --diff reviews change.
npx container-superposition plan --stack compose --overlays nodejs,postgres
npx container-superposition plan --stack compose --overlays nodejs,postgres --verbose
npx container-superposition plan --stack compose --overlays nodejs,postgres --diff

# Declare shared project intent, then write generated output.
cat > superposition.yml <<'YAML'
stack: compose
overlays:
  - nodejs
  - postgres
env:
  APP_ENV: development
YAML
npx container-superposition init --no-interactive

# After a reviewed project-file change, replay it.
npx container-superposition regen

# Use the guided questionnaire when you want help authoring shared intent.
npx container-superposition init

# Migrate a manifest-only repository to the project-file model.
npx container-superposition migrate
```

Use `defaults --json` to inspect personal init defaults and `defaults
refresh-local` to explicitly create local enrichment. Use `amend` for a
non-adopting repository with an existing team-owned devcontainer.

## What It Does

- Base templates: `plain` (single image) and `compose` (multi-service).
- Overlays: add languages, databases, observability, cloud tools, dev tools.
- Catalogs: mix the built-in catalog with project-pinned private catalogs declared in `superposition.yml`.
- Composition: merges overlays into a standard `.devcontainer/` you can edit freely.
- Compose defaults: tool-owned compose port bindings are hard-rendered to final numeric host ports; `.devcontainer/.env` and `.devcontainer/.env.example` are opt-in artifacts only via `--compose-env-files` / `composeEnvFiles: true`.
- Local amendment: `amend init|refresh|inspect|remove` layers personal local additions onto a non-adopting repository's existing team-owned devcontainer without creating shared Container Superposition intent; VS Code's ordinary reopen flow keeps using the team base, so launch the personal layer with the printed `devcontainer up --workspace-folder ... --config ...` command and then attach/open with Dev Containers.
- Project config: `superposition.yml` (or `.superposition.yml`) is the **canonical input** for all
  generation and regeneration flows. Commit it to your repo for reproducible team and CI builds.
    - `init` always writes `superposition.yml` as its primary output
    - Normal `regen` reads the project file — `superposition.json` is an output-only receipt; `regen --from-manifest` is deprecated compatibility/migration support only
    - Repos without a project file should run `cs migrate` once to create one from their manifest
    - Optional `~/.superposition.yml` defaults can prefill only eligible fresh `init` runs (`~/.container-superposition.yml` still works and wins when both exist); inspect the effective document with read-only `cs defaults --json`
    - `doctor` compares the project file against the last-generated manifest and reports drift

## Core Commands

All commands accept `--silent` to suppress routine human-readable status, progress, warnings, summaries, and guidance while retaining error diagnostics. `--silent` cannot be combined with `--json`; the CLI rejects that combination before command work begins.

- `init` — run the interactive questionnaire; always writes `superposition.yml` and (by default) scaffolds `.devcontainer/`
    - Add `--compose-env-files` to persist `composeEnvFiles: true` and generate `.devcontainer/.env` plus `.devcontainer/.env.example`
    - Add `--no-scaffold` to write only the project file without generating `.devcontainer/`
    - Add `--ignore-global-defaults` to bypass `~/.container-superposition.yml` and `~/.superposition.yml` for one run
    - Add `--project-root <path>` to resolve persisted input from a different repository root
- `defaults` — inspect the selected home-directory global defaults file read-only; reports `~/.container-superposition.yml` over `~/.superposition.yml` precedence and never feeds replay/remediation
    - `defaults refresh-local` explicitly creates or refreshes `superposition.local.yml` from its validated template. Existing files require confirmation (or noninteractive `--force`) and are first preserved as timestamped sibling backups; this is sync input only, never replay/remediation authority.
- `regen` — deterministically replay the repository project file (`superposition.yml` required)
    - Add `--compose-env-files` to update shared intent to `composeEnvFiles: true` before regeneration
    - Add `--project-root <path>` to resolve persisted input from a different repository root
- `migrate` — one-time migration: creates `superposition.yml` from an existing `superposition.json`
    - Required for repos that ran `init` before this project-file-first model was introduced
- `adopt` — migrate an existing `.devcontainer/` to the overlay-based workflow
- `amend` — create, refresh, inspect, or remove a personal local amendment layer for an existing team-owned devcontainer without adoption
- `list` — browse overlays and presets
- `explain` — inspect overlay or preset details
- `plan` — preview output before writing
    - Add `--verbose` to narrate dependency resolution and inclusion reasons
    - Compatibility / migration only: add `--from-manifest <path>` to inspect a legacy manifest before migrating it to a project file
- `hash` — deterministic environment fingerprint
- `doctor` — validate environment and detect project-file drift

## Documentation

Start here:

- [Docs index](https://github.com/veggerby/container-superposition/blob/main/docs/README.md)
- [**superposition.yml reference**](https://github.com/veggerby/container-superposition/blob/main/docs/superposition-yml.md) ← project file authoring guide
- [Versioned private catalogs](https://github.com/veggerby/container-superposition/blob/main/docs/private-catalogs.md)
- [Quick reference](https://github.com/veggerby/container-superposition/blob/main/docs/quick-reference.md)
- [Adopt command](https://github.com/veggerby/container-superposition/blob/main/docs/adopt.md)
- [Local devcontainer amendment](https://github.com/veggerby/container-superposition/blob/main/docs/local-devcontainer-amendment.md)
- [Hash command](https://github.com/veggerby/container-superposition/blob/main/docs/hash.md)
- [Examples](https://github.com/veggerby/container-superposition/blob/main/docs/examples.md)
- [Presets](https://github.com/veggerby/container-superposition/blob/main/docs/presets.md)
- [Architecture](https://github.com/veggerby/container-superposition/blob/main/docs/architecture.md)
- [Overlays](https://github.com/veggerby/container-superposition/blob/main/docs/overlays.md)
- [Custom patches](https://github.com/veggerby/container-superposition/blob/main/docs/custom-patches.md)
- [Workflows and regen](https://github.com/veggerby/container-superposition/blob/main/docs/workflows.md)
- [Filesystem contract](https://github.com/veggerby/container-superposition/blob/main/docs/filesystem-contract.md)
- [Security](https://github.com/veggerby/container-superposition/blob/main/docs/security.md)
- [Publishing](https://github.com/veggerby/container-superposition/blob/main/docs/publishing.md)

## Examples

- [Example projects](https://github.com/veggerby/container-superposition/tree/main/examples)
- [Examples guide](https://github.com/veggerby/container-superposition/blob/main/docs/examples.md)

## Contributing

See [CONTRIBUTING.md](https://github.com/veggerby/container-superposition/blob/main/CONTRIBUTING.md). Overlay and generated-output behavior changes now use the shared Behave workflow via `npm run test:bdd` / `task test:bdd`, with `task validate:generated` as the full pre-handoff path.

## License

MIT. See [LICENSE](https://github.com/veggerby/container-superposition/blob/main/LICENSE)
