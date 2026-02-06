# Usage Examples

Common usage patterns for the init tool.

## Interactive Mode

```bash
npm run init
```

Follow the prompts to select your stack, database, tools, and output location.

## Non-Interactive Examples

### .NET with PostgreSQL

```bash
npm run init -- --stack compose --language dotnet --postgres --output ./.devcontainer
```

Creates:
- Docker Compose base template
- .NET 10 SDK and C# DevKit
- PostgreSQL 16 service
- Database client tools
- Environment variables for connection

### Node.js API with Observability

```bash
npm run init -- \
  --stack compose \
  --language nodejs \
  --postgres \
  --observability otel-collector,jaeger,prometheus,grafana
```

Creates:
- Docker Compose infrastructure
- Node.js LTS with TypeScript
- PostgreSQL database
- OpenTelemetry Collector pipeline
- Jaeger for distributed tracing
- Prometheus for metrics
- Grafana for visualization

### Full Observability Stack

```bash
npm run init -- \
  --stack compose \
  --language dotnet \
  --database postgres+redis \
  --observability otel-collector,jaeger,prometheus,grafana,loki \
  --cloud-tools aws-cli,kubectl-helm
```

Creates:
- Docker Compose infrastructure
- .NET microservice setup
- PostgreSQL and Redis
- Complete observability stack (traces, metrics, logs)
- AWS CLI and Kubernetes tools

### Minimal Documentation Site

```bash
npm run init -- --stack plain --language mkdocs --output ./my-docs/.devcontainer
```

Creates:
- Simple image-based devcontainer
- Python with MkDocs
- Documentation tools
- Minimal configuration

### Multi-Cloud Python Development

```bash
npm run init -- \
  --stack compose \
  --language python \
  --postgres \
  --cloud-tools aws-cli,azure-cli,kubectl-helm
```

Creates:
- Docker Compose base
- Python 3.12 with linting
- PostgreSQL database
- AWS, Azure, and Kubernetes CLIs

## Programmatic Usage

```javascript
import { composeDevContainer } from './tool/questionnaire/composer.js';

await composeDevContainer({
  stack: 'compose',
  baseImage: 'bookworm',
  language: ['dotnet'],
  needsDocker: true,
  database: 'postgres',
  playwright: false,
  observability: ['otel-collector', 'jaeger', 'prometheus', 'grafana'],
  cloudTools: ['aws-cli'],
  devTools: [],
  outputPath: './.devcontainer',
});
```

## Output Structure

All examples produce:

```
.devcontainer/
├── devcontainer.json                  # Merged configuration
├── docker-compose.yml                 # Base compose (if compose template)
├── .env.example                       # Combined environment variables
├── scripts/
│   └── post_create.sh                 # Setup scripts
├── docker-compose.postgres.yml        # If postgres selected
├── docker-compose.redis.yml           # If redis selected
├── docker-compose.otel-collector.yml  # If otel-collector selected
├── docker-compose.jaeger.yml          # If jaeger selected
├── docker-compose.prometheus.yml      # If prometheus selected
├── docker-compose.grafana.yml         # If grafana selected
├── docker-compose.loki.yml            # If loki selected
├── otel-collector-config.yaml         # Observability configs
├── prometheus.yml
├── grafana-datasources.yml
└── loki-config.yaml
```

## Customization After Generation

The output is plain JSON - edit directly:

```jsonc
// .devcontainer/devcontainer.json
{
  "name": "My Custom Name",  // Change this
  "features": {
    // Add/remove features
    "ghcr.io/devcontainers/features/go:1": {}
  },
  "forwardPorts": [3000, 8080],  // Adjust ports
  "remoteEnv": {
    "MY_VAR": "value"  // Add environment variables
  }
}
```

The tool gets you started—you customize from there.

## Help and Documentation

```bash
# Show all options
npm run init -- --help

# Show version
npm run init -- --version
```

## Common Patterns

### Microservice with Full Observability

Production-ready microservice with complete observability:

```bash
npm run init -- \
  --stack compose \
  --language dotnet \
  --postgres \
  --observability otel-collector,jaeger,prometheus,grafana,loki \
  --cloud-tools kubectl-helm
```

This creates:
- .NET microservice with Docker Compose
- PostgreSQL database
- OpenTelemetry pipeline (collector → jaeger/prometheus/loki → grafana)
- Kubernetes deployment tools
- Complete local development environment matching production

### Frontend Application with Testing

Common for frontend applications:

```bash
npm run init -- \
  --stack compose \
  --language nodejs \
  --redis \
  --dev-tools playwright
```

### Backend API with Metrics Only

Lightweight observability for REST APIs:

```bash
npm run init -- \
  --stack compose \
  --language nodejs \
  --postgres \
  --observability prometheus,grafana
```

### Distributed Tracing Setup

Focus on distributed tracing without full observability:

```bash
npm run init -- \
  --stack compose \
  --language dotnet \
  --database postgres+redis \
  --observability otel-collector,jaeger
```

### Documentation Sites

For documentation projects:

```bash
npm run init -- --stack plain --language mkdocs
```

### Multi-Cloud Python Development

For Python projects targeting multiple clouds:

```bash
npm run init -- \
  --stack compose \
  --language python \
  --postgres \
  --cloud-tools aws-cli,azure-cli,kubectl-helm
```

## Observability Stack Combinations

### Minimal (Traces Only)
```bash
--observability jaeger
```
Direct tracing without collector.

### Minimal (Metrics Only)
```bash
--observability prometheus,grafana
```
Metrics collection and visualization.

### Standard (Traces + Metrics)
```bash
--observability otel-collector,jaeger,prometheus,grafana
```
Complete telemetry pipeline for traces and metrics.

### Complete (Traces + Metrics + Logs)
```bash
--observability otel-collector,jaeger,prometheus,grafana,loki
```
Full observability stack with centralized logging.

## Service Dependencies

The system handles dependencies automatically. For example, if you select:

```bash
--observability otel-collector,prometheus,grafana
```

The generated `docker-compose.yml` will include:
```yaml
services:
  prometheus:
    # starts first

  otel-collector:
    depends_on:
      - prometheus  # waits for prometheus

  grafana:
    depends_on:
      - prometheus  # waits for prometheus

  devcontainer:
    depends_on:
      - otel-collector  # waits for otel-collector
```

Services start in the correct order automatically!

## Adding Custom Configuration Files

Overlays can include additional configuration files that are automatically copied to your output. For example:

### Creating an Overlay with Config Files

```
tool/overlays/my-service/
├── devcontainer.patch.json    # DevContainer configuration
├── docker-compose.yml         # Service definition
├── .env.example               # Environment variables
├── otel-collector.yml         # OpenTelemetry configuration
└── config/
    ├── nginx.conf             # Nginx configuration
    └── app-settings.json      # Application settings
```

When you select this overlay, **all files** (except `devcontainer.patch.json` and `.env.example`) are copied to your output:

```
.devcontainer/
├── devcontainer.json
├── .env.example               # Merged from all selected overlays
├── docker-compose.my-service.yml
├── otel-collector.yml         # Copied from overlay
└── config/
    ├── nginx.conf             # Copied from overlay
    └── app-settings.json      # Copied from overlay
```

### Environment Variables per Overlay

Each overlay provides its own `.env.example` with relevant variables:

**postgres/.env.example:**
```bash
POSTGRES_VERSION=16
POSTGRES_DB=devdb
POSTGRES_PASSWORD=postgres
```

**redis/.env.example:**
```bash
REDIS_VERSION=7
REDIS_PORT=6379
```

**Combined output .env.example:**
```bash
# Environment Variables
# Generated by container-superposition init tool

# PostgreSQL Configuration
POSTGRES_VERSION=16
POSTGRES_DB=devdb
POSTGRES_PASSWORD=postgres

# Redis Configuration
REDIS_VERSION=7
REDIS_PORT=6379
```

Copy `.env.example` to `.env` and customize for your needs.
