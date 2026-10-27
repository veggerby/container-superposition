# Project-config authoring in coding harnesses

Install the same project-config workflow in Pi, Claude Code, or Codex. It authors the target repository's `superposition.yml` (or `.superposition.yml`) and optional machine-only `superposition.local.yml`. It does not generate `.devcontainer/` output or edit the generated `superposition.json` receipt.

## Prerequisites and trust

- Node.js 20+ and a shell with either an installed `cs` command or `npx` available. The workflow uses `cs` when present, otherwise `npx container-superposition`; the latter can download and execute the npm package.
- Permission to inspect project files, run read-only CLI discovery/preview commands, and edit the requested project configuration. Normal harness approval controls still apply.
- Review this Git repository before installation. Instructions can cause an agent to run commands. Review and pin a Git tag or commit in your checkout for reproducible local installations; unpinned remote installs can change over time.

Only the end-user project-config prompt and authoring skill are exported. Overlay authoring agents and contributor skills stay repository-local. Installation does not install the Container Superposition CLI or grant permission to generate output. No official third-party directory listing or approval is implied.

## Claude Code marketplace

Run inside Claude Code:

```text
/plugin marketplace add veggerby/container-superposition
/plugin install container-superposition@container-superposition
```

Choose user scope for availability across projects, or project scope only when the team intends to share the plugin requirement. In the target project, invoke:

```text
/container-superposition:project-config create a Node.js devcontainer with Postgres
```

The plugin also exposes the `project-config-authoring` skill. The command and skill reference the existing `.pi/` instruction sources directly; they do not require Pi to be installed.

For a reviewed checkout, launch a test session without marketplace installation:

```bash
claude --plugin-dir /absolute/path/to/container-superposition
```

Maintainers can validate metadata with `claude plugin validate /absolute/path/to/container-superposition`. This is separate from testing installation and invocation in a target repository.

Use `/plugin` to update the marketplace and plugin or uninstall the plugin. Plugin releases must bump `.claude-plugin/plugin.json`'s version when shipped content changes; this version is independent of the CLI npm version. Removing this repository's marketplace also removes its installed plugin.

## Codex skill

Ask Codex's built-in installer to install this exact skill directory:

```text
$skill-installer install the skill at https://github.com/veggerby/container-superposition/tree/main/.pi/skills/project-config-authoring
```

This is a standalone skill install, not a Codex marketplace plugin. The installer reports its destination, commonly `$CODEX_HOME/skills/project-config-authoring`. Restart Codex if the skill does not appear.

Alternatively, copy from a reviewed checkout into Codex's user skill directory. Run from the checkout root, and do not overwrite an existing installation:

```bash
mkdir -p "$HOME/.agents/skills"
if [ -e "$HOME/.agents/skills/project-config-authoring" ] || [ -L "$HOME/.agents/skills/project-config-authoring" ]; then
  printf '%s\n' 'Skill already exists; review it before replacing.' >&2
else
  cp -R .pi/skills/project-config-authoring "$HOME/.agents/skills/project-config-authoring"
fi
```

For a repository-only install, copy the same directory to `<target-repo>/.agents/skills/project-config-authoring` instead, after checking that the destination does not exist. Only commit it if the team wants that skill shared. Install in one scope to avoid duplicate skill entries.

In the target project, invoke:

```text
$project-config-authoring create a Node.js devcontainer with Postgres
```

The skill is self-contained and does not need the Pi prompt or this repository's docs. Update by reviewing a newer Git revision and explicitly replacing only the installed skill directory. Remove only that directory to uninstall, using the destination reported by the installer or the chosen copy location.

## Pi

```bash
pi install git:github.com/veggerby/container-superposition
```

In the target project:

```text
/project-config create a Node.js devcontainer with Postgres
```

Alternatively invoke `/skill:project-config-authoring` directly. Use `pi update --extensions` to update installed packages and `pi remove git:github.com/veggerby/container-superposition` to uninstall. This remains a Git package install, not a Pi gallery listing or a separate npm package.

## Expected result

All three harnesses inspect existing configuration, discover live capabilities, prefer a plain stack unless Compose is needed, and preview the selected stack/overlays before and after writing. Personal defaults remain bootstrap suggestions, never replay authority. Secrets and machine paths do not become shared intent.

Review the reported file diff and validation results. A selection preview is not full YAML schema validation. Generating output with `init` or `regen` remains a separate explicit action.

## Maintainer source map

- `.pi/prompts/project-config.md`: self-contained command used by Pi and Claude Code.
- `.pi/skills/project-config-authoring/SKILL.md`: portable skill used by all three harnesses.
- `package.json` `pi`: explicit Pi resource allow-list.
- `.claude-plugin/plugin.json`: explicit Claude Code resource allow-list.
- `.claude-plugin/marketplace.json`: repository-hosted marketplace with one plugin.

No generated copies, symlinks, custom installer, hooks, or MCP servers are needed. Other harnesses supporting the Agent Skills format can copy the same skill directory into their documented discovery location; installation and invocation syntax remain harness-specific.
