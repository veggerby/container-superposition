# Project Pi Resources

Pi auto-discovers this directory when started from the repository root. From another project, `pi install git:github.com/veggerby/container-superposition` installs only `/project-config` and `/skill:project-config-authoring` through the root `package.json` Pi manifest. Other project-local resources remain repo-only. Git installation does not list the package in Pi's npm-backed gallery.

- `settings.json` enables project skill commands.
- `agents/*.md` defines project-local role subagents (`overlay-writer`, `overlay-reviewer`, `overlay-consistency`, `overlay-architect`).
- `prompts/*.md` provides workflow slash-command prompt templates such as `/overlay-review`, `/overlay-audit`, `/overlay-spec`, `/overlay-discover`, `/overlay-write-loop`, and `/project-config`.
- `skills/*/SKILL.md` provides on-demand domain guidance. Current skills:
    - `/skill:canonical-docs-alignment`
    - `/skill:cli-command-delivery`
    - `/skill:dogfooding-safety`
    - `/skill:overlay-development`
    - `/skill:overlay-requirements-capture`
    - `/skill:overlay-solution-discovery`
    - `/skill:project-config-authoring`
    - `/skill:workflow-sync`

After editing these files in a running Pi session, use `/reload`.
