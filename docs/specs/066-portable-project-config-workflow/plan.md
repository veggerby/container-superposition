# Portable Project Config Workflow Delivery

## Current scope

The user confirmed the domain-scoped plugin name `project`. The marketplace and CLI package remain `container-superposition`. Current plugin ID: `project@container-superposition`; canonical directory: `plugins/project/`; Claude command: `/project:project-config`. Pi, Copilot, OpenCode command names and the authoring skill name remain unchanged. A future overlays plugin is possible but not implemented here.

Requirements were updated before the rename. No implementation files were staged, unstaged, or committed by the agent during the rename. The user committed the preceding canonical layout as `d66e3c0` while this work was underway; that is the current baseline. Earlier shaping commits and pre-rename validation remain historical provenance, not claims about the renamed working tree.

## Implementation

1. Rename the canonical plugin directory from `project-config` to `project`. Both native manifests use name `project` and version 1.2.0. Instruction bodies and OpenCode adapter behavior remain unchanged.
2. Keep all three marketplace names as `container-superposition`; change only their plugin entry names and source paths. Native installation becomes `project@container-superposition`.
3. Update root package exports, Pi resource paths, npm files inclusion, and the adapter's Git-ignore exception. `.pi/settings.json` retains `packages: [".."]` so local Pi uses the renamed canonical resources through the root package.
4. Update installation, update/removal, and migration guidance. Old installed plugin identities must be removed explicitly; no silent user-config migration or compatibility alias is introduced.
5. Regression checks distinguish marketplace and plugin identities, reject the obsolete plugin directory, and verify command/skill ownership, local Pi loading, Git inclusion, and isolated adapter loading.

## Design and safety

Native manifests and shared directories avoid instruction copies, symlinks, or synchronization scripts. The dependency-free OpenCode 1 adapter only reads packaged files and updates host-provided in-memory configuration; it does not write target files or run shell commands. Existing command conflicts are explicit.

The CLI main/binaries and deep imports remain unchanged; `./server` points to the renamed adapter. No dependency, schema, overlay, generated devcontainer, or CLI behavior changes. OpenCode 1 uses the GitHub source-archive route because its tested Git dependency preparation failed for this repository; OpenCode 2 is not claimed compatible. No ADR is needed for this scoped packaging rename.

## Files and rollback

- `plugins/project/`: canonical manifests, command, skill, and adapter.
- Root `.claude-plugin/`, `.github/plugin/`, `.agents/plugins/`: unchanged marketplace identity, renamed plugin entry/source.
- `package.json`, `.gitignore`: new canonical paths; `.pi/settings.json` remains local-root package loading.
- README, Pi inventory, installation guide, consolidated Unreleased Added entry, and tests: new identity plus migration guidance.
- Rollback restores the old directory and plugin entries/paths. User-installed identities require explicit user cleanup; no home or target-project state is automatically changed.

## Validation

- Targeted packaging tests: PASS, 12 tests. `npm run build` and git diff --check passed after formatting. Missing local dependencies were restored using npm ci --ignore-scripts from the existing lockfile; no dependency or lockfile versions changed.
- Native Pi RPC: PASS; both unchanged command names load once from package source `..` and paths under plugins/project/. Evidence: `/tmp/cs-project-pi-commands.json`.
- Claude Code 2.1.311: plugin validation, local marketplace registration, and native installation of project@container-superposition passed in isolated `/tmp/cs-project-claude.4XjN2I`.
- Codex 0.164.0: native marketplace registration/install/list passed in isolated `/tmp/cs-project-codex.xwdkW8`. Installed ID project@container-superposition, version 1.2.0; all five cached files byte-match plugins/project/.
- Copilot CLI 1.0.104: native registration/install/list passed in isolated `/tmp/cs-project-copilot.B4EhhY`; project version 1.2.0 is enabled under marketplace container-superposition, with command and skill discovery verified.
- OpenCode 1.19.4: ordinary git add and git archive of current package.json, .gitignore, and plugin files includes the renamed adapter. Native HTTP installation and command/skill discovery passed under `/tmp/cs-project-source-archive.AxogEy`.
- Pre-rename native/gate evidence belongs to the prior version and is not claimed to validate the new plugin identity.
- `VITEST_MAX_WORKERS=2 task validate`: PASS, formatting/type checks and 830 tests passed, with 20 existing opt-in integration skips; no new skips or timeout changes. Log: `/tmp/cs-project-validate.log`.
- `npm run init -- doctor`: PASS, Healthy, 21 healthy checks, no reproducibility errors or file changes. Log: `/tmp/cs-project-doctor.log`.
- Current INDEPENDENT rename review: PASS; all six acceptance criteria MET, no material findings. Reviewer reran 12 packaging tests and git diff --check, byte-compared Claude/Codex caches and the OpenCode source fixture, and inspected native Pi/Copilot evidence. Verdict persisted in review.md.
- Use `VITEST_MAX_WORKERS=2 task validate` to avoid the previously observed unchanged CLI silent-mode timeout under high worker contention. No timeout increases or new skips.

## BDD applicability

No Container Superposition command, YAML, schema, overlay, or devcontainer semantics changed. Existing Behave coverage remains applicable to CLI behavior. Native host distribution contracts are covered by unit tests and direct native installation/discovery checks, without adding external host dependencies to Behave's generation steps. No generated-devcontainer trigger applies.

## Acceptance mapping

- AC-066-01: Claude marketplace selects the domain-scoped project plugin, with only the current command and authoring skill.
- AC-066-02: native distribution remains available for all five hosts; Codex uses skill invocation, not a separate prompt command.
- AC-066-03: one canonical plugin tree; local Pi package still owns resource loading without duplicates.
- AC-066-04: instruction bodies and authoring safety boundaries are unchanged.
- AC-066-05: native install paths, scope, migration, trust, updates/removal, version limits, and skill-only fallback are documented.
- AC-066-06: marketplace and plugin identities are distinct; all selectors and paths reflect the confirmed project name, leaving future plugin slots unimplemented.

## Residual risk

Source-matched local/native checks are accepted as pre-publication evidence. Direct GitHub installation awaits publication of the selected revision. Model-driven authoring quality and OpenCode 2 compatibility are not claimed. The rename remains uncommitted for normal user review; no Git index state was silently rewritten.
