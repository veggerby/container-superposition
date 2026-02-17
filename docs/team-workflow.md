# Team Collaboration Workflow

This guide explains how to use Container Superposition in a team setting, where you want to standardize development environments without locking developers into specific configurations.

## Overview

The team collaboration workflow separates **team standards** (committed manifest) from **generated files** (local, gitignored) and **personal customizations** (optional, committed).

**Key Benefits:**

- ✅ **No lock-in** - Generated files are plain JSON/YAML, fully editable
- ✅ **One-command onboarding** - New developers run `npx container-superposition regen`
- ✅ **Personal customizations** - Developers can add their own preferences via `.devcontainer/custom/`
- ✅ **Version control friendly** - Only manifest is committed, not generated files
- ✅ **CI validation** - Validate manifest without committing generated files

## Repository Structure

```
my-project/
├── superposition.json       # Committed - team-wide standard
├── .gitignore               # Ignore .devcontainer/ (except custom/)
├── .devcontainer/           # Generated locally, in .gitignore
│   ├── devcontainer.json    # Generated from manifest
│   ├── docker-compose.yml   # Generated from manifest
│   ├── .env.example         # Generated from manifest
│   ├── README.md            # Generated from manifest
│   └── custom/              # Optional - committed personal customizations
│       ├── devcontainer.patch.json
│       └── docker-compose.patch.yml
└── src/                     # Your application code
```

## Step-by-Step Setup

### 1. Create the Team Manifest

The team lead or maintainer creates the initial manifest:

```bash
# Generate manifest only (no .devcontainer/ files)
npx container-superposition init --write-manifest-only \
  --stack compose \
  --language nodejs \
  --database postgres,redis \
  --observability prometheus,grafana
```

This creates `superposition.json` in the current directory:

```json
{
    "manifestVersion": "1",
    "generatedBy": "0.1.2",
    "generated": "2026-02-17T14:00:00.000Z",
    "baseTemplate": "compose",
    "baseImage": "bookworm",
    "overlays": ["nodejs", "postgres", "redis", "prometheus", "grafana"],
    "portOffset": 0
}
```

### 2. Configure Git Ignore

Add the following to your `.gitignore`:

```gitignore
# DevContainer - generated locally from superposition.json
.devcontainer/

# Exception: Allow custom directory (personal customizations)
!.devcontainer/custom/

# Exception: Keep .gitignore itself
!.devcontainer/.gitignore
```

**Recommended:** Also create `.devcontainer/.gitignore` to prevent accidental commits:

```gitignore
# Ignore all generated files
*

# Except custom directory and this .gitignore
!custom/
!.gitignore
```

### 3. Commit the Manifest

```bash
git add superposition.json .gitignore
git commit -m "Add devcontainer manifest for standardized dev environment"
git push
```

### 4. Document for Team Members

Add to your `README.md`:

````markdown
## Development Setup

This project uses [Container Superposition](https://github.com/veggerby/container-superposition) for standardized development environments.

### Prerequisites

- Docker Desktop or Docker Engine
- VS Code with Dev Containers extension

### Setup

1. Clone the repository
2. Generate devcontainer from manifest:
   \```bash
   npx container-superposition regen
   \```
3. Open in VS Code and rebuild container (Command Palette: "Dev Containers: Rebuild Container")

The devcontainer includes:

- Node.js with TypeScript
- PostgreSQL and Redis
- Prometheus and Grafana for observability
````

## Developer Onboarding

New team members follow these steps:

### 1. Clone Repository

```bash
git clone https://github.com/your-org/my-project.git
cd my-project
```

### 2. Generate Devcontainer

```bash
npx container-superposition regen
```

This reads `superposition.json` and generates the `.devcontainer/` folder locally.

### 3. Open in Container

Open the project in VS Code:

```bash
code .
```

Then:

1. Command Palette (`Cmd/Ctrl+Shift+P`)
2. Select "Dev Containers: Rebuild and Reopen in Container"
3. Wait for container to build
4. Start developing!

## Personal Customizations

Developers can add their own customizations without affecting the team standard.

### Example: Add Personal VS Code Extensions

Create `.devcontainer/custom/devcontainer.patch.json`:

```json
{
    "customizations": {
        "vscode": {
            "extensions": ["eamodio.gitlens", "usernamehw.errorlens", "pkief.material-icon-theme"],
            "settings": {
                "editor.fontSize": 14,
                "workbench.colorTheme": "Monokai"
            }
        }
    }
}
```

### Example: Add Personal Docker Compose Service

Create `.devcontainer/custom/docker-compose.patch.yml`:

```yaml
services:
    my-debug-service:
        image: redis-commander:latest
        ports:
            - '8081:8081'
        networks:
            - devnet
```

### Regenerate to Apply

After adding customizations:

```bash
npx container-superposition regen
```

The custom patches are automatically merged with the team standard.

**Commit your customizations:**

```bash
git add .devcontainer/custom/
git commit -m "Add personal dev environment customizations"
```

## Updating the Team Standard

When the team needs to add or remove overlays:

### 1. Update the Manifest

You can either:

**Option A: Manually edit `superposition.json`**

```json
{
    "overlays": [
        "nodejs",
        "postgres",
        "redis",
        "prometheus",
        "grafana",
        "jaeger" // Added
    ]
}
```

**Option B: Regenerate with new settings**

```bash
npx container-superposition init --write-manifest-only \
  --stack compose \
  --language nodejs \
  --database postgres,redis \
  --observability prometheus,grafana,jaeger
```

### 2. Test Locally

```bash
npx container-superposition regen
```

Verify the changes work as expected.

### 3. Commit and Push

```bash
git add superposition.json
git commit -m "Add Jaeger tracing to devcontainer"
git push
```

### 4. Team Members Update

Team members pull the changes and regenerate:

```bash
git pull
npx container-superposition regen
```

Then rebuild their container in VS Code.

## CI/CD Integration

You can validate the manifest in CI without generating files.

### GitHub Actions Example

Create `.github/workflows/validate-devcontainer.yml`:

```yaml
name: Validate DevContainer

on:
    pull_request:
        paths:
            - 'superposition.json'
            - '.github/workflows/validate-devcontainer.yml'

jobs:
    validate:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4

            - name: Setup Node.js
              uses: actions/setup-node@v4
              with:
                  node-version: '20'

            - name: Validate manifest with plan command
              run: |
                  npx container-superposition plan --from-manifest superposition.json

            - name: Generate and smoke test
              run: |
                  npx container-superposition regen --no-interactive
                  # Verify key files exist
                  test -f .devcontainer/devcontainer.json
                  test -f .devcontainer/docker-compose.yml
```

### GitLab CI Example

```yaml
validate-devcontainer:
    image: node:20
    stage: test
    only:
        changes:
            - superposition.json
            - .gitlab-ci.yml
    script:
        - npx container-superposition plan --from-manifest superposition.json
        - npx container-superposition regen --no-interactive
        - test -f .devcontainer/devcontainer.json
```

## Migration from Existing Setup

If you already have a `.devcontainer/` folder:

### 1. Generate Manifest from Existing Config

If you have a `superposition.json` in `.devcontainer/`, move it:

```bash
mv .devcontainer/superposition.json .
```

If you don't have a manifest, create one based on your current setup:

```bash
npx container-superposition init --write-manifest-only \
  --stack compose \
  --language nodejs \
  --database postgres
```

### 2. Backup Existing Config

```bash
mv .devcontainer .devcontainer.old
```

### 3. Generate from Manifest

```bash
npx container-superposition regen
```

### 4. Compare and Migrate Customizations

Compare your old config with the new one:

```bash
diff -r .devcontainer.old .devcontainer
```

Move any custom configurations to `.devcontainer/custom/`:

```bash
mkdir -p .devcontainer/custom
# Move your custom patches
```

### 5. Update Git Ignore

Add `.devcontainer/` to `.gitignore` (except `custom/`).

### 6. Commit Manifest

```bash
git rm -r .devcontainer  # Remove from version control
git add .gitignore superposition.json .devcontainer/custom/
git commit -m "Migrate to manifest-first workflow"
```

## Troubleshooting

### "No manifest found" Error

**Problem:** `npx container-superposition regen` says "No manifest found"

**Solution:** Ensure `superposition.json` exists in:

- Current directory (`./superposition.json`), or
- `.devcontainer/` directory (legacy location)

### Merge Conflicts in Generated Files

**Problem:** Developers have merge conflicts in `.devcontainer/devcontainer.json`

**Solution:** This shouldn't happen if `.devcontainer/` is gitignored. If it does:

1. Ensure `.devcontainer/` is in `.gitignore`
2. Remove from version control: `git rm -r --cached .devcontainer/`
3. Each developer runs: `npx container-superposition regen`

### Custom Patches Not Applied

**Problem:** Changes in `.devcontainer/custom/` aren't showing up

**Solution:**

1. Verify custom patches are valid JSON/YAML
2. Run `npx container-superposition regen` to regenerate
3. Check that custom directory is not in `.gitignore`

### Port Conflicts

**Problem:** Multiple team members running containers on same machine

**Solution:** Each developer can use a different port offset:

```bash
# Developer A (no offset)
npx container-superposition regen

# Developer B (offset +100)
npx container-superposition init --from-manifest superposition.json \
  --port-offset 100 --output .devcontainer
```

Or create personal manifests with different offsets in `.devcontainer/custom/`.

## Best Practices

### 1. Document Requirements in README

Always document the prerequisites and setup steps in your project's README.

### 2. Keep Manifest Minimal

Only include overlays the team actually needs. Developers can add extras via custom patches.

### 3. Use Presets for Common Stacks

If your team uses a standard stack, use presets:

```bash
npx container-superposition init --write-manifest-only --preset web-api
```

### 4. Version Control Custom Directory

Commit `.devcontainer/custom/` to let developers share useful customizations:

```bash
git add .devcontainer/custom/
git commit -m "Share useful debug extensions"
```

### 5. Regular Updates

Periodically update overlays to get security patches and new features:

```bash
# Update tool
npm update container-superposition

# Regenerate
npx container-superposition regen
```

### 6. Test Before Committing

Always test manifest changes locally before committing:

```bash
# Make changes to superposition.json
npx container-superposition regen
# Test in container
# If good, commit
git add superposition.json
git commit -m "Update devcontainer manifest"
```

## Advanced: Monorepo Setup

For monorepos with multiple services:

```
monorepo/
├── superposition.json              # Shared base manifest
├── service-a/
│   ├── superposition.json          # Service-specific manifest (extends base)
│   └── .devcontainer/              # Generated locally
├── service-b/
│   ├── superposition.json
│   └── .devcontainer/
└── .gitignore                      # Ignore all .devcontainer/ folders
```

Each service can have its own manifest that extends the base:

**service-a/superposition.json:**

```json
{
    "baseTemplate": "compose",
    "baseImage": "bookworm",
    "overlays": ["nodejs", "postgres"]
}
```

**service-b/superposition.json:**

```json
{
    "baseTemplate": "compose",
    "baseImage": "bookworm",
    "overlays": ["python", "redis", "rabbitmq"]
}
```

Developers work on specific services:

```bash
cd service-a
npx container-superposition regen
code .
```

## See Also

- [Quick Reference](quick-reference.md) - Common commands and flags
- [Overlay Documentation](overlays.md) - Available overlays
- [Custom Patches](../tool/README.md#custom-patches) - Custom patch format
