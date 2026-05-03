# Feature Specification: First-Class Mounts Support

**Spec ID**: `019-project-mounts`
**Created**: 2026-05-03
**Status**: Approved
**Input**: User request

## Overview

Add a top-level `mounts` field to `superposition.yml` that lets users declare filesystem mounts
once and have the generation pipeline route them to the correct devcontainer artifact based on
the active stack.

This feature is modeled after the existing first-class `env` behavior.

---

## User Scenarios & Testing

### User Story 1 — Declare a mount on a plain stack (Priority: P1)

A developer adds a `mounts:` list to `superposition.yml` on a `plain` stack and expects each
entry to appear in `devcontainer.json → mounts[]` after regeneration.

**Why this priority**: Plain-stack users who need bind mounts (e.g. a shared workspace folder)
currently must write custom `devcontainerPatch` JSON, which is difficult to discover and
error-prone.

**Independent Test**: Create a `superposition.yml` with `stack: plain` and a `mounts:` entry.
Run `regen` and confirm the raw string appears in `devcontainer.json mounts`.

**Acceptance Scenarios**:

1. **Given** `mounts: ["source=${localWorkspaceFolder}/../libs,target=/workspace/libs,type=bind"]`
   with `stack: plain`, **When** generation runs, **Then** the string is present in
   `devcontainer.json mounts[]`.
2. **Given** a long-form entry `{value: "...", target: devcontainerMount}` with `stack: plain`,
   **When** generation runs, **Then** the mount value is present in `devcontainer.json mounts[]`.
3. **Given** a long-form entry with `target: auto` on `stack: plain`, **When** generation runs,
   **Then** the mount routes to `devcontainer.json mounts[]` (same as default).

---

### User Story 2 — Declare a mount on a compose stack (Priority: P1)

A developer adds a `mounts:` list to `superposition.yml` on a `compose` stack and expects each
entry (with `target: auto` or string shorthand) to appear in `devcontainer.json mounts[]` —
the same as it would on a plain stack — so the project file is **stack-agnostic**.

**Why this priority**: Users should be able to swap `stack: plain` ↔ `stack: compose` without
needing to touch the `mounts:` block.

**Independent Test**: Create a `superposition.yml` with `stack: compose` and a `mounts:` entry.
Run `regen` and confirm the entry appears in `devcontainer.json mounts[]` (not in compose
volumes, unless `composeVolume` is explicitly requested).

**Acceptance Scenarios**:

1. **Given** `mounts: ["./data:/workspace/data"]` with `stack: compose`, **When** generation runs,
   **Then** `./data:/workspace/data` appears in `devcontainer.json mounts[]`.
2. **Given** `target: auto` on `stack: compose`, **When** generation runs, **Then** the mount
   routes to `devcontainer.json mounts[]` (same as plain — stack-agnostic).

---

### User Story 3 — Explicit `composeVolume` target for Docker Compose volumes (Priority: P2)

A developer who specifically wants a mount wired as a Docker Compose service volume (e.g. to
leverage named volumes or compose-specific semantics) sets `target: composeVolume`.

**Acceptance Scenarios**:

1. **Given** `{value: "...", target: composeVolume}` on `stack: compose`, **When** generation
   runs, **Then** the value appears in `docker-compose.yml services.devcontainer.volumes[]`.
2. **Given** `{value: "...", target: composeVolume}` on `stack: plain`, **When** generation runs,
   **Then** generation errors with a clear message about compose-only targets.

---

### User Story 4 — Mounts coexist with customizations patches (Priority: P1)

Mounts declared in the top-level `mounts:` field are applied before
`customizations.devcontainerPatch` and `customizations.dockerComposePatch`, so patch overrides
are still respected.

**Acceptance Scenarios**:

1. **Given** a `mounts:` entry and a `customizations.devcontainerPatch` that adds an additional
   mount, **When** generation runs, **Then** both mounts appear in `devcontainer.json` (union merge).
2. **Given** a compose-stack `mounts:` entry and a `customizations.dockerComposePatch` that adds
   extra volumes, **When** generation runs, **Then** both sets appear in
   `services.devcontainer.volumes`.

---

### User Story 5 — Validation (Priority: P1)

The parser rejects clearly invalid mount declarations.

**Acceptance Scenarios**:

1. `target: composeVolume` on `stack: plain` → error at compose/devcontainer generation time.
2. An entry with an empty `value` string → `ProjectConfigError` at parse time.
3. An entry that is neither a string nor an object with `value` → `ProjectConfigError`.

---

## Schema Design

### `superposition.yml`

```yaml
mounts:
    # string shorthand — raw mount spec
    - 'source=${localWorkspaceFolder}/../libs,target=/workspace/libs,type=bind'
    # long form — explicit target routing
    - value: './data:/workspace/data'
      target: auto # default; plain→devcontainer.json, compose→docker-compose.yml
    - value: 'source=certs,target=/certs,type=volume'
      target: devcontainerMount # always devcontainer.json
    - value: './logs:/workspace/logs'
      target: composeVolume # always docker-compose volumes (compose only)
```

### Routing table

| `target`            | `stack: plain`             | `stack: compose`                                   |
| ------------------- | -------------------------- | -------------------------------------------------- |
| `auto` (default)    | `devcontainer.json mounts` | `devcontainer.json mounts`                         |
| `devcontainerMount` | `devcontainer.json mounts` | `devcontainer.json mounts`                         |
| `composeVolume`     | ❌ Error                   | `docker-compose.yml services.devcontainer.volumes` |

`auto` and `devcontainerMount` are stack-agnostic: they always route to `devcontainer.json
mounts[]` so that the same `superposition.yml` works without modification when swapping
`stack: plain` ↔ `stack: compose`.

---

## Implementation Plan

### Types (`tool/schema/types.ts`)

- `ProjectMountTarget = 'auto' | 'devcontainerMount' | 'composeVolume'`
- `ProjectMount = { value: string; target?: ProjectMountTarget }`
- `QuestionnaireAnswers.projectMounts?: ProjectMount[]`
- `ProjectConfigSelection.mounts?: Array<string | ProjectMount>`

### Schema (`tool/schema/config.schema.json`)

Add `mounts` as an array of `string | {value, target?}` (oneOf), matching the `env` pattern.

### Parser (`tool/schema/project-config.ts`)

- `parseMounts(value): ProjectMount[] | undefined` — normalize strings to `{value}` objects
- Add `'mounts'` to the supported-keys set
- Thread `mounts` through `loadProjectConfig`, `buildAnswersFromProjectConfig`,
  `buildProjectConfigSelectionFromAnswers`, and `buildProjectConfigDocument`

### Composer (`tool/questionnaire/composer.ts`)

- `resolveProjectMountTarget(mount, stack)` — maps `ProjectMountTarget` to resolved destination
- `applyProjectMountsToDevcontainer(config, mounts, stack)` — deepMerge devcontainerMount entries
  into `config.mounts`
- Thread compose-volume mounts into `mergeDockerComposeFiles` (analogous to `projectEnv`)
- Apply before custom patches

### Application order

1. Base template loaded
2. Overlays applied
3. Port offsets applied
4. Project env applied to devcontainer + compose
5. **Project mounts applied to devcontainer + compose** ← new
6. Custom patches applied (devcontainerPatch, dockerComposePatch)
7. Target patches applied
8. Files written
