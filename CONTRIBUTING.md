# Contributing to Container Superposition

## Getting Started

### Development Environment

This repository uses Container Superposition to generate its own development environment (dogfooding!).

**Using Devcontainer (Recommended):**

1. Open the repository in VS Code
2. Click "Reopen in Container" when prompted
3. Everything is pre-configured: Node.js, TypeScript, Docker, Git tools

The devcontainer configuration is in `.devcontainer/` and was generated using:

```bash
npm run init -- --stack plain --language nodejs --dev-tools codex,docker-sock,git-helpers,modern-cli-tools
```

**Without Devcontainer:**

```bash
npm install       # Install dependencies
npm run build     # Compile TypeScript
npm run init      # Run the tool
npm test          # Run tests
```

### Project Structure

```
container-superposition/
├── scripts/           # CLI entry points (init.ts)
├── tool/              # Core composition logic
│   ├── questionnaire/ # Overlay composer
│   ├── schema/        # TypeScript types
│   └── __tests__/     # Unit tests
├── templates/         # Base templates (plain, compose)
├── overlays/          # All available overlays
├── features/          # Custom devcontainer features
└── docs/              # Documentation
```

## Adding a New Overlay

Overlays are small, composable configuration fragments that add specific capabilities.

### 1. Create the Overlay Directory

```bash
mkdir -p overlays/my-feature
```

### 2. Create the Overlay Manifest

Create `overlays/my-feature/overlay.yml`:

```yaml
id: my-feature
name: My Feature
description: Brief description of what this overlay provides
category: dev # language, database, observability, cloud, or dev
supports: [] # Empty = works with all stacks, or [compose] for compose-only
requires: [] # Other overlays that must be selected with this one
suggests: [] # Recommended but optional overlays
conflicts: [] # Overlays that cannot be used together with this one
tags:
    - category-tag
    - feature-name
ports: [] # Ports this overlay uses (for documentation)
order: 10 # Optional: Display order within category (lower = first)
```

**Required fields:**

- `id`: Unique identifier (must match directory name, kebab-case)
- `name`: Display name shown in UI (Title Case)
- `description`: One-line summary (no period at end)
- `category`: Where it appears in questionnaire

**Important fields:**

- `category`: Determines where the overlay appears in the questionnaire
- `supports`: Leave empty for both plain/compose, or specify `[compose]` if it requires Docker Compose
- `requires`: Auto-adds dependencies when this overlay is selected
- `conflicts`: Prevents incompatible combinations (e.g., docker-in-docker conflicts with docker-sock)
- `tags`: Keywords for search/filtering (lowercase, kebab-case)

**Optional fields:**

- `order`: Display order within category (default is alphabetical by name)

**📚 Complete schema documentation:**

- JSON Schema: [tool/schema/overlay-manifest.schema.json](../tool/schema/overlay-manifest.schema.json)
- Detailed field guide: [.github/instructions/overlay-index.instructions.md](../.github/instructions/overlay-index.instructions.md)
- Examples: See existing overlays in [overlays/](../overlays/)

### 3. Create the Patch File

Create `overlays/my-feature/devcontainer.patch.json`:

```jsonc
{
    "$schema": "https://raw.githubusercontent.com/devcontainers/spec/main/schemas/devContainer.base.schema.json",
    "features": {
        "ghcr.io/devcontainers/features/some-tool:1": {
            "version": "latest",
        },
        // For cross-distribution packages (Debian/Alpine support)
        "./features/cross-distro-packages": {
            "apt": "pkg1 pkg2", // Debian/Ubuntu package names
            "apk": "pkg1 pkg2", // Alpine package names
        },
    },
    "forwardPorts": [8080],
    "remoteEnv": {
        "MY_TOOL_HOST": "localhost",
        "MY_TOOL_PORT": "8080",
    },
}
```

**Using cross-distro-packages:**

The `cross-distro-packages` feature automatically detects the base distribution and installs the appropriate packages. Use this for system packages that have different names across distributions:

```jsonc
"./features/cross-distro-packages": {
    "apt": "build-essential netcat-traditional dnsutils",  // Debian/Ubuntu
    "apk": "build-base netcat-openbsd bind-tools"          // Alpine
}
```

### 4. Add Docker Compose (Optional)

If your overlay needs a service, create `overlays/my-feature/docker-compose.yml`:

```yaml
version: '3.8'

services:
    my-service:
        image: my-image:latest
        restart: unless-stopped
        ports:
            - '8080:8080'
        volumes:
            - my-data:/data
        networks:
            - devnet

volumes:
    my-data:

networks:
    devnet:
        name: devnet
```

**Important:**

- Always use `name: devnet` (not `external: true`)
- Use service names for inter-container communication (not localhost)

### 5. Add Environment Variables (Optional)

Create `overlays/my-feature/.env.example`:

```bash
# My Feature Configuration
MY_FEATURE_VERSION=latest
MY_FEATURE_PORT=8080
```

This will be automatically merged into the combined `.env.example` file.

### 6. Add Configuration Files (Optional)

Add any config files your service needs:

```bash
overlays/my-feature/
├── devcontainer.patch.json
├── docker-compose.yml
├── .env.example
├── overlay.yml
└── config/
    └── additional-config.json
```

All files except `devcontainer.patch.json`, `overlay.yml`, and `.env.example` will be copied to the output directory.

### 7. Add Setup/Verification Scripts (Optional)

Create `overlays/my-feature/setup.sh` for initialization:

```bash
#!/bin/bash
set -e

echo "Setting up my-feature..."
# Installation or configuration steps
```

Create `overlays/my-feature/verify.sh` for health checks:

```bash
#!/bin/bash
set -e

echo "Verifying my-feature..."
# Health check commands
```

### 8. Update Types (If New Category)

If adding to an existing category, skip this step. If creating a new category, update `tool/schema/types.ts`:

```typescript
// Add to existing type union
export type DevTool = 'docker-in-docker' | 'docker-sock' | 'my-feature';

// Or create new category
export type NewCategory = 'option1' | 'my-feature';
```

### 9. Apply Overlay in Composer (If New Category)

If you created a new category, update `tool/questionnaire/composer.ts` to apply it:

```typescript
// Add application logic for new category
if (answers.myCategory?.includes('my-feature')) {
    await applyOverlay('my-feature', devcontainerPath, composePath, envPath);
}
```

### 10. Document the Overlay

Create `overlays/my-feature/README.md` with usage information:

```markdown
# My Feature Overlay

## What's Included

- Service description
- Ports and endpoints
- Configuration options

## Usage

Connection details and usage examples.

## Environment Variables

- `MY_FEATURE_VERSION` - Version (default: latest)
- `MY_FEATURE_PORT` - Port (default: 8080)
```

### 11. Test

Build and test your overlay:

```bash
npm run build
npm run init -- --stack compose --language my-feature
# Or specify category: --database my-feature, --observability my-feature, etc.
```

Verify the generated `.devcontainer/` configuration works correctly.

## Adding a New Template

Templates are complete starter configurations for specific stacks.

### 1. Create Template Structure

```bash
mkdir -p templates/my-stack/.devcontainer/scripts
```

### 2. Create devcontainer.json

```jsonc
{
    "name": "My Stack Development",
    "image": "mcr.microsoft.com/devcontainers/base:bookworm",
    "features": {
        // Add features from containers.dev
    },
    "customizations": {
        "vscode": {
            "extensions": [],
            "settings": {},
        },
    },
    "postCreateCommand": {
        "install-script": "bash ${containerWorkspaceFolder}/.devcontainer/scripts/post_create.sh",
    },
}
```

### 3. Add Setup Scripts

Create `templates/my-stack/.devcontainer/scripts/post_create.sh`:

```bash
#!/bin/bash
set -e

echo "Setting up my-stack environment..."
# Your setup steps here
```

### 4. Create Template README

Create `templates/my-stack/README.md`:

```markdown
# My Stack Template

## What's Included

- Base image and tools
- Pre-configured extensions
- Development scripts

## Usage

Generated when selecting this stack in the init tool.
```

### 5. Update Types

Edit `tool/schema/types.ts`:

```typescript
export type Stack = 'plain' | 'compose' | 'my-stack';
```

### 6. Register in Overlays Index

Add to `overlays/index.yml` under `base_templates`:

```yaml
base_templates:
    - id: my-stack
      name: My Stack
      description: Description of the stack
```

### 7. Test

```bash
npm run build
npm run init -- --stack my-stack
```

## Testing Your Changes

### Run Unit Tests

```bash
npm test
```

### Run Smoke Tests

```bash
npm run test:smoke
```

### Run Doctor Command

```bash
npm run init -- doctor
```

This validates:

- Environment prerequisites (Node.js, Docker, Docker Compose)
- Overlay integrity (YAML syntax, required files, broken symlinks)
- Manifest compatibility
- Port conflicts

### Test Interactive Mode

```bash
npm run init
```

### Test Non-Interactive Mode

```bash
npm run init -- --stack my-stack --postgres
```

### Verify Output

Check that `.devcontainer/devcontainer.json` is valid JSON and contains expected features.

## Continuous Integration

The repository uses GitHub Actions for automated testing and validation.

### Workflow: Validate Overlays

**Triggers:** Pull requests that modify overlays, tool code, or scripts

**File:** `.github/workflows/validate-overlays.yml`

**Steps:**

1. Run `doctor` command to check environment
2. Run unit tests (`npm test`)
3. Run smoke tests (`npm run test:smoke`)

This ensures all overlay changes are validated before merge.

### Workflow: Validate Documentation

**Triggers:** Pull requests that modify overlays or documentation generation scripts

**File:** `.github/workflows/generate-docs.yml`

**Steps:**

1. Run `npm run docs:generate`
2. Fail if generated documentation is out of sync

This ensures documentation is committed and up-to-date before merge. No auto-commits to main - documentation must be generated and committed as part of the PR.

### Workflow: Build DevContainers

**Triggers:** Push/PR to main branch that modify templates, overlays, or features

**File:** `.github/workflows/build-devcontainers.yml`

**Steps:**

1. Generate devcontainer configurations for various combinations
2. Build actual devcontainer images with DevContainer CLI
3. Verify they build successfully

This validates that overlay combinations work correctly.

### Running CI Locally

Before pushing changes, run the same checks CI will run:

```bash
# Install dependencies
npm ci

# Build TypeScript
npm run build

# Run doctor
npm run init -- doctor

# Run tests
npm test

# Run smoke tests
npm run test:smoke
```

## Guidelines

### Keep It Humble

- **DON'T** add features that require the tool to maintain
- **DON'T** create proprietary schemas or DSLs
- **DO** output plain, editable configurations
- **DO** compose from official containers.dev features when possible

### Overlays Should Be Minimal

- Each overlay should do **one thing**
- Patch files should be < 50 lines
- Use official features, not custom Dockerfiles
- Document environment variables clearly

### Templates Should Be Complete

- Should work immediately after copying
- Include all necessary scripts
- Document customization points
- Keep base images official and maintained

## Release Checklist

Before releasing a new version:

1. [ ] Run `npm test` successfully
2. [ ] Test all templates with init tool
3. [ ] Verify all overlays compose correctly
4. [ ] Update version in package.json
5. [ ] Update CHANGELOG.md
6. [ ] Tag release in git
7. [ ] Publish to npm (if applicable)

## Questions?

Open an issue or discussion on GitHub!
