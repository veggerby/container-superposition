---
id: 002
title: Versioned private catalog resolution and namespace semantics
description: Defines how external overlay and preset catalogs are declared, resolved, materialized, and merged with the built-in registry in v1
category: API & Integration Contracts
status: proposed
date: 2026-08-10
review_date: ''
pr: ''
deciders:
    - Workflow Orchestrator
relationships:
    clarifies:
        - docs/specs/029-versioned-private-catalogs/spec.md
    aligns_with:
        - docs/adr/adr001-project-file-first-replay-and-regeneration.md
---

## Context

`container-superposition` previously resolved overlays and presets only from the built-in repository catalog. Spec 029 adds project-declared external catalogs that must work across `init`, `regen`, `doctor`, `list`, `explain`, and `plan` without breaking project-file-first replay.

External catalogs are trusted-code input: they can add files, patches, scripts, imports, and preset expansion rules that affect generated output and doctor reproducibility.

## Problem

How should v1 resolve and merge built-in plus external catalogs while preserving deterministic replay, preventing silent replacement of built-ins, and keeping command behavior consistent?

## Decision Drivers

- Project-file-first replay must stay deterministic
- External selections must never silently replace built-ins
- Read/write/doctor/discovery commands must share one effective registry model
- v1 must stay small enough to validate and support safely

## Constraints and Assumptions

- `superposition.yml` remains the canonical shared input
- `superposition.json` remains a generated compatibility and audit artifact
- Existing composer and explain flows currently assume one materialized overlays root
- v1 does not introduce an override mechanism or transitive catalog dependencies

## Considered Options

- Keep separate built-in and external registries throughout command execution
- Merge external catalogs into one materialized effective registry with namespace-qualified IDs
- Allow external catalogs to override built-ins when explicitly configured

## Decision

Chosen option: "Merge external catalogs into one materialized effective registry with namespace-qualified IDs".

V1 must resolve built-in plus external catalogs into one effective registry before command-specific behavior runs.

External overlays and presets must be addressable only by namespace-qualified IDs such as `acme/web-api` and `acme/starter`. Built-in IDs must stay unqualified. V1 must not provide any built-in shadowing or override path.

The effective registry must be materialized as a single overlays root so existing composition, preview, and explain flows consume the same catalog view without command-local resolution forks.

## Required Architecture / Rules

### Ownership and Boundaries

- Project config loading owns structural `catalogs:` validation
- Catalog resolution owns source fetch/materialization and immutable-identity enforcement
- Registry loading owns namespace rewriting, preset rewriting, and merged registry construction
- Commands must consume the same resolved registry contract rather than re-resolving catalogs differently per command

### Allowed Dependencies

- Commands may depend on the resolved overlays context only
- Manifest generation may record resolved catalog identities from that context
- Doctor reproducibility may rebuild from the same resolved context

### Forbidden Couplings

- Commands must not silently fall back from qualified external IDs to built-in IDs
- External catalogs must not replace built-in IDs through precedence tricks or override flags in v1
- Project files must not embed credentials or inline secrets for catalog access

### Contracts and Interfaces

- `catalogs:` entries support `git`, `archive`, and `path` only
- `git` entries must provide an immutable `commit`; floating refs such as `main`, `master`, `latest`, `head`, and `trunk` are rejected
- `archive` entries must provide `sha256:<hex>` integrity metadata
- `path` entries are repo-relative only in v1; absolute paths and out-of-repo traversal are rejected as non-portable shared intent
- External catalog local IDs are rewritten into namespace-qualified IDs during materialization
- External preset definitions must be rewritten so required overlays, user-choice options, and parameterized overlay references point at the qualified external IDs
- Generated `superposition.json` must record resolved catalog identities used for the write

## Quality Attribute Impact

### Security and Privacy

- Improves by rejecting inline credentials and failing closed on invalid pinning or integrity metadata
- V1 relies on ambient Git/host auth plus immutable pins and checksums; no separate host allowlist is added in this slice

### Reliability and Resilience

- Improves by forcing one effective registry contract across commands
- Materialized cache paths are identity-addressed so repeated runs with the same pin use the same catalog content

### Maintainability and Evolvability

- Improves by keeping namespace policy centralized instead of scattering ad hoc collision rules across commands
- Keeps future signed catalogs, upgrade helpers, or stricter trust policy as additive follow-on slices

## Consequences

### Positive Consequences

- Cross-command registry behavior stays consistent
- Built-ins remain stable and unqualified
- External catalogs can coexist safely without silent replacement

### Negative Consequences

- Dynamic IDs relax static schema precision compared with built-in-only enums
- Materialization adds cache and rewrite logic that must stay reproducible
- `path` catalogs are intentionally conservative in v1 because portability wins over convenience

## Implementation Impact

- Schema must add `catalogs:` and relax overlay/preset ID validation for qualified external IDs
- Command entrypoints must resolve the shared overlays context before executing
- Doctor and replay paths must include resolved catalog identities when rebuilding manifests

## Compliance Signals

We will consider this ADR implemented when:

- `init`, `regen`, `doctor`, `list`, `explain`, and `plan` all succeed against the same repo-relative path catalog fixture using namespace-qualified IDs
- Runtime validation rejects unqualified external IDs, floating git refs, and invalid archive checksums
- Generated `superposition.json` records resolved catalog identity metadata

## Revisit Conditions

- Need for signed catalogs, host allowlists, or broader remote trust restrictions
- Need for absolute/local-only path catalogs outside shared repo intent
- Need for explicit override or replacement semantics in a later version
