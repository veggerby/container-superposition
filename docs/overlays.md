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

### Bun (`bun`)

Bun runtime - faster JavaScript runtime and package manager

| Property | Value |
|----------|-------|
| **Category** | language |
| **Tags** | `language`, `bun`, `javascript`, `typescript` |
| **Ports** | 3000, 8080 |

### Go (`go`)

Go latest stable with gopls and delve debugger

| Property | Value |
|----------|-------|
| **Category** | language |
| **Tags** | `language`, `go`, `golang` |
| **Ports** | 8080, 8081 |

### Java (`java`)

Eclipse Temurin JDK 21 with Maven and Gradle

| Property | Value |
|----------|-------|
| **Category** | language |
| **Tags** | `language`, `java`, `maven`, `gradle` |
| **Ports** | 8080, 8081 |

### MkDocs (`mkdocs`)

Material for MkDocs - professional documentation generator

| Property | Value |
|----------|-------|
| **Category** | language |
| **Requires** | `python` |
| **Tags** | `documentation`, `mkdocs`, `python` |
| **Ports** | 8000 |

### Node.js (`nodejs`)

Node.js LTS with TypeScript and tooling

| Property | Value |
|----------|-------|
| **Category** | language |
| **Tags** | `language`, `nodejs`, `javascript`, `typescript` |

### PowerShell (`powershell`)

PowerShell Core for cross-platform scripting and automation

| Property | Value |
|----------|-------|
| **Category** | language |
| **Tags** | `language`, `powershell`, `scripting` |

### Python (`python`)

Python 3.12 with linting and formatting

| Property | Value |
|----------|-------|
| **Category** | language |
| **Tags** | `language`, `python` |

### Rust (`rust`)

Rust stable with cargo, rustfmt, and clippy

| Property | Value |
|----------|-------|
| **Category** | language |
| **Tags** | `language`, `rust`, `cargo` |
| **Ports** | 8080, 3000 |

## Database Overlays

### MinIO (`minio`)

S3-compatible object storage with web console

| Property | Value |
|----------|-------|
| **Category** | database |
| **Supports** | compose |
| **Tags** | `database`, `storage`, `s3`, `object-storage`, `minio` |
| **Ports** | 9000, 9001 |

### MongoDB (`mongodb`)

MongoDB 8 with Mongo Express web UI

| Property | Value |
|----------|-------|
| **Category** | database |
| **Supports** | compose |
| **Tags** | `database`, `nosql`, `mongodb`, `document` |
| **Ports** | 27017, 8081 |

### MySQL (`mysql`)

MySQL 8 with phpMyAdmin web UI

| Property | Value |
|----------|-------|
| **Category** | database |
| **Supports** | compose |
| **Tags** | `database`, `sql`, `mysql` |
| **Ports** | 3306, 8080 |

### NATS (`nats`)

Lightweight pub/sub messaging with JetStream

| Property | Value |
|----------|-------|
| **Category** | database |
| **Supports** | compose |
| **Tags** | `database`, `messaging`, `pubsub`, `nats`, `jetstream` |
| **Ports** | 4222, 8222 |

### PostgreSQL (`postgres`)

PostgreSQL 16 database

| Property | Value |
|----------|-------|
| **Category** | database |
| **Supports** | compose |
| **Tags** | `database`, `sql`, `postgres` |
| **Ports** | 5432 |

### RabbitMQ (`rabbitmq`)

Message broker with AMQP protocol and management UI

| Property | Value |
|----------|-------|
| **Category** | database |
| **Supports** | compose |
| **Tags** | `database`, `messaging`, `queue`, `rabbitmq`, `amqp` |
| **Ports** | 5672, 15672 |

### Redis (`redis`)

Redis 7 cache

| Property | Value |
|----------|-------|
| **Category** | database |
| **Supports** | compose |
| **Tags** | `database`, `cache`, `redis` |
| **Ports** | 6379 |

### Redpanda (`redpanda`)

Kafka-compatible event streaming with web console

| Property | Value |
|----------|-------|
| **Category** | database |
| **Supports** | compose |
| **Tags** | `database`, `messaging`, `streaming`, `kafka`, `redpanda` |
| **Ports** | 9092, 8080, 8081, 8082, 9644 |

### SQL Server (`sqlserver`)

SQL Server 2022 for Linux

| Property | Value |
|----------|-------|
| **Category** | database |
| **Supports** | compose |
| **Suggests** | `dotnet` |
| **Tags** | `database`, `sql`, `sqlserver`, `microsoft` |
| **Ports** | 1433 |

### SQLite (`sqlite`)

SQLite with litecli and VS Code extensions

| Property | Value |
|----------|-------|
| **Category** | database |
| **Suggests** | `python` |
| **Tags** | `database`, `sql`, `sqlite`, `embedded` |

## Observability Overlays

### Jaeger (`jaeger`)

Distributed tracing backend

| Property | Value |
|----------|-------|
| **Category** | observability |
| **Supports** | compose |
| **Conflicts** | `tempo` |
| **Tags** | `observability`, `tracing`, `jaeger` |
| **Ports** | 16686, 14250, 14268 |

### Loki (`loki`)

Log aggregation system

| Property | Value |
|----------|-------|
| **Category** | observability |
| **Supports** | compose |
| **Suggests** | `promtail` |
| **Tags** | `observability`, `logs`, `loki` |
| **Ports** | 3100 |

### Prometheus (`prometheus`)

Metrics collection and monitoring

| Property | Value |
|----------|-------|
| **Category** | observability |
| **Supports** | compose |
| **Suggests** | `alertmanager` |
| **Tags** | `observability`, `metrics`, `prometheus` |
| **Ports** | 9090 |

### Tempo (`tempo`)

Lightweight distributed tracing backend (alternative to Jaeger)

| Property | Value |
|----------|-------|
| **Category** | observability |
| **Supports** | compose |
| **Suggests** | `otel-collector`, `grafana` |
| **Conflicts** | `jaeger` |
| **Tags** | `observability`, `tracing`, `tempo`, `grafana` |
| **Ports** | 3200 |

### Alertmanager (`alertmanager`)

Alert routing and notification management for Prometheus

| Property | Value |
|----------|-------|
| **Category** | observability |
| **Supports** | compose |
| **Requires** | `prometheus` |
| **Tags** | `observability`, `alerts`, `prometheus` |
| **Ports** | 9093 |

### OpenTelemetry Collector (`otel-collector`)

Telemetry collection pipeline

| Property | Value |
|----------|-------|
| **Category** | observability |
| **Supports** | compose |
| **Suggests** | `jaeger`, `prometheus` |
| **Tags** | `observability`, `telemetry`, `opentelemetry` |
| **Ports** | 4317, 4318, 8888, 8889 |

### Promtail (`promtail`)

Log shipping agent for Loki with Docker auto-discovery

| Property | Value |
|----------|-------|
| **Category** | observability |
| **Supports** | compose |
| **Requires** | `loki` |
| **Tags** | `observability`, `logs`, `promtail`, `loki` |

### Grafana (`grafana`)

Observability visualization dashboard with auto-provisioning

| Property | Value |
|----------|-------|
| **Category** | observability |
| **Supports** | compose |
| **Requires** | `prometheus` |
| **Suggests** | `loki`, `jaeger`, `tempo`, `promtail` |
| **Tags** | `observability`, `ui`, `visualization` |
| **Ports** | 3000 |

### OTel Demo (Node.js) (`otel-demo-nodejs`)

Sample Node.js app with OpenTelemetry instrumentation

| Property | Value |
|----------|-------|
| **Category** | observability |
| **Supports** | compose |
| **Requires** | `otel-collector` |
| **Suggests** | `jaeger`, `tempo`, `prometheus`, `loki`, `grafana` |
| **Tags** | `observability`, `demo`, `nodejs`, `opentelemetry` |
| **Ports** | 8080 |

### OTel Demo (Python) (`otel-demo-python`)

Sample Python Flask app with OpenTelemetry instrumentation

| Property | Value |
|----------|-------|
| **Category** | observability |
| **Supports** | compose |
| **Requires** | `otel-collector` |
| **Suggests** | `jaeger`, `tempo`, `prometheus`, `loki`, `grafana` |
| **Tags** | `observability`, `demo`, `python`, `opentelemetry` |
| **Ports** | 8081 |

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

### Google Cloud SDK (`gcloud`)

Google Cloud Platform command-line tools (gcloud, gsutil, bq)

| Property | Value |
|----------|-------|
| **Category** | cloud |
| **Tags** | `cloud`, `gcp`, `google`, `cli` |

### kubectl + Helm (`kubectl-helm`)

Kubernetes CLI and Helm package manager

| Property | Value |
|----------|-------|
| **Category** | cloud |
| **Tags** | `cloud`, `kubernetes`, `helm` |

### Pulumi (`pulumi`)

Modern Infrastructure as Code with TypeScript/Python/Go

| Property | Value |
|----------|-------|
| **Category** | cloud |
| **Tags** | `cloud`, `iac`, `pulumi`, `infrastructure` |

### Terraform (`terraform`)

Infrastructure as Code with HCL (includes tflint)

| Property | Value |
|----------|-------|
| **Category** | cloud |
| **Tags** | `cloud`, `iac`, `terraform`, `infrastructure` |

## Dev Tool Overlays

### Codex (`codex`)

OpenAI Codex CLI for AI-powered code generation and assistance

| Property | Value |
|----------|-------|
| **Category** | dev |
| **Requires** | `nodejs` |
| **Tags** | `dev`, `ai`, `code-generation` |

### Commitlint (`commitlint`)

Conventional commits validation for automated releases

| Property | Value |
|----------|-------|
| **Category** | dev |
| **Suggests** | `pre-commit` |
| **Tags** | `dev`, `git`, `commits`, `semantic-release` |

### direnv (`direnv`)

Per-directory environment variable management

| Property | Value |
|----------|-------|
| **Category** | dev |
| **Tags** | `dev`, `environment`, `automation` |

### Docker (host socket) (`docker-sock`)

Access host Docker daemon via socket mount (fast, local-only)

| Property | Value |
|----------|-------|
| **Category** | dev |
| **Conflicts** | `docker-in-docker` |
| **Tags** | `dev`, `docker` |

### Docker-in-Docker (`docker-in-docker`)

Isolated Docker daemon inside container (portable, works in Codespaces)

| Property | Value |
|----------|-------|
| **Category** | dev |
| **Conflicts** | `docker-sock` |
| **Tags** | `dev`, `docker` |

### Git Helpers (`git-helpers`)

Git LFS, GitHub CLI, GPG/SSH support for secure Git operations

| Property | Value |
|----------|-------|
| **Category** | dev |
| **Tags** | `dev`, `git`, `security`, `ssh`, `gpg` |

### Just Task Runner (`just`)

Fast, simple command runner (Rust-based alternative to Make)

| Property | Value |
|----------|-------|
| **Category** | dev |
| **Tags** | `dev`, `automation`, `tasks` |

### Modern CLI Tools (`modern-cli-tools`)

jq, yq, ripgrep, fd, bat - Essential modern command-line tools

| Property | Value |
|----------|-------|
| **Category** | dev |
| **Tags** | `dev`, `cli`, `productivity` |

### ngrok (`ngrok`)

Secure tunneling for webhook testing and external access

| Property | Value |
|----------|-------|
| **Category** | dev |
| **Tags** | `dev`, `tunneling`, `webhooks` |
| **Ports** | 4040 |

### Playwright (`playwright`)

Browser automation and testing framework

| Property | Value |
|----------|-------|
| **Category** | dev |
| **Tags** | `dev`, `testing`, `browser` |

### Pre-commit Framework (`pre-commit`)

Automated code quality gates with pre-commit hooks

| Property | Value |
|----------|-------|
| **Category** | dev |
| **Suggests** | `commitlint` |
| **Tags** | `dev`, `git`, `quality`, `hooks` |

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

*Documentation generated on 2026-02-08T18:01:55.685Z*
