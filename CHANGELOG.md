# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

- Improved overlay information display with better formatting and colors
- Enhanced error messages with actionable suggestions

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

[Unreleased]: https://github.com/veggerby/container-superposition/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/veggerby/container-superposition/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/veggerby/container-superposition/releases/tag/v0.1.0
