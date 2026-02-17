# Merge Strategy Specification

This document defines the **exact, deterministic merge behavior** for container-superposition composition. All merge operations must follow these rules to ensure predictable and reproducible results.

## Design Principles

1. **Deterministic**: Given the same inputs, merging always produces the same output
2. **Explicit**: No magic or undocumented special cases
3. **Last Writer Wins**: For conflicting primitive values, later overlays override earlier ones
4. **Union by Default**: Arrays and collections are merged (unioned), not replaced
5. **Deep Merge**: Objects are recursively merged, not replaced wholesale

## File Types and Merge Strategies

### devcontainer.json (JSON Merging)

DevContainer configurations use **deep object merging** with field-specific strategies for arrays.

#### Object Merging

**Rule**: Objects are recursively merged. When both target and source contain the same key:

- If both values are objects (non-array): recursively merge
- If both values are arrays: apply array-specific strategy (see below)
- If values are primitives: source overwrites target (last writer wins)

**Example**:

```json
// Base
{
  "customizations": {
    "vscode": {
      "settings": {
        "editor.fontSize": 14
      }
    }
  }
}

// Overlay
{
  "customizations": {
    "vscode": {
      "settings": {
        "editor.tabSize": 2
      }
    }
  }
}

// Result (deep merged)
{
  "customizations": {
    "vscode": {
      "settings": {
        "editor.fontSize": 14,
        "editor.tabSize": 2
      }
    }
  }
}
```

#### Array Merge Strategies

Arrays have **field-specific merge strategies** to ensure correctness:

**Union Strategy** (default for most arrays):

- Concatenate arrays
- Deduplicate elements
- Preserve order (target items first, then source items)
- Fields: `features`, `extensions`, `mounts`, `forwardPorts`, `runArgs`, `capAdd`

**Example**:

```json
// Base
{
  "forwardPorts": [3000, 8080]
}

// Overlay
{
  "forwardPorts": [8080, 9090]
}

// Result (union, deduplicated)
{
  "forwardPorts": [3000, 8080, 9090]
}
```

**Features Object Merge**:

- Features are objects with keys being feature identifiers
- Feature configurations are deep merged
- If same feature appears in multiple overlays, configurations are merged

**Example**:

```json
// Base
{
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "lts"
    }
  }
}

// Overlay
{
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "nodeGypDependencies": true
    },
    "ghcr.io/devcontainers/features/git:1": {}
  }
}

// Result (features merged)
{
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "lts",
      "nodeGypDependencies": true
    },
    "ghcr.io/devcontainers/features/git:1": {}
  }
}
```

#### Special Field: remoteEnv

**Rule**: Environment variables are merged with intelligent PATH handling.

**For PATH variables**:

1. Split both target and source PATH on `:` (preserving `${...}` references)
2. Filter out `${containerEnv:PATH}` placeholder from both
3. Concatenate and deduplicate path components
4. Append `${containerEnv:PATH}` at the end

**For other environment variables**:

- Source overwrites target (last writer wins)

**Example**:

```json
// Base
{
  "remoteEnv": {
    "PATH": "/usr/local/bin:${containerEnv:PATH}",
    "NODE_ENV": "development"
  }
}

// Overlay
{
  "remoteEnv": {
    "PATH": "${containerEnv:HOME}/.local/bin:${containerEnv:PATH}",
    "NODE_ENV": "production"
  }
}

// Result
{
  "remoteEnv": {
    "PATH": "/usr/local/bin:${containerEnv:HOME}/.local/bin:${containerEnv:PATH}",
    "NODE_ENV": "production"
  }
}
```

#### Special Field: portsAttributes

**Rule**: Port attributes are merged by port number key.

**Example**:

```json
// Base
{
  "portsAttributes": {
    "3000": {
      "label": "Dev Server"
    }
  }
}

// Overlay
{
  "portsAttributes": {
    "3000": {
      "onAutoForward": "openBrowser"
    },
    "8080": {
      "label": "API"
    }
  }
}

// Result (merged by port key)
{
  "portsAttributes": {
    "3000": {
      "label": "Dev Server",
      "onAutoForward": "openBrowser"
    },
    "8080": {
      "label": "API"
    }
  }
}
```

### docker-compose.yml (YAML Merging)

Docker Compose files use **service-based deep merging**.

#### Service Merging

**Rule**: Services are merged by service name using deep object merge.

**Example**:

```yaml
# Base
services:
  devcontainer:
    image: mcr.microsoft.com/devcontainers/base:ubuntu
    volumes:
      - ../:/workspace:cached

# Overlay
services:
  devcontainer:
    environment:
      NODE_ENV: development
    ports:
      - "3000:3000"

# Result (deep merged)
services:
  devcontainer:
    image: mcr.microsoft.com/devcontainers/base:ubuntu
    volumes:
      - ../:/workspace:cached
    environment:
      NODE_ENV: development
    ports:
      - "3000:3000"
```

#### Array Fields in Services

**Rule**: Service array fields (volumes, ports, environment, etc.) are **concatenated and deduplicated**.

**Example**:

```yaml
# Base service
volumes:
  - postgres-data:/var/lib/postgresql/data

# Overlay adds to same service
volumes:
  - postgres-data:/var/lib/postgresql/data
  - ./backups:/backups

# Result (union)
volumes:
  - postgres-data:/var/lib/postgresql/data
  - ./backups:/backups
```

#### Special Field: depends_on

**Rule**: Filter dependencies to only include services that exist in the final composition.

**Supported syntaxes**:

- Array form: `depends_on: [serviceA, serviceB]`
- Object form: `depends_on: { serviceA: { condition: ... } }`

**Example**:

```yaml
# Overlay defines dependency
services:
  app:
    depends_on:
      - postgres
      - redis
      - rabbitmq  # This service doesn't exist

# After filtering (rabbitmq removed)
services:
  app:
    depends_on:
      - postgres
      - redis
```

#### Volumes and Networks

**Rule**: Volumes and networks are merged by name.

**Example**:

```yaml
# Base
volumes:
  postgres-data:

networks:
  devnet:

# Overlay
volumes:
  redis-data:

# Result (merged by key)
volumes:
  postgres-data:
  redis-data:

networks:
  devnet:
```

#### Port Offset

**Rule**: When port offset is specified, it's applied to **host ports only** (not container ports).

**Format**: `"host:container"` → `"(host+offset):container"`

**Example**:

```yaml
# Before offset (offset = 100)
ports:
  - "5432:5432"
  - "6379:6379"

# After offset
ports:
  - "5532:5432"  # host port shifted
  - "6479:6379"  # host port shifted
```

### .env Files

Environment files use **simple key-value merging** with precedence rules.

#### Merge Precedence

From lowest to highest priority:

1. Base template `.env.example`
2. Overlay `.env.example` files (in application order)
3. Overlay imports (`.env` files from `.shared/`)
4. Custom `.env.example` (if present)
5. Manifest overrides (from preset `glueConfig.environment`)

**Rule**: Later sources override earlier sources for the same key.

#### Merge Algorithm

1. Start with empty result
2. For each source (in precedence order):
    - Parse key=value pairs
    - Add to result (overwriting existing keys)
3. Generate combined `.env.example` with all sections
4. If port offset specified, also generate `.env` with offset values

**Example**:

```bash
# Base overlay .env.example
POSTGRES_VERSION=15
POSTGRES_PORT=5432

# Another overlay .env.example
POSTGRES_PORT=5433  # Conflict!
REDIS_PORT=6379

# Preset glueConfig.environment
POSTGRES_USER=myapp

# Result (later wins for conflicts)
POSTGRES_VERSION=15
POSTGRES_PORT=5433     # Overlay 2 wins
REDIS_PORT=6379
POSTGRES_USER=myapp    # From preset
```

#### Port Offset in .env Files

**Rule**: Variables matching pattern `*PORT*=\d+` are automatically offset.

**Example**:

```bash
# .env.example (before offset)
POSTGRES_PORT=5432
GRAFANA_HTTP_PORT=3000
APP_NAME=myapp         # Not affected

# .env (with offset=100)
POSTGRES_PORT=5532     # Offset applied
GRAFANA_HTTP_PORT=3100 # Offset applied
APP_NAME=myapp         # Not affected
```

## Package Merging

### apt-get-packages Feature

**Rule**: Space-separated package lists are split, merged, and deduplicated.

**Example**:

```json
// Base
{
  "features": {
    "ghcr.io/devcontainers-extra/features/apt-get-packages:1": {
      "packages": "curl wget"
    }
  }
}

// Overlay
{
  "features": {
    "ghcr.io/devcontainers-extra/features/apt-get-packages:1": {
      "packages": "wget jq"
    }
  }
}

// Result (deduplicated)
{
  "features": {
    "ghcr.io/devcontainers-extra/features/apt-get-packages:1": {
      "packages": "curl wget jq"
    }
  }
}
```

### cross-distro-packages Feature

**Rule**: Both `apt` and `apk` package lists are merged independently.

**Example**:

```json
// Base
{
  "features": {
    "./features/cross-distro-packages": {
      "apt": "build-essential wget",
      "apk": "build-base wget"
    }
  }
}

// Overlay
{
  "features": {
    "./features/cross-distro-packages": {
      "apt": "wget curl",
      "apk": "wget curl"
    }
  }
}

// Result (each distro merged independently)
{
  "features": {
    "./features/cross-distro-packages": {
      "apt": "build-essential wget curl",
      "apk": "build-base wget curl"
    }
  }
}
```

## Lifecycle Commands

### postCreateCommand and postStartCommand

**Rule**: Commands are **concatenated** with `&&` operator, not merged.

**Example**:

```json
// Base
{
  "postCreateCommand": "npm install"
}

// Overlay
{
  "postCreateCommand": "bash setup-nodejs.sh"
}

// Result (concatenated)
{
  "postCreateCommand": "npm install && bash setup-nodejs.sh"
}
```

**Note**: Scripts are copied to `.devcontainer/scripts/` and referenced, not inlined.

## Application Order

Overlays are applied in **category order** to ensure consistent precedence:

1. Base template (plain or compose)
2. Language overlays
3. Database overlays
4. Observability overlays
5. Cloud tool overlays
6. Dev tool overlays
7. Custom patches (if present)

**Within each category**: Overlays are applied in the order specified in the manifest/answers.

## Edge Cases and Special Handling

### Empty Arrays

**Rule**: Empty arrays in source do **not** clear target arrays.

**Example**:

```json
// Base
{
  "forwardPorts": [3000, 8080]
}

// Overlay with empty array
{
  "forwardPorts": []
}

// Result (base preserved, not cleared)
{
  "forwardPorts": [3000, 8080]
}
```

**Rationale**: Empty arrays in overlays are typically omitted fields, not intentional clearing.

### Null Values

**Rule**: `null` values in source **overwrite** target values.

**Example**:

```json
// Base
{
  "workspaceFolder": "/workspace"
}

// Overlay
{
  "workspaceFolder": null
}

// Result (null overwrites)
{
  "workspaceFolder": null
}
```

### Undefined vs Missing Keys

**Rule**: Missing keys in source have **no effect** on target. Only explicitly defined keys are merged.

**Example**:

```json
// Base
{
  "name": "My Container",
  "workspaceFolder": "/workspace"
}

// Overlay (missing 'name')
{
  "workspaceFolder": "/app"
}

// Result ('name' preserved)
{
  "name": "My Container",
  "workspaceFolder": "/app"
}
```

## Conflict Detection

### When Conflicts Occur

Conflicts are **warnings**, not errors. The merge still succeeds with the last writer winning.

**Scenarios that generate warnings**:

1. Same environment variable with different values (except PORT variables with offset)
2. Same port forwarded with conflicting attributes
3. Incompatible feature configurations

**Scenarios that do NOT conflict**:

- Same package in multiple overlays (union behavior)
- Same port in multiple overlays (deduplicated)
- Same PATH component in multiple overlays (deduplicated)

### Conflict Resolution

**Doctor command validation** checks for potential conflicts:

```bash
$ container-superposition doctor

⚠️  Warning: Environment variable conflict
   POSTGRES_PORT defined in multiple overlays:
   - postgres: 5432
   - custom: 5433
   Resolution: custom value (5433) used
```

## Standards and References

This merge strategy is informed by:

- **RFC 7386**: JSON Merge Patch specification
    - We use deep merge (more powerful than shallow merge patch)
    - Objects are merged recursively
    - Arrays use union strategy (not replacement)

- **Docker Compose Specification**:
    - Service-based merging follows Docker Compose extend semantics
    - Array fields are concatenated per Compose specification

- **DevContainer Specification**:
    - Features object merging follows devcontainer.json schema
    - Lifecycle commands follow devcontainer command chaining

## Testing Strategy

All merge behaviors are validated with **golden tests**:

1. **Unit tests**: Test individual merge functions (deepMerge, mergeRemoteEnv, etc.)
2. **Integration tests**: Test full overlay composition scenarios
3. **Golden tests**: Snapshot expected outputs for complex merges
4. **Doctor validation**: Runtime checks for merge correctness

See `tool/__tests__/merge-strategy.test.ts` for comprehensive test coverage.

## Migration and Compatibility

### Version Compatibility

- Merge behavior is **stable** across minor versions
- Breaking changes to merge strategy require **major version bump**
- Generated configurations include `manifestVersion` for future migration

### Legacy Behavior

**Pre-0.1.0**: No formal merge specification

- Behavior was implicit and partially documented
- Some edge cases had undefined behavior

**0.1.0+**: Formal specification (this document)

- All merge behavior is deterministic and tested
- Doctor command validates merge correctness

## Summary

The merge strategy is:

- **Deterministic**: Same inputs always produce same output
- **Explicit**: All rules are documented
- **Union-oriented**: Collections are merged, not replaced
- **Last-writer-wins**: For primitive conflicts
- **Field-aware**: Arrays have specific strategies per field

For implementation details, see `tool/utils/merge.ts` and `tool/questionnaire/composer.ts`.
