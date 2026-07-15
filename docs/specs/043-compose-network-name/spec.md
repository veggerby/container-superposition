---
spec: '043-compose-network-name'
title: 'Project-Specific Compose Network Names'
status: 'Final'
priority: 'P1'
owner: 'pm'
product_approval: 'approved'
architecture_review: 'approved'
ux_review: 'not-needed'
created: '2026-07-15'
updated: '2026-07-15'
related_adrs:
    - 'docs/adr/adr001-project-file-first-replay-and-regeneration.md'
related_foundation:
    - 'docs/foundation.md'
related_specs:
    - 'docs/specs/002-superposition-config-file/spec.md'
    - 'docs/specs/020-superposition-yml-schema/spec.md'
    - 'docs/specs/022-local-superposition-config/spec.md'
    - 'docs/specs/032-init-and-regen-guided-flows/spec.md'
normative_references:
    - 'docs/superposition-yml.md'
    - 'templates/compose/.devcontainer/docker-compose.yml'
---

# Project-Specific Compose Network Names

**Spec**: `043-compose-network-name`
**Status**: Final
**Created**: 2026-07-15
**Priority**: P1
**Product Approval**: approved
**Architecture Review**: approved
**UX Review**: not-needed

## Description

Stop cross-project Docker Compose network collisions by making the generated compose network name project-specific by default and explicitly configurable in shared project config.

## Evidence

- `docs/foundation.md` — current authority hard-codes inline compose network naming to `name: devnet`, which is the rule this feature must intentionally replace.
- `AGENTS.md` and `docs/definition-of-done.md` — contributor guidance currently enforces `devnet` as the actual compose network name across overlays.
- `templates/compose/.devcontainer/docker-compose.yml` — base compose template currently declares `networks.devnet` with no project-specific name.
- `tool/questionnaire/composer.ts` — compose generation merges `networks` blocks verbatim, so the actual generated network name is owned by compose generation rather than by overlay selection UX.
- `docs/specs/002-superposition-config-file/spec.md` — shared project file is the canonical team-authored place for generation inputs.
- `docs/specs/020-superposition-yml-schema/spec.md` — any new project-file field must be reflected in generated schema and docs.
- `docs/specs/022-local-superposition-config/spec.md` — local config is intentionally narrower than shared project config and should not silently become a second source for core compose-topology identity.

## Problem Statement

Today every compose-based generated project creates the same actual Docker network name, `devnet`. If a developer runs multiple generated projects at once, sidecars from unrelated repos join one shared network. That causes cross-project service discovery collisions, confusing hostname resolution, and accidental coupling between otherwise separate dev environments.

## User Goals / Jobs To Be Done

- Run multiple compose-based generated projects concurrently without their services joining one shared Docker network.
- Keep the default behavior zero-config for most users.
- Let teams pin a stable network name in `superposition.yml` when they need an explicit shared convention.

## Success Signals

- Two compose projects generated from different repo folders no longer share the same actual Docker network name by default.
- A team can set one project-file field to override the default network name deterministically.
- Overlay compose files continue to use the logical `devnet` network key, so existing overlay structure does not need a per-overlay redesign.

## Confidence

- Overall confidence: high
- Confidence notes: current behavior and ownership are clear from the template, compose merger, and config/schema specs; the remaining work is implementation and authority-text alignment rather than product or architecture discovery.

## Goals

- Add one shared project-file field for the actual generated compose network name.
- Change the compose default from global `devnet` to a project-specific derived name.
- Preserve existing logical network wiring inside compose files (`services.*.networks: [devnet]`).
- Keep scope limited to compose generation, project config/schema/docs, and related contributor authority text.

## Non-Goals

- Renaming the logical compose network key from `devnet`.
- Adding local-only network-name overrides in `superposition.local.yml`.
- Changing plain-stack behavior.
- Introducing `external: true` networks or multi-network orchestration.

## Authority and References

This spec must align with:

- `docs/foundation.md`
- `docs/adr/adr001-project-file-first-replay-and-regeneration.md`
- `docs/specs/002-superposition-config-file/spec.md`
- `docs/specs/020-superposition-yml-schema/spec.md`
- `docs/specs/022-local-superposition-config/spec.md`
- `docs/specs/032-init-and-regen-guided-flows/spec.md`
- `docs/superposition-yml.md`

## Design

### Observed Behavior

Generated compose output currently uses a logical network key `devnet` and the actual Docker network name `devnet`. Because Docker network names are global on a host, unrelated generated projects join the same network.

### Product / Behavior

Add a new shared project-file field:

```yaml
composeNetworkName: my-repo-devnet
```

Behavior rules:

1. **Shared project config owns the actual compose network name.**
    - `composeNetworkName` is a first-class field in `superposition.yml` / `.superposition.yml`.
    - It applies only when the effective stack is `compose`.
    - It is written back during `init` when the user explicitly chose or confirmed a non-default value.

2. **Compose generation gets a project-specific default.**
    - When `composeNetworkName` is absent, generated `docker-compose.yml` must set `networks.devnet.name` to a deterministic default derived from the repository folder basename only, using the form `[sanitized-folder-name]-devnet` or equivalent Docker-safe normalization.
    - `containerName` does not participate in this default derivation.
    - Different repo-folder basenames on the same machine therefore produce different actual Docker network names by default.
    - If teams need a stable name independent of checkout folder naming, they must set `composeNetworkName` explicitly in shared project config.

3. **The logical compose network key stays `devnet`.**
    - Services and overlays continue to reference `networks: [devnet]`.
    - The change is limited to the generated `networks.devnet.name` value.
    - Existing overlay compose files remain structurally valid; they do not gain per-overlay configurable network keys.

4. **Explicit project config overrides the default.**
    - If `composeNetworkName` is present, generated `docker-compose.yml` uses that exact value as `networks.devnet.name`.
    - `regen` must preserve that configured value across replays.

5. **Plain-stack misuse fails clearly.**
    - If `composeNetworkName` is set but the effective stack is `plain`, generation must fail before writing files with an actionable error explaining that `composeNetworkName` requires `stack: compose`.

6. **Local config stays out of scope.**
    - `superposition.local.yml` does not gain `composeNetworkName` in this slice.
    - This keeps network identity as shared topology intent rather than a local-only mutation.

### Technical Notes

- `ProjectConfigSelection` should gain `composeNetworkName?: string`.
- `QuestionnaireAnswers` should carry the effective compose network name or enough input to derive it once during compose generation.
- Compose generation should continue merging network blocks under the logical `devnet` key, then set or overwrite `merged.networks.devnet.name` with the effective configured/default value before writing `docker-compose.yml`.
- Validation should require a non-empty string and reject values that normalize to an empty or invalid Docker network name.
- `init`/`regen` trust-contract or preview output should surface the effective network name when stack is `compose`, because it is user-visible generated infrastructure identity.
- Generated schema and docs must describe the field as the actual Docker network name, not the logical compose key.

## Technical Design

### Architecture Ownership

**Owns the change**

- `tool/schema/types.ts` and `tool/schema/project-config.ts` — shared project-file field, validation, serialization, and project-file-to-answers mapping.
- `tool/questionnaire/composer.ts` — effective default derivation and final `networks.devnet.name` assignment in generated compose output.
- `tool/cli/run.ts` and related preview/trust-contract surfaces — display of configured/default compose network identity where compose generation is previewed.
- `scripts/generate-schema.ts` and generated schema outputs — schema exposure for the new field.
- Documentation and contributor authority files that currently require `name: devnet`.

**Must not own the change**

- Overlay metadata/loaders must not gain project-specific network-name logic.
- `superposition.local.yml` must not become a second source for compose network identity.
- Overlay authors should not be required to replace `networks: [devnet]` with project-specific keys.

### Canonical Data Flow

1. Load shared project config.
2. Resolve effective stack.
3. Resolve effective compose network name:
    - explicit `composeNetworkName`, else
    - derived default from repository folder basename only.
4. Merge base + overlay compose files exactly as today.
5. Before writing `docker-compose.yml`, ensure `merged.networks.devnet.name` equals the effective compose network name.
6. Write generated output and any project-file updates.

### Validation and Defaulting Restrictions

- `composeNetworkName` is optional.
- If absent, defaulting happens during generation; the tool does not need to backfill the derived default into `superposition.yml` automatically.
- If present, it must be a non-empty string acceptable as a Docker network name after normalization/validation.
- If the effective stack is not `compose`, setting `composeNetworkName` is an error.
- The default derivation algorithm must be deterministic for a given repository folder name and documented clearly enough that users can predict the output.

### Schema and Documentation Contract

- `tool/schema/superposition.schema.json` must expose `composeNetworkName` with wording that it controls the actual generated Docker network name for compose stacks.
- `docs/superposition-yml.md` must document:
    - default behavior,
    - explicit override behavior,
    - compose-only applicability,
    - and why this avoids cross-project conflicts.
- Contributor-facing authority that currently says “always set `name: devnet`” must be updated to the new rule:
    - keep logical key `devnet`
    - set `networks.devnet.name` to the effective project-specific name
    - never use `external: true`

### Test Plan Additions

- Unit coverage for project-config parsing/serialization of `composeNetworkName`.
- Unit coverage for default-name derivation and invalid-name rejection.
- Integration coverage that compose generation writes different network names for different repo-folder basenames when the field is absent.
- Integration coverage that explicit `composeNetworkName` wins over the derived default.
- Regression coverage that overlays still reference logical `devnet` and generated services remain attached to that logical key.
- Validation coverage that `composeNetworkName` with `stack: plain` fails before writes.

### Architecture Decision Impact

This feature intentionally changes current foundation and contributor authority that hard-code the actual compose network name to `devnet`. Implementation must update `docs/foundation.md`, `AGENTS.md`, `docs/definition-of-done.md`, and any overlay-authoring guidance that currently enforces fixed `name: devnet` behavior. No new ADR is expected if the logical network model stays the same and only the actual generated network name becomes project-specific.

## Constraints

- Shared project file remains the canonical source for explicit network-name overrides.
- Compose overlay structure must stay backward-compatible at the logical `devnet` key level.
- No automatic mutation of local config, Git state, or overlay metadata format.
- Defaulting must avoid reintroducing one shared host-global name.

## Preferences / Tradeoffs

- Prefer a simple first-class project-file field over asking users to patch generated compose YAML manually.
- Prefer a folder-basename-derived default over preserving global `devnet` or coupling the default to `containerName`, even though folder-derived defaults are less stable across repo renames.
- Prefer not to widen local config in this minimal slice.

## Risks

- Folder-derived defaults can change if a repo is renamed locally; teams that need stronger stability must opt into explicit `composeNetworkName`.
- Authority drift is currently guaranteed unless implementation updates foundation/contributor docs in the same change.
- Docker network-name validation/normalization details must be explicit enough to avoid surprising write-time failures.

## Acceptance Criteria

- [x] Given two compose projects generated from different repository folder basenames and neither project sets `composeNetworkName`, when both generate output, then each generated `docker-compose.yml` contains a different `networks.devnet.name` value derived from its own folder name.
- [x] Given a compose project with `composeNetworkName: team-a-devnet` in shared project config, when `regen` runs, then generated `docker-compose.yml` sets `networks.devnet.name: team-a-devnet` and does not replace it with the derived default.
- [x] Given a compose project with no explicit `composeNetworkName`, when `regen` runs repeatedly from the same repository folder, then the generated `networks.devnet.name` value is stable across runs.
- [x] Given a project sets `composeNetworkName` and uses compose overlays, when generation runs, then services and overlays still reference the logical `devnet` network key and only the actual `name:` value changes.
- [x] Given a project sets `composeNetworkName` while the effective stack is `plain`, when generation runs, then the command fails before writes with an actionable compose-only validation error.
- [x] Given `init` writes or updates shared project config for a compose project that explicitly chose a non-default network name, when the write completes, then the project file persists `composeNetworkName` and subsequent `regen` reuses it.
- [x] `tool/schema/superposition.schema.json`, `docs/superposition-yml.md`, and contributor authority docs that currently mandate `name: devnet` are updated to the new project-specific naming rule.
- [x] All new or changed behavior is covered by automated tests at the appropriate level.
- [x] Documentation and workflow artifacts are updated to match the implemented or reviewed state.

## Out of Scope

- Allowing users to choose multiple custom networks.
- Network-name overrides in `superposition.local.yml`.
- Automatic migration of already-running Docker networks.
- Reworking overlay compose imports beyond the final merged `devnet.name` value.

## Assumptions

- Docker network-name normalization can be implemented without changing the visible logical compose network key.
- Existing users who relied on one shared `devnet` network across unrelated repos are not the primary target workflow for generated compose stacks.

## Approved Implementation Scope

Developer handoff is approved for this slice only:

- Add shared project-file support for `composeNetworkName`.
- Default the actual compose network name to a project-specific derived value from the repository folder basename only when the field is absent.
- Do not use `containerName` as part of the default-network-name identity.
- Keep logical network references as `devnet` everywhere else.
- Reject compose-network configuration on plain stacks.
- Update schema, docs, tests, and authority text that currently requires fixed `name: devnet`.

## Implementation Notes

- Added shared `composeNetworkName` support across project-config parsing, serialization, CLI input handling, schema generation, and compose generation.
- Default compose network names now derive from the repository folder basename only; the generated output keeps the logical `devnet` key and overwrites the final `networks.devnet.name` after merge/custom-patch application.
- Added regression coverage for config round-trip, repo-derived defaults, generated compose output, explicit override replay, compose-only validation, and replay output surfacing; the default-name regression now uses a fast utility-level assertion plus one compose write check so targeted validation stays below Vitest's default timeout.
- Updated contributor authority/docs (`AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, `CONTRIBUTING.md`, `docs/creating-overlays.md`, `docs/quick-reference.md`, `docs/superposition-yml.md`) plus follow-on contributor automation guidance in `.pi/skills/overlay-development/SKILL.md`, `.pi/agents/overlay-writer.md`, `.pi/agents/overlay-reviewer.md`, and `.pi/agents/overlay-consistency.md`.
- Validation rerun after QA fixes: `npm test -- --run tool/__tests__/compose-network-name.test.ts`; `npm run lint`; `npm test`.
