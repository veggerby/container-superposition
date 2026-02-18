# .NET Microservice Example

This is a complete reference example of a .NET microservice development environment with distributed tracing and monitoring.

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

## Getting Started

### 1. Generate the devcontainer

This example includes a `superposition.json` manifest that you can use to generate the complete devcontainer configuration:

```bash
cd examples/dotnet-service
npx container-superposition regen
```

This will create the `.devcontainer/` directory with all necessary configuration files.

### 2. Open in VS Code

```bash
code .
```

### 3. Reopen in Container

When prompted, click **"Reopen in Container"** or press `F1` and select:

```
Dev Containers: Reopen in Container
```

### 4. Configure Environment

Copy the environment template and customize:

```bash
cp .devcontainer/.env.example .devcontainer/.env
# Edit .devcontainer/.env with your values
```

### 5. Verify Services

All services start automatically. Check status:

```bash
# In the devcontainer terminal:
docker-compose ps
```

### 6. Access Services

Open in your browser:

- **Jaeger UI**: http://localhost:16686 (distributed tracing)
- **Prometheus**: http://localhost:9090 (metrics)

Connect to database:

```bash
# PostgreSQL
psql -h postgres -U postgres -d devdb
```

## Customizing This Example

The `superposition.json` manifest defines the configuration. To modify:

```bash
# Regenerate with changes (interactive)
npx container-superposition init --from-manifest superposition.json

# Or edit the manifest directly and regenerate
npx container-superposition regen
```

## Related Examples

- [Web API (Node.js)](../web-api-node/) - Node.js web API with full observability

## Learn More

- [Container Superposition Documentation](../../README.md)
- [Overlay Reference](../../docs/overlays.md)
- [.NET OpenTelemetry Documentation](https://opentelemetry.io/docs/languages/net/)
