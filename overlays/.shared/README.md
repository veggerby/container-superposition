# Shared Overlay Configurations

This directory contains shared configuration fragments that can be imported by multiple overlays to reduce duplication and ensure consistency.

## Structure

```
.shared/
├── otel/               # OpenTelemetry configurations
├── compose/            # Docker Compose patterns (healthchecks, etc.)
└── vscode/             # VS Code extension sets
```

## Usage

Overlays can import shared files by adding them to the `imports` field in `overlay.yml`:

```yaml
id: prometheus
imports:
    - .shared/otel/otel-base-config.yaml
    - .shared/compose/common-healthchecks.yml
```

## Benefits

- **DRY (Don't Repeat Yourself)**: Common patterns defined once
- **Consistency**: All overlays using the same shared config stay in sync
- **Maintainability**: Update shared config once, all overlays benefit
- **Best Practices**: Shared configs embody proven patterns

## Creating Shared Configs

1. Identify common patterns across overlays
2. Extract to appropriate `.shared/` subdirectory
3. Update overlays to import the shared file
4. Test that imports work correctly

## Import Resolution

- Imports are resolved relative to the `overlays/` directory
- Shared files are merged into the overlay during composition
- Files are applied in the order they are listed
