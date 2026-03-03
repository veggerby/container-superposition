# container-superposition

[![Validate Overlays](https://github.com/veggerby/container-superposition/actions/workflows/validate-overlays.yml/badge.svg)](https://github.com/veggerby/container-superposition/actions/workflows/validate-overlays.yml)
[![Build DevContainers](https://github.com/veggerby/container-superposition/actions/workflows/build-devcontainers.yml/badge.svg)](https://github.com/veggerby/container-superposition/actions/workflows/build-devcontainers.yml)
[![npm version](https://badge.fury.io/js/container-superposition.svg)](https://www.npmjs.com/package/container-superposition)

Composable devcontainer scaffolds that collapse into normal, editable configs.

## Quickstart

```bash
# Guided questionnaire
npx container-superposition init

# Non-interactive example
npx container-superposition init --stack compose --language nodejs --database postgres

# Preview before writing files
npx container-superposition plan --stack compose --overlays nodejs,postgres,grafana
```

## What It Does

- Base templates: `plain` (single image) and `compose` (multi-service).
- Overlays: add languages, databases, observability, cloud tools, dev tools.
- Composition: merges overlays into a standard `.devcontainer/` you can edit freely.

## Core Commands

- `init` — generate a devcontainer
- `regen` — regenerate from a manifest
- `adopt` — migrate an existing `.devcontainer/` to the overlay-based workflow
- `list` — browse overlays
- `explain` — overlay details
- `plan` — preview output
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
