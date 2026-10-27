# Native project-config packages for coding harnesses

Install from [veggerby/container-superposition](https://github.com/veggerby/container-superposition) using your harness's native package or marketplace mechanism. The marketplace is named `container-superposition`; its current plugin is `project`, installed as `project@container-superposition`. This domain grouping leaves room for separate future plugins, such as overlay authoring. A skill-only download is not equivalent to installing the prompt/command package.

## Installation coverage

| Harness            | Native distribution                  | Installed entry point                                                               |
| ------------------ | ------------------------------------ | ----------------------------------------------------------------------------------- |
| Pi                 | Git package                          | `/project-config` and `/skill:project-config-authoring`                             |
| Claude Code        | Repository-hosted marketplace plugin | `/project:project-config` plus authoring skill                                      |
| GitHub Copilot CLI | Repository-hosted marketplace plugin | `/project-config` plus authoring skill                                              |
| Codex              | Repository-hosted plugin marketplace | `$project-config-authoring`; native skill invocation, not a separate prompt command |
| OpenCode 1         | GitHub source-archive package plugin | `/project-config` plus authoring skill                                              |

The command-capable packages include both the project-config prompt and the authoring skill. Codex packages the full authoring workflow as a native skill; no unsupported Pi-style prompt loader or custom command is implied. Copilot CLI packaging does not imply native plugin support in every other Copilot surface.

## Prerequisites and trust

- Node.js 20+ and a shell with installed `cs` or `npx`. Authoring uses `cs` when present, otherwise `npx container-superposition`; the latter may download and execute the CLI.
- A harness version supporting the mechanisms below. Native checks used Claude Code 2.1.311, Codex 0.164.0, Copilot CLI 1.0.104, and OpenCode 1.19.4. The OpenCode adapter targets the OpenCode 1 config-hook API, not the different OpenCode 2 plugin API.
- Review this repository and normal harness permission prompts. Plugins can execute code. The OpenCode adapter registers a command and a packaged skill path in memory; it does not write project files or run shell commands at startup.
- Remote commands below use the default branch or explicit `main`. They become available after this packaging change reaches the selected revision on GitHub. Pin a reviewed tag or commit using the host's supported Git-ref mechanism for reproducibility.

Only the end-user project-config workflow is exported. Maintainer prompts, contributor skills, overlay agents, MCP servers, and lifecycle hooks are not bundled. No official directory listing or approval is claimed. Installation does not grant permission to run `init` or `regen`.

## Pi Git package

```bash
pi install git:github.com/veggerby/container-superposition
```

In your target project:

```text
/project-config create a Node.js devcontainer with Postgres
```

Alternatively invoke `/skill:project-config-authoring` directly. This installs both resources from the root `package.json` Pi manifest, which points into `plugins/project/`, not just a skill.

This repository dogfoods the same package locally through `.pi/settings.json`:

```json
{
    "packages": [".."]
}
```

Pi resolves `..` from `.pi/settings.json` to the repository root. After project trust is granted, it loads the canonical plugin skill and command through the package manifest, not duplicate files in `.pi/skills` or `.pi/prompts`. Other repository-maintainer Pi resources remain local. For a pinned install, append `@<tag-or-commit>` to the Git source.

Use `pi update --extensions` to update and `pi remove git:github.com/veggerby/container-superposition` to uninstall. Personal installs are available across projects; use Pi's `--local` installation option only when the team intends to share the requirement. This is a Git package, not a separate npm package or Pi gallery listing.

## Claude Code marketplace

Run inside Claude Code:

```text
/plugin marketplace add veggerby/container-superposition
/plugin install project@container-superposition
```

Choose user scope for personal availability or project scope to share the plugin requirement with the team. In the target project:

```text
/project:project-config create a Node.js devcontainer with Postgres
```

The plugin also exposes `project-config-authoring`. The root marketplace selects the `project` plugin at `plugins/project/`. Its `.claude-plugin/plugin.json` loads the standard `commands/` and `skills/` directories; Pi itself is not required.

Use `/plugin` to update or uninstall. For maintainer validation, run `claude plugin validate /absolute/path/to/container-superposition/plugins/project`; use `claude --plugin-dir /absolute/path/to/container-superposition/plugins/project` for a test session without marketplace installation.

## GitHub Copilot CLI marketplace

```bash
copilot plugin marketplace add veggerby/container-superposition
copilot plugin install project@container-superposition
```

In an interactive Copilot CLI session:

```text
/project-config create a Node.js devcontainer with Postgres
```

Use `/skills list` or `copilot skill list --json` to verify both `project-config-authoring` and the `project-config` command were loaded. Copilot exposes prompt commands through its skill machinery; the package still includes the separate command template, not only the authoring skill.

The catalog is `.github/plugin/marketplace.json`. It selects only the `project` plugin at `plugins/project`. Copilot's supported Claude-compatible plugin manifest loads the same `commands/` and `skills/` directories without instruction copies. Installation is personal to the active Copilot CLI configuration, not a shared project requirement.

Use `copilot plugin marketplace update container-superposition` and `copilot plugin update project` to refresh; use `copilot plugin uninstall project` to remove the plugin. Remove the marketplace afterward with `copilot plugin marketplace remove container-superposition`. A marketplace Git ref can be selected with `veggerby/container-superposition#<ref>`.

## Codex plugin marketplace

```bash
codex plugin marketplace add veggerby/container-superposition
codex plugin add project@container-superposition
```

In the target project:

```text
$project-config-authoring create a Node.js devcontainer with Postgres
```

This is a native plugin installation, not `$skill-installer` or `gh skill`. The `.agents/plugins/marketplace.json` catalog points to the same plugin directory used by Claude Code and Copilot. The supported `.codex-plugin/plugin.json` compatibility manifest selects `skills/project-config-authoring/SKILL.md`; the separate `commands/` prompt is not a Codex command.

Use `codex plugin list --json` to inspect availability and enabled state. Use `codex plugin marketplace upgrade container-superposition`, then `codex plugin add project@container-superposition` to refresh the installed package. Use `codex plugin remove project@container-superposition` to uninstall, then `codex plugin marketplace remove container-superposition` if no longer needed. Check `codex plugin --help` on older clients: some surfaces expose installation through their Plugins UI instead.

Marketplace registration and installation use the active `CODEX_HOME` or personal Codex configuration. Pin the marketplace with `codex plugin marketplace add veggerby/container-superposition --ref <tag-or-commit>` when needed. Project enablement is separate and subject to repository trust; do not silently edit a team's `.codex/config.toml`.

## OpenCode native package from GitHub

For OpenCode 1.19.4's package installer, run from the target project:

```bash
opencode plugin 'https://github.com/veggerby/container-superposition/archive/refs/heads/main.tar.gz'
```

This uses OpenCode's own package installer and updates the project's OpenCode config. Add `--global` only for personal installation across projects. No user-managed clone or manual resource copy is needed.

Equivalently, merge this entry into the existing `plugin` array in `opencode.json` rather than replacing unrelated settings:

```json
{
    "$schema": "https://opencode.ai/config.json",
    "plugin": ["https://github.com/veggerby/container-superposition/archive/refs/heads/main.tar.gz"]
}
```

The repository package exports `./server` for OpenCode while retaining the existing CLI entry point and binaries. OpenCode installs the source archive as a package, loads that server export, and registers the bundled command and skill. No separate npm publication is required. The archive avoids Git dependency preparation, which failed for this CLI repository's build-bearing root package in the tested OpenCode 1 installer. Git subdirectory selectors also did not select the nested package correctly; neither route is documented as a working install.

In the target project:

```text
/project-config create a Node.js devcontainer with Postgres
```

Check `opencode debug config` for `command.project-config` and `opencode debug skill` for `project-config-authoring`. An existing command with the same name causes a clear conflict rather than silently overwriting it.

To pin, use `https://github.com/veggerby/container-superposition/archive/<commit-sha>.tar.gz` instead of the branch archive. To update, use the installer with the reviewed new ref; it prompts for replacement or supports `--force` after review. To remove, delete only this package's entry from the applicable OpenCode config and restart. The adapter does not leave skill or command files in the target project. OpenCode 2 uses a different plugin API and is not claimed compatible with this adapter.

## Existing installations after the rename

The earlier plugin ID was `container-superposition@container-superposition`. Remove that old plugin using the harness's plugin UI or uninstall command, retain the `container-superposition` marketplace, and install `project@container-superposition`. Claude's command changes from `/container-superposition:project-config` to `/project:project-config`. Pi, Copilot, OpenCode command names and the authoring skill name are unchanged. Do not leave both plugin identities enabled, which can duplicate the skill.

## Optional skill-only installation

Use this only when the standalone authoring skill is wanted, not a native prompt/command package. A recent [GitHub CLI](https://cli.github.com/manual/gh_skill_install) provides this public-preview installer; commands were checked with 2.103.0.

Preview before installation:

```bash
gh skill preview veggerby/container-superposition plugins/project/skills/project-config-authoring@main
```

Choose one host:

```bash
gh skill install veggerby/container-superposition plugins/project/skills/project-config-authoring@main --agent pi --scope project
gh skill install veggerby/container-superposition plugins/project/skills/project-config-authoring@main --agent claude-code --scope project
gh skill install veggerby/container-superposition plugins/project/skills/project-config-authoring@main --agent codex --scope project
gh skill install veggerby/container-superposition plugins/project/skills/project-config-authoring@main --agent opencode --scope project
gh skill install veggerby/container-superposition plugins/project/skills/project-config-authoring@main --agent github-copilot --scope project
```

The exact source path selects only the end-user skill. Do not use `--all`. `@main` avoids an older release tag without the skill; replace it with a reviewed SHA to pin. Use `--scope user` for personal installation. Codex, OpenCode, and Copilot share `.agents/skills` at project scope, so install once rather than creating duplicate entries.

Invoke the skill explicitly using your harness's skill selector or ask it to use `project-config-authoring`. This does **not** install `/project-config`. Avoid duplicate standalone and plugin-installed skills in the same scope. Use `gh skill list`, `gh skill update project-config-authoring`, and remove only the reported skill directory to uninstall.

Codex's built-in standalone installer also accepts:

```text
$skill-installer install the skill at https://github.com/veggerby/container-superposition/tree/main/plugins/project/skills/project-config-authoring
```

## Maintainer sources and validation

All public resources live in the plugin itself:

```text
plugins/project/
  .claude-plugin/plugin.json
  .codex-plugin/plugin.json
  commands/project-config.md
  skills/project-config-authoring/SKILL.md
  opencode.js
```

- Edit `commands/project-config.md` and `skills/project-config-authoring/SKILL.md` here. There are no generated instruction copies, symlinks, or synchronization scripts.
- All three root marketplace catalogs select this plugin directory. Claude Code and Copilot use its Claude-compatible manifest; Codex uses its supported compatibility manifest.
- Root `package.json` points Pi at these same files; `.pi/settings.json` selects that root package locally. Repository-maintainer resources stay under `.pi/` and are not exported.
- Root `package.json` exports the dependency-free OpenCode adapter and includes the plugin directory in packaged files.
- Bump both plugin manifest versions together when shipped instructions change. These versions are independent of the CLI's npm version.

Native installation and discovery checks must use this exact plugin layout, not an earlier generated-payload fixture. Unit tests enforce manifest paths, local Pi package selection, absence of duplicate source files, and isolated OpenCode loading. These are installation/discovery checks, not model-driven authoring tests. Installing the unpublished candidate directly from GitHub cannot be verified until it reaches the selected remote revision.

## Expected result

The workflow edits only the target repository's canonical `superposition.yml` or `.superposition.yml` and optional machine-only `superposition.local.yml`. It inspects current files, discovers live capabilities, prefers plain unless Compose is needed, and previews selections before and after writing. Home defaults remain bootstrap suggestions, not replay authority.

Review the reported diff and validation evidence. A selection preview is not full YAML schema validation. Generating `.devcontainer/` output with `init` or `regen` remains a separate explicit action.
