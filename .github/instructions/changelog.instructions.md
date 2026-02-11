---
applyTo: 'CHANGELOG.md'
---

# GitHub Copilot Instructions: Changelog Standards

This file provides instructions for GitHub Copilot when modifying the CHANGELOG.md file.

## Format and Structure

The CHANGELOG.md follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format and adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### Required Header

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
```

### Version Section Structure

Each version section MUST follow this format:

```markdown
## [VERSION] - YYYY-MM-DD

### Added

- New features

### Changed

- Changes to existing functionality

### Deprecated

- Soon-to-be removed features

### Removed

- Removed features

### Fixed

- Bug fixes

### Security

- Security vulnerability fixes
```

**Only include sections that have content.** Empty sections should be omitted.

## Unreleased Section

The `[Unreleased]` section at the top tracks work in progress:

```markdown
## [Unreleased]

### Added

- Feature descriptions go here
```

**When releasing:**

1. Create new version section below `[Unreleased]`
2. Move items from `[Unreleased]` to the new version
3. Keep `[Unreleased]` as an empty section header (no placeholder bullets)

**After a release, leave `## [Unreleased]` empty until new changes land.** This reduces noise and prevents fake promises.

## Version Number Format

Follow semantic versioning:

- **MAJOR.MINOR.PATCH** (e.g., `0.1.2`, `1.0.0`, `2.3.1`)
- Changelog versions use brackets: `[0.1.2]` (no `v` prefix)
- Git tags use `v` prefix: `v0.1.2`
- Always include date: `- 2026-02-11`

**Special marker: [RECALLED]**

Use `[RECALLED]` for versions that were unpublished from npm:

- Only use on released versions (never on `[Unreleased]`)
- Must include a `### Note` section explaining why
- Must include remediation ("Use version X.Y.Z or later")

Example:

```markdown
## [0.1.0] - 2026-02-11 [RECALLED]

### Note

This version was recalled due to a packaging issue. Use version 0.1.1 or later.
```

## Change Descriptions

### Entry Style Consistency

Use consistent bullet format:

- Start with bold feature label: `**Thing**`
- Use em-dash separator: `—` (not hyphen `-`)
- Follow with impact/description
- Use sentence fragments (no trailing period) OR full sentences — pick one per entry

**Format:** `- **Thing** — impact`

### User-Focused Language

Write from the **user's perspective**, not the developer's:

✅ **Good - User-focused:**

```markdown
### Added

- **Discovery commands** - Browse and filter overlays before generation
    - `list` command with category and tag filtering
    - `explain` command for detailed overlay information
    - `plan` command to preview without creating files
```

❌ **Bad - Implementation-focused:**

```markdown
### Added

- Implemented list.ts, explain.ts, and plan.ts modules
- Added listCommand function with filtering logic
- Created formatAsTable helper for output
```

### Be Specific and Actionable

Include **what changed** and **why it matters**:

✅ **Good - Specific:**

```markdown
### Fixed

- **Package corruption issue** - Removed accidentally included `.tgz` tarball that caused installation failures
- Added `"!**/*.tgz"` exclusion to prevent future tarball inclusion
```

❌ **Bad - Vague:**

```markdown
### Fixed

- Fixed package issue
- Updated package.json
```

### Group Related Changes

Organize by **user impact**, not by file or PR:

✅ **Good - Grouped by feature:**

```markdown
### Added

- **Authentication support** - New login flow with OAuth2
    - Social login (Google, GitHub)
    - Two-factor authentication
    - Session management with auto-refresh
```

❌ **Bad - File-by-file:**

```markdown
### Added

- Added oauth.ts
- Added 2fa.ts
- Added session.ts
```

## Category Guidelines

### Added

For **new features** users can see/use:

- New commands
- New overlays
- New configuration options
- New documentation
- New capabilities

**Do NOT include:**

- Internal refactoring
- Test additions (unless user-visible)
- Code reorganization

### Changed

For **modifications to existing behavior**:

- Updated behavior
- Improved performance (if noticeable)
- Changed defaults
- Updated dependencies (only if they affect users - see Dependency Updates below)

**Breaking Changes**

Breaking changes MUST be listed under `### Changed` and start with `**BREAKING**:` followed by migration steps:

```markdown
### Changed

- **BREAKING: CLI command structure** — Commands now require explicit subcommands
    - Old: `npm run init`
    - New: `container-superposition init`
    - Migration: Update scripts and documentation to use new syntax
    - Run `container-superposition --help` for full usage
```

**Always include:**

- What broke
- How to migrate
- Where to find help

**Dependency Updates**

Include dependency updates **only if** they:

- Change minimum versions (e.g., "Node.js 18 → 20")
- Change behavior users will notice
- Fix security vulnerabilities
- Require user action

**Examples to include:**

```markdown
### Changed

- **Node.js minimum version** — Now requires Node.js 22+ (was 18+)
- **PostgreSQL default version** — Updated to PostgreSQL 16 (was 15)

### Security

- **Patched vulnerability in commander.js** — Updated to 12.0.0, fixes CVE-2024-XXXX
```

**Examples to exclude:**

- Patch updates that don't change behavior
- Dev dependency updates
- Internal tooling updates

### Fixed

For **bug fixes**:

- Describe the problem from user's perspective
- Explain the solution briefly
- Include impact (what didn't work, now does)

**Example:**

```markdown
### Fixed

- **Port offset not applied to docker-compose** - Services now correctly use offset ports
- Resolved path resolution errors when running from compiled dist/
```

### Deprecated

For **features being phased out**:

- Announce deprecation with timeline
- Provide migration path
- Link to relevant documentation

**Example:**

```markdown
### Deprecated

- `--stack dotnet` is deprecated, use `--stack compose --language dotnet` instead
    - Old syntax still works but will be removed in v2.0.0
    - See migration guide: docs/migration-v2.md
```

### Removed

For **features that no longer exist**:

- State what was removed
- Explain why (if not obvious)
- Provide alternatives

**Example:**

```markdown
### Removed

- Legacy questionnaire format removed - Use new CLI commands instead
    - Migration: Replace `npm run init` with `npx container-superposition init`
```

### Security

For **security-related fixes**:

- Describe vulnerability without exploits
- State affected versions
- Provide remediation steps

**Example:**

```markdown
### Security

- Fixed command injection vulnerability in overlay loader
    - Affected: v0.1.0 - v0.1.2
    - Update to v0.1.3+ immediately
```

## Links Section

At the bottom, maintain version comparison links:

```markdown
<!-- Links -->

[Unreleased]: https://github.com/veggerby/container-superposition/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/veggerby/container-superposition/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/veggerby/container-superposition/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/veggerby/container-superposition/releases/tag/v0.1.0
```

**Rules:**

- Update when adding new versions
- Unreleased always compares latest version to HEAD
- Each version compares to previous version
- First version links to release tag (no comparison)
- **Links must reference `v` tags** (e.g., `v0.1.2`)
- **Changelog versions use brackets without `v`** (e.g., `[0.1.2]`)

## What NOT to Include

**Exclude from changelog:**

- Internal refactoring (unless it improves user experience)
- Test additions/updates (unless user-visible)
- Code formatting changes
- Comment updates
- Dependency updates (unless they affect users)
- Build system changes (unless they affect workflow)
- CI/CD changes
- Git-related changes (.gitignore, etc.)

**Exception:** Include if it **directly impacts users**:

```markdown
### Changed

- Updated minimum Node.js version to 20.0.0 (was 18.0.0)
```

## Examples

### Good Changelog Entry

```markdown
## [0.2.0] - 2026-02-15

### Added

- **Stack presets** - Quick-start configurations for common scenarios
    - Web API preset (Node.js/Python/.NET + PostgreSQL + Redis + Observability)
    - Microservice preset (Language choice + Message broker + Tracing)
    - Documentation site preset (MkDocs + Pre-commit + Modern CLI tools)
    - Use with: `container-superposition init --preset web-api`
- **Port management improvements**
    - Connection strings now auto-generated with correct ports
    - Port documentation exported to `.devcontainer/ports.json`
    - Service URLs displayed after generation

### Changed

- Improved overlay filtering - Now case-insensitive and supports partial matches
- Updated PostgreSQL overlay to version 16 (was 15)

### Fixed

- Manifest backup now respects `.gitignore` patterns
- Port offset correctly applied to environment variables

## [0.1.2] - 2026-02-11

### Added

- **Discovery commands** - Explore overlays before generating
    - `list`: Browse all overlays with filtering
    - `explain <overlay>`: See detailed overlay information
    - `plan`: Preview generation without creating files
```

### Bad Changelog Entry

```markdown
## [0.2.0] - 2026-02-15

### Added

- Implemented presets system
- Created preset loader
- Added preset files
- Updated init.ts to support presets

### Changed

- Refactored composer.ts
- Updated types
- Fixed tests

### Fixed

- Various bug fixes
- Improved error handling
```

**Problems:**

- Implementation-focused, not user-focused
- Vague descriptions ("various bug fixes")
- Missing user value ("why would I use presets?")
- No usage examples

## Checklist for Updates

When updating CHANGELOG.md:

- [ ] Entry is in correct version section (Unreleased or specific version)
- [ ] Category is appropriate (Added/Changed/Fixed/etc.)
- [ ] Description is user-focused, not implementation-focused
- [ ] Includes what changed AND why it matters
- [ ] Provides examples or usage snippets where helpful
- [ ] Related changes are grouped together
- [ ] Breaking changes clearly marked and include migration notes
- [ ] Links section is updated (if adding new version)
- [ ] No internal/technical jargon unless necessary
- [ ] Spelling and grammar are correct
- [ ] Follows Keep a Changelog format

## When to Update

### PR Discipline

**Each PR that changes user-visible behavior MUST add a bullet under `[Unreleased]`.**

This ensures the changelog stays current and prevents last-minute scrambles during releases.

Update CHANGELOG.md:

- ✅ When adding user-visible features
- ✅ When fixing user-reported bugs
- ✅ When changing user-facing behavior
- ✅ When deprecating features
- ✅ When releasing a new version
- ✅ As part of PR if change is significant

Do NOT update for:

- ❌ Internal refactoring
- ❌ Test-only changes
- ❌ Documentation typo fixes
- ❌ CI/CD updates
- ❌ Dependency updates (unless affecting users - see Dependency Updates above)
