# Custom Patches Example

This example demonstrates how to use custom patches to preserve project-specific customizations across regenerations.

## Scenario

You're working on a Node.js API that:

1. Uses shared libraries from a sibling directory
2. Needs MinIO for local S3 testing
3. Has custom environment variables for feature flags
4. Requires a custom initialization script

## Initial Setup

Create the canonical shared intent, preview its flat overlay selection, then generate:

```yaml
# superposition.yml
stack: compose
overlays:
    - nodejs
    - postgres
```

```bash
npm run init -- plan --stack compose --overlays nodejs,postgres
npm run init -- init --no-interactive
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

Add Redis to the canonical project file, preview the selection, then regenerate:

```bash
npm run init -- plan --stack compose --overlays nodejs,postgres,redis --diff
npm run init -- regen
```

`--from-manifest` is compatibility / migration-only support for legacy receipts;
use `migrate` before returning to project-file replay.

## Result

After regeneration, all custom patches are preserved and merged! ✅

See [docs/custom-patches.md](../custom-patches.md) for complete documentation.
