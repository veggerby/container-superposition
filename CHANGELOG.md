# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

[Unreleased]: https://github.com/veggerby/container-superposition/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/veggerby/container-superposition/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/veggerby/container-superposition/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/veggerby/container-superposition/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/veggerby/container-superposition/releases/tag/v0.1.0
