---
spec: '058-hermit-ontology-reasoner-overlay'
title: 'HermIT Ontology Reasoner Overlay'
status: 'Draft'
phase: 'SHAPING'
execution_profile: 'Standard'
review_gate: 'INDEPENDENT'
owner: 'delivery-interrogator'
created: '2026-09-14'
updated: '2026-09-14'
related_adrs:
    - 'docs/adr/adr001-project-file-first-replay-and-regeneration.md'
related_foundation:
    - 'docs/foundation.md'
related_specs: []
taxonomy:
    - 'OVERLAY-NEW'
---

# HermIT Ontology Reasoner Overlay

## Problem

Developers working with OWL ontologies need a reproducible devcontainer capability for running the HermIT reasoner against local ontology files. The repository currently has semantic-web-adjacent support through Apache Jena Fuseki, but no dedicated ontology reasoner overlay and no HermIT-specific guidance for required dependencies, related overlay choices, or command-line verification.

Without a built-in HermIT overlay, contributors must hand-install a Java runtime, locate and install the reasoner distribution themselves, and maintain project-specific notes for how HermIT relates to nearby Container Superposition overlays. That weakens reproducibility and makes ontology reasoning harder to discover for users selecting overlays through the normal catalog.

## Why now

The task envelope explicitly requests adding an overlay to support HermIT for ontologies, including required dependencies, links to other overlays, and required packages to install. Repository inspection at source revision `4dceff2` found specs `001`-`057` and no existing HermIT spec or overlay, so this should be shaped as a new overlay feature before implementation.

## Acceptance Criteria

- [ ] AC-058-01: A new built-in overlay is available for HermIT ontology reasoning and is discoverable through the normal Container Superposition overlay catalog with an appropriate ontology/semantic-web oriented name, description, category, and tags.
- [ ] AC-058-02: The overlay provides a command-line HermIT capability inside the generated devcontainer so users can run reasoning or consistency checks against ontology files stored in the workspace.
- [ ] AC-058-03: The overlay declares the Java runtime dependency through existing overlay dependency semantics, requiring the repository's `java` overlay rather than leaving users to infer the runtime requirement manually.
- [ ] AC-058-04: The overlay documentation identifies the required non-overlay packages, tools, or distribution artifacts that are installed to make HermIT usable, including version or source information sufficient for reviewers to assess reproducibility.
- [ ] AC-058-05: The overlay documentation links to relevant related overlays, at minimum the Java overlay as the required runtime dependency and Apache Jena Fuseki as a complementary semantic-web/triplestore service when users need local SPARQL or RDF storage.
- [ ] AC-058-06: The overlay preserves existing `java` and `fuseki` behavior: selecting HermIT must not change Java development defaults, Fuseki service configuration, compose networking, ports, or seed-loading behavior except through normal explicit overlay composition.
- [ ] AC-058-07: The overlay includes user-facing examples for common ontology workflows, such as checking an OWL ontology file and understanding how HermIT complements, rather than replaces, RDF triplestore or SPARQL workflows.
- [ ] AC-058-08: The overlay is validated through the repository's overlay quality gates, including generated overlay docs, generated schema updates where required, generated-output reproducibility checks, and doctor validation with no reproducibility errors.
- [ ] AC-058-09: User-visible coverage is added or explicitly justified according to the Definition of Done, including Behave coverage for overlay discovery/generated-output behavior when the overlay changes user-visible generation.
- [ ] AC-058-10: The changelog records the new HermIT ontology reasoner overlay under the current Unreleased user-visible changes.

## Non-goals

- Adding an ontology editor, Protégé desktop integration, or browser-based ontology authoring UI.
- Adding a long-lived HermIT service, exposed network port, or Docker Compose service unless a later approved requirement demonstrates that HermIT needs one.
- Changing Apache Jena Fuseki, adding automatic Fuseki/HermIT integration, or making HermIT a dependency of Fuseki.
- Changing project-file schema semantics, overlay category enums, dependency resolution behavior, or compose network behavior beyond what an ordinary new overlay already requires.
- Supporting every OWL reasoner or semantic-web tool; this slice is specifically about HermIT support.
- Prescribing file-level implementation details, installer script structure, or internal helper decomposition in the spec.

## Ambiguities / Open Questions

- The exact HermIT distribution source, version pinning strategy, and executable command shape should be resolved during planning/implementation discovery with reproducibility and maintainability evidence.
- It is assumed v1 is a plain dev overlay, not a compose overlay, because the requested capability is command-line ontology reasoning and no service, port, or background process was requested.
- It is assumed the overlay id should be `hermit` unless planning finds an existing naming convention conflict or a clearer catalog name is required.

## Evidence / References

- `AGENTS.md` — adding an overlay requires source overlay metadata/docs, generated docs/schema handling, BDD consideration, changelog updates, and validation.
- `docs/foundation.md` — overlays are modular generated-output inputs and generated docs/schema are regenerated from source.
- `docs/definition-of-done.md` — overlay and user-visible generation changes require synchronized docs, validation, generated-output checks, and review expectations.
- `docs/adr/adr001-project-file-first-replay-and-regeneration.md` — generated output must remain derived from project-file authority and standard devcontainer artifacts.
- `docs/specs/README.md` — specs `001`-`057` exist; no HermIT spec was listed at source revision `4dceff2`.
- `overlays/java/overlay.yml` and `overlays/java/README.md` — existing Java overlay provides the likely required runtime dependency.
- `overlays/fuseki/overlay.yml` and `overlays/fuseki/README.md` — existing semantic-web/triplestore overlay is complementary but not a HermIT reasoner.
- Repository search for `HermIT`, `ontology`, `OWL`, and `reasoner` under `docs/specs` and `overlays` found no existing HermIT overlay/spec match at source revision `4dceff2`.

## Risks / Constraints

- HermIT installation source and licensing must be reviewed before implementation to avoid adding stale, unverifiable, or redistribution-problematic artifacts.
- Because this is a user-visible overlay and generated-output change, planning should route validation through `task validate:generated` or equivalent focused commands plus generated docs/schema/reproducibility checks.
- Independent review is recommended because the change introduces a new tool download/runtime path and user-visible overlay catalog behavior.
