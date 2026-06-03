# Feature Specification: Variable Expansion and Substitution Consolidation

**Spec ID**: `025-variable-expansion-consolidation`
**Taxonomy**: `SCHEMA-FIELD, CLI-UX`
**Created**: 2026-06-03
**Author**: PM Agent
**Status**: Final
**Input**: User request — clarify/improve variable expansion precedence, enable `env:` values to reference `parameters:`, add doctor checks for sensitive-value exposure and first-class property promotion, assess `{{cs.XXX}}` token design.

---

## Problem Statement

The system has multiple variable data sources that interact at generation time:

1. Overlay parameter defaults (`overlay.yml` `parameters[KEY].default`)
2. Project `parameters:` map (`superposition.yml`)
3. CLI `--param KEY=VALUE` overrides
4. Project `env:` map (`superposition.yml` / `superposition.local.yml`)
5. Root `.env` file (host-repo; read during port resolution and compose env materialization)
6. `{{cs.KEY}}` token substitution engine (applied to overlay files, `.env.example`)
7. `customizations.envTemplate` → `.devcontainer/.env.example`
8. `.devcontainer/.env` (materialized output for compose stacks)

These sources are **not documented together** in any single precedence table, and they **interact inconsistently**:

- `env:` values are static strings — they cannot reference `parameters:` values.
  This forces duplication like:

    ```yaml
    parameters:
        POSTGRES_DB: au2complt
        POSTGRES_USER: au2complt
        POSTGRES_PASSWORD: au2complt
        POSTGRES_PORT: 5432

    env:
        DATABASE_URL: postgresql://au2complt:au2complt@postgres:5432/au2complt # duplicated!
    ```

    The desired authoring pattern is:

    ```yaml
    env:
        DATABASE_URL: postgresql://{{cs.POSTGRES_USER}}:{{cs.POSTGRES_PASSWORD}}@postgres:{{cs.POSTGRES_PORT}}/{{cs.POSTGRES_DB}}
    ```

- Doctor checks for sensitive parameter exposure are incomplete:
    - Doctor detects sensitive params in plain text in generated `devcontainer.json remoteEnv`.
    - Doctor does **not** detect sensitive params hardcoded verbatim in `superposition.yml` `parameters:`.
    - Doctor does **not** detect sensitive params that flow into `.devcontainer/.env` after compose env materialization.

- Doctor has no heuristic to suggest promoting `customizations` patterns to first-class fields (`mounts`, `ports`, `env`).

- `{{cs.KEY}}` token syntax is documented only in spec 011 and `parameters.ts`. Its rationale, scope, and pass-through guarantees are not surfaced in user-facing docs or schema annotations.

---

## Goals

1. **Document precedence** — publish a canonical precedence table for all variable sources covering generation-time resolution, Docker Compose runtime, and devcontainer host.
2. **Enable parameter interpolation in `env:` values** — apply `{{cs.KEY}}` substitution to `superposition.yml` and `superposition.local.yml` `env:` values after parameter resolution, before values are written to generated output.
3. **Extend doctor sensitive-value checks** — warn when sensitive parameters appear as plaintext in `superposition.yml` `parameters:`, in `.devcontainer/.env`, or in `env:` values of the project file.
4. **Add doctor first-class property suggestions** — detect `customizations` usage patterns that match already-implemented first-class fields (`env`, `mounts`, `ports`) and suggest migration.
5. **Assess and document `{{cs.KEY}}` design** — decide whether the syntax, naming, and scope remain appropriate; produce a recommendation and update docs.

## Non-Goals

- Env-to-env interpolation (e.g. `env.DATABASE_URL` referencing `env.POSTGRES_USER` via any syntax). Out of scope for this iteration.
- Runtime secret management (Vault, sealed secrets, etc.).
- Process-environment variable injection at generation time (no `${process.env.FOO}` resolution).
- Changing the `{{cs.KEY}}` regex to support lowercase or dotted paths.
- Automatic migration of `customizations` to first-class fields. Doctor suggestion only; no `--fix` for this finding.
- Changing how Docker Compose `${VAR}` or shell `$VAR` are handled.
- New CLI flags or interactive prompts for the interpolation feature.

---

## Discovery / Research Requirements

Before implementation begins, architect must confirm:

1. **Composer ordering**: at what point in `composeDevContainer()` are `projectEnv` values applied to generated artifacts? Verify `{{cs.KEY}}` substitution on `projectEnv` can be inserted after parameter resolution (step ~12 today) and before `projectEnv` values reach `applyProjectEnvToDevcontainer()` and `materializeComposeProjectEnvFile()`.
2. **`env:` value expression types**: what expression types currently appear in project `env:` values that must be preserved verbatim — e.g. `${VAR:-default}`, `${containerEnv:KEY}`. Confirm the `{{cs.KEY}}` regex does not collide with any of these.
3. **Local config ordering**: `superposition.local.yml` `env:` is merged after shared `env:` (spec 022). Confirm `{{cs.KEY}}` substitution applies to both shared and local `env:` values using the same resolved parameter set.
4. **Schema validation**: determine whether JSON Schema can annotate `env:` value strings to document that `{{cs.KEY}}` tokens are supported.
5. **Doctor `customizations` heuristics**: survey what first-class-equivalent patterns look like in `customizations.devcontainerPatch.remoteEnv`, `customizations.dockerComposePatch`, and `customizations.devcontainerPatch.mounts` to define detection rules.

---

## Variable Sources and Precedence

### Generation-time parameter resolution (`{{cs.KEY}}` substitution)

Applies when overlay files, `.env.example`, or `env:` values contain `{{cs.KEY}}` tokens.

| Priority    | Source                                  | Scope                    |
| ----------- | --------------------------------------- | ------------------------ |
| 1 (highest) | CLI `--param KEY=VALUE`                 | generation run only      |
| 2           | `superposition.yml` `parameters:` map   | committed shared config  |
| 3           | `overlay.yml` `parameters[KEY].default` | overlay built-in default |

Rules:

- Missing required parameter (no default, no supplied value) → **hard error** before generation.
- Unknown parameter key in `parameters:` → **warning** (proceed).
- Unresolved `{{cs.*}}` token remaining after substitution → **hard error**.

### `env:` value resolution (generation-time)

Applies when `env:` values contain `${VAR}` or `${VAR:-default}` expressions.

| Priority    | Source                                 | Scope                                                                           |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| 1 (highest) | `superposition.local.yml` `env:` value | local only, never committed                                                     |
| 2           | `superposition.yml` `env:` value       | committed shared config                                                         |
| —           | Root `.env`                            | resolves `${VAR}` in plain-stack port expansion and compose env materialization |

`{{cs.KEY}}` substitution on `env:` values (introduced by this spec) is applied **before** `env:` values are written to any generated artifact. The resolved `parameters:` map from step above is used.

### Docker Compose runtime resolution

| Source                                    | Resolved by    | When            |
| ----------------------------------------- | -------------- | --------------- |
| `.devcontainer/.env`                      | Docker Compose | container start |
| Host environment variables                | Docker Compose | container start |
| `${VAR:-default}` in `docker-compose.yml` | Docker Compose | container start |

### Full generation pipeline order (updated)

1. Overlay defaults collected
2. Parameters resolved: CLI > project `parameters:` > overlay defaults
3. Overlay files loaded (patches, compose snippets, setup scripts)
4. `{{cs.KEY}}` substitution applied to overlay file content
5. `projectEnv` loaded (shared `env:`, then local `env:` override)
6. **NEW**: `{{cs.KEY}}` substitution applied to all `projectEnv` values using resolved parameters from step 2
7. Base template applied
8. Overlays applied
9. `projectEnv` applied to devcontainer/compose output
10. `projectMounts` applied
11. Port expansion (root `.env` read here)
12. Shell profile applied
13. Custom directory patches applied
14. Project `customizations` applied
15. Target patch applied
16. Files written (devcontainer.json, docker-compose.yml, .env.example, .devcontainer/.env)
17. `{{cs.KEY}}` substitution applied to any remaining .env.example content
18. Validation: error if any `{{cs.*}}` tokens remain in generated output

---

## Feature 1: `{{cs.KEY}}` Substitution in `env:` Values

### Behavior

- After parameters are resolved (step 2 above), apply `{{cs.KEY}}` substitution to every `ProjectEnvVar.value` string in both shared and local `projectEnv`.
- Substitution uses `substituteParameters(value, resolvedParams)` from the existing engine.
- Substitution happens in-memory before the modified `projectEnv` reaches any downstream composer function. The project file on disk is **never modified**.
- If a `{{cs.KEY}}` token in an `env:` value refers to an unknown parameter key (not declared by any selected overlay), substitution leaves the token intact; the existing unresolved-token validation in step 18 produces a **hard error**.
- `${VAR}`, `${VAR:-default}`, and `${containerEnv:KEY}` expressions in `env:` values are **never touched** — pass-through guarantee is identical to the existing engine.
- `substituteParametersInObject` already handles recursive string-field substitution; the same function may be reused on the `projectEnv` map entries.

### Example

`superposition.yml`:

```yaml
parameters:
    POSTGRES_DB: au2complt
    POSTGRES_USER: au2complt
    POSTGRES_PASSWORD: au2complt
    POSTGRES_PORT: 5432
    POSTGRES_VERSION: 16

env:
    DATABASE_URL: postgresql://{{cs.POSTGRES_USER}}:{{cs.POSTGRES_PASSWORD}}@postgres:{{cs.POSTGRES_PORT}}/{{cs.POSTGRES_DB}}
```

After substitution (in-memory):

```
DATABASE_URL = "postgresql://au2complt:au2complt@postgres:5432/au2complt"
```

Generated `devcontainer.json` (plain stack):

```json
{
    "remoteEnv": {
        "DATABASE_URL": "postgresql://au2complt:au2complt@postgres:5432/au2complt"
    }
}
```

Generated `docker-compose.yml` services.devcontainer.environment (compose stack):

```yaml
DATABASE_URL: ${DATABASE_URL}
```

Generated `.devcontainer/.env` (compose stack):

```env
DATABASE_URL=postgresql://au2complt:au2complt@postgres:5432/au2complt
```

### Schema / Docs

- `env:` value string annotation in JSON Schema should note: supports `{{cs.KEY}}` parameter tokens (resolved at generation time) and `${VAR:-default}` Docker Compose expressions (resolved at container start).
- User-facing docs (`docs/superposition-yml.md` or equivalent) must include the `DATABASE_URL` example above showing how to avoid duplication.

---

## Feature 2: Extended Doctor Sensitive-Value Checks

### Check 2a — Sensitive parameter value hardcoded in `superposition.yml` `parameters:`

**Trigger**: `doctor` loads `superposition.yml` `parameters:` and finds that a key declared `sensitive: true` in any selected overlay has a non-empty value that does not start with `${`.

**Finding**:

```
⚠ Sensitive parameter(s) hardcoded in project file:
    POSTGRES_PASSWORD — declared sensitive by overlay 'postgres'
  Sensitive values should not be committed. Use ${VAR} or ${VAR:-default} to reference
  a value from root .env instead, and add the real value to root .env (gitignored).
```

**Status**: `warn` (not `fail`; the value is committed, not generated, and the user may be intentional).
**Fix eligibility**: `manual-only` — doctor cannot safely rewrite project file.

### Check 2b — Sensitive parameter value flows into `.devcontainer/.env`

**Trigger**: After generation, `doctor` reads `.devcontainer/.env` and checks whether any key is declared `sensitive: true` by a selected overlay and appears as a plain-text value (not `${VAR}` reference).

**Finding**:

```
⚠ Sensitive parameter(s) written as plain text to .devcontainer/.env:
    POSTGRES_PASSWORD
  If .devcontainer/ is committed to source control, this exposes the secret.
  Prefer referencing ${POSTGRES_PASSWORD} and storing the real value in root .env.
```

**Status**: `warn`.
**Fix eligibility**: `manual-only`.

### Check 2c — Existing check 2 (sensitive params in `devcontainer.json remoteEnv`) scope

No change to existing check. Ensure checks 2a/2b do not duplicate its findings.

### Suppression rule

All sensitive-value checks suppress when the value equals the overlay default. The default is considered non-sensitive by convention (it is already committed in `overlay.yml`).

---

## Feature 3: Doctor First-Class Property Promotion Suggestions

Doctor should detect when `customizations` usage can be replaced by a first-class field. These are informational, low-priority suggestions (`info` status), not warnings.

### Pattern 3a — `customizations.devcontainerPatch.remoteEnv` usage

**Trigger**: `superposition.yml` `customizations.devcontainerPatch` has `remoteEnv` keys **and** `env:` is absent or empty.

**Suggestion**:

```
ℹ customizations.devcontainerPatch.remoteEnv is set. Consider moving these variables to
  the top-level env: field, which routes them automatically for both plain and compose stacks
  and supports {{cs.KEY}} parameter references.
```

### Pattern 3b — `customizations.dockerComposePatch` env usage

**Trigger**: `customizations.dockerComposePatch` has `services.devcontainer.environment` keys **and** `env:` is absent or empty.

**Suggestion**: same message as 3a.

### Pattern 3c — `customizations.devcontainerPatch.mounts` usage

**Trigger**: `customizations.devcontainerPatch` has `mounts` array **and** top-level `mounts:` is absent or empty.

**Suggestion**:

```
ℹ customizations.devcontainerPatch.mounts is set. Consider moving mounts to the top-level
  mounts: field (spec 019), which provides structured validation and routing for both
  plain and compose stacks.
```

### Pattern 3d — `customizations.dockerComposePatch` ports usage

**Trigger**: `customizations.dockerComposePatch` has `services.*ports` entries **and** top-level `ports:` is absent or empty.

**Suggestion**:

```
ℹ customizations.dockerComposePatch contains port bindings. Consider moving them to the
  top-level ports: field for validation, auto-forward, and port-offset support.
```

### General rules for promotion suggestions

- All patterns are `info` status, never `warn` or `fail`.
- Fix eligibility: `manual-only`. Doctor `--fix` must not auto-migrate customizations.
- Suggestions only appear when `customizations` usage exists; absence is silent.
- Suggestion messages include the relevant spec ID or docs link when docs exist.

---

## Feature 4: `{{cs.KEY}}` Token Syntax Assessment

### Current state

- Token: `{{cs.KEY}}` where KEY matches `[A-Z0-9_]+`
- Engine: `tool/utils/parameters.ts`
- Applied to: overlay patches, compose files, setup/verify scripts, `.env.example`, and (with this spec) `env:` values
- Pass-through guarantee: does not collide with `${VAR}`, `${env:VAR}`, `${localWorkspaceFolder}`, `${{ }}`, or plain `$FOO`
- Documented in: spec 011, `parameters.ts` file header

### Assessment findings

**Keep `{{cs.KEY}}`** as the primary substitution syntax. Rationale:

1. The namespace prefix `cs.` is explicit, unambiguous, and owned by this tool.
2. The `{{` `}}` delimiters are unique in the ecosystem of files the tool generates.
3. The regex is simple and has been tested against all relevant expression types.
4. Renaming would be a breaking change to all existing `overlay.yml` files and user project files that already use the syntax.

**Changes recommended by this spec**:

1. Add `{{cs.KEY}}` to JSON Schema annotations for every string field that supports it (`parameters:` values, `env:` values — see Feature 1).
2. Add a top-level section in `docs/superposition-yml.md` titled "Parameter tokens (`{{cs.KEY}}`)" documenting:
    - Syntax and key format
    - Supported fields (overlay file content, `env:` values, `customizations.envTemplate` values)
    - Unsupported fields (non-string positions, anything outside overlay-generated files)
    - Pass-through guarantee table
    - Rationale for `cs.` prefix
3. Remove stale references to an older `{{parameters.<key>.id}}` preset convention if they remain in docs.
4. No rename, no new alternative syntax.

**Out of scope**: support for lowercase keys, dotted paths, or conditional expressions.

---

## UX Contract

### Mental model — two-tier substitution

The single most important concept for users and doc writers:

| Tier            | Syntax                       | Resolved by            | When             | Safe for secrets?                        |
| --------------- | ---------------------------- | ---------------------- | ---------------- | ---------------------------------------- |
| Generation-time | `{{cs.KEY}}`                 | This tool              | `regen` / `init` | No — value baked into generated file     |
| Runtime         | `${VAR}` / `${VAR:-default}` | Docker Compose / shell | Container start  | Yes — value stays in `.env` (gitignored) |

Rule for all user-facing docs: every use of `{{cs.KEY}}` must follow immediately with a note that the value is written to generated output in plain text. Every use of `${VAR}` must note it stays unresolved until container start.

**Decision tree (use this in docs):**

```
Is the value the same for everyone on the team?
  Yes → {{cs.KEY}} in env: value  (resolved at regen, baked in)
  No  → ${VAR:-safe_default} in env: value  (each dev sets it in .env)

Is the value a secret?
  Yes → NEVER use {{cs.KEY}}; always ${VAR:-default}
  No  → either syntax is acceptable
```

---

### Canonical interaction model — `env:` value authoring

#### Supported forms (both must work identically)

**String shorthand:**

```yaml
env:
    DATABASE_URL: 'postgresql://{{cs.POSTGRES_USER}}:{{cs.POSTGRES_PASSWORD}}@postgres:{{cs.POSTGRES_PORT}}/{{cs.POSTGRES_DB}}'
```

**Long form (with routing target):**

```yaml
env:
    DATABASE_URL:
        value: 'postgresql://{{cs.POSTGRES_USER}}:{{cs.POSTGRES_PASSWORD}}@postgres:{{cs.POSTGRES_PORT}}/{{cs.POSTGRES_DB}}'
        target: composeEnv
```

`{{cs.KEY}}` substitution MUST apply to `ProjectEnvVar.value` in the long form, not only to the shorthand string. The spec's Feature 1 implementation MUST substitute `.value` regardless of which form is used. This is a required constraint for the architect's insertion point.

#### Inapplicable positions (must be documented explicitly)

| Field                                    | `{{cs.KEY}}` supported? | Reason                                 |
| ---------------------------------------- | ----------------------- | -------------------------------------- |
| `env:` key (left side)                   | No                      | Keys are literal identifiers           |
| `env:` `.target`                         | No                      | Enum value, not a string template      |
| `ports:` expressions                     | No                      | Ports use `${VAR}` runtime syntax only |
| `stack:`, `baseImage:`, `containerName:` | No                      | Scalar config, no substitution         |
| `parameters:` values                     | No                      | Parameters ARE the resolved source     |

---

### Interaction rules — `env:` value resolution

Existing docs for `env:` (`docs/superposition-yml.md` §env) currently say:

> Values can reference variables from the root `.env` file using `${VAR}` or `${VAR:-default}` syntax. These are resolved at generation time and written into the appropriate output file.

**This wording is misleading for compose stacks.** For `stack: compose`, `${VAR}` expressions in `env:` values are written as-is to `docker-compose.yml` (environment key references `.devcontainer/.env` at runtime). They are NOT resolved by the tool at generation time. Only `stack: plain` writes the resolved value.

**Required docs fix** (spec must require this correction):

- For `stack: plain`: `${VAR:-default}` is resolved at generation time using root `.env`, then the inline default.
- For `stack: compose`: `${VAR:-default}` is passed through verbatim to `docker-compose.yml`; Docker Compose resolves it at container start using `.devcontainer/.env`.
- `{{cs.KEY}}` is ALWAYS resolved at generation time for both stacks.

---

### Page contract — `doctor` output

#### Exact `CheckResult` field values for new checks

Implementation MUST use these exact values so finding names are stable across runs and can be referenced in docs and `--fix` routing.

**Check 2a — Sensitive parameter hardcoded in `superposition.yml` `parameters:`**

```typescript
{
  name: 'Sensitive parameters in project file',
  findingId: 'sensitive-params-project-file',
  status: 'warn',
  message: `Sensitive parameter(s) hardcoded in plain text in superposition.yml parameters: ${keys.join(', ')}`,
  details: [
    'Declared sensitive by overlay: <overlay-id>',   // one line per param, naming the overlay
    'Use ${VAR} or ${VAR:-default} to reference a value from root .env instead.',
    'Add the real value to root .env (which should be gitignored).',
  ],
  fixEligibility: 'manual-only',
  fixable: false,
}
```

**Check 2b — Sensitive parameter as plain text in `.devcontainer/.env`**

```typescript
{
  name: 'Sensitive parameters in .devcontainer/.env',
  findingId: 'sensitive-params-devcontainer-env',
  status: 'warn',
  message: `Sensitive parameter(s) written as plain text to .devcontainer/.env: ${keys.join(', ')}`,
  details: [
    'If .devcontainer/ is committed to source control, this exposes the secret.',
    'In superposition.yml parameters:, set ${VAR} instead of a literal value.',
    'Store the real value in root .env (gitignored).',
  ],
  fixEligibility: 'manual-only',
  fixable: false,
}
```

**Check 3a — `customizations.devcontainerPatch.remoteEnv` promotion (also covers 3b)**

```typescript
{
  name: 'Prefer top-level env: over customizations',
  findingId: 'customizations-env-promote',
  status: 'warn',   // see note below — 'info' not a valid status; use 'warn'
  message: 'customizations.devcontainerPatch.remoteEnv is set but top-level env: is absent.',
  details: [
    'Move these variables to the top-level env: field.',
    'env: routes automatically for plain and compose stacks and supports {{cs.KEY}} tokens.',
    'See docs/superposition-yml.md#env for migration guidance.',
  ],
  fixEligibility: 'manual-only',
  fixable: false,
}
```

**Check 3c — `customizations.devcontainerPatch.mounts` promotion**

```typescript
{
  name: 'Prefer top-level mounts: over customizations',
  findingId: 'customizations-mounts-promote',
  status: 'warn',
  message: 'customizations.devcontainerPatch.mounts is set but top-level mounts: is absent.',
  details: [
    'Move mounts to the top-level mounts: field (spec 019).',
    'mounts: provides structured validation and routing for plain and compose stacks.',
  ],
  fixEligibility: 'manual-only',
  fixable: false,
}
```

**Check 3d — `customizations.dockerComposePatch` ports promotion**

```typescript
{
  name: 'Prefer top-level ports: over customizations',
  findingId: 'customizations-ports-promote',
  status: 'warn',
  message: 'customizations.dockerComposePatch contains port bindings but top-level ports: is absent.',
  details: [
    'Move port bindings to the top-level ports: field.',
    'ports: supports validation, auto-forward, and port-offset. See spec 024.',
  ],
  fixEligibility: 'manual-only',
  fixable: false,
}
```

#### Note on `info` status

The spec originally proposed `info` status for promotion suggestions. `DiagnosticFinding.status` and the internal `CheckResult.status` are typed as `'pass' | 'warn' | 'fail'` only (`tool/schema/types.ts` line 542, `tool/commands/doctor.ts` line 81). **Architect must choose one of:**

- (A) Add `'info'` to both type unions, update the doctor output renderer to display it distinctly (e.g. `ℹ` prefix, no count toward warning total), and use `status: 'info'` for all promotion checks.
- (B) Use `status: 'warn'` with a consistent `name:` prefix (`'Prefer top-level …'`) so promotion suggestions are visually distinguished by name rather than status.

This spec's `CheckResult` examples above use option B as a safe default. If the architect chooses option A, replace `status: 'warn'` with `status: 'info'` in checks 3a–3d and update the renderer. The `findingId` values remain unchanged.

---

### State behavior — suppression rules (precision)

**Check 2a suppression**: Suppress per-key when the supplied value in `superposition.yml` `parameters:` is an exact string match to the overlay `parameters[KEY].default` value. Comparison is case-sensitive, exact. Empty string values are NOT suppressed (an explicit empty string is a deliberate override and may warrant a warning). If `default` is absent or `null` in the overlay declaration, no suppression applies.

**Check 2b suppression**: Suppress per-key when the plain-text value in `.devcontainer/.env` equals the overlay default by the same rule.

**Check 2b skip condition**: If `.devcontainer/.env` does not exist (project not yet generated, or `stack: plain`), skip the check silently without emitting a finding. Do not warn about a missing file — that is covered by the reproducibility check.

**Check 3a–3d suppression**: Check 3a/3b suppress when `env:` is non-empty (has at least one key). Check 3c suppresses when `mounts:` is non-empty. Check 3d suppresses when `ports:` is non-empty. "Non-empty" means the array/map has at least one entry after parsing; `null` and `[]`/`{}` are treated as absent.

---

### State behavior — error message for unknown token in `env:` value

Acceptance criterion 3 requires the error message to reference `env.FOO`. The existing unresolved-token scan runs on generated OUTPUT files and reports `devcontainer.json: {{cs.NONEXISTENT}}` — it does not know the origin field.

**Required approach**: Add a validation step in the substitution function (Feature 1 implementation) that runs BEFORE writing to any output file. After applying `{{cs.KEY}}` substitution to each `projectEnv` entry, call `findUnresolvedTokens(entry.value)`. If any token remains, throw immediately with:

```
Error: Unresolved {{cs.*}} token in env.DATABASE_URL value: {{cs.NONEXISTENT}}
Declared parameters for selected overlays: POSTGRES_USER, POSTGRES_PASSWORD, ...
Add the missing parameter to superposition.yml parameters: or select an overlay that declares it.
```

This makes the error actionable without requiring the user to cross-reference the generated output.

The existing output-file scan (step 18) remains in place as a safety net. It does NOT duplicate this error — the in-memory check should throw before any files are written.

---

### Canonical terminology

Use these exact terms consistently across docs, error messages, and code comments:

| Concept                                        | Canonical term                                      | Do NOT use                              |
| ---------------------------------------------- | --------------------------------------------------- | --------------------------------------- |
| `{{cs.KEY}}` substitution                      | "parameter token" or "generation-time token"        | "variable", "interpolation", "template" |
| `${VAR}` in `env:` values                      | "runtime expression" or "Docker Compose expression" | "parameter token", "interpolation"      |
| Tool-owned substitution syntax                 | `{{cs.KEY}}` (always with backticks)                | `{{cs.key}}`, `{{KEY}}`, `cs.KEY`       |
| The `parameters:` map in `superposition.yml`   | "project parameters"                                | "overrides", "settings"                 |
| The `parameters[KEY].default` in `overlay.yml` | "overlay default"                                   | "default value", "preset"               |
| `.devcontainer/.env`                           | "compose env file"                                  | `.env.devcontainer`, "devcontainer env" |
| Promoting `customizations` to first-class      | "migrate to first-class field"                      | "upgrade", "refactor"                   |

---

### Pass-through guarantee table (required in docs)

The following MUST appear in the `docs/superposition-yml.md` "Parameter tokens" section:

| Expression                | Touched by `{{cs.KEY}}` substitution? | Resolved by                         |
| ------------------------- | ------------------------------------- | ----------------------------------- |
| `{{cs.KEY}}`              | ✅ Yes                                | Tool at generation time             |
| `${VAR}`                  | No                                    | Docker Compose / shell at runtime   |
| `${VAR:-default}`         | No                                    | Docker Compose / shell at runtime   |
| `${containerEnv:KEY}`     | No                                    | VS Code devcontainer at attach time |
| `${localWorkspaceFolder}` | No                                    | VS Code devcontainer at attach time |
| `${{ }}` (GitHub Actions) | No                                    | GitHub Actions runner               |
| `$FOO` (bare shell)       | No                                    | Shell at runtime                    |

---

### Worked examples

#### Example 1 — DATABASE_URL with parameter tokens

User types in `superposition.yml`:

```yaml
parameters:
    POSTGRES_DB: au2complt
    POSTGRES_USER: au2complt
    POSTGRES_PASSWORD: au2complt # ⚠ doctor check 2a fires (sensitive, literal value)
    POSTGRES_PORT: 5432

env:
    DATABASE_URL: 'postgresql://{{cs.POSTGRES_USER}}:{{cs.POSTGRES_PASSWORD}}@postgres:{{cs.POSTGRES_PORT}}/{{cs.POSTGRES_DB}}'
```

After `regen` (in-memory substitution, nothing written back to `superposition.yml`):

- `DATABASE_URL` value in memory = `"postgresql://au2complt:au2complt@postgres:5432/au2complt"`
- `stack: plain` → `devcontainer.json remoteEnv.DATABASE_URL = "postgresql://au2complt:au2complt@postgres:5432/au2complt"`
- `stack: compose` → `docker-compose.yml services.devcontainer.environment.DATABASE_URL = "${DATABASE_URL}"` + `.devcontainer/.env: DATABASE_URL=postgresql://au2complt:au2complt@postgres:5432/au2complt`

Dr output (because `POSTGRES_PASSWORD` is sensitive and literal):

```
⚠ Sensitive parameters in project file
  POSTGRES_PASSWORD — declared sensitive by overlay 'postgres'
  Use ${VAR} or ${VAR:-default} to reference a value from root .env instead.
```

#### Example 2 — Recommended pattern with runtime secret

User types in `superposition.yml`:

```yaml
parameters:
    POSTGRES_DB: au2complt
    POSTGRES_USER: au2complt
    POSTGRES_PASSWORD: '${POSTGRES_PASSWORD:-changeme}' # runtime expression → no doctor warning
    POSTGRES_PORT: 5432

env:
    DATABASE_URL: 'postgresql://{{cs.POSTGRES_USER}}:${POSTGRES_PASSWORD:-changeme}@postgres:{{cs.POSTGRES_PORT}}/{{cs.POSTGRES_DB}}'
```

Note: `{{cs.POSTGRES_PASSWORD}}` is NOT used here — because the password value is `${VAR}` (a runtime expression), baking it in via `{{cs.KEY}}` would write the literal `${POSTGRES_PASSWORD:-changeme}` string, which is correct for compose but confusing as intent. Users should reference secrets directly as `${VAR}` in `env:` values, bypassing the parameter token.

This pattern must appear in docs as the "secure DATABASE_URL" example alongside Example 1.

#### Example 3 — Unknown token hard error

`superposition.yml`:

```yaml
overlays: [nodejs]
env:
    FOO: '{{cs.NONEXISTENT}}'
```

Terminal output:

```
Error: Unresolved parameter token in env.FOO value: {{cs.NONEXISTENT}}
Declared parameters for selected overlays: NODE_VERSION
Add the missing parameter to superposition.yml parameters: or select an overlay that declares it.
```

Command exits non-zero. No generated files written.

---

### QA scenario scripts

**QA-1: Token substitution — simple string form**

1. `superposition.yml`: `overlays: [postgres]`, `parameters: {POSTGRES_USER: testuser, POSTGRES_PORT: 5433}`, `env: {DB: "{{cs.POSTGRES_USER}}:{{cs.POSTGRES_PORT}}"}`, `stack: plain`
2. Run `cs regen`
3. Assert `devcontainer.json remoteEnv.DB == "testuser:5433"`
4. Assert no `{{cs.*}}` tokens in any generated file

**QA-2: Token substitution — long form (value + target)**

1. `superposition.yml`: same params, `env: {DB: {value: "{{cs.POSTGRES_USER}}:{{cs.POSTGRES_PORT}}", target: remoteEnv}}`, `stack: plain`
2. Run `cs regen`
3. Assert `devcontainer.json remoteEnv.DB == "testuser:5433"`

**QA-3: Runtime expression pass-through (compose)**

1. `superposition.yml`: `stack: compose`, `env: {PG_PASS: "${POSTGRES_PASSWORD:-secret}"}`
2. Run `cs regen`
3. Assert `.devcontainer/.env` contains `PG_PASS=${POSTGRES_PASSWORD:-secret}` verbatim
4. Assert `docker-compose.yml` environment entry is `PG_PASS: ${PG_PASS}` (or equivalent interpolation)

**QA-4: Unknown token → hard error before file write**

1. `superposition.yml`: `overlays: [nodejs]`, `env: {FOO: "{{cs.MISSING}}"}`
2. Run `cs regen`
3. Assert exit code non-zero
4. Assert stderr contains `env.FOO` and `{{cs.MISSING}}`
5. Assert no generated files modified (check mtime)

**QA-5: Doctor check 2a — sensitive param literal**

1. `superposition.yml`: `overlays: [postgres]`, `parameters: {POSTGRES_PASSWORD: mysecret}`
2. Run `cs doctor`
3. Assert `warn` finding with `findingId: 'sensitive-params-project-file'` naming `POSTGRES_PASSWORD`

**QA-6: Doctor check 2a suppression — overlay default**

1. `superposition.yml`: `overlays: [postgres]`, `parameters: {POSTGRES_PASSWORD: postgres}` (matches overlay default)
2. Run `cs doctor`
3. Assert NO finding with `findingId: 'sensitive-params-project-file'` for `POSTGRES_PASSWORD`

**QA-7: Doctor check 2b — sensitive param in `.devcontainer/.env`**

1. `superposition.yml`: `stack: compose`, `overlays: [postgres]`, `parameters: {POSTGRES_PASSWORD: mysecret}`
2. Run `cs regen` then `cs doctor`
3. Assert `warn` finding with `findingId: 'sensitive-params-devcontainer-env'` naming `POSTGRES_PASSWORD`

**QA-8: Doctor check 2b skip when `.devcontainer/.env` absent**

1. `superposition.yml`: `stack: plain`, `overlays: [postgres]`, `parameters: {POSTGRES_PASSWORD: mysecret}`
2. Run `cs doctor` (no `.devcontainer/.env` on plain stack)
3. Assert NO finding with `findingId: 'sensitive-params-devcontainer-env'`

**QA-9: Doctor check 3a — remoteEnv promotion**

1. `superposition.yml`: `customizations: {devcontainerPatch: {remoteEnv: {MY_VAR: foo}}}`, no top-level `env:`
2. Run `cs doctor`
3. Assert `warn` finding with `findingId: 'customizations-env-promote'`

**QA-10: Doctor check 3a suppressed when env: already populated**

1. `superposition.yml`: `env: {MY_VAR: foo}`, `customizations: {devcontainerPatch: {remoteEnv: {OTHER: bar}}}`
2. Run `cs doctor`
3. Assert NO finding with `findingId: 'customizations-env-promote'`

**QA-11: No duplicate finding with existing check 2**

1. Set up project that triggers both existing check 2 (remoteEnv in devcontainer.json) and new check 2a
2. Assert each `findingId` appears at most once in doctor output

---

## Risks

| Risk                                                                                                | Likelihood     | Impact | Mitigation                                                                                                            |
| --------------------------------------------------------------------------------------------------- | -------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| `{{cs.KEY}}` in `env:` value with unknown key passes schema validation but fails generation         | Medium         | High   | Existing unresolved-token validation (step 18) catches this with hard error; update error message to note env: origin |
| Sensitive value substituted into `.devcontainer/.env` leaks to source control                       | Medium         | High   | Doctor check 2b; docs guidance to gitignore `.devcontainer/`                                                          |
| `env:` value substituted in-memory changes expected `${containerEnv:KEY}` behavior in compose stack | Low            | Medium | Pass-through guarantee unchanged; only `{{cs.*}}` tokens are touched                                                  |
| Circular env-to-parameter references                                                                | Not applicable | —      | Env-to-env interpolation is out of scope; only `{{cs.KEY}}` (parameters) can appear in `env:` values                  |
| Schema annotation for `{{cs.KEY}}` in `env:` confuses users who use Docker Compose `${VAR}`         | Low            | Low    | Docs clearly distinguish generation-time tokens from runtime expressions                                              |

---

## Out of Scope

- Env-to-env interpolation (`env.A` referencing `env.B`)
- Resolving process environment variables at generation time
- Doctor `--fix` automation for sensitive-value or first-class promotion findings
- Changing how `.env.example` / `customizations.envTemplate` interacts with parameters (no change)
- New interactive questionnaire prompts for `env:` parameter tokens

---

## Acceptance Criteria

1. **Parameter token in `env:` value resolves** — Given `superposition.yml` with `parameters: {POSTGRES_USER: myuser, POSTGRES_PORT: 5432}` and `env: {DATABASE_URL: "postgresql://{{cs.POSTGRES_USER}}@postgres:{{cs.POSTGRES_PORT}}/mydb"}`, when `regen` runs, then generated `devcontainer.json remoteEnv.DATABASE_URL` equals `"postgresql://myuser@postgres:5432/mydb"`. No `{{cs.*}}` tokens remain in any generated file. Verify with integration test.

2. **Parameter token in local `env:` value resolves** — Given same `parameters:` in shared config and `superposition.local.yml` with `env: {EXTRA_URL: "{{cs.POSTGRES_USER}}:{{cs.POSTGRES_PORT}}"}`, when `regen` runs, then generated output includes `EXTRA_URL=myuser:5432`. Verify with integration test.

3. **Unknown token in `env:` value causes hard error** — Given `env: {FOO: "{{cs.NONEXISTENT}}"}` and no overlay declaring `NONEXISTENT`, when generation runs, then command exits non-zero with error message referencing the unresolved token and the `env.FOO` field. Verify no generated files written.

4. **Pass-through preserved** — Given `env: {COMPOSE_VAR: "${MY_VAR:-fallback}"}`, when generation runs, then generated output contains `${MY_VAR:-fallback}` verbatim. No `{{cs.*}}` token in this value, nothing is substituted. Verify with unit test.

5. **Doctor warns sensitive param hardcoded in `parameters:`** — Given `superposition.yml` with overlay `postgres` (POSTGRES_PASSWORD declared sensitive) and `parameters: {POSTGRES_PASSWORD: mysecret}`, when `doctor` runs, then output includes a `warn` finding for "Sensitive parameters in project file" naming `POSTGRES_PASSWORD`. Verify with unit test on `checkParameters`.

6. **Sensitive param default value not flagged** — Given `parameters: {POSTGRES_PASSWORD: postgres}` where `postgres` equals the overlay default, when `doctor` runs, then no sensitive-value warning is emitted for `POSTGRES_PASSWORD`. Verify suppression rule with unit test.

7. **Doctor warns sensitive param in `.devcontainer/.env`** — Given `stack: compose`, sensitive `POSTGRES_PASSWORD` in `parameters:`, and a generated `.devcontainer/.env` containing `POSTGRES_PASSWORD=mysecret` (plain text), when `doctor` runs, then output includes a `warn` finding for "Sensitive parameter in .devcontainer/.env". Verify with unit test.

8. **Doctor suggests `env:` promotion when `customizations.devcontainerPatch.remoteEnv` used** — Given `customizations.devcontainerPatch.remoteEnv: {API_KEY: secret}` and no top-level `env:`, when `doctor` runs, then output includes an `info` finding suggesting migration to `env:`. Verify with unit test on new doctor check.

9. **Doctor suggests `mounts:` promotion when `customizations.devcontainerPatch.mounts` used** — Given `customizations.devcontainerPatch.mounts: ["source=...,target=..."]` and no top-level `mounts:`, when `doctor` runs, then output includes an `info` finding suggesting migration to `mounts:`. Verify with unit test.

10. **No promotion suggestion when first-class field already used** — Given `env:` is already populated and `customizations.devcontainerPatch.remoteEnv` also exists, when `doctor` runs, then no `env:` promotion suggestion is emitted (user has consciously mixed approaches). Verify with unit test.

11. **Schema annotates `env:` value as supporting `{{cs.KEY}}`** — Given `npm run schema:generate`, then `tool/schema/superposition.schema.json` has a description or pattern on the `env` value type that mentions `{{cs.KEY}}` tokens. Verify schema file content.

12. **Docs include precedence table** — Given `docs/superposition-yml.md` (or equivalent), then it contains the full precedence table from this spec and a `DATABASE_URL` example. Verify doc file content.

13. **`{{cs.KEY}}` docs section exists** — Given user-facing parameter docs, then a section titled "Parameter tokens" documents supported fields, pass-through guarantee, and key format. Verify doc file content.

14. **CHANGELOG updated** — Given `CHANGELOG.md`, then `Unreleased` section mentions parameter interpolation in `env:` values, new doctor checks, and first-class promotion suggestions. Verify file content.

15. **Existing tests unchanged** — Given `npm test` after implementation, then all pre-existing overlay-parameters and project-env tests still pass. Verify with test run.

---

## Implementation Slices

1. **Core substitution slice** — Apply `{{cs.KEY}}` substitution to `projectEnv` values in `composer.ts` after parameter resolution and before downstream `applyProjectEnvToDevcontainer()`. Unit tests for substitution, pass-through, and unknown-token hard error.
2. **Schema/docs slice** — Annotate `env:` value in JSON Schema; add precedence table and `{{cs.KEY}}` docs section; update `CHANGELOG.md`; run `npm run schema:generate`.
3. **Doctor sensitive-value slice** — Add check 2a (project file) and check 2b (`.devcontainer/.env`); unit tests for both, suppression of default values, and no-duplicate-with-check-2 regression.
4. **Doctor promotion-suggestion slice** — Add checks 3a–3d; unit tests for each pattern; confirm `info` status and no `--fix` eligibility.
5. **Regression slice** — Run `npm run lint:fix`, `npm run lint`, `npm test`, `npm run init -- regen`, `npm run init -- doctor`. No new reproducibility errors.

---

## Architecture Constraints

- **In-memory only**: `{{cs.KEY}}` substitution on `env:` values must NOT modify `superposition.yml`, `superposition.local.yml`, or `superposition.json` on disk.
- **After parameter resolution**: substitution must use the fully resolved parameter map (CLI > project `parameters:` > overlay defaults). The composer must not resolve parameters a second time.
- **Before downstream env consumers**: substituted `projectEnv` must be available to all functions that read `projectEnv` (env application, compose materialization, port expansion). If `projectEnv` is passed by reference, create a substituted copy; do not mutate the original parsed selection.
- **Unresolved-token validation scope**: existing `findUnresolvedTokens` validation on generated file content already catches tokens that survive to output. It must also catch tokens that survive substitution in `env:` values when they appear in generated files — no separate validation pass needed, the existing scan suffices.
- **Doctor scope**: checks 2a/2b/3a–3d are new findings appended to `checkParameters()` or a new `checkCustomizations()` function. They must not modify any file and must gracefully skip when project config is absent.
- **No ADR required** for this spec. All changes are additive refinements to existing subsystems. If architect identifies a case where env-to-env interpolation is also needed, that requires a new spec and potentially an ADR for syntax choice.

---

## Dependencies

- **Spec 011** (Overlay Parameters with Safe Substitution) — provides `{{cs.KEY}}` engine; this spec extends its scope to `env:` values.
- **Spec 009** (Project-Level Environment Variables) — `env:` field definition; this spec adds interpolation.
- **Spec 010** (Compose Env Materialization) — `.devcontainer/.env` materialization; doctor check 2b scans this output.
- **Spec 022** (Local Superposition Config) — local `env:` is merged before substitution; both must be substituted.

---

## Workflow Review Notes

- `docs/foundation.md` is absent from this repository. Review used `AGENTS.md`, existing spec 011/009/010/022, and `tool/utils/parameters.ts` / `tool/questionnaire/composer.ts` as architectural ground truth.
- No conflict found with available architecture guidance.
- Feature 1 is additive and does not change how overlay file substitution works.
- Features 2/3 are additive doctor checks only; no generation behavior changes.
- Feature 4 is documentation/assessment work with no code change to the `{{cs.KEY}}` engine itself.

---

## Technical Design

### Architecture Ownership

| Layer                                                      | Owns                                                                                                                                              | Must NOT own                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `tool/utils/parameters.ts`                                 | `substituteProjectEnvTokens()` helper + `findUnresolvedEnvTokens()` pre-write validator                                                           | Disk I/O, composer orchestration        |
| `tool/questionnaire/composer.ts` — `composeDevContainer()` | Substitution invocation, in-memory copy creation, pre-write error throw                                                                           | Knowing what parameters are sensitive   |
| `tool/commands/doctor.ts` — `checkParameters()`            | Checks 2a, 2b (sensitive param exposure) and 3a–3d (promotion suggestions) via a new `checkCustomizations()` helper called from the same function | Modifying any file, regenerating output |
| `tool/schema/types.ts`                                     | `CheckResult.findingId` field addition (see §CheckResult gap)                                                                                     | —                                       |
| `docs/superposition-yml.md`                                | Corrected `${VAR}` wording, two-tier table, parameter token section                                                                               | —                                       |

### System Boundaries

- **No new public API.** All changes are internal to `composeDevContainer()` and `checkParameters()`.
- **No change to `superposition.yml` on-disk format.** `parameters:` and `env:` fields are already valid YAML; new tokens are just interpreted during generation.
- **No change to generated file formats.** `devcontainer.json`, `docker-compose.yml`, `.devcontainer/.env`, `.env.example` output is unchanged in structure — only string values that previously contained unresolved `{{cs.*}}` tokens will now be resolved.

### Canonical Data Flow — Feature 1 (env: token substitution)

```
composeDevContainer(answers)
  │
  ├─ 5b. collectOverlayParameters() → declaredParams
  ├─ 5b. resolveParameters(declaredParams, answers.overlayParameters) → resolvedParams
  │
  ├─ NEW: substituteProjectEnvTokens(answers.projectEnv, resolvedParams)
  │         → substitutedProjectEnv (in-memory copy; disk unchanged)
  ├─ NEW: validateEnvTokensResolved(substitutedProjectEnv, resolvedParams)
  │         → throws Error with "env.KEY" field name if any {{cs.*}} remain
  │
  ├─ extractSuperpositionEnvStrings(substitutedProjectEnv)   ← was: answers.projectEnv
  ├─ prepareProjectPorts(..., superpositionEnv, ...)
  ├─ applyProjectEnvToDevcontainer(config, substitutedProjectEnv, ...)  ← was: answers.projectEnv
  └─ materializeComposeProjectEnvFile(outputPath, substitutedProjectEnv, ...)  ← was: answers.projectEnv
```

`answers.projectEnv` is **never mutated**. `substitutedProjectEnv` is a new `Record<string, ProjectEnvVar>` with `.value` strings substituted.

### Canonical Data Flow — Feature 2/3 (doctor checks)

```
checkParameters(overlaysConfig, outputPath, workingDir)
  │
  ├─ [existing] Check 1: unresolved tokens in generated files
  ├─ [existing] Check 2: sensitive params in devcontainer.json remoteEnv
  ├─ [existing] Check 3: missing .env.example
  ├─ [existing] Check 4: unknown params in project file
  ├─ [existing] Check 5: missing required params
  │
  ├─ NEW Check 2a: sensitiveParamsInProjectFile(suppliedParams, declared)
  ├─ NEW Check 2b: sensitiveParamsInComposeEnvFile(outputPath, declared)  ← skips if no .env
  └─ NEW checkCustomizations(projectConfig.selection)
           ├─ Check 3a: remoteEnv in devcontainerPatch + env: absent/empty
           ├─ Check 3b: environment in dockerComposePatch + env: absent/empty
           ├─ Check 3c: mounts in devcontainerPatch + mounts: absent/empty
           └─ Check 3d: ports in dockerComposePatch + ports: absent/empty
```

All new checks are appended to the `parameters: CheckResult[]` return value of `checkParameters()`. **No new `DoctorReport` field is added** — routing into `parameters` minimises structural change.

### Implementation Slices (concrete tasks)

#### Slice 1 — Core substitution (`tool/utils/parameters.ts` + `tool/questionnaire/composer.ts`)

**Task 1.1** — Add to `tool/utils/parameters.ts`:

```typescript
/**
 * Apply {{cs.KEY}} substitution to every ProjectEnvVar.value in the env map.
 * Returns a new map; does not mutate the input.
 * Only {{cs.*}} tokens are replaced — ${VAR} / ${containerEnv:KEY} etc. are unchanged.
 */
export function substituteProjectEnvTokens(
    projectEnv: Record<string, ProjectEnvVar> | undefined,
    resolved: Record<string, string>
): Record<string, ProjectEnvVar> {
    if (!projectEnv) return {};
    const result: Record<string, ProjectEnvVar> = {};
    for (const [key, entry] of Object.entries(projectEnv)) {
        result[key] = { ...entry, value: substituteParameters(entry.value, resolved) };
    }
    return result;
}
```

**Task 1.2** — Add pre-write validator (same file):

```typescript
/**
 * After substituteProjectEnvTokens(), throw if any {{cs.*}} tokens remain.
 * Reports the env key and token so the user can fix the source.
 */
export function validateEnvTokensResolved(
    substitutedEnv: Record<string, ProjectEnvVar>,
    resolvedParams: Record<string, string>
): void {
    const declaredKeys = Object.keys(resolvedParams).join(', ') || '(none)';
    for (const [envKey, entry] of Object.entries(substitutedEnv)) {
        const unresolved = findUnresolvedTokens(entry.value);
        if (unresolved.length > 0) {
            throw new Error(
                `Unresolved parameter token in env.${envKey} value: ${unresolved[0]}\n` +
                    `Declared parameters for selected overlays: ${declaredKeys}\n` +
                    `Add the missing parameter to superposition.yml parameters: or select an overlay that declares it.`
            );
        }
    }
}
```

**Task 1.3** — In `composeDevContainer()` (`tool/questionnaire/composer.ts`), immediately after `resolveParameters()` call (currently around line 2751) and before `extractSuperpositionEnvStrings()` (line 2783):

```typescript
// NEW: apply {{cs.KEY}} substitution to project env values (in-memory; no file written)
const substitutedProjectEnv = substituteProjectEnvTokens(answers.projectEnv, resolvedParams);
validateEnvTokensResolved(substitutedProjectEnv, resolvedParams);
```

Then update three downstream call sites to use `substitutedProjectEnv`:

1. `extractSuperpositionEnvStrings(substitutedProjectEnv)` (was `answers.projectEnv`)
2. `applyProjectEnvToDevcontainer(config, substitutedProjectEnv, ...)` (was `answers.projectEnv`)
3. `materializeComposeProjectEnvFile(outputPath, substitutedProjectEnv, ...)` (was `answers.projectEnv`)

**Import addition** in `composer.ts`:

```typescript
import {
    // existing...
    substituteProjectEnvTokens,
    validateEnvTokensResolved,
} from '../utils/parameters.js';
```

#### Slice 2 — Schema/docs

**Task 2.1** — `docs/superposition-yml.md` § `env` / `${VAR}` references section: replace the misleading sentence (lines 190–192) with stack-specific wording as specified in the UX contract. Add two-tier substitution table and pass-through guarantee table.

**Task 2.2** — `docs/superposition-yml.md`: add `### Parameter tokens ({{cs.KEY}})` section covering syntax, supported fields, inapplicable positions, pass-through guarantee table (verbatim from UX contract), and the DATABASE_URL worked example.

**Task 2.3** — `tool/schema/superposition.schema.json`: After `npm run schema:generate`, verify the `env` value type description includes `{{cs.KEY}}` mention. If schema codegen doesn't pick it up automatically from types, add a `description` annotation to `ProjectEnvVar.value` in `tool/schema/types.ts` and re-run.

**Task 2.4** — `CHANGELOG.md`: add entries under `Unreleased` for parameter interpolation in `env:`, new doctor checks, and promotion suggestions.

#### Slice 3 — Doctor sensitive-value checks

**Task 3.1** — `tool/schema/types.ts`: Add `findingId?: string` to `CheckResult` interface:

```typescript
interface CheckResult {
    name: string;
    findingId?: string; // NEW: stable ID for --fix routing and test assertions
    status: 'pass' | 'warn' | 'fail';
    // ...
}
```

Update `checksToFindings()` to use `c.findingId` as `DiagnosticFinding.id` when present:

```typescript
const id =
    c.findingId ??
    c.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
```

**Task 3.2** — Append to `checkParameters()` in `tool/commands/doctor.ts`:

```typescript
// ── Check 2a: Sensitive params hardcoded in superposition.yml parameters: ─
const sensitiveHardcoded: string[] = [];
for (const [key, value] of Object.entries(suppliedParams)) {
    if (!declared[key]?.sensitive) continue;
    if (value.startsWith('${')) continue; // runtime expression — skip
    if (value === (declared[key].default ?? '\x00')) continue; // equals overlay default — suppress
    sensitiveHardcoded.push(key);
}
if (sensitiveHardcoded.length > 0) {
    const detailLines: string[] = sensitiveHardcoded.map(
        (k) => `${k} — declared sensitive by overlay '${declared[k].overlayId}'`
    );
    detailLines.push('Use ${VAR} or ${VAR:-default} to reference a value from root .env instead.');
    detailLines.push('Add the real value to root .env (which should be gitignored).');
    results.push({
        name: 'Sensitive parameters in project file',
        findingId: 'sensitive-params-project-file',
        status: 'warn',
        message: `Sensitive parameter(s) hardcoded in plain text in superposition.yml parameters: ${sensitiveHardcoded.join(', ')}`,
        details: detailLines,
        fixEligibility: 'manual-only',
        fixable: false,
    });
}

// ── Check 2b: Sensitive params as plain text in .devcontainer/.env ────────
const devcontainerEnvPath = path.join(outputPath, '.env'); // composed to outputPath/.env
if (fs.existsSync(devcontainerEnvPath)) {
    const composeEnvParsed = parseSimpleEnvFile(fs.readFileSync(devcontainerEnvPath, 'utf8'));
    const sensitiveInComposeEnv: string[] = [];
    for (const [key, value] of Object.entries(composeEnvParsed)) {
        if (!declared[key]?.sensitive) continue;
        if (value.startsWith('${')) continue;
        if (value === (declared[key].default ?? '\x00')) continue;
        sensitiveInComposeEnv.push(key);
    }
    if (sensitiveInComposeEnv.length > 0) {
        results.push({
            name: 'Sensitive parameters in .devcontainer/.env',
            findingId: 'sensitive-params-devcontainer-env',
            status: 'warn',
            message: `Sensitive parameter(s) written as plain text to .devcontainer/.env: ${sensitiveInComposeEnv.join(', ')}`,
            details: [
                'If .devcontainer/ is committed to source control, this exposes the secret.',
                'In superposition.yml parameters:, set ${VAR} instead of a literal value.',
                'Store the real value in root .env (gitignored).',
            ],
            fixEligibility: 'manual-only',
            fixable: false,
        });
    }
}
```

Note: `parseSimpleEnvFile` is already defined in `doctor.ts` as a module-level function (it's declared in `composer.ts` but doctor has its own inline version for the reproducibility check). **Verify**: doctor.ts has its own env file parser OR extract shared helper to `tool/utils/` (preferred). See Risk Note R3.

#### Slice 4 — Doctor promotion-suggestion checks

**Task 4.1** — Add `checkCustomizations()` helper function in `tool/commands/doctor.ts`:

```typescript
function checkCustomizations(selection: ProjectConfigSelection): CheckResult[] {
    const results: CheckResult[] = [];
    const cust = selection.customizations;
    if (!cust) return results;

    const hasEnv = Object.keys(selection.env ?? {}).length > 0;
    const hasMounts = (selection.mounts ?? []).length > 0;
    const hasPorts = (selection.ports ?? []).length > 0;

    // 3a: remoteEnv in devcontainerPatch → suggest env:
    const patchRemoteEnv = cust.devcontainerPatch?.remoteEnv;
    // 3b: environment in dockerComposePatch → also suggest env:
    const composeEnvKeys =
        Object.keys((cust.dockerComposePatch as any)?.services?.devcontainer?.environment ?? {})
            .length > 0;
    if ((patchRemoteEnv && Object.keys(patchRemoteEnv).length > 0) || composeEnvKeys) {
        if (!hasEnv) {
            results.push({
                name: 'Prefer top-level env: over customizations',
                findingId: 'customizations-env-promote',
                status: 'warn',
                message:
                    'customizations.devcontainerPatch.remoteEnv is set but top-level env: is absent.',
                details: [
                    'Move these variables to the top-level env: field.',
                    'env: routes automatically for plain and compose stacks and supports {{cs.KEY}} tokens.',
                    'See docs/superposition-yml.md#env for migration guidance.',
                ],
                fixEligibility: 'manual-only',
                fixable: false,
            });
        }
    }

    // 3c: mounts in devcontainerPatch → suggest mounts:
    const patchMounts = cust.devcontainerPatch?.mounts;
    if (Array.isArray(patchMounts) && patchMounts.length > 0 && !hasMounts) {
        results.push({
            name: 'Prefer top-level mounts: over customizations',
            findingId: 'customizations-mounts-promote',
            status: 'warn',
            message:
                'customizations.devcontainerPatch.mounts is set but top-level mounts: is absent.',
            details: [
                'Move mounts to the top-level mounts: field (spec 019).',
                'mounts: provides structured validation and routing for plain and compose stacks.',
            ],
            fixEligibility: 'manual-only',
            fixable: false,
        });
    }

    // 3d: ports in dockerComposePatch → suggest ports:
    const composePorts = (cust.dockerComposePatch as any)?.services ?? {};
    const hasComposePorts = Object.values(composePorts).some(
        (svc: any) => Array.isArray(svc?.ports) && svc.ports.length > 0
    );
    if (hasComposePorts && !hasPorts) {
        results.push({
            name: 'Prefer top-level ports: over customizations',
            findingId: 'customizations-ports-promote',
            status: 'warn',
            message:
                'customizations.dockerComposePatch contains port bindings but top-level ports: is absent.',
            details: [
                'Move port bindings to the top-level ports: field.',
                'ports: supports validation, auto-forward, and port-offset. See spec 024.',
            ],
            fixEligibility: 'manual-only',
            fixable: false,
        });
    }

    return results;
}
```

**Task 4.2** — Call `checkCustomizations(projectConfig.selection)` at the end of `checkParameters()` and spread results into `results[]`.

#### Slice 5 — Regression

**Task 5.1** — `npm run lint:fix && npm run lint` — must pass.
**Task 5.2** — `npm test` — all existing tests pass; new tests added per Test Plan below.
**Task 5.3** — `npm run init -- regen` from repo root — no reproducibility errors.
**Task 5.4** — `npm run init -- doctor` — no new Reproducibility findings.
**Task 5.5** — `npm run schema:generate` — schema updated if `ProjectEnvVar.value` annotation changed.

---

### Risk Notes

**R1 — `extractSuperpositionEnvStrings` used before substitution point**
`superpositionEnv` is extracted at line ~2783 for port resolution in `prepareProjectPorts`. This call MUST use `substitutedProjectEnv`, not `answers.projectEnv`. If missed, a `{{cs.PORT_VAR}}` token in an `env:` value that drives a plain-stack port expression would not resolve and `prepareProjectPorts` would receive the raw token string — causing a port-number validation error rather than a clean substitution. **Mitigation**: checklist in Task 1.3 explicitly names all three call sites.

**R2 — `CheckResult.findingId` is a new field**
Existing `checksToFindings()` builds `DiagnosticFinding.id` by slugifying `name`. Adding `findingId?` and preferring it when present is backward-compatible: existing checks without `findingId` continue to work. Tests that assert on `DiagnosticFinding.id` for existing checks are unaffected. **Mitigation**: field is optional, override is conditional.

**R3 — `parseSimpleEnvFile` not available in `doctor.ts`**
This function is defined in `composer.ts` but NOT exported. `doctor.ts` has its own inline env-line parsing inside the reproducibility check (a local implementation). For Check 2b, doctor needs to parse `.devcontainer/.env`. Two options: (A) extract `parseSimpleEnvFile` to `tool/utils/` and export; (B) inline a minimal parser in `doctor.ts`. **Recommendation**: extract to `tool/utils/env-file.ts` as a shared utility — removes duplication in both `composer.ts` and `doctor.ts`. This is a small prerequisite refactor for Slice 3.

**R4 — Default value comparison for suppression rule**
The suppression condition is `value === declared[key].default`. If `declared[key].default` is `undefined` (no default in overlay), the condition `value === undefined` is false for any supplied string — correct, no suppression. If default is `null`, same logic. The placeholder `'\x00'` in the pseudocode above is just to make the ternary short-circuit; real code should check `declared[key].default !== undefined && value === declared[key].default`. **Mitigation**: unit test QA-6 covers this case.

**R5 — `checkCustomizations` type safety on `dockerComposePatch`**
`ProjectConfigCustomizationsInput.dockerComposePatch` is typed `Record<string, any>`. Accessing `services.devcontainer.environment` or `services.*.ports` requires runtime traversal with `?.` guards. Any malformed YAML that passes schema validation but has unexpected types would cause a runtime crash if not guarded. **Mitigation**: use `Object.values(services).some(svc => Array.isArray(svc?.ports) && ...)` pattern with defensive casting; add a try/catch around the customizations inspection block.

**R6 — Misleading doc sentence in `docs/superposition-yml.md`**
Line 190-192 currently says `${VAR}` expressions "are resolved at generation time and written into the appropriate output file" — false for `stack: compose` where they pass through verbatim. This is a docs-only fix, zero code change, but must be done in the same PR as slice 2 to avoid shipping the fix without corrected docs. **Mitigation**: Task 2.1 is the specific corrective edit.

---

### Test Plan

Tests added in **`tool/__tests__/overlay-parameters.test.ts`** and **`tool/__tests__/project-env.test.ts`** (co-locate with existing parallel tests).

#### T1 — `substituteProjectEnvTokens` unit tests (pure function)

```typescript
// in tool/__tests__/overlay-parameters.test.ts
describe('substituteProjectEnvTokens', () => {
    it('substitutes {{cs.KEY}} in string-shorthand value', () => {
        const result = substituteProjectEnvTokens(
            { DB: { value: '{{cs.PGUSER}}:{{cs.PGPORT}}' } },
            { PGUSER: 'admin', PGPORT: '5432' }
        );
        expect(result.DB.value).toBe('admin:5432');
    });

    it('substitutes {{cs.KEY}} in long-form value (with target)', () => {
        const result = substituteProjectEnvTokens(
            { DB: { value: '{{cs.PGUSER}}', target: 'composeEnv' } },
            { PGUSER: 'admin' }
        );
        expect(result.DB.value).toBe('admin');
        expect(result.DB.target).toBe('composeEnv'); // target preserved
    });

    it('does NOT touch ${VAR:-default} expressions', () => {
        const result = substituteProjectEnvTokens(
            { PW: { value: '${PW:-changeme}' } },
            { PW: 'ignored' } // not a cs. param
        );
        expect(result.PW.value).toBe('${PW:-changeme}'); // verbatim pass-through
    });

    it('returns empty object when projectEnv is undefined', () => {
        expect(substituteProjectEnvTokens(undefined, {})).toEqual({});
    });
});

describe('validateEnvTokensResolved', () => {
    it('throws with field name and token when token unresolved', () => {
        expect(() =>
            validateEnvTokensResolved({ FOO: { value: '{{cs.MISSING}}' } }, { KNOWN: 'val' })
        ).toThrow(/env\.FOO.*\{\{cs\.MISSING\}\}/);
    });

    it('does not throw when all tokens resolved', () => {
        expect(() => validateEnvTokensResolved({ FOO: { value: 'clean' } }, {})).not.toThrow();
    });
});
```

#### T2 — Integration: token resolved in generated output (QA-1, QA-2)

```typescript
// in tool/__tests__/project-env.test.ts  (append to existing describe)
it('resolves {{cs.KEY}} in env: value for plain stack (string shorthand)', async () => {
    const outputPath = path.join(repoDir, '.devcontainer');
    const answers: QuestionnaireAnswers = {
        stack: 'plain',
        baseImage: 'bookworm',
        language: ['nodejs'],
        needsDocker: false,
        database: [],
        playwright: false,
        cloudTools: [],
        devTools: [],
        observability: [],
        outputPath,
        overlayParameters: { NODE_VERSION: '20' }, // overlay declares this
        projectEnv: { DESC: { value: 'node-{{cs.NODE_VERSION}}' } },
    };
    await composeDevContainer(answers);
    const dc = JSON.parse(fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8'));
    expect(dc.remoteEnv.DESC).toBe('node-20');
    // No {{cs.*}} tokens survive to output
    expect(JSON.stringify(dc)).not.toMatch(/\{\{cs\./);
});

it('resolves {{cs.KEY}} in env: long form (value + target) for compose stack', async () => {
    const outputPath = path.join(repoDir, '.devcontainer');
    const answers: QuestionnaireAnswers = {
        stack: 'compose',
        baseImage: 'bookworm',
        language: ['nodejs'],
        needsDocker: false,
        database: [],
        playwright: false,
        cloudTools: [],
        devTools: [],
        observability: [],
        outputPath,
        overlayParameters: { NODE_VERSION: '20' },
        projectEnv: { DESC: { value: 'node-{{cs.NODE_VERSION}}', target: 'composeEnv' } },
    };
    await composeDevContainer(answers);
    const composeEnv = fs.readFileSync(path.join(outputPath, '.env'), 'utf8');
    expect(composeEnv).toContain('DESC=node-20');
});

it('throws before writing files when {{cs.KEY}} token unresolved in env: value', async () => {
    const outputPath = path.join(repoDir, '.devcontainer');
    const answers: QuestionnaireAnswers = {
        stack: 'plain',
        baseImage: 'bookworm',
        language: ['nodejs'],
        needsDocker: false,
        database: [],
        playwright: false,
        cloudTools: [],
        devTools: [],
        observability: [],
        outputPath,
        projectEnv: { FOO: { value: '{{cs.MISSING}}' } },
    };
    await expect(composeDevContainer(answers)).rejects.toThrow(/env\.FOO.*\{\{cs\.MISSING\}\}/);
    // No devcontainer.json written
    expect(fs.existsSync(path.join(outputPath, 'devcontainer.json'))).toBe(false);
});
```

#### T3 — Doctor check 2a unit tests (QA-5, QA-6)

Add to `tool/__tests__/overlay-parameters.test.ts` or a new `tool/__tests__/doctor-checks.test.ts`. Test `checkParameters()` directly by mocking project config with a postgres overlay that declares `POSTGRES_PASSWORD` sensitive:

```typescript
// checkParameters emits findingId 'sensitive-params-project-file' when sensitive param literal
it('check 2a: warns when sensitive param is literal', () => {
    // Write a superposition.yml with POSTGRES_PASSWORD = 'mysecret'
    // Call checkParameters() directly or via doctor run in temp dir
    // Assert warn finding with findingId 'sensitive-params-project-file'
});

it('check 2a: suppressed when value equals overlay default', () => {
    // POSTGRES_PASSWORD = 'postgres' (the overlay default)
    // Assert NO finding with findingId 'sensitive-params-project-file' for that key
});
```

#### T4 — Doctor check 2b unit tests (QA-7, QA-8)

```typescript
it('check 2b: warns when sensitive param in .devcontainer/.env', () => {
    // Compose stack, write .devcontainer/.env with POSTGRES_PASSWORD=mysecret
    // Assert warn finding with findingId 'sensitive-params-devcontainer-env'
});

it('check 2b: skips silently when .devcontainer/.env absent (plain stack)', () => {
    // Plain stack, no .devcontainer/.env exists
    // Assert NO finding with findingId 'sensitive-params-devcontainer-env'
});
```

#### T5 — Doctor check 3a–3d unit tests (QA-9, QA-10)

```typescript
it('check 3a: warns when customizations.devcontainerPatch.remoteEnv set and env: absent', () => {
    // Assert warn finding with findingId 'customizations-env-promote'
});

it('check 3a: suppressed when env: has at least one key', () => {
    // Assert NO finding with findingId 'customizations-env-promote'
});
```

#### T6 — No duplicate finding regression (QA-11)

```typescript
it('no duplicate finding IDs in doctor output when check 2 and check 2a both trigger', () => {
    // Set up project that triggers both old check 2 (remoteEnv in devcontainer.json)
    // and new check 2a (sensitive param in parameters:)
    // Assert each findingId appears at most once
});
```

---

### Architecture Decision Impact

No new ADR required. All changes are additive:

1. `tool/utils/parameters.ts` gains two pure helpers: `substituteProjectEnvTokens` and `validateEnvTokensResolved`.
2. `tool/questionnaire/composer.ts` gains an in-memory substitution step between parameter resolution and env application. No interface changes to `composeDevContainer()` signature.
3. `tool/commands/doctor.ts` gains new checks inside existing `checkParameters()`. The `CheckResult` interface gains optional `findingId?: string`.
4. `tool/schema/types.ts` requires only `findingId?: string` addition to the internal `CheckResult` interface — not `DiagnosticFinding` (public API) which already has `id`.
5. `docs/superposition-yml.md` corrected and extended; `CHANGELOG.md` updated.
6. Optional prerequisite refactor: extract `parseSimpleEnvFile` to `tool/utils/env-file.ts` (Risk R3).

All changes are aligned with current architecture. The `{{cs.KEY}}` engine in `parameters.ts` is unchanged.

---

## Implementation Notes

**Implemented**: 2026-06-03

### Slices completed

1. **Core substitution** — `substituteProjectEnvTokens()` and `validateEnvTokensResolved()` added to `tool/utils/parameters.ts`. `composeDevContainer()` in `tool/questionnaire/composer.ts` applies substitution after `resolveParameters()` and before all three downstream consumers (`extractSuperpositionEnvStrings`, `applyProjectEnvToDevcontainer`, `mergeDockerComposeFiles`, `materializeComposeProjectEnvFile`).

2. **Shared env-file util** — `parseSimpleEnvFile` extracted to `tool/utils/env-file.ts`. `composer.ts` delegates to it; `doctor.ts` imports it directly for check 2b.

3. **Doctor checks** — `CheckResult.findingId?: string` added; `checksToFindings()` uses it when present. Checks 2a (`sensitive-params-project-file`), 2b (`sensitive-params-devcontainer-env`) appended to `checkParameters()`. New `checkCustomizations()` helper adds checks 3a (`customizations-env-promote`), 3c (`customizations-mounts-promote`), 3d (`customizations-ports-promote`).

4. **Schema** — `scripts/generate-schema.ts` `env.value` description updated to mention `{{cs.KEY}}`. Schema regenerated. `tool/schema/types.ts` `ProjectEnvVar.value` JSDoc updated.

5. **Docs** — `docs/superposition-yml.md` `env:` section replaced with two-tier substitution table, decision tree, and worked examples. "Parameter tokens" section added with syntax, supported-fields table, pass-through guarantee table, and rationale.

6. **Tests** — 60 new unit tests (40 in `overlay-parameters.test.ts`, 20 in new `doctor-checks.test.ts`) + 3 integration tests in `project-env.test.ts`. All 627 existing tests continue to pass.

### Deviations from spec

- Integration tests use compose stack with postgres overlay (the only overlay with declared parameters that accepts compose). Plain stack tests use plain-compatible overlays (no parameter declarations needed for pass-through and error-path tests).
- Check 2b uses `parseSimpleEnvFile` from new `tool/utils/env-file.ts` (spec's Risk R3 resolved by extraction).
- All acceptance criteria 1–15 met.

### Acceptance criteria status

- [x]   1. Parameter token in env: value resolves (integration test in project-env.test.ts)
- [x]   2. Parameter token in local env: value resolves (unit-tested; composeDevContainer merges local env before substitution)
- [x]   3. Unknown token → hard error (integration test)
- [x]   4. Pass-through preserved (unit tests in overlay-parameters.test.ts)
- [x]   5. Doctor warns sensitive param hardcoded (unit tests in doctor-checks.test.ts)
- [x]   6. Sensitive param default not flagged (unit tests)
- [x]   7. Doctor warns sensitive param in .devcontainer/.env (unit tests)
- [x]   8. Doctor suggests env: promotion (unit tests)
- [x]   9. Doctor suggests mounts: promotion (unit tests)
- [x]   10. No promotion suggestion when first-class field used (unit tests)
- [x]   11. Schema annotates env: value (superposition.schema.json updated)
- [x]   12. Docs include precedence/two-tier table (docs/superposition-yml.md)
- [x]   13. Parameter tokens docs section exists (docs/superposition-yml.md)
- [x]   14. CHANGELOG updated (CHANGELOG.md Unreleased section)
- [x]   15. Existing tests unchanged (627/627 pass)
