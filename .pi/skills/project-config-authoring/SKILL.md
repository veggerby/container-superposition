---
name: project-config-authoring
description: Author or update Container Superposition project config files from natural-language setup requests while preserving project-file-first authority, local-only boundaries, live CLI discovery, and safe verification.
---

# Project Config Authoring

Use this skill when a user asks in natural language to create or update a Container Superposition project setup, for example:

- "create container superposition project that supports nodejs"
- "add Postgres to this devcontainer setup"
- "make this repo use my local shell aliases without committing them"
- "configure a plain Python devcontainer"

## Invariants

- `superposition.yml` or `.superposition.yml` is the canonical shared project intent.
- `superposition.local.yml` is optional machine-local enrichment only.
- `.superposition.local.yml` is unsupported; do not create it.
- `superposition.json` and `.devcontainer/` are generated outputs, not authoring targets for this workflow.
- Home-directory defaults are bootstrap suggestions only. They are never replay, `plan`, `regen`, or `doctor` authority.
- Prefer `stack: plain`; choose `stack: compose` only when requested capabilities, selected overlays, services, ports/env-file behavior, or an explicitly accepted local/default need materially requires Compose.

## Read first

1. `AGENTS.md`
2. `docs/foundation.md`
3. `docs/adr/adr001-project-file-first-replay-and-regeneration.md`
4. `docs/superposition-yml.md`
5. `npm run --silent init -- defaults --json` for read-only effective global-default inspection
6. repository-root config candidates: `superposition.yml`, `.superposition.yml`, `superposition.local.yml`, `.superposition.local.yml`, `superposition.json`, and `.devcontainer/` only to understand current state
7. live CLI discovery/help for the requested capability

## Required workflow

### 1. Inspect existing project files before writing

- If both `superposition.yml` and `.superposition.yml` exist, stop and ask which shared config should remain; do not create or update a third file.
- If exactly one supported shared config exists, update that file.
- If neither exists, create `superposition.yml`.
- If `superposition.local.yml` exists, preserve it and update it only for clearly local-only requested changes.
- If `.superposition.local.yml` exists, report that it is unsupported and ask before migrating or replacing it.
- Preserve unrelated keys and comments where practical. Never silently overwrite unrelated repository state.

### 2. Classify the user's intent

Separate requested values into:

- **shared intent** for the team: stack, base image, overlays, project ports, shared env, devcontainer gitignore preference, VS Code extensions intended for everyone, and project-level customizations.
- **local-only enrichment**: machine paths, personal shell aliases/snippets, personal editor extensions, credentials, tokens, local port conflict overrides, and host-specific mounts.
- **unknown or risky intent**: ambiguous overlay choices, secrets in shared config, destructive rewrites, or stack changes that alter generated output materially.

Ask one focused question at a time only when the answer changes shared intent, local-vs-shared placement, secret handling, overlay/preset choice, or stack. Otherwise choose conservative defaults and record them in the handoff.

### 3. Discover capabilities through the CLI

Use live, read-only CLI surfaces before finalizing YAML. Start every workflow with:

```bash
npm run --silent init -- defaults --json
```

Then prefer commands such as:

```bash
npm run init -- list --json
npm run init -- list --supports plain --json
npm run init -- list --supports compose --json
npm run init -- explain <overlay-or-preset> --json
npm run init -- plan --stack <plain|compose> --overlays <comma-separated-ids> --json
npm run init -- plan --stack <plain|compose> --overlays <comma-separated-ids> --verbose
```

If a command is unavailable or fails, do not invent catalog facts. Record the failure, use checked documentation only where sufficient, or stop when the selection cannot be validated.

### 4. Apply the plain-first stack rule

Default to `stack: plain` for requests like "supports nodejs" when the requested capability can be provided without long-lived services.

Escalate to `stack: compose` only when at least one reason is true:

- the user asked for a service topology, such as a database, queue, object store, or multi-container system;
- a selected overlay supports only Compose;
- generated compose env files or compose volumes/networks are materially required;
- local/default template behavior materially depends on Compose and the user accepts that tradeoff;
- CLI `plan`/`explain` evidence shows the requested selection cannot work on plain.

Include the stack rationale in the handoff.

### 5. Account for global defaults without making them authority

Inspect supported home files through the CLI first:

```bash
npm run --silent init -- defaults --json
```

The command reports the selected source, ignored lower-precedence source, and normalized effective document without writing files. If the command is unavailable, fall back to direct read-only inspection of:

1. `~/.container-superposition.yml`
2. `~/.superposition.yml`

Current precedence: `~/.container-superposition.yml` wins when both exist. Supported top-level keys are `$schema`, `initDefaults`, and `localConfigTemplate`.

- Treat `initDefaults` as optional seeds for fresh `init` authoring only.
- Treat `localConfigTemplate` as optional input for a first `superposition.local.yml` only.
- Do not merge hidden home state into an existing project unless the user explicitly accepts the values or the request clearly asks for them.
- Copy only accepted or clearly intended defaults into `superposition.yml` or `superposition.local.yml` so future replay remains repository-root-authoritative.
- Never repeat suspected credentials from `defaults --json` in summaries, read them aloud, or place them in shared config; prefer environment references or local-only config and ask when uncertain.

### 6. Write the narrowest safe diff

- Update only the selected shared project file and, when needed, `superposition.local.yml`.
- Do not edit CLI code, schemas, overlays, `.devcontainer/`, `superposition.json`, generated docs, or the Git index.
- Keep `$schema` fields when present; add them when creating new files if useful for editor/schema validation.
- Show or summarize the resulting diff before handoff.

### 7. Verify after writing

Run a read-only preview after writing using the stack and overlay selection from the edited project file, for example:

```bash
npm run init -- plan --stack <plain|compose> --overlays <comma-separated-ids> --json
```

Use `--verbose` or `--diff` when it adds useful evidence. If no overlays are selected, use CLI help/schema checks plus `doctor --from-project` when applicable rather than inventing a no-overlay `plan` invocation. Use:

```bash
npm run init -- doctor --from-project
```

only when generated output already exists and health/reproducibility evidence is relevant. Do not generate `.devcontainer/` merely to validate this authoring workflow.

## Stop conditions

Stop and ask or escalate when:

- both supported shared config files exist;
- existing config is malformed or cannot be preserved confidently;
- a material shared/local, overlay/preset, stack, or secret-handling choice remains ambiguous;
- CLI discovery or preview rejects the proposed selection;
- satisfying the request requires a new schema field, overlay, preset, CLI behavior, global-default precedence change, generated-output edit, or home-state replay authority;
- the workflow would overwrite unrelated files, mutate the Git index, or expose credentials in shared config.

## Output contract

Report:

- files changed;
- assumptions made and any focused questions asked;
- selected shared config file and whether `superposition.local.yml` changed;
- stack choice and plain-vs-compose rationale;
- overlays/presets selected with CLI discovery evidence;
- global defaults considered and how they were treated;
- post-write validation commands with exit statuses;
- residual risks or stop conditions.

## Related skills

- `/skill:workflow-sync` when changing Pi assets, changelog, spec, or inventory files.
- `/skill:canonical-docs-alignment` when broader user/contributor docs must be aligned.
