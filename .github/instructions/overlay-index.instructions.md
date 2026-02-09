---
applyTo: 'overlays/**/overlay.yml'
---

# GitHub Copilot Instructions: Overlay Manifest (overlay.yml) Authoring

This file provides instructions for GitHub Copilot when creating or modifying individual `overlay.yml` manifest files in overlay directories.

## Purpose

Each overlay's `overlay.yml` file is the single source of truth for:

- **Overlay identity** - Unique ID, name, and description
- **Category** - Which group the overlay belongs to (language, database, etc.)
- **Dependencies** - Required, suggested, and conflicting overlays
- **Stack compatibility** - Which base templates support this overlay
- **Port configuration** - Which ports the overlay uses (for offset calculation)
- **Tags** - Keywords for search and filtering
- **Display order** - Optional ordering within category

## Migration from Central index.yml

**Previous approach:** All overlay metadata was centralized in `overlays/index.yml` (600+ lines).

**New approach:** Each overlay has its own `overlay.yml` manifest file in its directory.

**Benefits:**

- ✅ Everything for an overlay in one place (cohesion)
- ✅ No merge conflicts on central file
- ✅ Overlays are self-contained and portable
- ✅ Easier to maintain (single edit point)
- ✅ No "register in index.yml" step

## File Structure

The index.yml file is organized into sections by overlay category:

```yaml
# Overlay Metadata
# This file defines all available overlays and their properties for the questionnaire

base_images:
    -  # Base container images

base_templates:
    -  # Template types (plain, compose)

language_overlays:
    -  # Programming languages and frameworks

database_overlays:
    -  # Database services

observability_overlays:
    -  # Monitoring, tracing, logging tools

cloud_tool_overlays:
    -  # Cloud provider CLIs and IaC tools

dev_tool_overlays:
    -  # Development utilities
```

## Manifest File Structure

Each overlay's `overlay.yml` follows this structure:

```yaml
id: overlay-id # Required: Unique identifier (matches directory name)
name: Display Name # Required: Human-readable name for UI
description: Brief summary # Required: One-line description (shown in questionnaire)
category: category-name # Required: language|database|observability|cloud|dev
supports: [template-ids] # Required: Empty [] = all, or [plain], [compose]
requires: [overlay-ids] # Required: Empty [] or list of required dependencies
suggests: [overlay-ids] # Required: Empty [] or list of suggested overlays
conflicts: [overlay-ids] # Required: Empty [] or list of conflicting overlays
tags: [tag1, tag2] # Required: Search/filter tags (lowercase)
ports: [8080, 9090] # Required: Empty [] or list of ports used
order: 2 # Optional: Display order within category (lower = first)
```

## Field Definitions

#### id (Required)

**Purpose:** Unique identifier for the overlay.

**Rules:**

- Must match the overlay directory name exactly: `overlays/[id]/`
- Use kebab-case: `my-overlay` not `MyOverlay` or `my_overlay`
- Be descriptive but concise: `nodejs`, `postgres`, `otel-collector`
- Once set, should not be changed (breaks existing configurations)

**Examples:**

```yaml
id: nodejs              # Good: clear, concise
id: postgres            # Good: standard name
id: otel-collector      # Good: hyphenated compound
id: kubectl-helm        # Good: combines two tools

id: node                # Avoid: too generic
id: postgresql-db       # Avoid: redundant suffix
id: Node.js             # Wrong: use lowercase, no special chars
id: node_js             # Wrong: use hyphens not underscores
```

#### name (Required)

**Purpose:** Human-readable display name shown in the questionnaire UI.

**Rules:**

- Use title case: "Node.js" not "node.js"
- Use official product names: "PostgreSQL" not "Postgres" (unless commonly abbreviated)
- Keep concise (1-4 words): "Google Cloud SDK" not "Google Cloud Platform Software Development Kit"
- Use special characters correctly: "kubectl + Helm" (with +), ".NET" (with dot)

**Examples:**

```yaml
name: Node.js                                    # Good
name: PostgreSQL                                 # Good
name: OpenTelemetry Collector                    # Good
name: Google Cloud SDK                           # Good
name: kubectl + Helm                             # Good: combines two tools
name: Docker (host socket)                       # Good: clarifies variant

name: node                                       # Avoid: too informal
name: Node.JS                                    # Wrong: incorrect capitalization
name: PostgreSQL Database Server 16              # Avoid: too verbose
```

#### description (Required)

**Purpose:** One-line summary shown in questionnaire to help users understand what the overlay provides.

**Rules:**

- Keep to one sentence (no period at end)
- Start with what it adds/provides: "PostgreSQL 16 database", "Node.js LTS with TypeScript and tooling"
- Be specific about versions when relevant: "PostgreSQL 16" not just "PostgreSQL"
- Mention key features if space allows: "Modern Infrastructure as Code with TypeScript/Python/Go"
- Don't repeat the name: If name is "Node.js", don't start description with "Node.js is..."

**Examples:**

```yaml
# Good descriptions
description: Node.js LTS with TypeScript and tooling
description: PostgreSQL 16 database
description: Distributed tracing backend
description: Modern Infrastructure as Code with TypeScript/Python/Go
description: Google Cloud Platform command-line tools (gcloud, gsutil, bq)
description: Access host Docker daemon via socket mount (fast, local-only)

# Avoid
description: Adds Node.js to your devcontainer                    # Too generic
description: This overlay provides PostgreSQL database support    # Too wordy
description: PostgreSQL                                           # Not descriptive enough
description: A comprehensive solution for distributed tracing.    # Too marketing-y, has period
```

#### category (Required)

**Purpose:** Group overlays in questionnaire UI and determine application order.

**Valid Values:**

- `language` - Programming languages and frameworks (nodejs, dotnet, python, mkdocs)
- `database` - Database services (postgres, redis)
- `observability` - Monitoring, tracing, logging (otel-collector, jaeger, prometheus, grafana, loki)
- `cloud` - Cloud provider CLIs and IaC (aws-cli, azure-cli, gcloud, kubectl-helm, terraform, pulumi)
- `dev` - Development utilities (docker-in-docker, docker-sock, playwright, git-helpers, pre-commit, just, direnv)

**Application Order:** Overlays are applied in category order:

1. Language overlays
2. Database overlays
3. Observability overlays
4. Cloud tool overlays
5. Dev tool overlays

**Rules:**

- Use exactly one category
- Choose the most specific category
- If overlay fits multiple categories, choose primary purpose:
    - MkDocs → `language` (documentation framework, requires Python)
    - Pre-commit → `dev` (development tool, even though it's Git-related)

**Examples:**

```yaml
category: language        # nodejs, python, dotnet
category: database        # postgres, redis
category: observability   # prometheus, grafana, jaeger
category: cloud          # aws-cli, terraform, pulumi
category: dev            # docker-sock, playwright, pre-commit
```

#### supports (Required)

**Purpose:** Specify which base templates (plain/compose) this overlay works with.

**Values:**

- `[]` (empty array) - Supports all templates (most common)
- `[plain]` - Only works with plain/image-based template
- `[compose]` - Only works with compose template (most database/observability overlays)

**Rules:**

- Use empty array `[]` for overlays that work everywhere (language overlays, CLI tools)
- Use `[compose]` for overlays that require Docker Compose (database services, multi-container tools)
- Use `[plain]` very rarely (only if overlay breaks in compose environments)

**When to use `[compose]`:**

- Overlay includes `docker-compose.yml` file
- Overlay adds a service container (database, monitoring tool)
- Overlay requires network communication between containers

**Examples:**

```yaml
# Language and CLI overlays - work everywhere
supports: []

# Database and service overlays - need compose
supports: [compose]

# Rare case - breaks in compose
supports: [plain]
```

**Compose-only overlays:**

```yaml
- id: postgres
  supports: [compose] # Adds PostgreSQL service

- id: redis
  supports: [compose] # Adds Redis service

- id: jaeger
  supports: [compose] # Adds Jaeger service

- id: grafana
  supports: [compose] # Adds Grafana service
```

**All-template overlays:**

```yaml
- id: nodejs
  supports: [] # Works in plain and compose

- id: aws-cli
  supports: [] # CLI works everywhere

- id: terraform
  supports: [] # IaC tool works everywhere
```

#### requires (Required)

**Purpose:** Define hard dependencies that must be automatically installed when this overlay is selected.

**Values:**

- `[]` (empty array) - No dependencies (most common)
- `[overlay-id, ...]` - List of required overlay IDs

**Rules:**

- Use for **critical dependencies** - overlay won't function without them
- Dependencies are **automatically added** by the questionnaire (shown with "(required)" tag)
- Dependencies are **recursively resolved** (if A requires B, and B requires C, selecting A adds B and C)
- Don't create circular dependencies: A requires B, B requires A (will cause infinite loop)
- Use `suggests` instead of `requires` for optional/recommended overlays

**When to use requires:**

- Overlay extends another: MkDocs requires Python
- Overlay needs specific runtime: Some tools require specific language features
- Overlay configures another: Grafana requires Prometheus (or at least one data source)

**Examples:**

```yaml
# MkDocs requires Python runtime
- id: mkdocs
  requires: [python]

# Grafana requires at least Prometheus as data source
- id: grafana
  requires: [prometheus]

# Most overlays have no hard dependencies
- id: nodejs
  requires: []

- id: postgres
  requires: []
```

**Avoid over-using requires:**

```yaml
# Good: Hard requirement
- id: mkdocs
  requires: [python] # MkDocs is Python-based, won't work without it

# Bad: Soft recommendation
- id: nodejs
  requires: [docker-sock] # Wrong: Node.js works fine without Docker
  suggests: [docker-sock] # Better: Use suggests for optional integration
```

#### suggests (Required)

**Purpose:** Recommend related overlays that work well together, without forcing them.

**Values:**

- `[]` (empty array) - No suggestions
- `[overlay-id, ...]` - List of suggested overlay IDs

**Rules:**

- Use for **optional but beneficial** overlays
- Suggestions are **not automatically added** (user must manually select)
- Use for common combination patterns
- Don't suggest too many (3-5 max to avoid overwhelming users)

**When to use suggests:**

- Overlays that integrate well: OTEL Collector suggests Jaeger and Prometheus
- Common workflow combinations: Pre-commit suggests commitlint
- Complementary tools: Terraform suggests kubectl-helm (for K8s IaC)

**Examples:**

```yaml
# OTEL Collector works well with tracing and metrics backends
- id: otel-collector
  suggests: [jaeger, prometheus]

# Grafana can visualize data from multiple sources
- id: grafana
  suggests: [loki, jaeger] # Prometheus already in requires

# Commit quality tools work well together
- id: pre-commit
  suggests: [commitlint]

- id: commitlint
  suggests: [pre-commit]
```

**Avoid:**

```yaml
# Too many suggestions
- id: nodejs
  suggests: [postgres, redis, mongodb, dynamodb, prometheus, grafana, jaeger]
  # Too overwhelming - stick to most common 2-3

# Obvious/redundant suggestions
- id: nodejs
  suggests: [typescript] # TypeScript already included in nodejs overlay
```

#### conflicts (Required)

**Purpose:** Define overlays that cannot be used together due to incompatibility.

**Values:**

- `[]` (empty array) - No conflicts (most common)
- `[overlay-id, ...]` - List of conflicting overlay IDs

**Rules:**

- **Conflicts are bidirectional** - if A conflicts with B, B must also conflict with A
- Use for **technical incompatibility** - overlays that break when used together
- User must resolve conflicts before proceeding (conflict resolution UI appears)
- Don't use for preferences - only for actual technical conflicts

**When to use conflicts:**

- Mutually exclusive implementations: docker-in-docker vs docker-sock (both provide Docker, different approaches)
- Port conflicts: Two overlays using the same non-configurable port
- Resource conflicts: Two overlays mounting the same file/directory differently

**Examples:**

```yaml
# Docker access - choose one approach
- id: docker-in-docker
  conflicts: [docker-sock]

- id: docker-sock
  conflicts: [docker-in-docker]

# If two overlays conflict, BOTH must declare it
# Both directions required:
# Wrong:
- id: overlay-a
  conflicts: [overlay-b]
- id: overlay-b
  conflicts: [] # Missing reciprocal conflict!

# Correct:
- id: overlay-a
  conflicts: [overlay-b]
- id: overlay-b
  conflicts: [overlay-a] # Bidirectional conflict
```

**Most overlays have no conflicts:**

```yaml
- id: nodejs
  conflicts: []

- id: postgres
  conflicts: []

- id: terraform
  conflicts: []
```

#### tags (Required)

**Purpose:** Keywords for search, filtering, and categorization.

**Values:**

- `[tag1, tag2, ...]` - List of lowercase tag strings
- Minimum 2-3 tags, maximum 6-8 tags

**Rules:**

- **All lowercase:** `nodejs` not `Node.js` or `NodeJS`
- **Include category tag:** Always include the category (`language`, `database`, `observability`, `cloud`, `dev`)
- **Include technology names:** Main technologies (`nodejs`, `postgres`, `kubernetes`, `aws`)
- **Include use cases:** What it's for (`testing`, `monitoring`, `iac`, `cli`)
- **Include related terms:** Acronyms, alternative names (`otel` for OpenTelemetry, `k8s` for Kubernetes)
- **Common patterns:**
    - Category tag (required)
    - Primary technology/product name
    - Technology type (cli, framework, database, etc.)
    - Related technologies or protocols
    - Use case descriptors

**Examples:**

```yaml
# Node.js overlay
tags: [language, nodejs, javascript, typescript]
# - language: category
# - nodejs: primary tech
# - javascript, typescript: related languages

# PostgreSQL overlay
tags: [database, sql, postgres]
# - database: category
# - sql: technology type
# - postgres: product (common abbreviation)

# OpenTelemetry Collector
tags: [observability, telemetry, opentelemetry]
# - observability: category
# - telemetry: use case
# - opentelemetry: product (no abbreviation as it's distinct)

# Terraform overlay
tags: [cloud, iac, terraform, infrastructure]
# - cloud: category
# - iac: acronym for Infrastructure as Code
# - terraform: product name
# - infrastructure: use case

# Git helpers overlay
tags: [dev, git, security, ssh, gpg]
# - dev: category
# - git: primary focus
# - security, ssh, gpg: features provided

# kubectl + Helm overlay
tags: [cloud, kubernetes, helm]
# - cloud: category
# - kubernetes: primary platform
# - helm: secondary tool
```

**Avoid:**

```yaml
tags: [Node.js, TypeScript]              # Wrong: Use lowercase
tags: [nodejs]                           # Too few: Add category and related terms
tags: [language, nodejs, javascript, typescript, npm, pnpm, yarn, webpack, vite, react, vue, angular]
                                         # Too many: Stick to core terms
```

#### ports (Required)

**Purpose:** List ports used by the overlay for port offset calculation.

**Values:**

- `[]` (empty array) - No ports used (most common for CLI tools)
- `[8080, 9090, ...]` - List of integer port numbers

**Rules:**

- **Must match ports in devcontainer.patch.json** `forwardPorts` array
- **Must match ports in docker-compose.yml** (host side of port mappings)
- Include **all** ports the overlay uses (web UIs, APIs, monitoring endpoints)
- **Order doesn't matter** but typically list in ascending order
- Only list **host-accessible** ports (not internal container-only ports)

**When to include ports:**

- Overlay forwards ports in devcontainer.patch.json
- Overlay exposes service ports in docker-compose.yml
- Users need to access the port from their host machine

**Examples:**

```yaml
# Language overlay with dev server
- id: nodejs
  ports: [3000, 8080] # Typical Node.js dev server ports

# MkDocs documentation server
- id: mkdocs
  ports: [8000] # MkDocs serves on 8000

# PostgreSQL database
- id: postgres
  ports: [5432] # Standard PostgreSQL port

# Redis cache
- id: redis
  ports: [6379] # Standard Redis port

# OpenTelemetry Collector (multiple ports)
- id: otel-collector
  ports: [4317, 4318, 8888, 8889]
  # 4317: gRPC receiver
  # 4318: HTTP receiver
  # 8888: Metrics endpoint
  # 8889: Prometheus exporter

# Grafana
- id: grafana
  ports: [3000] # Web UI

# CLI tool with no ports
- id: aws-cli
  ports: [] # CLI only, no ports

- id: terraform
  ports: [] # CLI only, no ports
```

**Port consistency check:**

```yaml
# In index.yml
- id: nodejs
  ports: [3000, 8080]

# Must match devcontainer.patch.json
{
  "forwardPorts": [3000, 8080],  # ✓ Matches
  "portsAttributes": { ... }
}

# Wrong - mismatch
# index.yml: ports: [3000]
# devcontainer.patch.json: forwardPorts: [3000, 8080]  # ✗ Missing 8080 in index.yml
```

#### order (Optional)

**Purpose:** Control display order within a category in the questionnaire UI.

**Values:**

- Integer (1, 2, 3, ...)
- Lower numbers appear first
- Omit field for default ordering (alphabetical by name)

**Rules:**

- Only use when order matters (usually for observability tools with dependencies)
- Don't use for most overlays - alphabetical is fine
- **Observability overlay ordering pattern:**
    - Order 1: Base tools (Jaeger, Prometheus, Loki)
    - Order 2: Collectors (OTEL Collector)
    - Order 3: Visualization (Grafana)

**When to use:**

- Observability overlays (ensure proper dependency order)
- Multi-step workflows where order matters
- Featured/important overlays you want shown first

**Examples:**

```yaml
# Observability overlays with ordering
observability_overlays:
    - id: jaeger
      order: 1 # Base tracing backend (shown first)

    - id: prometheus
      order: 1 # Base metrics backend (shown first)

    - id: loki
      order: 1 # Base logging backend (shown first)

    - id: otel-collector
      order: 2 # Collector depends on backends (shown second)

    - id: grafana
      order: 3 # Visualization depends on data sources (shown last)

# Most overlays don't need order
language_overlays:
    - id: dotnet
      # No order field - alphabetical is fine

    - id: nodejs
      # No order field - alphabetical is fine
```

## Adding a New Overlay to index.yml

**Step-by-step process:**

1. **Determine category:**
    - Language/framework → `language_overlays`
    - Database → `database_overlays`
    - Monitoring/tracing → `observability_overlays`
    - Cloud CLI/IaC → `cloud_tool_overlays`
    - Dev utility → `dev_tool_overlays`

2. **Choose unique ID:**
    - Match overlay directory name
    - Use kebab-case
    - Be descriptive but concise

3. **Write name and description:**
    - Name: Title case, official product name
    - Description: One-line summary, no period

4. **Set category:**
    - Use one of the valid categories

5. **Determine supports:**
    - Empty array `[]` for most overlays
    - `[compose]` if adds Docker Compose service

6. **Define dependencies:**
    - `requires`: Hard dependencies only
    - `suggests`: Optional but useful combinations
    - `conflicts`: Mutual exclusions (remember bidirectional!)

7. **Add tags:**
    - Include category
    - Include technology names
    - Include related terms
    - 3-6 tags total

8. **List ports:**
    - Match devcontainer.patch.json forwardPorts
    - Match docker-compose.yml port mappings
    - Empty array if no ports

9. **Set order (optional):**
    - Only for observability overlays or special cases
    - Omit for alphabetical ordering

10. **Validate YAML syntax:**
    ```bash
    yamllint overlays/index.yml
    ```

## Example: Adding PostgreSQL Overlay

```yaml
database_overlays:
    - id: postgres # Matches overlays/postgres/
      name: PostgreSQL # Official product name
      description: PostgreSQL 16 database # Version-specific
      category: database # Database category
      supports: [compose] # Needs Docker Compose
      requires: [] # No dependencies
      suggests: [] # No specific suggestions
      conflicts: [] # No conflicts
      tags: [database, sql, postgres] # Category + type + product
      ports: [5432] # Standard PostgreSQL port
```

## Example: Adding Node.js Overlay

```yaml
language_overlays:
    - id: nodejs # Matches overlays/nodejs/
      name: Node.js # Official capitalization
      description: Node.js LTS with TypeScript and tooling # Comprehensive summary
      category: language # Language category
      supports: [] # Works in all templates
      requires: [] # No dependencies
      suggests: [] # Could suggest docker-sock but optional
      conflicts: [] # No conflicts
      tags: [language, nodejs, javascript, typescript] # Category + related terms
      ports: [3000, 8080] # Common dev server ports
```

## Example: Adding Grafana Overlay

```yaml
observability_overlays:
    - id: grafana
      name: Grafana
      description: Observability visualization dashboard
      category: observability
      order: 3 # After data sources
      supports: [compose] # Service-based
      requires: [prometheus] # Needs at least one data source
      suggests: [loki, jaeger] # Works well with these too
      conflicts: []
      tags: [observability, ui, visualization]
      ports: [3000] # Web UI port
```

## Example: Adding Docker-in-Docker Overlay

```yaml
dev_tool_overlays:
    - id: docker-in-docker
      name: Docker-in-Docker
      description: Isolated Docker daemon inside container (portable, works in Codespaces)
      category: dev
      supports: [] # Works everywhere
      requires: []
      suggests: []
      conflicts: [docker-sock] # Can't use both Docker methods
      tags: [dev, docker]
      ports: [] # No exposed ports
```

## Creating a New Overlay Manifest

**Step-by-step process:**

1. **Create overlay directory:**

    ```bash
    mkdir -p overlays/my-overlay
    ```

2. **Create overlay.yml manifest:**

    ```yaml
    id: my-overlay
    name: My Overlay
    description: Brief description of what it provides
    category: language # or database, observability, cloud, dev
    supports: []
    requires: []
    suggests: []
    conflicts: []
    tags:
        - category-tag
        - technology-name
        - related-term
    ports: []
    ```

3. **Create other overlay files:**
    - `devcontainer.patch.json` - DevContainer configuration patches
    - `README.md` - Documentation
    - `setup.sh`, `verify.sh`, etc. - As needed

4. **Validate manifest:**
    - ID matches directory name
    - Category is valid (language, database, observability, cloud, dev)
    - All required fields present
    - Ports match devcontainer.patch.json
    - Conflicts are bidirectional
    - Tags are lowercase

5. **Test the overlay:**
    ```bash
    npm run build
    npm run init -- --stack compose --language my-overlay
    ```

**No registration step needed!** The overlay loader automatically discovers overlay.yml files.

## Common Mistakes and How to Avoid Them

### Mistake: Missing Bidirectional Conflicts

**Wrong:**

```yaml
# overlays/docker-in-docker/overlay.yml
id: docker-in-docker
conflicts: [docker-sock]

# overlays/docker-sock/overlay.yml
id: docker-sock
conflicts: []                  # Missing reciprocal!
```

**Correct:**

```yaml
# overlays/docker-in-docker/overlay.yml
id: docker-in-docker
conflicts: [docker-sock]

# overlays/docker-sock/overlay.yml
id: docker-sock
conflicts: [docker-in-docker]  # Both directions
```

### Mistake: ID Doesn't Match Directory

**Wrong:**

```yaml
# Directory: overlays/nodejs/
# overlays/nodejs/overlay.yml
id: node # Doesn't match!
```

**Correct:**

```yaml
# Directory: overlays/nodejs/
# overlays/nodejs/overlay.yml
id: nodejs # Matches directory name
```

### Mistake: Port Mismatch

**Wrong:**

```yaml
# overlays/postgres/overlay.yml
id: postgres
ports: [5432]

# overlays/postgres/docker-compose.yml
ports:
  - "5432:5432"
  - "5433:5433"                  # Not listed in overlay.yml!
```

**Correct:**

```yaml
# overlays/postgres/overlay.yml
id: postgres
ports: [5432, 5433]            # All ports listed

# overlays/postgres/docker-compose.yml
ports:
  - "5432:5432"
  - "5433:5433"
```

### Mistake: Using requires for Optional Dependencies

**Wrong:**

```yaml
id: nodejs
requires: [docker-sock, postgres] # Too heavy-handed
```

**Correct:**

```yaml
id: nodejs
requires: [] # Only hard dependencies
suggests: [docker-sock] # Optional integrations in suggests
```

### Mistake: Wrong Category

**Wrong:**

```yaml
id: mkdocs
category: dev # Documentation tool, but...
```

**Correct:**

```yaml
id: mkdocs
category: language # It's a Python-based framework
requires: [python]
```

### Mistake: Uppercase Tags

**Wrong:**

```yaml
tags: [Language, Node.js, TypeScript]
```

**Correct:**

```yaml
tags: [language, nodejs, typescript]
```

## Testing and Validation

After creating or modifying an overlay.yml manifest:

1. **YAML Syntax:**

    ```bash
    yamllint overlays/[overlay-id]/overlay.yml
    ```

2. **Overlay Directory Structure:**

    ```bash
    # Ensure all required files exist
    ls overlays/[overlay-id]/
    # Should show: overlay.yml, devcontainer.patch.json, README.md (minimum)
    ```

3. **Port Consistency:**

    ```bash
    # Check ports in overlay.yml match devcontainer.patch.json
    cat overlays/[overlay-id]/devcontainer.patch.json | jq .forwardPorts
    ```

4. **Bidirectional Conflicts:**

    ```bash
    # If overlay A conflicts with B, ensure B conflicts with A
    cat overlays/docker-in-docker/overlay.yml | grep conflicts
    cat overlays/docker-sock/overlay.yml | grep conflicts
    ```

5. **Required Dependencies Exist:**

    ```bash
    # Ensure all IDs in requires/suggests/conflicts have matching overlay directories
    ```

6. **Build and Test:**

    ```bash
    # Rebuild project
    npm run build

    # Test overlay selection in questionnaire
    npm run init

    # Test with CLI
    npm run init -- --stack compose --language [overlay-id]
    ```

7. **Run Tests:**

    ```bash
    # Run overlay loader tests
    npm test -- overlay-loader.test.ts

    # Run all tests
    npm test
    ```

## Quality Checklist

Before committing a new or modified overlay.yml:

- [ ] Overlay ID matches directory name exactly
- [ ] Name uses correct capitalization (title case, official name)
- [ ] Description is one line, no period, describes what it provides
- [ ] Category is one of: language, database, observability, cloud, dev
- [ ] supports is `[]` or `[plain]` or `[compose]`
- [ ] requires lists only hard dependencies (or `[]`)
- [ ] suggests lists optional but useful overlays (or `[]`)
- [ ] conflicts is bidirectional (both overlays list each other, or `[]`)
- [ ] tags are all lowercase, include category, 3-6 tags total
- [ ] ports match devcontainer.patch.json and docker-compose.yml (or `[]`)
- [ ] order is only used when necessary (observability overlays)
- [ ] YAML syntax is valid (yamllint passes)
- [ ] All referenced overlay IDs exist as directories
- [ ] Tested in questionnaire UI
- [ ] Dependency auto-selection works
- [ ] Conflict detection works (if applicable)

## References

**Related Files:**

- `tool/schema/overlay-loader.ts` - Loader that scans and loads overlay.yml files
- `tool/schema/overlay-manifest.schema.json` - JSON schema for validation
- `tool/schema/types.ts` - TypeScript type definitions
- `overlays/.registry/` - Special metadata files (base-images.yml, base-templates.yml)

**Related Instructions:**

- `.github/instructions/overlay-authoring.instructions.md` - Guide for creating overlay files (devcontainer.patch.json, docker-compose.yml, scripts)
- `.github/instructions/overlay-docs.instructions.md` - Guide for documenting overlays with README.md

**Documentation:**

- AGENTS.md - Project overview and dependency resolution algorithm
- docs/dependencies.md - Dependency system documentation
- docs/overlays.md - Overlay system documentation

**Migration:**

- `scripts/migrate-to-manifests.ts` - Tool used to split central index.yml into per-overlay manifests
