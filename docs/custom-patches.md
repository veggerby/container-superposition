# Custom Patches - Project-Specific Customizations

This guide explains how to use the `.devcontainer/custom/` directory to preserve project-specific customizations across regenerations.

## Overview

When you regenerate a devcontainer (e.g., to add a new overlay), all manual changes to the generated files are normally lost. The **custom patches** feature solves this problem by allowing you to define customizations in a special directory that is preserved and automatically merged during regeneration.

## Quick Start

### 1. Generate Initial Devcontainer

```bash
npm run init -- --stack compose --language nodejs --database postgres
```

### 2. Add Custom Patches

Create the custom directory and add your customizations:

```bash
mkdir -p .devcontainer/custom
```

Create a custom devcontainer patch:

```json
// .devcontainer/custom/devcontainer.patch.json
{
  "mounts": [
    "source=${localWorkspaceFolder}/../shared-libs,target=/workspace/shared,type=bind"
  ],
  "customizations": {
    "vscode": {
      "extensions": [
        "eamodio.gitlens"
      ]
    }
  }
}
```

### 3. Regenerate (Customizations Preserved)

```bash
# Add a new overlay by regenerating
npm run init -- --from-manifest .devcontainer/superposition.json

# Select additional overlays (e.g., aws-cli)
# Your custom patches will be automatically applied ✅
```

## Supported Customization Files

The `.devcontainer/custom/` directory supports the following files:

### 1. `devcontainer.patch.json`

Patches to merge into the generated `devcontainer.json`.

**Use cases:**
- Add custom mounts
- Add custom environment variables
- Add custom VS Code extensions
- Override settings

**Example:**

```json
{
  "mounts": [
    "source=${localWorkspaceFolder}/../shared,target=/workspace/shared,type=bind",
    "source=${localWorkspaceFolder}/../cache,target=/workspace/cache,type=bind"
  ],
  "remoteEnv": {
    "MY_CUSTOM_VAR": "value",
    "API_ENDPOINT": "https://api.example.com"
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "eamodio.gitlens",
        "myorg.custom-extension"
      ],
      "settings": {
        "editor.formatOnSave": true
      }
    }
  }
}
```

### 2. `docker-compose.patch.yml`

Patches to merge into the generated `docker-compose.yml` (for compose-based stacks only).

**Use cases:**
- Add custom services
- Add custom volumes
- Modify existing services

**Example:**

```yaml
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    networks:
      - devnet
  
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    networks:
      - devnet
```

### 3. `environment.env`

Custom environment variables to append to `.env.example`.

**Use cases:**
- Add API keys
- Add feature flags
- Add custom configuration

**Example:**

```bash
# Custom Environment Variables
MY_API_KEY=secret123
CUSTOM_FEATURE_FLAG=enabled
DATABASE_URL=postgresql://localhost:5432/mydb
```

### 4. `scripts/post-create.sh`

Custom script to run after container creation (one-time setup).

**Use cases:**
- Download proprietary tools
- Set up local databases
- Initialize project-specific dependencies

**Example:**

```bash
#!/bin/bash
# Custom post-create setup

echo "🎨 Running custom initialization..."

# Download proprietary CLI
curl -o /tmp/custom-cli.tar.gz https://example.com/custom-cli.tar.gz
tar -xzf /tmp/custom-cli.tar.gz -C /usr/local/bin/

# Initialize custom database schema
psql -h postgres -U postgres -d myapp -f .devcontainer/custom/files/schema.sql

echo "✅ Custom initialization complete"
```

### 5. `scripts/post-start.sh`

Custom script to run every time the container starts.

**Use cases:**
- Start background services
- Refresh credentials
- Check environment health

**Example:**

```bash
#!/bin/bash
# Custom post-start tasks

echo "✨ Running custom startup tasks..."

# Refresh AWS credentials
aws configure set region us-east-1

# Check database connectivity
pg_isready -h postgres -U postgres || echo "⚠️ Database not ready"

echo "✅ Startup tasks complete"
```

### 6. `files/`

Directory for additional files to copy into the devcontainer.

**Use cases:**
- Custom configuration files
- Project-specific scripts
- Seed data

**Example structure:**

```
.devcontainer/custom/files/
├── config.yml          # Copied to .devcontainer/config.yml
├── scripts/
│   └── helper.sh       # Copied to .devcontainer/scripts/helper.sh
└── data/
    └── seed.sql        # Copied to .devcontainer/data/seed.sql
```

## How It Works

### Merge Strategy

Custom patches are applied **after** all overlay merging, using the following strategy:

1. **Objects**: Deep merge (nested properties are merged recursively)
2. **Arrays**: Concatenate and deduplicate
3. **Primitives**: Custom value takes precedence
4. **Scripts**: Chained with `&&` in lifecycle commands

### Application Order

1. Base template loaded
2. Overlays applied in order
3. Port offsets applied
4. **Custom patches applied** ← Your customizations
5. Files written to disk

### Preservation During Regeneration

The `.devcontainer/custom/` directory is:
- ✅ **Preserved** during regeneration (never deleted)
- ✅ **Automatically merged** into generated files
- ✅ **Tracked** in `superposition.json` manifest

## Use Cases

### Use Case 1: Shared Workspace Mounts

**Problem**: Your project depends on shared libraries in a sibling directory.

**Solution**:

```json
// .devcontainer/custom/devcontainer.patch.json
{
  "mounts": [
    "source=${localWorkspaceFolder}/../shared-libs,target=/workspace/libs,type=bind,readonly"
  ]
}
```

### Use Case 2: Custom Post-Start Script

**Problem**: You need to initialize proprietary tools on every container start.

**Solution**:

```bash
# .devcontainer/custom/scripts/post-start.sh
#!/bin/bash
echo "Initializing proprietary tools..."
/usr/local/bin/custom-tool init
```

### Use Case 3: Additional Docker Compose Service

**Problem**: You need MinIO for local S3 testing, but it's not a standard overlay.

**Solution**:

```yaml
# .devcontainer/custom/docker-compose.patch.yml
services:
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    networks:
      - devnet
```

### Use Case 4: Team Config vs Personal Config

**Scenario**: Team uses standardized overlays, but you have personal preferences.

**Solution**:

```json
// .devcontainer/custom/devcontainer.patch.json (in .gitignore)
{
  "customizations": {
    "vscode": {
      "extensions": [
        "eamodio.gitlens",
        "myorg.personal-extension"
      ],
      "settings": {
        "editor.fontSize": 14
      }
    }
  }
}
```

**Tip**: Add `.devcontainer/custom/` to `.gitignore` for personal config, or commit it for team config.

## Workflow Examples

### Initial Generation

```bash
# 1. Generate devcontainer
npm run init -- --stack compose --language nodejs --database postgres

# 2. Test the generated devcontainer
# Open in VS Code: Dev Containers: Reopen in Container

# 3. Add customizations
mkdir -p .devcontainer/custom
cat > .devcontainer/custom/devcontainer.patch.json << EOF
{
  "mounts": ["source=\${localWorkspaceFolder}/../shared,target=/workspace/shared,type=bind"]
}
EOF

# 4. Regenerate to apply customizations
npm run init -- --from-manifest .devcontainer/superposition.json
# (Select same overlays or add new ones)

# 5. Customizations are now applied ✅
```

### Regeneration Workflow

```bash
# You want to add Redis to an existing setup

# 1. Check current configuration
cat .devcontainer/superposition.json

# 2. Regenerate from manifest
npm run init -- --from-manifest .devcontainer/superposition.json

# 3. In the questionnaire, select:
#    - Keep existing: nodejs, postgres
#    - Add new: redis
#
# 4. Custom patches are automatically preserved and merged ✅
```

### Migrating Manual Changes

If you've already made manual changes to generated files:

```bash
# 1. Extract your manual changes into custom patches

# Example: You manually added a mount to devcontainer.json
# Extract it:
cat .devcontainer/devcontainer.json | jq '.mounts' > /tmp/mounts.json

# Create custom patch:
mkdir -p .devcontainer/custom
cat > .devcontainer/custom/devcontainer.patch.json << EOF
{
  "mounts": $(cat /tmp/mounts.json)
}
EOF

# 2. Regenerate (your changes will now be preserved)
npm run init -- --from-manifest .devcontainer/superposition.json

# 3. Verify custom patches were applied
cat .devcontainer/devcontainer.json | jq '.mounts'
```

## Advanced Topics

### Custom Files Copying

Files in `.devcontainer/custom/files/` are automatically copied during generation:

```
.devcontainer/custom/files/schema.sql
  → Copied to .devcontainer/schema.sql

.devcontainer/custom/files/configs/app.yml
  → Copied to .devcontainer/configs/app.yml
```

**Use case**: Seed data, configuration templates, helper scripts.

### Script Execution Order

Lifecycle scripts are executed in this order:

**postCreateCommand** (one-time):
1. Overlay setup scripts (e.g., `setup-nodejs.sh`)
2. Custom post-create script (`custom/scripts/post-create.sh`)

**postStartCommand** (every start):
1. Overlay verify scripts (e.g., `verify-nodejs.sh`)
2. Custom post-start script (`custom/scripts/post-start.sh`)

### Manifest Tracking

The `superposition.json` manifest tracks whether customizations are present:

```json
{
  "version": "0.1.0",
  "baseTemplate": "compose",
  "overlays": ["nodejs", "postgres"],
  "customizations": {
    "enabled": true,
    "location": ".devcontainer/custom"
  }
}
```

This helps tools understand that custom patches are in use.

## Best Practices

### ✅ Do

- **Use custom patches for project-specific needs** that don't belong in standard overlays
- **Keep custom patches minimal** - only override what's necessary
- **Document your customizations** in comments within patch files
- **Test regeneration** to ensure custom patches apply correctly
- **Commit custom patches** for team configurations, `.gitignore` for personal configs

### ❌ Don't

- **Don't override critical overlay settings** unless absolutely necessary
- **Don't use custom patches for things that should be overlays** - contribute overlays instead
- **Don't ignore errors** from custom patch application - they indicate conflicts
- **Don't hardcode secrets** in custom patches - use `.env` files

## Troubleshooting

### Custom Patches Not Applied

**Symptom**: Regeneration doesn't include custom changes.

**Solution**:
1. Verify custom directory exists: `ls .devcontainer/custom/`
2. Check patch file syntax: `jq . .devcontainer/custom/devcontainer.patch.json`
3. Look for error messages during generation
4. Verify manifest tracking: `cat .devcontainer/superposition.json | jq .customizations`

### Merge Conflicts

**Symptom**: Custom patch conflicts with overlay settings.

**Solution**:
- Custom patches are applied **last**, so they take precedence
- If conflicts occur, check console output for warnings
- Use deep merge strategy - objects merge, primitives override

### Scripts Not Executing

**Symptom**: Custom scripts don't run.

**Solution**:
1. Ensure scripts are executable: `chmod +x .devcontainer/custom/scripts/*.sh`
2. Verify scripts are referenced in devcontainer.json:
   ```bash
   cat .devcontainer/devcontainer.json | jq '.postCreateCommand'
   ```
3. Check script paths are correct (relative to workspace root)

## Examples

### Example 1: Monorepo with Shared Dependencies

```json
// .devcontainer/custom/devcontainer.patch.json
{
  "mounts": [
    "source=${localWorkspaceFolder}/../packages/shared,target=/workspace/shared,type=bind,readonly",
    "source=${localWorkspaceFolder}/../packages/utils,target=/workspace/utils,type=bind,readonly"
  ],
  "remoteEnv": {
    "MONOREPO_ROOT": "/workspace"
  }
}
```

### Example 2: Custom Development Tools

```bash
# .devcontainer/custom/scripts/post-create.sh
#!/bin/bash

# Install custom linter
npm install -g @myorg/custom-linter

# Set up git hooks
cd /workspace
git config core.hooksPath .devcontainer/custom/files/git-hooks

# Initialize database with custom schema
psql -h postgres -U postgres -d myapp -f .devcontainer/custom/files/schema.sql
```

### Example 3: Development Environment Variables

```bash
# .devcontainer/custom/environment.env

# Feature flags for development
FEATURE_NEW_UI=enabled
FEATURE_EXPERIMENTAL_API=enabled

# API endpoints
API_BASE_URL=http://localhost:3000
AUTH_SERVICE_URL=http://localhost:4000

# Debug settings
DEBUG=app:*
LOG_LEVEL=debug
```

## See Also

- [Overlay Authoring Guide](../.github/instructions/overlay-authoring.instructions.md)
- [DevContainer Specification](https://containers.dev/)
