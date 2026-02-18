# .NET Microservice Example

This is a complete reference example of a .NET microservice development environment with distributed tracing and monitoring, generated with Container Superposition.

## What's Included

**Language & Runtime:**

- **.NET SDK** - Latest LTS version with C# development tools
- Global tools: Entity Framework Core tools, dotnet-format

**Database:**

- **PostgreSQL** - Relational database with Npgsql driver support

**Observability Stack:**

- **OpenTelemetry Collector** - Telemetry pipeline (metrics, traces, logs)
- **Jaeger** - Distributed tracing backend and UI
- **Prometheus** - Metrics collection and alerting

**VS Code Extensions:**

- C# Dev Kit, .NET Extension Pack
- Docker, YAML, REST Client

## How It Was Created

This example was generated with:

```bash
npx container-superposition init \
  --stack compose \
  --language dotnet \
  --database postgres \
  --observability otel-collector,jaeger,prometheus \
  -o .devcontainer
```

## Getting Started

### 1. Open in VS Code

```bash
cd examples/dotnet-service
code .
```

### 2. Reopen in Container

When prompted, click **"Reopen in Container"** or press `F1` and select:

```
Dev Containers: Reopen in Container
```

### 3. Configure Environment

Copy the environment template and customize:

```bash
cp .devcontainer/.env.example .devcontainer/.env
# Edit .devcontainer/.env with your values
```

### 4. Verify Services

All services start automatically. Check status:

```bash
# In the devcontainer terminal:
docker-compose ps
```

### 5. Access Services

Open in your browser:

- **Jaeger UI**: http://localhost:16686 (distributed tracing)
- **Prometheus**: http://localhost:9090 (metrics)

Connect to database:

```bash
# PostgreSQL
psql -h postgres -U postgres -d devdb
```

## Extending This Example

Regenerate with additional overlays:

```bash
npx container-superposition init \
  --from-manifest .devcontainer/superposition.json
# Add grafana, redis, rabbitmq, etc. in the questionnaire
```

## Related Examples

- [Web API (Node.js)](../web-api-node/) - Node.js web API with full observability

## Learn More

- [Container Superposition Documentation](../../README.md)
- [Overlay Reference](../../docs/overlays.md)
- [.NET OpenTelemetry Documentation](https://opentelemetry.io/docs/languages/net/)
