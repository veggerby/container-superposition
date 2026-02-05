# Node.js Overlay

Adds Node.js LTS with TypeScript, modern tooling, and customizable global packages.

## Features

- **Node.js LTS** (currently 20.x)
- **Package Managers:** npm (built-in), pnpm (via global-packages.txt)
- **VS Code Extensions:**
  - ESLint (dbaeumer.vscode-eslint)
  - Prettier (esbenp.prettier-vscode)
  - npm Intellisense (christian-kohler.npm-intellisense)
- **Automatic install:** Runs `npm install` on container creation
- **Global Packages:** Configured via `global-packages.txt`

## Customizing Global Packages

The overlay includes a customizable `global-packages.txt` file in `.devcontainer/`:

**`.devcontainer/global-packages.txt`:**
```
# Node.js Global Packages
# Format: one package per line, with optional version
# Example: typescript@5.3.0

# pnpm - Fast package manager
pnpm

# Add your custom global packages here
typescript
ts-node
nodemon
eslint
prettier
```

### Version Pinning

Pin specific versions using `@`:
```
typescript@5.3.0
pnpm@8.10.0
eslint@8.50.0
```

**Rebuild container** after editing to install new packages.

## Common Global Packages

### Development Tools
- `pnpm` - Fast, disk-efficient package manager
- `typescript` - TypeScript compiler
- `ts-node` - TypeScript execution engine
- `tsx` - Modern TypeScript runner

### Process Management
- `nodemon` - Auto-restart on file changes
- `pm2` - Production process manager
- `concurrently` - Run multiple commands

### Code Quality
- `eslint` - JavaScript linter
- `prettier` - Code formatter
- `@biomejs/biome` - All-in-one toolchain

### Build & Bundle
- `vite` - Modern build tool
- `esbuild` - Fast bundler
- `webpack-cli` - Webpack command line

### Testing
- `vitest` - Fast test runner
- `jest` - Testing framework

## Project Structure

Works with:
- **package.json** - Project dependencies
- **package-lock.json** (npm)
- **pnpm-lock.yaml** (pnpm)
- **yarn.lock** (yarn)

## Automatic Setup

On container creation:
1. ✅ Installs global packages from `global-packages.txt`
2. ✅ Runs `npm install` (if package.json exists)
3. ✅ Verifies installations

## Common Workflows

### Using pnpm

```bash
pnpm install        # Install dependencies
pnpm add express    # Add dependency
pnpm run dev        # Run dev script
```

### TypeScript Development

```bash
# Global tools approach
npm install -g typescript ts-node
tsc --init
ts-node src/index.ts

# Local tools approach (recommended)
npm install --save-dev typescript ts-node
npx tsc --init
npx ts-node src/index.ts
```

### Running Multiple Processes

With `concurrently` installed globally:
```bash
concurrently "npm run api" "npm run web"
```

## Package Manager Choice

### npm (Default)
- ✅ Built-in, no setup
- ✅ Widely compatible
- ❌ Slower, larger node_modules

### pnpm (Recommended)
- ✅ Fast, efficient disk usage
- ✅ Strict dependency resolution
- ✅ Workspace support
- ⚠️ Some compatibility edge cases

### yarn
- Add to `global-packages.txt`: `yarn`

## Best Practices

1. **Prefer local over global** - Use `devDependencies` in package.json
2. **Lock file** - Commit package-lock.json / pnpm-lock.yaml
3. **Use `.nvmrc`** or `engines` in package.json for Node version
4. **scripts in package.json** - Better than global commands

## Troubleshooting

### Package not found after adding to global-packages.txt

Rebuild the container:
- **VS Code:** `Cmd+Shift+P` → "Dev Containers: Rebuild Container"

### pnpm vs npm conflict

Choose one and stick with it. Delete the other's lock file.

### Node version mismatch

Check `.nvmrc` or `package.json` engines field matches container Node version.

### Want to use different Node version?

Update `devcontainer.patch.json`:
```json
{
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "18"  // or "20", "21", etc.
    }
  }
}
```

## Related Overlays

- **postgres** - PostgreSQL for Node.js apps
- **redis** - Session storage, caching
- **playwright** - E2E testing
- **codex** - Alternative with pnpm + .codex mount
