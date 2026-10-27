# Portable Project Config Workflow Delivery

## Current scope and authority

Requirements revision `d41d0b8` was committed before the latest relocation. It supersedes the generated-payload design and earlier skill-only completion claims. All public resources now live canonically in `plugins/project-config/`; repository-maintainer Pi assets stay local. Existing uncommitted work was preserved and corrected.

## Implementation

1. Move the unchanged project-config prompt to `plugins/project-config/commands/project-config.md` and authoring skill to `skills/project-config-authoring/SKILL.md`. Remove their old `.pi/` locations and the generated-copy script/npm commands.
2. Move the Claude manifest into the plugin's `.claude-plugin/` directory. Claude and Copilot use this supported manifest and standard command/skill directories. Codex uses `.codex-plugin/plugin.json` selecting the same skill directory. Both plugin manifests use version 1.1.0 for cache refresh after relocation.
3. All three marketplace catalogs select `./plugins/project-config`. Root `package.json` exports only the public skill and command to Pi. `.pi/settings.json` declares `packages: [".."]`, resolved from `.pi/` to the local repository root.
4. The dependency-free OpenCode 1 adapter reads the canonical command and registers its template and skill directory in memory. Root `./server` is additive; `.` preserves the CLI main and wildcard exports retain deep-path compatibility. Include the plugin tree in npm/Git package files.
5. Documentation explains native installation, command/skill differences, trust, scope, updates/removal, version limits, local Pi dogfooding, and optional skill-only downloads. One consolidated Unreleased Added entry is maintained.

## Implementation ladder and safety

Native manifests and shared directories remove the need for instruction generation or a custom installer. Only OpenCode requires small local code. No new dependency or separate npm publication is needed. The adapter reads only packaged resources, never writes target files or invokes shell commands, and reports an existing project-config command before mutation.

OpenCode 1.19.4 did not select a Git subdirectory package correctly. An exact root Git-package fixture then failed Git dependency preparation. Its native HTTP package installer succeeded, so the guide uses a GitHub source archive URL. OpenCode 2's different API is not claimed compatible.

No new ADR is required: CLI behavior, public entry points, project-file authority, schemas, overlays, and devcontainer generation are unchanged. Only distribution ownership and native packaging change.

## Files and rollback

- `plugins/project-config/`: canonical command, skill, native manifests, and OpenCode adapter.
- Root `.claude-plugin/`, `.github/plugin/`, `.agents/plugins/` catalogs: one plugin each.
- Root `package.json`, `.pi/settings.json`: package exports, files inclusion, and local Pi source.
- `.gitignore`: narrow exception for the executable OpenCode source, otherwise hidden by the existing `*.js` build-output rule.
- `tool/__tests__/agent-packaging.test.ts`: catalog/manifest paths, local package resolution, no source shadows/copies, isolated adapter loading, conflicts/missing files, and install documentation.
- README, docs index, Pi inventory, guide, changelog, and spec records: aligned ownership and truthful native installation coverage.
- Rollback restores the old Pi source paths and manifests, removes the native payload/catalogs and additive server export, and removes only the newly added local package setting. No target project/home configuration or generated devcontainer was changed.

## Current validation

- Targeted packaging tests: PASS, 12 tests after final formatting, including an explicit Git-ignore regression check for the adapter.
- Native Pi RPC command discovery: PASS using `pi --approve --offline --mode rpc --no-session --no-extensions --no-mcp`. Both commands appear exactly once with `sourceInfo.origin=package`, `source=..`, `scope=project`, and paths under `plugins/project-config/`. Evidence: `/tmp/cs-canonical-pi-commands.json`. An initial assertion used a nonexistent top-level path field; corrected to the actual sourceInfo API and rerun successfully, without product-code changes.
- Claude Code 2.1.311: `plugin validate plugins/project-config` passed for the final version 1.1.0 layout; only optional public-directory icon advice. Log: `/tmp/cs-canonical-final-claude.log`.
- Codex 0.164.0: fresh native marketplace registration, plugin installation, and listing passed under isolated `/tmp/cs-canonical-final-codex.jOcpnd`. Installed version 1.1.0; all five installed files were byte-compared against the current plugin tree, including both native manifests, canonical command/skill, and adapter. No generated or deleted nested manifest is used.
- Copilot CLI 1.0.104: fresh native marketplace registration, install, plugin listing, and command/skill discovery passed under isolated `/tmp/cs-canonical-final-copilot.CA1jkq`. The host reports version 1.1.0 and both `project-config` and `project-config-authoring` enabled from the current plugin.
- OpenCode 1.19.4: the exact current root npm package archive was installed by the native HTTP package installer under isolated `/tmp/cs-canonical-final-opencode.H3gKKv`. `host-config.json` verifies the command template and `$ARGUMENTS`; `skills.json` verifies authoring-skill discovery. No old fixture or source checkout import was substituted for the installed package.
- Source archive check after independent finding F066-004: copied exact root package metadata, `.gitignore`, and plugin tree into a fresh Git fixture, used ordinary `git add`, and built a `git archive`. The adapter is present in the archive. Native OpenCode HTTP installation of that Git-built archive passed, with both resources discovered. Evidence: `/tmp/cs-canonical-source-archive.pU93eT`. Unlike npm packing alone, this catches source-archive omission caused by ignore rules.
- `npm run build` and `git diff --check`: PASS after relocation and final formatting.
- `VITEST_MAX_WORKERS=2 task validate`: PASS, formatting/type checks and 830 tests passed. Twenty existing integration tests remain opt-in; no skips were added. Log: `/tmp/cs-canonical-final-validate.log`.
- `npm run init -- doctor`: PASS, Healthy, 21 healthy checks, no blocking or reproducibility findings; no files changed. Log: `/tmp/cs-canonical-final-doctor.log`.
- Final INDEPENDENT correction review: PASS. All four findings resolved, all acceptance criteria MET. The reviewer reran all 12 packaging tests, checked Git inclusion, and byte-compared current metadata/resources with the successfully installed Git source archive. The verdict is persisted in review.md. Earlier generated-payload fixture evidence is superseded and cannot establish the current layout.
- Use `VITEST_MAX_WORKERS=2 task validate` to avoid a previously demonstrated unrelated CLI silent-mode timeout under high worker contention, without changing timeouts or skips.

## BDD applicability

No Container Superposition command, authored YAML, schema, overlay, or devcontainer semantics changed. Existing Behave coverage remains applicable to the CLI authoring/discovery behavior. Native host package discovery is covered by unit contracts and actual host installation checks instead of adding external harness dependencies to shared Behave generation steps. Agent resources are no longer generated; no generated devcontainer validation trigger applies.

## Acceptance mapping

- AC-066-01: Claude marketplace selects one proper plugin with one command and one authoring skill.
- AC-066-02: native distribution exists for all five hosts; Codex uses native skill invocation rather than a separate prompt command.
- AC-066-03: resources are canonical in standard plugin directories, without copies or symlinks. Native Pi RPC proves the local package setting loads both relocated resources.
- AC-066-04: instruction bodies are unchanged. OpenCode does not write project files or silently replace conflicting commands.
- AC-066-05: tests and docs reflect native install paths and scope; GitHub CLI is explicitly skill-only. Current-tree machine validation and INDEPENDENT review passed; all acceptance criteria are MET.

## Residual risk

Local source-matched host checks are accepted by the delivery lead as pre-publication packaging evidence. Direct GitHub installation of the unpublished candidate cannot run until it reaches the selected remote revision. Model-driven authoring behavior is not claimed tested by installation/discovery checks. No official directory approval or OpenCode 2 compatibility is claimed.
