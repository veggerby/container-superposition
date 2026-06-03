# Project Pi Resources

Pi auto-discovers this directory when started from the repository root.

- `settings.json` enables project skill commands, loads `.pi/commands`, and loads the subagent extension.
- `extensions/subagent/` registers the `subagent` tool for isolated project role agents.
- `agents/*.md` defines project-local role subagents plus overlay-focused subagents (`overlay-writer`, `overlay-reviewer`, `overlay-consistency`, `overlay-architect`).
- `prompts/*.md` provides workflow slash-command prompt templates such as `/delivery-loop`, `/overlay-review`, and `/overlay-audit`.
- `skills/*/SKILL.md` provides on-demand domain guidance. Current skill: `/skill:overlay-development`.

After editing these files in a running Pi session, use `/reload`.
