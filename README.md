# container-superposition

[![Validate Overlays](https://github.com/veggerby/container-superposition/actions/workflows/validate-overlays.yml/badge.svg)](https://github.com/veggerby/container-superposition/actions/workflows/validate-overlays.yml)
[![Build DevContainers](https://github.com/veggerby/container-superposition/actions/workflows/build-devcontainers.yml/badge.svg)](https://github.com/veggerby/container-superposition/actions/workflows/build-devcontainers.yml)
[![npm version](https://badge.fury.io/js/container-superposition.svg)](https://www.npmjs.com/package/container-superposition)

Composable devcontainer scaffolds that collapse into working environments.

## ⚡ 30-Second Quickstart

Get a fully-configured development environment in one command:

```bash
# Web API with database and observability (Node.js)
npx container-superposition init --preset web-api --language nodejs
# Creates: Node.js + PostgreSQL + Redis + Grafana + Prometheus + Loki

# Or compose + specific language
npx container-superposition init --stack compose --language nodejs --database postgres
# Creates: Node.js + PostgreSQL devcontainer

# Then open in VS Code
code .
# Click "Reopen in Container" when prompted
```

**That's it!** Your devcontainer is ready. Jump to [Quick Start](#-quick-start) for more options or [Examples](#-examples) for real-world references.

### 👁️ Preview Before You Commit

Use the `plan` command to see exactly what will be created:

```bash
npx container-superposition plan --stack compose --overlays nodejs,postgres,grafana,prometheus
```

**Example output:**

```
╭──────────────────╮
│ Generation Plan  │
╰──────────────────╯

Stack: compose

Overlays Selected:
  ✓ nodejs (Node.js)
  ✓ postgres (PostgreSQL)
  ✓ grafana (Grafana)
  ✓ prometheus (Prometheus)

Port Mappings:
  postgres: 5432
  grafana: 3000
  prometheus: 9090

Files to Create/Modify:
  .devcontainer/
    📄 .env.example
    📄 README.md
    📄 devcontainer.json
    📄 docker-compose.yml
    📄 global-packages-nodejs.txt
    📄 ports.json
    📄 superposition.json
  .devcontainer/scripts/
    📄 setup-nodejs.sh
    📄 verify-grafana.sh
    📄 verify-nodejs.sh
    📄 verify-postgres.sh
    📄 verify-prometheus.sh

✓ No conflicts detected. Ready to generate!
```

This gives you full visibility into the configuration before any files are created.

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
- **`list`** - List all available overlays and presets with filtering options
- **`explain`** - Show detailed information about a specific overlay
- **`plan`** - Preview what will be generated before creating devcontainer
- **`doctor`** - Check environment and validate configuration

#### Discovery Commands

**List available overlays:**

```bash
# List all overlays grouped by category
npx container-superposition list

# Filter by category
npx container-superposition list --category database

# Filter by tags
npx container-superposition list --tags observability

# Filter by stack support
npx container-superposition list --supports compose

# JSON output for scripting
npx container-superposition list --json
```

**Explain an overlay in detail:**

```bash
# Show detailed information about an overlay
npx container-superposition explain postgres

# JSON output
npx container-superposition explain nodejs --json
```

**Plan before generating:**

```bash
# Preview what will be created
npx container-superposition plan --stack compose --overlays postgres,grafana

# Include port offset
npx container-superposition plan --stack compose --overlays postgres,redis --port-offset 100

# JSON output
npx container-superposition plan --stack compose --overlays nodejs,postgres --json
```

The `plan` command shows:

- Selected overlays and auto-added dependencies
- Port mappings (with offset applied)
- Files that will be created/modified
- Conflict detection

#### Environment Validation

The `doctor` command provides comprehensive environment diagnostics:

```bash
# Check environment and configuration
npx container-superposition doctor

# Check specific devcontainer
npx container-superposition doctor --output /path/to/.devcontainer

# Get JSON output for CI/CD
npx container-superposition doctor --json

# Apply automatic fixes (where possible)
npx container-superposition doctor --fix
```

**Doctor checks:**

- ✅ Node.js version compatibility (>= 20)
- ✅ Docker daemon connectivity
- ✅ Docker Compose v2 availability (when using compose stack)
- ✅ Overlay integrity (valid manifests, required files)
- ✅ Manifest compatibility
- ⚠️ Port conflicts (best-effort detection)

**Example output:**

```
🔍 Running diagnostics...

Environment:
  ✓ Node.js version: v20.10.0 (>= 20.0.0 required)
  ✓ Docker daemon: Docker version 24.0.5
  ✓ Docker Compose: v2.23.0 (v2 required)

Overlays:
  ✓ All 46 overlays valid

Manifest:
  ✓ Manifest version: Format version 0.1.0
  ✓ DevContainer config: devcontainer.json valid

Summary:
  ✓ 51 passed
```

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

### Deployment Target Support

Container Superposition validates overlay compatibility with different deployment environments (local, Codespaces, Gitpod, DevPod) using the `--target` flag.

```bash
# Specify deployment target
npx container-superposition init --target codespaces
npx container-superposition init --target gitpod
npx container-superposition init --target local  # default
```

The tool automatically validates overlay compatibility and warns you when selecting overlays that won't work in your target environment (e.g., `docker-sock` doesn't work in Codespaces).

**📖 See [Deployment Targets Documentation](docs/deployment-targets.md) for:**

- Complete target comparison table
- Interactive mode examples
- Environment-specific configuration
- Compatibility rules and best practices

### Overlay Compatibility Matrix

Common overlays and their compatibility with different deployment targets:

| Overlay              | Local | Codespaces | Gitpod | Notes                                    |
| -------------------- | ----- | ---------- | ------ | ---------------------------------------- |
| **docker-sock**      | ✅    | ❌         | ❌     | Requires host Docker socket (local only) |
| **docker-in-docker** | ✅    | ✅         | ✅     | Slower but portable                      |
| **postgres**         | ✅    | ✅         | ✅     |                                          |
| **redis**            | ✅    | ✅         | ✅     |                                          |
| **mysql**            | ✅    | ✅         | ✅     |                                          |
| **mongodb**          | ✅    | ✅         | ✅     |                                          |
| **sqlserver**        | ✅    | ✅         | ✅     | Needs memory (>2GB recommended)          |
| **rabbitmq**         | ✅    | ✅         | ✅     |                                          |
| **grafana**          | ✅    | ✅         | ✅     |                                          |
| **prometheus**       | ✅    | ✅         | ✅     |                                          |
| **jaeger**           | ✅    | ✅         | ✅     |                                          |
| **playwright**       | ✅    | ✅         | ✅     | Requires browser dependencies            |
| **aws-cli**          | ✅    | ✅         | ✅     | CLI tools work everywhere                |
| **kubectl-helm**     | ✅    | ✅         | ✅     |                                          |
| **terraform**        | ✅    | ✅         | ✅     |                                          |

**Legend:**

- ✅ Fully supported
- ❌ Not supported (technical limitation)

The `--target` flag enables automatic validation during generation.

## ⚠️ Security Considerations

**Important:** Container Superposition is designed for **development environments only**. Be aware of these security implications:

### docker-sock Overlay

- **⚠️ Risk:** Provides **root-level access** to host Docker daemon
- **⚠️ Limitation:** Not supported in GitHub Codespaces (requires local Docker)
- **✅ Alternative:** Use `docker-in-docker` for isolation and portability
- **✅ When to use:** Local development only, trusted code only

**Why this matters:**

Mounting `/var/run/docker.sock` gives the container full control over the host's Docker daemon. A compromised container could:

- Access your entire filesystem via volume mounts
- Create privileged containers
- Effectively gain root access to your host machine

**Best practices:**

- ✅ Only use on your local development machine
- ✅ Never use in multi-tenant or production environments
- ✅ Audit containers created from within the devcontainer
- ❌ Don't use with untrusted code or dependencies

### Database Default Credentials

All database overlays (PostgreSQL, Redis, MySQL, etc.) use **development-only default credentials**:

- Default passwords like `postgres`, `redis`, `admin`
- No authentication enabled by default (where applicable)
- Designed for local development convenience

**Best practices:**

- ✅ Change default passwords for any networked testing
- ✅ Never expose database ports publicly
- ✅ Use `.env` (gitignored) for custom credentials
- ❌ Never commit real credentials to version control

### Environment Files

- **`.env.example`** - Committed to git, contains templates and defaults
- **`.env`** - Gitignored, contains your actual values (may include secrets)

**Best practices:**

- ✅ Copy `.env.example` to `.env` and customize
- ✅ Use placeholder values in `.env.example` (`CHANGEME`, `your-key-here`)
- ✅ Verify `.env` is in `.gitignore` before committing
- ❌ Never commit `.env` files with real credentials

### General Security Principles

- **Development only** - These configurations are optimized for developer productivity, not security
- **Local networks** - Keep devcontainer services on local networks, don't expose to internet
- **Update regularly** - Keep base images and overlays up to date
- **Audit dependencies** - Be aware of what's installed in your devcontainer

See individual overlay READMEs (especially [docker-sock](overlays/docker-sock/README.md)) for specific security considerations.

### Safe Upgrade and Regeneration

Every devcontainer generation creates a `superposition.json` manifest file that records your configuration choices. This manifest is the key to safe updates and iterations.

**Why the manifest exists:**

- **🔄 Reproducibility** - Recreate exact same configuration on any machine
- **⬆️ Upgrades** - Pull latest overlay improvements without starting from scratch
- **🧪 Experimentation** - Try different configurations with automatic backup
- **👥 Team Sharing** - Commit the manifest for consistent team environments

**When to regenerate (regen) vs manual edit:**

| Scenario                           | Use                    | Why                                          |
| ---------------------------------- | ---------------------- | -------------------------------------------- |
| Update to latest overlay versions  | `regen`                | Get bug fixes and improvements automatically |
| Add/remove overlays                | `init --from-manifest` | Let the tool handle merge complexity         |
| Change port offset                 | `init --from-manifest` | Automatic port recalculation                 |
| Tweak VS Code settings             | Manual edit            | Simple JSON change, no regeneration needed   |
| Add custom script                  | Manual edit            | Direct file addition                         |
| Fix specific devcontainer bug      | Manual edit            | Quick fix without full regeneration          |
| Switch base image                  | `init --from-manifest` | Template dependencies may change             |
| Your project evolved significantly | `init` (fresh)         | Clean slate with new requirements            |

**Quick regeneration (recommended):**

```bash
# Simple regen command - automatically finds manifest in .devcontainer/ or project root
npx container-superposition regen

# Creates backup and regenerates with exact same settings from manifest
# Perfect for updating to latest overlay versions
```

**Update to latest version and regenerate:**

```bash
# Update the tool and regenerate in one go
npx container-superposition@latest regen

# Or update globally first
npm update -g container-superposition
container-superposition regen
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

## 📂 Filesystem Contract

Understanding what Container Superposition writes and where helps you manage your devcontainer configuration effectively.

### What Gets Written Where

**Generated by the tool:**

```
your-project/
├── .devcontainer/               # Main devcontainer directory
│   ├── devcontainer.json        # Container configuration
│   ├── docker-compose.yml       # Services (if using compose stack)
│   ├── .env.example             # Environment variable templates
│   ├── ports.json               # Port documentation and connection strings
│   ├── scripts/                 # Setup and verification scripts
│   │   ├── post-create.sh       # Runs once when container is created
│   │   └── post-start.sh        # Runs every time container starts
│   └── custom/                  # Your customizations (preserved across regen)
│       ├── devcontainer.patch.json
│       └── docker-compose.patch.yml
├── superposition.json           # Manifest file (enables regeneration)
└── .devcontainer.backup-*/      # Automatic backups (gitignored)
```

### Files You Should Customize

**After generation:**

- **`.env`** - Copy from `.env.example`, add your actual values
- **`.devcontainer/custom/`** - Add your project-specific patches here

**Direct edits (survive regeneration):**

- `.devcontainer/custom/devcontainer.patch.json` - Extra devcontainer settings
- `.devcontainer/custom/docker-compose.patch.yml` - Additional services
- `.devcontainer/custom/environment.env` - Extra environment variables
- `.devcontainer/custom/scripts/*` - Custom setup scripts

**Direct edits (lost on regeneration):**

- `.devcontainer/devcontainer.json` - Regenerated from overlays
- `.devcontainer/docker-compose.yml` - Regenerated from overlays
- `.devcontainer/scripts/` - Regenerated from overlays

### Files You Should Commit

**Essential for team collaboration:**

- ✅ `superposition.json` - Enables `regen` command
- ✅ `.devcontainer/` - The generated configuration (team shares setup)
- ✅ `.env.example` - Template for environment variables
- ✅ `.devcontainer/custom/` - Your project-specific customizations

**Only for certain workflows:**

- ⚠️ `superposition.json` only - See [Team Workflow](docs/team-workflow.md) for manifest-only pattern

### Files in .gitignore

**Automatically added to your `.gitignore`:**

```gitignore
# Environment secrets (never commit)
.env
.devcontainer/.env

# Regeneration backups (local only)
.devcontainer.backup-*
```

### Workflow Examples

**Individual developer:**

```bash
# 1. Generate devcontainer
npx container-superposition init --preset web-api --language nodejs

# 2. Customize .env from template
cp .devcontainer/.env.example .devcontainer/.env
# Edit .env with your values

# 3. Add project-specific customization
mkdir -p .devcontainer/custom
echo '{"customizations": {"vscode": {"extensions": ["eamodio.gitlens"]}}}' > .devcontainer/custom/devcontainer.patch.json

# 4. Commit everything except .env
git add .devcontainer/ superposition.json
git commit -m "Add devcontainer configuration"
```

**Team collaboration:**

```bash
# Developer 1: Create and commit
npx container-superposition init --preset web-api --language nodejs
git add superposition.json .devcontainer/
git commit -m "Add devcontainer"

# Developer 2: Clone and use
git clone repo
code .
# VS Code: "Reopen in Container"
cp .devcontainer/.env.example .devcontainer/.env
# Customize .env with your values

# Developer 1: Update to add Redis
npx container-superposition init --from-manifest superposition.json
# Add redis in questionnaire
git add superposition.json .devcontainer/
git commit -m "Add Redis to devcontainer"

# Developer 2: Pull and regenerate
git pull
npx container-superposition regen
# VS Code: "Rebuild Container"
```

See **[Team Workflow Guide](docs/team-workflow.md)** for manifest-only workflow and CI integration.

## 📚 Examples

Real-world reference configurations to help you get started quickly.

### [Web API (Node.js)](examples/web-api-node/)

Full-stack web API with complete observability:

- **Stack**: Node.js + PostgreSQL + Redis
- **Observability**: OpenTelemetry Collector + Prometheus + Grafana + Loki
- **Use case**: Production-ready web API development

```bash
cd examples/web-api-node
code .
# Reopen in Container
```

### [.NET Microservice](examples/dotnet-service/)

Microservice with distributed tracing and monitoring:

- **Stack**: .NET + PostgreSQL
- **Observability**: OpenTelemetry Collector + Jaeger + Prometheus
- **Use case**: Microservice development with full observability

```bash
cd examples/dotnet-service
code .
# Reopen in Container
```

Each example includes:

- ✅ Fully configured `.devcontainer/` ready to use
- ✅ `superposition.json` manifest for regeneration
- ✅ Complete documentation on services and ports
- ✅ Instructions for extending and customizing

**Want to create your own?** Use the examples as templates or generate fresh with:

```bash
npx container-superposition init --stack compose --language nodejs --database postgres
```

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

### Team Collaboration Workflow

**Use Case:** Standardize dev environments across a team while allowing personal customizations.

Container Superposition supports a **manifest-first workflow** where:

- **Manifest** (`superposition.json`) is committed to version control
- **.devcontainer/** is generated locally and gitignored
- **Custom patches** (`.devcontainer/custom/`) can be committed for shared customizations

#### Quick Setup

**1. Team lead creates the manifest:**

```bash
# Generate manifest only (no .devcontainer/ files)
npx container-superposition init --write-manifest-only \
  --stack compose \
  --language nodejs \
  --database postgres,redis

# Commit to repo
git add superposition.json .gitignore
git commit -m "Add team devcontainer manifest"
```

**2. Add to `.gitignore`:**

```gitignore
# DevContainer - generated locally
.devcontainer/

# Except custom directory (personal/shared customizations)
!.devcontainer/custom/
```

**3. Team members clone and generate:**

```bash
git clone <repo>
cd <repo>

# Generate .devcontainer/ from manifest
npx container-superposition regen

# Open in VS Code and rebuild container
code .
```

**4. Personal customizations (optional):**

```bash
# Add personal VS Code extensions, themes, etc.
mkdir -p .devcontainer/custom
cat > .devcontainer/custom/devcontainer.patch.json << 'EOF'
{
  "customizations": {
    "vscode": {
      "extensions": ["eamodio.gitlens"],
      "settings": {
        "editor.fontSize": 14
      }
    }
  }
}
EOF

# Regenerate to apply
npx container-superposition regen
```

**Benefits:**

- ✅ One command onboarding for new developers
- ✅ No lock-in - generated files are plain JSON/YAML
- ✅ Personal customizations don't conflict with team standard
- ✅ CI can validate manifest without committing generated files

See **[Team Workflow Guide](docs/team-workflow.md)** for complete documentation, CI examples, and troubleshooting.

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
