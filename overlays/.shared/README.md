# Shared Overlay Fragments

This directory contains reusable configuration fragments that can be imported by multiple overlays to reduce duplication and ensure consistency.

## Structure

```
.shared/
├── otel/                              # OpenTelemetry configurations
│   ├── instrumentation.env            # OTEL SDK env vars for instrumentation
│   └── otel-base-config.yaml          # Base OTEL collector pipeline config
├── compose/                           # Docker Compose patterns
│   ├── nvidia-gpu-devcontainer.yml    # NVIDIA GPU passthrough for the devcontainer service
│   └── common-healthchecks.md         # Standard healthcheck patterns (reference — not importable)
└── vscode/                            # VS Code extension sets
    └── recommended-extensions.json    # Commonly recommended extensions (devcontainer patch)
```

## Fragment Catalogue

### `otel/instrumentation.env`

**Purpose:** Common OpenTelemetry SDK environment variables for services that send telemetry to an OTEL collector.

**Provides:**

- `OTEL_SERVICE_NAME` — service identifier
- `OTEL_EXPORTER_OTLP_ENDPOINT` — OTLP collector endpoint
- `OTEL_EXPORTER_OTLP_PROTOCOL` — transport protocol (grpc)
- `OTEL_RESOURCE_ATTRIBUTES` — deployment metadata
- `OTEL_TRACES_SAMPLER`, `OTEL_TRACES_EXPORTER` — trace configuration
- `OTEL_METRICS_EXPORTER`, `OTEL_LOGS_EXPORTER` — metrics and log exporters

**Imported by:** `otel-collector`, `prometheus`, `jaeger`

**Merge type:** `.env` — appended to `.env.example` with a `# from .shared/otel/instrumentation.env` comment

---

### `otel/otel-base-config.yaml`

**Purpose:** Base OpenTelemetry Collector receiver and pipeline configuration — OTLP receivers, batch processor, and logging exporter.

**Merge type:** `.yaml` — deep-merged into `devcontainer.json` patch

---

### `compose/nvidia-gpu-devcontainer.yml`

**Purpose:** Adds the `deploy.resources.reservations.devices` block to the `devcontainer` service, giving the devcontainer itself direct NVIDIA GPU access. This enables GPU-accelerated tooling (`torch`, `tensorflow`, CUDA CLIs, `nvidia-smi`) to work directly in the dev environment.

**Format:** Docker Compose service fragment (services.devcontainer only).

**Merge type:** `compose_imports:` — deep-merged into the final `docker-compose.yml` before the overlay's own `docker-compose.yml`.

**Imported by:** `ollama`

**Prerequisites:** NVIDIA Container Toolkit must be installed on the host.

---

### `compose/common-healthchecks.md`

**Purpose:** Reference library of standard Docker Compose healthcheck patterns for common services (HTTP, PostgreSQL, Redis, MongoDB, MySQL).

**Note:** This is a `.md` file (documentation only) — it cannot be imported via `overlay.yml` `imports:`. Copy the relevant pattern directly into your overlay's `docker-compose.yml`.

---

### `vscode/recommended-extensions.json`

**Purpose:** A curated set of VS Code extensions commonly useful across many overlays (spell checking, error lens, GitLens, EditorConfig, Prettier, Docker, YAML, Markdown).

**Format:** Valid devcontainer patch — `customizations.vscode.extensions` array.

**Merge type:** `.json` — deep-merged into `devcontainer.json` patch

---

## Usage

Reference shared devcontainer fragments in `overlay.yml` via the `imports` field:

```yaml
id: my-overlay
imports:
    - .shared/otel/instrumentation.env
    - .shared/vscode/recommended-extensions.json
```

Reference shared docker-compose fragments via the `compose_imports` field:

```yaml
id: my-overlay
compose_imports:
    - .shared/compose/nvidia-gpu-devcontainer.yml
```

**Rules:**

- All paths must begin with `.shared/`
- Paths are relative to `overlays/`
- `imports` fragments are applied in declaration order, then the overlay's own `devcontainer.patch.json` (overlay wins on conflict)
- `compose_imports` fragments are deep-merged into `docker-compose.yml` before the overlay's own `docker-compose.yml` (overlay wins on conflict)
- `compose_imports` files must be `.yml` or `.yaml`

## Creating New Fragments

1. Choose the right subdirectory (`otel/`, `compose/`, `vscode/`, or create a new one with a clear name)
2. Use a descriptive file name — one concern per file
3. For `.json` and `.yaml` fragments, ensure the content is valid devcontainer patch format
4. Add a comment at the top explaining what the fragment does
5. Update this README with the new fragment's details and which overlays import it

## Downstream Impact

Any change to a shared fragment affects every overlay that imports it. Before editing:

- Check the "Imported by" section above for the fragment you're modifying
- Run `npm test` and `container-superposition doctor` after changes
- Consider whether the change should apply to all importers, or whether specific overlays need to be updated

## Import Resolution

- Imports are resolved relative to the `overlays/` directory
- Path traversal (`../`, absolute paths, non-`.shared/` prefixes) is rejected at composition time
- Missing or unsupported file types cause generation to fail with a message naming the overlay and the bad reference
