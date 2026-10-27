# Project Pi Resources

After project trust is granted, `.pi/settings.json` loads the local repository root as a Pi package with `"packages": [".."]`. Its root `package.json` exports `/project-config` and `/skill:project-config-authoring` from the canonical `plugins/project-config/commands/` and `plugins/project-config/skills/` directories. They are not duplicated under `.pi/`.

From another project, `pi install git:github.com/veggerby/container-superposition` installs the same two resources. The package does not export the repository-maintainer resources listed below and is not a Pi gallery listing.

## Repository-maintainer resources

Pi auto-discovers these local resources when started from the repository root:

- `settings.json` enables skill commands and declares the local root package.
- `agents/*.md` defines project-local role subagents (`overlay-writer`, `overlay-reviewer`, `overlay-consistency`, `overlay-architect`).
- `prompts/*.md` provides `/overlay-review`, `/overlay-audit`, `/overlay-spec`, `/overlay-discover`, and `/overlay-write-loop`.
- `skills/*/SKILL.md` provides:
    - `/skill:canonical-docs-alignment`
    - `/skill:cli-command-delivery`
    - `/skill:dogfooding-safety`
    - `/skill:overlay-development`
    - `/skill:overlay-requirements-capture`
    - `/skill:overlay-solution-discovery`
    - `/skill:workflow-sync`

## Shared native plugin

`plugins/project-config/` owns the installable command and skill for Pi, Claude Code, Codex, Copilot CLI, and OpenCode 1. Native manifests reference these resources directly, without generated instruction copies or symlinks. See [coding harness installation](../docs/agent-installation.md). `gh skill` remains a standalone-skill fallback, not a full prompt-package installation.

After editing resources or package settings in a running Pi session, use `/reload`.
