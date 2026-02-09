# Custom Patches Example

This example demonstrates how to use custom patches to preserve project-specific customizations across regenerations.

## Scenario

You're working on a Node.js API that:

1. Uses shared libraries from a sibling directory
2. Needs MinIO for local S3 testing
3. Has custom environment variables for feature flags
4. Requires a custom initialization script

## Initial Setup

Generate the base devcontainer:

```bash
npm run init -- --stack compose --language nodejs --database postgres
```

## Add Custom Patches

### 1. Create Custom Directory

```bash
mkdir -p .devcontainer/custom/scripts
```

### 2. Add Custom Devcontainer Patch

File: `.devcontainer/custom/devcontainer.patch.json`

```json
{
    "mounts": [
        "source=${localWorkspaceFolder}/../shared-utils,target=/workspace/shared-utils,type=bind,readonly"
    ],
    "customizations": {
        "vscode": {
            "extensions": ["eamodio.gitlens"]
        }
    }
}
```

### 3. Add Custom Docker Compose Service

File: `.devcontainer/custom/docker-compose.patch.yml`

```yaml
services:
    minio:
        image: minio/minio:latest
        command: server /data --console-address ":9001"
        ports:
            - '9000:9000'
        networks:
            - devnet
```

### 4. Add Custom Environment Variables

File: `.devcontainer/custom/environment.env`

```bash
# Feature Flags
FEATURE_S3_STORAGE=enabled
S3_ENDPOINT=http://minio:9000
```

## Regenerate with Customizations

Add Redis to your stack:

```bash
npm run init -- --from-manifest .devcontainer/superposition.json
# Select redis in addition to existing overlays
```

## Result

After regeneration, all custom patches are preserved and merged! ✅

See [docs/custom-patches.md](../custom-patches.md) for complete documentation.
