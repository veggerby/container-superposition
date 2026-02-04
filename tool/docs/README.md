# Tool Documentation

Technical documentation for the container-superposition init tool.

## Overview

The init tool is a command-line utility that generates devcontainer configurations by composing base templates with feature overlays.

## Core Concepts

### Base Templates

Located in `templates/`, each provides a minimal foundation:
- **plain** - Simple image-based devcontainer
- **compose** - Docker Compose-based for multi-service environments

### Overlays

Located in `tool/overlays/`, organized by category:

**Language/Framework:**
- **dotnet** - .NET 10 SDK
- **nodejs** - Node.js LTS with TypeScript
- **python** - Python 3.12
- **mkdocs** - Python with MkDocs

**Databases:**
- **postgres** - PostgreSQL
- **redis** - Redis cache

**Observability:**
- **otel-collector** - OpenTelemetry Collector
- **jaeger** - Distributed tracing
- **prometheus** - Metrics collection
- **grafana** - Visualization
- **loki** - Log aggregation

**Cloud/DevOps:**
- **aws-cli** - AWS tools
- **azure-cli** - Azure tools
- **kubectl-helm** - Kubernetes tools

**Development:**
- **playwright** - Browser automation

### Composition

The tool uses deep merge to combine base templates with selected overlays, producing standard `devcontainer.json` files.

## Documentation Files

- **[quick-reference.md](quick-reference.md)** - Quick lookup for templates, overlays, ports, commands
- **[architecture.md](architecture.md)** - Design principles, composition algorithm, deep merge logic
- **[dependencies.md](dependencies.md)** - Service dependencies, startup order, runServices configuration
- **[creating-overlays.md](creating-overlays.md)** - Complete guide to creating new overlays
- **[ux.md](ux.md)** - Visual design, CLI enhancements, accessibility
- **[examples.md](examples.md)** - Common usage patterns, observability stacks, customization

## Quick Reference

### Interactive Mode
```bash
npm run init
```

### Non-Interactive Mode
```bash
npm run init -- --stack <name> [options]
```

### Options
- `--stack` - Base template
- `--db` - Database (postgres, redis, postgres+redis, none)
- `--postgres` / `--redis` - Shorthand database options
- `--dev-tools <list>` - Development tools: docker-in-docker, docker-sock, playwright, codex
- `--cloud-tools` - Cloud tools (azure-cli, kubectl-helm)
- `--docker` / `--dind` - Docker-in-Docker
- `-o` / `--output` - Output path
- `--help` - Show help
- `--version` - Show version

## Output

Generates `.devcontainer/` folder with:
- `devcontainer.json` - Merged configuration
- `scripts/` - Setup scripts from template
- `docker-compose.*.yml` - Service definitions (if applicable)

## Port Configuration

The tool automatically configures port forwarding and attributes:

### Base Template Ports
- **dotnet**: 5000 (HTTP), 5001 (HTTPS), 8080 (Web App)
- Ports include labels and auto-forward behavior

### Overlay Ports
- **postgres**: 5432 (PostgreSQL)
- **redis**: 6379 (Redis)
- Overlays add labeled ports with notifications

### portsAttributes

Each forwarded port includes:
- `label` - Human-readable port description
- `onAutoForward` - Behavior (notify, openBrowser, silent)

Example:
```json
{
  "forwardPorts": [5000, 5432],
  "portsAttributes": {
    "5000": {
      "label": "HTTP",
      "onAutoForward": "notify"
    },
    "5432": {
      "label": "PostgreSQL",
      "onAutoForward": "notify"
    }
  }
}
```

## Philosophy

### Humble Tool
- Generates once, users edit forever
- No update or sync mechanisms
- No state tracking
- No proprietary formats

### Stateless
- Each invocation is independent
- Output is deterministic
- No configuration files

### Optional
- Templates work without the tool
- Manual copying is always an option
- Tool is convenience wrapper

## Technology

- **Node.js/TypeScript** - Cross-platform, type-safe
- **chalk** - Terminal colors
- **boxen** - Terminal boxes
- **ora** - Progress spinners
- **commander** - CLI parsing

## Extension

### Add an Overlay
1. Create `tool/overlays/<name>/`
2. Add `devcontainer.patch.json`
3. Optional: Add `docker-compose.yml`
4. Update questionnaire

### Add a Template
1. Create `templates/<name>/.devcontainer/`
2. Add complete devcontainer.json
3. Add scripts and files
4. Update types and questionnaire

## Maintenance

### Smoke Tests
```bash
npm test
```

### Build
```bash
npm run build
```

### Development
```bash
npm run init
```

Uses `tsx` for direct TypeScript execution without build step.
