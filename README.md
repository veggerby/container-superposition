# container-superposition

Composable devcontainer scaffolds that collapse into working environments.

## 🎯 Purpose

Container Superposition provides a **modular, overlay-based system** for building devcontainer configurations. Start with a minimal base template, then compose it with language frameworks, databases, observability tools, and cloud utilities to create your ideal development environment.

**Key Principles:**

- **Leverage, Don't Duplicate** - Use official images and features from containers.dev
- **Minimal Base + Composable Overlays** - Start simple, add what you need
- **Copy-Paste Ready** - Works immediately, customize as needed
- **Observability First-Class** - Full OpenTelemetry stack available as overlays

## 📋 Philosophy: Opinionated with Battle-Tested Defaults

This tool is **opinionated by design**, providing carefully curated configurations that have been tested in real-world development scenarios:

- **🎯 Battle-Tested Defaults** - Base images and configurations are chosen based on proven stability and broad compatibility
- **🔧 Customization Available** - While we provide sensible defaults, you can customize base images and configurations
- **⚠️ With Great Power...** - Custom images may introduce conflicts with overlays; test thoroughly
- **📝 Editable Output** - Generated configurations are plain JSON/YAML you can modify post-generation

**Default Base Image**: `mcr.microsoft.com/devcontainers/base:bookworm` (Debian Bookworm)

- Well-maintained by Microsoft
- Broad compatibility with devcontainer features
- Regular security updates
- Proven stability across diverse projects

**Alternative Base Images**:

- **Debian Trixie**: Newer packages, testing stability
- **Alpine Linux**: Minimal footprint (~5MB), ideal for resource-constrained environments
- **Ubuntu LTS**: Popular, familiar, extensive package ecosystem
- **Custom Images**: Specify your own, but be aware of potential overlay conflicts

All overlays are designed to work across Debian, Alpine, and Ubuntu bases with automatic package manager detection.

## 📁 Structure

```
container-superposition/
├── templates/          # Minimal base templates (plain, compose)
│   ├── plain/          # Simple image-based devcontainer
│   └── compose/        # Docker Compose-based devcontainer
├── overlays/           # Composable capability overlays
│   ├── index.yml       # Overlay registry and metadata
│   ├── presets/        # Stack presets (meta-overlays)
│   │   ├── web-api.yml
│   │   ├── microservice.yml
│   │   ├── docs-site.yml
│   │   └── fullstack.yml
│   ├── dotnet/         # Language overlays
│   ├── nodejs/
│   ├── python/
│   ├── mkdocs/
│   ├── bun/
│   ├── go/
│   ├── java/
│   ├── rust/
│   ├── powershell/
│   ├── postgres/       # Database/messaging overlays
│   ├── redis/
│   ├── mongodb/
│   ├── mysql/
│   ├── sqlite/
│   ├── sqlserver/
│   ├── minio/
│   ├── rabbitmq/
│   ├── redpanda/
│   ├── nats/
│   ├── otel-collector/ # Observability overlays
│   ├── jaeger/
│   ├── prometheus/
│   ├── grafana/
│   ├── loki/
│   ├── tempo/
│   ├── alertmanager/
│   ├── promtail/
│   ├── otel-demo-nodejs/
│   ├── otel-demo-python/
│   ├── aws-cli/        # Cloud tool overlays
│   ├── azure-cli/
│   ├── gcloud/
│   ├── kubectl-helm/
│   ├── terraform/
│   ├── pulumi/
│   ├── docker-in-docker/  # Dev tool overlays
│   ├── docker-sock/
│   ├── playwright/
│   ├── codex/
│   ├── git-helpers/
│   ├── pre-commit/
│   ├── commitlint/
│   ├── just/
│   ├── direnv/
│   ├── modern-cli-tools/
│   └── ngrok/
├── features/           # Custom devcontainer features
├── tool/               # Composition logic and schema
│   ├── questionnaire/  # Composition engine
│   └── schema/         # TypeScript types and JSON schema
├── docs/               # Complete documentation
│   ├── presets.md      # Stack presets guide
│   └── ...
└── scripts/            # CLI entry points
```

### `/templates` - Minimal Base Templates

Two foundational templates that serve as starting points:

- **plain** - Simple image-based devcontainer with essential tools
- **compose** - Docker Compose-based for multi-service environments

Each template is minimal by design. Capabilities are added via overlays.

### `/overlays` - Composable Capabilities

Overlays are modular configuration fragments organized by category:

**Language & Framework:**

- **dotnet** - .NET SDK with C# development tools
- **nodejs** - Node.js LTS with npm and TypeScript support
- **python** - Python with pip and common data science tools
- **mkdocs** - MkDocs for documentation sites
- **bun** - Bun JavaScript runtime and toolkit
- **go** - Go programming language
- **java** - Java Development Kit
- **rust** - Rust programming language
- **powershell** - PowerShell Core

**Databases & Message Brokers:**

- **postgres** - PostgreSQL relational database
- **redis** - Redis in-memory data store
- **mongodb** - MongoDB document database
- **mysql** - MySQL relational database
- **sqlite** - SQLite embedded database
- **sqlserver** - Microsoft SQL Server
- **minio** - MinIO S3-compatible object storage
- **rabbitmq** - RabbitMQ message broker (AMQP)
- **redpanda** - Redpanda Kafka-compatible streaming
- **nats** - NATS messaging system

**Observability:**

- **otel-collector** - OpenTelemetry Collector (telemetry pipeline)
- **jaeger** - Jaeger distributed tracing
- **prometheus** - Prometheus metrics collection
- **grafana** - Grafana visualization and dashboards
- **loki** - Loki log aggregation
- **tempo** - Tempo distributed tracing backend
- **alertmanager** - Prometheus Alertmanager
- **promtail** - Promtail log collector for Loki
- **otel-demo-nodejs** - OpenTelemetry demo app (Node.js)
- **otel-demo-python** - OpenTelemetry demo app (Python)

**Cloud Tools:**

- **aws-cli** - AWS Command Line Interface
- **azure-cli** - Azure Command Line Interface
- **gcloud** - Google Cloud SDK
- **kubectl-helm** - Kubernetes CLI and Helm package manager
- **terraform** - Terraform infrastructure as code
- **pulumi** - Pulumi infrastructure as code

**Dev Tools:**

- **docker-in-docker** - Docker daemon in container
- **docker-sock** - Access to host Docker daemon
- **playwright** - Playwright browser automation
- **codex** - Codex AI coding assistant
- **git-helpers** - Git with LFS, GPG, GitHub CLI
- **pre-commit** - Pre-commit hook framework
- **commitlint** - Commit message linting
- **just** - Just command runner
- **direnv** - Directory-based environment variables
- **modern-cli-tools** - Modern alternatives (ripgrep, fd, bat, jq, yq)
- **ngrok** - Ngrok secure tunnels

Each overlay includes:

- `devcontainer.patch.json` - Configuration to merge
- `docker-compose.yml` (if needed) - Service definitions
- `.env.example` - Environment variables
- Configuration files (e.g., `otel-collector-config.yaml`)
- README with usage instructions

### `/features` - Custom Building Blocks

Custom devcontainer features that add value beyond containers.dev:

- **cross-distro-packages** - Cross-distribution package manager with automatic distro detection (apt/apk)
- **project-scaffolder** - Interactive project initialization
- **team-conventions** - Shared linting, formatting, commit standards
- **local-secrets-manager** - Safe local development secrets

## 🚀 Quick Start

### Via npx (Recommended)

No installation required! Use npx to run the tool directly:

```bash
# Interactive mode - guided questionnaire
npx container-superposition init

# With CLI flags - skip to your stack
npx container-superposition init --stack compose --language nodejs --database postgres

# List all available overlays
npx container-superposition list

# Check your environment
npx container-superposition doctor
```

### Global Installation (Optional)

Install globally for faster repeated use:

```bash
# Install globally
npm install -g container-superposition

# Now use without npx
container-superposition init
container-superposition list
container-superposition doctor
```

### From Source (Development)

For contributors or those who want to modify the tool:

```bash
# Clone the repository
git clone https://github.com/veggerby/container-superposition.git
cd container-superposition

# Install dependencies
npm install

# Run the interactive setup
npm run init
```

### Available Commands

- **`init`** - Initialize a new devcontainer configuration (default command)
- **`regen`** - Regenerate devcontainer from existing manifest
- **`list`** - List all available overlays and presets
- **`doctor`** - Check environment and validate configuration

The questionnaire guides you through:

1. **Preset or Custom** - Start from a pre-configured stack or build custom?
2. **Base template** - plain or compose?
3. **Overlays** - All available overlays in one multi-select (language, databases, observability, cloud tools, dev tools)
4. **Output path** - Where to generate the configuration

#### Stack Presets (NEW!)

Quickly get started with common development scenarios:

**🌐 Web API Stack**

- Language choice (Node.js, .NET, Python, Go, Java)
- PostgreSQL + Redis
- Full observability (OTEL, Prometheus, Grafana, Loki)
- Pre-configured connection strings

**🔀 Microservice Stack**

- Language choice
- Message broker (RabbitMQ, Redpanda, NATS)
- Distributed tracing (Jaeger)
- Metrics & monitoring (Prometheus, Grafana)

**📚 Documentation Site**

- MkDocs + Python
- Pre-commit hooks
- Modern CLI tools
- GitHub Pages ready

**🎨 Full-Stack Application**

- Node.js frontend + Backend language choice
- PostgreSQL + Redis + MinIO
- Complete observability stack

See [docs/presets.md](docs/presets.md) for detailed preset documentation.

**Example compositions:**

```bash
# Using presets (interactive)
npx container-superposition init
# Select "Web API Stack" → Choose Node.js → Done!

# Node.js API with PostgreSQL and observability
npx container-superposition init --stack compose --language nodejs --database postgres --observability otel-collector,jaeger,prometheus,grafana

# .NET microservice with full observability stack
npx container-superposition init --stack compose --language dotnet --database postgres,redis --observability otel-collector,jaeger,prometheus,grafana,loki --cloud-tools aws-cli,kubectl-helm

# Go microservice with RabbitMQ messaging
npx container-superposition init --stack compose --language go --database rabbitmq,redis --observability jaeger,prometheus

# Rust development environment with modern CLI tools
npx container-superposition init --stack plain --language rust --dev-tools modern-cli-tools,git-helpers,pre-commit

# Java Spring Boot with MySQL
npx container-superposition init --stack compose --language java --database mysql,redis --cloud-tools kubectl-helm

# Python data science with MongoDB
npx container-superposition init --stack compose --language python --database mongodb

# Event-driven architecture with Redpanda
npx container-superposition init --stack compose --language nodejs --database redpanda,postgres --observability otel-collector,tempo,grafana

# Multi-cloud setup with Terraform
npx container-superposition init --stack plain --language python --cloud-tools aws-cli,azure-cli,gcloud,terraform,pulumi

# Full observability stack with demo apps
npx container-superposition init --stack compose --language nodejs --observability otel-collector,jaeger,prometheus,grafana,loki,tempo,otel-demo-nodejs

# Bun with MinIO object storage
npx container-superposition init --stack compose --language bun --database postgres,minio --dev-tools docker-sock

# Documentation site with MkDocs
npx container-superposition init --stack plain --language mkdocs --dev-tools pre-commit,modern-cli-tools

# PowerShell scripting environment
npx container-superposition init --stack plain --language powershell --cloud-tools aws-cli,azure-cli
```

**Port Offset for Multiple Instances:**

If you're running multiple devcontainer instances simultaneously (e.g., multiple microservices), use `--port-offset` to avoid port conflicts:

```bash
# Service 1 (default ports)
npm run init -- --stack compose --language nodejs --postgres --output ./service1

# Service 2 (ports shifted by 100)
npm run init -- --stack compose --language nodejs --postgres --port-offset 100 --output ./service2

# Service 3 (ports shifted by 200)
npm run init -- --stack compose --language nodejs --postgres --port-offset 200 --output ./service3
```

This automatically adjusts all exposed ports in docker-compose.yml and documents the offset in .env.example.

### Regenerating from Manifest

Every devcontainer generation creates a `superposition.json` manifest file that records your configuration choices. You can use this manifest to:

- **Iterate on your setup** - Modify overlay selections and regenerate
- **Update to latest** - Regenerate with newer overlay versions
- **Experiment safely** - Try different configurations with automatic backup
- **Share configurations** - Commit the manifest for team consistency

**Quick regeneration (recommended):**

```bash
# Simple regen command - automatically finds manifest in .devcontainer/
npx container-superposition regen

# Creates backup and regenerates with exact same settings from manifest
```

**Interactive regeneration with changes:**

```bash
# Loads manifest, creates backup, shows questionnaire with pre-selected options
npx container-superposition init --from-manifest ./.devcontainer/superposition.json

# Or from a different location (regenerates in the manifest's directory)
npx container-superposition init --from-manifest /path/to/project/.devcontainer/superposition.json
```

> **Note:** When using `--from-manifest`, the devcontainer is generated relative to the manifest file's location, not your current working directory. This means you can run the command from anywhere and the output will go to the correct project directory.

**Non-interactive regeneration (CI/CD):**

```bash
# Truly non-interactive: use manifest values directly without questionnaire
npx container-superposition init --from-manifest ./.devcontainer/superposition.json --no-interactive --no-backup
```

> **Note:** The `--no-interactive` option skips the questionnaire entirely and uses all values from the manifest. This is perfect for CI/CD pipelines or when you want to ensure exact reproducibility.

**Workflow examples:**

```bash
# 1. Initial setup
npx container-superposition init --stack compose --language nodejs --database postgres
# Creates .devcontainer/ and superposition.json

# 2. Later: Add Redis and observability (interactive)
npx container-superposition init --from-manifest ./.devcontainer/superposition.json
# Questionnaire shows with nodejs and postgres pre-selected
# Add redis, otel-collector, grafana
# Original .devcontainer/ backed up automatically

# 3. Update to latest overlay versions (simple regen)
npx container-superposition regen
# Uses exact manifest values, creates backup
# Perfect for pulling latest overlay updates

# 4. Switch languages (e.g., Node.js → Python)
npx container-superposition init --from-manifest ./.devcontainer/superposition.json
# Change nodejs to python in questionnaire
# Regenerate with new language
```

**Backup behavior:**

- **Default**: Creates timestamped backup next to the devcontainer directory (e.g., `.devcontainer.backup-2026-02-08-143022/`)
- **`--no-backup`**: Skip backup (destructive, use with caution)
- **`--backup-dir <path>`**: Custom backup location
- **Automatic .gitignore**: Backup patterns added to project root `.gitignore`

**What's preserved from manifest:**

- Base template (plain/compose)
- Preset selection (if used)
- All overlay selections
- Port offset
- Output path
- Container name

See [tool/README.md](tool/README.md) for full documentation.

### Preserving Project-Specific Customizations

**Problem**: When you regenerate a devcontainer (to add overlays or update), manual customizations are lost.

**Solution**: Use the `.devcontainer/custom/` directory for customizations that persist across regenerations.

**Quick example:**

```bash
# 1. Generate initial devcontainer
npm run init -- --stack compose --language nodejs --database postgres

# 2. Add custom patches
mkdir -p .devcontainer/custom

# Add custom mounts, extensions, etc.
cat > .devcontainer/custom/devcontainer.patch.json << 'EOF'
{
  "mounts": [
    "source=${localWorkspaceFolder}/../shared-libs,target=/workspace/shared,type=bind"
  ],
  "customizations": {
    "vscode": {
      "extensions": ["eamodio.gitlens"]
    }
  }
}
EOF

# 3. Regenerate (e.g., to add Redis)
npm run init -- --from-manifest .devcontainer/superposition.json
# Select redis in addition to existing overlays

# 4. Your custom patches are automatically preserved and merged! ✅
```

**Supported customization files:**

- `devcontainer.patch.json` - Merges into devcontainer.json
- `docker-compose.patch.yml` - Merges into docker-compose.yml
- `environment.env` - Additional environment variables
- `scripts/post-create.sh` - Custom one-time setup script
- `scripts/post-start.sh` - Custom startup script
- `files/` - Additional files to copy

See **[Custom Patches Guide](docs/custom-patches.md)** for complete documentation and examples.

### Option 2: Manual Composition

1. **Copy a base template:**

    ```bash
    cp -r templates/compose/.devcontainer /path/to/your/project/
    ```

2. **Add overlay configurations:**

    ```bash
    # Merge devcontainer.patch.json files
    # Copy docker-compose.yml files as docker-compose.{overlay}.yml
    # Merge .env.example files
    ```

3. **Open in VS Code** and reopen in container

## 🔧 Architecture

- **Questionnaire**: 5–8 questions to understand your needs
- **Composition**: Merges base templates with lightweight overlays
- **Output**: Plain `.devcontainer/` folder — fully editable, no lock-in
- **Overlays**: Add-ons for databases (Postgres, Redis), Playwright, cloud tools, etc.

**Key Design Decisions:**

- ✅ Generate once, edit forever (no "sync" or "update")
- ✅ Output is standard JSON — no proprietary formats
- ✅ Tool is optional — templates work standalone
- ✅ Cross-platform via Node.js/TypeScript
- ✅ Metadata-driven overlays (no hardcoded menus)

### Metadata-Driven Overlays

All overlays are defined in [overlays/index.yml](overlays/index.yml):

```yaml
observability_overlays:
    - id: otel-collector
      name: OpenTelemetry Collector
      description: Telemetry collection pipeline
      category: observability
      order: 2 # Start after backends
```

**Benefits:**

- Add new overlays without code changes
- Consistent naming and descriptions
- Control display order and categorization
- Easy maintenance and documentation

**Overlay Categories:**

- `base_templates` - plain, compose
- `base_images` - bookworm, trixie, alpine, ubuntu, custom
- `language_overlays` - dotnet, nodejs, python, mkdocs, bun, go, java, rust, powershell
- `database_overlays` - postgres, redis, mongodb, mysql, sqlite, sqlserver, minio, rabbitmq, redpanda, nats
- `observability_overlays` - otel-collector, jaeger, prometheus, grafana, loki, tempo, alertmanager, promtail, otel-demo-nodejs, otel-demo-python
- `cloud_tool_overlays` - aws-cli, azure-cli, gcloud, kubectl-helm, terraform, pulumi
- `dev_tool_overlays` - docker-in-docker, docker-sock, playwright, codex, git-helpers, pre-commit, commitlint, just, direnv, modern-cli-tools, ngrok

See [tool/docs/questionnaire-updates.md](tool/docs/questionnaire-updates.md) for details.

### Dependency Management & Auto-Resolution

Container Superposition includes an intelligent dependency model that automatically resolves required dependencies:

**Dependency Types:**

- **`requires`** - Hard dependencies that are automatically added
- **`suggests`** - Soft dependencies that work well together
- **`conflicts`** - Mutually exclusive overlays

**Auto-Resolution Example:**

```bash
# Select grafana, and prometheus is automatically added
npm run init -- --stack compose --observability grafana

# Output includes both:
# ✅ grafana
# ✅ prometheus (auto-resolved, required by grafana)
```

**Explicit Metadata in overlays/index.yml:**

```yaml
observability_overlays:
    - id: grafana
      name: Grafana
      requires: [prometheus] # Auto-add prometheus
      suggests: [loki, jaeger] # Could work well together
      conflicts: []
      tags: [observability, ui]
      ports: [3000] # Explicit port declarations
```

**Benefits:**

- ✅ Predictable behavior - no hidden "if overlay == ..." logic
- ✅ Automatic dependency resolution
- ✅ Clear conflict detection
- ✅ Port-offset becomes data-driven

**Superposition Manifest:**

Every generated configuration includes a `superposition.json` manifest for debugging:

```json
{
    "version": "0.1.0",
    "generated": "2026-02-04T10:30:00Z",
    "baseTemplate": "compose",
    "baseImage": "bookworm",
    "overlays": ["dotnet", "postgres", "prometheus", "grafana"],
    "portOffset": 100,
    "autoResolved": {
        "added": ["prometheus"],
        "reason": "prometheus (required by grafana)"
    }
}
```

This manifest answers "why is this here?" without reading generated configs.

See [tool/docs/overlays.md](tool/docs/overlays.md) for complete overlay reference.

### Service Dependency Management

The composer intelligently manages docker-compose service dependencies:

1. **Filters docker-compose** - Removes `depends_on` references to unselected services
2. **Orders services** - Uses `_serviceOrder` field (0=infra, 1=backends, 2=middleware, 3=UI)
3. **Merges runServices** - Creates ordered startup sequence
4. **Validates overlays** - Ensures compatible combinations

Example: If you select `grafana` without `prometheus`, the `depends_on: [prometheus]` is automatically removed.

See [tool/README.md](tool/README.md) for architecture details.

## 🔧 Customization

### Using Official Features

All templates use official features from [containers.dev/features](https://containers.dev/features). Add more by editing `devcontainer.json`:

```json
{
    "features": {
        "ghcr.io/devcontainers/features/node:1": {},
        "ghcr.io/devcontainers/features/docker-in-docker:2": {},
        "ghcr.io/devcontainers/features/github-cli:1": {}
    }
}
```

### Adding Custom Features

Use our custom features for specialized needs:

```json
{
    "features": {
        "./features/project-scaffolder": { "template": "express-api" },
        "./features/team-conventions": { "preset": "airbnb" }
    }
}
```

### Mixing Templates

Start with one template and enhance it:

- Add features from containers.dev
- Include custom features from this repo
- Copy useful scripts from other templates

## 🧪 Testing & Verification

### Golden Tests

The project includes comprehensive test coverage for composition logic:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run smoke tests
npm run test:smoke
```

**Test Coverage:**

- ✅ Dependency resolution logic
- ✅ devcontainer.json merging
- ✅ docker-compose.yml merging
- ✅ Port offset application
- ✅ Environment variable merging
- ✅ Manifest generation

### Overlay Verification Scripts

Each overlay includes a `verify.sh` script for validation:

```bash
# Inside a devcontainer, run verification scripts
bash ./verify-postgres.sh
bash ./verify-redis.sh
bash ./verify-grafana.sh
```

**Verification scripts check:**

- ✅ Tool/service is installed
- ✅ Version information
- ✅ Service connectivity (for compose overlays)
- ✅ Port accessibility

Example output:

```
🔍 Verifying PostgreSQL overlay...

1️⃣ Checking psql client...
psql (PostgreSQL) 16.1
   ✅ psql client found

2️⃣ Checking PostgreSQL service...
   ✅ PostgreSQL service is ready
postgres:5432 - accepting connections

✅ PostgreSQL overlay verification complete
```

## 📦 Design Principles

- **Copy-Paste First** - Templates should work immediately without modification
- **Fast Builds** - Optimized Dockerfiles with layer caching
- **Composability** - Features can be mixed and matched
- **Minimal Bloat** - Only include what's needed
- **No Lock-In** - Standard devcontainer format, works anywhere
- **Preserve Customizations** - Project-specific changes survive regeneration via `.devcontainer/custom/`

## 🏗️ Building Your Own Template

Create a custom template for your team or project:

1. **Start with an official base** from [containers.dev/images](https://containers.dev/images)
2. **Add official features** from [containers.dev/features](https://containers.dev/features)
3. **Include custom features** from this repo for specialized needs
4. **Add project scripts** for your specific workflow
5. **Test thoroughly** - build and verify all tools work
6. **Document** - explain what's included and why

Example `devcontainer.json` structure:

```json
{
    "name": "My Custom Template",
    "image": "mcr.microsoft.com/devcontainers/typescript-node:20",
    "features": {
        "ghcr.io/devcontainers/features/docker-in-docker:2": {},
        "./features/team-conventions": {}
    },
    "postCreateCommand": "npm install && npm run setup",
    "customizations": {
        "vscode": {
            "extensions": ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode"]
        }
    }
}
```

## 📚 Documentation

Complete documentation is available in the [docs/](docs/) folder:

- **[Documentation Index](docs/README.md)** - Complete documentation overview
- **[Custom Patches](docs/custom-patches.md)** - Preserve project-specific customizations across regenerations
- **[Publishing Guide](docs/publishing.md)** - How to publish to npm
- **[Quick Reference](docs/quick-reference.md)** - Templates, overlays, ports, commands
- **[Architecture](docs/architecture.md)** - Design principles and composition logic
- **[Creating Overlays](docs/creating-overlays.md)** - Guide for adding new overlays
    - [Overlay Manifest Schema](tool/schema/overlay-manifest.schema.json) - JSON schema for overlay.yml
    - [Overlay Index Guide](.github/instructions/overlay-index.instructions.md) - Comprehensive field documentation
- **[Examples](docs/examples.md)** - Common usage patterns

Additional resources:

- [VS Code Dev Containers Documentation](https://code.visualstudio.com/docs/devcontainers/containers)
- [Dev Container Specification](https://containers.dev/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## 💻 Development

### Working on Container Superposition

This repository dogfoods its own tooling! The development environment is set up using Container Superposition itself.

**Quick Start:**

```bash
# Clone and open in VS Code
git clone https://github.com/veggerby/container-superposition.git
cd container-superposition
code .

# When prompted, click "Reopen in Container"
# The devcontainer includes:
# - Node.js with TypeScript
# - Docker access (via host socket)
# - Git helpers and modern CLI tools
# - Codex for AI assistance
```

**Without Devcontainer:**

```bash
npm install       # Install dependencies
npm run build     # Compile TypeScript
npm run init      # Run the tool
npm test          # Run tests
```

**Development Workflow:**

1. Make changes to TypeScript sources in `scripts/` or `tool/`
2. Run `npm run build` to compile
3. Test with `npm run init` or `npm test`
4. Submit PR following [CONTRIBUTING.md](CONTRIBUTING.md)

The `.devcontainer/` folder is generated using:

```bash
npm run init -- --stack plain --language nodejs --dev-tools codex,docker-sock,git-helpers,modern-cli-tools
```

## 🤝 Contributing

Contributions welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Keep contributions:

- Minimal and focused
- Well-documented
- Fast to build
- Easy to understand

## 📄 License

MIT License - use freely in your projects.
