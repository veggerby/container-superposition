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
# Guided questionnaire
npx container-superposition init

# Declarative project config committed in the repo
cat > .superposition.yml <<'YAML'
stack: compose
language:
  - nodejs
database:
  - postgres
customizations:
  environment:
    APP_ENV: development
YAML
npx container-superposition init --no-interactive

# Regenerate from the repository project file
npx container-superposition regen

# Or select the project file explicitly
npx container-superposition regen --from-project

# Non-interactive example
npx container-superposition init --stack compose --language nodejs --database postgres

# Preview before writing files
npx container-superposition plan --stack compose --overlays nodejs,postgres,grafana

# Explain why dependencies were included
npx container-superposition plan --stack compose --overlays grafana --verbose

# Explain an existing manifest without re-entering overlays
npx container-superposition plan --from-manifest .devcontainer/superposition.json --verbose
```

## What It Does

- Base templates: `plain` (single image) and `compose` (multi-service).
- Overlays: add languages, databases, observability, cloud tools, dev tools.
- Composition: merges overlays into a standard `.devcontainer/` you can edit freely.
- Project config: commit `.superposition.yml` or `superposition.yml` to make team and CI generation declarative.
    - `regen` uses that project file by default when present
    - `--from-project` selects it explicitly
    - conflicting source combinations fail early
    - `init` stays the editable flow; `regen` is the deterministic replay flow

## Core Commands

- `init` — generate or modify a devcontainer, optionally starting from a project file or manifest
- `regen` — deterministically replay the repository project file or a manifest
- `adopt` — migrate an existing `.devcontainer/` to the overlay-based workflow
- `list` — browse overlays
- `explain` — overlay details
- `plan` — preview output
    - Add `--verbose` to narrate dependency resolution and inclusion reasons
    - Add `--from-manifest <path>` to preview an existing manifest with the same explanation model
- `hash` — deterministic environment fingerprint
- `doctor` — validate environment

## Documentation

Start here:

- [Docs index](https://github.com/veggerby/container-superposition/blob/main/docs/README.md)
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
