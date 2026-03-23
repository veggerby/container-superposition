# Shared Overlay Fragments

This directory contains reusable configuration fragments that can be imported by multiple overlays to reduce duplication and ensure consistency.

## Structure

```
.shared/
├── otel/                              # OpenTelemetry configurations
│   ├── instrumentation.env            # OTEL SDK env vars for instrumentation
│   └── otel-base-config.yaml          # Base OTEL collector pipeline config
├── compose/                           # Docker Compose patterns
│   └── common-healthchecks.yml        # Standard healthcheck patterns (reference)
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

### `compose/common-healthchecks.yml`

**Purpose:** Reference library of standard Docker Compose healthcheck patterns for common services (HTTP, PostgreSQL, Redis, MongoDB, MySQL).

**Note:** This fragment contains `healthchecks:` as a top-level key (not a devcontainer field). It is intended as a reference document; overlays should extract the relevant pattern and apply it directly in their `docker-compose.yml` rather than importing this file.

---

### `vscode/recommended-extensions.json`

**Purpose:** A curated set of VS Code extensions commonly useful across many overlays (spell checking, error lens, GitLens, EditorConfig, Prettier, Docker, YAML, Markdown).

**Format:** Valid devcontainer patch — `customizations.vscode.extensions` array.

**Merge type:** `.json` — deep-merged into `devcontainer.json` patch

---

## Usage

Reference shared fragments in `overlay.yml` via the `imports` field:

```yaml
id: my-overlay
imports:
    - .shared/otel/instrumentation.env
    - .shared/vscode/recommended-extensions.json
```

**Rules:**

- All paths must begin with `.shared/`
- Paths are relative to `overlays/`
- Imports are applied in declaration order, then the overlay's own `devcontainer.patch.json` (overlay wins on conflict)

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
