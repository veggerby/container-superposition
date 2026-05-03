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

```bash
# Guided questionnaire — always writes superposition.yml
npx container-superposition init

# Declarative project config committed in the repo
cat > .superposition.yml <<'YAML'
stack: compose
language:
  - nodejs
database:
  - postgres
env:
  APP_ENV: development
mounts:
  - "./local-tools:/workspace/tools"
customizations:
  envTemplate:
    POSTGRES_PASSWORD: postgres
YAML
npx container-superposition init --no-interactive

# Regenerate from the repository project file (superposition.yml is required)
npx container-superposition regen

# Or select the project file explicitly
npx container-superposition regen --from-project

# Non-interactive example
npx container-superposition init --stack compose --language nodejs --database postgres

# Write only superposition.yml without generating .devcontainer/
npx container-superposition init --stack compose --language nodejs --no-scaffold

# Preview before writing files
npx container-superposition plan --stack compose --overlays nodejs,postgres,grafana

# Explain why dependencies were included
npx container-superposition plan --stack compose --overlays grafana --verbose

# Migrate a manifest-only repo to the project-file model
npx container-superposition migrate
```

## What It Does

- Base templates: `plain` (single image) and `compose` (multi-service).
- Overlays: add languages, databases, observability, cloud tools, dev tools.
- Composition: merges overlays into a standard `.devcontainer/` you can edit freely.
- Project config: `superposition.yml` (or `.superposition.yml`) is the **canonical input** for all
  generation and regeneration flows. Commit it to your repo for reproducible team and CI builds.
    - `init` always writes `superposition.yml` as its primary output
    - `regen` reads only the project file — `superposition.json` is an output-only receipt
    - Repos without a project file should run `cs migrate` once to create one from their manifest
    - `doctor` compares the project file against the last-generated manifest and reports drift

## Core Commands

- `init` — run the interactive questionnaire; always writes `superposition.yml` and (by default) scaffolds `.devcontainer/`
    - Add `--no-scaffold` to write only the project file without generating `.devcontainer/`
    - Add `--project-root <path>` to resolve persisted input from a different repository root
- `regen` — deterministically replay the repository project file (`superposition.yml` required)
    - Add `--project-root <path>` to resolve persisted input from a different repository root
- `migrate` — one-time migration: creates `superposition.yml` from an existing `superposition.json`
    - Required for repos that ran `init` before this project-file-first model was introduced
- `adopt` — migrate an existing `.devcontainer/` to the overlay-based workflow
- `list` — browse overlays
- `explain` — overlay details
- `plan` — preview output
    - Add `--verbose` to narrate dependency resolution and inclusion reasons
    - Add `--from-manifest <path>` to preview an existing manifest with the same explanation model
- `hash` — deterministic environment fingerprint
- `doctor` — validate environment and detect project-file drift

## Documentation

Start here:

- [Docs index](https://github.com/veggerby/container-superposition/blob/main/docs/README.md)
- [**superposition.yml reference**](https://github.com/veggerby/container-superposition/blob/main/docs/superposition-yml.md) ← project file authoring guide
- [Quick reference](https://github.com/veggerby/container-superposition/blob/main/docs/quick-reference.md)
- [Adopt command](https://github.com/veggerby/container-superposition/blob/main/docs/adopt.md)
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

See [CONTRIBUTING.md](https://github.com/veggerby/container-superposition/blob/main/CONTRIBUTING.md)

## License

MIT. See [LICENSE](https://github.com/veggerby/container-superposition/blob/main/LICENSE)
