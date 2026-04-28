# Feature Specification: Split Ollama Service and CLI Overlays

**Spec ID**: `012-ollama-cli-overlay`
**Created**: 2026-04-16
**Status**: Final
**Input**: Requirement — split current `ollama` overlay into separate service and CLI overlays, with implicit dependency from `ollama` to `ollama-cli`

## Summary

Separate Ollama support into two overlays:

1. `ollama` — compose-only Ollama server sidecar
2. `ollama-cli` — CLI-only installation that works in plain and compose stacks

Selecting `ollama` must automatically include `ollama-cli` via `requires` so existing behavior is preserved.

## Design

### Overlay split

- `ollama` remains compose-only and owns service wiring (`docker-compose.yml`, API port, sidecar host env)
- `ollama-cli` owns CLI installation and CLI verification
- `ollama` declares `requires: [ollama-cli]`

### User intent supported

- Users can choose only `ollama-cli` in plain stacks when Ollama runs elsewhere (for example on host)
- Users can still choose `ollama` and get server + CLI automatically

## Implementation Scope

- Add `overlays/ollama-cli/` with `overlay.yml`, `devcontainer.patch.json`, `setup.sh`, `verify.sh`, `README.md`
- Update `overlays/ollama/overlay.yml` to require `ollama-cli`
- Remove CLI installation from `overlays/ollama` and keep service responsibilities there
- Update tests and changelog entries

## User Scenarios & Testing

### User Story 1 — Plain stack with remote Ollama

1. **Given** a plain stack with `ollama-cli`, **When** generation runs, **Then** the devcontainer contains the `ollama` CLI without requiring a local compose service.
2. **Given** `OLLAMA_HOST` is configured to a remote endpoint, **When** users run `ollama list`, **Then** requests target that remote server.

### User Story 2 — Compose stack with local sidecar

1. **Given** a compose stack with `ollama`, **When** generation runs, **Then** `ollama-cli` is auto-added and CLI commands are available in the devcontainer.
2. **Given** the compose sidecar is running, **When** verification runs, **Then** the service endpoint is reachable via `http://ollama:11434`.
