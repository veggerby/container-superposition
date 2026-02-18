# Web API Example (Node.js)

This is a complete reference example of a production-ready web API development environment generated with Container Superposition.

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

## How It Was Created

This example was generated with:

```bash
npx container-superposition init \
  --stack compose \
  --language nodejs \
  --database postgres,redis \
  --observability otel-collector,prometheus,grafana,loki \
  -o .devcontainer
```

## Getting Started

### 1. Open in VS Code

```bash
cd examples/web-api-node
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

## Extending This Example

Regenerate with additional overlays:

```bash
npx container-superposition init \
  --from-manifest .devcontainer/superposition.json
# Add mongodb, minio, aws-cli, etc. in the questionnaire
```

## Related Examples

- [.NET Service](../dotnet-service/) - .NET microservice with observability

## Learn More

- [Container Superposition Documentation](../../README.md)
- [Overlay Reference](../../docs/overlays.md)
