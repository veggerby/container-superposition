# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Project config generation** — Standard `init` can now read a repository-root `.superposition.yml` or `superposition.yml`
    - Lets teams and CI run generation from committed declarative defaults instead of reconstructing long CLI commands
    - Direct CLI flags still override the project config for one run, while explicit `--from-manifest` regeneration remains isolated
    - Supports parity for the existing clean-generation surface, including custom images, container naming, minimal/editor settings, environment variables, and additional generated features declared through custom patches
- **Verbose plan narration** — `plan --verbose` now explains why each overlay was included
    - Shows direct selections, required dependencies, and dependency paths in the terminal output
    - Supports `plan --from-manifest <path> --verbose` so existing manifests get the same explanation model as explicit overlay lists
    - Adds structured inclusion reasons to `plan --json --verbose` without changing the default JSON shape
    - Calls out skipped overlays and conflict boundaries so dependency resolution is easier to audit
- **`spec-kit` overlay** — Spec-Driven Development with the `specify` CLI and any supported AI coding agent
    - Installs `uv` (Astral's fast Python package manager) and `specify-cli` from [github/spec-kit](https://github.com/github/spec-kit)
    - Supports 20+ AI agents: Codex, Claude Code, Gemini CLI, GitHub Copilot, Cursor, Windsurf, Amp, opencode, and more
    - Usage: `specify init . --here --ai <agent>` after overlay setup
- **`claude-code` overlay** — Anthropic Claude Code CLI (`@anthropic-ai/claude-code`) for AI-powered terminal development
- **`gemini-cli` overlay** — Google Gemini CLI (`@google/gemini-cli`) for AI-powered terminal development
- **`amp` overlay** — Sourcegraph Amp CLI (`@sourcegraph/amp`) for AI-powered terminal development
- **`windsurf-cli` overlay** — Codeium Windsurf CLI for AI-powered terminal development
- **`opencode` overlay** — opencode AI coding agent (`opencode-ai`) for multi-provider terminal development
- **`sdd` preset** — Spec-Driven Development meta-preset bundling `spec-kit` with a user-selectable AI agent CLI
    - Prompts users to choose from: Codex, Claude Code, Gemini CLI, Amp, Windsurf, opencode, or GitHub Copilot (IDE-integrated)
    - Sets `SPECIFY_AI_AGENT` environment variable automatically to match the chosen agent

- **`hash` command** — Deterministic environment fingerprint for drift detection and reproducibility
    - Produces a stable SHA-256 fingerprint from stack, resolved overlays, preset, base image, and tool version
    - Auto-resolves overlay dependencies (same logic as `plan`) so the hash includes transitively required overlays
    - Works standalone (`--stack`/`--overlays` flags) or reads directly from an existing `superposition.json` manifest
    - `--json` flag emits machine-readable JSON with both a short 8-character `hash` (for display/badges) and the full 64-character `hashFull` (for CI comparison)
    - `--write` flag writes the full hash to `.devcontainer/superposition.hash` alongside the manifest
    - Hash is version-stable across patch releases (uses `major.minor` of the tool version only)
    - Full documentation at [`docs/hash.md`](docs/hash.md)

- **`adopt` command** — Adopt an existing `.devcontainer/` into the overlay-based model
    - Reads `devcontainer.json` and any linked `docker-compose.yml` files and analyses their contents
    - Resolves the `dockerComposeFile` field (string or array, relative paths) to support Docker Compose-based devcontainers where the compose file lives outside the `.devcontainer/` directory
    - Maps detected devcontainer features, Docker Compose service images, VS Code extensions, and `remoteEnv` variables to equivalent overlay IDs
    - Detection tables are **built dynamically from the overlay registry** — no hardcoded overlay names, every overlay is automatically supported
    - Best-match scoring ensures a feature used by multiple overlays (e.g. the Node.js feature shared by `nodejs` and `bun`) is assigned to the most appropriate one
    - Displays a table showing each detected signal → suggested overlay with a confidence level (`exact` or `heuristic`)
    - Prints the equivalent `container-superposition init` command to reproduce the configuration, using correct CLI flags per overlay category (`--language`, `--database`, `--observability`, `--cloud-tools`, `--dev-tools`)
    - **Unmatched items** (features, services, extensions not covered by any overlay) are surfaced separately; a `custom/devcontainer.patch.json` / `custom/docker-compose.patch.yml` is written to preserve them across regenerations
    - Backup support using the same auto-detect logic as `regen` — skipped in git repos by default; use `--backup` / `--no-backup` / `--backup-dir` to override
    - `--dry-run` flag prints the analysis without writing any files
    - Prompts to generate `superposition.json` (and optionally `custom/` patch files) from the suggestions
    - `--force` flag allows overwriting existing generated files
    - `--json` flag for machine-readable output (suitable for scripting)
    - Gracefully handles configs with no recognisable overlay patterns
    - Full documentation at [`docs/adopt.md`](docs/adopt.md)

## [0.1.4] - 2026-02-26

### Added

- **Keycloak overlay** — Open-source identity and access management for local OAuth2/OIDC development
    - Runs as a Docker Compose service on port 8180 (avoids collision with common app servers)
    - Automatically requires and integrates with the `postgres` overlay as its database backend
    - Exposes OIDC discovery at `/realms/master/.well-known/openid-configuration`
    - `KEYCLOAK_HOST`, `KEYCLOAK_PORT`, and `KEYCLOAK_ISSUER` wired into the dev container via `remoteEnv`
- **Mailpit overlay** — Email testing tool that captures all outbound email locally
    - SMTP server on port 1025 (no authentication required in dev mode)
    - Web UI on port 8025 for browsing captured emails
    - REST API at `/api/v1/messages` for automated test assertions
    - `SMTP_HOST`, `SMTP_PORT`, and `MAILPIT_URL` wired into the dev container via `remoteEnv`
- **gRPC Tools overlay** — Protocol Buffers and gRPC development toolchain
    - Installs `protoc` (via system packages), `buf` CLI, and `grpcurl` (from official GitHub releases, multi-arch)
    - VS Code extensions: `vscode-proto3` and `vscode-buf`
    - Works with all base stacks (plain and compose)
- **Cloudflared overlay** — Cloudflare Tunnel for securely exposing local services to the internet
    - Anonymous tunnels work immediately with no account required
    - Named tunnels support persistent URLs with a Cloudflare account
    - Conflicts with `ngrok` overlay (bidirectional — both overlays declare the conflict)
    - Pinned to a specific release version for reproducibility

- **Service reference exports** — Two convenience files are now auto-generated during `init` and `regen` for projects that include service overlays
    - `services.md` — Consolidated service reference with connection info, connection strings (URIs), code examples (Node.js, Python) for common services, common CLI commands, port offset documentation, and a troubleshooting section
    - `env.local.example` — Optional-overrides template derived from each overlay's `.env.example`, with all values commented out and grouped by service — copy to `.env` and uncomment only what you need to customize
    - Both files are tracked in the file registry and cleaned up on regeneration alongside other generated files

- **Git-aware backup defaults** — Backups are now skipped automatically when the target directory is inside a git repository (git already tracks history), and created by default when it is not
    - `--backup` flag forces a backup even inside a git repo
    - `--no-backup` flag suppresses a backup even outside a git repo
    - Auto-detection uses `git rev-parse --git-dir`; falls back to walking up the directory tree looking for a `.git` folder when the `git` command is unavailable
- **Automatic `.gitignore` management** — Generated projects now include tool-specific `.gitignore` entries automatically; overlay-provided patterns are merged into your project root `.gitignore` at generation time
    - Entries from each overlay are grouped under a labelled comment for easy identification
    - Running generation again never duplicates patterns already in your `.gitignore`
    - Overlay-provided ignore rules are always applied to the project root `.gitignore` (never to files inside `.devcontainer/`), keeping generated configuration isolated from your application's source ignores
- **direnv overlay: secrets and env files are gitignored automatically** — `.envrc.local`, `.env`, `.env.local`, and `.direnv/` are now excluded from git immediately after generation — no need to start the container first
- **Python overlay: workspace virtual environment (`.venv`)** — The Python overlay now sets up a `.venv` virtual environment in your project root on container creation
    - VS Code automatically uses the workspace `.venv` as the Python interpreter
    - All project dependencies are installed into the venv (`requirements.txt`, `requirements-dev.txt`, `pyproject.toml`, `setup.py`)
    - `.venv/`, `__pycache__/`, `*.pyc`, and other Python artifacts are added to `.gitignore` automatically
- **Preset parameterization** — Customize presets with high-level choices without micro-managing individual overlays
    - New `parameters` field in preset definitions maps choices to sets of overlays
    - `web-api` preset now parameterized: `database`, `cache`, `broker`, `observability` slots
    - `microservice` preset now parameterized: `broker`, `observability` slots
    - Interactive questionnaire asks for each parameter value with descriptions and defaults
    - `--preset <id>` CLI flag pre-selects a preset and skips the preset selection prompt
    - `--preset-param <key=value>` CLI flag pre-fills parameter values (repeatable)
    - Pre-filled parameters skip their interactive prompt; unfilled ones are still asked
    - Invalid parameter values produce helpful error messages listing valid options
    - `explain <preset-id>` now shows parameters, options, defaults, and usage examples
    - Example: `container-superposition init --preset web-api --preset-param broker=nats --preset-param observability=full`
- **`plan --diff`** — Compare planned output vs existing `.devcontainer/` configuration before applying changes
    - Shows files to be created, modified, unchanged, and removed
    - Generates colored unified diff for `devcontainer.json` (loads base template + applies overlay patches)
    - Detects overlay changes (added/removed) by comparing with existing `superposition.json` manifest
    - Detects port changes (added/removed) derived from overlay comparison
    - Lists preserved custom files in `custom/` directory
    - `--output <path>` to compare against a custom existing config path (default: `./.devcontainer`)
    - `--diff-format json` for machine-readable output (also via `--json`)
    - `--diff-context <lines>` to control diff context lines (default: 3)
    - Example: `container-superposition plan --stack compose --overlays postgres,redis --diff`

## [0.1.3] - 2026-02-17

### Note

Re-release of version 0.1.2 as non-beta release

## [0.1.2] - 2026-02-17 [RECALLED]

### Note

This version was recalled as it was inadvertently tagged beta.

### Added

- **Team collaboration workflow** — Manifest-first workflow for standardizing dev environments across teams
    - `--write-manifest-only` flag generates only `superposition.json` without creating `.devcontainer/` files
    - Enables version control pattern: commit manifest, gitignore generated files
    - `regen` command now searches current directory for manifest (team workflow pattern)
    - New comprehensive guide at `docs/team-workflow.md` with CI examples
    - README updated with team collaboration quick start
    - Supports personal customizations via `.devcontainer/custom/` (can be committed)
    - One-command onboarding: `npx container-superposition regen`
    - No lock-in - generated files remain plain JSON/YAML
- **Manifest versioning system** — Separate schema version from tool version for better compatibility
    - New `manifestVersion` field tracks schema version (increments on breaking changes)
    - New `generatedBy` field tracks tool version that created the manifest
    - Legacy `version` field maintained for backward compatibility
    - Automatic migration framework migrates old manifests transparently
    - Support window: Current version + N-1 (e.g., v1 supports legacy format)
    - Migration happens automatically during manifest loading
    - Doctor command validates manifest versions and migration status
    - JSON schema for manifest validation (`superposition-manifest.schema.json`)
- **Merge strategy specification** — Formalized and documented merge behavior for deterministic composition
    - New comprehensive specification document at `docs/merge-strategy.md`
    - Extracted merge utilities to `tool/utils/merge.ts` with full documentation
    - Comprehensive test suite in `tool/__tests__/merge-strategy.test.ts`
    - Documents exact merge rules for devcontainer.json, docker-compose.yml, and .env files
    - References RFC 7386 (JSON Merge Patch) and relevant standards
    - 100% deterministic merge behavior with no undocumented special cases
    - Field-specific strategies for arrays (features, extensions, mounts, forwardPorts)
    - Intelligent PATH variable merging in remoteEnv
    - Package list merging with deduplication (apt, apk)
    - Service dependency filtering (depends_on)
- **New infrastructure overlays** — Cloud and development tooling for modern workflows
    - `duckdb` — In-process analytical database for OLAP workloads and data analysis
    - `jupyter` — Jupyter notebook server for interactive computing and data science (compose only, requires Python)
    - `kind` — Kubernetes in Docker for local K8s development and testing (requires docker-in-docker)
    - `localstack` — Local AWS cloud stack for development without real AWS resources (compose only, ports 4566, 4571)
    - `openapi-tools` — OpenAPI/Swagger tooling for API development and documentation
    - `tilt` — Live update and orchestration for Kubernetes development (port 10350, suggests kind + kubectl-helm)
- **Code quality enforcement** — Automatic linting in development and CI
    - `npm run lint` — Runs TypeScript type checking and Prettier format validation
    - `npm run lint:fix` — Auto-formats all code with Prettier
    - Linting integrated into all CI workflows (runs before build)
    - Documentation generation now auto-formats output with Prettier
    - Linting failures block PRs and npm publish
- **Overlay imports** — Overlays can now import shared configuration from `overlays/.shared/`
    - Supports JSON, YAML, and ENV file imports
    - Reduces duplication across overlays with common patterns
    - Example shared configs for OTEL, healthchecks, and VS Code extensions
- **Enhanced port metadata system** — Ports now support rich metadata with service names, protocols, descriptions, and connection details
    - Port definitions can include service name, protocol (http/https/tcp/udp/grpc), description, path, and onAutoForward behavior
    - Connection string templates for common services (PostgreSQL, Redis, MongoDB, MySQL, RabbitMQ, NATS)
    - Backward compatible with simple numeric port definitions
    - `ports.json` documentation file automatically generated with all port details, connection strings, and URLs
    - Environment variables from `.env.example` used to populate connection string templates
    - HTTP/HTTPS services get auto-generated URLs with correct ports and paths
    - onAutoForward port configuration controls VS Code port forwarding behavior (notify, openBrowser, openPreview, silent, ignore)
    - Service summaries displayed during generation for better discoverability
    - Supports multi-repo microservice development with clear port documentation
- **`--minimal` flag** — Skip optional/nice-to-have overlays for lean configurations
    - Useful for CI/CD environments, Codespaces, or learning
    - Marked overlays: `modern-cli-tools`, `git-helpers`, `codex`
    - Works with both `init` and `regen` commands
    - Use: `container-superposition init --minimal` or `container-superposition regen --minimal`
- **`--editor` flag** — Choose editor profile for customizations
    - `vscode` (default): Include VS Code extensions and settings
    - `none`: CLI-only, no editor customizations
    - `jetbrains`: Skip VS Code customizations (reserved for future JetBrains-specific settings)
    - Works with both `init` and `regen` commands
    - Use: `container-superposition init --editor none` or `container-superposition regen --editor none`
- **Preset directory reorganization** — Moved `overlays/presets` to `overlays/.presets` for consistency with `.registry` and `.shared` directories
- **Regen command enhancements** — `regen` command now supports `--minimal` and `--editor` flags
    - Regenerate existing configurations without optional features
    - Change editor profile without recreating from scratch
    - Example: `container-superposition regen --minimal --editor none`
- **Deployment target support** — Environment-specific optimizations and validation
    - `--target` flag supports: local (default), codespaces, gitpod, devpod
    - Automatic compatibility validation for selected overlays
    - Environment-specific recommendations (e.g., docker-in-docker for cloud IDEs)
    - Interactive target selection when incompatible overlays detected
    - Extensible system for adding new deployment environments
    - Port forwarding behavior adapts to target environment
    - Target-specific constraints (Docker access, privileged containers)
    - Configuration stored in `overlays/.registry/deployment-targets.yml`
- **GitHub Actions workflows** — Automated validation and documentation checks
    - `validate-overlays.yml` — Runs on pull requests to validate overlay changes
        - Executes `doctor` command for environment validation
        - Runs full test suite
        - Executes smoke tests to ensure overlay combinations work
        - Uses Node.js LTS version
    - `generate-docs.yml` — Validates generated documentation on pull requests
        - Runs when overlays or docs generation scripts change
        - Fails if generated docs are out of sync (prevents drift)
        - Ensures documentation is committed before merge
    - Workflow status badges added to README
- **Environment validation command** — Comprehensive `doctor` command for diagnostics
    - Node.js version check (>= 18 required)
    - Docker daemon accessibility verification
    - Docker Compose v2 detection (only for compose stack)
    - Overlay integrity validation (YAML syntax, required files, broken symlinks)
    - Manifest compatibility checks
    - Port conflict detection (best-effort)
    - `--json` flag for programmatic output
    - `--fix` flag for automatic corrections (placeholder for future fixes)
    - Run `container-superposition doctor` to validate your environment
- **Discovery commands** — New commands to explore available overlays before generating
    - `container-superposition list` — Browse all overlays with filtering options
        - Filter by category: `--category language`, `--category database`, etc.
        - Filter by tags: `--tags observability,metrics`
        - Filter by stack support: `--supports compose`
        - JSON output for scripting: `--json`
    - `container-superposition explain <overlay>` — Deep dive into any overlay
        - Shows description, category, ports, and dependencies
        - Lists files that will be created/modified
        - Displays devcontainer patch content with syntax highlighting
        - Shows docker-compose services (if applicable)
        - JSON output available: `--json`
    - `container-superposition plan` — Preview generation without creating files
        - Shows overlays that will be used (including auto-resolved dependencies)
        - Displays port mappings with offset applied
        - Lists files that will be created
        - Detects and reports conflicts
        - Validates overlay compatibility with selected stack
        - Example: `container-superposition plan --stack compose --overlays nodejs,postgres,grafana --port-offset 100`

### Changed

- **Port schema extended** — overlay.yml ports field now accepts both numbers and rich port objects
    - Legacy format (array of numbers) still fully supported for backward compatibility
    - New format includes service, protocol, description, path, onAutoForward, and connectionStringTemplate fields
    - Schema validation in `overlay-manifest.schema.json` supports both formats via oneOf
- **Updated key overlays with rich port metadata** — PostgreSQL, Redis, Grafana, Jaeger, and Prometheus
    - Proper onAutoForward settings (openBrowser for UIs, notify for APIs, ignore for internal ports)
    - Connection string templates for databases
    - Service descriptions for better discoverability
- Overlay manifests now support `imports` field for shared file references
- Overlay manifests now support `minimal` boolean field to mark optional overlays
- Regen command can now accept CLI overrides while preserving manifest configuration
- Improved overlay information display with better formatting and colors
- Enhanced error messages with actionable suggestions
- **Output structure documentation** — Updated `tool/README.md` to reflect the current merged compose output and overlay-suffixed copied files

### Fixed

- **Grafana dashboard auto-import** — Dashboard provisioning now uses non-overlapping mount paths so default JSON dashboards load reliably on first startup
- **Compose dependency filtering** — `depends_on` cleanup now supports both list and object syntax during compose merge
- **Overlay manifest ports parsing** — Numeric string port values in `overlay.yml` are now accepted and normalized

---

## [0.1.1] - 2026-02-11

### Fixed

- **Package corruption issue** — Removed accidentally included `.tgz` tarball file that caused installation failures
- Added `"!**/*.tgz"` exclusion to `package.json` files array to prevent future tarball inclusion
- Updated publishing documentation with tarball cleanup step

### Changed

- Publishing workflow now includes explicit tarball removal step before publishing

---

## [0.1.0] - 2026-02-11 [RECALLED]

### Note

This version was recalled due to a packaging issue (included `.tgz` tarball). Use version 0.1.1 or later.

### Added

- **Initial npm package publication** — `container-superposition` available via `npx`
- **CLI subcommands** — `init`, `regen`, `list`, `doctor` commands
- **Automated publishing workflow** — GitHub Actions workflow for releases
- **Publishing documentation** — Comprehensive guide at `docs/publishing.md`

### Changed

- **Converted to proper npm package** — From template repo to installable CLI tool
- **Command structure** — `container-superposition <command>` instead of `npm run init`
- **Binary entry point** — Properly configured bin field in package.json
- **Package configuration** — Explicit files array for controlled publishing

### Technical Details

- Entry point: `dist/scripts/init.js`
- Package size: ~327 KB compressed, 1.2 MB unpacked
- 327 files included (overlays, templates, features, docs)
- Supports Node.js 18+

---

<!-- Links -->

[Unreleased]: https://github.com/veggerby/container-superposition/compare/v0.1.4...HEAD
[0.1.4]: https://github.com/veggerby/container-superposition/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/veggerby/container-superposition/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/veggerby/container-superposition/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/veggerby/container-superposition/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/veggerby/container-superposition/releases/tag/v0.1.0
