# Overlay Imports

Overlays can import shared configuration fragments from `overlays/.shared/` to reduce duplication and ensure consistency across overlays.

## Overview

Import functionality allows overlays to reference common configuration files instead of duplicating them in every overlay. This promotes DRY (Don't Repeat Yourself) principles and makes it easier to maintain consistent patterns.

## Shared Directory Structure

```
overlays/
├── .shared/
│   ├── otel/                           # OpenTelemetry configurations
│   │   ├── otel-base-config.yaml      # Base OTEL collector config
│   │   └── instrumentation.env        # Common env vars for instrumentation
│   ├── compose/                        # Docker Compose patterns
│   │   └── common-healthchecks.yml    # Standard healthcheck configurations
│   └── vscode/                         # VS Code extension sets
│       └── recommended-extensions.json # Commonly recommended extensions
├── prometheus/
│   ├── overlay.yml                     # Can import from .shared/
│   └── devcontainer.patch.json
└── jaeger/
    ├── overlay.yml                     # Can import from .shared/
    └── devcontainer.patch.json
```

## Using Imports

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
    - .shared/compose/common-healthchecks.yml
```

## Supported File Types

### JSON Files (`.json`)

Merged as devcontainer patches, just like `devcontainer.patch.json`.

**Example: `.shared/vscode/recommended-extensions.json`**

```json
{
    "customizations": {
        "vscode": {
            "extensions": [
                "streetsidesoftware.code-spell-checker",
                "usernamehw.errorlens",
                "editorconfig.editorconfig"
            ]
        }
    }
}
```

### YAML Files (`.yaml`, `.yml`)

Loaded and merged as devcontainer patches. Useful for complex configurations.

**Example: `.shared/otel/otel-base-config.yaml`**

```yaml
receivers:
    otlp:
        protocols:
            grpc:
                endpoint: 0.0.0.0:4317
            http:
                endpoint: 0.0.0.0:4318
```

### Environment Files (`.env`)

Merged into `.env.example` with a comment indicating the import source.

**Example: `.shared/otel/instrumentation.env`**

```bash
# OpenTelemetry Configuration
OTEL_SERVICE_NAME=my-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
OTEL_TRACES_SAMPLER=always_on
```

## How Imports Work

1. **Resolution**: Imports are resolved relative to the `overlays/` directory
2. **Order**: Imports are applied in the order listed, then the overlay's own files
3. **Merging**:
    - JSON/YAML: Deep merged into devcontainer configuration
    - ENV: Concatenated into `.env.example` with source comments
4. **Validation**: Doctor command validates that all imports exist and are valid

## Benefits

### Reduced Duplication

Before imports:

```
prometheus/devcontainer.patch.json  (200 lines with OTEL config)
jaeger/devcontainer.patch.json      (200 lines with OTEL config)
grafana/devcontainer.patch.json     (200 lines with OTEL config)
```

After imports:

```
.shared/otel/otel-base-config.yaml  (50 lines, shared)
prometheus/overlay.yml              (imports: [.shared/otel/otel-base-config.yaml])
jaeger/overlay.yml                  (imports: [.shared/otel/otel-base-config.yaml])
grafana/overlay.yml                 (imports: [.shared/otel/otel-base-config.yaml])
```

### Consistency

All overlays using the same shared config stay in sync automatically.

### Maintainability

Update shared configuration once, all importing overlays benefit.

## Validation

The `doctor` command validates imports:

```bash
container-superposition doctor
```

Checks performed:

- Import files exist
- File types are supported (`.json`, `.yaml`, `.yml`, `.env`)
- No broken import references

## Creating Shared Configurations

1. **Identify common patterns** across overlays
2. **Extract to `.shared/` subdirectory** with descriptive path
3. **Update overlays** to import the shared file
4. **Test** that composition works correctly
5. **Document** the shared file's purpose in `.shared/README.md`

## Example: OTEL Instrumentation

Many observability overlays need OTEL instrumentation. Instead of duplicating these environment variables:

**Create:** `overlays/.shared/otel/instrumentation.env`

```bash
# OpenTelemetry SDK Configuration
OTEL_SERVICE_NAME=my-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
OTEL_RESOURCE_ATTRIBUTES=deployment.environment=development
OTEL_TRACES_SAMPLER=always_on
OTEL_TRACES_EXPORTER=otlp
OTEL_METRICS_EXPORTER=otlp
OTEL_LOGS_EXPORTER=otlp
```

**Import in overlays:**

```yaml
# overlays/prometheus/overlay.yml
imports:
    - .shared/otel/instrumentation.env

# overlays/jaeger/overlay.yml
imports:
    - .shared/otel/instrumentation.env
```

Now all OTEL-compatible overlays share the same instrumentation configuration!

## Best Practices

1. **Keep shared files focused** - One concern per file
2. **Use descriptive paths** - `.shared/otel/instrumentation.env` not `.shared/env1.env`
3. **Document shared files** - Add comments explaining purpose and usage
4. **Version carefully** - Changes to shared files affect all importing overlays
5. **Test imports** - Verify overlay composition works after adding imports

## See Also

- [Creating Overlays](creating-overlays.md)
- [Overlay Metadata](overlay-metadata-archive.md)
- [Doctor Command](../README.md#doctor-command)
