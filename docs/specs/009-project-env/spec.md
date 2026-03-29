---
Feature Branch: codex/project-env
Created: 2026-03-29
Status: Implementing
Input: User request
---

# Spec: Unified Project-Level Environment Variables

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
