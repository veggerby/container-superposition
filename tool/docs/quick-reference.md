# Quick Reference

## Base Templates

| Template | Use Case | Contents |
|----------|----------|----------|
| **plain** | Simple projects | Minimal Debian image, git, zsh, basic tools |
| **compose** | Multi-service apps | Docker Compose, devcontainer service, devnet network |

## Language Overlays

| Overlay | Version | Key Features | Extensions |
|---------|---------|--------------|------------|
| **dotnet** | .NET 10 | C# DevKit, build tools, testing | C# DevKit, GUID generator, Nuke, REST Client |
| **nodejs** | Node LTS | TypeScript, npm/yarn | ESLint, Prettier, npm IntelliSense |
| **python** | Python 3.12 | pip, venv, dev tools | Pylance, Black, Ruff |
| **mkdocs** | Python 3.12 | MkDocs, Material theme | Markdown All-in-One, Markdownlint, Mermaid |

## Database Overlays

| Overlay | Version | Ports | Environment Variables |
|---------|---------|-------|----------------------|
| **postgres** | 16 | 5432 | POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD |
| **redis** | 7 | 6379 | REDIS_PASSWORD (optional) |

## Observability Overlays

| Overlay | Purpose | Ports | Dependencies |
|---------|---------|-------|--------------|
| **otel-collector** | Telemetry pipeline | 4317, 4318, 8889 | jaeger, prometheus, loki |
| **jaeger** | Distributed tracing | 16686, 4317, 4318 | - |
| **prometheus** | Metrics collection | 9090 | - |
| **grafana** | Visualization | 3000 | prometheus, loki, jaeger |
| **loki** | Log aggregation | 3100 | - |

### Observability Stack Combinations

| Stack | Use Case | Command |
|-------|----------|---------|
| **Traces Only** | Distributed tracing | `--observability jaeger` |
| **Metrics Only** | Performance monitoring | `--observability prometheus,grafana` |
| **Standard** | Traces + Metrics | `--observability otel-collector,jaeger,prometheus,grafana` |
| **Complete** | Full observability | `--observability otel-collector,jaeger,prometheus,grafana,loki` |

## Cloud/DevOps Overlays

| Overlay | Tools | Extensions |
|---------|-------|------------|
| **aws-cli** | AWS CLI | AWS Toolkit |
| **azure-cli** | Azure CLI | Azure Account, Azure Resources |
| **kubectl-helm** | kubectl, Helm | Kubernetes |

## Development Tool Overlays

| Overlay | Purpose | Contents |
|---------|---------|----------|
| **playwright** | Browser testing | Playwright, Chromium |

## Service Startup Order

Services start in this order (controlled by `_serviceOrder`):

1. **Order 0** - Infrastructure: postgres, redis
2. **Order 1** - Observability backends: jaeger, prometheus, loki
3. **Order 2** - Middleware: otel-collector
4. **Order 3** - Visualization: grafana
5. **Last** - devcontainer (main application)

## Common Commands

### Interactive
```bash
npm run init
```

### Simple Scenarios
```bash
# Plain image with language
npm run init -- --stack plain --language python

# Compose with database
npm run init -- --stack compose --language nodejs --postgres
```

### Production-Ready
```bash
# Microservice with full observability
npm run init -- \
  --stack compose \
  --language dotnet \
  --db postgres+redis \
  --observability otel-collector,jaeger,prometheus,grafana,loki \
  --cloud-tools kubectl-helm

# Multi-cloud development
npm run init -- \
  --stack compose \
  --language python \
  --postgres \
  --cloud-tools aws-cli,azure-cli,kubectl-helm
```

## Output Structure

### Minimal (plain + language)
```
.devcontainer/
└── devcontainer.json
```

### Typical (compose + language + database)
```
.devcontainer/
├── devcontainer.json
├── docker-compose.yml
├── docker-compose.postgres.yml
└── .env.example
```

### Full (compose + language + database + observability)
```
.devcontainer/
├── devcontainer.json
├── docker-compose.yml                 # Base
├── docker-compose.postgres.yml        # Database
├── docker-compose.otel-collector.yml  # Telemetry
├── docker-compose.jaeger.yml          # Tracing
├── docker-compose.prometheus.yml      # Metrics
├── docker-compose.grafana.yml         # Visualization
├── docker-compose.loki.yml            # Logs
├── .env.example                       # Merged variables
├── otel-collector-config.yaml         # Collector config
├── prometheus.yml                     # Prometheus config
├── grafana-datasources.yml            # Grafana datasources
└── loki-config.yaml                   # Loki config
```

## Environment Variables by Overlay

### Databases
```bash
# PostgreSQL
POSTGRES_VERSION=16
POSTGRES_DB=devdb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432

# Redis
REDIS_VERSION=7
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional
```

### Observability
```bash
# OpenTelemetry Collector
OTEL_COLLECTOR_VERSION=latest

# Jaeger
JAEGER_VERSION=latest

# Prometheus
PROMETHEUS_VERSION=latest

# Grafana
GRAFANA_VERSION=latest
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin

# Loki
LOKI_VERSION=latest
```

## Port Reference

| Port | Service | Purpose |
|------|---------|---------|
| 3000 | Grafana | Visualization dashboard |
| 3100 | Loki | Log ingestion API |
| 4317 | Jaeger/OTLP | OTLP gRPC receiver |
| 4318 | Jaeger/OTLP | OTLP HTTP receiver |
| 5000 | .NET | HTTP endpoint |
| 5001 | .NET | HTTPS endpoint |
| 5432 | PostgreSQL | Database |
| 6379 | Redis | Cache |
| 8000 | MkDocs | Documentation server |
| 8080 | Generic | Web application |
| 8888 | OTLP | Collector metrics |
| 8889 | OTLP | Prometheus exporter |
| 9090 | Prometheus | Metrics API/UI |
| 13133 | OTLP | Health check |
| 16686 | Jaeger | Tracing UI |

## Dependencies

### Required for Observability

| Component | Depends On |
|-----------|------------|
| otel-collector | jaeger, prometheus, loki |
| grafana | prometheus, loki, jaeger |
| devcontainer | All selected services |

### Standalone Services

These work independently:
- postgres
- redis
- jaeger (can accept traces directly)
- prometheus (can scrape directly)
- loki (can accept logs directly)

## Migration from Old Templates

| Old Template | New Equivalent |
|--------------|----------------|
| `dotnet` | `--stack compose --language dotnet` |
| `node-typescript` | `--stack compose --language nodejs` |
| `python-mkdocs` | `--stack plain --language mkdocs` |
| `fullstack` | `--stack compose --language nodejs --db postgres+redis --observability otel-collector,jaeger,prometheus,grafana,loki` |

## File Types

| File | Behavior |
|------|----------|
| `devcontainer.patch.json` | Merged into devcontainer.json (not copied) |
| `.env.example` | Merged into combined .env.example (not copied) |
| `docker-compose.yml` | Copied as `docker-compose.{overlay}.yml` |
| Other files | Copied as-is to output directory |
| Directories | Copied recursively to output directory |

## Type Definitions

```typescript
// Base templates
type Stack = 'plain' | 'compose';

// Languages
type LanguageOverlay = 'dotnet' | 'nodejs' | 'python' | 'mkdocs';

// Databases
type Database = 'none' | 'postgres' | 'redis' | 'postgres+redis';

// Observability
type ObservabilityTool = 'otel-collector' | 'jaeger' | 'prometheus' | 'grafana' | 'loki';

// Cloud tools
type CloudTool = 'azure-cli' | 'aws-cli' | 'kubectl-helm';
```

## Helpful Links

- [Architecture](architecture.md) - Deep dive into composition
- [Dependencies](dependencies.md) - Service dependency management
- [Creating Overlays](creating-overlays.md) - Overlay development guide
- [Examples](examples.md) - Usage examples and patterns
- [Contributing](../../CONTRIBUTING.md) - How to contribute
