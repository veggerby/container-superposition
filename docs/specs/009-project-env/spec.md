# Feature Specification: Unified Project-Level Environment Variables

**Feature Branch**: `codex/project-env`
**Created**: 2026-03-29
**Status**: Implementing
**Input**: User request

## Review & Approval _(mandatory before implementation)_

- **Spec Path**: `docs/specs/009-project-env/spec.md`
- **Commit Status**: Committed
- **Review Status**: Pending
- **Implementation Gate**: No implementation code may begin until this spec is committed and reviewed.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Define environment variables once for plain stack (Priority: P1)

A developer adds an `env:` block to `superposition.yml` on a `plain` stack and expects the
variables to appear in `devcontainer.json → remoteEnv` after regeneration.

**Why this priority**: The most common use case is a plain-stack project needing a handful of
environment variables visible inside the devcontainer without manually editing JSON files.

**Independent Test**: Create a `superposition.yml` with `stack: plain` and `env: {APP_NAME: my-app}`,
run `regen`, and confirm that `devcontainer.json` contains `"remoteEnv": {"APP_NAME": "my-app"}`.

**Acceptance Scenarios**:

1. **Given** `superposition.yml` has `env: {APP_NAME: my-app}`, **When** generation runs with `stack: plain`, **Then** `devcontainer.json` includes `remoteEnv.APP_NAME: my-app`.
2. **Given** `env:` uses the long form (`{value: "foo", target: auto}` — an object with a required `value` string and optional `target` routing hint), **When** generation runs with `stack: plain`, **Then** the variable is written to `remoteEnv` identical to the string shorthand.

---

### User Story 2 — Define environment variables once for compose stack (Priority: P1)

A developer adds an `env:` block to `superposition.yml` on a `compose` stack and expects the
variables to appear in `docker-compose.yml → services.devcontainer.environment` after regeneration.

**Why this priority**: Compose-stack users currently must split env configuration across
`customizations.devcontainerPatch.remoteEnv` and `customizations.dockerComposePatch`, which is
error-prone and hard to discover.

**Independent Test**: Create a `superposition.yml` with `stack: compose` and
`env: {DB_HOST: postgres}`, run `regen`, and confirm the variable appears under
`services.devcontainer.environment` in the generated `docker-compose.yml`.

**Acceptance Scenarios**:

1. **Given** `superposition.yml` has `env: {DB_HOST: postgres}` on a compose stack, **When** generation runs, **Then** `docker-compose.yml` contains `services.devcontainer.environment.DB_HOST: postgres`.
2. **Given** `target: composeEnv` is specified, **When** generation runs with `stack: plain`, **Then** generation errors with a clear message about compose-only targets.

---

### User Story 3 — Explicit target overrides auto-routing (Priority: P2)

A developer uses `target: remoteEnv` on a compose-stack project to force a variable into
`devcontainer.json` instead of `docker-compose.yml`.

**Why this priority**: Power users occasionally need fine-grained control over where a variable
lands, especially for VS Code-specific settings that must be in `remoteEnv`.

**Independent Test**: Set `target: remoteEnv` on a variable in a compose-stack project, run
`regen`, and confirm the variable is in `devcontainer.json → remoteEnv` (not in
`docker-compose.yml → services.devcontainer.environment`).

**Acceptance Scenarios**:

1. **Given** `{value: "bar", target: remoteEnv}` in `env:` on a compose stack, **When** generation runs, **Then** the variable is written to `devcontainer.json → remoteEnv` only.

---

## Overview

Add a first-class `env` field to `superposition.yml` so a project can define
environment variables once and have them land in the correct generated output:

- `remoteEnv` for `plain` stacks
- `services.devcontainer.environment` in `docker-compose.yml` for `compose` stacks

This removes the need to split simple container environment variables across
`customizations.devcontainerPatch.remoteEnv` and
`customizations.dockerComposePatch`.

## Project File Shape

```yaml
env:
    APP_NAME: my-app
    API_BASE_URL:
        value: ${API_BASE_URL:-http://localhost:3000}
        target: auto
```

Rules:

- `env` is a map keyed by variable name.
- A value may be:
    - a string shorthand, equivalent to `{ value: "<string>", target: auto }`
    - an object with:
        - `value: string` required
        - `target: auto | remoteEnv | composeEnv` optional, default `auto`

## Generation Behavior

### `target: auto`

- `plain` stack: write the variable to `devcontainer.json -> remoteEnv`
- `compose` stack: write the variable to
  `docker-compose.yml -> services.devcontainer.environment`

### Explicit targets

- `remoteEnv`: always write to `devcontainer.json -> remoteEnv`
- `composeEnv`: write to `docker-compose.yml -> services.devcontainer.environment`
  and error on non-compose stacks

### Precedence

- Project-level `env` is applied before `customizations.devcontainerPatch` and
  `customizations.dockerComposePatch`.
- Custom patch files remain the escape hatch and may override project-level env.

## Root `.env` Expansion Bridge

When a compose-targeted project env value references `${NAME}` or
`${NAME:-default}`, generation should preserve that expression in
`docker-compose.yml` and also mirror matching keys from the project root `.env`
into `.devcontainer/.env`.

This allows:

1. the repository root `.env` to remain the human-edited source of truth
2. Docker Compose to resolve variables from `.devcontainer/.env`
3. generated `docker-compose.yml` to avoid embedding resolved secret values

Bridge rules:

- only referenced variable names are copied
- existing unrelated entries in `.devcontainer/.env` are preserved
- missing root variables are not invented; Docker Compose defaults still work

## Non-Goals

- No new syntax for targeting arbitrary non-devcontainer services
- No replacement for advanced compose patches; those remain under
  `customizations.dockerComposePatch`
