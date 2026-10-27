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

The user confirmed support for a Claude Code marketplace plugin and a Codex-installable skill while preserving Pi installation, then required direct installation from `https://github.com/veggerby/container-superposition` for all five harnesses, including OpenCode and GitHub Copilot.

## Acceptance Criteria

- [ ] AC-066-01: This Git repository supplies a Claude Code marketplace with one plugin exposing the project-config command and project-config-authoring skill, not the repository's maintainer prompts, skills, or agents.
- [ ] AC-066-02: Pi, Claude Code, Codex, OpenCode, and GitHub Copilot users can install the self-contained project-config-authoring skill directly from this GitHub repository with documented host-specific commands, without a manual clone or copy. Documentation distinguishes skill installation from prompt/marketplace installation and explains invocation.
- [ ] AC-066-03: Pi installation and invocation remain compatible. Harnesses reuse the existing prompt/skill source without copied or generated instruction bodies.
- [ ] AC-066-04: All installations preserve project-file-first authority, local-only boundaries, plain-first selection, live CLI discovery, and read-only post-write verification from spec 057 without assuming harness-specific tools or source-repository files.
- [ ] AC-066-05: Documentation explains installation, invocation, prerequisites, trust, update/removal, and installation scope. Automated checks detect broken manifest paths or accidental maintainer-resource exports. The existing Unreleased workflow entry is consolidated rather than duplicated.

## Non-goals

- Publishing to an official third-party directory or claiming marketplace approval.
- Exporting overlay development or other contributor workflows.
- Changing CLI behavior, schemas, generation, or global-default semantics.
- Adding a separate npm package, custom installer, runtime dependency, or Codex plugin marketplace.

## Ambiguities / Open Questions

None. All five harnesses use GitHub CLI's existing direct skill installation surface. Pi's prompt package, Claude Code's repository-hosted marketplace, and Codex's built-in skill installer remain available as alternatives.

## Evidence / References

- `docs/specs/057-natural-language-project-config-workflow/spec.md`
- https://code.claude.com/docs/en/plugins/manifest-reference
- https://code.claude.com/docs/en/plugin-marketplaces
- https://developers.openai.com/codex/skills/
- https://cli.github.com/manual/gh_skill_install
- https://opencode.ai/docs/skills/
- https://docs.github.com/en/copilot/how-tos/use-copilot-agents/coding-agent/create-skills

## Risks / Constraints

- Harness-native installation cannot be claimed tested unless those harnesses are available. Static contract checks are not an end-to-end installation test.
- Installation must not edit the target repository, home configuration, or Git index without the user's explicit installation action.

## Notes

Requirements self-check: scope and compatibility are explicit, criteria are testable, and no CLI or architecture boundary changes are required. SELF_CHECK is proportionate for metadata and documentation packaging of existing instructions. Execution and validation evidence belong in `plan.md`. The direct-install extension was self-reviewed against the installed GitHub CLI help and successful remote installs for all five hosts before changing implementation; it requires no custom installer or new dependency.
