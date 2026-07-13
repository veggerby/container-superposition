---
spec: '041-local-port-conflict-overrides'
title: 'Local Port Conflict Overrides in `superposition.local.yml`'
status: 'Final'
priority: 'P1'
owner: 'pm'
product_approval: 'approved'
architecture_review: 'approved-with-restrictions'
ux_review: 'not-needed'
created: '2026-07-13'
updated: '2026-07-13'
related_adrs:
    - 'docs/adr/adr001-project-file-first-replay-and-regeneration.md'
related_foundation:
    - 'docs/foundation.md'
related_specs:
    - 'docs/specs/022-local-superposition-config/spec.md'
    - 'docs/specs/024-project-ports/spec.md'
normative_references:
    - 'docs/superposition-yml.md'
---

# Local Port Conflict Overrides in `superposition.local.yml`

**Spec**: `041-local-port-conflict-overrides`
**Status**: Final
**Created**: 2026-07-13
**Priority**: P1
**Product Approval**: approved
**Architecture Review**: approved-with-restrictions
**UX Review**: not-needed

## Description

Extend `superposition.local.yml` so developers can resolve machine-specific port conflicts without editing team-shared `superposition.yml` or hand-editing generated output.

## Evidence

- `docs/specs/022-local-superposition-config/spec.md` — current local config explicitly excludes `portOffset` and other core generation settings.
- `docs/specs/024-project-ports/spec.md` — project `ports` are absolute and intentionally bypass `portOffset`, so local `portOffset` alone does not cover all port-conflict cases.
- `tool/schema/project-config.ts` — `LocalProjectConfigSelection` and `loadLocalProjectConfig()` currently allow only `$schema`, `env`, `mounts`, `shell`, and `customizations`.
- `docs/superposition-yml.md` — current docs position `portOffset` as shared config only and local config as non-port-focused enrichment.

## Problem Statement

Today a developer with local port collisions can only use `superposition.local.yml` for mounts, env, shell, and customizations. If the conflict comes from overlay port shifting or first-class project `ports`, they must change shared config, switch to lower-level custom patches, or edit generated files that `regen` will overwrite. That breaks the local-only contract introduced by spec 022.

## User Goals / Jobs To Be Done

- Resolve local host-port conflicts without changing committed project config.
- Override shared project port declarations locally when shared defaults collide on one machine.
- Keep team-shared intent deterministic and unchanged for everyone else.

## Success Signals

- A developer can set a local `portOffset` and regenerate successfully without touching `superposition.yml`.
- A developer can replace or suppress shared project `ports` locally when those exact ports conflict on their machine.
- Shared config and manifest remain free of local-only port overrides.

## Confidence

- Overall confidence: high
- Confidence notes: existing specs already define local-config boundaries and project-port semantics; this spec narrows the needed extension to port-conflict cases only.

## Goals

- Allow `portOffset` in `superposition.local.yml`.
- Allow local override of first-class project `ports` in `superposition.local.yml`.
- Preserve all existing local-config Git-safety and non-persistence rules.
- Reuse existing `ports` validation and stack-specific behavior from spec 024.

## Non-Goals

- Allowing local config to change `stack`, `baseImage`, `overlays`, `outputPath`, `target`, `editor`, `minimal`, or `devcontainerGitignore`.
- Adding general local `parameters:` support.
- Changing plan/discovery UX to account for local overrides in this slice.
- Mutating the Git index automatically.

## Authority and References

This spec must align with:

- `docs/foundation.md`
- `docs/adr/adr001-project-file-first-replay-and-regeneration.md`
- `docs/specs/022-local-superposition-config/spec.md`
- `docs/specs/024-project-ports/spec.md`
- `docs/superposition-yml.md`

## Design

### Observed Behavior

Spec 022 intentionally kept local config narrow and output-only. Spec 024 intentionally made project `ports` absolute and excluded them from `portOffset`. Combined, that means local config currently cannot fully solve port conflicts when the shared project uses first-class ports.

### Product / Behavior

`superposition.local.yml` expands its supported top-level keys to:

- `$schema`
- `env`
- `mounts`
- `shell`
- `customizations`
- `portOffset`
- `ports`

Behavioral rules:

1. **Local `portOffset` overrides shared `portOffset` for generated output only.**
    - If local `portOffset` is absent, shared behavior remains unchanged.
    - If local `portOffset` is present, it becomes the effective offset for overlay/service ports in that developer's run.
    - Shared `superposition.yml` and generated `superposition.json` must not be rewritten with the local value.

2. **Local `ports` replaces shared project `ports` when present.**
    - This is replacement, not append/merge.
    - Rationale: port-conflict resolution needs one effective host-port set, not shared plus local duplicates.
    - `ports: []` in local config is meaningful and disables shared project `ports` for that developer's generated output.

3. **Spec 024 semantics remain the source of truth for effective project ports.**
    - Plain-stack local `ports` resolve exactly like shared project `ports`.
    - Compose-stack local `ports` are written verbatim exactly like shared project `ports`.
    - Project `ports` continue to bypass `portOffset`, whether they come from shared config or local config.

4. **Effective env for plain-stack port resolution uses the already-merged shared+local env view.**
    - Existing local `env` support may therefore continue to drive plain-stack local or shared `ports` expressions.

5. **Command scope stays minimal.**
    - `init` and `regen` must honor local `portOffset` and local `ports`.
    - `doctor` checks that dry-compose generated output from the project file must honor the same local overrides wherever it already applies local config.
    - `plan` remains shared-config-only in this slice.

### Technical Notes

- `LocalProjectConfigSelection` should gain `portOffset` and `ports` fields only.
- `loadLocalProjectConfig()` must validate `portOffset` with the same non-negative-integer rule as shared config and `ports` with the same parser/structure rules as shared config.
- Local loading must preserve the difference between:
    - local `ports` absent
    - local `ports: []`
      Shared config may continue normalizing empty arrays away, but local config cannot, because `ports: []` is the explicit replacement signal that suppresses shared project ports.
- `applyLocalConfigToAnswers()` should:
    - override `answers.portOffset` when local `portOffset` is defined
    - replace `answers.projectPorts` when local `ports` is defined, including explicit empty array
- Local schema generation must expose `portOffset` and `ports` for `superposition.local.schema.json`.
- Existing local-config Git-safety messages and ignore behavior stay unchanged.

## Technical Design

### Architecture Ownership

**Owns the change**

- `tool/schema/project-config.ts` — local-file allowed keys, parsing, validation, and presence tracking for local `ports` replacement.
- `tool/cli/run.ts` — shared-vs-local loading order, pre-write serialization boundary, and command scoping (`init`/`regen` apply; `plan` does not).
- `tool/commands/doctor/checks.ts` — reuse the same effective-answer merge for dry-compose reproducibility checks.
- `tool/questionnaire/composer.ts` — existing stack-aware project-port semantics from spec `024`, using the already-merged effective answers only.

**Must not own the change**

- `plan` must not read or apply local port overrides in this slice.
- Overlay metadata/loaders must not become aware of local config.
- `superposition.json` and shared `superposition.yml` must not become storage for local-only overrides.

### Canonical Data Flow

1. Load shared project config.
2. Load local config from repository root, validating only the allowed local fields.
3. Build shared answers exactly as today.
4. Persist shared project file updates from the shared answers only.
5. Apply local overrides in-memory to produce effective generation answers.
6. Run compose/generation and doctor dry-compose against the effective answers.
7. Serialize manifest/shared config from shared answers only, never from effective localized answers.

### Merge and Port Semantics Restrictions

- Local `portOffset` is scalar override semantics: defined local value wins; absent local value leaves shared value unchanged.
- Local `ports` is whole-field replacement semantics: defined local value replaces shared `projectPorts`; absent local value leaves shared ports unchanged.
- `ports: []` in local config is a valid override and must clear shared project ports for that run.
- Stack-aware validation remains where stack is known. Local parsing should stay structural; `plain` vs `compose` port-format enforcement should continue to flow through spec `024` generation logic.
- Project `ports` continue to bypass `portOffset` regardless of whether their source is shared or local.
- Effective plain-stack port resolution continues to use merged shared+local env values.

### CLI / Loading Restrictions

- `init` and `regen` should honor local port overrides only for generated output.
- `doctor` reproducibility checks should honor the same local overrides when building dry-compose answers.
- `--no-scaffold` / manifest-only flows should continue to skip local-only port application.
- `plan` remains shared-config-only and should not preview local-only port conflict fixes.

### Persistence Boundary

- Local `portOffset` and local `ports` must never be written back into shared project config.
- Local `portOffset` and local `ports` must never be serialized into `superposition.json`.
- Because manifest generation currently derives from `answers`, implementation must explicitly avoid passing localized manifest values through the manifest-writing path.

### Test Plan Additions

- Parser/unit coverage for local `portOffset`, local `ports`, and the distinction between missing `ports` and explicit `ports: []`.
- Merge-helper coverage proving local scalar override and whole-field replacement semantics.
- Command/integration coverage that shared project file bytes and generated manifest bytes do not gain local port values.
- Regression coverage that compose/plain port behavior matches spec `024` for both shared and local sources.

### Architecture Decision Impact

Aligned with current ADRs/foundation.

## Constraints

- Project-file-first authority remains with shared `superposition.yml`.
- Local overrides may affect generated output only.
- No local value may be persisted back into shared config or manifest.
- Project-port semantics from spec 024 must not fork between shared and local sources.

## Preferences / Tradeoffs

- Prefer first-class local overrides over advising users to patch generated `docker-compose.yml` or `devcontainer.json` manually.
- Prefer narrow port-conflict scope over broadening local config into a second full project config surface.

## Risks

- Replacement semantics for local `ports` must be explicit or developers may expect append behavior.
- Treating `ports: []` as meaningful in local config is a behavior edge that needs targeted tests and docs.
- `plan` remaining shared-only may surprise users, but widening that command is outside this minimal slice.

## Acceptance Criteria

- [x] Given shared `superposition.yml` defines `portOffset: 100` and local config defines `portOffset: 300`, when `regen` runs with local config present, then generated overlay/service ports use `300`, and neither shared project file nor manifest is rewritten with `300`.
- [x] Given shared `superposition.yml` defines first-class `ports` and local config defines its own `ports`, when `regen` runs, then only the local `ports` set is applied to generated output.
- [x] Given shared `superposition.yml` defines first-class `ports` and local config sets `ports: []`, when `regen` runs, then shared project `ports` are omitted from that developer's generated output.
- [x] Given local config defines `ports`, when generation runs on `stack: plain` or `stack: compose`, then validation, resolution, verbatim-write behavior, and `portOffset` bypass match spec 024 exactly.
- [x] Given local config defines `env` plus `ports` expressions for `stack: plain`, when generation runs, then plain-stack port resolution uses the effective merged shared+local env values.
- [x] Given local config sets `ports: []`, when generation runs, then shared project `ports` are suppressed for that developer even though shared empty-array normalization elsewhere remains unchanged.
- [x] Given local config defines `portOffset` or `ports`, when generation runs, then neither shared project config nor generated `superposition.json` persists those local-only values.
- [x] Unsupported local-config keys remain rejected, but the allowed-key list now includes `portOffset` and `ports`.
- [x] All new or changed behavior is covered by automated tests at the appropriate level.
- [x] Documentation and workflow artifacts are updated to match the implemented or reviewed state.

## Out of Scope

- Local overrides for non-port shared settings such as `outputPath` or `target`.
- Auto-detecting which `parameters:` keys are port-related.
- Reworking doctor remediation or local-config Git-safety behavior.

## Assumptions

- The current local-config non-persistence rule remains correct even when local overrides affect visible generated port mappings.

## Open Questions

- None blocking draft.

## Approved Implementation Scope

Developer handoff is approved for this slice only:

- Add only local `portOffset` and local `ports` support in `superposition.local.yml`.
- Treat local `ports` as full replacement of shared project `ports`, including `ports: []` as an explicit suppressing override.
- Apply local port overrides only to effective generation inputs used by `init`, `regen`, and `doctor` dry-compose/reproducibility paths that already honor local config.
- Keep `plan` shared-only.
- Preserve manifest and shared-project persistence boundaries so local-only port overrides never serialize into `superposition.yml` or `superposition.json`.
- Keep stack-aware `ports` semantics owned by spec `024` generation behavior rather than duplicating stack logic in local parsing.

## Routing Decision

**PM → Developer**

Approved with restrictions from architecture review. No new UX surface or ADR is needed for this slice as long as implementation preserves explicit-empty local `ports`, manifest non-persistence, and `plan` remaining shared-only.

## Implementation Notes

- Extended `LocalProjectConfigSelection` and `loadLocalProjectConfig()` to accept `portOffset` plus `ports`, while preserving the local-only distinction between missing `ports` and explicit `ports: []`.
- Updated `applyLocalConfigToAnswers()` so local `portOffset` overrides shared offset and local `ports` fully replace shared project ports for effective generation inputs only.
- Kept persistence boundaries intact by passing shared answers to manifest generation even when localized effective answers drive `init`, `regen`, and doctor dry-compose output.
- Updated local schema generation and `docs/superposition-yml.md` to document local port overrides.
- Added regression coverage for parser/merge behavior, `ports: []`, generated-output application, manifest/shared-config non-persistence, and doctor reproducibility dry-compose honoring local `portOffset` / `ports` overrides.
