# Feature Specification: Ad-hoc Project Parameters

**Spec ID**: `026-adhoc-project-parameters`
**Taxonomy**: `SCHEMA-FIELD, CLI-UX`
**Created**: 2026-06-03
**Author**: PM Agent
**Status**: Final
**Input**: User bug report — `superposition.yml parameters:` keys not declared by any selected overlay
trigger `Unknown overlay parameters` warning AND `Unresolved parameter token` hard error when
referenced via `{{cs.KEY}}` in `env:`, preventing legitimate use of user-defined parameters
such as `API_PORT` and `WEB_DEV_PORT`.

---

## Problem Statement

Spec 011 and its implementation treat every key in `superposition.yml parameters:` that is not
declared by any selected overlay as "unknown" — a suspicious entry that might be a stale leftover
from a removed overlay. The system:

1. Emits a warning: `⚠️  Unknown overlay parameters (not declared by any selected overlay): API_PORT, WEB_DEV_PORT`
2. Does NOT include those keys in `resolvedParams`, so `{{cs.API_PORT}}` tokens survive substitution.
3. The surviving tokens then hit `validateEnvTokensResolved()` and throw a hard error:
    ```
    Unresolved parameter token in env.VITE_API_URL value: {{cs.API_PORT}}
    Declared parameters for selected overlays: POSTGRES_DB, POSTGRES_USER, ...
    Add the missing parameter to superposition.yml parameters: or select an overlay that declares it.
    ```

This makes ad-hoc user-defined parameters — values meaningful to the project but not part of any
overlay (e.g. service ports, feature flags, app-specific config) — unusable via `{{cs.KEY}}`.

### Affected scenario

```yaml
# superposition.yml
parameters:
    POSTGRES_DB: au2complt
    POSTGRES_USER: au2complt
    POSTGRES_PASSWORD: au2complt
    POSTGRES_PORT: 5432
    POSTGRES_VERSION: 16
    API_PORT: 8088 # ad-hoc — not declared by any overlay
    WEB_DEV_PORT: 5173 # ad-hoc — not declared by any overlay

env:
    DATABASE_URL: postgresql://{{cs.POSTGRES_USER}}:{{cs.POSTGRES_PASSWORD}}@postgres:{{cs.POSTGRES_PORT}}/{{cs.POSTGRES_DB}}
    VITE_API_URL: http://localhost:{{cs.API_PORT}}
    API_PORT: '{{cs.API_PORT}}'
    WEB_DEV_PORT: '{{cs.WEB_DEV_PORT}}'

ports:
    - value: ${API_PORT:-8080}:8080
      label: API Port
      onAutoForward: ignore
    - value: ${WEB_DEV_PORT:-5173}:5173
      label: Web Dev Port
      onAutoForward: ignore
```

`API_PORT` and `WEB_DEV_PORT` are defined in `parameters:` with explicit values. They should be
available for `{{cs.KEY}}` substitution everywhere overlay-declared parameters are.

---

## Goals

1. **Allow ad-hoc parameters** — keys in `superposition.yml parameters:` not declared by any
   selected overlay must be included in the resolved parameter map and available for `{{cs.KEY}}`
   substitution in `env:` values (and all other substitution targets).
2. **Update console warning** — the "Unknown overlay parameters" warning should change to a
   neutral informational message that does not imply the keys are erroneous.
3. **Update doctor check 4** — "Unknown parameters in project file" currently advises users to
   _remove_ unlisted keys. When a key is actively used via `{{cs.KEY}}`, that advice is wrong.
   Change wording to distinguish ad-hoc (valid) from stale (suspect) entries.
4. **Update error messages** — `validateEnvTokensResolved()` error text mentions "Declared
   parameters for selected overlays" — misleading when the user already has the key in
   `parameters:` but it isn't resolved. Update to list all resolved parameter keys.
5. **Update docs** — `docs/superposition-yml.md` must document ad-hoc parameters as a first-class
   feature with an example.
6. **Update tests** — new unit and integration tests covering ad-hoc param resolution,
   substitution, and doctor check 4 behaviour change.

## Non-Goals

- Adding an explicit `adhoc: true` flag or separate section to `superposition.yml`. The fix is
  transparent: all `parameters:` entries resolve regardless of overlay membership.
- Sensitivity metadata for ad-hoc parameters. Users cannot mark ad-hoc parameters `sensitive:`
  (that field is only in overlay declarations). Doctor check 2a will not fire for ad-hoc keys.
  This is acceptable; sensitivity metadata could be added in a future spec if needed.
- Changing how `ports:` values are substituted. The user example uses `${VAR:-default}` (runtime
  Docker Compose expressions) in `ports:`, not `{{cs.KEY}}`. No `{{cs.KEY}}` substitution for
  `ports:` entries is introduced by this spec.
- Removing the ability to detect truly stale parameters. Doctor check 4 continues to emit a
  warning — only the wording and guidance change.
- CLI `--param` flag behaviour change. Ad-hoc params supplied via `--param` already work today
  if added to `parameters:`. This spec only fixes the case where they are in `parameters:` but
  not declared by an overlay.

---

## Behaviour

### Parameter resolution (updated rule)

`resolveParameters(declared, supplied)` must include **all** keys from `supplied` in `values`,
not only keys that appear in `declared`. Specifically:

```
For each key in `supplied`:
  values[key] = supplied[key]          ← include unconditionally

For each key in `declared` not in `supplied`:
  if declared[key].default exists:
    values[key] = declared[key].default
  else:
    missingRequired.push(key)
```

`unknownSupplied` (keys in `supplied` not in `declared`) continues to be returned for use in
warnings and doctor checks. It is no longer excluded from `values`.

### Console output (composer.ts)

The existing `console.warn` in `composeDevContainer()` for `unknownSupplied` must change from:

```
⚠️  Unknown overlay parameters (not declared by any selected overlay): API_PORT, WEB_DEV_PORT
```

to a neutral informational block (same log level as the `⚙️  Overlay parameters:` display block):

```
⚙️  Project-only parameters (not declared by any selected overlay):
   API_PORT=8088
   WEB_DEV_PORT=5173
```

See UX Contract §Canonical interaction model for exact format and the display split between
overlay parameters and project-only parameters.

### Error messages

`validateEnvTokensResolved()` error text currently reads:

```
Unresolved parameter token in env.<KEY> value: {{cs.TOKEN}}
Declared parameters for selected overlays: POSTGRES_DB, POSTGRES_USER, ...
Add the missing parameter to superposition.yml parameters: or select an overlay that declares it.
```

Change the second and third lines to:

```
Unresolved parameter token in env.<KEY> value: {{cs.TOKEN}}
Resolved parameters: POSTGRES_DB, POSTGRES_USER, POSTGRES_PORT, API_PORT, ...
Add the missing parameter to superposition.yml parameters: or select an overlay that declares it.
```

The word "Declared" → "Resolved" is the key change; it accurately describes what keys are
available, regardless of whether they came from an overlay declaration or from `parameters:`
directly.

### Doctor check 4 (updated)

Check 4 currently reads:

```
name:    Unknown parameters in project file
status:  warn
message: parameters: contains N key(s) not declared by any selected overlay: KEY1, KEY2
details:
  - These may be stale entries from a removed overlay
  - Remove them from the parameters: section in your project file
```

Change to:

```
name:    Project-only parameters (not declared by any selected overlay)
findingId: project-only-parameters
status:  warn
message: parameters: contains N key(s) not declared by any selected overlay: KEY1, KEY2
details:
  - These parameters are resolved and available for {{cs.KEY}} substitution
  - If a key was added by mistake or left over from a removed overlay, remove it from parameters:
  - If intentional (e.g. API_PORT, WEB_DEV_PORT), no action needed
fixEligibility: manual-only
fixable: false
```

Rationale: the finding is still emitted (useful for typo/stale-key detection) but the guidance no
longer tells users to delete valid ad-hoc params.

### Sensitivity

Ad-hoc parameters carry no `sensitive:` flag (no overlay declaration to read it from). Doctor
checks 2a and 2b only inspect keys where `declared[key]?.sensitive` is `true`. Ad-hoc keys are
not in `declared`, so those checks naturally skip them — no code change needed. This is by design:
users who need a sensitive ad-hoc parameter should reference it via `${VAR:-default}` runtime
syntax instead of a literal `{{cs.KEY}}` token (per the guidance in spec 025 §Mental model).

---

## Examples

### Example 1 — Ad-hoc parameters resolved in env:

```yaml
# superposition.yml
overlays: [postgres]
parameters:
    POSTGRES_DB: myapp
    POSTGRES_USER: myapp
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
    POSTGRES_PORT: 5432
    POSTGRES_VERSION: 16
    API_PORT: 8088 # ad-hoc
    WEB_DEV_PORT: 5173 # ad-hoc

env:
    DATABASE_URL: postgresql://{{cs.POSTGRES_USER}}:${POSTGRES_PASSWORD:-postgres}@postgres:{{cs.POSTGRES_PORT}}/{{cs.POSTGRES_DB}}
    VITE_API_URL: http://localhost:{{cs.API_PORT}}
    API_PORT: '{{cs.API_PORT}}'
    WEB_DEV_PORT: '{{cs.WEB_DEV_PORT}}'
```

After `regen` (compose stack):

- `.devcontainer/.env` contains:
    ```
    DATABASE_URL=postgresql://myapp:${POSTGRES_PASSWORD:-postgres}@postgres:5432/myapp
    VITE_API_URL=http://localhost:8088
    API_PORT=8088
    WEB_DEV_PORT=5173
    ```
- Console shows:

    ```
       ⚙️  Overlay parameters:
          POSTGRES_DB=myapp
          POSTGRES_USER=myapp
          POSTGRES_PASSWORD=***
          POSTGRES_PORT=5432
          POSTGRES_VERSION=16
       ⚙️  Project-only parameters (not declared by any selected overlay):
          API_PORT=8088
          WEB_DEV_PORT=5173
    ```

    Key points:
    - `POSTGRES_PASSWORD` is declared `sensitive: true` by the postgres overlay → redacted as `***`.
    - `API_PORT` and `WEB_DEV_PORT` are project-only (no overlay declaration) → values shown in plain text; never redacted.
    - Project-only parameters appear in a **separate block below** the overlay parameters block.
    - Both blocks use the same `KEY=VALUE` per-line format.

Doctor output (using actual `formatCheckResult()` format):

```
  ⚠ Project-only parameters (not declared by any selected overlay): parameters: contains 2 key(s) not declared by any selected overlay: API_PORT, WEB_DEV_PORT
    - These parameters are resolved and available for {{cs.KEY}} substitution
    - If a key was added by mistake or is left over from a removed overlay, remove it from parameters:
    - If intentional (e.g. API_PORT, WEB_DEV_PORT), no action needed
```

### Example 2 — Typo in ad-hoc parameter still fails with clear error

```yaml
parameters:
    API_PORT: 8088

env:
    URL: http://localhost:{{cs.API_PRTO}} # typo
```

Terminal:

```
Error: Unresolved parameter token in env.URL value: {{cs.API_PRTO}}
Resolved parameters: API_PORT
Add the missing parameter to superposition.yml parameters: or select an overlay that declares it.
```

---

## Affected Code

| File                                        | Change                                                                                                      |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `tool/utils/parameters.ts`                  | `resolveParameters()` — include `unknownSupplied` keys in `values`                                          |
| `tool/questionnaire/composer.ts`            | Change `console.warn` for `unknownSupplied` to `console.log` with neutral wording                           |
| `tool/utils/parameters.ts`                  | `validateEnvTokensResolved()` — change "Declared parameters for selected overlays" to "Resolved parameters" |
| `tool/commands/doctor.ts`                   | Check 4 — update `name`, `findingId`, `message`, `details`                                                  |
| `tool/__tests__/overlay-parameters.test.ts` | New tests for ad-hoc param resolution                                                                       |
| `tool/__tests__/commands.test.ts`           | Update assertion for check 4 text; add ad-hoc param integration test                                        |
| `docs/superposition-yml.md`                 | Add ad-hoc parameter example and explanation                                                                |
| `CHANGELOG.md`                              | Add entry under Unreleased                                                                                  |

No schema changes: `parameters:` is already typed as `Record<string, string>` in `types.ts` and
`superposition.schema.json`. No `npm run schema:generate` needed.

No `npm run docs:generate` needed (no overlay changes).

---

## Risks

| Risk                                                                                                               | Likelihood | Impact | Mitigation                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Previously-stale ad-hoc keys that users left in `parameters:` silently start resolving instead of warning          | Low        | Low    | Warning (check 4) still fires; guidance updated                                                                                                                                                                                    |
| `resolveParameters()` change affects callers other than `composeDevContainer()`                                    | Low        | Medium | Only one caller: `composeDevContainer()` and doctor's `checkParameters()` (which calls `resolveParameters()` for check 5). Doctor check 5 only looks at `missingRequired`, which is unaffected. Audit all call sites before merge. |
| Sensitive ad-hoc param (no `sensitive:` flag) written to `.devcontainer/.env` in plain text with no doctor warning | Medium     | Medium | Document in "Sensitivity" section: use `${VAR:-default}` for secrets. Future spec can add user-side `sensitive:` annotation.                                                                                                       |
| `redactSensitiveValues()` does not redact ad-hoc params in plan/log output                                         | Low        | Low    | Ad-hoc params have no `sensitive: true` in `declared`, so they are already displayed in clear. Consistent with existing behaviour; not a regression.                                                                               |

---

## Acceptance Criteria

1. **Ad-hoc param resolves in `env:` value** — Given `superposition.yml` with `parameters: {API_PORT: 8088}` and no overlay declaring `API_PORT`, and `env: {VITE_API_URL: "http://localhost:{{cs.API_PORT}}"}`, when `regen` runs, then generated output contains `VITE_API_URL=http://localhost:8088` and no `{{cs.*}}` tokens remain in any generated file. Verify with integration test.

2. **Ad-hoc param coexists with overlay params** — Given `parameters:` containing both overlay-declared keys (`POSTGRES_PORT`) and ad-hoc keys (`API_PORT`), when `regen` runs, then both are substituted correctly, overlay-declared values come from the overlay default when omitted, and ad-hoc values come from `parameters:` directly. Verify with unit test on `resolveParameters()`.

3. **`unknownSupplied` still populated** — Given `parameters: {API_PORT: 8088}` and no overlay declaring `API_PORT`, when `resolveParameters()` is called, then `result.unknownSupplied` contains `API_PORT` (for use in check 4), AND `result.values.API_PORT === '8088'`. Verify with unit test.

4. **Console output is neutral and structured** — Given ad-hoc params `API_PORT=8088, WEB_DEV_PORT=5173` present alongside overlay params, when `regen` runs, then:
    - Console does NOT contain "Unknown overlay parameters".
    - Console DOES contain `⚙️  Project-only parameters (not declared by any selected overlay):`.
    - Console shows `API_PORT=8088` and `WEB_DEV_PORT=5173` each on its own line (6-space indent), NOT as a single comma-separated line.
    - Neither `API_PORT` nor `WEB_DEV_PORT` appears in the `⚙️  Overlay parameters:` block.
      Verify with command integration test.

5. **Doctor check 4 updated wording** — Given `superposition.yml` with ad-hoc keys `MY_KEY1, MY_KEY2`, when `doctor` runs, then the finding has:
    - `name: 'Project-only parameters (not declared by any selected overlay)'`
    - `findingId: 'project-only-parameters'`
    - `details[2]` contains `MY_KEY1` (actual key name from test data, not generic example)
    - No detail line says "Remove them from the parameters: section"
      Verify with unit test on `checkParameters()`.

6. **Doctor check 4 still fires for stale keys** — Given a project that previously used overlay `redis` (now removed from `overlays:`) but still has `REDIS_PORT: 6380` in `parameters:`, when `doctor` runs, then a check 4 finding is still emitted (stale-key detection preserved). Verify with unit test.

7. **Error message uses "Resolved parameters" wording** — Given `env: {FOO: "{{cs.MISSING}}"}` with `parameters: {API_PORT: 8088}` (so resolved map is non-empty), when `regen` runs, then the error message contains "Resolved parameters: API_PORT" (not "Declared parameters for selected overlays"). Verify with unit test on `validateEnvTokensResolved()`.

8. **No regression on overlay-declared params** — Given existing tests in `overlay-parameters.test.ts` and `commands.test.ts`, when `npm test` runs after implementation, all pre-existing tests pass. Verify with test run.

9. **`npm run lint` passes** — Given implementation changes, when `npm run lint:fix && npm run lint` runs, no type or formatting errors. Verify with CI.

10. **CHANGELOG updated** — Given `CHANGELOG.md`, then `Unreleased` section mentions ad-hoc project parameter support and the doctor check 4 wording change. Verify file content.

---

## Implementation Slices

### Slice 1 — Core fix (5 lines of code)

**`tool/utils/parameters.ts`** — `resolveParameters()`:

Replace the current resolution loop:

```typescript
// Resolve each declared parameter
for (const [key, def] of Object.entries(declared)) {
    if (key in supplied) {
        values[key] = supplied[key];
    } else if (def.default !== undefined) {
        values[key] = def.default;
    } else {
        missingRequired.push(key);
    }
}

// Identify unknown supplied parameters (not declared by any overlay)
const unknownSupplied = Object.keys(supplied).filter((key) => !(key in declared));
```

With:

```typescript
// Resolve each declared parameter
for (const [key, def] of Object.entries(declared)) {
    if (key in supplied) {
        values[key] = supplied[key];
    } else if (def.default !== undefined) {
        values[key] = def.default;
    } else {
        missingRequired.push(key);
    }
}

// Include ad-hoc (project-only) parameters in resolved values.
// Keys not declared by any overlay are valid user-defined parameters.
const unknownSupplied = Object.keys(supplied).filter((key) => !(key in declared));
for (const key of unknownSupplied) {
    values[key] = supplied[key];
}
```

### Slice 2 — Console message (composer.ts)

This slice has two changes that must be made together.

**Change A** — Replace the `unknownSupplied` warning block AND update the overlay parameters
display loop to prevent ad-hoc keys appearing in the overlay block (see UX Contract
§Implementation constraint for Slice 2):

```typescript
// BEFORE (remove both blocks):
if (unknownSupplied.length > 0) {
    console.warn(
        chalk.yellow(
            `   ⚠️  Unknown overlay parameters (not declared by any selected overlay): ${unknownSupplied.join(', ')}`
        )
    );
}

const hasResolvedParams = Object.keys(resolvedParams).length > 0;

if (hasResolvedParams) {
    const displayValues = redactSensitiveValues(resolvedParams, declaredParams);
    console.log(chalk.dim(`   ⚙️  Overlay parameters:`));
    for (const [k, v] of Object.entries(displayValues)) {
        console.log(chalk.dim(`      ${k}=${v}`));
    }
}

// AFTER (replace with):
const overlayKeys = Object.keys(declaredParams);
if (overlayKeys.length > 0) {
    const displayValues = redactSensitiveValues(resolvedParams, declaredParams);
    console.log(chalk.dim(`   ⚙️  Overlay parameters:`));
    for (const key of overlayKeys) {
        if (key in displayValues) {
            console.log(chalk.dim(`      ${key}=${displayValues[key]}`));
        }
    }
}

if (unknownSupplied.length > 0) {
    console.log(
        chalk.dim(`   ⚙️  Project-only parameters (not declared by any selected overlay):`)
    );
    for (const key of unknownSupplied) {
        console.log(chalk.dim(`      ${key}=${resolvedParams[key]}`));
    }
}
```

**Change B** — Remove the now-dead `const hasResolvedParams` variable (replaced above).

Note on ordering: `overlayKeys` preserves insertion order from `collectOverlayParameters()`.
`unknownSupplied` preserves YAML key order from `parameters:`. Do not sort.

### Slice 3 — Error message (parameters.ts)

```typescript
// validateEnvTokensResolved — change one line:
// BEFORE: `Declared parameters for selected overlays: ${declaredKeys}\n`
// AFTER:  `Resolved parameters: ${declaredKeys}\n`
```

### Slice 4 — Doctor check 4 (doctor.ts)

```typescript
// BEFORE:
results.push({
    name: 'Unknown parameters in project file',
    status: 'warn',
    message: `parameters: contains ${unknownKeys.length} key(s) not declared by any selected overlay: ${unknownKeys.join(', ')}`,
    details: [
        'These may be stale entries from a removed overlay',
        'Remove them from the parameters: section in your project file',
    ],
    fixEligibility: 'manual-only',
});

// AFTER:
results.push({
    name: 'Project-only parameters (not declared by any selected overlay)',
    findingId: 'project-only-parameters',
    status: 'warn',
    message: `parameters: contains ${unknownKeys.length} key(s) not declared by any selected overlay: ${unknownKeys.join(', ')}`,
    details: [
        'These parameters are resolved and available for {{cs.KEY}} substitution',
        'If a key was added by mistake or is left over from a removed overlay, remove it from parameters:',
        `If intentional (e.g. ${unknownKeys.slice(0, 2).join(', ')}), no action needed`,
    ],
    fixEligibility: 'manual-only',
});
```

Note: `details[2]` interpolates the actual `unknownKeys` values (up to 2) so users see their
own key names, not a generic example. This matches the UX contract rule that the detail line
must use real key names.

### Slice 5 — Tests

New tests in `tool/__tests__/overlay-parameters.test.ts`:

```typescript
describe('resolveParameters — ad-hoc params', () => {
    it('includes ad-hoc supplied params in values', () => {
        const { values, unknownSupplied } = resolveParameters({}, { API_PORT: '8088' });
        expect(values.API_PORT).toBe('8088');
        expect(unknownSupplied).toContain('API_PORT');
    });

    it('ad-hoc params coexist with overlay-declared params', () => {
        const declared = {
            POSTGRES_PORT: { description: 'port', default: '5432', overlayId: 'postgres' },
        };
        const { values, unknownSupplied } = resolveParameters(declared, {
            POSTGRES_PORT: '5433',
            API_PORT: '8088',
        });
        expect(values.POSTGRES_PORT).toBe('5433');
        expect(values.API_PORT).toBe('8088');
        expect(unknownSupplied).toEqual(['API_PORT']);
    });
});

describe('validateEnvTokensResolved — error wording', () => {
    it('error says "Resolved parameters" not "Declared parameters"', () => {
        expect(() =>
            validateEnvTokensResolved({ FOO: { value: '{{cs.MISSING}}' } }, { API_PORT: '8088' })
        ).toThrow(/Resolved parameters: API_PORT/);
        expect(() =>
            validateEnvTokensResolved({ FOO: { value: '{{cs.MISSING}}' } }, { API_PORT: '8088' })
        ).not.toThrow(/Declared parameters for selected overlays/);
    });
});
```

Update `tool/__tests__/commands.test.ts` assertion for check 4:

- Replace assertion `expect(output).toContain('Unknown parameters in project file')`
  with `expect(output).toContain('Project-only parameters (not declared by any selected overlay)')`.

Integration test (append to `tool/__tests__/project-env.test.ts`):

```typescript
it('resolves ad-hoc project-only parameter in env: value', async () => {
    const outputPath = ...;
    const answers: QuestionnaireAnswers = {
        stack: 'plain',
        baseImage: 'bookworm',
        ...
        overlayParameters: { API_PORT: '8088' }, // not declared by any overlay
        projectEnv: { VITE_API_URL: { value: 'http://localhost:{{cs.API_PORT}}' } },
    };
    await composeDevContainer(answers);
    const dc = JSON.parse(fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8'));
    expect(dc.remoteEnv.VITE_API_URL).toBe('http://localhost:8088');
    expect(JSON.stringify(dc)).not.toMatch(/\{\{cs\./);
});
```

### Slice 6 — Docs and changelog

**`docs/superposition-yml.md`** — inside the existing `### parameters` section, add a subsection
`#### Ad-hoc (project-only) parameters` immediately after the current prose, before any table:

````markdown
#### Ad-hoc (project-only) parameters

You can define parameters in `parameters:` that are not declared by any overlay. These are
resolved normally and available for `{{cs.KEY}}` substitution in `env:` values and overlay
file content. They are called **project-only parameters**.

```yaml
parameters:
    POSTGRES_DB: myapp # declared by postgres overlay
    API_PORT: 8088 # project-only — not declared by any overlay
    WEB_DEV_PORT: 5173 # project-only

env:
    VITE_API_URL: 'http://localhost:{{cs.API_PORT}}'
    API_PORT: '{{cs.API_PORT}}'
```
````

During `regen`, the tool logs project-only parameters in a separate block:

```
   ⚙️  Overlay parameters:
      POSTGRES_DB=myapp
   ⚙️  Project-only parameters (not declared by any selected overlay):
      API_PORT=8088
      WEB_DEV_PORT=5173
```

`doctor` notes them as a warning (`project-only-parameters`). If the key is intentional,
no action is needed. If it is a typo or left over from a removed overlay, remove it from
`parameters:`.

**Project-only parameters are not treated as sensitive.** Values appear in console output
and generated files in plain text. For any value that should not be committed to source
control, use `${VAR:-default}` runtime syntax in `env:` directly — do not put the secret
in `parameters:` and reference it via `{{cs.KEY}}`.

> **`ports:` note**: Port bindings use `${VAR:-default}` runtime syntax, not `{{cs.KEY}}`.
> Use `{{cs.API_PORT}}` in `env:` values; use `${API_PORT:-8080}:8080` in `ports:` entries.

```

**`CHANGELOG.md`** — under `Unreleased`:

```

### Fixed

- Ad-hoc parameters in `superposition.yml parameters:` (not declared by any overlay) are now
  resolved and available for `{{cs.KEY}}` substitution in `env:` and other fields. Previously
  they triggered a hard error (`Unresolved parameter token`).

### Changed

- "Unknown overlay parameters" console warning replaced with neutral "Project-only parameters
  (not declared by any overlay)" informational log.
- Doctor check 4 wording updated: no longer advises removing ad-hoc parameters; now explains
  they are resolved and suggests removal only for genuinely stale keys.
- `validateEnvTokensResolved()` error message says "Resolved parameters:" instead of
  "Declared parameters for selected overlays:" for accuracy.

```

---

## UX Contract

> **UX review** — added 2026-06-03. Status remains `Draft`. Hand back to PM.

---

### Mental model — three parameter kinds

Users encounter three distinct kinds of entries in `parameters:`. Docs, console, and error
messages must use consistent names so users are never confused about which kind they have:

| Kind | Where declared | Has `sensitive:`? | Canonical term |
|------|----------------|-------------------|----------------|
| Overlay-declared | `overlay.yml` `parameters[KEY]` | Yes (optional) | **overlay parameter** |
| Ad-hoc / project-only | Only in `superposition.yml` `parameters:` | No | **project-only parameter** |
| Missing required | Declared by overlay, absent from `parameters:` | — | **missing required parameter** |

**Rule**: never use "unknown", "unexpected", or "unrecognized" for project-only parameters in
any user-facing surface after this spec. "Unknown" implies an error; project-only parameters
are valid by design.

**Rule**: "project parameter" (no qualifier) is ambiguous — it could mean any key in
`parameters:`, including overlay-declared keys. Always say **project-only parameter** when
referring specifically to keys not declared by any overlay.

---

### Canonical interaction model — `regen` / `init` console output

#### Reading order (information hierarchy)

When both overlay parameters and project-only parameters exist, the console output in
`composeDevContainer()` MUST appear in this order:

```

⚙️ Overlay parameters:
POSTGRES_DB=myapp
POSTGRES_USER=myapp
POSTGRES_PASSWORD=\*\*\*
POSTGRES_PORT=5432
POSTGRES_VERSION=16
⚙️ Project-only parameters (not declared by any selected overlay):
API_PORT=8088
WEB_DEV_PORT=5173

````

Rules:

1. **Overlay parameters block** — only lists keys present in `declaredParams` (keys declared by a
   selected overlay). Values are redacted per `redactSensitiveValues(resolvedParams, declaredParams)`.
   Hidden when zero overlay-declared parameters exist for the current overlay selection.

2. **Project-only parameters block** — lists keys in `unknownSupplied` only. Values are shown
   in plain text (no sensitivity metadata exists for these keys). Hidden when
   `unknownSupplied.length === 0`.

3. **Both blocks use identical visual format**: header line with `⚙️` icon, then one `KEY=VALUE`
   per line, indented 6 spaces. Not a single comma-separated line.

4. **Neither block appears** when `parameters:` is empty and no overlays declare parameters.

5. **Only project-only block appears** when `parameters:` contains only ad-hoc keys and no
   selected overlay declares parameters.

#### Implementation constraint for Slice 2

The CURRENT display code iterates `Object.entries(displayValues)` where
`displayValues = redactSensitiveValues(resolvedParams, declaredParams)`. After Slice 1 adds
ad-hoc keys to `resolvedParams`, this loop would show ad-hoc keys inside the
"Overlay parameters:" block — a **display bug**.

Slice 2 MUST filter the overlay-parameters display to only keys present in `declaredParams`:

```typescript
// AFTER (Slice 2 must implement this split):
const overlayKeys = Object.keys(declaredParams);
const hasOverlayParams = overlayKeys.length > 0;

if (hasOverlayParams) {
    const displayValues = redactSensitiveValues(resolvedParams, declaredParams);
    console.log(chalk.dim(`   ⚙️  Overlay parameters:`));
    for (const key of overlayKeys) {
        if (key in displayValues) {
            console.log(chalk.dim(`      ${key}=${displayValues[key]}`))
        }
    }
}

if (unknownSupplied.length > 0) {
    console.log(chalk.dim(`   ⚙️  Project-only parameters (not declared by any selected overlay):`));
    for (const key of unknownSupplied) {
        console.log(chalk.dim(`      ${key}=${resolvedParams[key]}`));
    }
}
````

This replaces the existing `console.warn(chalk.yellow(...))` block AND updates the overlay
parameters display loop. Both changes belong in **Slice 2**, not separate slices.

---

### Canonical terminology — enforced across all surfaces

| Concept                                   | Canonical text                                                        | Do NOT use                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Keys not declared by any selected overlay | `Project-only parameters (not declared by any selected overlay)`      | `Unknown overlay parameters`, `Unknown parameters`, `unrecognized parameters` |
| Doctor check 4 name                       | `Project-only parameters (not declared by any selected overlay)`      | Any abbreviation                                                              |
| Doctor check 4 `findingId`                | `project-only-parameters`                                             | `unknown-params`, `adhoc-params`                                              |
| Console `⚙️` header (overlay)             | `⚙️  Overlay parameters:`                                             | `Declared parameters:`, `Resolved parameters:`                                |
| Console `⚙️` header (project-only)        | `⚙️  Project-only parameters (not declared by any selected overlay):` | Single-line comma-separated format                                            |
| Error: resolved key list                  | `Resolved parameters:`                                                | `Declared parameters for selected overlays:`                                  |
| Error: empty resolved list                | `Resolved parameters: (none)`                                         | empty string                                                                  |
| Docs subsection title                     | `Ad-hoc (project-only) parameters`                                    | `Custom parameters`, `User parameters`                                        |

**Consistency rule**: "any selected overlay" is more precise than "any overlay" (only currently
selected overlays are checked). Use "any selected overlay" in the doctor finding `message` field
and console header. The doctor `name` field may use the shorter form `(not declared by any
selected overlay)` without truncation.

---

### Interaction rules — sensitive handling (user-facing clarity)

Project-only parameters have **no sensitivity metadata**. This has three visible consequences
that must be documented explicitly:

1. **Console output**: project-only parameter values are always shown in plain text in the
   `⚙️  Project-only parameters:` block. There is no `***` redaction. This is by design.

2. **`doctor` checks 2a/2b**: these checks fire only for keys declared `sensitive: true` in
   an overlay. Project-only parameters are never checked by 2a or 2b, regardless of their
   key name (including names like `*_PASSWORD`, `*_SECRET`, `*_KEY`).

3. **Generated output**: a project-only parameter value baked into `env:` via `{{cs.KEY}}` is
   written to `.devcontainer/.env` or `devcontainer.json remoteEnv` in plain text with no
   doctor warning.

**Required docs guidance** (must appear in `docs/superposition-yml.md` ad-hoc subsection):

> **Project-only parameters are not treated as sensitive.** Their values appear in console
> output and generated files in plain text. For any value that should not be committed to
> source control, use `${VAR:-default}` runtime syntax in `env:` directly — do not put
> the secret in `parameters:` and reference it via `{{cs.KEY}}`.

**Decision tree (copy from spec 025, add project-only params row)**:

```
Is the value the same for everyone on the team?
  Yes → {{cs.KEY}} in env: value  (project-only param, resolved at regen, baked in)
  No  → ${VAR:-safe_default} in env: value  (each dev sets it in root .env)

Is the value a secret?
  Yes → NEVER use {{cs.KEY}} for the secret itself;
         store in root .env and reference via ${VAR:-default} in env:
  No  → {{cs.KEY}} is acceptable
```

---

### Page contract — doctor check 4 output

`formatCheckResult()` renders all `CheckResult` entries in the format:

```
  ⚠ <name>: <message>
    - <detail1>
    - <detail2>
    - <detail3>
```

The `name` and `message` fields are distinct. The spec's `Implementation Slices §Slice 4`
combines them in the example below; the rendered output will be:

```
  ⚠ Project-only parameters (not declared by any selected overlay): parameters: contains 2 key(s) not declared by any selected overlay: API_PORT, WEB_DEV_PORT
    - These parameters are resolved and available for {{cs.KEY}} substitution
    - If a key was added by mistake or is left over from a removed overlay, remove it from parameters:
    - If intentional (e.g. API_PORT, WEB_DEV_PORT), no action needed
```

The `details[2]` line ("If intentional…") must use **actual key names** from `unknownKeys`, not
the hardcoded `API_PORT, WEB_DEV_PORT` example. Interpolate the list:

```typescript
`If intentional (e.g. ${unknownKeys.slice(0, 2).join(', ')}), no action needed`;
```

This gives users immediate context about their own keys rather than a generic example.

---

### State behavior — display ordering and edge cases

| State                                             | Overlay params block                         | Project-only block            |
| ------------------------------------------------- | -------------------------------------------- | ----------------------------- |
| Overlay params only                               | Shown (key=value, sensitive redacted)        | Hidden                        |
| Project-only params only                          | Hidden                                       | Shown (key=value, plain text) |
| Both kinds                                        | Overlay block first, then project-only block | Both shown                    |
| Neither (no `parameters:`, overlay has no params) | Hidden                                       | Hidden                        |
| All overlay params at default, no ad-hoc          | Shown (defaults shown)                       | Hidden                        |

**Ordering within each block**: preserve YAML key order from `parameters:` (insertion order).
Do not sort alphabetically — users expect to see keys in the order they wrote them.

---

### State behavior — error messages (precision)

#### Unresolved token error

For spec 026, the error after `validateEnvTokensResolved()` must use `Resolved parameters:`
(not `Declared parameters for selected overlays:`) because the resolved map now includes
both overlay-declared and project-only keys.

Exact rendered error (Example 2 — typo in ad-hoc param):

```
Error: Unresolved parameter token in env.URL value: {{cs.API_PRTO}}
Resolved parameters: POSTGRES_DB, POSTGRES_USER, POSTGRES_PORT, API_PORT
Add the missing parameter to superposition.yml parameters: or select an overlay that declares it.
```

When no parameters are resolved at all (empty overlay selection, empty `parameters:`):

```
Error: Unresolved parameter token in env.FOO value: {{cs.MISSING}}
Resolved parameters: (none)
Add the missing parameter to superposition.yml parameters: or select an overlay that declares it.
```

The `(none)` fallback is already handled by `|| '(none)'` in `validateEnvTokensResolved()`.
Verify this fallback is preserved in Slice 3.

---

### Page contract — docs subsection (`docs/superposition-yml.md`)

The ad-hoc parameter subsection must appear **inside** the existing `### parameters` section,
immediately after the current prose description, before any table. The required content:

````markdown
#### Ad-hoc (project-only) parameters

You can define parameters in `parameters:` that are not declared by any overlay. These are
resolved normally and available for `{{cs.KEY}}` substitution in `env:` values and overlay
file content. They are called **project-only parameters**.

```yaml
parameters:
    POSTGRES_DB: myapp # declared by postgres overlay
    API_PORT: 8088 # project-only — not declared by any overlay
    WEB_DEV_PORT: 5173 # project-only

env:
    VITE_API_URL: 'http://localhost:{{cs.API_PORT}}'
    API_PORT: '{{cs.API_PORT}}'
```
````

During `regen`, the tool reports project-only parameters separately from overlay parameters:

```
   ⚙️  Overlay parameters:
      POSTGRES_DB=myapp
   ⚙️  Project-only parameters (not declared by any selected overlay):
      API_PORT=8088
      WEB_DEV_PORT=5173
```

`doctor` notes them as an informational warning. If a key is intentional, no action is needed.
If it is a typo or left over from a removed overlay, remove it from `parameters:`.

**Project-only parameters are not treated as sensitive.** Values appear in console output and
generated files in plain text. For any value that should not be committed to source control,
use `${VAR:-default}` runtime syntax in `env:` directly instead of `{{cs.KEY}}`.

> **`ports:` note**: Port bindings use `${VAR:-default}` runtime syntax, not `{{cs.KEY}}`.
> Use `{{cs.API_PORT}}` in `env:` values; use `${API_PORT:-8080}:8080` in `ports:` entries.

````

---

### QA scenario scripts

**QA-026-1: Ad-hoc param shows key=value in console, not just key**

1. `superposition.yml`: `overlays: [postgres]`, `parameters: {POSTGRES_DB: myapp, API_PORT: 8088}`, `stack: plain`
2. Run `cs regen`
3. Assert console output contains line matching `      API_PORT=8088` (6-space indent)
4. Assert console output does NOT contain `API_PORT, WEB_DEV_PORT` (old single-line comma-separated format)
5. Assert `API_PORT=8088` appears in the `Project-only parameters` block, NOT in the `Overlay parameters` block

**QA-026-2: Ad-hoc param NOT in overlay parameters block**

1. Same config as QA-026-1
2. Run `cs regen`
3. Assert the `⚙️  Overlay parameters:` block lists only `POSTGRES_DB=myapp` (and other postgres params), not `API_PORT`
4. Assert `API_PORT` appears only under `⚙️  Project-only parameters`

**QA-026-3: Only project-only params (no overlay params)**

1. `superposition.yml`: `overlays: []` (or plain baseImage, no overlays), `parameters: {API_PORT: 8088}`, `stack: plain`
2. Run `cs regen`
3. Assert console does NOT contain `⚙️  Overlay parameters:`
4. Assert console DOES contain `⚙️  Project-only parameters (not declared by any selected overlay):`
5. Assert `API_PORT=8088` appears

**QA-026-4: Sensitive overlay param stays in overlay block, not project-only block**

1. `superposition.yml`: `overlays: [postgres]`, `parameters: {POSTGRES_PASSWORD: mysecret, API_PORT: 8088}`
2. Run `cs regen`
3. Assert `POSTGRES_PASSWORD=***` in `⚙️  Overlay parameters:` block
4. Assert `API_PORT=8088` in `⚙️  Project-only parameters:` block (plain text)
5. Assert `POSTGRES_PASSWORD` does NOT appear in project-only block
6. Assert `API_PORT` does NOT appear in overlay parameters block

**QA-026-5: Sensitive project-only param (no overlay declaration) — no redaction, no doctor warning**

1. `superposition.yml`: no overlays that declare `MY_SECRET`, `parameters: {MY_SECRET: topsecret}`, `stack: plain`
2. Run `cs regen`
3. Assert `MY_SECRET=topsecret` displayed in plain text in console (not redacted as `***`)
4. Run `cs doctor`
5. Assert NO finding with `findingId: 'sensitive-params-project-file'` for `MY_SECRET`
6. Assert NO finding with `findingId: 'sensitive-params-devcontainer-env'` for `MY_SECRET`
7. (Note: this is expected and correct behaviour; docs must warn users)

**QA-026-6: Typo in `{{cs.KEY}}` with ad-hoc param defined → error names resolved params**

1. `superposition.yml`: `parameters: {API_PORT: 8088}`, `env: {URL: 'http://localhost:{{cs.API_PRTO}}'}` (typo)
2. Run `cs regen`
3. Assert exit code non-zero
4. Assert stderr contains `Unresolved parameter token in env.URL value: {{cs.API_PRTO}}`
5. Assert stderr contains `Resolved parameters: API_PORT` (NOT `Declared parameters for selected overlays`)
6. Assert no generated files written

**QA-026-7: Zero resolved params → error shows `(none)`**

1. `superposition.yml`: no overlays, no `parameters:`, `env: {X: '{{cs.MISSING}}'}`, `stack: plain`
2. Run `cs regen`
3. Assert stderr contains `Resolved parameters: (none)`

**QA-026-8: Doctor check 4 uses actual key names in detail line**

1. `superposition.yml`: `overlays: [postgres]`, `parameters: {POSTGRES_DB: myapp, MY_CUSTOM_KEY: foo}`
2. Run `cs doctor`
3. Assert finding with `name: 'Project-only parameters (not declared by any selected overlay)'`
4. Assert details line contains `MY_CUSTOM_KEY` (the actual key name), not the hardcoded `API_PORT, WEB_DEV_PORT`
5. Assert details line says `If intentional (e.g. MY_CUSTOM_KEY), no action needed`

**QA-026-9: `CHANGELOG.md` entry present and accurate**

1. Open `CHANGELOG.md`
2. Assert `Unreleased` section has `### Fixed` entry mentioning ad-hoc / project-only parameters
3. Assert entry mentions `{{cs.KEY}}` substitution was previously broken for these keys
4. Assert `### Changed` entry covers: console message, doctor check 4 wording, `Resolved parameters:` error text

---

## Architecture Decision Impact


None. This is a one-line additive change to `resolveParameters()` with supporting message updates.
No new interfaces, no ADR required.

---

## Dependencies

- **Spec 011** (Overlay Parameters) — defines `resolveParameters()` and `unknownSupplied` concept.
- **Spec 025** (Variable Expansion Consolidation) — defines `substituteProjectEnvTokens()` and
  `validateEnvTokensResolved()`. The error message fix in Slice 3 targets a function introduced
  there. Must verify implementation matches the spec 025 `Implementation Notes` section (it does,
  as confirmed by reading `tool/utils/parameters.ts`).

---

## Workflow Review Notes

- `docs/foundation.md` absent; AGENTS.md used as ground truth.
- No UX routing needed (no new user-facing UI surfaces; only error/warning message text changes).
- No Architect routing needed (no architectural ambiguity; change is surgical and additive).
- Route directly to **Developer**.

---

## Technical Design

> **Architect review** — added 2026-06-03. Status remains `Draft`. Hand back to PM.

---

### 1. Module / layer ownership

| Concern | Owning file | Must NOT be in |
|---------|------------|----------------|
| Parameter resolution logic | `tool/utils/parameters.ts` — `resolveParameters()` | composer, doctor |
| Console display of resolved params | `tool/questionnaire/composer.ts` — `composeDevContainer()` (lines ~2748–2770) | parameters.ts |
| Error message wording | `tool/utils/parameters.ts` — `validateEnvTokensResolved()` | caller sites |
| Doctor check 4 finding | `tool/commands/doctor.ts` — `checkParameters()` (lines ~1388–1403) | parameters.ts |
| Docs | `docs/superposition-yml.md` — `### parameters` section (line 571) | |
| Changelog | `CHANGELOG.md` — `Unreleased` | |

### 2. What must NOT own the logic

- `composeDevContainer()` must not filter or re-decide which keys to include in `resolvedParams`. That decision belongs in `resolveParameters()`. The composer only decides how to **display** the split.
- `checkParameters()` (doctor) must not re-compute `unknownSupplied`; it already filters `Object.keys(suppliedParams)` against `declared` — this is unchanged and correct.
- `validateEnvTokensResolved()` must not receive a filtered params map. Callers already pass the full `resolvedParams` from `resolveParameters()`.

### 3. Contracts that change

#### `resolveParameters()` — `tool/utils/parameters.ts`

**Before**: `values` contains only keys present in `declared`.
**After**: `values` contains all keys from `declared` (resolved via supplied or default) **plus** all keys from `unknownSupplied` (ad-hoc; supplied value only).
**`unknownSupplied`**: unchanged — still lists keys in `supplied` not in `declared`. Now serves only as a warning/display signal, not as a gate.

Return type `ResolvedParameters` is unchanged. Callers that read `values` automatically benefit; callers that read `unknownSupplied` are unaffected.

**Invariant that must hold**: `Object.keys(values)` ⊇ `Object.keys(supplied)` after the fix (i.e. every supplied key is in `values`).

#### `validateEnvTokensResolved()` — `tool/utils/parameters.ts`

Only the error string changes. Function signature, throw condition, and return type are unchanged.

#### Doctor check 4 — `tool/commands/doctor.ts`

Only the `name`, `findingId`, `message`, and `details` fields of the pushed `CheckResult` change. The trigger condition (`unknownKeys.length > 0`) is unchanged.

### 4. Downstream interfaces that change (user-facing)

1. **Console (regen/init)**: `console.warn(chalk.yellow(...))` → `console.log(chalk.dim(...))`. Message text and format change. Display split between overlay params and project-only params is new.
2. **Doctor check 4 output**: `name` field changes → `formatCheckResult()` renders new header. `findingId` changes → doctor `--fix` routing changes (but check 4 is `manual-only`, so no `--fix` path exists; no regression).
3. **`validateEnvTokensResolved()` error**: second line of error message changes from `Declared parameters for selected overlays:` to `Resolved parameters:`.

### 5. Invariants that remain true

- `missingRequired` is still only populated for keys in `declared` with no default and no supplied value. Ad-hoc keys never appear in `missingRequired`.
- `unknownSupplied` is still populated. Doctor check 4 still fires for ad-hoc keys. Stale-key detection is preserved.
- `sensitive:` redaction still applies only to keys where `declared[key]?.sensitive === true`. Ad-hoc keys are never in `declared`, so they are never redacted. This is invariant, not a bug.
- `substituteParameters()`, `substituteParametersInObject()`, `substituteProjectEnvTokens()` — none of these change. They operate on `resolvedParams` (values map); the fix just makes that map more complete.
- Doctor checks 2a, 2b, 5 — unaffected. Check 5 calls `resolveParameters()` and reads `missingRequired`, which is unchanged.

### 6. Call-site audit (all callers of `resolveParameters()`)

**`tool/questionnaire/composer.ts`** — `composeDevContainer()` (line 2738):
- Reads `values` (renamed `resolvedParams`) → used for substitution. **Benefits from fix.** No other change needed for resolution itself.
- Reads `unknownSupplied` → currently drives a `console.warn`. **Must change to `console.log` with new format and display split (Slice 2).**

**`tool/commands/doctor.ts`** — `checkParameters()` (line 1404):
- Reads `missingRequired` from `resolveParameters(declared, suppliedParams)`. **Unaffected by fix** (missingRequired logic unchanged).
- `unknownKeys` is computed independently at line 1389 by filtering `suppliedParams` against `declared` — does NOT use the return value of `resolveParameters()`. **Unaffected by fix.**
- A second call at line 1483: `const { values } = resolveParameters(declared, suppliedParams)` — used for check 2b (sensitive value in generated env). After the fix, `values` includes ad-hoc keys. Ad-hoc keys are not in `declared`, so `declared[key]?.sensitive` is `undefined`/falsy, and check 2b never fires for them. **Correct by design.**

**No other callers found.**

### 7. Failure modes and regressions to verify

| Failure mode | How to catch |
|---|---|
| Ad-hoc keys appear in the **overlay params** console block after Slice 1 (display bug) | Slice 2 filter by `overlayKeys`; QA-026-2; Acceptance Criterion 4 |
| `redactSensitiveValues()` called with ad-hoc keys now in `resolvedParams` — causes key error | `redactSensitiveValues()` uses `declared[key]?.sensitive` with optional chaining; undefined = falsy = no redaction. Safe. |
| Doctor check 5 (`missingRequired`) spuriously fails for ad-hoc keys | `missingRequired` loop only iterates `declared` keys. Ad-hoc keys never enter the loop. Safe. |
| `validateEnvTokensResolved()` `(none)` fallback lost in Slice 3 | The `|| '(none)'` is on the same line as `Object.keys(resolvedParams).join(', ')`. Slice 3 only changes the label string, not that expression. Verify the fallback is present after edit. |
| Existing `overlay-parameters.test.ts` test: `'reports unknown supplied parameters as warnings'` — still expects `unknownSupplied` to contain `UNKNOWN_PARAM` but now also `values.UNKNOWN_PARAM` must exist | Extend the test to assert both invariants. |
| `commands.test.ts` line 1492: `expect(output).toContain('Unknown parameters in project file')` — will fail after Slice 4 | Update assertion to new `name` string (Slice 5). |

### 8. Test plan (concrete)

#### Unit tests — `tool/__tests__/overlay-parameters.test.ts`

Add to `describe('resolveParameters')` block:

```typescript
it('includes ad-hoc supplied keys in values', () => {
    const { values, unknownSupplied } = resolveParameters({}, { API_PORT: '8088' });
    expect(values.API_PORT).toBe('8088');  // NEW: ad-hoc key in values
    expect(unknownSupplied).toContain('API_PORT');  // still in unknownSupplied
});

it('ad-hoc keys coexist with overlay-declared keys', () => {
    const declared = {
        POSTGRES_PORT: { description: 'port', default: '5432', overlayId: 'postgres' },
    };
    const { values, unknownSupplied } = resolveParameters(declared, {
        POSTGRES_PORT: '5433',
        API_PORT: '8088',
    });
    expect(values.POSTGRES_PORT).toBe('5433');  // overlay param resolved
    expect(values.API_PORT).toBe('8088');         // ad-hoc param resolved
    expect(unknownSupplied).toEqual(['API_PORT']); // only ad-hoc in unknownSupplied
});
````

Update `it('reports unknown supplied parameters as warnings')`:  
Add `expect(values['UNKNOWN_PARAM']).toBe('y')` alongside the existing `unknownSupplied` assertion.

Add to `describe('validateEnvTokensResolved')`:

```typescript
it('error says "Resolved parameters" not "Declared parameters"', () => {
    expect(() =>
        validateEnvTokensResolved({ FOO: { value: '{{cs.MISSING}}' } }, { API_PORT: '8088' })
    ).toThrow(/Resolved parameters: API_PORT/);
    expect(() =>
        validateEnvTokensResolved({ FOO: { value: '{{cs.MISSING}}' } }, { API_PORT: '8088' })
    ).not.toThrow(/Declared parameters for selected overlays/);
});

it('falls back to (none) when resolved map is empty', () => {
    expect(() => validateEnvTokensResolved({ FOO: { value: '{{cs.MISSING}}' } }, {})).toThrow(
        /Resolved parameters: \(none\)/
    );
});
```

#### Unit tests — `tool/__tests__/doctor-checks.test.ts`

Add to the `checkParameters` suite (or create one if absent — the existing file calls `checkParameters` indirectly via `doctorCommand`):

```typescript
it('check 4 name is "Project-only parameters ..."', () => {
    // uses STALE_KEY_FROM_REMOVED_OVERLAY fixture already in commands.test.ts
    // replicate as direct checkParameters unit test
});

it('check 4 details[2] contains actual key names not example placeholders', () => {
    // supply { MY_CUSTOM_KEY: 'foo' } with no declaring overlay
    // assert details[2] contains 'MY_CUSTOM_KEY'
});

it('check 4 findingId is "project-only-parameters"', () => { ... });
```

#### Integration test — `tool/__tests__/commands.test.ts`

- Line 1492: change `'Unknown parameters in project file'` → `'Project-only parameters (not declared by any selected overlay)'`.
- Add new `it` block: ad-hoc parameter resolves in regen output (use `composeDevContainer()` directly with a tmp directory, assert generated `devcontainer.json` has no `{{cs.*}}` tokens and `VITE_API_URL` resolves correctly).

### 9. Implementation order (developer sequence)

Slices must be done **in order** because each slice's change is observable in subsequent tests.

| #   | Slice           | File(s)                                                                                             | Key change                                                                                                                                | Unlock                                                         |
| --- | --------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | Core fix        | `tool/utils/parameters.ts`                                                                          | Add 3-line loop after `unknownSupplied` filter to add ad-hoc keys into `values`                                                           | All downstream fixes can now use the full `resolvedParams` map |
| 2   | Console display | `tool/questionnaire/composer.ts`                                                                    | Replace `console.warn` block AND overlay-params display loop together (as one atomic edit)                                                | Prevents display-split regression from Slice 1                 |
| 3   | Error message   | `tool/utils/parameters.ts`                                                                          | Change `'Declared parameters for selected overlays:'` → `'Resolved parameters:'` in `validateEnvTokensResolved()`                         | String-only                                                    |
| 4   | Doctor check 4  | `tool/commands/doctor.ts`                                                                           | Change `name`, add `findingId: 'project-only-parameters'`, replace `details` array                                                        | String-only                                                    |
| 5   | Tests           | `tool/__tests__/overlay-parameters.test.ts`, `commands.test.ts`, optionally `doctor-checks.test.ts` | Add new tests; update 1 broken assertion                                                                                                  | Run `npm test` — all pass                                      |
| 6   | Docs            | `docs/superposition-yml.md`                                                                         | Insert `#### Ad-hoc (project-only) parameters` subsection after line 582 (after existing `Overlay parameter values.` prose, before `---`) |                                                                |
| 7   | Changelog       | `CHANGELOG.md`                                                                                      | Add `### Fixed` and `### Changed` entries under `Unreleased`                                                                              |                                                                |
| 8   | Lint            | —                                                                                                   | `npm run lint:fix && npm run lint`                                                                                                        | CI green                                                       |

### 10. Exact code locations for developer

#### Slice 1 — `tool/utils/parameters.ts`

Insert after the existing `const unknownSupplied = ...` line (currently the last line before `return`):

```typescript
// Include ad-hoc (project-only) parameters in resolved values.
// Keys not declared by any overlay are valid user-defined parameters.
for (const key of unknownSupplied) {
    values[key] = supplied[key];
}
```

No other changes to this function.

#### Slice 2 — `tool/questionnaire/composer.ts` (lines ~2748–2769)

Replace the block from `if (unknownSupplied.length > 0)` through the end of the `if (hasResolvedParams)` block (inclusive) with:

```typescript
const overlayKeys = Object.keys(declaredParams);
if (overlayKeys.length > 0) {
    const displayValues = redactSensitiveValues(resolvedParams, declaredParams);
    console.log(chalk.dim(`   ⚙️  Overlay parameters:`));
    for (const key of overlayKeys) {
        if (key in displayValues) {
            console.log(chalk.dim(`      ${key}=${displayValues[key]}`));
        }
    }
}

if (unknownSupplied.length > 0) {
    console.log(
        chalk.dim(`   ⚙️  Project-only parameters (not declared by any selected overlay):`)
    );
    for (const key of unknownSupplied) {
        console.log(chalk.dim(`      ${key}=${resolvedParams[key]}`));
    }
}
```

The `const hasResolvedParams` variable is removed (no other usages).

#### Slice 3 — `tool/utils/parameters.ts` `validateEnvTokensResolved()`

Change the error string (one substring replacement):

```typescript
// BEFORE:
`Declared parameters for selected overlays: ${declaredKeys}\n`
// AFTER:
`Resolved parameters: ${declaredKeys}\n`;
```

Verify `|| '(none)'` fallback is still on the `declaredKeys` assignment line.

#### Slice 4 — `tool/commands/doctor.ts` lines ~1392–1402

Replace the `results.push({...})` for check 4:

```typescript
results.push({
    name: 'Project-only parameters (not declared by any selected overlay)',
    findingId: 'project-only-parameters',
    status: 'warn',
    message: `parameters: contains ${unknownKeys.length} key(s) not declared by any selected overlay: ${unknownKeys.join(', ')}`,
    details: [
        'These parameters are resolved and available for {{cs.KEY}} substitution',
        'If a key was added by mistake or is left over from a removed overlay, remove it from parameters:',
        `If intentional (e.g. ${unknownKeys.slice(0, 2).join(', ')}), no action needed`,
    ],
    fixEligibility: 'manual-only',
});
```

### 11. No ADR required

Change is additive (Slice 1: 3 lines) with cascading text changes. Architecture Decision Impact (above §) is confirmed correct: no new interfaces, no structural change, no ADR needed. Aligned with existing spec 011 (`resolveParameters` contract) and spec 025 (`validateEnvTokensResolved` ownership).

---

## Implementation Notes

**Implemented**: 2026-06-03

### Changes made

| File                                        | Change                                                                                                                                                                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tool/utils/parameters.ts`                  | `resolveParameters()` — added 3-line loop after `unknownSupplied` filter to include ad-hoc keys in `values`; `validateEnvTokensResolved()` — changed "Declared parameters for selected overlays:" → "Resolved parameters:" |
| `tool/questionnaire/composer.ts`            | Replaced `console.warn` yellow block + overlay-params display loop with split display: `overlayKeys`-filtered overlay block + `unknownSupplied` project-only block                                                         |
| `tool/commands/doctor.ts`                   | Check 4 — renamed `name`, added `findingId: 'project-only-parameters'`, replaced `details` array                                                                                                                           |
| `tool/__tests__/overlay-parameters.test.ts` | Added 3 new `resolveParameters` tests (ad-hoc resolution), 2 new `validateEnvTokensResolved` tests (error wording + `(none)` fallback), updated existing `unknownSupplied` test to assert `values['UNKNOWN_PARAM']`        |
| `tool/__tests__/commands.test.ts`           | Updated check 4 assertion text; added `describe("Ad-hoc project parameter console output (AC4)")` integration test block (AC4)                                                                                             |
| `tool/__tests__/project-env.test.ts`        | Added end-to-end integration test for AC1: ad-hoc params resolve through `composeDevContainer` into `devcontainer.json remoteEnv`                                                                                          |
| `docs/superposition-yml.md`                 | Inserted `#### Ad-hoc (project-only) parameters` subsection                                                                                                                                                                |
| `CHANGELOG.md`                              | Added `### Fixed` and `### Changed` entries under `Unreleased`                                                                                                                                                             |

### Acceptance criteria met

All 10 acceptance criteria met. Post-QA fixes: AC1 and AC4 integration tests added (see QA Feedback). `npm test` → 633 passed, 0 failed. `npm run lint` → clean.

### Note on `hasResolvedParams`

The spec's "Change B — Remove the now-dead `const hasResolvedParams` variable" was incorrect: the variable is still used at 4 later call sites in `composer.ts` (docker-compose substitution, devcontainer.json substitution, .env.example substitution, env.local.example substitution). It was retained. After Slice 1, `hasResolvedParams` is `true` whenever any supplied parameter exists (overlay or ad-hoc), which is correct for all substitution call sites.

---

## QA Feedback

**QA Status**: Needs Fixes — route to **Developer**

### Must-fix

**[1] Missing integration test for AC1** (`project-env.test.ts`) — **Done**

Added `'resolves ad-hoc project-only parameters (API_PORT/WEB_DEV_PORT) in env: values end-to-end (AC1)'`
in `tool/__tests__/project-env.test.ts` inside the "Parameter token substitution in env: values" describe block.
Verifies `composeDevContainer()` → `resolveParameters()` → `substituteParametersInObject()` path:
asserts `devcontainer.json remoteEnv.VITE_API_URL === 'http://localhost:8088'`,
`API_PORT === '8088'`, `WEB_DEV_PORT === '5173'`, and no `{{cs.*}}` tokens in generated output.

**[2] Missing regen console-split integration test for AC4** (`commands.test.ts`) — **Done**

Added new `describe('Ad-hoc project parameter console output (AC4)')` block at end of
`tool/__tests__/commands.test.ts` with test `'shows project-only parameters in separate block,
not in overlay block, no unknown warning (AC4)'`. Asserts:

- Output does NOT contain `"Unknown overlay parameters"`
- Output contains `"⚙️  Project-only parameters (not declared by any selected overlay):"`
- Contains `"      API_PORT=8088"` and `"      WEB_DEV_PORT=5173"` (6-space indent, per-line)
- `API_PORT`/`WEB_DEV_PORT` absent from the overlay parameters block
- Overlay block contains `POSTGRES_DB=myapp`

### Not a defect

`hasResolvedParams` retention is correct — spec was wrong that it would be "dead". No change needed.
