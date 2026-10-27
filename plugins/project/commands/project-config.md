---
description: Author or update Container Superposition project config from a natural-language setup request
argument-hint: '<project setup intent>'
---

Given this natural-language project setup intent:

`$ARGUMENTS`

author or update the target repository's Container Superposition project config. This prompt works without any other skill or files from its installation repository. Honor the target repository's `AGENTS.md` if present.

## CLI selection

Use the installed `cs` if available; otherwise use `npx container-superposition`. Define this function in each shell session that needs it:

```bash
cs_cli() {
  if command -v cs >/dev/null 2>&1; then
    cs "$@"
  else
    npx container-superposition "$@"
  fi
}
```

Do not silently switch versions if the selected command fails. Start with read-only `cs_cli defaults --json`; if unavailable, inspect `~/.container-superposition.yml` then `~/.superposition.yml` read-only (the first wins). Treat home defaults as bootstrap suggestions, never replay authority. Do not expose suspected secrets.

## File and schema contract

- `superposition.yml` or `.superposition.yml` is canonical shared intent. If both exist, ask which to retain; if one exists, update it; otherwise create `superposition.yml`.
- `superposition.local.yml` is optional machine-only enrichment, not for Git. `.superposition.local.yml` is unsupported; ask before migrating it. Do not edit generated `superposition.json` or `.devcontainer/`.
- A minimal shared file is `stack: plain` (or `compose`) with a flat `overlays:` list of CLI-confirmed IDs, for example `overlays: [nodejs]`. Shared keys also include `baseImage`, `env`, `ports`, `mounts`, `vscodeExtensions`, `parameters`, `outputPath`, and `devcontainerGitignore`. Local top-level keys are `$schema`, `env`, `mounts`, `shell`, `vscodeExtensions`, `customizations`, `portOffset`, and `ports`; never put stack or overlays there.
- For unfamiliar fields or nested shapes, inspect the published [shared schema](https://raw.githubusercontent.com/veggerby/container-superposition/main/tool/schema/superposition.schema.json) or [local schema](https://raw.githubusercontent.com/veggerby/container-superposition/main/tool/schema/superposition.local.schema.json). Prefer a schema matching the selected CLI version when available. If inaccessible, use only the simple shape above and existing well-formed fields, or stop rather than guessing. Do not assume the target repository's docs contain this tool's schema.

## Workflow

1. Inspect existing project and local files, preserving unrelated keys and comments. Classify requested values as shared or machine-only. Ask one focused question for material ambiguity about stack, overlays, secrets, or placement.
2. Discover live capabilities with `cs_cli list --json`, `cs_cli explain <id> --json`, and `cs_cli plan --stack <plain|compose> --overlays <ids> --json` before finalizing selection. Prefer plain unless services, overlay constraints, or accepted local/default needs require Compose. Never invent catalog facts.
3. Write only the selected shared file and optional `superposition.local.yml`. Do not generate output, mutate the Git index, or overwrite unrelated files.
4. Run a read-only post-write preview with `cs_cli plan` for the selected stack and overlays. `plan` validates a selection, not the full YAML; check authored fields against the schemas when available. If generated output already exists and health evidence is useful, `cs_cli doctor --from-project` is an additional read-only check (never use `--fix`). Report what was not validated. Do not run `init` or `regen` merely to validate this authoring task.

## Result

Report changed files, assumptions/questions, stack and overlay rationale with CLI evidence, treatment of home defaults, post-write commands and exit statuses, and any unverified schema fields or blockers.
