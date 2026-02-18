# Web API Example (Node.js)

This is a complete reference example of a production-ready web API development environment.

## What's Included

**Language & Runtime:**

- **Node.js** - LTS version with npm and TypeScript support
- Global packages: pnpm, modern tooling

**Databases & Caching:**

- **PostgreSQL** - Relational database
- **Redis** - In-memory cache and session store

**Observability Stack:**

- **OpenTelemetry Collector** - Telemetry pipeline (metrics, traces, logs)
- **Prometheus** - Metrics collection and alerting
- **Grafana** - Visualization dashboards
- **Loki** - Log aggregation

**VS Code Extensions:**

- ESLint, Prettier, TypeScript
- Docker, YAML, REST Client
- Grafana dashboard editor

## Getting Started

### 1. Generate the devcontainer

This example includes a `superposition.json` manifest that you can use to generate the complete devcontainer configuration:

```bash
cd examples/web-api-node
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

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Loki**: http://localhost:3100

Connect to databases:

```bash
# PostgreSQL
psql -h postgres -U postgres -d devdb

# Redis
redis-cli -h redis
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

- [.NET Service](../dotnet-service/) - .NET microservice with observability

## Learn More

- [Container Superposition Documentation](../../README.md)
- [Overlay Reference](../../docs/overlays.md)
