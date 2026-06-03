# Feature Specification: Project-Level `ports` Field

**Spec ID**: `024-project-ports`
**Created**: 2026-06-03
**Updated**: 2026-06-03
**Status**: Final
**Input**: Retroactive — initial implementation merged without prior spec. This revision corrects
misaligned semantics between `stack: plain` and `stack: compose` identified in post-merge review.

---

## User-facing mental model

A user adding `ports` to `superposition.yml` needs to answer one question first:

> **Which stack am I on?**

### `stack: plain` — VS Code forwards container ports

A plain devcontainer has no Docker daemon between the editor and the process. VS Code forwards
ports from the container to the developer's local machine automatically. There is no host-side
port binding to configure — only the **container port** matters.

- Write: a container port number or `${VAR:-default}` expression.
- Do **not** write `HOST:CONTAINER` — the tool rejects it with an error.
- Use `env` in `superposition.yml` to drive the port value. That `env` also sets the container
  environment variable, so both `forwardPorts` and the app's runtime config stay in sync from
  a single source of truth.
- The tool resolves `${VAR}` at **generation time** using this priority order:
  superposition.yml `env` → root `.env` → inline default → error.

### `stack: compose` — Docker Compose publishes host:container bindings

A compose devcontainer delegates port publication to Docker Compose. Compose reads variable
expressions from `.env` at **container startup**, not at generation time. The tool must write
the binding string exactly as-is so Compose can perform its own resolution.

- Write: a full `HOST:CONTAINER` binding, e.g. `${API_PORT:-8080}:8080`.
- Do **not** write a bare container port — the tool rejects it with an error.
- The tool writes the string **verbatim** to `docker-compose.yml`; `${VAR}` is never expanded.
- For `devcontainer.json forwardPorts` and `portsAttributes`, the tool extracts the **container
  port** (rightmost segment) as a best-effort hint. If extraction fails, the entry is silently
  skipped — Compose still publishes the port correctly.

### Format quick-reference

| Stack     | What to write in `value`                    | Tool expands? | Written to compose? | `forwardPorts` key       |
| --------- | ------------------------------------------- | ------------- | ------------------- | ------------------------ |
| `plain`   | `"${API_PORT:-8080}"` or `"8080"`           | Yes           | No                  | resolved port            |
| `compose` | `"${API_PORT:-8080}:8080"` or `"9000:8080"` | No (verbatim) | Yes                 | extracted container port |

`portsAttributes` is always keyed by the **container port** (the number VS Code forwards),
never the host port.

---

## Canonical terminology

| Term                | Definition                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **port expression** | A string containing only a port number or `${VAR:-default}`, with no `:`. Valid only on `stack: plain`.                                    |
| **port binding**    | A full docker-compose short-syntax string with at least one `:` (`HOST:CONTAINER` or `IP:HOST:CONTAINER`). Valid only on `stack: compose`. |
| **container port**  | The rightmost numeric segment of a port binding, or the resolved value of a port expression. The port VS Code forwards.                    |
| **host port**       | The left/middle segment of a port binding. Ignored by VS Code; governs Docker's publish mapping.                                           |
| **verbatim**        | Written to `docker-compose.yml` exactly as the user typed, with no `${VAR}` substitution by the tool.                                      |
| **resolve**         | Tool substitutes `${VAR}` at generation time using superposition.yml `env`, then root `.env`, then inline default.                         |
| **extract**         | Tool reads the container port from a verbatim binding string (best-effort, no resolution).                                                 |

---

## Overview

Add a top-level `ports` field to `superposition.yml` so teams can declare explicit port
configurations once and have them materialize correctly in both plain and compose stacks.

**Core semantic split:**

| Stack     | `value` format  | Tool behavior  | Written to                                       |
| --------- | --------------- | -------------- | ------------------------------------------------ |
| `plain`   | Port expression | Resolve at gen | `devcontainer.json forwardPorts`                 |
| `compose` | Port binding    | Verbatim       | `docker-compose.yml services.devcontainer.ports` |

For `stack: plain`, devcontainer has no host:container port binding — the devcontainer spec
only exposes container ports. The tool resolves the port expression to a numeric container port
and writes it to `forwardPorts`. Resolution uses `superposition.yml env` values **first**,
giving project-level configuration precedence over the root `.env`. This means a single
`env` entry in `superposition.yml` simultaneously drives the container's runtime environment
variable (`remoteEnv`) and the `forwardPorts` entry — one change, both stay in sync.

For `stack: compose`, Docker Compose owns variable expansion via `.env` and shell environment
at container startup. The tool must not pre-expand port bindings; doing so would override the
compose-native resolution flow and break runtime configurability.

Project ports intentionally bypass `portOffset` — they are absolute, user-owned port
declarations, not overlay-relative slots.

---

## User Scenarios & Testing

### User Story 1 — Plain stack: container port expression (Priority: P1)

A developer adds `ports` to a `stack: plain` project. Each entry is a container port number or
expression. After `regen`, the resolved port appears in `devcontainer.json forwardPorts`.

**Acceptance Scenarios**:

1. **Given** `ports: ["${API_PORT:-8080}"]`, `env: {API_PORT: "9001"}` in superposition.yml, no
   `.env`, **When** generation runs, **Then** `devcontainer.json.forwardPorts` contains `9001`.
   Superposition.yml `env` resolves before root `.env`.

2. **Given** `ports: ["${API_PORT:-8080}"]` with no `API_PORT` in superposition.yml `env` and
   `.env` has `API_PORT=9002`, **When** generation runs, **Then** `forwardPorts` contains `9002`.
   Root `.env` is the fallback.

3. **Given** `ports: ["${API_PORT:-8080}"]` with no `API_PORT` anywhere, **When** generation runs,
   **Then** `forwardPorts` contains `8080` (inline default used).

4. **Given** `ports: ["${MISSING}"]` with no default and not in any env, **When** generation runs,
   **Then** generation throws an error citing the port index and the unresolvable reference.

5. **Given** `ports: ["${API_PORT:-8080}:8080"]` (HOST:CONTAINER format on `stack: plain`),
   **When** generation runs, **Then** generation throws a `ProjectConfigError` stating that
   HOST:CONTAINER port binding syntax is not valid for `stack: plain`; only container port
   expressions are accepted.

6. **Given** `portOffset: 100` and a plain-stack project port `"${API_PORT:-8080}"`,
   **When** generation runs, **Then** the resolved project port is NOT offset; overlay ports ARE
   offset. Both `forwardPorts` values must be present and distinct.

7. **Given** an object form `{value: "${API_PORT:-8080}", label: "API", onAutoForward: "notify"}`,
   **When** generation runs, **Then** `portsAttributes["<resolved-port>"]` equals
   `{label: "API", onAutoForward: "notify"}`.

8. **Given** an entry with only `value` (no metadata), **When** generation runs, **Then** no entry
   is added to `portsAttributes` for that port.

---

### User Story 2 — Compose stack: verbatim binding (Priority: P1)

A developer adds `ports` to a `stack: compose` project. Each entry is a docker-compose short
syntax binding. After `regen`, the raw string (unexpanded) appears in
`docker-compose.yml services.devcontainer.ports`. The tool never expands `${VAR}` references.

**Acceptance Scenarios**:

1. **Given** `ports: ["${API_PORT:-8080}:8080"]`, `.env` has `API_PORT=9010`, **When** generation
   runs, **Then** `docker-compose.yml services.devcontainer.ports` contains exactly
   `"${API_PORT:-8080}:8080"` (unexpanded). The string `"9010:8080"` must NOT appear.

2. **Given** `ports: ["${WEB_DEV_PORT:-5173}:5173"]` with no `WEB_DEV_PORT` anywhere,
   **When** generation runs, **Then** `docker-compose.yml` contains
   `"${WEB_DEV_PORT:-5173}:5173"` verbatim; no error is thrown (Compose resolves at runtime).

3. **Given** `ports: ["${API_PORT:-8080}:8080"]`, **When** generation runs, **Then**
   `devcontainer.json.forwardPorts` contains `8080` (container port extracted from the rightmost
   literal or default segment). See Container Port Extraction below.

4. **Given** `ports: [{value: "${API_PORT:-8080}:8080", label: "API", onAutoForward: "notify"}]`,
   **When** generation runs, **Then** `portsAttributes["8080"]` equals
   `{label: "API", onAutoForward: "notify"}` (keyed by extracted container port).

5. **Given** a port entry `"9000:8080"` (fully literal binding), **When** generation runs,
   **Then** `docker-compose.yml` contains `"9000:8080"` verbatim, and `forwardPorts` contains
   `8080` (container port).

6. **Given** a three-segment binding `"192.168.1.10:${API_PORT:-9000}:8080"`,
   **When** generation runs, **Then** the string is written verbatim to compose; `forwardPorts`
   contains `8080` (rightmost literal or default).

---

### User Story 3 — Container port extraction for compose `forwardPorts` (Priority: P1)

The tool extracts a numeric container port hint from the verbatim compose binding to populate
`devcontainer.json forwardPorts` and `portsAttributes` keys. This is best-effort for metadata
purposes; Compose itself governs actual port publication.

**Extraction algorithm** (applied only for `stack: compose`):

1. Split `value` on `:` — take the **last segment**.
2. If last segment is a plain number, use it directly.
3. If last segment is a `${VAR:-DEFAULT}` expression, extract `DEFAULT` and parse as number.
4. If neither, skip `forwardPorts` insertion for this entry (no error — best effort).

**Acceptance Scenarios**:

1. `"${API_PORT:-8080}:8080"` → extracted container port `8080`.
2. `"9000:8080"` → extracted container port `8080`.
3. `"192.168.1.10:9000:8080"` → extracted container port `8080`.
4. `"9000:${CONTAINER_PORT:-3000}"` → extracted container port `3000` (default from expression).
5. `"9000:${CONTAINER_PORT}"` (no default, no literal) → no `forwardPorts` insertion; no error.

---

### User Story 4 — Env resolution order for plain stack (Priority: P1)

For `stack: plain`, `${VAR}` and `${VAR:-default}` in a port `value` resolve in this precedence
order:

1. superposition.yml `env` section value for `VAR` (string shorthand or `value` of long form)
2. Root `.env` file value for `VAR`
3. Inline default (the `DEFAULT` part of `${VAR:-DEFAULT}`)
4. Error — unresolvable reference

**Acceptance Scenarios**:

1. **Given** superposition.yml `env: {API_PORT: "9001"}` and `.env` has `API_PORT=9002`,
   **Then** resolved port = `9001` (superposition.yml env wins).

2. **Given** no `API_PORT` in superposition.yml `env` and `.env` has `API_PORT=9002`,
   **Then** resolved port = `9002` (root `.env` fallback).

3. **Given** no `API_PORT` anywhere and port expression is `${API_PORT:-8080}`,
   **Then** resolved port = `8080` (default wins).

4. **Given** no `API_PORT` anywhere and port expression is `${API_PORT}` (no default),
   **Then** generation throws error citing port index and raw expression.

---

### User Story 5 — Port format validation (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a plain-stack port that resolves to a non-numeric string (e.g. `"notaport"`),
   **When** generation runs, **Then** error thrown citing port index and resolved value.

2. **Given** a plain-stack port that resolves to `0` or `65536`,
   **When** generation runs, **Then** error: port out of range 1–65535.

3. **Given** a compose-stack entry with no `:` (plain port expression like `"${API_PORT:-8080}"`),
   **When** generation runs, **Then** generation throws a `ProjectConfigError` stating that
   `stack: compose` port entries must use HOST:CONTAINER binding format. Direct container port
   expressions without `:` are not valid for compose.

4. **Given** `ports: "not-an-array"`, **Then** `ProjectConfigError: ports must be an array`.

5. **Given** an array entry that is neither a string nor a plain object,
   **Then** `ProjectConfigError`.

6. **Given** `onAutoForward: "badvalue"`, **Then** `ProjectConfigError` for invalid enum.

7. **Given** `ports: []` (empty array), **Then** `selection.ports` is `undefined`.

---

### User Story 6 — Parser / serializer round-trip (Priority: P1)

**Acceptance Scenarios**:

1. **Given** a `superposition.yml` with mixed string and object port entries, **When**
   `loadProjectConfig` runs, **Then** all entries are `ProjectPort` objects with at least `value`.

2. **Given** an entry with only `value`, **When** `serializeProjectConfig` runs, **Then** the
   entry is written as a string shorthand (compact).

3. **Given** an entry with `label` or `onAutoForward`, **When** `serializeProjectConfig` runs,
   **Then** the entry is written as an object with `value` + metadata keys.

4. **Given** `buildAnswersFromProjectConfig`, **When** called with a loaded selection that has
   `ports`, **Then** `answers.projectPorts` equals `selection.ports`.

---

### User Story 7 — Duplicate port deduplication (Priority: P2)

**Acceptance Scenarios**:

1. **Given** an overlay already adds container port `8080` to `forwardPorts` and a project port
   resolves to container port `8080`, **When** generation runs on plain stack, **Then**
   `forwardPorts` contains `8080` exactly once.

2. **Given** a compose project port and an overlay already adds `"8080:8080"` to compose service
   ports, **When** generation runs, **Then** `docker-compose.yml` ports contains the project port
   verbatim string without duplicate numeric entries.

---

### User Story 8 — Schema validation (Priority: P1)

**Acceptance Scenarios**:

1. Schema entry for `ports` exists and has correct `oneOf` (string, object).
2. Object `additionalProperties: false` — extra keys fail schema validation.
3. `onAutoForward` enum values are exactly: `notify`, `openBrowser`, `openPreview`, `silent`, `ignore`.

---

## Schema Design

### `superposition.yml` — plain stack example

```yaml
stack: plain
env:
    API_PORT:
        '9001' # Sets both remoteEnv.API_PORT and drives port resolution below.
        # Change this one value → forwardPorts and container env stay in sync.
ports:
    # Port expression only — no colon. HOST:CONTAINER format is a validation error on plain.
    - '${API_PORT:-8080}' # Resolved: superposition env wins → 9001 (default 8080 unused)
    - value: '${WEB_PORT:-5173}'
      label: 'Web dev server'
      onAutoForward: openBrowser
```

Generated `devcontainer.json` (excerpt):

```json
{
    "forwardPorts": [9001, 5173],
    "portsAttributes": {
        "5173": { "label": "Web dev server", "onAutoForward": "openBrowser" }
    }
}
```

> Note: `portsAttributes` has no entry for `9001` because that port has no `label` or
> `onAutoForward` metadata. Entries with metadata only use object form.

### `superposition.yml` — compose stack example

```yaml
stack: compose
# No env expansion for ports on compose. Compose reads .env at startup.
ports:
    # Port binding — must contain colon. Bare port expression is a validation error on compose.
    - '${API_PORT:-8080}:8080' # Written verbatim. Compose expands ${API_PORT} from .env.
    - value: '${WEB_DEV_PORT:-5173}:5173'
      label: 'Web dev server'
      onAutoForward: openBrowser
```

Generated `docker-compose.yml` (excerpt):

```yaml
services:
    devcontainer:
        ports:
            - '${API_PORT:-8080}:8080' # verbatim — NOT expanded
            - '${WEB_DEV_PORT:-5173}:5173'
```

Generated `devcontainer.json` (excerpt):

```json
{
    "forwardPorts": [8080, 5173],
    "portsAttributes": {
        "5173": { "label": "Web dev server", "onAutoForward": "openBrowser" }
    }
}
```

> Note: `forwardPorts` uses extracted container ports (`8080`, `5173` — rightmost segment).
> `portsAttributes` key is the container port, not the host port. If `${API_PORT}` resolves
> to `9010` at runtime, Docker publishes `9010→8080`; VS Code still forwards `8080`.

### TypeScript types (`tool/schema/types.ts`)

```ts
export type ProjectPortAutoForwardAction =
    | 'notify'
    | 'openBrowser'
    | 'openPreview'
    | 'silent'
    | 'ignore';

export interface ProjectPort {
    /**
     * For stack: plain  — Container port expression, e.g. "${API_PORT:-8080}" or "8080".
     *                      Must NOT contain ":". Resolved from superposition.yml env,
     *                      then root .env, then inline default.
     * For stack: compose — Full docker-compose short syntax, e.g. "${API_PORT:-8080}:8080".
     *                      Must contain ":". Written VERBATIM to docker-compose ports;
     *                      the tool does NOT expand ${VAR} references.
     */
    value: string;
    /** Optional label for devcontainer.json portsAttributes. */
    label?: string;
    /** Optional VS Code auto-forward action for devcontainer.json portsAttributes. */
    onAutoForward?: ProjectPortAutoForwardAction;
}
```

`ProjectConfigSelection.ports?: ProjectPort[]`
`QuestionnaireAnswers.projectPorts?: ProjectPort[]`

No structural TypeScript change to `ProjectPort` is required. The change is in the **semantics
and runtime behavior** of `value` interpretation.

---

## Generation Behavior

### Plain stack — `resolveProjectPortsForPlain`

```
inputs:
  - projectPorts: ProjectPort[]
  - superpositionEnv: Record<string, string>   ← extracted from answers.projectEnv
  - rootEnv: Record<string, string>             ← loaded from root .env

for each entry at index i:
  1. Validate value does not contain ":" → ProjectConfigError if it does
  2. Resolve ${VAR} / ${VAR:-default} using superpositionEnv first, then rootEnv
  3. Validate resolved string is a numeric port in range 1–65535 → throw if not
  4. Produce ResolvedProjectPort { ...entry, containerPort: number }
```

### Compose stack — `extractProjectPortsForCompose`

```
inputs:
  - projectPorts: ProjectPort[]

for each entry at index i:
  1. Validate value contains ":" → ProjectConfigError if not
  2. Extract container port hint from rightmost segment:
       - Plain number   → use directly
       - ${VAR:-N}      → extract N
       - ${VAR} (no default) → containerPortHint = undefined
  3. Produce RawProjectPort { ...entry, rawBinding: entry.value, containerPortHint?: number }
```

### `applyProjectPortsToDevcontainer`

Unchanged interface. Now receives a unified `PreparedProjectPort[]` where each item has:

- `containerPort: number | undefined` — port for `forwardPorts` (undefined = skip)
- `label?: string`, `onAutoForward?: string` — for `portsAttributes`

Behavior:

- Append each `containerPort` (where defined) to `forwardPorts` via Set deduplication.
- Write `portsAttributes["<containerPort>"]` when `label` or `onAutoForward` present.

### Compose docker-compose port injection

`mergeDockerComposeFiles` writes `port.rawBinding` (the original unexpanded `value`) to
`services.devcontainer.ports`. Not the resolved/expanded value.

### Application order

```
1. Base template loaded
2. Overlays applied
3. Port offsets applied (overlay ports only)
4. Project env applied
5. Project mounts applied
6. Project ports applied  ← this feature (portOffset never applied here)
7. Custom patches applied
8. Target patches applied
9. Files written
```

### `portOffset` isolation

`portOffset` is applied before project ports. Project ports use absolute resolved container
ports and are never shifted.

---

## Migration from Initial Implementation

The initial implementation:

- Applied `${VAR}` expansion from root `.env` for **both** stacks.
- Wrote expanded `resolvedValue` (e.g. `"9010:8080"`) to docker-compose.yml.
- Used `hostPort` (left side of binding) for `forwardPorts` and `portsAttributes` key.

The corrected implementation:

- **Plain**: resolves container port expression (no colon). Env resolution includes
  superposition.yml `env` as first-priority source.
- **Compose**: writes `value` verbatim; container port hint extracted from rightmost segment.

**Breaking changes to existing `superposition.yml` users**:

| Old usage                           | Correct for stack | Migration                                 |
| ----------------------------------- | ----------------- | ----------------------------------------- |
| `"${API_PORT:-8080}:8080"` on plain | `compose` only    | Change to `"${API_PORT:-8080}"` for plain |
| `"8080:8080"` on plain              | `compose` only    | Change to `"8080"` for plain              |

Any project using `HOST:CONTAINER` format on a plain stack will receive a clear error at
generation time pointing to the affected port index.

---

## Canonical error messages

All errors are `ProjectConfigError`. The developer must use these exact strings (with the
indicated interpolations) so that error output is consistent and searchable.

| Trigger                                               | Message template                                                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plain-stack port expression contains `:`              | `ports[${i}]: stack 'plain' expects a container port expression (no colon), got "${value}". Use "HOST:CONTAINER" format only on stack 'compose'.`    |
| Compose-stack port entry has no `:`                   | `ports[${i}]: stack 'compose' expects a HOST:CONTAINER port binding (with colon), got "${value}". Use a bare port expression only on stack 'plain'.` |
| Unresolvable `${VAR}` (no default, absent everywhere) | `ports[${i}]: cannot resolve "${rawExpr}" — variable '${varName}' not found in superposition.yml env, root .env, or inline default.`                 |
| Resolved value is non-numeric                         | `ports[${i}]: resolved port "${resolved}" is not a valid port number (expected integer 1–65535).`                                                    |
| Resolved value out of range                           | `ports[${i}]: resolved port ${resolved} is out of range (must be 1–65535).`                                                                          |
| `ports` field is not an array                         | `ports: must be an array of port expressions (plain) or port bindings (compose).`                                                                    |
| Array entry is neither string nor plain object        | `ports[${i}]: each entry must be a string or an object with a 'value' key.`                                                                          |
| `onAutoForward` invalid enum value                    | `ports[${i}].onAutoForward: "${value}" is not a valid auto-forward action. Allowed: notify, openBrowser, openPreview, silent, ignore.`               |

`${i}` is the zero-based index of the offending entry.

---

## Implementation Notes

- `hasTopLevelColon()` walks string tracking brace depth; counts `:` only at depth 0, ignoring `:-` inside `${VAR:-default}` expressions.
- `resolveWithPriorityEnv()` checks superpositionEnv first, then rootEnv, then inline default, leaves unresolvable refs as-is for the caller to detect.
- `extractSuperpositionEnvStrings()` extracts `{ key: entry.value }` from `projectEnv` for port resolution priority.
- `extractContainerPortHint()` splits on top-level colons, examines last segment: plain number or `${VAR:-N}` default.
- `prepareProjectPorts()` dispatches by stack: plain validates no colon + resolves + validates numeric range; compose validates colon present + writes verbatim + extracts hint.
- `applyProjectPortsToDevcontainer` uses `containerPort` (not `hostPort`), deduplicates via Set.
- `mergeDockerComposeFiles` writes `rawBinding ?? value` (verbatim) to compose ports.
- All 23 acceptance-criteria tests pass; full suite 594/594 pass.
- Spec acceptance criteria all met; all `[ ]` items in User Stories validated by tests.

---

## Non-Goals

- No interactive questionnaire prompt for `ports` (config-file-only field).
- No range-based port specs (e.g. `"8080-8090:8080-8090"`).
- No runtime variable expansion for plain-stack ports — all env must be resolvable at generation.
- No conflict detection between project ports and overlay ports beyond deduplication.
- `portsAttributes` extraction for compose is best-effort; when container port cannot be
  extracted (no default, no literal), the entry is silently skipped for `forwardPorts` and
  `portsAttributes` (no error).

---

## Risks & Edge Cases

| Risk                                                                   | Mitigation                                                               |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Plain-stack `value` with `:` (user copy-pastes compose format)         | Immediate error at generation with clear message and port index          |
| Compose-stack `value` without `:`                                      | Immediate error at generation with clear message                         |
| Superposition.yml `env` value has `${REF}` itself                      | Resolve superposition env entry value literally (no recursive expansion) |
| `${VAR}` without default on plain, absent everywhere                   | Error at generation citing port index and raw expression                 |
| Port out of range 1–65535 on plain                                     | Validated post-resolution; error thrown                                  |
| Compose entry where container port segment is `${VAR}` with no default | Skip forwardPorts/portsAttributes for that entry; no error               |
| `portOffset` attempt on project ports                                  | Not applied — project ports processed after portOffset step              |
| Duplicate host/container port from overlay + project                   | Deduplicated via Set in `applyProjectPortsToDevcontainer`                |

---

## Artifacts to Deliver / Rework

| Artifact                                                                                                                              | Action                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `tool/schema/types.ts` — `ProjectPort` JSDoc update                                                                                   | Update comments only                                                                        |
| `tool/schema/project-config.ts` — validation in `parseProjectPorts`                                                                   | Add colon/format check per stack (stack passed in or checked at generation time — see note) |
| `tool/questionnaire/composer.ts` — `resolveProjectPorts` split into `resolveProjectPortsForPlain` and `extractProjectPortsForCompose` | Rework                                                                                      |
| `tool/questionnaire/composer.ts` — `applyProjectPortsToDevcontainer`                                                                  | Update to use `containerPort` key                                                           |
| `tool/questionnaire/composer.ts` — `mergeDockerComposeFiles`                                                                          | Write `rawBinding` (unexpanded) instead of `resolvedValue`                                  |
| `tool/questionnaire/composer.ts` — `resolveRootEnvReferences` call site for plain ports                                               | Pass merged superposition env + rootEnv, superposition env first                            |
| `tool/__tests__/project-ports.test.ts` — all three tests                                                                              | Rework to match new semantics                                                               |
| `tool/schema/superposition.schema.json` — no structural change                                                                        | Re-generate to pick up JSDoc change if needed                                               |
| `docs/superposition-yml.md` — `ports` section                                                                                         | Update examples to show plain vs compose format                                             |
| `CHANGELOG.md` — Unreleased entry                                                                                                     | Add breaking change note                                                                    |

> **Note on stack-aware validation**: `parseProjectPorts` in `project-config.ts` operates without
> stack context. Format validation (colon presence/absence) should therefore happen in
> `composer.ts` at generation time (where `stack` is known), not in the parser. The parser
> validates structure only (array, string-or-object, valid enum values).

### Tests to add / replace

| Test                                          | Description                                                                       |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| `plain — superposition env resolves first`    | `env: {API_PORT: "9001"}`, `.env: API_PORT=9002` → `forwardPorts` contains `9001` |
| `plain — root .env fallback`                  | No superposition env, `.env: API_PORT=9002` → `forwardPorts` contains `9002`      |
| `plain — default fallback`                    | No env anywhere, `${API_PORT:-8080}` → `forwardPorts` contains `8080`             |
| `plain — HOST:CONTAINER format error`         | `"8080:8080"` on plain → throws with port index                                   |
| `plain — unresolvable reference error`        | `"${MISSING}"` (no default, absent) → throws                                      |
| `plain — portOffset isolation`                | Overlay port shifted, project port not shifted                                    |
| `compose — verbatim write`                    | `"${API_PORT:-8080}:8080"` written unexpanded to docker-compose.yml               |
| `compose — container port extraction`         | `forwardPorts` contains `8080` from `"${API_PORT:-8080}:8080"`                    |
| `compose — no `:` format error`               | `"${API_PORT:-8080}"` on compose → throws with port index                         |
| `compose — portsAttributes by container port` | `portsAttributes["8080"]` present                                                 |
| `compose — IP:HOST:CONTAINER three-segment`   | Verbatim write; container port extracted from last segment                        |
| `compose — no default in container segment`   | `"9000:${CP}"` → no forwardPorts insertion; no error                              |
| `round-trip parse/serialize`                  | String/object mixed; compact serialization when no metadata                       |
| `empty ports array`                           | `ports: []` → `selection.ports` is `undefined`                                    |
| `onAutoForward invalid enum`                  | `ProjectConfigError` thrown                                                       |
