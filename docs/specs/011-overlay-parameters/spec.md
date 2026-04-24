# Feature Specification: Overlay Parameters with Safe Substitution

**Spec ID**: `011-overlay-parameters`
**Created**: 2026-03-30
**Status**: Final
**Input**: Issue — Introduce overlay parameters with safe, namespaced substitution — no conflicts with Docker/shell/VS Code

## Summary

Add first-class **parameters** to overlays so users can configure environment-specific values
(credentials, database names, ports, paths) without forking overlays or hand-editing generated
files.

Parameters use the `{{cs.PARAM_NAME}}` substitution syntax, which does not collide with Docker
Compose (`${VAR}`), shell (`$VAR`, `${VAR}`), VS Code (`${localWorkspaceFolder}`), or GitHub
Actions (`${{ }}`).

This is **parameter substitution only** — no loops, no conditionals, no embedded logic.
If `string.replace()` can't do it, it doesn't belong here.

---

## Design

### Syntax

```
{{cs.PARAM_NAME}}
```

- **Safe**: does not collide with `${VAR}` (Docker/shell), `${env:VAR}` (VS Code), or `${{ }}` (GitHub Actions)
- **Consistent**: extends the existing `{{parameters.<key>.id}}` preset convention
- **Explicit**: clearly owned by container-superposition
- **Simple**: resolved by a single `string.replace()` regex, no parser needed

### Overlay parameter declarations (`overlay.yml`)

Overlays declare parameters in `overlay.yml`:

```yaml
id: postgres
name: PostgreSQL
category: database
parameters:
    POSTGRES_DB:
        description: Database name
        default: app
    POSTGRES_USER:
        description: Database user
        default: postgres
    POSTGRES_PASSWORD:
        description: Database password
        default: postgres
        sensitive: true
    POSTGRES_PORT:
        description: Host-mapped port
        default: '5432'
```

Fields:

- `description` (required) — human-readable explanation shown in interactive prompts
- `default` (optional) — default value; absence marks the parameter as _required_
- `sensitive` (optional, boolean) — indicates secrets; hidden in interactive prompts and redacted from plan output

### Usage in overlay files

Overlay patches and compose files reference parameters using `{{cs.PARAM_NAME}}`:

```json
{
    "remoteEnv": {
        "DATABASE_URL": "postgres://{{cs.POSTGRES_USER}}:{{cs.POSTGRES_PASSWORD}}@postgres:5432/{{cs.POSTGRES_DB}}"
    }
}
```

```yaml
# docker-compose.yml — generation-time substitution coexists with Docker runtime substitution
services:
    postgres:
        environment:
            POSTGRES_DB: '{{cs.POSTGRES_DB}}'
            POSTGRES_USER: '{{cs.POSTGRES_USER}}'
            POSTGRES_PASSWORD: '{{cs.POSTGRES_PASSWORD}}'
        ports:
            - '${POSTGRES_PORT:-{{cs.POSTGRES_PORT}}}:5432'
```

### Parameters in `superposition.yml`

```yaml
overlays:
    - postgres
    - redis

parameters:
    POSTGRES_DB: myapp
    POSTGRES_USER: veggerby
    REDIS_PORT: '6380'
```

### Resolution order (highest wins)

1. CLI overrides (`--param POSTGRES_DB=foo`)
2. Project file (`superposition.yml` `parameters:` section)
3. Overlay defaults (`overlay.yml` `parameters[KEY].default`)

### Validation rules

| Condition                                                  | Behaviour                             |
| ---------------------------------------------------------- | ------------------------------------- |
| Missing required parameter (no default, no value supplied) | **Hard error** before generation      |
| Unknown parameter (not declared by any selected overlay)   | **Warning** (proceed)                 |
| Unresolved `{{cs.*}}` in final output                      | **Hard error** (catch-all safety net) |

### Pass-through guarantee

The substitution engine MUST NOT touch:

- Docker Compose expressions: `${VAR}`, `${VAR:-default}`, `$VAR`
- VS Code/devcontainer variables: `${localWorkspaceFolder}`, `${containerWorkspaceFolder}`, `${env:VAR}`
- GitHub Actions expressions: `${{ github.* }}`
- Shell variables in scripts: `$FOO`, `${FOO}`, `${FOO:-default}`

Only tokens matching exactly `{{cs.[A-Z0-9_]+}}` are substituted.

---

## Implementation Scope

### Types (`tool/schema/types.ts`)

```typescript
export interface OverlayParameterDefinition {
    description: string;
    default?: string;
    sensitive?: boolean;
}
```

Add to `OverlayMetadata`:

```typescript
parameters?: Record<string, OverlayParameterDefinition>;
```

Add to `ProjectConfigSelection`:

```typescript
parameters?: Record<string, string>;
```

Add to `QuestionnaireAnswers`:

```typescript
overlayParameters?: Record<string, string>;
```

### Parameter engine (`tool/utils/parameters.ts`)

- `collectOverlayParameters(overlayIds, allOverlayDefs)` — collect all declared parameters from selected overlays with their defaults
- `resolveParameters(declared, supplied)` — apply resolution order, return resolved map and errors
- `substituteParameters(content, resolved)` — replace `{{cs.KEY}}` tokens in a string
- `validateFinalContent(content)` — error if any `{{cs.*}}` remain after substitution

### Composer (`tool/questionnaire/composer.ts`)

After all overlay files are read and before they are written to disk:

1. Collect parameter declarations from selected overlays
2. Merge with `answers.overlayParameters` values
3. Validate — error on missing required parameters
4. Apply substitution to all file content strings (devcontainer.json, docker-compose.yml, .env.example, scripts)
5. Validate — error on any unresolved `{{cs.*}}` tokens remaining in output

### Project config (`tool/schema/project-config.ts`)

Parse `parameters:` YAML map as `Record<string, string>` (string values only).
Propagate to `selection.parameters` → `answers.overlayParameters`.

### Init (`scripts/init.ts`)

When overlay declares parameters, interactive questionnaire prompts for values.
Sensitive parameters use masked input. Pre-filled with defaults.

---

## Non-goals

- Conditional logic (`{{if ...}}`)
- Loops or iteration
- Programmable overlays or JS execution
- Dynamic file generation
- Templating engine integration (Handlebars, Jinja, EJS, etc.)

---

## User Scenarios & Testing

### User Story 1 — Postgres with custom database name (P1)

A user scaffolds a compose stack with the postgres overlay and wants their database named `myapp`
instead of the default `devdb`.

**Acceptance scenarios**:

1. **Given** a `superposition.yml` with `parameters: { POSTGRES_DB: myapp }`, **When** generation runs, **Then** the generated `.devcontainer/docker-compose.yml` and `remoteEnv` in `devcontainer.json` reference `myapp` instead of `devdb`.
2. **Given** an overlay with a required parameter (no default), **When** generation is run without providing the parameter value, **Then** the tool exits with a clear error message before writing any files.
3. **Given** generated files contain no `{{cs.*}}` tokens, **When** output is validated, **Then** no error is raised and Docker Compose `${VAR}` expressions are preserved unmodified.
4. **Given** a user runs `init` interactively with the postgres overlay, **When** the questionnaire reaches parameters, **Then** the user is prompted for each declared parameter with the default pre-filled.

### User Story 2 — Sensitive parameter (P2)

A user provides a database password via parameter. The password must not appear in plan output in cleartext.

**Acceptance scenarios**:

1. **Given** a parameter has `sensitive: true`, **When** the plan command shows parameter values, **Then** the value is displayed as `***`.
2. **Given** a parameter has `sensitive: true`, **When** the interactive questionnaire prompts for it, **Then** the input is masked.

### User Story 3 — Unknown parameter warning (P3)

A user adds a parameter in `superposition.yml` that is not declared by any selected overlay.

**Acceptance scenarios**:

1. **Given** `parameters: { UNKNOWN_PARAM: foo }` in `superposition.yml`, **When** generation runs, **Then** a warning is printed but generation succeeds.
