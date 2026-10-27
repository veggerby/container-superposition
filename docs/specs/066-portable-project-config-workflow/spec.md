---
spec: '066-portable-project-config-workflow'
title: 'Portable Project Config Workflow'
status: 'Final'
review_gate: 'SELF_CHECK'
owner: 'delivery-lead'
created: '2026-10-27'
updated: '2026-10-27'
related_adrs: []
related_foundation:
    - 'docs/foundation.md'
taxonomy:
    - 'DOCS-GUIDE'
---

# Portable Project Config Workflow

## Problem

The project-config prompt and authoring skill are installable through Pi only. Users of Claude Code, Codex, OpenCode, and GitHub Copilot need the same safe natural-language authoring workflow in their own repositories without installing maintainer workflows or maintaining divergent copies.

## Why now

The user confirmed support for a Claude Code marketplace plugin and a Codex-installable skill while preserving Pi installation, then required direct installation from `https://github.com/veggerby/container-superposition` for all five harnesses, including OpenCode and GitHub Copilot. The final clarification requires native marketplaces or packages wherever supported, not skill-only installation presented as equivalent.

## Acceptance Criteria

- [ ] AC-066-01: This Git repository supplies a Claude Code marketplace with one plugin exposing the project-config command and project-config-authoring skill, not the repository's maintainer prompts, skills, or agents.
- [ ] AC-066-02: All five harnesses have documented native installation from this GitHub repository without a user-managed clone/copy: Pi Git package, Claude Code marketplace, Copilot CLI marketplace, Codex plugin marketplace, and OpenCode package plugin. Native command-capable packages include the project-config prompt as a command and the authoring skill. Where a host uses skills rather than separate prompt commands, documentation states the native invocation and limitation explicitly.
- [ ] AC-066-03: The installable prompt and authoring skill live canonically under the marketplace plugin directory's standard `commands/` and `skills/` paths. Native manifests select those same files without generated copies or symlinks. Pi installation and invocation remain compatible, and `.pi/settings.json` loads the root Pi package from the local repository rather than retaining duplicated project-config assets under `.pi/`.
- [ ] AC-066-04: All installations preserve project-file-first authority, local-only boundaries, plain-first selection, live CLI discovery, and read-only post-write verification from spec 057 without assuming harness-specific tools or source-repository files.
- [ ] AC-066-05: Documentation explains native installation, invocation, prerequisites, trust, update/removal, and scope. `gh skill` is an optional skill-only fallback, never described as a marketplace or full prompt-package install. Automated checks detect broken manifest paths, duplicate instruction assets, command/skill registration defects, and accidental maintainer-resource exports. The existing Unreleased workflow entry is consolidated rather than duplicated.

## Non-goals

- Publishing to an official third-party directory or claiming marketplace approval.
- Exporting overlay development or other contributor workflows.
- Changing CLI behavior, schemas, generation, or global-default semantics.
- Publishing a new npm package, introducing a custom installer or runtime dependency, or changing the CLI package's public entry points.
- Claiming a Copilot CLI plugin is also a native plugin for all other Copilot surfaces.
- Requiring identical slash-command syntax where a harness's native API differs.

## Ambiguities / Open Questions

None. Native package/marketplace support is primary. The user's latest direction requires the marketplace plugin directory to own the installable resources and Pi project settings to load the local repository package. Native compatibility manifests are acceptable when they let all harnesses share standard command/skill directories without copies. Skill-only installation remains optional. Supported versions and native test gaps must be stated.

## Evidence / References

- `docs/specs/057-natural-language-project-config-workflow/spec.md`
- https://code.claude.com/docs/en/plugins/manifest-reference
- https://code.claude.com/docs/en/plugin-marketplaces
- https://developers.openai.com/codex/skills/
- https://cli.github.com/manual/gh_skill_install
- https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference
- https://developers.openai.com/plugins/build/plugins
- https://opencode.ai/docs/plugins/
- https://opencode.ai/v2/docs/plugins/
- https://opencode.ai/docs/skills/
- https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-skills

## Risks / Constraints

- Harness-native installation cannot be claimed tested unless those harnesses are available. Static contract checks are not an end-to-end installation test.
- Installation must not edit the target repository, home configuration, or Git index without the user's explicit installation action.

## Notes

Requirements self-check: scope and compatibility are explicit, criteria are testable, and no CLI or architecture boundary changes are required. SELF_CHECK is proportionate for metadata and documentation packaging of existing instructions. Execution and validation evidence belong in `plan.md`. The direct-install extension was self-reviewed against the installed GitHub CLI help and successful remote installs for all five hosts before changing implementation; it requires no custom installer or new dependency. The native-package revision supersedes that skill-only completion claim. The latest relocation supersedes generated-payload packaging: one canonical native plugin tree and a small dependency-free OpenCode adapter preserve single instruction authority. Existing repository-maintainer Pi resources remain local and are not broadened into the public package.
