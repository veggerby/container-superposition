# Discovery and Planning Commands

Container Superposition provides powerful commands to explore available overlays and preview what will be generated before creating a devcontainer.

## Overview

- **`list`** - Discover available overlays with filtering
- **`explain`** - Deep dive into a specific overlay
- **`plan`** - Preview the generation plan before creating

All commands support `--json` output for scripting and automation.

## List Command

The `list` command displays all available overlays, optionally filtered by category, tags, or stack support.

### Basic Usage

```bash
# List all overlays grouped by category
npx container-superposition list
```

**Output:**

```
╭─────────────────────╮
│ Available Overlays  │
╰─────────────────────╯

📚 Language & Framework
  dotnet               .NET 10 SDK with C# DevKit
  nodejs               Node.js LTS with TypeScript and tooling
  python               Python 3.12 with linting and formatting
  ...

🗄️  Database & Messaging
  postgres             PostgreSQL 16 database
  redis                Redis 7 cache
  mongodb              MongoDB 8 with Mongo Express web UI
  ...
```

### Filtering Options

#### Filter by Category

```bash
# Show only language overlays
npx container-superposition list --category language

# Show only database overlays
npx container-superposition list --category database

# Available categories: language, database, observability, cloud, dev, preset
```

**Output format:** When filtering, output switches to table format showing ID, NAME, CATEGORY, PORTS, and REQUIRES columns.

#### Filter by Tags

```bash
# Show overlays tagged with 'observability'
npx container-superposition list --tags observability

# Multiple tags (OR logic - matches any)
npx container-superposition list --tags observability,tracing
```

#### Filter by Stack Support

```bash
# Show overlays that work with compose stack
npx container-superposition list --supports compose

# Show overlays that work with plain stack
npx container-superposition list --supports plain
```

**Note:** Overlays with empty `supports` array work with all stacks and will be included in any stack filter.

### JSON Output

```bash
# Export as JSON for scripting
npx container-superposition list --json

# Combine with filters
npx container-superposition list --category database --json
```

**Example output:**

```json
[
  {
    "id": "postgres",
    "name": "PostgreSQL",
    "description": "PostgreSQL 16 database",
    "category": "database",
    "supports": ["compose"],
    "requires": [],
    "suggests": [],
    "conflicts": [],
    "tags": ["database", "sql", "postgres"],
    "ports": [5432]
  }
]
```

## Explain Command

The `explain` command provides detailed information about a specific overlay, including files, patches, dependencies, and configuration.

### Basic Usage

```bash
# Explain the postgres overlay
npx container-superposition explain postgres
```

**Output:**

```
╭────────────────────────╮
│ PostgreSQL (postgres)  │
╰────────────────────────╯

Description:
  PostgreSQL 16 database

Category: database
Tags: database, sql, postgres

Stack Compatibility:
  ✓ compose

Dependencies:
  No required dependencies

Ports Exposed:
  5432

Files:
  📄 README.md
  📄 devcontainer.patch.json
  📄 docker-compose.yml
  📄 overlay.yml
  📄 verify.sh

DevContainer Configuration:
  Features:
    • ghcr.io/robbert229/devcontainer-features/postgresql-client:1
  Port Forwarding:
    • 5432 (PostgreSQL)
  Environment Variables:
    • POSTGRES_HOST=postgres
    • POSTGRES_PORT=5432
    • POSTGRES_DB=devdb

Docker Compose Services:
  🐳 postgres
```

### What's Included

The `explain` command shows:

1. **Basic Information** - Name, description, category, tags
2. **Stack Compatibility** - Which base templates it works with
3. **Dependencies** - Required, suggested, and conflicting overlays
4. **Ports** - All exposed ports
5. **Files** - All files in the overlay directory
6. **DevContainer Patches** - Features, extensions, port forwarding, environment variables
7. **Docker Compose Services** - Services that will be added (for compose overlays)

### JSON Output

```bash
# Get overlay details as JSON
npx container-superposition explain nodejs --json
```

**Example output:**

```json
{
  "id": "nodejs",
  "name": "Node.js",
  "description": "Node.js LTS with TypeScript and tooling",
  "category": "language",
  "supports": [],
  "requires": [],
  "suggests": [],
  "conflicts": [],
  "tags": ["language", "nodejs", "javascript", "typescript"],
  "ports": [],
  "files": [
    "README.md",
    "devcontainer.patch.json",
    "global-packages.txt",
    "overlay.yml",
    "setup.sh",
    "verify.sh"
  ],
  "devcontainerPatch": {
    "features": {
      "ghcr.io/devcontainers/features/node:1": {
        "version": "lts"
      }
    }
  }
}
```

## Plan Command

The `plan` command shows a dry-run preview of what will be generated, including dependency resolution, port mappings, and conflict detection.

### Basic Usage

```bash
# Preview generation for postgres and grafana
npx container-superposition plan --stack compose --overlays postgres,grafana
```

**Output:**

```
╭──────────────────╮
│ Generation Plan  │
╰──────────────────╯

Stack: compose

Overlays Selected:
  ✓ postgres (PostgreSQL)
  ✓ grafana (Grafana)

Auto-Added Dependencies:
  + prometheus (Prometheus)

Port Mappings:
  postgres: 5432
  grafana: 3000
  prometheus: 9090

Files to Create/Modify:
  .devcontainer/
    📄 devcontainer.json
    📄 superposition.json
    📄 docker-compose.yml
    📄 .env.example
    📄 README.md
    📄 verify.sh

✓ No conflicts detected. Ready to generate!
  Run: container-superposition init --stack compose --overlays postgres,grafana
```

### Required Options

- `--stack <type>` - Base template: `plain` or `compose`
- `--overlays <list>` - Comma-separated list of overlay IDs

### Optional Options

- `--port-offset <number>` - Add offset to all exposed ports
- `--json` - Output as JSON

### Port Offset Example

```bash
# Add 100 to all ports to avoid conflicts
npx container-superposition plan --stack compose --overlays postgres,redis --port-offset 100
```

**Output:**

```
Port Mappings:
  (Offset: +100)
  postgres: 5432 → 5532
  redis: 6379 → 6479
```

### Dependency Resolution

The `plan` command automatically resolves dependencies:

```bash
# Grafana requires Prometheus
npx container-superposition plan --stack compose --overlays grafana
```

**Output:**

```
Overlays Selected:
  ✓ grafana (Grafana)

Auto-Added Dependencies:
  + prometheus (Prometheus)
```

### Conflict Detection

The `plan` command detects conflicts before generation:

```bash
# docker-in-docker and docker-sock conflict
npx container-superposition plan --stack compose --overlays docker-in-docker,docker-sock
```

**Output:**

```
⚠ Conflicts Detected:
  ✗ docker-in-docker conflicts with: docker-sock
  ✗ docker-sock conflicts with: docker-in-docker

  These conflicts must be resolved before generation.

⚠ Cannot proceed with generation due to conflicts. Remove conflicting overlays.
```

### JSON Output

```bash
# Get plan as JSON
npx container-superposition plan --stack compose --overlays postgres --json
```

**Example output:**

```json
{
  "stack": "compose",
  "selectedOverlays": ["postgres"],
  "autoAddedOverlays": [],
  "conflicts": [],
  "portMappings": [
    {
      "overlay": "postgres",
      "ports": [5432],
      "offsetPorts": [5432]
    }
  ],
  "files": [
    ".devcontainer/devcontainer.json",
    ".devcontainer/superposition.json",
    ".devcontainer/docker-compose.yml",
    ".devcontainer/.env.example",
    ".devcontainer/README.md"
  ],
  "portOffset": 0
}
```

## Scripting Examples

### Export All Overlays to JSON

```bash
# Get all overlay metadata
npx container-superposition list --json > overlays.json

# Filter and process with jq
npx container-superposition list --category database --json | jq '.[].id'
```

### Validate Overlay Configuration

```bash
# Check if overlay exists and get its details
npx container-superposition explain postgres --json | jq '.id, .category, .ports'
```

### Pre-validate Before Generation

```bash
#!/bin/bash

# Plan first, then generate only if no conflicts
PLAN=$(npx container-superposition plan --stack compose --overlays $OVERLAYS --json)

if echo "$PLAN" | jq -e '.conflicts | length == 0' > /dev/null; then
  echo "✓ No conflicts, proceeding with generation..."
  npx container-superposition init --stack compose --overlays $OVERLAYS
else
  echo "✗ Conflicts detected, aborting"
  exit 1
fi
```

## Workflow Examples

### Discovering Observability Tools

```bash
# 1. Find all observability overlays
npx container-superposition list --tags observability

# 2. Explore Grafana in detail
npx container-superposition explain grafana

# 3. Plan the full observability stack
npx container-superposition plan --stack compose --overlays grafana,loki,tempo

# 4. Generate if plan looks good
npx container-superposition init --stack compose --overlays grafana,loki,tempo
```

### Building a Microservice Stack

```bash
# 1. List available messaging options
npx container-superposition list --tags messaging

# 2. Compare RabbitMQ vs Redpanda
npx container-superposition explain rabbitmq
npx container-superposition explain redpanda

# 3. Plan the stack with dependencies
npx container-superposition plan --stack compose --overlays nodejs,rabbitmq,jaeger

# 4. Review auto-added dependencies and generate
npx container-superposition init --stack compose --overlays nodejs,rabbitmq,jaeger
```

## Benefits

- **Visibility** - Know what's available without reading docs
- **Predictability** - See exactly what will be created before generation
- **Confidence** - Catch conflicts and dependency issues early
- **Automation** - JSON output enables scripting and CI/CD integration
- **Learning** - Understand overlay structure and composition
