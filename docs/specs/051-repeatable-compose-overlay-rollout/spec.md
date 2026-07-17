---
spec: '051-repeatable-compose-overlay-rollout'
title: 'Broaden Repeatable Compose Overlays Beyond PostgreSQL'
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
    - 'docs/specs/050-compose-overlay-instances/spec.md'
normative_references:
    - 'docs/superposition-yml.md'
    - 'docs/specs/050-compose-overlay-instances/spec.md'
    - 'docs/specs/051-repeatable-compose-overlay-rollout/artifacts/compose-overlay-audit.md'
    - 'tool/schema/project-config.ts'
    - 'tool/questionnaire/composer.ts'
    - 'overlays/postgres/overlay.yml'
    - 'overlays/redis/overlay.yml'
    - 'overlays/fuseki/overlay.yml'
    - 'overlays/sqlserver/overlay.yml'
    - 'overlays/nats/overlay.yml'
    - 'overlays/rabbitmq/overlay.yml'
    - 'overlays/minio/overlay.yml'
    - 'overlays/mongodb/overlay.yml'
    - 'overlays/keycloak/overlay.yml'
---

# Broaden Repeatable Compose Overlays Beyond PostgreSQL

**Spec**: `051-repeatable-compose-overlay-rollout`
**Status**: Draft
**Created**: 2026-07-17
**Priority**: P1
**Product Approval**: approved
**Architecture Review**: approved
**UX Review**: not-needed

## Description

Expand repeatable compose overlays beyond `postgres` through an audited phased rollout. This spec keeps the `050` object-form overlay contract intact, defines which overlay classes are safe to broaden now, and blocks broader enablement until catalog audits and namespacing risks are resolved.

## Evidence

- `docs/specs/050-compose-overlay-instances/spec.md` — establishes the canonical named-instance contract and intentionally limits v1 repeatability to `postgres`.
- `docs/superposition-yml.md` — documents repeatability as an audited overlay capability rather than a compose-wide guarantee.
- `docs/specs/051-repeatable-compose-overlay-rollout/artifacts/compose-overlay-audit.md` — inventories current compose-capable overlays and their coupling risks.
- `tool/schema/project-config.ts` — already gates named entries behind `repeatable: true`, compose-only support, declared parameters, and reserved-key checks.
- `tool/questionnaire/composer.ts` — already handles application-level materialization and collision checks, but dependency resolution remains family-level.

## Problem Statement

Users can now repeat `postgres`, but they still cannot predict which other compose overlays are officially safe to repeat. Without a rollout contract, the catalog invites overreach: docs appear more general than the supported catalog, overlay authors lack a clear audit bar, and dependency-bound overlays risk being marked repeatable before singleton assumptions are removed.

## User Goals / Jobs To Be Done

- Run more than one instance of common infrastructure overlays without cloning overlay source.
- Know which overlays are officially repeatable and which remain singleton-only.
- Get deterministic failures when an overlay still depends on singleton or shared-topology behavior.
- Expand the catalog without weakening project-file-first determinism.

## Success Signals

- Additional audited overlays beyond `postgres` become officially repeatable.
- Docs and schema continue to describe repeatability as overlay-specific, not compose-wide.
- Deferred and blocked overlays fail closed with clear guidance.
- No implicit instance-to-instance dependency model is introduced in this rollout.

## Confidence

- Overall confidence: medium-high
- Confidence notes: `050` already provides the core schema/composer primitives for low-risk self-contained overlays; the main uncertainty is catalog hardening, not product-contract shape.

## User Stories

**US-1** As a compose-stack user, I want more repeatable infrastructure overlays than `postgres`, so I can model realistic local stacks without forking overlays.

**US-2** As a maintainer, I want repeatability to be opt-in and audit-backed, so the catalog only advertises capabilities that are actually safe.

**US-3** As a platform owner, I want rollout to happen in phases, so low-risk overlays ship first and dependency-bound families wait for explicit design.

## Goals

- Define the product contract for expanding repeatable compose overlays beyond `postgres`.
- Classify compose overlays by rollout readiness.
- Limit the next implementation slice to the smallest safe audited set.
- Preserve all `050` behavioral boundaries unless this spec explicitly broadens them.

## Non-Goals

- Blanket repeatability for all compose overlays.
- Any new project-file syntax beyond the `050` object-form `overlays:` contract.
- Instance-targeted dependency selection or auto-binding between repeated overlays.
- Repeatable support for `plain` stacks.
- New authority for manifest, local config, or global defaults as named-instance authoring surfaces.
- Solving generic cross-instance service discovery, secrets, or shared-topology orchestration.

## Authority and References

This spec must align with:

- `docs/foundation.md`
- `docs/adr/adr001-project-file-first-replay-and-regeneration.md`
- `docs/specs/050-compose-overlay-instances/spec.md`
- `docs/superposition-yml.md`

## Rollout Contract

### Preserved baseline from spec `050`

- Shared project config remains the only canonical authoring surface.
- Object-form named entries remain the only contract for repeated compose overlays.
- Named entries stay gated by overlay metadata `repeatable: true`.
- Family-level dependency resolution remains unchanged.
- Unsupported overlays continue to fail closed.

### Overlay classes

#### Class A — self-contained single-service overlays

Characteristics:

- one primary service;
- no `requires` dependency on another overlay family;
- no internal sidecar peer references;
- no copied/provisioned assets that require shared singleton destinations;
- no hard-coded hostname or endpoint contract that must remain globally fixed.

Class A overlays are eligible for this rollout first.

#### Class B — internally coupled multi-service overlays

Characteristics:

- one overlay materializes multiple services or admin surfaces;
- sibling services refer to one another by service name or shared config;
- one instance fans out into multiple user-visible resources.

Class B overlays are deferred until namespacing is proven across every intra-overlay reference.

#### Class C — dependency-bound or shared-topology overlays

Characteristics:

- overlay `requires` another overlay family and assumes a singleton peer;
- overlay-owned files or config encode shared stack-role semantics;
- repeated instances would require explicit “bind to which peer?” behavior.

Class C overlays remain singleton-only in this spec.

### Repeatability audit criteria

An overlay may be marked `repeatable: true` only when all of the following are true:

1. It already supports `compose` and does not require `plain` parity in this slice.
2. It does not require unresolved named-peer binding.
3. Every instance-sensitive identifier can be deterministically namespaced, including:
    - compose service keys;
    - `hostname` values;
    - named volumes and service volume references;
    - `depends_on`, health checks, and peer URLs;
    - `runServices`;
    - devcontainer-facing service references and env values;
    - overlay metadata labels derived from service identity;
    - copied/provisioned file paths and file contents.
4. Repeated instances do not depend on one shared runtime env variable whose meaning changes per instance.
5. Remaining collision classes are caught before write rather than deferred to Docker Compose runtime failure.
6. Docs and schema can truthfully advertise the overlay as repeatable without implying broader family support.

If any criterion fails, the overlay remains singleton-only.

## Phased Rollout

### Phase 1A — approved next implementation slice

Add repeatable support beyond existing `postgres` for:

- `redis`
- `fuseki`
- `sqlserver`
- `nats`

Why these four:

- they fit the Class A profile from the audit;
- none declares `requires`;
- their remaining work is overlay hardening and validation, not a new dependency model.

### Phase 1B — deferred Class A reassessment

Do not include these in the first slice, but reassess them next using the same audit bar:

- `qdrant`
- `minio`
- `rabbitmq`
- `mailpit`

Reasons for deferral:

- `qdrant` and `minio` are still low-risk candidates but add richer endpoint surfaces;
- `rabbitmq` still hard-codes singleton-oriented hostname/labels;
- `mailpit` needs parameter-surface cleanup before repeatability is implementation-ready.

### Phase 2 — multi-service overlays

Hold until Phase 1 proves the audit pattern for overlays that materialize more than one coordinated service:

- `mongodb`
- `mysql`
- `redpanda`
- `comfyui`
- `jaeger`
- `jupyter`

### Phase 3 — dependency-bound or shared-topology overlays

Keep blocked in this spec:

- `keycloak`
- `grafana`
- `prometheus`
- `alertmanager`
- `loki`
- `promtail`
- `tempo`
- `otel-collector`
- `otel-demo-nodejs`
- `otel-demo-python`
- `open-webui`
- `localstack`
- `ollama`

These overlays require either explicit named dependency targeting, stronger topology design, or a deliberate long-term singleton policy.

## Validation Expectations

Implementation for any newly repeatable overlay must demonstrate that:

- named entries are still rejected unless overlay metadata sets `repeatable: true`;
- existing `050` gating remains intact for stack type, declared parameters, reserved `CS_` keys, and same-family selection rules;
- repeated instances do not collide on materialized service names, volumes, host ports, copied destinations, `runServices`, or devcontainer keyed-map entries;
- plan, doctor, manifest-backed, and similar reporting surfaces stay instance-aware;
- generated docs and schema only advertise the audited repeatable subset.

## Constraints

- Shared project config remains canonical.
- Deterministic regeneration must be preserved for the same project input.
- This rollout must not invent implicit instance-aware dependency semantics.
- Docs and schema must not imply universal repeatable support.

## Preferences / Tradeoffs

- Prefer a small audited rollout over broad catalog enablement.
- Prefer explicit overlay-class boundaries over overlay-by-overlay exceptions.
- Prefer blocking dependency-bound overlays over guessing peer-binding behavior.
- Prefer overlay-source hardening and validation over composer special cases.

## Risks

- Prematurely marking overlays repeatable will create runtime collisions that bypass the deterministic contract.
- Presentation surfaces can regress even when generation is correct if they collapse named instances back to family-level summaries.
- Multi-port or sidecar-adjacent overlays may appear simple while still leaking singleton assumptions through hostnames, labels, or env values.

## Acceptance Criteria

- [ ] The follow-on scope after spec `050` is documented as a phased audited rollout, not blanket compose-wide enablement.
- [ ] The spec defines explicit audit criteria that must be met before any overlay gains `repeatable: true`.
- [ ] The catalog is grouped into rollout classes with evidence preserved in `artifacts/compose-overlay-audit.md`.
- [ ] The approved next implementation slice is limited to `redis`, `fuseki`, `sqlserver`, and `nats`, in addition to existing `postgres` support.
- [ ] `qdrant`, `minio`, `rabbitmq`, and `mailpit` are explicitly deferred to a later Class A reassessment rather than bundled into the first slice.
- [ ] Dependency-bound and shared-topology overlays are explicitly blocked from repeatable enablement in this spec.
- [ ] Validation expectations cover collision safety, instance-aware reporting surfaces, and docs/schema gating.
- [ ] The routing decision is implementation-ready with no additional UX or ADR work required before development.
- [ ] `docs/specs/README.md` and `docs/specs/taxonomy.md` remain synchronized with the finalized draft metadata.

## Test Plan

### Unit tests

- validation coverage for `repeatable: true` enablement on audited Phase 1A overlays only;
- materialization coverage for service names, hostnames, volumes, labels, and copied-path namespacing for newly repeatable overlays;
- negative coverage proving deferred or blocked overlays still fail closed when authored as named entries.

### Integration tests

- one two-instance generation fixture per Phase 1A overlay proving distinct services, volumes, ports, `runServices`, and devcontainer-facing references;
- regression coverage proving singleton behavior for non-repeatable overlays remains unchanged;
- reporting-surface coverage proving instance identities remain visible after generation and reload.

### Generated-artifact validation

- `npm run docs:generate`
- `npm run schema:generate`
- `task validate:generated`

## Out of Scope

- Implementing Phase 2 or Phase 3 overlay families.
- Designing named dependency targeting.
- Changing the `050` object-form authoring model.
- QA certification of an implementation.

## Assumptions

- `postgres` remains the reference implementation for repeatable compose overlays.
- Existing `050` schema/composer primitives are sufficient for self-contained single-service overlays.
- The smallest safe rollout is more valuable than a larger but ambiguous first batch.

## Open Questions

- After Phase 1A, should Phase 1B ship as one follow-on batch or split further by endpoint richness versus singleton-cleanup work?
- For Class C overlays, is the long-term direction explicit named dependency targeting or a deliberate singleton-only policy for topology-centric families?

## Architecture Decision Impact

aligned

This rollout stays within ADR `001` and `docs/foundation.md`: project config remains canonical, repeatability remains overlay-scoped, dependency resolution remains family-level for this slice, and no new cross-cutting architecture decision is introduced.

## Routing Decision

**PM → Developer**

Product scope, rollout phases, architecture boundaries, and validation expectations are aligned and implementation-ready. No additional UX or ADR work is required before development planning for Phase 1A.

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

## Implementation Notes <!-- developer-owned when implemented -->

_Not yet implemented._
