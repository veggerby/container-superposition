# Minimal Mode and Editor Profiles

Container Superposition provides options to customize the generated development environment based on your needs and preferences.

## Minimal Mode

Use `--minimal` to generate lean configurations by excluding optional overlays.

### Usage

```bash
# Generate minimal configuration
container-superposition init --minimal

# With other options
container-superposition init --stack plain --language nodejs --minimal

# Compare: Normal vs Minimal
container-superposition init --language nodejs --dev-tools modern-cli-tools,git-helpers,codex
# ✓ Includes: nodejs, modern-cli-tools, git-helpers, codex

container-superposition init --language nodejs --dev-tools modern-cli-tools,git-helpers,codex --minimal
# ✓ Includes: nodejs (essential)
# ✗ Excludes: modern-cli-tools, git-helpers, codex (marked as optional)
```

### What Gets Excluded

Overlays marked with `minimal: true` in their `overlay.yml` are excluded in minimal mode:

- **modern-cli-tools** — Enhanced CLI tools (jq, yq, ripgrep, fd, bat)
- **git-helpers** — Git LFS, GitHub CLI, GPG/SSH support
- **codex** — AI-powered coding assistant

Essential overlays (languages, databases, required tools) are always included.

### When to Use Minimal Mode

**CI/CD Environments:**
```bash
container-superposition init --minimal --stack compose --language nodejs --database postgres
```

**Resource-Constrained Codespaces:**
```bash
container-superposition init --minimal --target codespaces --language python
```

**Learning/Tutorials:**
```bash
container-superposition init --minimal --stack plain --language nodejs
```

**Production-like Environments:**
```bash
container-superposition init --minimal --stack compose --language dotnet --database sqlserver
```

### Marking Overlays as Optional

When creating overlays, add `minimal: true` to mark them as optional:

```yaml
# overlays/modern-cli-tools/overlay.yml
id: modern-cli-tools
name: Modern CLI Tools
description: Enhanced command-line tools
category: dev
minimal: true  # Excluded in minimal mode
```

## Editor Profiles

Use `--editor` to choose which editor customizations to include.

### Usage

```bash
# VS Code (default) - Include VS Code extensions and settings
container-superposition init --editor vscode

# None - CLI-only, no editor customizations
container-superposition init --editor none

# JetBrains - Skip VS Code customizations (reserved for future JetBrains support)
container-superposition init --editor jetbrains
```

### Available Profiles

#### vscode (Default)

Includes VS Code extensions and settings from overlays.

```json
{
    "customizations": {
        "vscode": {
            "extensions": [
                "dbaeumer.vscode-eslint",
                "esbenp.prettier-vscode"
            ],
            "settings": {
                "editor.defaultFormatter": "esbenp.prettier-vscode"
            }
        }
    }
}
```

#### none

Removes all editor customizations. Useful for:
- CI/CD containers
- Server environments
- Terminal-only workflows
- Using different editors (vim, emacs, etc.)

```json
{
    // No customizations field
}
```

#### jetbrains

Removes VS Code customizations. Reserved for future JetBrains-specific settings (Gateway, Fleet, etc.).

```json
{
    // No vscode customizations
    // Future: JetBrains-specific settings could be added here
}
```

### When to Use Editor Profiles

**Terminal Workflows:**
```bash
container-superposition init --editor none --language python
```

**JetBrains IDEs:**
```bash
container-superposition init --editor jetbrains --language java
```

**CI/CD (no editor needed):**
```bash
container-superposition init --editor none --minimal --language nodejs
```

## Combining Flags

Both flags can be used together:

```bash
# Minimal, CLI-only configuration
container-superposition init --minimal --editor none --language nodejs

# Resource-efficient Codespaces setup
container-superposition init --minimal --editor vscode --target codespaces --language python

# Lean JetBrains environment
container-superposition init --minimal --editor jetbrains --language java
```

## Examples

### Minimal Node.js for CI

```bash
container-superposition init \
  --minimal \
  --editor none \
  --stack plain \
  --language nodejs \
  --output .devcontainer
```

**Result:** Bare-bones Node.js environment, no extras, no editor extensions.

### Full-Featured Local Development

```bash
container-superposition init \
  --editor vscode \
  --stack compose \
  --language nodejs \
  --database postgres \
  --dev-tools docker-sock,git-helpers,modern-cli-tools,pre-commit \
  --observability prometheus,grafana
```

**Result:** Complete development environment with all tools and VS Code extensions.

### Codespaces-Optimized Setup

```bash
container-superposition init \
  --minimal \
  --editor vscode \
  --target codespaces \
  --stack compose \
  --language python \
  --database postgres
```

**Result:** Lean Codespaces environment with essential tools and VS Code extensions.

## Manifest Support

Both settings are stored in `superposition.json`:

```json
{
    "version": "0.1.0",
    "generated": "2026-02-13T09:00:00.000Z",
    "minimal": true,
    "editor": "none",
    "overlays": ["nodejs"]
}
```

Use `container-superposition regen` to regenerate from manifest:

```bash
# Regenerate with same settings
container-superposition regen
```

## See Also

- [CLI Reference](../README.md#cli-usage)
- [Overlay Authoring](creating-overlays.md)
- [Deployment Targets](deployment-targets.md)
