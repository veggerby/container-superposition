# Codex Overlay

Adds pnpm package manager with a persistent `.codex` folder for configurations and development tools.

## Features

- **pnpm** - Fast, disk space efficient package manager (3x faster than npm)
- **Codex directory** - Creates `/home/vscode/.codex` for persistent configurations
- **Workspace support** - Monorepo support with pnpm workspaces
- **Global package cache** - Shared dependencies across projects
- **Strict mode** - Better dependency resolution

## What is pnpm?

pnpm (performant npm) is a drop-in replacement for npm that:

- **Saves disk space** - Uses a content-addressable store for all packages
- **Faster installations** - Parallel downloads and smart caching
- **Strict dependencies** - Prevents phantom dependencies
- **Workspace support** - Built-in monorepo management

## Environment Variables

- `CODEX_HOME` - Points to `~/.codex` (persistent configurations)
- `PNPM_HOME` - Points to `~/.local/share/pnpm` (global bin directory)
- `PATH` - Includes `$PNPM_HOME` for global packages

**Configured paths:**

- `~/.local/share/pnpm` - pnpm global binaries directory
- `~/.codex` - Personal configuration and tools directory

## How It Works

This overlay:

1. Installs pnpm globally via npm
2. Adds `$PNPM_HOME` to your shell PATH (`.bashrc` and `.zshrc`)
3. Creates the `.codex` directory for persistent configurations
4. Configures environment variables for VS Code and terminal sessions

**After setup:**

- Restart your terminal or run `source ~/.bashrc` (or `~/.zshrc`)
- Global pnpm packages will be available system-wide
- The pnpm command is available in all shells

## Troubleshooting

### pnpm command not found

**Issue:** After installing codex overlay, `pnpm` command is not recognized.

**Solution:**

1. Restart your terminal/shell session:

   ```bash
   # Option 1: Open a new terminal
   # Option 2: Reload shell config
   source ~/.bashrc  # for bash
   source ~/.zshrc   # for zsh
   ```

2. Verify PATH includes pnpm:

   ```bash
   echo $PATH | grep pnpm
   # Should show: /home/vscode/.local/share/pnpm
   ```

3. Check pnpm installation:

   ```bash
   which pnpm
   # Should show: /usr/local/bin/pnpm or similar
   ```

4. If still not working, rebuild the devcontainer:
   - VS Code: `Cmd+Shift+P` → "Dev Containers: Rebuild Container"

### Global packages not found

**Issue:** Globally installed packages not in PATH.

**Solution:**
Global packages are installed to `$PNPM_HOME`. Ensure it's in your PATH:

```bash
# Check PNPM_HOME
echo $PNPM_HOME
# Should show: /home/vscode/.local/share/pnpm

# Add to PATH if missing
export PATH="$PNPM_HOME:$PATH"

# Make permanent by adding to shell config
echo 'export PATH="$PNPM_HOME:$PATH"' >> ~/.bashrc
```

## Common Commands

### Package Management

```bash
# Install all dependencies
pnpm install

# Install specific package
pnpm add express

# Install dev dependency
pnpm add -D typescript

# Install global package
pnpm add -g nodemon

# Remove package
pnpm remove express

# Update packages
pnpm update

# Update interactive
pnpm update --interactive
```

### Running Scripts

```bash
# Run script from package.json
pnpm run dev
pnpm run build
pnpm run test

# Shorthand (no "run" needed)
pnpm dev
pnpm test

# Run with arguments
pnpm test -- --watch

# Execute binary
pnpm exec eslint .
pnpx eslint .  # shorthand
```

### Working with Workspaces

For monorepo projects:

**pnpm-workspace.yaml:**

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

```bash
# Install all workspace dependencies
pnpm install

# Add dependency to specific workspace
pnpm add react --filter @myorg/web

# Run script in all workspaces
pnpm -r run build

# Run script in specific workspace
pnpm --filter @myorg/api dev

# Run script in parallel
pnpm -r --parallel test
```

### Listing and Checking

```bash
# List installed packages
pnpm list

# List global packages
pnpm list -g

# List outdated packages
pnpm outdated

# Check package info
pnpm view react

# Why is package installed?
pnpm why lodash

# Audit dependencies
pnpm audit
```

## pnpm vs npm/yarn

### Performance Comparison

| Operation | npm | yarn | pnpm |
|-----------|-----|------|------|
| Install (cold) | 51s | 37s | 24s |
| Install (warm) | 19s | 14s | 8s |
| Disk space | 100% | 85% | 35% |

### Key Differences

**pnpm advantages:**

- **Hard links** - Single copy of each package version
- **Non-flat node_modules** - Prevents phantom dependencies
- **Built-in workspace** - No extra tools needed
- **Strict by default** - Better dependency management

**Migration from npm:**

```bash
# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Install with pnpm
pnpm install
```

**Migration from yarn:**

```bash
# Remove node_modules and yarn.lock
rm -rf node_modules yarn.lock

# Import dependencies
pnpm import

# Install
pnpm install
```

## Configuration

### Project Configuration

Create `.npmrc` in project root:

```ini
# Use strict peer dependencies
strict-peer-dependencies=true

# Auto install peers
auto-install-peers=true

# Shamefully hoist (for compatibility)
shamefully-hoist=false

# Public registry
registry=https://registry.npmjs.org/

# Save exact versions
save-exact=true
```

### Global Configuration

Located at `~/.npmrc`:

```ini
# Global store directory
store-dir=/home/vscode/.pnpm-store

# Global bin directory
global-bin-dir=/home/vscode/.local/bin
```

## Use Cases

### Single Package Project

```bash
# Create new project
mkdir my-app && cd my-app
pnpm init

# Add dependencies
pnpm add express
pnpm add -D typescript @types/node

# Create script
echo '{"scripts": {"dev": "node index.js"}}' > package.json

# Run
pnpm dev
```

### Monorepo Project

```
my-monorepo/
├── pnpm-workspace.yaml
├── package.json
├── packages/
│   ├── web/
│   │   └── package.json
│   └── api/
│       └── package.json
└── apps/
    └── mobile/
        └── package.json
```

**pnpm-workspace.yaml:**

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

```bash
# Install all dependencies
pnpm install

# Run build in all packages
pnpm -r run build

# Run dev in specific package
pnpm --filter web dev
```

### Global Tools

```bash
# Install global tools
pnpm add -g typescript
pnpm add -g nodemon
pnpm add -g eslint

# Use global tools
tsc --version
nodemon app.js
eslint .
```

## Optional: Persistent .codex Mount

To share your `.codex` configurations between your host and container, first create the directory on your host:

```bash
mkdir -p ~/.codex
```

Then add this mount to your `devcontainer.json`:

```json
"mounts": [
  "source=${localEnv:HOME}${localEnv:USERPROFILE}/.codex,target=/home/vscode/.codex,type=bind,consistency=cached"
]
```

This allows you to:

- Share Codex configurations across multiple devcontainers
- Persist configurations on your host machine
- Maintain consistent global tools across projects

**Important**: Only add this mount after creating the `~/.codex` directory on your host. Otherwise, the container may fail to start.

## Troubleshooting

### pnpm command not found

Rebuild container:

- **VS Code:** `Cmd+Shift+P` → "Dev Containers: Rebuild Container"

### EACCES permission errors

```bash
# Fix global directory permissions
mkdir -p ~/.local/bin
pnpm config set global-bin-dir ~/.local/bin
```

### Phantom dependency errors

This is actually good! pnpm prevents using dependencies you haven't explicitly installed.

```bash
# Add the missing dependency
pnpm add missing-package

# Or hoist if needed (not recommended)
echo 'shamefully-hoist=true' >> .npmrc
```

### Peer dependency warnings

```bash
# Auto-install peer dependencies
echo 'auto-install-peers=true' >> .npmrc
pnpm install

# Or install manually
pnpm add peer-dependency
```

### Store corruption

```bash
# Verify store integrity
pnpm store status

# Prune unreferenced packages
pnpm store prune
```

## Best Practices

1. **Use exact versions** - Set `save-exact=true` in .npmrc
2. **Commit pnpm-lock.yaml** - Ensures reproducible builds
3. **Use workspaces** - For monorepos instead of lerna
4. **Enable strict mode** - Catch dependency issues early
5. **Regular updates** - Run `pnpm update` regularly
6. **Audit dependencies** - Run `pnpm audit` before releases
7. **Use .npmrc** - Configure project-specific settings

## Advanced Features

### Patches

Apply patches to packages:

```bash
# Create patch
pnpm patch package-name@version

# Edit files in opened directory

# Commit patch
pnpm patch-commit /path/to/patched/package
```

### Catalogs

Share dependency versions across workspaces:

**pnpm-workspace.yaml:**

```yaml
packages:
  - 'packages/*'

catalog:
  react: ^18.0.0
  typescript: ^5.0.0
```

**package.json:**

```json
{
  "dependencies": {
    "react": "catalog:"
  }
}
```

### Overrides

Force specific versions:

**package.json:**

```json
{
  "pnpm": {
    "overrides": {
      "lodash": "^4.17.21"
    }
  }
}
```

## Related Overlays

- **nodejs** - Required for running pnpm and Node.js projects
- **typescript** - Often used with pnpm for TypeScript projects
- **docker-sock/docker-in-docker** - For containerized builds

## Additional Resources

- [pnpm Documentation](https://pnpm.io/)
- [pnpm CLI Reference](https://pnpm.io/cli/add)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [pnpm vs npm vs yarn](https://pnpm.io/benchmarks)
- [Migration Guide](https://pnpm.io/installation#using-a-shorter-alias)
