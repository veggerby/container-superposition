---
Feature Branch: codex/compose-env-materialization
Created: 2026-03-29
Status: Implementing
Input: User request
---

# Spec: Compose Env Materialization and Env Template Naming

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
