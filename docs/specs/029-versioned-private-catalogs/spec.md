# Feature Specification: Versioned Private Overlay and Preset Catalogs

**Spec ID**: `029-versioned-private-catalogs`
**Taxonomy**: `PROJECT`
**Created**: 2026-06-15
**Author**: Workflow Orchestrator
**Status**: Draft
**Input**: Opportunity backlog item 2 from `docs/opportunities/README.md` — add versioned private overlay/preset catalogs for platform teams, covering source options, pinning, trust model, precedence, upgrade workflow, and compatibility with current `superposition.yml` / `regen` architecture.

---

## Request Classification

Technical and cross-cutting feature. PM draft now reconciled with architecture pass requirements in this document.

## Problem Statement

Current product ships single built-in overlay/preset registry inside CLI package. Platform teams that want private, opinionated overlays or presets must currently fork tool, patch internal overlays into source tree, or copy generated output per repo.

That blocks:

- central platform ownership of shared stacks
- independent catalog release cadence
- reproducible pinning for teams and CI
- explicit trust and upgrade workflow for organization-specific overlays/presets

Need: project-level way to consume private overlay/preset catalogs as versioned dependencies while preserving deterministic `superposition.yml` → `regen` model.

## User Goals

### Platform team

- Publish internal overlay/preset catalog without forking CLI.
- Release catalog updates independently.
- Control which teams can trust and adopt catalog content.
- Encode org standards in presets and overlays.

### Application team

- Declare catalog dependency in `superposition.yml`.
- Pin exact catalog version for reproducible local and CI runs.
- Select private overlays/presets alongside built-ins.
- Upgrade intentionally through reviewable config changes.

### Maintainer / security owner

- Make trust boundary explicit because catalog content can write files, patch config, and run scripts.
- Prevent silent override of built-in overlays/presets.
- Keep credentials out of committed project config.

## Current Behavior and Constraints

### Current behavior

- Overlay registry loads from bundled `overlays/*/overlay.yml` plus bundled presets.
- `superposition.yml` supports `preset` and `presetChoices`, but no external `catalogs` field.
- Config validation, schema generation, `list`, `explain`, `doctor`, and composition assume single bundled registry.

### Relevant implementation constraints

1. Validation currently assumes bundled overlay/preset enums.
2. Schema generation currently emits static enums from bundled registry.
3. Preset loading assumes bundled filesystem paths.
4. Overlay loading assumes local filesystem under single overlays root.

Any shipped feature must work consistently across `init`, `regen`, `doctor`, `list`, `explain`, and schema-aware authoring.

## Scope

### In scope

- Project-level declaration of additional catalogs.
- Supported source types for v1.
- Pinning and integrity rules.
- Trust model and credential handling rules.
- Namespace and collision behavior.
- Effective merged-registry behavior across commands.
- Upgrade workflow expectations.
- Validation/schema behavior for dynamic catalog-backed IDs.

### Out of scope

- Public marketplace/discovery service.
- Auto-upgrading floating refs.
- Storing tokens/keys in project file.
- Replacing bundled catalog.
- Arbitrary plugin execution beyond existing overlay/preset model.
- Transitive catalog dependencies in v1.

## Must Preserve

- Projects with no external catalogs behave exactly as today.
- `superposition.yml` remains canonical committed source of intent.
- `regen` remains non-interactive and deterministic in CI.
- Built-in bundled catalog remains available without extra setup.

## Proposed Product Behavior

### 1. `superposition.yml` gains `catalogs:`

Project config gains top-level `catalogs:` array. Each entry declares enough data for deterministic replay:

- stable catalog ID
- namespace
- source type
- source location
- immutable pin
- resolved identity / integrity material
- optional subpath
- optional explicit override policy

Illustrative shape:

```yaml
catalogs:
    - id: acme-platform
      namespace: acme
      source:
          type: git
          url: ssh://git.example.com/platform/superposition-catalog.git
          ref: v1.4.2
          commit: 9f4c2d1
          subpath: catalog
```

### 2. Narrow v1 source matrix

Supported v1 source types:

1. `git`
    - exact commit required for deterministic replay
    - tag may be retained as advisory metadata
2. `archive`
    - pinned HTTPS artifact
    - checksum required
3. `path`
    - local or repo-relative authoring/dev source only
    - treated as non-portable for shared team config unless explicitly repo-relative

Unsupported in v1:

- OCI artifacts
- npm package catalogs
- arbitrary command fetchers

### 3. Pinning and integrity rules

- Shared/committed remote catalogs MUST use immutable identity.
- Floating refs like `main`, `master`, or `latest` MUST be rejected.
- `git` catalogs MUST record exact commit SHA.
- `archive` catalogs MUST record checksum.
- Resolved catalog identity used for generation MUST be recorded in generated receipt/manifest for audit and doctor diagnostics.

### 4. Trust model

External catalogs are trusted-code input.

Therefore:

- bundled catalog is implicitly trusted
- external catalogs require explicit declaration in project file
- credentials come from environment, Git, or host tooling — never project file
- fetch/auth/integrity failures fail closed
- tool MUST clearly surface that catalog content can affect generated files and scripts

### 5. Namespace and collision rules

Default behavior: no silent collisions.

- Built-in IDs remain unqualified.
- External catalogs MUST be addressable through namespace-qualified IDs (example: `acme/web-api`).
- Unqualified external IDs MUST NOT silently shadow built-ins.
- Explicit override policy, if supported, must be narrow, reviewable, and deterministic.
- Same project file must resolve same precedence in every command surface.

### 6. Upgrade workflow

Minimum supported workflow:

1. team edits pinned catalog version in `superposition.yml`
2. tool resolves new catalog deterministically
3. `plan`/`regen`/`doctor` surfaces changed catalog identity and invalid references if upgrade removed or renamed items
4. generated receipt records old/new effective catalog identities for troubleshooting

Manual pin editing is acceptable in v1. Dedicated upgrade helper command is follow-on, not required.

### 7. Dynamic validation behavior

Because full registry is no longer purely bundled/static, validation becomes two-stage:

1. parse and minimally validate raw project config structure, including `catalogs:`
2. resolve effective registry from bundled + external catalogs
3. run overlay/preset ID validation against resolved registry

Static schema/editor validation may remain partially relaxed for dynamic IDs so long as runtime validation remains precise and actionable.

## Technical Design Snapshot

### Ownership boundaries

- **Project config loader** owns raw `catalogs:` parsing and structural validation.
- **Catalog resolver** owns fetch/cache/materialize/verify for external catalogs.
- **Registry loader** owns merging bundled and external overlays/presets into one effective registry.
- **Command surfaces** (`init`, `regen`, `doctor`, `list`, `explain`) consume same resolved registry contract rather than bespoke loading paths.
- **Schema generation/editor support** owns static authoring experience and must degrade safely when dynamic IDs are present.

### Data flow

1. discover repository project file
2. parse project config including `catalogs:` declarations
3. structurally validate catalog declarations
4. resolve and verify each catalog source
5. materialize catalog contents into local cache/work area
6. load bundled registry + external registry entries
7. detect namespace/collision/override violations
8. validate selected overlays/presets against effective registry
9. execute existing composition/planning/list/explain flows using same effective registry object
10. emit receipt metadata including resolved catalog identities

### Interfaces and contracts

#### Project config contract

- Add top-level `catalogs:` field.
- Catalog entry must include `id`, `namespace`, and `source`.
- Source-specific required fields enforced after `type` discrimination.

#### Effective registry contract

Resolved registry MUST carry origin metadata per overlay/preset:

- source catalog ID
- namespace
- resolved version/identity
- built-in vs external source kind

Origin metadata must be available to diagnostics and explain/list output when relevant.

#### Cache/materialization contract

- Catalog resolution may use local cache.
- Cache MUST be content-addressed or identity-addressed by immutable pin.
- Cache hits MUST not change effective output compared with fresh fetch of same identity.
- Failed or partial fetch MUST not leave ambiguous mixed-version state.

### Risks and mitigations

| Risk                                              | Impact                               | Mitigation                                                                            |
| ------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| Dynamic registry breaks static schema enums       | weaker editor UX or false validation | use two-stage validation; relax static enum where needed; keep runtime errors precise |
| Silent shadowing between built-in and private IDs | wrong overlay/preset resolved        | require namespace-qualified external IDs by default; explicit override only           |
| Non-deterministic remote sources                  | CI drift                             | require immutable pins and integrity metadata                                         |
| Credential leakage into config                    | security issue                       | only use ambient auth/environment; reject inline secrets                              |
| Different commands resolve different registries   | trust break                          | centralize resolution behind one shared effective-registry pipeline                   |
| Stale cache causes confusing behavior             | hidden drift                         | identity-addressed cache plus doctor/diagnostic visibility                            |

### Implementation slices

1. config/schema slice — raw `catalogs:` parsing and structural validation
2. resolver slice — fetch/verify/materialize supported source types
3. registry slice — merge bundled + external catalogs with origin metadata and collision rules
4. command integration slice — route `init`, `regen`, `doctor`, `list`, `explain`, `plan` through same resolved registry
5. diagnostics slice — receipt metadata, doctor findings, user-facing error/help text
6. editor/schema slice — clear authoring story for dynamic IDs

### Test strategy

- unit tests for catalog declaration validation per source type
- unit tests for pin rejection (`main`, `latest`, missing checksum, missing commit)
- unit tests for namespace/collision/override rules
- unit tests for effective-registry merge and origin metadata
- integration tests for `regen`, `list`, `explain`, `doctor`, and `plan` using sample external catalogs
- regression tests proving same project file yields same effective registry across commands
- failure-path tests for auth failure, checksum mismatch, missing overlay ID after upgrade, and stale cache reuse

## Non-Goals Within v1 Slice

Even if technically possible, v1 does not require:

- project-hosted marketplace UI
- separate lockfile
- multiple versions of same catalog in one project
- automatic migration from built-in preset IDs to external ones
- signed catalogs if immutable pins + integrity checks satisfy org policy

## Success Signals

- Platform team publishes reusable private catalog without forking CLI.
- Two repos pinned to same catalog identity generate same result in CI.
- Upgrade happens through reviewable config diff, not cache drift.
- Collision behavior fails closed.
- Same project file yields same effective registry in every command surface.

## Open Questions

1. Should repo-shared config allow any non-repo-relative `path` source, or should shared configs reject `path` entirely outside local/dev mode?
2. Does v1 need explicit built-in allowlist/host allowlist policy in addition to immutable pins and integrity checks?
3. Should override policy exist in v1 at all, or should v1 require strict namespace-only usage with no shadowing escape hatch?

## Acceptance Criteria

| #     | Criterion                                                                                                                                                                                    |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1  | Product supports project-level declaration of zero or more additional overlay/preset catalogs in canonical `superposition.yml` without changing behavior for projects that omit `catalogs:`. |
| AC-2  | Shared remote catalog declarations require immutable pinning; floating refs are rejected.                                                                                                    |
| AC-3  | Supported v1 source types are explicitly limited to `git`, `archive`, and `path`, with unsupported kinds rejected clearly.                                                                   |
| AC-4  | Credentials are never stored in project file; authentication relies on environment or host tooling.                                                                                          |
| AC-5  | External catalog overlays/presets are selectable through existing project-file concepts rather than parallel selection model.                                                                |
| AC-6  | Built-in and external catalog collisions fail closed by default; no silent shadowing occurs.                                                                                                 |
| AC-7  | Every command surface that consumes registry data resolves same effective merged registry for same project file.                                                                             |
| AC-8  | Generated receipt/manifest records resolved catalog identities sufficient for audit and troubleshooting.                                                                                     |
| AC-9  | Validation supports dynamic catalog-backed IDs through two-stage resolution and produces actionable errors when referenced items are missing.                                                |
| AC-10 | Upgrade workflow based on reviewable pin changes is documented, and failures caused by removed/renamed catalog items are surfaced clearly.                                                   |
| AC-11 | Automated tests cover successful resolution plus failure paths for pinning, integrity, collisions, and cross-command consistency.                                                            |

## Architecture Decision Impact

New ADR needed.

Reason: feature changes trust boundary, registry resolution order, validation model, cache/materialization responsibilities, and cross-command ownership model.

## Routing Decision

**PM → Developer**

Reason: product scope, UX constraints, technical ownership, risks, implementation slices, and test strategy now explicit. ADR creation remains required alongside implementation planning, but no further discovery is blocking spec readiness.
