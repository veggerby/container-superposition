# Abbreviations and Acronyms

Maintain shared shorthand used across product, code, specs, tests, docs, and support notes.

## Confirmed or Context-Obvious

| Term   | Expansion                           | Type         | Audience | Status          | Notes / Evidence                                                                                                                    |
| ------ | ----------------------------------- | ------------ | -------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `ADR`  | Architecture Decision Record        | initialism   | internal | context-obvious | `docs/adr/README.md`, `docs/adr/adr001-project-file-first-replay-and-regeneration.md`                                               |
| `DoD`  | Definition of Done                  | initialism   | internal | confirmed       | `AGENTS.md`, `CONTRIBUTING.md`, this file set introduces `docs/definition-of-done.md`                                               |
| `ESM`  | ECMAScript Modules                  | initialism   | internal | confirmed       | `AGENTS.md` requires `.js` extensions for ESM imports                                                                               |
| `OTEL` | OpenTelemetry                       | initialism   | mixed    | confirmed       | `docs/architecture.md` references `otel-collector` as OpenTelemetry Collector; overlay and shared import paths use `otel` shorthand |
| `cs`   | `container-superposition` CLI alias | abbreviation | mixed    | confirmed       | `package.json` exposes `cs` bin alias; `README.md` uses `cs migrate`                                                                |

## Ambiguous or Unresolved

| Term | Possible Meanings | Why Ambiguous | Owner                       |
| ---- | ----------------- | ------------- | --------------------------- |
| —    | —                 | —             | _No ambiguous entries yet._ |

## Misused or Risky Shorthand

| Term   | Issue                                                                                                                                  | Recommended Fix                                                                                                                   | Evidence                                                                             |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `cs`   | Short alias may be unfamiliar to new users or absent from muscle memory when docs introduce commands without first naming the full CLI | Prefer `container-superposition` or `npx container-superposition` on first user-facing mention, then use `cs` where brevity helps | `README.md` mixes full command examples and `cs migrate`                             |
| `OTEL` | Readers may recognize `otel-collector` without knowing it expands to OpenTelemetry, especially in user-facing docs or setup guides     | Expand to `OpenTelemetry` on first use outside overlay IDs and file paths                                                         | `docs/architecture.md`, overlay names and shared import paths use the shorthand form |

## Usage Guidance

- Expand abbreviations on first use in user-facing docs unless audience clearly expects shorthand.
- Prefer one canonical expansion per term when possible.
- Use lowercase `cs` only as the CLI alias; do not rewrite it as uppercase `CS`.
- Keep overlay IDs and file paths literal (for example `otel-collector`) even when surrounding prose expands the shorthand.
- Leave de facto common terms like `RFC`, `SQL`, `ReST`, `API`, `CLI`, and `CI` out unless project meaning becomes non-standard, disputed, or likely misunderstood.
