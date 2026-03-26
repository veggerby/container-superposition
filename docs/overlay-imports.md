# Overlay Imports

Overlays can import shared configuration fragments from `overlays/.shared/` to reduce duplication and ensure consistency across overlays.

## Overview

The import mechanism allows overlays to reference common configuration files instead of duplicating them. This promotes DRY principles and makes it easier to maintain consistent patterns.

Two import fields are supported in `overlay.yml`:

- **`imports:`** — shared devcontainer patch fragments (`.json`, `.yaml`, `.env`) applied before the overlay's own `devcontainer.patch.json`
- **`compose_imports:`** — shared docker-compose YAML fragments (`.yml`, `.yaml`) deep-merged into `docker-compose.yml` before the overlay's own `docker-compose.yml`

## Shared Directory Structure

```
overlays/
├── .shared/
│   ├── README.md
│   ├── otel/
│   │   ├── instrumentation.env              # OTEL SDK env vars — imported by otel-collector, prometheus, jaeger
│   │   └── otel-base-config.yaml            # Base OTEL collector pipeline config
│   ├── compose/
│   │   ├── nvidia-gpu-devcontainer.yml      # NVIDIA GPU passthrough for the devcontainer service
│   │   └── common-healthchecks.md           # Standard Docker Compose healthcheck patterns (reference only)
│   └── vscode/
│       └── recommended-extensions.json      # Commonly recommended VS Code extensions (devcontainer patch format)
├── prometheus/
│   ├── overlay.yml                          # imports: [.shared/otel/instrumentation.env]
│   └── devcontainer.patch.json
├── jaeger/
│   ├── overlay.yml                          # imports: [.shared/otel/instrumentation.env]
│   └── devcontainer.patch.json
└── ollama/
    ├── overlay.yml                          # compose_imports: [.shared/compose/nvidia-gpu-devcontainer.yml]
    └── docker-compose.yml
```

## Using `imports` (devcontainer patch fragments)

Add the `imports` field to your `overlay.yml` manifest:

```yaml
id: prometheus
name: Prometheus
description: Metrics collection and monitoring
category: observability
supports:
    - compose
requires: []
suggests:
    - alertmanager
conflicts: []
tags:
    - observability
    - metrics
ports:
    - 9090
imports:
    - .shared/otel/instrumentation.env
```

**Rules:**

- All paths **must** begin with `.shared/` — references outside `.shared/` are rejected (path traversal prevention)
- Paths are relative to `overlays/`
- Order is significant — fragments are applied in declaration order, then the overlay's own `devcontainer.patch.json`
- Missing files, unsupported types, or path traversal attempts cause generation to fail with a message identifying the overlay and the broken reference

## Using `compose_imports` (docker-compose fragments)

Add the `compose_imports` field to your `overlay.yml` manifest to merge shared docker-compose YAML fragments into the generated `docker-compose.yml`:

```yaml
id: ollama
name: Ollama
# ... other fields ...
compose_imports:
    - .shared/compose/nvidia-gpu-devcontainer.yml
```

**Rules:**

- All paths **must** begin with `.shared/` (same path traversal rules as `imports`)
- Files must be `.yml` or `.yaml`
- Fragments are deep-merged in declaration order, then the overlay's own `docker-compose.yml` is merged last (overlay wins on conflict)
- Missing files, wrong types, or traversal attempts cause generation to fail

## Supported File Types

### `imports:` — devcontainer patch fragments

| Extension        | How it is merged                                                               |
| ---------------- | ------------------------------------------------------------------------------ |
| `.json`          | Deep-merged into `devcontainer.json` patch (same as `devcontainer.patch.json`) |
| `.yaml` / `.yml` | Loaded and deep-merged into `devcontainer.json` patch                          |
| `.env`           | Concatenated into `.env.example` with a `# from .shared/…` comment header      |
| Anything else    | Rejected with a clear unsupported-type error                                   |

### `compose_imports:` — docker-compose fragments

| Extension        | How it is merged                                                            |
| ---------------- | --------------------------------------------------------------------------- |
| `.yaml` / `.yml` | Deep-merged into `docker-compose.yml` before the overlay's own compose file |
| Anything else    | Rejected with a clear unsupported-type error                                |

### JSON import example

```jsonc
// overlays/.shared/vscode/recommended-extensions.json
{
    "$schema": "https://raw.githubusercontent.com/devcontainers/spec/main/schemas/devContainer.base.schema.json",
    "customizations": {
        "vscode": {
            "extensions": [
                "streetsidesoftware.code-spell-checker",
                "usernamehw.errorlens",
                "eamodio.gitlens",
            ],
        },
    },
}
```

### YAML devcontainer import example

```yaml
# overlays/.shared/otel/otel-base-config.yaml
remoteEnv:
    OTEL_SERVICE_NAME: my-service
    OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4317
```

### ENV import example

```bash
# overlays/.shared/otel/instrumentation.env
# OpenTelemetry SDK Configuration
OTEL_SERVICE_NAME=my-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
OTEL_TRACES_SAMPLER=always_on
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
```

When this `.env` fragment is imported, the generated `.env.example` will contain:

```bash
# from .shared/otel/instrumentation.env
OTEL_SERVICE_NAME=my-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
...
```

### YAML compose_import example

```yaml
# overlays/.shared/compose/nvidia-gpu-devcontainer.yml
services:
    devcontainer:
        deploy:
            resources:
                reservations:
                    devices:
                        - driver: nvidia
                          count: all
                          capabilities: [gpu]
```

When this fragment is imported via `compose_imports`, the generated `docker-compose.yml` will include the `deploy` block on the `devcontainer` service merged with contributions from all other overlays.

## Import Ordering and Conflict Resolution

### `imports` ordering

Imports are applied in declaration order, then the overlay's own `devcontainer.patch.json` is applied last:

```
[import 1] → [import 2] → … → [import N] → [overlay own patch]
```

- The **second** import wins over the first on key conflict
- The **overlay's own patch always wins** over any shared fragment

This means overlays can intentionally override shared defaults by setting the same key in their `devcontainer.patch.json`.

### `compose_imports` ordering

For each overlay, compose fragments are merged before the overlay's own `docker-compose.yml`, in this order:

```
[base template compose] → [overlay 1 compose_imports] → [overlay 1 docker-compose.yml] → [overlay 2 compose_imports] → [overlay 2 docker-compose.yml] → …
```

- Each overlay's `docker-compose.yml` wins over its own `compose_imports`
- Later overlays win over earlier overlays on key conflict

## Worked Example: OTEL Instrumentation

Many observability overlays need OTEL environment variables. With imports, these are defined once:

**`overlays/.shared/otel/instrumentation.env`** — shared once

**`overlays/otel-collector/overlay.yml`:**

```yaml
imports:
    - .shared/otel/instrumentation.env
```

**`overlays/prometheus/overlay.yml`:**

```yaml
imports:
    - .shared/otel/instrumentation.env
```

**`overlays/jaeger/overlay.yml`:**

```yaml
imports:
    - .shared/otel/instrumentation.env
```

When any of these overlays is used, the generated `.env.example` will contain the OTEL environment variables with a comment indicating they came from the shared fragment.

## Security: Path Traversal Prevention

Import paths are validated before any file is read:

1. The path **must** begin with `.shared/`
2. The resolved absolute path **must** remain inside `overlays/.shared/`

Any import that fails either check causes generation to abort with an error identifying the overlay and the rejected path. References like `../secret.json`, `/etc/passwd`, or `other-overlay/file.json` are all rejected.

## Validation via Doctor

The `doctor` command validates all imports for every overlay:

```bash
container-superposition doctor
```

Checks performed:

- Import path starts with `.shared/` (path traversal check)
- Import path resolves within `overlays/.shared/` (traversal check)
- Import file exists on disk
- File type is one of `.json`, `.yaml`, `.yml`, `.env` (for `imports:`)
- File type is one of `.yaml`, `.yml` (for `compose_imports:`)

Broken references are reported with the overlay ID and the bad path so maintainers can fix them quickly.

## Viewing Imports in `explain`

When an overlay has imports, they are shown in the `explain` output:

```bash
container-superposition explain prometheus
```

```
Shared Imports:
  (Fragments from overlays/.shared/ applied before this overlay)
  📎 .shared/otel/instrumentation.env
```

When an overlay has compose_imports, they are also shown:

```bash
container-superposition explain ollama
```

```
Shared Compose Imports:
  (docker-compose fragments from overlays/.shared/ merged before this overlay)
  🐳 .shared/compose/nvidia-gpu-devcontainer.yml
```

## Creating Shared Configurations

1. **Identify common patterns** across multiple overlays
2. **Create `overlays/.shared/<category>/<name>.<ext>`** — use descriptive paths, one concern per file
3. **Update overlays** to reference the fragment via `imports:` or `compose_imports:` in their `overlay.yml`
4. **Update `.shared/README.md`** to document the fragment's purpose and which overlays use it
5. **Test** with `npm test` and `container-superposition doctor` to verify

## Downstream Impact Awareness

A single change to a shared fragment affects every overlay that imports it. Before editing a shared fragment:

- Check `.shared/README.md` to see which overlays import it
- Use `grep -r "fragment-name" overlays/*/overlay.yml` to find all importers
- Run the full test suite after any shared fragment change

## Best Practices

1. **One concern per file** — `instrumentation.env` not `all-the-things.env`
2. **Descriptive category paths** — `.shared/otel/` not `.shared/misc/`
3. **Comment your fragments** — explain purpose and usage at the top of each file
4. **Keep fragments small** — big shared files create tight coupling
5. **Overlay-specific overrides are fine** — an overlay's own patch always wins; diverging from a shared baseline is expected and supported

## See Also

- [Creating Overlays](creating-overlays.md)
- `overlays/.shared/README.md` — shared fragment catalogue with usage details
- CONTRIBUTING.md — overlay authoring guide
