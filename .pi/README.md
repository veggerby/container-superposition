# Project Pi Resources

Pi auto-discovers this directory when started from the repository root.

- `settings.json` enables project skill commands.
- `agents/*.md` defines project-local role subagents (`overlay-writer`, `overlay-reviewer`, `overlay-consistency`, `overlay-architect`).
- `prompts/*.md` provides workflow slash-command prompt templates such as `/overlay-review`, `/overlay-audit`, `/overlay-discover`, and `/overlay-write-loop`.
- `skills/*/SKILL.md` provides on-demand domain guidance. Current skills:
    - `/skill:overlay-development`
    - `/skill:overlay-solution-discovery`

After editing these files in a running Pi session, use `/reload`.
