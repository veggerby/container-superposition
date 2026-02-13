# Merge Specification

This document formally defines the merge behavior for Container Superposition's composition system. All merge operations are **deterministic** and follow the rules specified here.

## Overview

Container Superposition composes devcontainer configurations by merging:
1. Base template files
2. Overlay patches in order (language → database → observability → cloud → dev tools)
3. Custom patches (if present)

This specification ensures predictable, repeatable composition regardless of the number or combination of overlays.

## Merge Algorithm Guarantees

### Determinism
- Given the same inputs, composition **always** produces the same output
- Merge order is stable and defined
- No randomness or timestamps affect merge behavior (except generation metadata)

### Idempotency
- Merging the same overlay multiple times has the same effect as merging once
- Array deduplication prevents duplicate entries

### Completeness
- All overlay content is preserved unless explicitly overridden
- No silent data loss

## JSON Merge Rules (devcontainer.json)

JSON merging follows a modified [RFC 7386 JSON Merge Patch](https://datatracker.ietf.org/doc/html/rfc7386) with special handling for specific fields.

### Objects

**Strategy:** Deep merge (recursive)

**Behavior:**
- Keys present only in target → preserved
- Keys present only in source → added
- Keys present in both → recursively merged if both values are objects, otherwise source wins

**Example:**
```json
// Target
{
  "customizations": {
    "vscode": {
      "settings": {
        "editor.tabSize": 2
      }
    }
  }
}

// Source
{
  "customizations": {
    "vscode": {
      "settings": {
        "editor.formatOnSave": true
      },
      "extensions": ["esbenp.prettier-vscode"]
    }
  }
}

// Result (deep merge)
{
  "customizations": {
    "vscode": {
      "settings": {
        "editor.tabSize": 2,
        "editor.formatOnSave": true
      },
      "extensions": ["esbenp.prettier-vscode"]
    }
  }
}
```

### Arrays

**Default Strategy:** Union with deduplication

**Behavior:**
- Concatenate arrays from target and source
- Remove duplicates (using `Set` semantics)
- Preserve order (target elements first, then new source elements)

**Example:**
```json
// Target
{
  "forwardPorts": [3000, 8080]
}

// Source
{
  "forwardPorts": [8080, 9090]
}

// Result (union, deduplicated)
{
  "forwardPorts": [3000, 8080, 9090]
}
```

### Array Fields with Special Handling

#### features (Object with keys)

**Strategy:** Merge by feature key, deep merge feature config

**Behavior:**
- Treat as object merge where keys are feature IDs
- Feature configurations are deep merged if both overlays specify the same feature

**Example:**
```json
// Target
{
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "20"
    }
  }
}

// Source
{
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "nodeGypDependencies": true
    },
    "./features/cross-distro-packages": {
      "apt": "curl"
    }
  }
}

// Result (merged by key)
{
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "20",
      "nodeGypDependencies": true
    },
    "./features/cross-distro-packages": {
      "apt": "curl"
    }
  }
}
```

#### Package Lists (apt, apk in cross-distro-packages)

**Strategy:** Space-separated string merge with deduplication

**Behavior:**
- Split on spaces
- Filter empty strings
- Deduplicate using Set
- Join with spaces

**Example:**
```json
// Target
{
  "features": {
    "./features/cross-distro-packages": {
      "apt": "curl wget"
    }
  }
}

// Source
{
  "features": {
    "./features/cross-distro-packages": {
      "apt": "wget jq"
    }
  }
}

// Result (packages merged and deduplicated)
{
  "features": {
    "./features/cross-distro-packages": {
      "apt": "curl wget jq"
    }
  }
}
```

#### customizations.vscode.extensions

**Strategy:** Array union (deduplicate by extension ID)

**Example:**
```json
// Target
{
  "customizations": {
    "vscode": {
      "extensions": ["ms-python.python"]
    }
  }
}

// Source
{
  "customizations": {
    "vscode": {
      "extensions": ["ms-python.python", "ms-python.vscode-pylance"]
    }
  }
}

// Result (union, deduplicated)
{
  "customizations": {
    "vscode": {
      "extensions": ["ms-python.python", "ms-python.vscode-pylance"]
    }
  }
}
```

#### mounts

**Strategy:** Array union (deduplicate by full mount string)

**Rationale:** Mount strings are complex; exact string matching prevents conflicts

#### forwardPorts

**Strategy:** Array union (deduplicate by port number)

#### portsAttributes

**Strategy:** Object merge by port number key

**Example:**
```json
// Target
{
  "portsAttributes": {
    "3000": {
      "label": "App Server"
    }
  }
}

// Source
{
  "portsAttributes": {
    "3000": {
      "onAutoForward": "notify"
    },
    "8080": {
      "label": "API"
    }
  }
}

// Result (merged by port)
{
  "portsAttributes": {
    "3000": {
      "label": "App Server",
      "onAutoForward": "notify"
    },
    "8080": {
      "label": "API"
    }
  }
}
```

### remoteEnv (Environment Variables)

**Strategy:** Object merge with special PATH handling

**Behavior:**
- Non-PATH variables: source overwrites target
- PATH variable: intelligent concatenation
  - Extract path components from both target and source
  - Filter out `${containerEnv:PATH}` placeholder
  - Deduplicate components (preserving order)
  - Append `${containerEnv:PATH}` at the end

**Example:**
```json
// Target
{
  "remoteEnv": {
    "PATH": "${containerEnv:HOME}/.local/bin:${containerEnv:PATH}",
    "NODE_ENV": "development"
  }
}

// Source
{
  "remoteEnv": {
    "PATH": "${containerEnv:HOME}/.npm-global/bin:${containerEnv:PATH}",
    "NODE_ENV": "production"
  }
}

// Result (PATH merged intelligently, NODE_ENV overwritten)
{
  "remoteEnv": {
    "PATH": "${containerEnv:HOME}/.local/bin:${containerEnv:HOME}/.npm-global/bin:${containerEnv:PATH}",
    "NODE_ENV": "production"
  }
}
```

### Primitives (strings, numbers, booleans)

**Strategy:** Last writer wins

**Behavior:**
- Source value replaces target value
- Applies to: `name`, `image`, `workspaceFolder`, etc.

## YAML Merge Rules (docker-compose.yml)

Docker Compose files are merged to combine services from multiple overlays.

### Services

**Strategy:** Deep merge by service name

**Behavior:**
- Services with unique names → included as-is
- Services with same name → deep merge (like JSON objects)
- Arrays within services (ports, volumes, etc.) → union with deduplication

**Example:**
```yaml
# Target
services:
  devcontainer:
    image: mcr.microsoft.com/devcontainers/base:bookworm
    volumes:
      - ..:/workspaces/project
  
# Source
services:
  devcontainer:
    environment:
      NODE_ENV: development
    ports:
      - "3000:3000"
  postgres:
    image: postgres:16-alpine
    
# Result
services:
  devcontainer:
    image: mcr.microsoft.com/devcontainers/base:bookworm
    volumes:
      - ..:/workspaces/project
    environment:
      NODE_ENV: development
    ports:
      - "3000:3000"
  postgres:
    image: postgres:16-alpine
```

### depends_on Filtering

**Special Behavior:** Remove dependencies on non-existent services

**Rationale:** If overlay A depends on service B, but B is not selected, remove the dependency to avoid compose errors

**Supports:**
- Array form: `depends_on: [serviceA, serviceB]`
- Object form: `depends_on: { serviceA: { condition: service_healthy } }`

**Example:**
```yaml
# Overlay declares dependency on optional service
services:
  app:
    depends_on:
      - postgres
      - redis
      
# After composition (only postgres selected)
services:
  app:
    depends_on:
      - postgres
  postgres:
    image: postgres:16
    
# redis dependency removed because redis service not present
```

### Networks

**Strategy:** Shallow merge by network name

**Behavior:**
- Network names are merged (union)
- Network configurations are replaced if duplicate (source wins)

**Special:** All overlays should use `devnet` network (not `external: true`)

### Volumes

**Strategy:** Shallow merge by volume name

**Behavior:**
- Volume names are merged (union)
- Volume configurations are replaced if duplicate (source wins)

### environment (within services)

**Strategy:** Object merge (source wins for duplicates)

**Supports:** Both array and object forms
- Array: `["KEY=value"]`
- Object: `{ KEY: value }`

### Port Offset Application

**Behavior:** Applied to host ports only, not container ports

**Format:** `"${PORT_VAR:-default}:container_port"`

**Example:**
```yaml
# Before offset (base)
services:
  postgres:
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
      
# With port offset of 100
services:
  postgres:
    ports:
      - "5532:5432"  # Host port shifted, container port unchanged
```

## Environment File Merge (.env.example)

### Strategy

Simple key=value append with section headers

### Precedence (lowest to highest)

1. Base template
2. Overlays (in application order)
3. Custom patches
4. Manifest overrides

### Behavior

- Concatenate all .env.example files
- Add section headers for clarity (`# Overlay: <name>`)
- **No deduplication** - duplicate keys allowed (user resolves)
- **Warning on conflicts** - When same key has different values

**Example:**
```bash
# Base template
NODE_ENV=development

# Overlay: postgres
POSTGRES_DB=myapp
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Overlay: redis  
REDIS_PORT=6379

# If redis also defines NODE_ENV=production, both are present
# User must manually resolve
```

## Composition Order

Overlays are applied in this order:

1. **Base template** (plain or compose)
2. **Language overlays** (nodejs, python, dotnet, mkdocs)
3. **Database overlays** (postgres, redis)
4. **Observability overlays** (otel-collector, jaeger, prometheus, grafana, loki)
5. **Cloud tool overlays** (aws-cli, azure-cli, gcloud, kubectl-helm, terraform, pulumi)
6. **Dev tool overlays** (docker-in-docker, docker-sock, playwright, git-helpers, etc.)
7. **Custom patches** (from `.devcontainer/custom/`)

Within each category, overlays are applied in the order they appear in the user's selection.

## Validation Rules

### Pre-composition Validation

- **Stack compatibility** - Filter overlays that don't support selected stack
- **Dependency resolution** - Auto-add required overlays
- **Conflict detection** - Reject conflicting overlay combinations

### Post-composition Validation

- **JSON validity** - devcontainer.json must parse
- **YAML validity** - docker-compose.yml must parse
- **Service references** - All depends_on references must exist
- **Port conflicts** - Warn if multiple services use same host port
- **File consistency** - Verify all referenced scripts/configs exist

## Implementation Details

### Code Location

- Main merge logic: `tool/questionnaire/composer.ts`
- Functions:
  - `deepMerge()` - General-purpose deep merge
  - `mergeRemoteEnv()` - PATH-aware environment merge
  - `mergeAptPackages()` - Package list merge
  - `mergeCrossDistroPackages()` - Cross-distro package merge
  - `mergeDockerComposeFiles()` - Docker Compose merge
  - `filterDependsOnToExistingServices()` - Dependency cleanup

### Testing

- Golden tests: `tool/__tests__/merge-specification.test.ts`
- Composition tests: `tool/__tests__/composition.test.ts`
- Each merge rule has corresponding test cases

### Doctor Command Integration

The `doctor` command validates merge behavior:
- Checks for malformed merged configurations
- Detects conflicting port assignments
- Validates service dependency graphs
- Verifies environment variable consistency

## Edge Cases

### Empty Arrays
- Empty array in source → ignored (target preserved)
- Empty array in target → source replaces

### Null Values
- `null` in source → removes key from target
- Follows RFC 7386 merge patch semantics

### Undefined vs Null
- `undefined` → key not present (no change)
- `null` → explicit removal

### Nested PATH Variables
- Multiple `${...}` references preserved
- Colon splitting respects variable boundaries
- Example: `${VAR1}/bin:${VAR2}/lib:${PATH}` correctly parsed

## References

- [RFC 7386: JSON Merge Patch](https://datatracker.ietf.org/doc/html/rfc7386)
- [Docker Compose Specification](https://docs.docker.com/compose/compose-file/)
- [Dev Container Specification](https://containers.dev/implementors/json_reference/)

## Version History

- **0.1.0** - Initial merge specification (2026-02-13)
