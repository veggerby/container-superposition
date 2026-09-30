---
spec: '061-global-local-config-refresh'
title: 'Refresh Repository Local Config from Global Defaults'
status: 'Implemented'
phase: 'VALIDATING'
execution_profile: 'Standard'
review_mode: 'INDEPENDENT'
review_status: 'NOT_STARTED'
execution_status: 'ACTIVE'
risk_status: 'PENDING_ACCEPTANCE'
completion: 'OPEN'
priority: 'P2'
owner: 'delivery-interrogator'
created: '2026-09-30'
updated: '2026-09-30'
related_adrs:
    - 'docs/adr/adr001-project-file-first-replay-and-regeneration.md'
related_foundation:
    - 'docs/foundation.md'
related_specs:
    - 'docs/specs/022-local-superposition-config/spec.md'
    - 'docs/specs/042-global-default-configuration/spec.md'
---

# Refresh Repository Local Config from Global Defaults

## Problem

Global defaults can scaffold `superposition.local.yml` only during an eligible fresh `init`. A user who changes their selected personal defaults must manually reproduce those local preferences in every existing repository. This is error-prone, especially for stack-aware defaults such as mounts and shell settings, while silently replacing a repository-local file would risk losing deliberate machine-specific rework.

## Why now

The shipped global-defaults behavior in spec 042 already provides deterministic home-file discovery, validated direct and stack-aware local templates, and init-only scaffolding. An explicit, safe refresh workflow lets users opt in to synchronizing an existing repository local config without changing the canonical project-file-first replay model.

## Product Scope

Add the public command:

```text
cs defaults refresh-local --force
```

The command explicitly refreshes the repository-root `superposition.local.yml` from the selected user-scoped global defaults file. It is a user-requested bootstrap/synchronization action, not a replay or remediation input: later `regen`, `doctor`, `plan`, replay-style `init`, and unattended workflows must continue to use repository inputs only and must not implicitly read or apply home defaults.

### Selected defaults and template semantics

- Discovery remains exactly as specified by 042: `~/.container-superposition.yml` wins over `~/.superposition.yml`; when the first exists, the other file does not participate. Selected-file parse, validation, and selection errors name the selected path.
- The source document remains the 042 global-defaults surface. `localConfigTemplate` may be the supported legacy direct local-config template or the supported stack-aware `common`, `plain`, and `compose` form; unsupported or mixed shapes remain invalid.
- A direct template is refreshed as that template. A stack-aware template materializes `common + plain` or `common + compose` using 042's established merge rules and existing local-config field semantics.
- For stack-aware materialization, the stack is the repository's effective canonical shared project configuration. The command does not infer a stack from the existing local file or use `initDefaults` as an alternative stack authority. If that repository authority is absent or invalid, refresh safely refuses without writes.
- Authored values remain scaffold data, not values to resolve: variable expressions, `~`, mount sources, shell snippets, and approved local-config fields retain the 042 semantics and are not expanded or normalized merely by refresh.

### Replacement safety

- If no repository-root `superposition.local.yml` exists, refresh creates the validated materialized template without asking for replacement confirmation.
- If it exists, an interactive invocation must obtain explicit confirmation before replacement. If confirmation is declined, no backup and no local-file write occur.
- A noninteractive invocation with an existing local file safely refuses unless `--force` is present. `--force` bypasses only the replacement confirmation; it does not bypass global-defaults, template, project-stack, or backup safety checks.
- Before replacing an existing local file, the command saves the original as a timestamped sibling backup suitable for manual rework. Backup names must be confined to the local file's directory, retain an identifiable relationship to `superposition.local.yml`, and avoid overwriting an existing backup on timestamp/collision. Failure to create a distinct backup prevents replacement.
- Invalid defaults, missing selected defaults, invalid/absent required project stack authority, declined confirmation, refusal without `--force`, and backup failure cause no local-file replacement or creation.

## Acceptance Criteria

- [x] GLC-REFRESH-001: Given both supported home defaults files exist, when `cs defaults refresh-local` runs, then it selects `~/.container-superposition.yml` and ignores `~/.superposition.yml`; given only the latter exists, it selects that file.
- [x] GLC-REFRESH-002: Given the selected defaults file cannot be parsed or validated, contains no usable `localConfigTemplate`, or no supported defaults file is selected, when refresh runs, then it reports the relevant selected-file/source error and makes no repository writes.
- [x] GLC-REFRESH-003: Given a valid direct `localConfigTemplate` and no repository `superposition.local.yml`, when refresh runs, then it creates the repository local file from that template without requesting replacement confirmation.
- [x] GLC-REFRESH-004: Given a valid stack-aware template and canonical repository shared project configuration with `stack: plain` or `stack: compose`, when refresh runs, then it materializes respectively `common + plain` or `common + compose` with spec 042 merge, mount-target, and literal-preservation semantics; it excludes the unselected branch.
- [x] GLC-REFRESH-005: Given stack-aware defaults but absent or invalid canonical repository stack authority, when refresh runs, then it refuses before creating, replacing, or backing up the repository local file and does not use the existing local file or `initDefaults` to choose a stack.
- [x] GLC-REFRESH-006: Given a repository local file already exists and an interactive replacement is available, when refresh runs without `--force`, then it presents an explicit replacement confirmation; on cancellation it leaves the local file unchanged and creates no backup.
- [x] GLC-REFRESH-007: Given a repository local file already exists and interactive confirmation is unavailable, when refresh runs without `--force`, then it safely refuses and leaves the local file unchanged with no backup; with `--force`, it may proceed only after all other validations and backup requirements pass.
- [x] GLC-REFRESH-008: Given refresh will replace an existing repository local file, when replacement is approved or forced, then it first creates one distinct timestamped sibling backup of the original; a colliding backup name is never overwritten, and backup creation failure leaves the original local file unchanged.
- [x] GLC-REFRESH-009: Given a successful approved or forced replacement, when refresh completes, then `superposition.local.yml` contains the validated selected materialized template and the original remains available in the reported sibling backup for manual rework.
- [x] GLC-REFRESH-010: Given invalid defaults, invalid selected-template compatibility, declined confirmation, noninteractive refusal without `--force`, or backup failure, when refresh exits, then it does not write a new local file, replace the existing local file, or alter home defaults.
- [x] GLC-REFRESH-011: Given `regen`, `doctor`, `plan`, replay-style `init`, or another workflow that has not explicitly invoked `defaults refresh-local`, when it runs, then it does not read or apply home defaults as replay or remediation authority.
- [x] GLC-REFRESH-012: Command help and user documentation describe `defaults refresh-local`, its `--force` replacement guard, selected-file precedence, backup behavior, and the fact that home defaults remain explicit bootstrap/sync input rather than replay/remediation authority.
- [x] GLC-REFRESH-013: Automated command and unit coverage proves the selection, direct and stack-aware materialization, creation, confirmation/refusal, forced replacement, collision-safe backup, selected-file errors, and no-write failure paths above.

## Non-goals

- Changing global-default discovery locations or precedence.
- Changing `initDefaults`, global-default schema shape, local-config field semantics, template merge semantics, stack semantics, or variable expansion behavior established by spec 042.
- Merging refreshed defaults into the existing local file, resolving conflicts field-by-field, or treating the existing local file as a stack-selection authority.
- Making home defaults a `regen`, `doctor`, `plan`, replay, remediation, CI, or unattended default authority.
- Removing backups automatically, modifying the Git index, or introducing project-file migration, generated-output regeneration, or a new local-config runtime layer.

## Ambiguities / Open Questions

- **Confirmation wording:** non-material and intentionally not fixed. The interaction must make replacement and its consequence explicit and default to the safe non-replacement choice; exact copy may follow established CLI conventions.
- **TTY classification:** non-material at shaping. Existing command conventions use both stdin and stdout TTY availability for interactive approval. The required contract is outcome-based: when explicit confirmation cannot be obtained, an existing file requires `--force`; implementation may align the precise TTY detection with that convention.

## Evidence / References

- `docs/specs/042-global-default-configuration/spec.md` — global-default discovery, direct/stack-aware template shape, merge, literal-preservation, and init-only authority.
- `tool/schema/project-config.ts` — ordered home-file selection and global/local template validation.
- `tool/commands/defaults.ts` and `tool/cli/args.ts` — current read-only `defaults` command boundary and public CLI surface.
- `tool/__tests__/global-defaults.test.ts` — shipped discovery, stack-aware materialization, selected-file errors, and no-write behavior.
- `docs/foundation.md` and `docs/adr/adr001-project-file-first-replay-and-regeneration.md` — repository project/local authority and safety boundary.
- `tool/commands/adopt.ts` and `tool/commands/doctor.ts` — existing explicit-confirmation and TTY conventions; `tool/commands/doctor/fixes.ts` — timestamped backup precedent.

## Risks / Constraints

- Replacement and backup behavior are destructive-adjacent public CLI behavior; backup must succeed before replacement and collision handling must never destroy a prior backup.
- Home defaults may contain personal paths or shell content. Refresh must copy only validated approved local-config data and must not expand or reinterpret authored values.
- Repository shared project config remains the only valid stack authority for this explicit sync. Using home `initDefaults` or the old local file instead would weaken project-file-first determinism.
- This is a Standard-profile task and requires an INDEPENDENT review before integration because it adds a public command, replacement/backup behavior, schema-adjacent selection semantics, tests, and user documentation.

## Implementation Notes

- Implemented `defaults refresh-local` as an explicit, non-replay synchronization action. Shared template materialization now lives with project-config semantics and is reused by fresh init.
- Validation and self-check evidence: `review-gate.md`.

## Handoff

Planning is recommended before implementation due to the public CLI, safety branches, documentation, and test surface. Create any execution plan at `docs/specs/061-global-local-config-refresh/plan.md`. Independent review is required by the selected review mode and replacement/backup risk.
