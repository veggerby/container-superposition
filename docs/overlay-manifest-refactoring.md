# Overlay Manifest System

## Overview

The overlay system uses per-overlay manifest files (`overlay.yml`) instead of a centralized registry. Each overlay is self-contained with its metadata in its own directory, enabling parallel development and easier maintenance.

## Manifest Format

Each overlay directory contains an `overlay.yml` file defining its metadata:

```yaml
id: nodejs
name: Node.js
description: Node.js LTS with TypeScript and tooling
category: language
supports: [] # Empty = all stacks, or [plain], [compose]
requires: [] # Hard dependencies
suggests: [] # Recommended overlays
conflicts: [] # Incompatible overlays
tags:
    - language
    - nodejs
    - javascript
    - typescript
ports: [] # Ports used (for offset calculation)
```

### Required Fields

- **id**: Unique identifier (must match directory name)
- **name**: Human-readable display name
- **description**: One-line summary
- **category**: One of: `language`, `database`, `observability`, `cloud`, `dev`, `preset`

### Optional Fields

- **supports**: Stack compatibility (`[]` = all, `[plain]`, `[compose]`)
- **requires**: Overlay IDs that must be auto-installed
- **suggests**: Recommended overlay IDs
- **conflicts**: Incompatible overlay IDs (must be bidirectional)
- **tags**: Lowercase keywords for search/filtering
- **ports**: Ports exposed by overlay (for offset calculation)
- **order**: Display order within category (lower = first)

## Directory Structure

```
overlays/
  .registry/
    base-images.yml       # Base container images
    base-templates.yml    # Template types (plain, compose)
  nodejs/
    overlay.yml           # Overlay metadata
    devcontainer.patch.json
    setup.sh
    README.md
  postgres/
    overlay.yml           # Overlay metadata
    docker-compose.yml
    devcontainer.patch.json
    README.md
  presets/
    web-api.yml           # Preset definition
    microservice.yml
```

## Loader Behavior

The overlay loader (`tool/schema/overlay-loader.ts`) discovers overlays by:

1. Scanning `overlays/` directory for subdirectories
2. Loading `overlay.yml` from each directory
3. Validating manifest structure and fields
4. Grouping overlays by category
5. Loading base images/templates from `.registry/` files
6. Loading preset metadata from `overlays/presets/*.yml`

### Discovery Process

```typescript
// Automatic discovery - no registration needed
const manifests = loadOverlayManifests(overlaysDir);
const config = buildOverlaysConfigFromManifests(overlaysDir);
```

The loader:

- Skips directories starting with `.` (e.g., `.registry`)
- Validates `id` matches directory name
- Sets default empty arrays for optional fields
- Warns about invalid or malformed manifests

### Preset Handling

Presets are meta-overlays defined in `overlays/presets/*.yml`. Each preset file contains:

- Metadata (id, name, description, tags, supports)
- Selection rules (required overlays, user choices)
- Glue configuration (environment variables, port mappings, README content)

The loader reads preset metadata separately and populates `preset_overlays` in the config.

### Backward Compatibility

The loader supports both approaches:

1. **Preferred**: Loads from individual manifests (checks for `.registry/` directory)
2. **Fallback**: Loads from `overlays/index.yml` if present and `.registry/` absent

This allows smooth migration and testing without breaking existing setups.

## Creating an Overlay

### Step 1: Create Directory

```bash
mkdir -p overlays/my-overlay
```

### Step 2: Create Manifest

Create `overlays/my-overlay/overlay.yml`:

```yaml
id: my-overlay
name: My Overlay
description: Brief description of what it provides
category: language
supports: []
requires: []
suggests: []
conflicts: []
tags:
    - language
    - my-overlay
ports: []
```

### Step 3: Add Implementation Files

- `devcontainer.patch.json` - DevContainer configuration patches
- `README.md` - Documentation
- Other files as needed (setup.sh, docker-compose.yml, etc.)

### Step 4: Test

```bash
npm run build
npm run init -- --stack compose --language my-overlay
```

**No registration step needed!** The loader automatically discovers the new overlay.

## Migration from Central index.yml

For repositories still using the centralized `overlays/index.yml`:

### Using the Migration Tool

```bash
# Run migration script
npx tsx scripts/migrate-to-manifests.ts

# Review generated files
ls overlays/*/overlay.yml

# Test
npm run build
npm test

# Archive old index.yml
mv overlays/index.yml overlays/index.yml.archived
```

The migration tool:

- Splits central index.yml into individual manifests
- Creates `.registry/` directory with base images/templates
- Validates bidirectional conflicts
- Checks ID-directory name matching
- Verifies port consistency

## Benefits

- **Cohesion**: Overlay metadata colocated with implementation
- **No Merge Conflicts**: No central file bottleneck
- **Portability**: Copy directory = copy overlay
- **Discovery**: Automatic scanning, no registration
- **Parallelization**: Multiple developers can work independently
- **Maintainability**: Single edit point per overlay

## Validation

Manifests are validated at runtime:

- Required fields presence
- ID matches directory name
- Array fields are actual arrays
- Bidirectional conflicts
- Port consistency with devcontainer.patch.json

For stricter validation, JSON schemas are available:

- `tool/schema/overlay-manifest.schema.json`
- `tool/schema/base-images.schema.json`
- `tool/schema/base-templates.schema.json`

## References

- **Loader**: `tool/schema/overlay-loader.ts`
- **Tests**: `tool/__tests__/overlay-loader.test.ts`
- **Schemas**: `tool/schema/*.schema.json`
- **Instructions**: `.github/instructions/overlay-*.instructions.md`
- **Archive**: `docs/overlay-metadata-archive.md` (old index.yml reference)
