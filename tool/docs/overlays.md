# Overlay Reference

> **Auto-generated from `overlays.yml`** - Do not edit manually!

This document provides a comprehensive reference for all available overlays in container-superposition.

## Table of Contents

- [Language Overlays](#language-overlays)
- [Database Overlays](#database-overlays)
- [Observability Overlays](#observability-overlays)
- [Cloud Tool Overlays](#cloud-tool-overlays)
- [Dev Tool Overlays](#dev-tool-overlays)

## Language Overlays

### .NET (`dotnet`)

.NET 10 SDK with C# DevKit

| Property | Value |
|----------|-------|
| **Category** | language |
| **Tags** | `language`, `dotnet`, `csharp` |

### Node.js (`nodejs`)

Node.js LTS with TypeScript and tooling

| Property | Value |
|----------|-------|
| **Category** | language |
| **Tags** | `language`, `nodejs`, `javascript`, `typescript` |

### Python (`python`)

Python 3.12 with linting and formatting

| Property | Value |
|----------|-------|
| **Category** | language |
| **Tags** | `language`, `python` |

### MkDocs (`mkdocs`)

Python with MkDocs for documentation

| Property | Value |
|----------|-------|
| **Category** | language |
| **Tags** | `language`, `documentation`, `python` |

## Database Overlays

### PostgreSQL (`postgres`)

PostgreSQL 16 database

| Property | Value |
|----------|-------|
| **Category** | database |
| **Supports** | compose |
| **Tags** | `database`, `sql`, `postgres` |
| **Ports** | 5432 |

### Redis (`redis`)

Redis 7 cache

| Property | Value |
|----------|-------|
| **Category** | database |
| **Supports** | compose |
| **Tags** | `database`, `cache`, `redis` |
| **Ports** | 6379 |

## Observability Overlays

### OpenTelemetry Collector (`otel-collector`)

Telemetry collection pipeline

| Property | Value |
|----------|-------|
| **Category** | observability |
| **Supports** | compose |
| **Suggests** | `jaeger`, `prometheus` |
| **Tags** | `observability`, `telemetry`, `opentelemetry` |
| **Ports** | 4317, 4318, 8888, 8889 |

### Jaeger (`jaeger`)

Distributed tracing backend

| Property | Value |
|----------|-------|
| **Category** | observability |
| **Supports** | compose |
| **Tags** | `observability`, `tracing`, `jaeger` |
| **Ports** | 16686, 14250, 14268 |

### Prometheus (`prometheus`)

Metrics collection and monitoring

| Property | Value |
|----------|-------|
| **Category** | observability |
| **Supports** | compose |
| **Tags** | `observability`, `metrics`, `prometheus` |
| **Ports** | 9090 |

### Grafana (`grafana`)

Observability visualization dashboard

| Property | Value |
|----------|-------|
| **Category** | observability |
| **Supports** | compose |
| **Requires** | `prometheus` |
| **Suggests** | `loki`, `jaeger` |
| **Tags** | `observability`, `ui`, `visualization` |
| **Ports** | 3000 |

### Loki (`loki`)

Log aggregation system

| Property | Value |
|----------|-------|
| **Category** | observability |
| **Supports** | compose |
| **Tags** | `observability`, `logs`, `loki` |
| **Ports** | 3100 |

## Cloud Tool Overlays

### AWS CLI (`aws-cli`)

Amazon Web Services command-line tools

| Property | Value |
|----------|-------|
| **Category** | cloud |
| **Tags** | `cloud`, `aws`, `cli` |

### Azure CLI (`azure-cli`)

Microsoft Azure command-line tools

| Property | Value |
|----------|-------|
| **Category** | cloud |
| **Tags** | `cloud`, `azure`, `cli` |

### kubectl + Helm (`kubectl-helm`)

Kubernetes CLI and Helm package manager

| Property | Value |
|----------|-------|
| **Category** | cloud |
| **Tags** | `cloud`, `kubernetes`, `helm` |

## Dev Tool Overlays

### Docker-in-Docker (`docker-in-docker`)

Isolated Docker daemon inside container (portable, works in Codespaces)

| Property | Value |
|----------|-------|
| **Category** | dev |
| **Conflicts** | `docker-sock` |
| **Tags** | `dev`, `docker` |

### Docker (host socket) (`docker-sock`)

Access host Docker daemon via socket mount (fast, local-only)

| Property | Value |
|----------|-------|
| **Category** | dev |
| **Supports** | compose |
| **Conflicts** | `docker-in-docker` |
| **Tags** | `dev`, `docker` |

### Playwright (`playwright`)

Browser automation and testing framework

| Property | Value |
|----------|-------|
| **Category** | dev |
| **Tags** | `dev`, `testing`, `browser` |

### Codex (`codex`)

pnpm CLI with mounted .codex folder

| Property | Value |
|----------|-------|
| **Category** | dev |
| **Tags** | `dev`, `package-manager` |

## Dependency Model

### Dependency Types

- **Requires**: Hard dependencies that must be present. The composer will automatically add these.
- **Suggests**: Soft dependencies that work well together. Users may be prompted to add these.
- **Conflicts**: Mutually exclusive overlays. Cannot be used together.

### Auto-Resolution

When you select an overlay with required dependencies, the composer automatically includes them.
For example, selecting `grafana` will automatically include `prometheus`.

### Port Declarations

Each overlay declares its ports explicitly. When using port offset, all declared ports are shifted by the same offset.

---

*Documentation generated on 2026-02-04T14:00:57.633Z*
