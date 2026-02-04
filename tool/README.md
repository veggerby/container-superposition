# Container Superposition Init Tool

A **humble, purpose-driven devcontainer picker** that helps you bootstrap your first `.devcontainer/` setup without the pain of choosing between too many options.

## Philosophy

This tool is designed to:

- ✅ **Reduce choice paralysis** with guided questions (5–8 max)
- ✅ **Output boring, editable `.devcontainer/` folders** — not proprietary formats
- ✅ **Stay humble** — generate once, then get out of your way
- ✅ **Compose solution-ready templates** with lightweight overlays
- ❌ **NOT** become a framework you have to learn
- ❌ **NOT** require the tool for manual edits or updates
- ❌ **NOT** generate mysterious black-box configurations

## Quick Start

### Interactive Mode (Recommended for First-Time Users)

```bash
npm run init
```

You'll be greeted with a beautiful, color-coded interface that guides you through 5–8 questions:

1. **Stack/Language**: .NET, Node.js, Python, or Fullstack
2. **Docker-in-Docker**: Do you need to build containers inside your devcontainer?
3. **Database**: PostgreSQL, Redis, both, or none
4. **Browser Automation**: Playwright for end-to-end testing
5. **Cloud Tools**: Azure CLI, kubectl/helm, or none
6. **Output Path**: Where to write the configuration (default: `./.devcontainer`)

The tool features:
- 🎨 Color-coded prompts with chalk
- 📦 Beautiful boxed headers with boxen
- ⏳ Progress spinners with ora
- ✅ Visual confirmation of selections
- 🎯 Clear configuration summary before generation

### Non-Interactive Mode (For Automation)

```bash
npm run init -- --stack dotnet --postgres --docker
npm run init -- --stack node-typescript --playwright --cloud-tools azure-cli,kubectl-helm
npm run init -- --stack fullstack --db postgres+redis --output ./my-project/.devcontainer
```

### Via npx (Once Published)

```bash
npx container-superposition init
```

## Enhanced User Experience

The tool provides a polished CLI experience using:

- **chalk** - Color-coded output for better readability
- **boxen** - Beautiful bordered boxes for headers and summaries
- **ora** - Elegant spinners during file operations
- **commander** - Robust argument parsing with built-in help

This makes the questionnaire more engaging and the output easier to scan.

## CLI Options

| Option | Description | Example |
|--------|-------------|---------|
| `--stack <name>` | Base template: `dotnet`, `node-typescript`, `python-mkdocs`, `fullstack` | `--stack dotnet` |
| `--dind`, `--docker` | Enable Docker-in-Docker | `--docker` |
| `--db <type>` | Database: `postgres`, `redis`, `postgres+redis`, `none` | `--db postgres` |
| `--postgres` | Shorthand for `--db postgres` | `--postgres` |
| `--redis` | Shorthand for `--db redis` | `--redis` |
| `--playwright` | Include Playwright browser automation | `--playwright` |
| `--cloud-tools <list>` | Comma-separated cloud tools: `azure-cli`, `kubectl-helm` | `--cloud-tools azure-cli` |
| `-o`, `--output <path>` | Output directory (default: `./.devcontainer`) | `-o ./custom-path` |
| `-h`, `--help` | Show help | `--help` |

## What It Does

1. **Selects** the appropriate base template from `templates/`
2. **Composes** additional capabilities using overlays from `tool/overlays/`
3. **Merges** features, environment variables, ports, and scripts
4. **Writes** a normal `.devcontainer/` folder you can edit directly
5. **Steps aside** — you own the output, not the tool

## Output Structure

After running the tool, you'll have:

```
.devcontainer/
├── devcontainer.json          # Main configuration (editable!)
├── scripts/
│   └── post_create.sh         # Post-creation scripts
├── docker-compose.postgres.yml  # (if you chose postgres)
└── docker-compose.redis.yml     # (if you chose redis)
```

## Available Templates

- **dotnet**: .NET 10 with C# Dev Kit, testing, and build tools
- **node-typescript**: Node.js LTS with TypeScript, ESLint, and Prettier
- **python-mkdocs**: Python 3 with MkDocs, Poetry, and documentation tools
- **fullstack**: Polyglot setup with Node.js + Python + tooling

## Available Overlays

Overlays add specific capabilities to your base template:

- **postgres**: PostgreSQL 16 + client tools
- **redis**: Redis 7 + redis-tools
- **playwright**: Browser automation with Chromium
- **azure-cli**: Azure command-line tools
- **kubectl-helm**: Kubernetes CLI + Helm

## How Overlays Work

Each overlay is a tiny JSON patch + optional Docker Compose service:

```
tool/overlays/postgres/
├── devcontainer.patch.json    # Features, env vars, ports
└── docker-compose.yml         # PostgreSQL service definition
```

The tool **deep-merges** these into your base template, concatenating arrays (like `forwardPorts`) and combining features intelligently.

## Guardrails

To prevent "tool rot" and stay humble:

1. **Never required for manual use** — templates remain first-class citizens
2. **One-command install** from a fresh clone: `npm run init`
3. **Output is editable** — not tied to the tool after generation
4. **No "update" command** — default is "generate once, edit forever"
5. **No DSL or custom schemas** — just plain JSON you already know

## Development

```bash
# Install dependencies
npm install

# Run the tool in dev mode (with tsx)
npm run init

# Build TypeScript to dist/
npm run build

# Run built version
npm run init:build

# Clean build artifacts
npm run clean
```

## Documentation

- [Architecture](docs/architecture.md) - Design principles and composition logic
- [User Experience](docs/ux.md) - Visual design and CLI enhancements
- [Examples](docs/examples.md) - Common usage patterns

## Contributing

Want to add a new overlay or template?

1. **Template**: Add to `templates/<name>/.devcontainer/`
2. **Overlay**: Add to `tool/overlays/<name>/`
   - Required: `devcontainer.patch.json`
   - Optional: `docker-compose.yml`, scripts, etc.
3. **Update questionnaire**: Edit `scripts/init.ts` to offer the new option
4. **Test**: Run `npm run init` and verify the output

## Philosophy in Practice

This tool embodies the **container-superposition** principle:

> **Build a thin picker that outputs normal configurations, not a platform.**

If you find yourself tempted to add:

- A "sync" or "update" command → **Don't**. Output should be forkable.
- A custom DSL → **Don't**. Use standard JSON.
- Required preprocessing → **Don't**. Output should work standalone.
- Framework lock-in → **Don't**. Users should be able to delete this tool after using it.

## License

MIT
