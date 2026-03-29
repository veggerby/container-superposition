# Feature Specification: Compose Env Materialization and Env Template Naming

**Feature Branch**: `codex/compose-env-materialization`
**Created**: 2026-03-29
**Status**: Implementing
**Input**: User request

## Review & Approval _(mandatory before implementation)_

- **Spec Path**: `docs/specs/010-compose-env-materialization/spec.md`
- **Commit Status**: Committed
- **Review Status**: Pending
- **Implementation Gate**: No implementation code may begin until this spec is committed and reviewed.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Compose env values materialize into .devcontainer/.env (Priority: P1)

A developer sets concrete env values in `superposition.yml` on a `compose` stack and expects
them to be written to `.devcontainer/.env` (not embedded in `docker-compose.yml`) so that
secrets are not committed to source control inside generated YAML.

**Why this priority**: Embedding resolved values directly in `docker-compose.yml` would expose
secrets or host-specific values in generated files that are typically committed to source control.
Materializing them into `.devcontainer/.env` keeps generated config template-only.

**Independent Test**: Set `env: {SECRET_KEY: supersecret}` on a compose-stack project, run
`regen`, and confirm: (a) `docker-compose.yml` contains
`services.devcontainer.environment.SECRET_KEY: ${SECRET_KEY}`, (b) `.devcontainer/.env` contains
`SECRET_KEY=supersecret`, and (c) the literal value `supersecret` does not appear in
`docker-compose.yml`.

**Acceptance Scenarios**:

1. **Given** `env: {API_KEY: abc123}` on a compose stack, **When** generation runs, **Then** `docker-compose.yml` has `API_KEY: ${API_KEY}` and `.devcontainer/.env` has `API_KEY=abc123`.
2. **Given** `env: {NAME: ${NAME:-default}}`, **When** generation runs with a root `.env` that sets `NAME=prod`, **Then** `.devcontainer/.env` receives `NAME=prod`.
3. **Given** `env: {NAME: ${NAME}}` and no root `.env` entry for `NAME`, **When** generation runs, **Then** `.devcontainer/.env` does not include `NAME=` and Docker Compose shell fallback still works.

---

### User Story 2 — Rename customizations.environment to customizations.envTemplate (Priority: P1)

A developer updates their `superposition.yml` to use `customizations.envTemplate` and expects the
generated `.env.example` content to be identical to what `customizations.environment` produced.

**Why this priority**: The existing `environment` key is misleading — it writes to `.env.example`
(a template), not to the runtime container environment. Renaming it clarifies intent and prevents
confusion with the new `env:` field.

**Independent Test**: Replace `customizations.environment` with `customizations.envTemplate` in a
project file, run `regen`, and confirm the generated `.env.example` is byte-for-byte identical to
the output produced with the old key.

**Acceptance Scenarios**:

1. **Given** `customizations.envTemplate: {FOO: bar}`, **When** generation runs, **Then** `.devcontainer/.env.example` contains `FOO=bar`.
2. **Given** `customizations.environment: {FOO: bar}` (deprecated alias), **When** generation runs, **Then** `.devcontainer/.env.example` still contains `FOO=bar` (backward-compatible).
3. **Given** a project file using `environment`, **When** it is read by the project loader, **Then** a deprecation warning is emitted directing users to rename the key.

---

### User Story 3 — remoteEnv wiring for compose env entries (Priority: P2)

A developer on a compose stack expects that compose-targeted env variables are also accessible
via `${containerEnv:KEY}` in `devcontainer.json → remoteEnv` so VS Code settings and
extensions can reference them.

**Why this priority**: Without a `remoteEnv` entry, VS Code extensions that read `process.env`
at startup may not see the variable, even though the container process will.

**Independent Test**: Set a compose-stack env variable, run `regen`, and confirm
`devcontainer.json → remoteEnv` includes `KEY: ${containerEnv:KEY}` alongside the
`docker-compose.yml` entry.

**Acceptance Scenarios**:

1. **Given** `env: {DB_URL: postgres://localhost/dev}` on a compose stack, **When** generation runs, **Then** `devcontainer.json` contains `remoteEnv.DB_URL: ${containerEnv:DB_URL}`.

---

## Overview

Refine project-file environment semantics so compose-based projects do not
embed resolved env values directly in generated `docker-compose.yml` or
`devcontainer.json`.

At the same time, rename the project-file field
`customizations.environment` to `customizations.envTemplate` to make its
purpose explicit: it writes template variables to `.env.example`, not runtime
container environment.

## Behavior

### `env:` on `stack: compose`

For compose-targeted project env entries:

1. Materialize concrete values into `.devcontainer/.env`
2. Write `docker-compose.yml -> services.devcontainer.environment.KEY: ${KEY}`
3. Write `devcontainer.json -> remoteEnv.KEY: ${containerEnv:KEY}`

This keeps generated config free of resolved secret values while still making
the variables available inside the devcontainer.

### Value Resolution

- literals are written as-is to `.devcontainer/.env`
- `${NAME}` resolves from the repository root `.env` when present
- `${NAME:-default}` resolves from the repository root `.env`, otherwise uses
  the inline default
- unresolved `${NAME}` values are omitted from `.devcontainer/.env` so shell
  environment fallback remains possible

### `env:` on `stack: plain`

No change: values still land directly in `devcontainer.json -> remoteEnv`.

## `customizations.envTemplate`

- `customizations.envTemplate` is the canonical project-file field for values
  that should be written to `.env.example`
- `customizations.environment` is retained as a deprecated backward-compatible
  alias
- serializers should emit `envTemplate`

## Non-Goals

- no change to `.devcontainer/custom/environment.env`
- no support for targeting arbitrary compose sidecar services from `env:`
