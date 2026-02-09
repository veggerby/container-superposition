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
    "name": "My Custom Name", // Change this
    "features": {
        // Add/remove features
        "ghcr.io/devcontainers/features/go:1": {},
    },
    "forwardPorts": [3000, 8080], // Adjust ports
    "remoteEnv": {
        "MY_VAR": "value", // Add environment variables
    },
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
            - prometheus # waits for prometheus

    grafana:
        depends_on:
            - prometheus # waits for prometheus

    devcontainer:
        depends_on:
            - otel-collector # waits for otel-collector
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

## Manifest Regeneration Examples

Every generation creates a `superposition.json` manifest file that records your configuration. Use it to iterate on your setup, update to latest versions, or experiment safely.

### Basic Workflow: Iterating on Configuration

```bash
# 1. Initial setup - Start simple
npm run init -- --stack compose --language nodejs --database postgres
# Creates .devcontainer/ and superposition.json

# 2. Verify it works
code .
# Dev Containers: Reopen in Container

# 3. Later: Add Redis and observability
npm run init -- --from-manifest ./superposition.json
# Questionnaire appears with nodejs and postgres already selected
# Add: redis, otel-collector, prometheus, grafana
# Original .devcontainer/ automatically backed up to .devcontainer.backup-{timestamp}/
```

**What happens:**

- Previous selections (nodejs, postgres) pre-selected in questionnaire
- You modify the selection (add redis, observability tools)
- Original devcontainer backed up with timestamp
- New devcontainer generated with updated selections
- New superposition.json reflects current configuration

### Non-Interactive Regeneration

Regenerate exact same setup (useful for updating to latest overlay versions):

```bash
# Regenerate with exact same selections, skip confirmation, no backup
npm run init -- --from-manifest ./superposition.json --yes --no-backup
```

**Use cases:**

- **CI/CD**: Regenerate template from manifest in pipeline
- **Updates**: Get latest overlay versions without manual re-selection
- **Testing**: Quickly regenerate after overlay changes

### Switching Languages

```bash
# Started with Node.js
npm run init -- --stack compose --language nodejs --database postgres

# Switch to Python
npm run init -- --from-manifest ./superposition.json
# In questionnaire:
#   - Deselect nodejs
#   - Select python
#   - Keep postgres (already selected)
# Regenerate
```

### Adding Observability to Existing Setup

```bash
# Initial minimal setup
npm run init -- --stack compose --language dotnet --database postgres,redis

# Add full observability stack
npm run init -- --from-manifest ./superposition.json
# Add: otel-collector, jaeger, prometheus, grafana, loki
# All existing selections preserved
```

### Team Workflow: Sharing Configurations

```bash
# Developer 1: Create and commit manifest
npm run init -- --stack compose --language nodejs --database postgres --observability prometheus,grafana
git add superposition.json .devcontainer/
git commit -m "Add devcontainer configuration"
git push

# Developer 2: Clone and regenerate from manifest
git clone <repo>
npm install
npm run init -- --from-manifest ./superposition.json --yes
# Gets exact same devcontainer setup
```

### Custom Backup Location

```bash
# Backup to custom directory
npm run init -- --from-manifest ./superposition.json --backup-dir ../backups/
# Creates backup in ../backups/.devcontainer.backup-{timestamp}/
```

### Manifest Fields Preserved

The manifest stores and restores:

```json
{
    "version": "0.1.0",
    "generated": "2026-02-08T10:00:00Z",
    "baseTemplate": "compose",
    "baseImage": "bookworm",
    "overlays": ["nodejs", "postgres", "redis"],
    "portOffset": 100,
    "preset": "web-api",
    "presetChoices": { "language": "nodejs" },
    "containerName": "My API Project",
    "outputPath": "./.devcontainer"
}
```

**Preserved on regeneration:**

- Base template selection (plain/compose)
- Base image selection
- All overlay selections
- Port offset
- Preset (if used) and preset choices
- Container name (from devcontainer.json)
- Output path

### Edge Cases Handled

**Missing overlays:**

```bash
# If manifest references overlays that no longer exist
npm run init -- --from-manifest ./superposition.json
# ⚠️  Warning: Some overlays from manifest no longer exist: old-overlay
# Continues with remaining valid overlays
```

**Version mismatch:**

```bash
# If manifest version differs
npm run init -- --from-manifest ./old-manifest.json
# ⚠️  Manifest version 0.0.5 may not be fully compatible with this tool
# Continues using manifest as-is
```

### Backup Management

**Default behavior:**

```bash
npm run init -- --from-manifest ./superposition.json
# Creates: .devcontainer.backup-2026-02-08-143022/
# Contains: devcontainer.json, docker-compose.yml, all scripts, features, etc.
```

**Backup patterns automatically added to project root `.gitignore`:**

```gitignore
# Container Superposition backups
.devcontainer.backup-*/
*.backup-*
superposition.json.backup-*
```

**Restore from backup:**

```bash
# If regeneration didn't work as expected, restore from backup
rm -rf .devcontainer
mv .devcontainer.backup-2026-02-08-143022 .devcontainer
# Or cherry-pick specific files from backup
cp .devcontainer.backup-2026-02-08-143022/devcontainer.json .devcontainer/
```

### Advanced: Multiple Environments

```bash
# Development environment
npm run init -- --stack compose --language nodejs --database postgres --output ./dev
mv dev/superposition.json dev-superposition.json

# Staging environment (more observability)
npm run init -- --from-manifest ./dev-superposition.json --output ./staging
# Add: otel-collector, jaeger, prometheus, grafana
mv staging/superposition.json staging-superposition.json

# Production environment (full stack)
npm run init -- --from-manifest ./staging-superposition.json --output ./prod
# Add: loki, redis for caching
mv prod/superposition.json prod-superposition.json

# Now you have three manifests for different environments
# Regenerate any environment from its manifest
npm run init -- --from-manifest ./dev-superposition.json --yes --output ./dev
```
