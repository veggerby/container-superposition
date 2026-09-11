---
spec: '056-vscode-extensions-field'
title: 'First-Class VS Code Extensions Field'
status: 'Final'
review_gate: 'SELF_CHECK'
owner: 'delivery-lead-fallback'
created: '2026-09-10'
updated: '2026-09-10'
related_adrs: []
related_foundation:
    - 'docs/foundation.md'
---

# First-Class VS Code Extensions Field

## Problem

Users can add extra VS Code extensions only by writing a raw `customizations.devcontainerPatch.customizations.vscode.extensions` patch. That works but is harder to discover, less schema-guided, and inconsistent with existing first-class project surfaces such as `env`, `ports`, `mounts`, and `shell`.

## Why now

A project-file-first workflow should let teams and individual developers declare additional editor extensions directly in shared, local-only, and user-scoped bootstrap config without editing generated `.devcontainer/` output or authoring raw JSON patches.

## Acceptance Criteria

- [x] AC1: `superposition.yml` / `.superposition.yml` accepts a top-level `vscodeExtensions` list of non-empty extension IDs and appends those IDs to generated `devcontainer.json -> customizations.vscode.extensions` without removing overlay-provided extensions.
- [x] AC2: `superposition.local.yml` accepts `vscodeExtensions` and appends local-only extension IDs to generated output without modifying shared project config.
- [x] AC3: user-scoped global defaults support `initDefaults.vscodeExtensions` for eligible fresh `init` runs and `localConfigTemplate.vscodeExtensions` for scaffolded local config.
- [x] AC4: generated JSON schemas and user-facing docs describe `vscodeExtensions` on project, local, and global-default surfaces.
- [x] AC5: invalid non-list or empty-string `vscodeExtensions` values fail project/local/global config loading before generation writes.

## Non-goals

- Add CLI flags or interactive prompts for editing extension IDs.
- Remove or deprecate raw `customizations.devcontainerPatch` support.
- Support editor-specific extensions for non-VS Code editor profiles.

## Ambiguities / Open Questions

- None. The first-class field name is `vscodeExtensions` to distinguish editor extension IDs from devcontainer Features, overlays, and language/runtime extensions.

## Evidence / References

- `docs/foundation.md` project-file-first and generated-output ownership rules.
- Existing `customizations.devcontainerPatch.customizations.vscode.extensions` behavior in overlay and custom patch generation.
- Existing local and global-default config surfaces in `tool/schema/project-config.ts`.

## Risks / Constraints

- The field must remain additive and deterministic. Duplicate IDs are deduplicated by existing array-merge behavior.
- `editor: none` and `editor: jetbrains` continue to remove VS Code customizations after all VS Code extensions are applied.
