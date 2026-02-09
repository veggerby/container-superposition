# Container Superposition Init Tool

A **humble, purpose-driven devcontainer picker** that helps you bootstrap your first `.devcontainer/` setup without the pain of choosing between too many options.

## Philosophy

This tool is designed to:

- ✅ **Reduce choice paralysis** with guided questions (5–8 max)
- ✅ **Output boring, editable `.devcontainer/` folders** — not proprietary formats
- ✅ **Stay humble** — generate once, then get out of your way
- ✅ **Compose solution-ready templates** with lightweight overlays
- ✅ **Provide battle-tested defaults** — opinionated choices that work in production
- ❌ **NOT** become a framework you have to learn
- ❌ **NOT** require the tool for manual edits or updates
- ❌ **NOT** generate mysterious black-box configurations

### Opinionated Defaults

We make deliberate choices about base images, tool versions, and configurations based on real-world usage:

- **Default Base Image**: Debian Bookworm (`mcr.microsoft.com/devcontainers/base:bookworm`)
    - Stable, well-maintained, broad compatibility
    - Microsoft's recommended base for general development
    - Regular security updates and long-term support

- **Why Opinionated?**
    - Reduces decision fatigue for common use cases
    - Configurations have been validated in production environments
    - Predictable behavior across teams and projects

- **Customization Available**
    - Select alternative base images (Trixie for newer packages)
    - Provide custom images (⚠️ may conflict with overlays)
    - All generated files are editable post-generation

## Quick Start

### Interactive Mode (Recommended for First-Time Users)

```bash
npm run init
```

You'll be greeted with a beautiful, color-coded interface that guides you through:

1. **Base Template**: plain (simple image) or compose (docker-compose based)
2. **Base Image**: Debian Bookworm (recommended), Trixie, or custom
3. **Overlays**: Single categorized multi-select with:
    - **Languages**: .NET, Node.js, Python, MkDocs
    - **Databases**: PostgreSQL, Redis
    - **Observability**: OpenTelemetry Collector, Jaeger, Prometheus, Grafana, Loki
    - **Cloud Tools**: AWS CLI, Azure CLI, kubectl/helm
    - **Dev Tools**: docker-in-docker, docker-sock, Playwright, Codex
4. **Output Path**: Where to write the configuration (default: `./.devcontainer`)
5. **Port Offset**: Optional offset for running multiple instances

The tool features:

- 🎨 Color-coded prompts with chalk
- 📦 Beautiful boxed headers with boxen
- ⏳ Progress spinners with ora
- ✅ Visual confirmation of selections
- 🎯 Clear configuration summary before generation
- 🔗 Automatic dependency resolution (required overlays auto-selected)
- ⚠️ Conflict detection and resolution (e.g., docker-in-docker ↔ docker-sock)
- 🎚️ Port offset support for running multiple instances

### Non-Interactive Mode (For Automation)

```bash
npm run init -- --stack compose --language dotnet --database postgres
npm run init -- --stack plain --language nodejs --playwright --cloud-tools azure-cli,kubectl-helm
npm run init -- --stack compose --language nodejs --database postgres+redis --output ./my-project/.devcontainer
```

### Via npx (Once Published)

```bash
npx container-superposition init
```

## Enhanced User Experience

The tool provides a polished CLI experience using:

- **chalk** - Color-coded output for better readability
- **boxen** - Beautiful bordered boxes for headers and summaries
- **ora** - Elegant spinners during file operations
- **commander** - Robust argument parsing with built-in help

This makes the questionnaire more engaging and the output easier to scan.

## CLI Options

| Option                   | Description                                                                                                                                                           | Example                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `--stack <name>`         | Base template: `plain`, `compose`                                                                                                                                     | `--stack compose`                           |
| `--language <name>`      | Language/framework: `dotnet`, `nodejs`, `python`, `mkdocs`                                                                                                            | `--language dotnet`                         |
| `--database <type>`      | Database: `postgres`, `redis`, `mongodb`, `mysql`, `sqlserver`, `sqlite`, `minio`                                                                                     | `--database postgres`                       |
| `--observability <list>` | Observability tools: `otel-collector`, `jaeger`, `prometheus`, `grafana`, `loki`                                                                                      | `--observability jaeger,prometheus,grafana` |
| `--playwright`           | Include Playwright browser automation                                                                                                                                 | `--playwright`                              |
| `--cloud-tools <list>`   | Cloud tools: `aws-cli`, `azure-cli`, `gcloud`, `kubectl-helm`, `terraform`, `pulumi`                                                                                  | `--cloud-tools aws-cli,kubectl-helm`        |
| `--dev-tools <list>`     | Development tools: `docker-in-docker`, `docker-sock`, `playwright`, `codex`, `git-helpers`, `pre-commit`, `commitlint`, `just`, `direnv`, `modern-cli-tools`, `ngrok` | `--dev-tools docker-in-docker,playwright`   |
| `--port-offset <number>` | Add offset to all exposed ports (e.g., 100 makes Grafana 3100)                                                                                                        | `--port-offset 100`                         |
| `-o`, `--output <path>`  | Output directory (default: `./.devcontainer`)                                                                                                                         | `-o ./custom-path`                          |
| `-h`, `--help`           | Show help                                                                                                                                                             | `--help`                                    |

## What It Does

1. **Selects** the appropriate base template from `templates/`
2. **Composes** additional capabilities using overlays from `overlays/`
3. **Merges** features, environment variables, ports, and scripts
4. **Writes** a normal `.devcontainer/` folder you can edit directly
5. **Steps aside** — you own the output, not the tool

## Output Structure

After running the tool, you'll have:

```
.devcontainer/
├── devcontainer.json                  # Main configuration (editable!)
├── docker-compose.yml                 # Base compose file (if using compose template)
├── .env.example                       # Environment variables from selected overlays
├── scripts/
│   └── post_create.sh                 # Post-creation scripts
├── docker-compose.postgres.yml        # (if postgres selected)
├── docker-compose.redis.yml           # (if redis selected)
├── docker-compose.otel-collector.yml  # (if otel-collector selected)
├── docker-compose.jaeger.yml          # (if jaeger selected)
├── docker-compose.prometheus.yml      # (if prometheus selected)
├── docker-compose.grafana.yml         # (if grafana selected)
├── docker-compose.loki.yml            # (if loki selected)
├── otel-collector-config.yaml         # (if otel-collector selected)
├── prometheus.yml                     # (if prometheus selected)
├── grafana-datasources.yml            # (if grafana selected)
└── loki-config.yaml                   # (if loki selected)
```

All `.env.example` files from selected overlays are automatically merged into a single file with all relevant environment variables.

## Available Templates

- **dotnet**: .NET 10 with C# Dev Kit, testing, and build tools
- **node-typescript**: Node.js LTS with TypeScript, ESLint, and Prettier
- **python-mkdocs**: Python 3 with MkDocs, Poetry, and documentation tools
- **fullstack**: Polyglot setup with Node.js + Python + tooling

## Available Overlays

Overlays add specific capabilities to your base template:

**Language & Framework:**

- **dotnet**: .NET 10 SDK with C# DevKit
- **nodejs**: Node.js LTS with TypeScript and tooling
- **python**: Python 3 with pip and development tools
- **mkdocs**: MkDocs documentation framework

**Databases:**

- **postgres**: PostgreSQL 16 + client tools
- **redis**: Redis 7 + redis-tools

**Observability:**

- **otel-collector**: OpenTelemetry Collector for trace/metric collection
- **jaeger**: Distributed tracing UI and storage
- **prometheus**: Metrics collection and alerting
- **grafana**: Visualization and dashboards (requires prometheus)
- **loki**: Log aggregation and querying

**Cloud Tools:**

- **aws-cli**: AWS command-line tools
- **azure-cli**: Azure command-line tools
- **kubectl-helm**: Kubernetes kubectl and Helm

**Dev Tools:**

- **docker-in-docker**: Docker daemon inside container (conflicts with docker-sock)
- **docker-sock**: Docker socket mounting (conflicts with docker-in-docker)
- **playwright**: Browser automation with Chromium
- **codex**: AI-powered code assistant
- **kubectl-helm**: Kubernetes CLI + Helm

## How Overlays Work

Each overlay is a composable package that can include:

```
overlays/postgres/
├── devcontainer.patch.json    # Features, env vars, ports (merged into devcontainer.json)
├── docker-compose.yml         # Service definition (copied as docker-compose.{overlay}.yml)
├── .env.example               # Environment variables (merged into combined .env.example)
└── [additional files]         # Config files, scripts, directories (copied as-is)
```

The tool intelligently handles each file type:

- **devcontainer.patch.json** - Deep-merged into devcontainer.json (arrays concatenated, objects merged)
- **docker-compose.yml** - Copied as `docker-compose.{overlay}.yml` and referenced in devcontainer.json
- **.env.example** - Content merged into combined `.env.example` in output
- **Other files/directories** - Copied as-is to output (e.g., `otel-collector.yml`, `config/redis.conf`)

This allows overlays to provide complete, self-contained configurations including any necessary config files.

## Guardrails

To prevent "tool rot" and stay humble:

1. **Never required for manual use** — templates remain first-class citizens
2. **One-command install** from a fresh clone: `npm run init`
3. **Output is editable** — not tied to the tool after generation
4. **No "update" command** — default is "generate once, edit forever"
5. **No DSL or custom schemas** — just plain JSON you already know

## Development

```bash
# Install dependencies
npm install

# Run the tool in dev mode (with tsx)
npm run init

# Build TypeScript to dist/
npm run build

# Run built version
npm run init:build

# Clean build artifacts
npm run clean
```

## Documentation

Complete documentation is available in the [/docs](../docs/) folder:

- **[Documentation Index](../docs/README.md)** - Complete documentation overview
- **[Publishing Guide](../docs/publishing.md)** - How to publish to npm
- **[Architecture](../docs/architecture.md)** - Design principles, composition algorithm, deep merge logic
- **[Dependencies](../docs/dependencies.md)** - Service dependencies, startup order, runServices configuration
- **[Creating Overlays](../docs/creating-overlays.md)** - Complete guide to creating new overlays
- **[UX Design](../docs/ux.md)** - Visual design, CLI enhancements, accessibility
- **[Examples](../docs/examples.md)** - Common usage patterns, observability stacks, customization
- **[Quick Reference](../docs/quick-reference.md)** - Quick lookup for templates, overlays, ports, commands

## Contributing

Want to add a new overlay or template?

1. **Template**: Add to `templates/<name>/.devcontainer/`
2. **Overlay**: Add to `overlays/<name>/`
    - Required: `devcontainer.patch.json`
    - Optional: `docker-compose.yml` for services
    - Optional: `.env.example` for environment variables
    - Optional: Any additional config files or directories
3. **Update questionnaire**: Edit `scripts/init.ts` to offer the new option
4. **Test**: Run `npm run init` and verify the output

All files in an overlay directory (except `devcontainer.patch.json` and `.env.example`) will be copied to the output. This allows you to include configuration files like `otel-collector.yml`, config directories, or any other files your overlay needs.

## Philosophy in Practice

This tool embodies the **container-superposition** principle:

> **Build a thin picker that outputs normal configurations, not a platform.**

If you find yourself tempted to add:

- A "sync" or "update" command → **Don't**. Output should be forkable.
- A custom DSL → **Don't**. Use standard JSON.
- Required preprocessing → **Don't**. Output should work standalone.
- Framework lock-in → **Don't**. Users should be able to delete this tool after using it.

## License

MIT
