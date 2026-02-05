# Publishing to npm

This guide explains how to publish `container-superposition` to npm, making it available via `npx container-superposition init`.

## Prerequisites

### 1. npm Account

```bash
# Create account at https://www.npmjs.com/signup
# Or login if you already have one
npm login
```

### 2. Verify Package Configuration

The package is already configured for publishing. Verify the setup:

```bash
# Check package.json configuration
cat package.json | jq '.name, .version, .bin, .files'
```

**Expected output:**
```json
"container-superposition"
"0.1.0"
{
  "container-superposition": "./dist/scripts/init.js"
}
[
  "dist/",
  "templates/",
  "features/",
  "tool/",
  "README.md",
  "LICENSE"
]
```

### 3. Verify Build Works

```bash
# Clean and rebuild
npm run clean
npm install
npm run build

# Test compiled output
npm run init:build -- --help
```

## Pre-Publish Checklist

### 1. Check Package Name Availability

```bash
# Check if name is available
npm view container-superposition

# If you see "npm error code E404", the name is available ✓
# If you see package info, the name is taken ✗
```

### 2. Run Tests

```bash
# Unit tests
npm test

# Smoke tests
npm run test:smoke
```

### 3. Verify Package Contents

```bash
# Dry run to see what will be published
npm pack --dry-run
```

**Expected contents:**
- ✅ 138 files
- ✅ All overlays (dotnet, nodejs, python, postgres, redis, jaeger, prometheus, grafana, loki, etc.)
- ✅ All templates (plain, compose)
- ✅ All features (local-secrets-manager, project-scaffolder, team-conventions)
- ✅ Compiled dist/ folder
- ✅ Tool configuration (overlays.yml, schema)
- ✅ README and LICENSE

**Package size:**
- Compressed: ~122 KB
- Unpacked: ~462 KB

### 4. Update Version (if needed)

```bash
# First release (already at 0.1.0)
# For subsequent releases:

# Patch release (bug fixes): 0.1.0 → 0.1.1
npm version patch

# Minor release (new features): 0.1.0 → 0.2.0
npm version minor

# Major release (breaking changes): 0.1.0 → 1.0.0
npm version major
```

### 5. Update CHANGELOG.md

Document changes in [CHANGELOG.md](../CHANGELOG.md):

```markdown
## [0.1.0] - 2026-02-05

### Added
- Initial release
- Interactive questionnaire with dependency resolution
- 24+ overlays across languages, databases, observability, cloud tools, dev tools
- Plain and compose base templates
- ...
```

## Publishing

### Option 1: Public Release

```bash
# Build is automatic via prepublishOnly hook
npm publish

# The package will be available at:
# https://www.npmjs.com/package/container-superposition
```

### Option 2: Beta Release (Recommended for First Publish)

Test with a beta tag first:

```bash
# Publish as beta
npm publish --tag beta

# Users install with:
# npx container-superposition@beta init
# or
# npm install -g container-superposition@beta

# When ready to promote to latest:
npm dist-tag add container-superposition@0.1.0 latest
```

### Option 3: Scoped Package (If Name Taken)

If `container-superposition` is unavailable, use a scoped package:

```bash
# Update package.json name to:
# "@veggerby/container-superposition"

# Publish publicly (scoped packages default to private)
npm publish --access public
```

## Post-Publish

### 1. Verify Installation

```bash
# Test npx execution (may take 1-2 minutes to propagate)
npx container-superposition@latest init --help

# Test global installation
npm install -g container-superposition
container-superposition init --help
```

### 2. Create GitHub Release

```bash
# Tag the release
git tag v0.1.0
git push origin v0.1.0

# Create release on GitHub:
# https://github.com/veggerby/container-superposition/releases/new
```

### 3. Update Documentation

Update README.md to reflect published status:

```markdown
## Quick Start

### Via npx (Recommended)
```bash
npx container-superposition init
```

### Or Install Globally
```bash
npm install -g container-superposition
container-superposition init
```
````

## Continuous Publishing

### Automated Releases (Future Enhancement)

Consider GitHub Actions for automated publishing:

```yaml
# .github/workflows/publish.yml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Troubleshooting

### Build Fails

```bash
# Clean everything and rebuild
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Package Size Too Large

Check what's being included:

```bash
npm pack --dry-run | grep "npm notice"
```

Exclude unnecessary files in `.npmignore`:

```
node_modules/
*.log
.DS_Store
.vscode/
.devcontainer/
tmp/
__tests__/
*.test.ts
vitest.config.ts
```

### Permission Errors

```bash
# Verify npm login
npm whoami

# If not logged in:
npm login
```

### Name Already Taken

Options:
1. Use scoped package: `@veggerby/container-superposition`
2. Choose different name: `devcontainer-superposition`, `superposition-dev`, etc.
3. Contact current owner if package is abandoned

### Version Already Published

```bash
# Cannot republish same version
# Bump version and republish:
npm version patch
npm publish
```

## Best Practices

### Versioning Strategy

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes (e.g., removing overlays, changing CLI args)
- **MINOR**: New features (e.g., adding overlays, new CLI options)
- **PATCH**: Bug fixes (e.g., fixing composition logic, updating deps)

### Pre-Release Versions

For experimental features:

```bash
# Create pre-release
npm version 0.2.0-alpha.1

# Publish with tag
npm publish --tag next

# Users install with:
# npx container-superposition@next init
```

### Deprecation

If publishing a new major version:

```bash
# Deprecate old version
npm deprecate container-superposition@0.1.0 "Use v1.0.0 instead"
```

## Unpublishing (Emergency Only)

**⚠️ Only use within 72 hours of publishing:**

```bash
# Unpublish specific version
npm unpublish container-superposition@0.1.0

# Unpublish entire package (use with caution!)
npm unpublish container-superposition --force
```

**Note:** npm discourages unpublishing as it breaks dependents. Prefer deprecation instead.

## References

- [npm Publishing Packages](https://docs.npmjs.com/cli/v10/commands/npm-publish)
- [npm Version Management](https://docs.npmjs.com/cli/v10/commands/npm-version)
- [Semantic Versioning](https://semver.org/)
- [npm Package Lifecycle Scripts](https://docs.npmjs.com/cli/v10/using-npm/scripts#life-cycle-scripts)
