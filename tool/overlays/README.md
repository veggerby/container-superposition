# Overlays

Overlays are composable configuration fragments that add specific capabilities to your base devcontainer template.

## Structure

Each overlay directory contains:

- `devcontainer.patch.json` - Partial devcontainer configuration to merge
- `docker-compose.yml` (optional) - Service definitions for Docker Compose
- `.env.example` (optional) - Environment variables for this overlay
- Additional configuration files as needed (e.g., `otel-collector.yml`, config directories)

## Available Overlays

### Language & Framework

- **dotnet** - .NET 10 SDK with C# DevKit, testing tools, and build essentials
- **nodejs** - Node.js LTS with TypeScript, ESLint, Prettier, and npm tools
- **python** - Python 3.12 with Pylance, Black formatter, and Ruff linter
- **mkdocs** - Python with MkDocs and Material theme for documentation

### Databases

- **postgres** - PostgreSQL 16 with client tools and environment variables
- **redis** - Redis 7 with redis-tools and persistence

### Observability

- **otel-collector** - OpenTelemetry Collector for traces, metrics, and logs
- **jaeger** - Jaeger all-in-one for distributed tracing with OTLP support
- **prometheus** - Prometheus for metrics collection and monitoring
- **grafana** - Grafana for visualization with pre-configured data sources
- **loki** - Loki for log aggregation and querying

### Development Tools

- **playwright** - Browser automation with Chromium installed
- **azure-cli** - Azure command-line tools
- **aws-cli** - AWS command-line tools
- **kubectl-helm** - Kubernetes CLI and Helm package manager

## Environment Variables

Each overlay can provide its own `.env.example` file with relevant environment variables. The init tool automatically merges all `.env.example` files from selected overlays into a single `.env.example` in your project.

### PostgreSQL Variables
- `POSTGRES_VERSION` - PostgreSQL version (default: 16)
- `POSTGRES_DB` - Database name (default: devdb)
- `POSTGRES_USER` - Database user (default: postgres)
- `POSTGRES_PASSWORD` - Database password (default: postgres)
- `POSTGRES_PORT` - Port mapping (default: 5432)

### Redis Variables
- `REDIS_VERSION` - Redis version (default: 7)
- `REDIS_PORT` - Port mapping (default: 6379)
- `REDIS_PASSWORD` - Optional password for Redis authentication

### Observability Variables

#### OpenTelemetry Collector
- `OTEL_COLLECTOR_VERSION` - Collector version (default: latest)

#### Jaeger
- `JAEGER_VERSION` - Jaeger version (default: latest)

#### Prometheus
- `PROMETHEUS_VERSION` - Prometheus version (default: latest)

#### Grafana
- `GRAFANA_VERSION` - Grafana version (default: latest)
- `GRAFANA_ADMIN_USER` - Admin username (default: admin)
- `GRAFANA_ADMIN_PASSWORD` - Admin password (default: admin)

#### Loki
- `LOKI_VERSION` - Loki version (default: latest)

### Using .env

1. Run the init tool to generate `.env.example` with your selected overlays
2. Copy `.env.example` to `.env` in your project root
3. Customize values as needed
4. Restart your dev container

Example `.env`:
```bash
POSTGRES_PASSWORD=my-secure-password
REDIS_PASSWORD=another-secure-password
POSTGRES_VERSION=15
```

The `.env` file should be added to `.gitignore` to keep secrets out of version control.

## How Overlays Work

The init tool merges overlay configurations with your base template:

1. **JSON Merging**: Features are deep-merged (package lists concatenated)
2. **Environment Variables**: Added to devcontainer configuration
3. **Port Configuration**: Ports appended to forwardPorts, attributes merged for labeled ports
4. **Docker Compose**: Service files copied as `docker-compose.{overlay}.yml`
5. **Additional Files**: Any extra files (configs, scripts) are copied to output directory
6. **Environment Examples**: All `.env.example` files merged into single file

### File Handling

- `devcontainer.patch.json` - Merged into devcontainer.json
- `docker-compose.yml` - Copied as `docker-compose.{overlay}.yml`
- `.env.example` - Merged into combined `.env.example`
- Other files/directories - Copied as-is to output (e.g., `otel-collector.yml`, config folders)

## Adding New Overlays

To add a new overlay:

1. Create a directory under `tool/overlays/`
2. Add `devcontainer.patch.json` with the partial configuration
3. Optionally add `docker-compose.yml` for services
4. Optionally add `.env.example` with environment variables
5. Add any additional config files (e.g., `otel-collector.yml`, config directories)
6. Update the questionnaire in `scripts/init.ts` to offer the option

All files except `devcontainer.patch.json` and `.env.example` will be copied to the output directory.
