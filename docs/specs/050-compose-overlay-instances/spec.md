---
spec: '050-compose-overlay-instances'
title: 'Multi-Instance Compose Overlays with Instance Overrides'
status: 'Draft'
qa_status: ''
priority: 'P1'
owner: 'pm'
product_approval: 'approved'
architecture_review: 'approved'
ux_review: 'not-needed'
created: '2026-07-17'
updated: '2026-07-17'
related_adrs:
    - 'docs/adr/adr001-project-file-first-replay-and-regeneration.md'
related_foundation:
    - 'docs/foundation.md'
related_specs:
    - 'docs/specs/011-overlay-parameters/spec.md'
    - 'docs/specs/024-project-ports/spec.md'
    - 'docs/specs/041-local-port-conflict-overrides/spec.md'
    - 'docs/specs/042-global-default-configuration/spec.md'
    - 'docs/specs/044-deterministic-compose-port-rendering-and-optional-env-files/spec.md'
normative_references:
    - 'docs/superposition-yml.md'
    - 'tool/schema/project-config.ts'
    - 'tool/schema/types.ts'
    - 'tool/utils/parameters.ts'
    - 'overlays/postgres/overlay.yml'
    - 'overlays/postgres/docker-compose.yml'
    - 'overlays/postgres/devcontainer.patch.json'
---

# Multi-Instance Compose Overlays with Instance Overrides

**Spec**: `050-compose-overlay-instances`
**Status**: Draft
**Created**: 2026-07-17
**Priority**: P1
**Product Approval**: approved
**Architecture Review**: approved
**UX Review**: not-needed

## Description

Allow compose-based stacks to include more than one instance of the same overlay through a single backward-compatible `overlays:` surface. The `overlays:` array continues to accept legacy string entries and now also accepts object entries for named instances with per-entry parameter overrides. Existing top-level project `parameters:` remain the shared default layer for an overlay family unless an overlay entry supplies a more specific value.

## Evidence

- `docs/superposition-yml.md` — current `overlays:` contract is documented as a flat list of overlay IDs, with no documented instance identity or repeated-entry semantics.
- `tool/schema/project-config.ts` — current overlay aggregation deduplicates overlay IDs, so repeated selection intent is collapsed today.
- `docs/specs/011-overlay-parameters/spec.md` — overlay parameter support is currently shared at the project level through one `parameters:` map and has no per-instance override layer.
- `tool/utils/parameters.ts` — parameter resolution currently keys off overlay IDs and one supplied map, so repeated overlay instances cannot resolve different values.
- `overlays/postgres/docker-compose.yml` — compose service names, volume names, and parameter tokens are authored for a single `postgres` instance and would collide if applied twice unchanged.
- `overlays/postgres/devcontainer.patch.json` — generated devcontainer-facing env, `runServices`, and `portsAttributes` references assume one overlay instance with one hostname/service identity.
- `docs/specs/024-project-ports/spec.md`, `041-local-port-conflict-overrides/spec.md`, and `044-deterministic-compose-port-rendering-and-optional-env-files/spec.md` — compose port behavior is already stack-aware and deterministic, so repeated compose overlays must preserve those guarantees while avoiding host-port collisions.
- `docs/specs/042-global-default-configuration/spec.md` — the product already distinguishes shared project intent from local/bootstrap-only defaults; this feature must preserve that boundary.
- `tool/schema/project-config.ts` and `tool/schema/manifest-migrations.ts` — current project-file and manifest readers both assume overlay lists are string-only, so parser, serializer, and receipt compatibility need explicit design.

## Problem Statement

Today a project can select an overlay only once. That blocks common compose use cases such as:

- one stack with multiple databases of the same engine,
- multiple broker or service instances for primary/replica or app/analytics separation,
- parallel infrastructure components that share an overlay implementation but need different names, ports, or credentials.

This feature should use one backward-compatible `overlays:` contract so users can express all overlay selection in one place while keeping existing singleton projects unchanged. Repeated named instances should live inline with the rest of overlay selection rather than behind a second parallel top-level field.

## User Goals / Jobs To Be Done

- Run multiple instances of the same compose-capable overlay in one generated stack.
- Give each instance a distinct identity and instance-local parameter values.
- Keep one shared default layer so common values do not need to be repeated for every instance.
- Preserve existing single-instance projects and existing top-level parameter behavior when no object-form overlay entries are used.

## Success Signals

- A compose project can declare two `postgres` instances in `overlays:` without cloning overlay source files.
- Each instance can override only the values that differ, while inheriting unspecified values from shared project defaults.
- Generated compose output stays deterministic and collision-free for service names, ports, volumes, copied files, and instance-facing references.
- Existing single-instance projects regenerate unchanged.
- `migrate` and manifest-backed compatibility flows can still round-trip repeated intent even though the project file remains canonical.

## Confidence

- Overall confidence: medium-high
- Confidence notes: the current single-instance limitation and shared-parameter model are directly evidenced in code and docs; the main remaining work is disciplined normalization, receipt compatibility, and repeatable-overlay hardening.

## User Stories

**US-1** As a compose-stack user, I want to include the same overlay more than once so one project can run distinct instances of the same service type.

**US-2** As a project maintainer, I want top-level `parameters:` to define common defaults once, so instance-specific config only needs to state deviations.

**US-3** As a team member, I want existing `overlays: [postgres]` style projects to keep working unchanged, so the feature is additive rather than a migration-only rewrite.

## Goals

- Support repeated selection of the same overlay in compose-based stacks through the existing top-level `overlays:` field.
- Introduce an object form in `overlays:` for explicit instance identity and per-entry parameter overrides.
- Preserve legacy string entries in `overlays:` unchanged.
- Preserve top-level `parameters:` as the shared default layer for compatible keys.
- Define a normalized internal overlay-selection model that does not collapse repeated entries.
- Require unique effective instance identities in generated compose output.
- Keep replay deterministic from shared project config.
- Ship v1 with `postgres` as the only repeatable catalog overlay enabled by this spec.

## Non-Goals

- Supporting multiple instances of the same overlay on `stack: plain` in this slice.
- Enabling every existing compose overlay for repeatability in v1.
- Requiring overlay authors to fork or duplicate catalog overlays just to get a second instance.
- Expanding local-only config into a second source of truth for instance defaults.
- Solving arbitrary cross-instance orchestration patterns beyond repeated overlay composition.
- Designing a new secret-management model beyond existing parameter/env rules.
- Adding instance-targeted CLI `--param` syntax in this slice.

## Authority and References

This spec must align with:

- `docs/foundation.md`
- `docs/adr/adr001-project-file-first-replay-and-regeneration.md`
- `docs/specs/011-overlay-parameters/spec.md`
- `docs/specs/024-project-ports/spec.md`
- `docs/specs/041-local-port-conflict-overrides/spec.md`
- `docs/specs/042-global-default-configuration/spec.md`
- `docs/specs/044-deterministic-compose-port-rendering-and-optional-env-files/spec.md`
- `docs/superposition-yml.md`

## Design

### Product / Behavior

#### Unified backwards-compatible `overlays:` contract

`overlays:` becomes a mixed array with two allowed entry forms.

**Legacy string form**

```yaml
overlays:
    - nodejs
    - postgres
```

Rules:

- Keeps current behavior unchanged.
- Represents one singleton selection of that overlay.
- Carries no instance-local parameter map.
- Duplicate singleton declarations for the same overlay family are rejected instead of silently deduplicated.

**New object form**

```yaml
overlays:
    - nodejs
    - overlay: postgres
      name: app
      parameters:
          POSTGRES_DB: app
    - overlay: postgres
      name: analytics
      parameters:
          POSTGRES_DB: analytics
          POSTGRES_PORT: '5433'
```

Rules:

- `overlay` is required and must reference a known overlay.
- `name` is required, stable, and validated with the compose-safe slug character class `[a-z0-9][a-z0-9-]*`.
- `parameters` is optional and is a `Record<string, string>` after YAML coercion.
- The same object form may appear multiple times for the same overlay ID as long as each entry has a unique `name` within that overlay family.
- String and object entries may coexist in the same `overlays:` array across different overlay families.
- For one overlay family, this slice keeps selection unambiguous by disallowing a legacy string entry and object-form entries for the same overlay in the same project file.
- An object-form entry is the only supported way to request repeated selection.

Users express all overlay selection in one place, while legacy string entries remain valid unchanged.

#### Legacy category fields remain compatibility-only input

Top-level category fields such as `language`, `database`, `cloudTools`, `devTools`, `observability`, and `playwright` remain load-only compatibility sugar for singleton overlay selection.

Rules:

- They continue to parse into singleton overlay selections for backward compatibility.
- They cannot express named instances.
- If any object-form `overlays:` entry is present, category-sugar overlay fields must be absent from that project file.
- Canonical project-file serialization continues to emit only the flat `overlays:` field; category sugar is not written back out by serializer paths.

This preserves the product's desired single-surface model for instance authoring while keeping older singleton inputs readable.

#### Shared-default and per-entry parameter model

Parameter precedence for an object-form instance is:

1. overlay-declared default from `overlay.yml`
2. shared top-level `parameters:` from `superposition.yml`
3. shared CLI `--param KEY=VALUE` overrides, merged into the same shared layer for the current run
4. `overlays[].parameters` for that specific object entry
5. reserved built-ins injected by the tool (`CS_OVERLAY`, `CS_INSTANCE`) — not user-settable

Additional rules:

- Existing single-instance string entries keep current behavior.
- Shared top-level `parameters:` still apply across the whole project and remain useful as defaults for both singleton overlays and repeated instances.
- CLI `--param` remains shared-scoped in this slice; there is no instance-targeted CLI syntax.
- User-authored top-level `parameters:` may continue to include declared overlay parameters and ad-hoc project parameters per existing behavior.
- Object-entry `parameters:` must reference only parameters declared by that overlay family; ad-hoc keys are not allowed there.
- Both shared and per-entry parameter maps must reject any key equal to or prefixed with `CS_`.
- Built-ins are injected after user precedence is resolved and always win.

#### Repeatability capability contract

Repeated instances stay opt-in per overlay.

Add a new overlay metadata boolean:

```yaml
repeatable: true
```

Rules:

- Default is `false` / absent.
- `repeatable: true` is valid only for overlays that support `compose`.
- A project may use object-form entries only for overlays marked `repeatable: true`.
- Non-repeatable overlays continue to work through the legacy string path only.
- Object form with a single named instance is still gated by `repeatable: true`; naming is treated as instance semantics, not a second singleton syntax.

This avoids pretending that every existing compose overlay is already safe to namespace.

#### Normalized selection model

Project-file parsing must normalize all accepted input forms into an ordered internal selection list that preserves repeated intent.

Normalized record shape:

```ts
type NormalizedOverlaySelection =
    | {
          kind: 'singleton';
          overlayId: string;
          source: 'overlays' | 'category' | 'dependency' | 'manifest';
      }
    | {
          kind: 'named';
          overlayId: string;
          instanceName: string;
          parameters?: Record<string, string>;
          source: 'overlays' | 'manifest';
      };
```

Normalization rules:

- Legacy string entries normalize to `kind: 'singleton'`.
- Object-form entries normalize to `kind: 'named'`.
- Category-sugar fields normalize to `kind: 'singleton'` only when object-form entries are absent.
- Dependency-added overlays normalize to `kind: 'singleton'` and are runtime-only; they are not written back into the shared project file.
- Normalization preserves explicit declaration order from `overlays:` exactly.
- Category-sugar compatibility input, when used, is appended in the existing deterministic category order already implied by loader logic.
- Internal consumers that only need family presence may derive that from the normalized list, but they must not become the canonical source of overlay intent.

#### Project-file and manifest persistence rules

**Project file**

- Shared project config remains canonical.
- Serializer writes explicit singleton selections as strings and named selections as objects inside one `overlays:` array.
- Serializer does not preserve category sugar on write.
- Serializer does not persist dependency-added singleton selections.

**Manifest / receipt**

- `superposition.json` remains a generated receipt, not canonical authority.
- For backward compatibility, manifest `overlays: string[]` remains as the flattened overlay-family presence list.
- Manifest gains an optional `overlaySelections` receipt field that captures the exact normalized user-authored selection intent needed for `migrate` and `--from-manifest` compatibility flows.
- When `overlaySelections` is present, manifest readers must prefer it; when absent, they synthesize singleton selections from legacy `overlays: string[]`.
- Existing manifest-only consumers that only need family presence may continue reading `overlays`.

This preserves manifest compatibility while avoiding loss of repeated intent.

#### Dependency and conflict semantics

- `requires` and `conflicts` remain overlay-family-level, not instance-level.
- Dependency resolution runs on the family-presence set derived from normalized explicit selections before expansion into overlay applications.
- If any selected instance of overlay `A` requires overlay `B`, the tool adds `B` once as a dependency singleton application unless the project already selected `B`.
- Dependency auto-add never fabricates named instances.
- If any selected overlay family conflicts with another selected overlay family, generation fails regardless of instance names or counts.
- This slice does not support “instance A requires instance B” or dependency targeting between sibling instances.

#### Materialization and collision contract

Repeatable overlays must express all instance-sensitive identities through built-ins so the composer can materialize each application deterministically.

Reserved built-ins:

- `{{cs.CS_OVERLAY}}` → overlay ID, for example `postgres`
- `{{cs.CS_INSTANCE}}` → instance name, for example `analytics`

Required tokenization or equivalent deterministic namespacing for repeatable overlays wherever uniqueness or cross-file references matter:

- compose service keys
- named volume keys and service volume references
- healthcheck, `depends_on`, and other service-reference strings
- `runServices`
- devcontainer `remoteEnv` host/service values
- devcontainer keyed maps such as `portsAttributes`
- copied overlay filenames and copied file contents when collisions would otherwise occur
- generated summary labels derived from overlay metadata

Additional materialization rules:

- Built-in substitution must apply to YAML object keys, JSON object keys, filenames, and ordinary string values.
- Repeated overlays must not depend on shared runtime env variable names such as `${POSTGRES_PORT}` unless the overlay itself already namespaces those variable names deterministically. The generator will not invent per-instance compose env-variable names for authors.
- For v1, repeatable overlays may instead materialize concrete compose defaults directly into generated output and skip shared runtime env hooks where those hooks would collide across instances.
- Copying arbitrary overlay files for repeated instances must namespace the destination path with instance context when the overlay author has not already done so through tokens; the safe default is `<basename>-<overlay>-<instance><ext>`.
- Overlays marked `repeatable: true` that still contain hard-coded single-instance compose identities must fail validation/tests before release.

#### Merge and collision rules

- Repeated overlay instances must not rely on the existing “auto-bump conflicting host ports” behavior for overlay-owned service ports.
- Collision detection runs after parameter and built-in substitution but before writing final files.
- If two repeated instances resolve the same effective compose service name, named volume key, copied destination path, explicit host port binding, or devcontainer keyed-map entry, generation fails before write with an instance-specific error.
- Existing project `ports` semantics from specs `024`, `041`, and `044` remain unchanged and stay orthogonal to overlay-entry parameter overrides.
- Existing project-wide `portOffset` still applies to legacy tool-owned port-offset paths, but it must not be used to silently disambiguate repeated overlay instances that share the same explicit host-port parameter.

#### Example configurations

**Legacy unchanged**

```yaml
stack: compose
overlays:
    - nodejs
    - postgres
parameters:
    POSTGRES_DB: app
```

**One singleton overlay plus repeated named instances of another family**

```yaml
stack: compose
overlays:
    - nodejs
    - redis
    - overlay: postgres
      name: app
      parameters:
          POSTGRES_DB: app
    - overlay: postgres
      name: analytics
      parameters:
          POSTGRES_DB: analytics
          POSTGRES_PORT: '5433'
parameters:
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: postgres
```

**Invalid same-family mixed selection**

```yaml
stack: compose
overlays:
    - postgres
    - overlay: postgres
      name: analytics
```

This must fail validation before write because one overlay family cannot be selected through both shorthand and object form in the same project.

**Invalid mixed single-surface + category-sugar authoring**

```yaml
stack: compose
database:
    - redis
overlays:
    - overlay: postgres
      name: app
```

This must fail validation before write because named-instance authoring is supported only through the unified `overlays:` surface.

## Technical Design

### Architecture ownership

**Owns the change**

- `tool/schema/types.ts` — shared types for mixed `overlays` entries, normalized overlay-selection and overlay-application models, overlay metadata capability flag, and manifest receipt extensions.
- `tool/schema/project-config.ts` — parse/validate/serialize mixed `overlays`, normalize category sugar, enforce compose-only repeated-instance rules, and write canonical project-file output.
- `tool/schema/manifest-migrations.ts` and manifest readers — support optional `overlaySelections` receipt shape while preserving legacy `overlays: string[]` compatibility.
- `tool/questionnaire/composer.ts` — convert normalized selections into ordered overlay applications, compose/devcontainer materialization, and instance-aware collision checks.
- `tool/utils/parameters.ts` — resolve the shared-default + per-entry override chain plus reserved built-ins, including key substitution support.
- overlay metadata/schema/docs generation — expose repeatability metadata and mixed `overlays` schema/docs.
- repeatable overlay sources under `overlays/**` — replace hard-coded single-instance identities with approved tokens and mark only safe overlays repeatable.

**Must not own the change**

- `superposition.local.yml` must not become a second instance-authoring surface.
- `superposition.json` must not become the canonical place to describe repeated overlays; it only mirrors intent for compatibility.
- Existing category-sugar fields must not gain named-instance semantics.
- `plain` stack generation must not implement multi-instance behavior in this slice.

### System boundaries

- Project-file loading owns acceptance and normalization of user-authored selection intent.
- Dependency/conflict logic owns overlay-family presence only.
- The composer owns expansion from normalized selections into concrete overlay applications.
- Overlay assets own whether an overlay is actually safe to repeat; `repeatable: true` is a contract, not a hint.
- Manifest compatibility owns round-trip recovery for `migrate` and `--from-manifest`, but not ongoing steady-state authority.

### Canonical data flow

```mermaid
flowchart LR
    ProjectFile[superposition.yml] --> Parser[mixed overlays parser]
    Parser --> Validation[shape + compatibility validation]
    Validation --> Normalization[ordered normalized selections]
    Normalization --> Presence[overlay-family presence set]
    Presence --> DependencyResolution[requires/conflicts resolution]
    DependencyResolution --> Applications[overlay applications\n(singleton + named)]
    Applications --> Params[shared defaults + entry overrides + built-ins]
    Params --> Materialization[compose/devcontainer/file materialization]
    Materialization --> CollisionCheck[instance-aware collision validation]
    CollisionCheck --> Outputs[devcontainer.json + docker-compose.yml + summary + manifest receipt]
```

Detailed flow:

1. Load shared project config.
2. Parse `overlays:` into a normalized internal representation that preserves declaration order and distinguishes singleton and named selections.
3. Reject incompatible authoring before generation:
    - object-form entries on `stack: plain`
    - object-form entries for unknown, non-compose, or non-repeatable overlays
    - category-sugar overlay fields when object-form entries are present
    - same-family mixed shorthand/object selection
    - duplicate singleton declarations for the same family
    - duplicate object-form `name` values within the same overlay family
    - reserved-key and unknown-entry-parameter violations
4. Build the overlay-family presence set from normalized explicit selections.
5. Run existing dependency/conflict resolution at the overlay-family level.
6. Expand the resolved family set into ordered overlay applications:
    - one singleton application for each explicit singleton selection
    - one singleton application for each dependency-added family not explicitly selected
    - one application per named object entry
7. For each application, resolve parameters and built-ins, then materialize overlay-owned assets with that application context.
8. Validate the fully materialized identities and paths for collisions before writing files.
9. Persist shared project intent and generated receipt without introducing a second authoring surface.

### Overlay application model

The composer must operate on a concrete application model rather than a deduplicated overlay ID list.

```ts
type OverlayApplication = {
    overlayId: string;
    mode: 'singleton' | 'named';
    instanceName?: string;
    source: 'explicit-singleton' | 'explicit-named' | 'dependency';
    parameters: Record<string, string>;
};
```

Rules:

- Explicit declaration order is preserved among explicit selections.
- Dependency-added singleton applications are appended in dependency-resolution order after explicit applications of other families.
- Named applications remain distinct even when they share the same `overlayId`.
- Summary, doctor, services, port docs, and any future export surface must use this model or a lossless derivative of it.

### Parser and schema implications

- `ProjectConfigSelection.overlays` changes from `OverlayId[]` to a union-array type.
- JSON schema for `superposition.yml` must allow `items: oneOf[string, object]` with object keys `overlay`, `name`, and optional `parameters` only.
- Global defaults `initDefaults.overlays` remain string-only in this slice.
- Local config schema remains unchanged.
- Manifest schema gains optional `overlaySelections` using the same string-or-object array union used by project-file `overlays:`.
- Loader and serializer tests must cover numeric YAML coercion inside both shared and entry-local parameter maps.

### Compatibility and migration constraints

- Existing projects that use only legacy string entries in `overlays:` regenerate unchanged.
- Existing manifests that contain only `overlays: string[]` continue to load unchanged.
- New manifests written for repeated selections must include both `overlays` and `overlaySelections` so old family-presence consumers keep working while compatibility flows can recover instance intent.
- `migrate` and `buildAnswersFromManifest` must prefer `overlaySelections` when present.
- Project-file serializer may canonicalize older category-sugar inputs into `overlays:` on write, matching current project-file-first behavior.
- No automatic migration step is required for existing project files; users opt in by authoring object-form entries.

### Implementation slices

1. **Schema and normalization plumbing**
    - Add mixed `overlays` entry types and normalized selection types.
    - Add overlay metadata `repeatable`.
    - Add parser validation for object-form entries, category-sugar exclusion, duplicate handling, reserved keys, and compose-only gating.

2. **Manifest compatibility**
    - Extend manifest types/schema with optional `overlaySelections`.
    - Update manifest generation, migration, and compatibility readers to preserve repeated intent without changing canonical authority.

3. **Overlay application expansion**
    - Introduce the internal overlay-application representation.
    - Keep dependency/conflict resolution family-level, then expand into applications without deduping named entries.

4. **Instance-aware substitution and materialization**
    - Extend substitution to object keys and instance-aware file naming.
    - Materialize compose files, devcontainer patches, copied overlay files, env docs, and summaries per application.
    - Ensure repeatable overlays do not rely on colliding runtime env variable names.

5. **Collision detection and output integration**
    - Add explicit pre-write checks for duplicate service names, duplicate volume names, duplicate copied destination paths, duplicate explicit host ports, and duplicate devcontainer keyed-map entries.
    - Make summary/export/doctor surfaces instance-aware.

6. **Catalog enablement**
    - Convert `postgres` to tokenized, instance-aware assets and set `repeatable: true`.
    - Leave all other overlays single-instance until explicitly audited and approved by follow-on work.

## Constraints

- Shared project config remains the canonical durable input.
- Multi-instance behavior must stay deterministic for the same project inputs.
- Existing single-instance compose behavior must remain compatible unless a project explicitly opts into object-form overlay entries.
- Compose port semantics from specs `024`, `041`, and `044` remain authoritative.
- Global/bootstrap defaults from spec `042` must not become hidden runtime authority.
- Manifest compatibility may preserve repeated intent, but manifest-first steady-state workflows remain out of authority.

## Preferences / Tradeoffs

- Prefer one backward-compatible `overlays:` surface over parallel top-level selection fields.
- Prefer explicit instance identity over position-based implicit naming.
- Prefer overlay opt-in (`repeatable: true`) over assuming the current catalog is safely repeatable.
- Prefer fail-fast validation over silently generating ambiguous or colliding compose output.
- Prefer manifest compatibility fields over weakening project-file-first authority.
- Prefer direct materialization over runtime env-hook cleverness when shared env names would collide across instances.

## Risks

- Mixed-array parsing and serializer changes widen the schema surface and can create accidental dedupe regressions if old overlay-ID-only helpers remain in the path.
- Repeatability is not just schema work; it requires overlay-source hardening, especially for compose service names, copied files, `runServices`, and devcontainer keyed maps.
- Extending substitution to object keys can affect existing parameterized devcontainer shapes and needs regression coverage.
- Manifest compatibility paths can silently lose repeated intent if any reader keeps trusting `overlays: string[]` alone.
- Summary, doctor, and export surfaces can drift if they stay family-level while generation becomes instance-aware.

## Acceptance Criteria

- [ ] Given a compose project whose `overlays:` array contains two object-form entries for the same repeatable overlay, when generation runs, then both instances are materialized and are not deduplicated away.
- [ ] Given shared top-level `parameters:` values for an overlay family and an object-form entry that overrides only one of those values, when generation runs, then that entry inherits unspecified values from the shared defaults and uses its own override for the changed value.
- [ ] Given a project uses only legacy string entries in `overlays:`, when generation runs after this feature ships, then generated output is unchanged from current behavior.
- [ ] Given a project mixes legacy string entries and object entries in one `overlays:` array for different overlay families, when generation runs, then the stack is accepted and each entry keeps its expected semantics.
- [ ] Given a project attempts to select the same overlay family through both a legacy string entry and one or more object entries, when validation runs, then generation fails before write with a clear same-family mixed-selection error.
- [ ] Given a project uses category-sugar overlay fields together with any object-form `overlays:` entry, when validation runs, then generation fails before write with a clear single-surface authoring error.
- [ ] Given a project attempts to repeat a singleton overlay by listing the same legacy string overlay twice, when validation runs, then generation fails before write with guidance to use named object entries on a repeatable overlay.
- [ ] Given a project attempts to use an object-form entry for a non-repeatable or non-compose overlay, when validation runs, then generation fails before write with a clear overlay-specific error.
- [ ] Given two object-form entries of the same repeatable compose overlay, when generation runs, then generated compose output, devcontainer references, and copied overlay assets use distinct effective identities everywhere uniqueness is required.
- [ ] Given repeated overlay entries resolve the same explicit host port, service name, volume name, copied destination path, or devcontainer keyed-map entry, when generation runs, then the tool fails before write with an error that identifies the specific entry name and conflicting field.
- [ ] Given a repeatable overlay still contains hard-coded single-instance identities, when validation or tests exercise that overlay, then release validation fails before the overlay can ship with `repeatable: true`.
- [ ] Given a plain-stack project attempts to use object-form repeated overlay entries, when validation runs, then the tool rejects it with a clear compose-only error in this slice.
- [ ] Given an interactive project-editing or discovery flow encounters a project file that contains object-form `overlays:` entries, when that flow cannot safely represent or edit those entries, then it exits gracefully before any lossy rewrite and tells the user to edit `superposition.yml` manually for named multi-instance overlay changes.
- [ ] Given multi-instance overlays affect plan, doctor, migrate, generated documentation, or summaries, when those surfaces describe the stack, then they refer to effective instance identities rather than collapsing all instances into one overlay-level entry.
- [ ] Given a manifest is generated for a repeated-overlay project, when compatibility flows read that manifest later, then repeated intent is recovered from the receipt without making the manifest canonical.
- [ ] All new or changed behavior is covered by automated tests at the appropriate level.
- [ ] Documentation, schema/help text, and workflow artifacts are updated to match the implemented or reviewed state.

## Test Plan

### Unit tests

- project-config parser tests for string entries, object entries, invalid object shape, duplicate singleton detection, same-family mixed selection, category-sugar exclusion, reserved-key rejection, and YAML numeric coercion.
- parameter resolution tests for shared defaults, CLI shared overrides, entry-local overrides, reserved built-in injection, and entry-local unknown-key rejection.
- substitution tests proving keys and values are both substituted for JSON/YAML object structures.
- manifest migration/reader tests proving `overlaySelections` is preferred when present and legacy `overlays` fallback still works.

### Integration tests

- composition test generating two `postgres` instances with distinct service names, volume names, ports, `runServices`, `remoteEnv`, and copied files.
- regression test proving legacy singleton `postgres` output is unchanged.
- collision tests for duplicate service name, volume name, host port, copied path, and keyed devcontainer map entries.
- manifest-backed compatibility test proving `generate -> load manifest -> migrate/build answers` preserves repeated intent.
- plan/doctor/summary tests proving instance names remain visible and are not collapsed to family-level summaries.

### Catalog validation

- fixture test for `overlays/postgres/**` proving tokenized assets materialize correctly for at least two named instances.
- generated-schema/docs tests covering `repeatable` metadata and mixed `overlays` schema.

### Validation commands

- targeted Vitest runs for schema/project-config/composer/manifest areas during development.
- `task validate` required before handoff.
- `task validate:generated` required once schema, overlays, or generated docs/schema outputs change.

## Out of Scope

- Plain-stack multi-instance support.
- Interactive authoring or editing UX for object-form named overlay entries; v1 expects manual editing of `superposition.yml` for this advanced configuration.
- A general-purpose templating language for per-instance overlay logic.
- Automatic migration of all existing projects onto a new instance-aware schema.
- Cross-project or user-home defaults for repeated overlay instances.
- Instance-targeted local config overrides or instance-targeted CLI `--param` syntax.
- Per-instance dependency targeting between sibling overlay instances.

## Assumptions

- The minimal correct product path is to evolve `overlays:` as the single overlay-selection surface.
- Shared top-level `parameters:` remains the project-wide default layer.
- V1 repeatability ships only for overlays explicitly audited and marked `repeatable: true`.
- The first implementation slice enables `postgres` only; additional repeatable overlays require follow-on specs or explicit scope updates.

## Open Questions

- None blocking implementation.

## Architecture Decision Impact

aligned

This design stays within ADR `001` and `docs/foundation.md`: shared project config remains canonical, manifest remains compatibility receipt only, local config does not gain authority, and generation stays deterministic. No ADR amendment is required for this slice.

## Approved Implementation Scope

Developer handoff is approved for this slice only:

- Treat `overlays:` as the single canonical overlay-selection surface in shared project config.
- Preserve legacy string shorthand for singleton selection.
- Add object-form `overlays[]` entries for named repeated instances with per-entry `parameters`.
- Keep top-level `parameters:` as the shared default layer and reserve instance-local overrides to object-form entries only.
- Keep category-sugar overlay fields load-only compatibility input and reject them when named object-form entries are present.
- Add optional manifest `overlaySelections` receipt support without changing manifest authority.
- Gate named entries behind `repeatable: true`, compose-only support, and explicit collision checks.
- Enable `postgres` as the only repeatable catalog overlay in v1 unless scope is explicitly expanded by a follow-on spec.
- Keep `plain` stack multi-instance support, interactive authoring/editing UX for object-form named entries, instance-targeted CLI `--param`, and broader catalog repeatability out of scope.

## Routing Decision

**PM → Developer**

Product scope, architecture constraints, acceptance criteria, and validation expectations are implementation-ready. No additional UX or ADR work is required before development.

## PM Brief for Developer and QA

### Developer handoff

Implement the mixed `overlays:` contract as the only canonical selection surface. Preserve legacy singleton behavior, add named object-form entries for repeatable compose overlays, maintain top-level `parameters:` as shared defaults, and ensure manifest compatibility captures repeated intent without weakening project-file-first authority.

Primary implementation surfaces are the project-config/schema types, manifest compatibility readers/writers, normalized selection and overlay-application plumbing, instance-aware parameter substitution/materialization, explicit collision detection, and `postgres` catalog hardening for v1 repeatability.

### QA focus

Verify both the new capability and the preserved boundaries:

- repeated named compose instances materialize distinctly without dedupe
- shared top-level defaults plus instance-local overrides resolve with the approved precedence
- legacy string-only projects regenerate unchanged
- same-family mixed shorthand/object selection and category-sugar + named-instance authoring fail early
- non-repeatable, non-compose, and plain-stack named entries are rejected
- interactive editing/discovery flows bail out safely rather than attempting a lossy rewrite when object-form named entries are present
- manifest compatibility preserves repeated intent through `overlaySelections`
- plan/doctor/summary/docs surfaces stay instance-aware where they report effective stack content

### Non-goals for implementation and QA

- no parallel top-level overlay-instance authoring field
- no plain-stack multi-instance support
- no interactive authoring/editing UX for object-form named entries in v1
- no instance-targeted CLI `--param` syntax
- no repeatability enablement for overlays beyond explicitly audited v1 scope
- no local-config expansion into a second instance-authoring surface

## Definition of Done

> Filled in progressively by each role. QA sets `Status: Final` only after verifying all gates.
> Full standards in `docs/definition-of-done.md`.

### Code

- [ ] No lint errors
- [ ] No type errors
- [ ] No debug or uncommitted temporary code
- [ ] Follows project conventions

### Tests

- [ ] Unit tests cover new pure logic
- [ ] Integration tests cover system boundaries
- [ ] All tests pass
- [ ] No unjustified skipped tests
- [ ] Failure and edge cases covered

### Documentation

- [ ] Public interfaces documented
- [ ] All new documentation in Markdown
- [ ] All diagrams in Mermaid
- [ ] README updated if behavior or setup changed
- [ ] Architecture docs updated if ownership or boundaries changed

### Changelog

- [ ] `CHANGELOG.md` updated under `[Unreleased]` for user-visible changes

### Workflow artifacts

- [ ] Acceptance criteria checked off (met only — unmet left unchecked with explanation)
- [ ] `## Implementation Notes` written
- [ ] Spec status and index synchronized
- [ ] QA feedback rows marked `Done` where applicable

### Architecture

- [ ] No ADR or foundation rules silently violated
- [ ] ADR created or amended if a standing decision was made or changed

### QA verification

- [ ] All above gates verified independently
- [ ] Acceptance criteria classified: MET / CLAIMED BUT FAILED / OPEN / UNCHECKED
- [ ] No regressions introduced
- [ ] Spec set to `Final`

## Implementation Notes

Awaiting PM finalization, then developer implementation.
