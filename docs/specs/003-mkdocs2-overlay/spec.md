# Feature Specification: MkDocs 2.x Overlay

**Feature Branch**: `copilot/add-mkdocs2-overlay`
**Created**: 2026-03-16
**Status**: Final
**Input**: Add a new `mkdocs2` overlay that installs MkDocs 2.x with the Material theme via direct `pip` install, keeping the existing `mkdocs` (MkDocs 1.x) overlay untouched for backward compatibility.

## Review & Approval _(mandatory before implementation)_

- **Spec Path**: `docs/specs/003-mkdocs2-overlay/spec.md`
- **Commit Status**: Committed
- **Review Status**: Approved
- **Implementation Gate**: No implementation code may begin until this spec is committed and reviewed.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Use MkDocs 2.x in a devcontainer (Priority: P1)

A developer wants to write documentation using MkDocs 2.x with the Material theme inside a devcontainer without manually managing Python packages.

**Why this priority**: MkDocs 2.x is the currently maintained release. Users starting new documentation projects need a working overlay that installs the supported version.

**Independent Test**: Select the `mkdocs2` overlay (with `python` as a required dependency), rebuild the container, and confirm that `mkdocs --version` reports a 2.x release, `mkdocs new .` succeeds, and `mkdocs serve` starts the dev server on port 8000.

**Acceptance Scenarios**:

1. **Given** a user selects the `mkdocs2` overlay, **When** the devcontainer is built, **Then** `mkdocs --version` reports a version matching `2.x`.
2. **Given** the container is running, **When** the user runs `mkdocs serve`, **Then** the development server starts on port 8000 and VS Code forwards the port automatically.
3. **Given** a `mkdocs.yml` with `theme: {name: material}`, **When** the user runs `mkdocs build`, **Then** the site is generated without errors into the `site/` directory.

---

### User Story 2 - Conflict enforcement between mkdocs and mkdocs2 (Priority: P1)

A user selects both `mkdocs` (1.x) and `mkdocs2` (2.x) and expects the tool to report a conflict.

**Why this priority**: Both overlays install incompatible versions of the `mkdocs` command into the same environment. Allowing both would produce unpredictable results.

**Independent Test**: Attempt to generate a devcontainer with both `mkdocs` and `mkdocs2` selected and confirm the tool surfaces a conflict and blocks generation.

**Acceptance Scenarios**:

1. **Given** a user selects `mkdocs` and `mkdocs2` simultaneously, **When** the questionnaire processes the selection, **Then** a conflict is reported and the user is prompted to choose one.
2. **Given** `mkdocs` conflicts with `mkdocs2` in `overlays/mkdocs/overlay.yml`, **When** the overlay loader reads both manifests, **Then** the conflict is recognised bidirectionally.

---

### User Story 3 - Backward compatibility for existing mkdocs users (Priority: P2)

An existing user who already has the `mkdocs` overlay selected is unaffected by the addition of the new overlay.

**Why this priority**: Introducing a new overlay must not break users who rely on the existing one.

**Independent Test**: Generate a devcontainer using only the `mkdocs` overlay and confirm the output is identical to what it was before `mkdocs2` was added.

**Acceptance Scenarios**:

1. **Given** a user's `superposition.json` references only `mkdocs`, **When** they run `regen`, **Then** the output is identical to before and contains no `mkdocs2`-related changes.

---

## Design

### Installation Method

The `mkdocs2` overlay installs packages via `pip` directly into the workspace
`.venv` virtual environment (created by the `python` overlay, which is a hard
dependency). The overlay's `setup.sh` creates the `.venv` if it does not exist
yet, so it is self-contained even when run before the `python` overlay's setup
script completes.

```bash
pip install --no-cache-dir \
    "mkdocs>=2.0,<3.0" \
    "mkdocs-material>=9.0" \
    "mkdocs-minify-plugin" \
    "mkdocs-redirects" \
    "pymdown-extensions"
```

This approach is preferred over the `ghcr.io/devcontainers-extra/features/mkdocs:2`
devcontainer feature because it gives precise version control and installs into
the same virtual environment used by the rest of the project.

### Category

`dev` — MkDocs is a documentation tool, not a language runtime. This differs
from the legacy `mkdocs` overlay which uses `language` for historical reasons.

### Conflict Model

`mkdocs` ↔ `mkdocs2` conflict is bidirectional:

- `overlays/mkdocs/overlay.yml`: `conflicts: [mkdocs2]`
- `overlays/mkdocs2/overlay.yml`: `conflicts: [mkdocs]`

### TypeScript Type

`mkdocs2` is added to the `DevTool` union in `tool/schema/types.ts`, making it
part of the `OverlayId` union used throughout the type system.

---

## Files

| File                                       | Description                                        |
| ------------------------------------------ | -------------------------------------------------- |
| `overlays/mkdocs2/overlay.yml`             | Overlay manifest                                   |
| `overlays/mkdocs2/devcontainer.patch.json` | Port 8000 forwarding + VS Code Markdown extensions |
| `overlays/mkdocs2/setup.sh`                | Pip install into `.venv`                           |
| `overlays/mkdocs2/verify.sh`               | Confirms MkDocs 2.x is installed                   |
| `overlays/mkdocs2/README.md`               | User documentation                                 |
| `overlays/mkdocs/overlay.yml`              | Updated to add bidirectional conflict              |
| `tool/schema/types.ts`                     | Adds `mkdocs2` to `DevTool`                        |
