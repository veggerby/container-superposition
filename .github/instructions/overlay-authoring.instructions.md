---
applyTo: 'overlays/**/*.{json,yml,yaml,sh,txt}'
---

# GitHub Copilot Instructions: Overlay Authoring

This file provides instructions for GitHub Copilot when creating or modifying overlay files in the `overlays/` directory.

## Overlay File Structure

Each overlay directory must contain at minimum:

- `devcontainer.patch.json` - Required: Patches to merge into base devcontainer.json
- `README.md` - Required: Documentation following overlay-docs.instructions.md guidelines
- **Entry in `overlays/index.yml`** - Required: Metadata registration (see overlay-index.instructions.md)

Optional files (as needed):

- `docker-compose.yml` - For compose-stack overlays that add services
- `setup.sh` - Post-create setup script (installed packages, configuration)
- `verify.sh` - Verification script to test overlay functionality
- `.env.example` - Environment variable template
- Configuration files - Service-specific configs (e.g., `grafana-datasources.yml`)
- `global-packages.txt` - For language overlays (npm, pip packages)
- `global-tools.txt` - For language overlays (.NET tools, Go binaries)

## File Standards

### 1. devcontainer.patch.json

**Purpose:** JSON patch that merges into the base devcontainer.json configuration.

**Schema:** Must include schema reference for validation and IntelliSense.

**Structure:**

```json
{
  "$schema": "https://raw.githubusercontent.com/devcontainers/spec/main/schemas/devContainer.base.schema.json",
  "features": {},
  "customizations": {},
  "remoteEnv": {},
  "forwardPorts": [],
  "portsAttributes": {},
  "postCreateCommand": "",
  "postStartCommand": ""
}
```

#### Features Section

Use devcontainer features for tool installation when possible. Prefer official features over custom scripts.

**Format:**

```json
{
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "lts",
      "nodeGypDependencies": true
    },
    "./features/cross-distro-packages": {
      "apt": "build-essential wget curl",
      "apk": "build-base wget curl"
    }
  }
}
```

**Guidelines:**

- Use official devcontainer features from `ghcr.io/devcontainers/features/`
- Use relative path `./features/cross-distro-packages` for cross-distribution package installation
- Specify exact versions for production overlays (`"version": "20"`) or use `"lts"` for language runtimes
- Group related packages together in apt/apk strings (space-separated)

**Cross-distro Packages:**

```json
{
  "features": {
    "./features/cross-distro-packages": {
      "apt": "postgresql-client redis-tools curl jq",
      "apk": "postgresql-client redis curl jq"
    }
  }
}
```

#### Customizations Section

Configure VS Code extensions, settings, and other editor customizations.

**Format:**

```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "publisher.extension-id"
      ],
      "settings": {
        "setting.key": "value"
      }
    }
  }
}
```

**Guidelines:**

- **Extensions:** Use exact extension IDs from marketplace (e.g., `dbaeumer.vscode-eslint`)
- **Settings:** Only include settings directly related to overlay functionality
- **Language-specific settings:** Use language scope syntax `"[typescript]": {}`
- **Formatters:** Set default formatters to avoid user confusion
- **Code actions:** Use `"explicit"` for code actions on save (not `true`)

**Example (Node.js):**

```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "christian-kohler.npm-intellisense"
      ],
      "settings": {
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": "explicit"
        },
        "[typescript]": {
          "editor.defaultFormatter": "esbenp.prettier-vscode"
        }
      }
    }
  }
}
```

#### Environment Variables (remoteEnv)

Define environment variables for the devcontainer environment.

**Guidelines:**

- Use for PATH modifications, tool configuration, default settings
- Reference container environment with `${containerEnv:VARIABLE}`
- Prepend to PATH, don't replace: `"/new/path:${containerEnv:PATH}"`
- Use `${localEnv:VARIABLE}` to pass-through from host (rarely needed)

**Example:**

```json
{
  "remoteEnv": {
    "PATH": "/home/vscode/.npm-global/bin:${containerEnv:PATH}",
    "PNPM_HOME": "/home/vscode/.local/share/pnpm",
    "NODE_ENV": "development"
  }
}
```

**Warning:** Do NOT use remoteEnv for secrets. Use `.env` files or devcontainer secrets instead.

#### Port Forwarding

Define ports to forward from container to host.

**Format:**

```json
{
  "forwardPorts": [3000, 8080, 9090],
  "portsAttributes": {
    "3000": {
      "label": "Dev Server",
      "onAutoForward": "openBrowser"
    },
    "8080": {
      "label": "Web App",
      "onAutoForward": "notify"
    },
    "9090": {
      "label": "Metrics",
      "onAutoForward": "ignore"
    }
  }
}
```

**onAutoForward options:**

- `"openBrowser"` - Auto-open in browser (use for web UIs)
- `"notify"` - Show notification (use for APIs, servers)
- `"ignore"` - Silent (use for internal/monitoring ports)
- `"openPreview"` - Open in VS Code simple browser

**Guidelines:**

- Only forward ports users will actively use
- Provide descriptive labels
- Match ports declared in `overlays/index.yml` for the overlay
- Ports will be offset by composer.ts if `--port-offset` is used

#### Lifecycle Commands

**postCreateCommand** - Runs once after container is created (initial setup):

```json
{
  "postCreateCommand": "sh .devcontainer/setup-nodejs.sh"
}
```

**postStartCommand** - Runs every time container starts:

```json
{
  "postStartCommand": "sh .devcontainer/verify-dotnet.sh"
}
```

**Guidelines:**

- Use `postCreateCommand` for one-time setup (install packages, configure tools)
- Use `postStartCommand` for verification or startup tasks
- Reference setup scripts with paths relative to workspace root
- Script names should match overlay: `setup-<overlay>.sh`, `verify-<overlay>.sh`
- Combine multiple commands with `&&`: `"npm install && npm run setup"`

### 2. docker-compose.yml

**Purpose:** Define additional services for compose-stack overlays (databases, monitoring tools, etc.).

**Required for:** Database overlays, observability overlays (anything that needs a separate container/service).

**Format:**

```yaml
version: '3.8'

services:
  service-name:
    image: image:tag
    restart: unless-stopped
    volumes:
      - volume-name:/path/in/container
    environment:
      ENV_VAR: ${ENV_VAR:-default-value}
    ports:
      - "${PORT:-5432}:5432"
    networks:
      - devnet

volumes:
  volume-name:

networks:
  devnet:
```

#### Critical Requirements

**Network Name:** MUST be `devnet` (not `devnet: external: true`):

```yaml
networks:
  devnet:  # Correct: shared network created by composer
```

**NOT this:**

```yaml
networks:
  devnet:
    external: true  # WRONG: Causes runtime failures
```

**Why:** The composer creates the `devnet` network. Each overlay just references it.

#### Service Guidelines

**Image Selection:**

- Use official images from Docker Hub
- Prefer Alpine variants for smaller size: `postgres:16-alpine`, `redis:7-alpine`
- Pin major versions: `postgres:16` not `postgres:latest`
- Use environment variable for version: `${POSTGRES_VERSION:-16}-alpine`

**Restart Policy:**

- Use `restart: unless-stopped` for services that should auto-restart
- Prevents service failures from stopping development workflow

**Volumes:**

- Always use named volumes for data persistence: `postgres-data:/var/lib/postgresql/data`
- Declare volumes at root level
- Use descriptive names: `<service>-data`, `<service>-config`

**Environment Variables:**

- Use `${VAR:-default}` syntax for all configurable values
- Provide sensible defaults suitable for development
- Document all variables in `.env.example`
- Never hardcode passwords or sensitive values

**Ports:**

- Use environment variable for host port: `"${POSTGRES_PORT:-5432}:5432"`
- First port (host) should be configurable, second port (container) is fixed
- Composer.ts will apply port offset to host ports automatically
- Document default ports in overlay README.md

**Example (PostgreSQL):**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:${POSTGRES_VERSION:-16}-alpine
    restart: unless-stopped
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-devdb}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    networks:
      - devnet

volumes:
  postgres-data:

networks:
  devnet:
```

#### Service Communication

Services communicate using service names as hostnames:

```yaml
# From dev container, connect to PostgreSQL:
# psql -h postgres -U postgres -d myapp
#       ^^^^^^^^ service name = hostname

# From one service to another:
# redis://redis:6379
#         ^^^^^ service name
```

**Guidelines:**

- Service name = hostname for inter-container communication
- Use standard ports for container-to-container (e.g., 5432 for postgres)
- Host port can be offset, container port stays standard
- Document connection strings in README.md

#### Health Checks (Optional but Recommended)

```yaml
services:
  postgres:
    # ... other config
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
```

**When to use:**

- Services that need startup time (databases)
- Services with dependencies (wait for DB before starting app)
- Provides clear status in `docker-compose ps`

### 3. setup.sh

**Purpose:** Post-create setup script that runs once when container is created.

**Naming:** `setup.sh` (generic) or `setup-<overlay>.sh` (specific)

**Script Header:**

```bash
#!/bin/bash
# [Overlay Name] setup script - [Brief description]

set -e  # Exit on error

# Detect overlay name from script name (if using setup-<overlay>.sh pattern)
OVERLAY_NAME=$(basename "$0" | sed 's/setup-//;s/\.sh$//')

echo "🔧 Setting up [Overlay Name]..."
```

**Guidelines:**

**Shebang and Error Handling:**

```bash
#!/bin/bash
set -e  # Exit immediately on error
set -u  # Error on undefined variables (optional, can break some scenarios)
```

**Output Formatting:**

- Use emojis for visual distinction: 🔧 (setup), 📦 (install), ✓ (success), ⚠️ (warning)
- Echo progress messages to help users understand what's happening
- Use consistent formatting with other setup scripts

**Installing Global Packages:**

For language overlays with `global-packages.txt` or `global-tools.txt`:

```bash
# Read packages from configuration file
if [ -f ".devcontainer/global-packages-${OVERLAY_NAME}.txt" ]; then
    echo "📦 Installing packages from global-packages-${OVERLAY_NAME}.txt..."

    while IFS= read -r line || [ -n "$line" ]; do
        # Skip comments and empty lines
        [[ "$line" =~ ^#.*$ ]] && continue
        [[ -z "$line" ]] && continue

        # Parse package and optional version (format: package@version or package::version)
        echo "  Installing $line..."
        npm install --global "$line" || echo "  ⚠️  $line already installed or failed"
    done < ".devcontainer/global-packages-${OVERLAY_NAME}.txt"
else
    # Fallback to hardcoded defaults
    echo "📦 Installing default packages..."
    npm install --global pnpm || echo "pnpm already installed"
fi
```

**Pattern for .NET Tools:**

```bash
# Install .NET global tools
while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^#.*$ ]] && continue
    [[ -z "$line" ]] && continue

    # Support tool::version format
    if [[ "$line" =~ ^(.+)::(.+)$ ]]; then
        tool="${BASH_REMATCH[1]}"
        version="${BASH_REMATCH[2]}"
        dotnet tool install --global "$tool" --version "$version" || echo "⚠️ $tool failed"
    else
        dotnet tool install --global "$line" || echo "⚠️ $line failed"
    fi
done < ".devcontainer/global-tools-${OVERLAY_NAME}.txt"
```

**Error Handling:**

- Use `|| echo "warning message"` for non-critical failures (packages already installed)
- Don't use `|| true` unless you really want to ignore all errors
- Verify installations worked: `npm list --global --depth=0`

**File Permissions:**

- Create directories with proper permissions: `mkdir -p ~/.config && chmod 755 ~/.config`
- Fix ownership if needed: `sudo chown -R vscode:vscode /path`

**Idempotency:**

- Scripts should be safe to run multiple times
- Check if tools are already installed before installing
- Use conditional logic: `if ! command -v tool &> /dev/null; then install; fi`

### 4. verify.sh

**Purpose:** Verification script that tests overlay functionality. Runs on container start.

**Naming:** `verify.sh` or `verify-<overlay>.sh`

**Script Header:**

```bash
#!/bin/bash
# [Overlay Name] verification script

# Don't exit on error - we want to report all failures
# set -e  # DON'T use this in verify scripts

echo "🔍 Verifying [Overlay Name] installation..."
```

**Pattern:**

```bash
#!/bin/bash
# Tool verification script

echo "🔍 Verifying [Tool] installation..."

# Track overall success
ALL_CHECKS_PASSED=true

# Check tool is installed
if command -v tool &> /dev/null; then
    VERSION=$(tool --version)
    echo "✓ tool is installed: $VERSION"
else
    echo "✗ tool is not installed"
    ALL_CHECKS_PASSED=false
fi

# Check configuration file exists
if [ -f "$HOME/.tool/config" ]; then
    echo "✓ Configuration file exists"
else
    echo "⚠️ Configuration file not found (optional)"
fi

# Check service is running (for compose services)
if docker-compose ps | grep -q "service.*Up"; then
    echo "✓ Service is running"
else
    echo "✗ Service is not running"
    ALL_CHECKS_PASSED=false
fi

# Final result
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo "✓ All checks passed"
    exit 0
else
    echo "✗ Some checks failed"
    exit 1
fi
```

**What to Verify:**

- Tool/binary is installed and in PATH
- Version is correct (if specific version required)
- Configuration files exist (if applicable)
- Services are running (for docker-compose services)
- Connectivity (can connect to database, API is responding)

**Don't Fail For:**

- Optional configurations missing
- Services that haven't started yet
- Non-critical features

### 5. .env.example

**Purpose:** Template for environment variables used by docker-compose.yml.

**Naming:** `.env.example` (users copy to `.env` and customize)

**Format:**

```bash
# [Service Name] Configuration
SERVICE_VERSION=1.0
SERVICE_PORT=5432
SERVICE_USER=admin
SERVICE_PASSWORD=changeme

# Optional settings
# OPTIONAL_FEATURE=value
```

**Guidelines:**

- Group related variables with comments
- Provide sensible defaults for development
- Document what each variable does (inline or header comments)
- Use `SERVICE_` prefix to avoid conflicts: `POSTGRES_USER`, `REDIS_PORT`
- **Never commit actual `.env`** - only `.env.example`
- Include version variables: `POSTGRES_VERSION=16`
- Include port variables: `POSTGRES_PORT=5432`

**Example (PostgreSQL):**

```bash
# PostgreSQL Configuration
POSTGRES_VERSION=16
POSTGRES_DB=devdb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432
```

**Security:**

- Default passwords should be obvious placeholders: `postgres`, `changeme`, `admin`
- Add comment: `# SECURITY: Change this password for production use`
- Never use real credentials in examples

### 6. global-packages.txt / global-tools.txt

**Purpose:** List of global packages/tools to install for language overlays.

**Format:**

```plaintext
# [Language] Global Packages
# Customize this file to add or remove globally installed packages
# Format: one package per line, with optional version
# Example: package@version or package::version

# Package manager (if applicable)
pnpm

# Add your custom packages here
# Common examples (commented out by default):
# typescript@5.3.0
# nodemon
# pm2
```

**Guidelines:**

- Include header comment explaining format
- One package per line
- Support version syntax: `package@version` (npm/pip) or `package::version` (.NET)
- Include sensible defaults, comment out optional packages
- Provide examples of commonly used packages
- Keep list minimal - users can extend it

**Node.js Example:**

```plaintext
# Node.js Global Packages
pnpm

# Uncomment to add:
# typescript
# ts-node
# nodemon
```

**.NET Example:**

```plaintext
# .NET Global Tools
dotnet-ef
dotnet-format

# Uncomment to add:
# dotnet-outdated-tool
# dotnet-reportgenerator-globaltool
```

**Python Example:**

```plaintext
# Python Global Packages
pipx

# Uncomment to add:
# black
# ruff
# mypy
```

### 7. Service Configuration Files

**Purpose:** Configuration files for services (Grafana datasources, Loki config, Prometheus rules, etc.).

**Naming:** `<service>-<purpose>.<ext>` (e.g., `grafana-datasources.yml`, `loki-config.yaml`)

**Guidelines:**

- Use YAML for configuration when possible (widely supported, readable)
- Include comments explaining configuration sections
- Use environment variable substitution when supported: `${ENV_VAR:-default}`
- Mount as volume in docker-compose.yml:

  ```yaml
  volumes:
    - ./overlays/grafana/grafana-datasources.yml:/etc/grafana/provisioning/datasources/datasources.yml:ro
  ```

- Mark as read-only (`:ro`) if service doesn't need to modify it

**Example (Grafana Datasources):**

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

## Integration with Composer

The `composer.ts` file in `tool/questionnaire/` handles merging overlays into the final devcontainer configuration.

**How Overlay Files Are Processed:**

1. **devcontainer.patch.json:**
   - Merged using deep merge algorithm
   - Arrays are concatenated and deduplicated
   - Objects are merged recursively
   - `remoteEnv.PATH` is merged intelligently (prepending, not overwriting)

2. **docker-compose.yml:**
   - Services merged into base `.devcontainer/docker-compose.yml`
   - Volumes and networks merged
   - Port offsets applied to host ports (if `--port-offset` specified)

3. **Setup/Verify Scripts:**
   - Copied to `.devcontainer/setup-<overlay>.sh`
   - Invoked via `postCreateCommand` or `postStartCommand`
   - Multiple scripts are chained with `&&`

4. **.env.example:**
   - Concatenated into `.devcontainer/.env.example`
   - Users copy to `.env` manually

5. **global-packages.txt:**
   - Copied to `.devcontainer/global-packages-<overlay>.txt`
   - Processed by setup script

**Composer Behavior You Should Know:**

- **Port Offset:** If user specifies `--port-offset 100`, all ports are incremented:
  - 5432 → 5532 (PostgreSQL)
  - 6379 → 6479 (Redis)
  - Only applies to host ports in docker-compose.yml, not container ports

- **Apt Package Merging:** Packages from multiple overlays are combined and deduplicated:

  ```json
  // Overlay 1: "apt": "curl wget"
  // Overlay 2: "apt": "wget jq"
  // Result: "curl wget jq"
  ```

- **Empty String Filtering:** Empty strings in apt/apk package lists are filtered out

- **Order of Application:**
  1. Base template (plain or compose)
  2. Language overlays
  3. Database overlays
  4. Observability overlays
  5. Cloud tool overlays
  6. Dev tool overlays

## Testing and Validation

**Before committing overlay files:**

1. **Validate JSON syntax:**

   ```bash
   # Use jq or VS Code JSON validator
   jq empty devcontainer.patch.json
   ```

2. **Validate YAML syntax:**

   ```bash
   # Use yamllint or VS Code YAML validator
   yamllint docker-compose.yml
   ```

3. **Test script execution:**

   ```bash
   # Verify scripts have execute permissions
   chmod +x setup.sh verify.sh

   # Test setup script (in devcontainer)
   bash setup.sh

   # Test verify script
   bash verify.sh
   ```

4. **Build devcontainer:**

   ```bash
   # Generate devcontainer with your overlay
   npm run init -- --stack compose --language nodejs --your-overlay

   # Open in VS Code and rebuild container
   code generated-project/
   # Dev Containers: Rebuild Container
   ```

5. **Verify functionality:**
   - All tools are installed
   - VS Code extensions are present
   - Services are running (docker-compose ps)
   - Ports are accessible
   - Environment variables are set
   - Scripts executed successfully

6. **Test port offset:**

   ```bash
   npm run init -- --port-offset 100 --stack compose --database postgres
   # Verify PostgreSQL is on port 5532, not 5432
   ```

7. **Run smoke tests:**

   ```bash
   npm run test:smoke
   ```

## Common Patterns and Examples

### Pattern: Language Overlay with Global Packages

**Files:**

- `devcontainer.patch.json` - Feature, extensions, settings
- `global-packages.txt` - List of packages to install
- `setup.sh` - Install packages from list
- `verify.sh` - Verify installation

### Pattern: Database Service Overlay

**Files:**

- `devcontainer.patch.json` - Client tools (features), extensions
- `docker-compose.yml` - Database service
- `.env.example` - Database configuration
- `README.md` - Connection strings, usage

### Pattern: Observability Tool Overlay

**Files:**

- `devcontainer.patch.json` - Port forwarding
- `docker-compose.yml` - Service definition
- `<service>-config.yml` - Tool configuration
- `.env.example` - Service settings
- `verify.sh` - Check service is running

### Pattern: CLI Tool Overlay

**Files:**

- `devcontainer.patch.json` - Feature or apt packages, extensions
- `setup.sh` - Tool configuration (auth setup, plugins)
- `verify.sh` - Verify tool is installed and working

## Quality Checklist

Before submitting overlay files, verify:
**Overlay registered in `overlays/index.yml`** (see overlay-index.instructions.md)

- [ ] Overlay ID in index.yml matches directory name
- [ ] Category, supports, requires, suggests, conflicts correctly defined
- [ ] Ports in index.yml match ports in devcontainer.patch.json
- [ ] `devcontainer.patch.json` includes schema reference
- [ ] All JSON/YAML files are valid syntax
- [ ] Scripts have proper shebang (`#!/bin/bash`)
- [ ] Scripts use `set -e` for error handling (except verify.sh)
- [ ] Port forwarding matches ports in `overlays/index.yml`
- [ ] Docker Compose uses `devnet` network (not external)
- [ ] Environment variables use `${VAR:-default}` syntax
- [ ] All volumes are declared at root level
- [ ] Service names are descriptive and match overlay purpose
- [ ] Scripts are executable (`chmod +x`)
- [ ] `.env.example` documents all variables
- [ ] README.md created following overlay-docs.instructions.md guidelines
- [ ] Tested in actual devcontainer build
- [ ] Works with port offset
- [ ] No hardcoded secrets or credentials

## References

**Key Files to Reference:**

- `overlays/index.yml` - Overlay registry (see overlay-index.instructions.md for authoring guide)
- `tool/questionnaire/composer.ts` - Merge algorithm and overlay application logic
- `overlays/nodejs/` - Example language overlay
- `overlays/postgres/` - Example database overlay
- `overlays/grafana/` - Example observability overlay with config files
- `overlays/gcloud/` - Example cloud CLI overlay

**Documentation:**

- [Dev Container Specification](https://containers.dev/implementors/json_reference/)
- [Dev Container Features](https://containers.dev/features)
- [Docker Compose Specification](https://docs.docker.com/compose/compose-file/)

**Related Instructions:**

- `.github/instructions/overlay-index.instructions.md` - Guide for registering overlays in index.yml
- `.github/instructions/overlay-docs.instructions.md` - Guide for documenting overlays
