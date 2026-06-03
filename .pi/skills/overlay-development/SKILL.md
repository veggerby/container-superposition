---
name: overlay-development
description: Container-superposition overlay development guidance. Use when creating, modifying, reviewing, auditing, or refactoring overlays under overlays/**.
---

# Overlay Development

Use this skill for overlay work in container-superposition. Prefer project subagents for large tasks:

- `overlay-writer` — create or modify overlays
- `overlay-reviewer` — review one overlay
- `overlay-consistency` — audit all overlays for cross-cutting correctness
- `overlay-architect` — find shared abstractions, duplicate patterns, presets, and registry design improvements

## Scope

Focus edits on:

- `overlays/**`
- `docs/overlays.md` after `npm run docs:generate`
- `tool/schema/superposition.schema.json` after `npm run schema:generate`
- `tool/schema/types.ts` and `tool/questionnaire/composer.ts` only when adding/changing overlay categories or selection types
- `CHANGELOG.md` for user-visible overlay changes

Report before unrelated edits.

## Required overlay files

Every overlay needs:

- `overlays/<id>/overlay.yml`
- `overlays/<id>/devcontainer.patch.json`
- `overlays/<id>/README.md`

Compose overlays also need:

- `overlays/<id>/docker-compose.yml`
- `.env.example` when parameters are declared
- optional `setup.sh` / `verify.sh`

## Manifest rules

- `id` exactly matches directory name; kebab-case
- `name` is human-readable display case; tech names/acronyms/lowercase brands allowed
- `description` one line, no trailing period
- `category`: `language`, `database`, `observability`, `cloud`, `dev`, or `preset`
- `supports: [compose]` iff `docker-compose.yml` exists; otherwise `supports: []`
- `requires`, `suggests`, `conflicts` reference existing overlay IDs
- `conflicts` are bidirectional
- tags are lowercase kebab-case
- parameter names are SCREAMING_SNAKE_CASE
- sensitive params include `sensitive: true` only for passwords, secrets, tokens, API/access/private keys, credentials; do not flag product-name `KEY` substrings like `KEYCLOAK_VERSION`

## Devcontainer patch rules

- Valid JSON with devcontainer `$schema`
- Parameterized values use `{{cs.PARAM_NAME}}`
- `runServices` matches compose service names
- `forwardPorts` and `portsAttributes` match exposed ports
- Compose overlays set `_serviceOrder`:
    - `0` infrastructure
    - `1` observability
    - `2` middleware
    - `3` UI

## Docker Compose rules

- Never use `external: true`
- Declare network inline:

```yaml
networks:
    devnet:
        name: devnet
```

- All services use `networks: [devnet]` or equivalent `networks: [devnet]` YAML list
- Ports use `'${PORT:-{{cs.PORT}}}:<internal>'`
- Environment uses `${VAR:-{{cs.VAR}}}`
- Databases and critical services have healthchecks
- Persistent data uses named volumes, declared top-level

## Consistency audit rules

When scanning all overlays:

- Skip dot-prefixed support dirs: `.shared/`, `.presets/`, `.registry/`, etc.
- Real overlay dirs must contain `overlay.yml`
- Check bidirectional conflicts and reference integrity
- Check port collisions among non-conflicting overlays
- Check compose network rules
- Check supports/compose alignment
- Check parameter substitution across patch, compose, and `.env.example`
- Check type registration in `tool/schema/types.ts`
- Check docs freshness with `npm run docs:generate`

## Validation

After overlay changes:

```bash
npm run lint:fix
npm run lint
npm test
npm run docs:generate
npm run schema:generate # if overlays or selection types changed
npm run init -- regen # if generated output changes
npm run init -- doctor
```

No reproducibility errors before merge.
