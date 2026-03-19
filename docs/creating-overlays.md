# Creating Overlays

A comprehensive guide to creating overlays for container-superposition.

## Base Images

Container Superposition supports multiple Linux distributions with automatic package manager detection.

### Supported Base Images

During interactive initialization, you can choose from:

1. **Debian Bookworm (Recommended)** - `mcr.microsoft.com/devcontainers/base:bookworm`
    - ✅ Default choice, best compatibility
    - ✅ Stable with long-term support
    - ✅ apt package manager
    - ✅ Battle-tested in production

2. **Debian Trixie** - `mcr.microsoft.com/devcontainers/base:trixie`
    - Newer packages, testing stability
    - apt package manager
    - Use if you need more recent software versions

3. **Alpine Linux** - `mcr.microsoft.com/devcontainers/base:alpine`
    - Minimal footprint (~5MB base image)
    - apk package manager
    - Ideal for resource-constrained environments
    - Perfect for containerized microservices

4. **Ubuntu LTS** - `mcr.microsoft.com/devcontainers/base:ubuntu`
    - Popular, familiar to many developers
    - apt package manager
    - Extensive package ecosystem
    - Good for teams migrating from Ubuntu

5. **Custom Image**
    - Specify any Docker image
    - ⚠️ **Warning**: May conflict with overlays
    - Test thoroughly and adjust configurations as needed

### Package Manager Compatibility

Overlays automatically detect the package manager based on the selected base image:

- **Debian/Ubuntu**: Uses `apt-get` for package installation
- **Alpine**: Uses `apk` for package installation
- **Custom**: Defaults to `apt-get` (may need manual adjustment)

When creating overlays with package installations, prefer the `cross-distro-packages` devcontainer feature for packages available in standard distro repos — they run at build time and require no shell scripting:

```json
{
    "features": {
        "./features/cross-distro-packages": {
            "apt": "direnv ripgrep fd-find",
            "apk": "direnv ripgrep fd"
        }
    }
}
```

For packages that require a custom apt repository or are not in standard repos, use a `setup.sh` script instead (see [Setup Scripts](#setup-scripts) below).

If you do need to detect the package manager in a setup script:

```bash
if command -v apk > /dev/null; then
    apk add --no-cache some-package
elif command -v apt-get > /dev/null; then
    apt-get update && apt-get install -y some-package
fi
```

### When to Use Each Base Image

**Debian Bookworm**:

- Default for most projects
- Maximum compatibility with overlays
- Proven stability

**Alpine**:

- Docker images/microservices where size matters
- Cloud deployments with cost optimization
- CI/CD environments

**Ubuntu**:

- Teams familiar with Ubuntu
- Projects requiring Ubuntu-specific packages
- Enterprise environments standardized on Ubuntu

**Custom**:

- Specific compliance requirements
- Organization-mandated base images
- Specialized OS requirements

## Overlay Types

Overlays fall into several categories:

1. **Language/Framework** - dotnet, nodejs, python, mkdocs
2. **Database** - postgres, redis
3. **Observability** - otel-collector, jaeger, prometheus, grafana, loki
4. **Cloud/DevOps** - aws-cli, azure-cli, kubectl-helm
5. **Development Tools** - playwright, codex, etc.

## Basic Overlay Structure

Every overlay must have at least:

```
overlays/my-overlay/
└── devcontainer.patch.json
```

Additional optional files:

```
overlays/my-overlay/
├── devcontainer.patch.json     # Required: DevContainer configuration
├── docker-compose.yml          # Optional: Service definition
├── .env.example                # Optional: Environment variables
├── README.md                   # Optional: Documentation
├── my-config.yaml              # Optional: Configuration files
└── config/                     # Optional: Configuration directory
    └── additional.json
```

## devcontainer.patch.json

This is the core configuration that gets merged into the final devcontainer.json.

### Minimal Example

```json
{
    "$schema": "https://raw.githubusercontent.com/devcontainers/spec/main/schemas/devContainer.base.schema.json",
    "features": {
        "ghcr.io/devcontainers/features/my-tool:1": {
            "version": "latest"
        }
    }
}
```

### Full Example

```json
{
    "$schema": "https://raw.githubusercontent.com/devcontainers/spec/main/schemas/devContainer.base.schema.json",
    "features": {
        "ghcr.io/devcontainers/features/my-tool:1": {
            "version": "latest",
            "option1": true
        }
    },
    "runServices": ["my-service"],
    "_serviceOrder": 1,
    "customizations": {
        "vscode": {
            "extensions": ["publisher.my-extension"],
            "settings": {
                "my.setting": "value"
            }
        }
    },
    "forwardPorts": [8080, 9000],
    "portsAttributes": {
        "8080": {
            "label": "My Service",
            "onAutoForward": "openBrowser"
        },
        "9000": {
            "label": "Admin Panel",
            "onAutoForward": "notify"
        }
    },
    "remoteEnv": {
        "MY_TOOL_HOST": "localhost",
        "MY_TOOL_PORT": "8080"
    },
    "postCreateCommand": {
        "my-setup": "echo 'Setting up my tool...'"
    }
}
```

### Special Fields

#### runServices

Lists services that should start automatically. Only needed if your overlay includes a docker-compose.yml.

```json
{
    "runServices": ["my-service", "my-dependency"]
}
```

#### \_serviceOrder

Controls startup order (lower numbers start first):

- `0` - Infrastructure (postgres, redis)
- `1` - Observability backends (jaeger, prometheus, loki)
- `2` - Middleware (otel-collector)
- `3` - UI/Visualization (grafana)

```json
{
    "_serviceOrder": 1
}
```

## docker-compose.yml

Define services your overlay needs.

### Template

```yaml
version: '3.8'
services:
    my-service:
        image: my-image:${MY_SERVICE_VERSION:-latest}
        environment:
            - ENV_VAR=${ENV_VAR:-default}
        ports:
            - '8080:8080'
        volumes:
            - my-data:/data
            - ./my-config.yaml:/etc/my-service/config.yaml
        depends_on:
            - other-service # Only if dependency exists
        networks:
            - devnet

volumes:
    my-data:

networks:
    devnet:
        external: true
```

### Important Notes

1. **Always use version "3.8"**
2. **Always include `networks: - devnet`** for service connectivity
3. **Use environment variables** with defaults: `${VAR:-default}`
4. **Include depends_on** for dependencies (composer will filter unused ones)
5. **Use external network**: `devnet: external: true`

### Volume Mounts

Mount config files from your overlay:

```yaml
volumes:
    - ./my-config.yaml:/etc/my-service/config.yaml
    - ./config:/etc/my-service/config.d
```

These files are automatically copied to the output directory.

## Setup Scripts

If your overlay needs shell work at container-create time (e.g., adding a custom apt repo, downloading a binary, or configuring shell hooks), add a `setup.sh` to your overlay directory.

```
overlays/my-overlay/
├── devcontainer.patch.json
└── setup.sh                # postCreateCommand script
```

The composer copies `setup.sh` to `scripts/setup-my-overlay.sh` and wires it into `postCreateCommand` automatically. All setup scripts for all selected overlays **run in parallel**, so you must use the shared locking utilities for any apt/dpkg operations.

### Using setup-utils.sh

A shared utility library is automatically emitted to `scripts/setup-utils.sh` whenever any overlay contributes a setup script. Source it at the top of your `setup.sh`:

```bash
#!/bin/bash
set -e
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"
```

#### APT locking — `acquire_apt_lock` / `release_apt_lock`

Setup scripts run in parallel. Without coordination, two scripts calling `apt-get update` simultaneously will corrupt the apt database. Wrap **all** apt/dpkg operations in the lock:

```bash
acquire_apt_lock
sudo apt-get update -qq
sudo apt-get install -y my-package
release_apt_lock
```

The lock is `flock`-based and crash-safe: the kernel releases it automatically if the process exits for any reason, and the EXIT trap closes the file descriptor so background children cannot extend the lock.

#### Adding a custom apt repo — `add_apt_repo`

```bash
add_apt_repo \
    "https://example.com/repo.gpg" \
    "/usr/share/keyrings/example.gpg" \
    "deb [signed-by=/usr/share/keyrings/example.gpg] https://repo.example.com stable main" \
    "/etc/apt/sources.list.d/example.list"
```

This handles the `curl → gpg --dearmor → tee sources.list.d` sequence. Call it **before** `acquire_apt_lock` — it only writes key/sources files and does not invoke apt.

#### Architecture detection — `detect_arch`

```bash
detect_arch             # exits on unknown arch
detect_arch amd64       # falls back to amd64 on unknown arch
# $ARCH_AMD64_ARM64 is now "amd64" or "arm64"
```

#### Installing a binary — `install_binary` / `install_binary_from_tar`

```bash
# Single binary
install_binary "https://example.com/tool-linux-${ARCH_AMD64_ARM64}" "tool"

# Binary inside a .tar.gz
install_binary_from_tar \
    "https://example.com/tool-${VERSION}-linux-${ARCH_AMD64_ARM64}.tar.gz" \
    "tool"          # name inside archive
```

### Full example — custom apt repo

```bash
#!/bin/bash
# my-tool setup script
set -e

source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

echo "📦 Installing my-tool..."
add_apt_repo \
    "https://my-tool.example.com/gpg.key" \
    "/usr/share/keyrings/my-tool.gpg" \
    "deb [signed-by=/usr/share/keyrings/my-tool.gpg] https://my-tool.example.com/apt stable main" \
    "/etc/apt/sources.list.d/my-tool.list"

acquire_apt_lock
sudo apt-get update -qq
sudo apt-get install -y my-tool
release_apt_lock

echo "✅ my-tool installed: $(my-tool --version)"
```

### Full example — binary download

```bash
#!/bin/bash
# my-cli setup script
set -e

source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

MY_VERSION="${MY_VERSION:-1.2.3}"
detect_arch
echo "📦 Installing my-cli ${MY_VERSION} for ${ARCH_AMD64_ARM64}..."
install_binary \
    "https://github.com/example/my-cli/releases/download/v${MY_VERSION}/my-cli-linux-${ARCH_AMD64_ARM64}" \
    "my-cli"

echo "✅ my-cli installed: $(my-cli --version)"
```

### Checklist for setup scripts

- Source `setup-utils.sh` at the top
- Use `acquire_apt_lock` / `release_apt_lock` around **all** apt/dpkg calls
- Use `detect_arch` instead of a hand-rolled `uname -m` case statement
- Use `install_binary` / `install_binary_from_tar` instead of `curl | tar | mv`
- Use `add_apt_repo` instead of inline `curl | gpg | tee`
- Never hardcode architecture (`x86_64`, `amd64`) or checksums that will go stale
- Verify the installed tool with `command -v` after installation

## .env.example

Define environment variables for your overlay.

### Template

```bash
# My Service Configuration
MY_SERVICE_VERSION=latest
MY_SERVICE_PORT=8080
MY_SERVICE_HOST=localhost

# Authentication
MY_SERVICE_USERNAME=admin
MY_SERVICE_PASSWORD=changeme

# Feature Flags
MY_SERVICE_ENABLE_FEATURE_X=true
```

### Guidelines

1. **Include defaults** - Every variable should have a sensible default
2. **Group related variables** - Use comments to organize
3. **Document sensitive values** - Mark which should be changed
4. **Use service prefix** - Avoid naming conflicts (MY*SERVICE*\*)

## Configuration Files

Any additional files in your overlay are automatically copied to the output directory.

### Example Structure

```
overlays/my-service/
├── devcontainer.patch.json
├── docker-compose.yml
├── .env.example
├── my-service-config.yaml        # Copied as-is
├── init-script.sh                # Copied as-is
└── config/                       # Entire directory copied
    ├── settings.json
    └── rules.yaml
```

### Output

```
.devcontainer/
├── devcontainer.json
├── docker-compose.my-service.yml
├── .env.example                  # Merged from all overlays
├── my-service-config.yaml        # Copied from overlay
├── init-script.sh                # Copied from overlay
└── config/                       # Copied from overlay
    ├── settings.json
    └── rules.yaml
```

### Configuration Best Practices

1. **Use relative paths** in docker-compose.yml
2. **Reference .env variables** in config files when possible
3. **Provide examples** - Include commented-out options
4. **Document structure** - Add comments explaining sections

## README.md

Document your overlay for users.

### Template

````markdown
# My Service Overlay

Brief description of what this overlay provides.

## What's Included

- Service name and version
- Key features
- Pre-configured settings

## Ports

- `8080` - Main service API
- `9000` - Admin dashboard

## Configuration

Description of main configuration file(s).

### Key Settings

```yaml
# my-service-config.yaml
server:
    port: 8080
    host: 0.0.0.0
```
````

## Environment Variables

```bash
# Service version
MY_SERVICE_VERSION=latest

# Service port
MY_SERVICE_PORT=8080
```

## Usage

### Basic Usage

Code example showing how to use the service from your application.

### Advanced Configuration

More complex examples.

## Dependencies

Works best with:

- **other-overlay** - Why it's useful
- **another-overlay** - What it provides

## Typical Stacks

```bash
compose + my-language + my-service + postgres
```

## Troubleshooting

Common issues and solutions.

````

## Dependencies Between Overlays

### Declaring Dependencies

In your `docker-compose.yml`, list ALL potential dependencies:

```yaml
services:
  my-service:
    depends_on:
      - postgres
      - redis
      - other-service
````

The composer will automatically:

1. Remove dependencies not selected by the user
2. Remove the `depends_on` field if empty
3. Order services correctly

### Dependency Patterns

**Infrastructure dependency:**

```yaml
my-app:
    depends_on:
        - postgres # Database must start first
```

**Pipeline dependency:**

```yaml
otel-collector:
    depends_on:
        - jaeger # Backends must start first
        - prometheus
        - loki
```

**Visualization dependency:**

```yaml
grafana:
    depends_on:
        - prometheus # Data sources must start first
        - loki
```

## Testing Your Overlay

### 1. Test Standalone

```bash
npm run init -- --stack compose --my-overlay
```

### 2. Test With Dependencies

```bash
npm run init -- --stack compose --my-overlay --postgres --redis
```

### 3. Test In Combination

```bash
npm run init -- --stack compose --language nodejs --my-overlay --postgres
```

### 4. Verify Output

Check that:

- [ ] devcontainer.json has your features merged
- [ ] docker-compose.my-overlay.yml exists
- [ ] .env.example includes your variables
- [ ] Config files are copied correctly
- [ ] Services start in correct order

### 5. Test In Container

```bash
cd output-directory
code .
# Reopen in Container
# Verify service is running: docker-compose ps
```

## Common Patterns

### Language Overlay

No docker-compose, just features:

```json
{
    "features": {
        "ghcr.io/devcontainers/features/node:1": {
            "version": "lts"
        }
    },
    "customizations": {
        "vscode": {
            "extensions": ["dbaeumer.vscode-eslint"]
        }
    }
}
```

### Service Overlay

With docker-compose and config:

```
my-service/
├── devcontainer.patch.json  # Ports, runServices
├── docker-compose.yml       # Service definition
├── .env.example             # Environment variables
└── config.yaml              # Service configuration
```

### Tool Overlay

CLI tools without services:

```json
{
    "features": {
        "ghcr.io/devcontainers/features/aws-cli:1": {}
    },
    "customizations": {
        "vscode": {
            "extensions": ["amazonwebservices.aws-toolkit-vscode"]
        }
    }
}
```

## Checklist

Before submitting an overlay:

- [ ] devcontainer.patch.json validates against schema
- [ ] Packages available in standard repos use `cross-distro-packages` feature (not `apt-get install` in setup.sh)
- [ ] `setup.sh` (if present) sources `setup-utils.sh` and uses `acquire_apt_lock`/`install_binary`/`detect_arch`
- [ ] docker-compose.yml uses version "3.8" and devnet network
- [ ] .env.example has sensible defaults and comments
- [ ] README.md documents ports, environment variables, usage
- [ ] runServices includes service names
- [ ] \_serviceOrder is set appropriately
- [ ] depends_on lists all potential dependencies
- [ ] Tested standalone and in combination
- [ ] Added to overlays/README.md
- [ ] Added to appropriate type in tool/schema/types.ts
- [ ] Updated questionnaire in scripts/init.ts (if applicable)
