# AGENTS.md

## Project Overview

Container Superposition is a **modular, overlay-based devcontainer scaffolding system** that composes working development environments from minimal base templates and composable capability overlays.

**Key Technologies:**
- **Runtime**: Node.js 18+ with TypeScript 5.3.3 (compiled to ESM modules in `dist/`)
- **CLI Framework**: Commander for argument parsing, Inquirer for interactive prompts
- **UI Libraries**: chalk (terminal colors), boxen (borders), ora (spinners)
- **Configuration**: YAML-based overlay metadata (`overlays/index.yml`)
- **Build System**: TypeScript compiler with source maps and declarations
- **Architecture**: JSON Patch-based composition system for devcontainer configurations

**Core Concepts:**
1. **Base Templates**: Minimal starting points (`plain` for single image, `compose` for multi-service)
2. **Overlays**: Modular capability fragments (languages, databases, observability, cloud tools, dev tools)
3. **Composition Engine**: Merges overlays into final devcontainer.json using JSON patch operations
4. **Dependency Tracking**: Automatic resolution of required dependencies and conflict detection
5. **Port Management**: Configurable port offsets to avoid conflicts when running multiple instances

## Setup Commands

```bash
# Clone repository
git clone https://github.com/veggerby/container-superposition.git
cd container-superposition

# Install dependencies
npm install

# Build TypeScript to dist/
npm run build

# Run interactive CLI from TypeScript sources (development)
npm run init

# Run from compiled output (production)
npm run init:build
# or directly:
node dist/scripts/init.js
```

## Development Workflow

### Interactive Development

```bash
# Start interactive questionnaire (development mode with tsx)
npm run init

# With CLI arguments (skip questionnaire)
npm run init -- --stack compose --language nodejs --database postgres --observability otel-collector,jaeger --output ./my-project
```

### Building and Testing

```bash
# Compile TypeScript to dist/
npm run build

# Run tests (Vitest)
npm test

# Run tests in watch mode
npm test:watch

# Smoke test generated devcontainers
npm run test:smoke

# Generate documentation
npm run docs:generate

# Clean build artifacts
npm run clean
```

### Path Resolution Strategy

The codebase uses **candidate arrays** to resolve paths correctly in both development (TypeScript sources) and production (compiled dist/) modes:

**Example from init.ts:**
```typescript
const OVERLAYS_CONFIG_CANDIDATES = [
  path.join(__dirname, '..', 'tool', 'overlays/index.yml'),      // ts-node: <root>/scripts
  path.join(__dirname, '..', '..', 'tool', 'overlays/index.yml'), // compiled: <root>/dist/scripts
];

const OVERLAYS_CONFIG_PATH = OVERLAYS_CONFIG_CANDIDATES.find(fs.existsSync) ?? OVERLAYS_CONFIG_CANDIDATES[0];
```

**Always use this pattern when adding new file resolution logic.**

## Testing Instructions

### Unit Tests

```bash
# Run all tests
npm test

# Run tests in watch mode for development
npm test:watch

# Focus on specific test file
npm test -- path/to/test.spec.ts

# Focus on specific test case (Vitest pattern matching)
npm test -- -t "test name pattern"
```

### Smoke Tests

```bash
# Test actual devcontainer generation
npm run test:smoke
```

### Test File Locations

- Unit tests: `tool/__tests__/**/*.test.ts`
- Test configuration: `vitest.config.ts`
- Smoke test script: `scripts/test.sh`

### Coverage

```bash
# Generate coverage report
npm test -- --coverage
```

## Code Style Guidelines

### TypeScript Conventions

- **Module System**: ESM with `.js` extensions in imports (required for Node.js ESM compatibility)
- **Type Imports**: Use `import type { ... }` for type-only imports
- **Strict Mode**: `strict: true` in tsconfig.json
- **No Unused Variables**: Enforced via TypeScript compiler

### File Organization

```
scripts/           # CLI entry points (init.ts)
tool/
  ├── questionnaire/  # Core composition logic (composer.ts)
  ├── overlays/       # Overlay definitions (each with README, patches, configs)
  ├── schema/         # TypeScript types and JSON schema
  └── docs/           # Documentation generation
templates/          # Base templates (plain, compose)
features/           # Custom devcontainer features
```

### Naming Conventions

- **Files**: kebab-case (`overlay-metadata.ts`)
- **Functions**: camelCase (`composeDevContainer()`)
- **Types/Interfaces**: PascalCase (`OverlayMetadata`, `QuestionnaireAnswers`)
- **Constants**: SCREAMING_SNAKE_CASE (`OVERLAYS_CONFIG_PATH`)

### Import Patterns

```typescript
// External dependencies first
import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';

// Internal type imports
import type { QuestionnaireAnswers, Stack } from '../tool/schema/types.js';

// Internal module imports
import { composeDevContainer } from '../tool/questionnaire/composer.js';
```

### Error Handling

- Use `try-catch` for file I/O operations
- Provide user-friendly error messages with chalk.red()
- Exit with non-zero code on fatal errors: `process.exit(1)`

## Build and Deployment

### Build Process

```bash
# Compile TypeScript
npm run build
```

**Output:**
- Compiled JavaScript: `dist/` (mirrors source structure)
- Type declarations: `*.d.ts` files alongside JS
- Source maps: `*.js.map` for debugging

### TypeScript Configuration

- **Target**: ES2022
- **Module**: ESM (NodeNext)
- **Source Maps**: Enabled
- **Declarations**: Enabled (`*.d.ts` files generated)

### Pre-publish Steps

The `prepublishOnly` script automatically runs before npm publish:

```bash
npm run build  # Ensures dist/ is up-to-date
```

### Package Distribution

```json
{
  "main": "dist/scripts/init.js",
  "bin": {
    "container-superposition": "./dist/scripts/init.js"
  },
  "files": [
    "dist/",
    "templates/",
    "tool/",
    "features/"
  ]
}
```

**Important**: The `.npmignore` file explicitly includes `dist/` to ensure compiled output is published.

## Architecture Deep Dive

### Overlay System

Overlays are defined in `overlays/index.yml` with the following structure:

```yaml
language_overlays:
  - id: nodejs
    name: Node.js
    description: Node.js LTS with TypeScript and tooling
    category: language
    supports: []        # Empty = supports all stacks
    requires: []        # Dependencies that must be selected
    suggests: []        # Recommended but optional
    conflicts: []       # Cannot be used with these overlays
    tags: [language, nodejs, typescript]
    ports: []
```

**Category Hierarchy:**
1. `language` - Programming language/framework (nodejs, dotnet, python, mkdocs)
2. `database` - Database services (postgres, redis)
3. `observability` - Monitoring/tracing tools (otel-collector, jaeger, prometheus, grafana, loki)
4. `cloud` - Cloud provider CLIs (aws-cli, azure-cli, kubectl-helm)
5. `devtool` - Development utilities (docker-in-docker, docker-sock, playwright, codex)

### Dependency Resolution Algorithm

Located in `scripts/init.ts` (lines 230-260), the system:

1. **User Selection**: Multi-select checkbox grouped by category
2. **Recursive Dependency Addition**: For each selected overlay:
   - Check `requires` field
   - Auto-add dependencies (marked with `(required)` in yellow)
   - Recursively process dependencies' dependencies
3. **Conflict Detection** (post-selection):
   - Check each selected overlay's `conflicts` field
   - If conflicts found, show resolution UI
   - Loop until all conflicts resolved

**Example:**
```yaml
# grafana requires prometheus
grafana:
  requires: [prometheus]

# docker-in-docker conflicts with docker-sock
docker-in-docker:
  conflicts: [docker-sock]
```

### Composition Engine

The `composeDevContainer()` function in `tool/questionnaire/composer.ts` (721 lines):

**Overlay Application Order:**
1. Base template (plain or compose)
2. Language overlays
3. Database overlays
4. Observability overlays
5. Cloud tool overlays
6. Dev tool overlays

**Merge Strategy:**
- JSON patches from `overlay/devcontainer.patch.json` applied via merge-deep
- Docker Compose services merged into `.devcontainer/docker-compose.yml`
- Environment variables from `.env.example` concatenated
- Apt packages merged with deduplication (empty string tokens filtered)

### Path Resolution

Both `init.ts` and `composer.ts` use candidate arrays for compatibility:

```typescript
const REPO_ROOT_CANDIDATES = [
  path.join(__dirname, '..', '..'),      // From tool/questionnaire/ (ts-node)
  path.join(__dirname, '..', '..', '..'), // From dist/tool/questionnaire/ (compiled)
];
```

**When to add candidates:**
- Any file read/write operation
- Any path calculation involving `__dirname`
- Any import of external files (YAML, JSON, templates)

## Common Development Tasks

### Adding a New Overlay

1. **Create overlay directory:**
   ```bash
   mkdir -p overlays/my-overlay
   ```

2. **Add devcontainer patch:**
   ```json
   // overlays/my-overlay/devcontainer.patch.json
   {
     "features": {
       "ghcr.io/example/feature:1": {}
     },
     "customizations": {
       "vscode": {
         "extensions": ["example.extension"]
       }
     }
   }
   ```

3. **Add docker-compose.yml (if multi-service):**
   ```yaml
   services:
     my-service:
       image: example/image:latest
       networks:
         - devnet
   networks:
     devnet:
       name: devnet
   ```

4. **Register in overlays/index.yml:**
   ```yaml
   my_category_overlays:
     - id: my-overlay
       name: My Overlay
       description: Brief description
       category: my-category
       supports: [compose]  # or [] for all
       requires: []
       suggests: []
       conflicts: []
       tags: [my-category, keyword]
       ports: [8080]
   ```

5. **Update TypeScript types:**
   ```typescript
   // tool/schema/types.ts
   export type MyCategory = 'my-overlay' | 'other-overlay';

   export interface QuestionnaireAnswers {
     // ...existing fields
     myCategory: MyCategory[];
   }
   ```

6. **Update composer.ts:**
   ```typescript
   // Apply overlay in correct order (lines 490-496 pattern)
   if (answers.myCategory.includes('my-overlay')) {
     await applyOverlay('my-overlay', devcontainerPath, composePath, envPath);
   }
   ```

7. **Build and test:**
   ```bash
   npm run build
   npm run init -- --stack compose --my-category my-overlay
   ```

### Modifying the Questionnaire

The questionnaire is in `scripts/init.ts` (lines 125-270):

```typescript
// Add new question after overlay selection
const customValue = await input({
  message: 'Enter custom value:',
  default: 'default-value'
});

answers.customValue = customValue;
```

**Important:**
- Update `QuestionnaireAnswers` type in `tool/schema/types.ts`
- Update `config.schema.json` for JSON validation
- Handle in `composer.ts` composition logic

### Updating CLI Arguments

CLI parsing is in `scripts/init.ts` using Commander:

```typescript
program
  .option('--my-option <value>', 'Description of option')
  .parse(process.argv);

const options = program.opts();
if (options.myOption) {
  answers.myOption = options.myOption;
}
```

**Also update:**
- README.md examples
- `--help` text
- Documentation in templates/*/README.md

### Fixing Path Resolution Issues

If you see "File not found" errors in compiled mode:

1. **Identify the problematic path resolution**
2. **Add candidate array:**
   ```typescript
   const MY_FILE_CANDIDATES = [
     path.join(__dirname, '..', 'file.txt'),      // ts-node
     path.join(__dirname, '..', '..', 'file.txt'), // compiled
   ];

   const MY_FILE_PATH = MY_FILE_CANDIDATES.find(fs.existsSync) ?? MY_FILE_CANDIDATES[0];
   ```

3. **Test both modes:**
   ```bash
   npm run init       # ts-node mode
   npm run init:build # compiled mode
   ```

## Debugging and Troubleshooting

### Common Issues

**Build Errors:**
```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

**Path Resolution Failures:**
- Check if running from source vs compiled output
- Verify candidate arrays cover both scenarios
- Use `console.log(__dirname)` to debug current directory

**Overlay Not Applied:**
- Verify overlay registered in `overlays/index.yml`
- Check `composer.ts` applies overlay in correct order
- Ensure type definitions include overlay ID
- Build after type changes: `npm run build`

**Port Conflicts:**
- Use `--port-offset 100` to shift all ports
- Check `overlays/index.yml` for port declarations
- Verify docker-compose.yml port mappings use offset

**Dependency Loops:**
- Check `requires` fields don't create circular dependencies
- Use `suggests` instead of `requires` for optional dependencies

### Logging Patterns

```typescript
import chalk from 'chalk';
import ora from 'ora';

// Success messages
console.log(chalk.green('✓ Operation succeeded'));

// Error messages
console.error(chalk.red('✗ Operation failed'));

// Spinners for long operations
const spinner = ora('Processing...').start();
// ... do work ...
spinner.succeed('Processing complete');
```

### Debug Configuration

Add debug logging:

```typescript
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.log(chalk.dim('Debug: Current answers:'), answers);
}
```

Run with:
```bash
DEBUG=true npm run init
```

## Pull Request Guidelines

### Title Format

Use conventional commit style:
```
[category] Brief description

Examples:
[overlays] Add PostgreSQL 17 support
[cli] Improve dependency resolution UI
[docs] Update README with port offset examples
[fix] Resolve path resolution in compiled mode
```

### Required Checks Before Submission

```bash
# 1. Build successfully
npm run build

# 2. All tests pass
npm test

# 3. No TypeScript errors
npx tsc --noEmit

# 4. Smoke test (if modifying composition logic)
npm run test:smoke
```

### Commit Message Conventions

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **refactor**: Code restructuring without behavior change
- **test**: Adding or updating tests
- **chore**: Maintenance tasks (deps, build config)

### Review Process

1. Ensure all CI checks pass
2. Update relevant documentation (README, overlay READMEs)
3. Add tests for new functionality
4. Update `overlays/index.yml` if adding/modifying overlays
5. Update `config.schema.json` if changing types

## Additional Notes

### Overlay Stack Compatibility

Some overlays only work with specific stacks:

- **Database overlays** (postgres, redis): `supports: [compose]` only
- **Language overlays**: Work with both `plain` and `compose`
- **Dev tools**: Most support both stacks

Check `supports` field in `overlays/index.yml` before use.

### Port Offset Calculation

Ports are offset in `composer.ts` using:

```typescript
const actualPort = basePort + portOffset;
```

All port mappings in docker-compose.yml and devcontainer.json are adjusted.

### Environment Variables

- `.env.example` files in overlays are merged into `.devcontainer/.env.example`
- Users copy to `.env` and customize
- Docker Compose uses `${VAR:-default}` for optional variables
- **Always provide defaults** to avoid Docker warnings

### Network Configuration

All compose-based overlays use:

```yaml
networks:
  devnet:
    name: devnet
```

**Never use `external: true`** - causes runtime failures.

### Service Naming

Container-to-container communication uses service names:

- PostgreSQL: `postgres` (not `localhost`)
- Redis: `redis` (not `localhost`)
- Jaeger: `jaeger` (not `localhost`)

Update connection strings in application code accordingly.

### Performance Considerations

- **Overlay composition** is fast (< 1s for most configurations)
- **File I/O** is the bottleneck - minimize reads/writes
- **Dependency resolution** is recursive but terminates quickly (max depth ~3)
- **Conflict detection** is O(n²) but n is small (< 20 overlays)

### Gotchas and Tips

1. **ESM Extensions**: Always use `.js` in imports, even for `.ts` files
2. **Path Candidates**: Add both source and dist/ paths
3. **Empty String Filtering**: `mergeAptPackages` filters empty tokens
4. **Conflict Resolution**: Happens *after* selection, not during
5. **Port 0**: Not supported - must be positive integer
6. **YAML Parsing**: Uses `js-yaml` - ensure valid YAML syntax
7. **Type Safety**: Update types, schema, and runtime code together
8. **Vitest Warnings**: Test file TypeScript errors don't affect build
