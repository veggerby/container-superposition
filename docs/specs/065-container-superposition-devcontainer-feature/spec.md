---
spec: '065-container-superposition-devcontainer-feature'
title: 'Installable Container Superposition Dev Container Feature for Existing Devcontainers'
status: 'Draft'
phase: 'SHAPING'
execution_profile: 'Standard'
review_mode: 'INDEPENDENT'
review_gate: ''
owner: 'delivery-interrogator'
created: '2026-10-09'
updated: '2026-10-09'
related_adrs:
    - 'docs/adr/adr001-project-file-first-replay-and-regeneration.md'
related_foundation:
    - 'docs/foundation.md'
related_specs:
    - 'docs/specs/060-local-devcontainer-amendment/spec.md'
    - 'docs/specs/063-devcontainer-cs-command/spec.md'
taxonomy:
    - 'COMPOSER-FEAT'
    - 'CLI-UX'
normative_references:
    - 'AGENTS.md'
    - 'docs/definition-of-done.md'
---

# Installable Container Superposition Dev Container Feature for Existing Devcontainers

## Problem

Developers with an existing, team-owned devcontainer cannot currently install Container Superposition as a standard Dev Container Feature to obtain the real `cs` command and deliberately use Container Superposition capabilities. The available in-container command contract applies to devcontainers generated from managed `superposition.yml`, while the local amendment workflow preserves a non-adopting repository's base configuration but does not provide an installable Feature as the bridge.

This prevents a developer from starting with an existing devcontainer, installing Container Superposition in the normal Dev Container Feature form, and then choosing the appropriate path: shared, managed `superposition.yml` intent for an adopting project, or a local-only amendment for personal changes to a non-adopting project's base.

## Why now

Container Superposition already has a project-file-first replay model, an explicit `cs regen` workflow, and a local amendment workflow. An installable Feature makes those capabilities reachable from existing devcontainers without treating Pi as the product objective or requiring every repository to adopt Container Superposition before a developer can use `cs`.

The lifecycle boundary must remain explicit: changing managed or amended intent does not alter a running container. The developer regenerates or refreshes first, then rebuilds.

## Scope and Resolved Decisions

- Deliver an installable Container Superposition Dev Container Feature for existing devcontainers. Its primary outcome is availability of the real `cs` command inside the container; it is not a Pi-specific capability.
- The Feature provides an opt-in route to Container Superposition overlays, subject to the structural compatibility contract below. The initial boundary is **personal enrichment**: it is interpreted leniently rather than as a conservative allowlist. A selected overlay is supported when its complete requested effects can safely compose with the discovered existing devcontainer; compatibility checks reject only a detected hard incompatibility (for example, a `stack:compose` overlay over a plain devcontainer).
- Compatibility is per selection and existing-devcontainer shape, not a promise that every catalog overlay works everywhere. A successful selection applies all of its requested effects; the tool must not silently drop, suppress, or partially apply an incompatible effect. When it cannot safely apply the complete selection, it must reject before producing unsafe output and explain the incompatible condition and next route.
- For an adopting project, shared overlay intent remains in canonical `superposition.yml` (or `.superposition.yml`) and takes effect only after the user runs `cs regen` and then rebuilds the devcontainer.
- For a non-adopting project, personal overlay intent must use the existing local amendment ownership model. It must preserve the team-owned base devcontainer and shared project intent; the user runs `cs amend refresh` and then rebuilds the personal alternate devcontainer.
- The Feature, devcontainer build, and lifecycle hooks must not automatically run `cs regen`, `cs amend refresh`, rebuild, reopen, or launch a devcontainer.
- Pi is neither required nor a special case in this work. Any Pi-specific overlay installation, setup, or documentation is out of scope.

## Acceptance Criteria

- [ ] AC-065-01: A developer can add the published Container Superposition Dev Container Feature to an existing supported devcontainer and, after its normal build/setup, use the real `cs` command without first converting that repository to a Container Superposition-managed project.
- [ ] AC-065-02: The Feature and its user guidance offer an explicit, opt-in route to use Container Superposition overlays rather than naming or requiring Pi. The initial boundary is personal enrichment and is evaluated leniently per selected overlay and existing-devcontainer shape, as enforced by AC-065-06.
- [ ] AC-065-03: In an adopting repository, a developer can express shared overlay intent in canonical `superposition.yml` or `.superposition.yml`; the documented required sequence is `cs regen`, then a devcontainer rebuild.
- [ ] AC-065-04: In a non-adopting repository with a supported existing devcontainer, a developer can express compatible personal overlay intent through the local amendment path; the documented required sequence is `cs amend refresh`, then rebuilding the personal alternate devcontainer. The team-owned base devcontainer and shared project intent remain unchanged.
- [ ] AC-065-05: Neither the Feature nor devcontainer build/lifecycle behavior automatically regenerates, refreshes, rebuilds, reopens, or launches a devcontainer. Managed or amended structural changes become effective only after the applicable user-run command and rebuild.
- [ ] AC-065-06: For each selected overlay and discovered existing-devcontainer shape, the delivered contract evaluates structural compatibility before unsafe output is produced. It accepts personal-enrichment selections unless a hard incompatibility is detected; for example, a `stack:compose` overlay over a plain devcontainer is rejected. A successful result applies the complete requested overlay effect. It must never silently drop, suppress, or partially apply incompatible effects; a rejection identifies the incompatible condition and gives actionable guidance. The contract must not imply universal catalog-overlay compatibility.
- [ ] AC-065-07: Documentation and CLI guidance distinguish the Feature installation from managed shared intent and local personal amendment intent, including the regenerate/refresh-before-rebuild sequence and the ownership boundary.
- [ ] AC-065-08: Automated regression and Behave coverage prove Feature installation, real `cs` availability, opt-in overlay access, both ownership paths where compatible, the explicit lifecycle boundary, preservation of the team-owned base in the amendment path, full application of a compatible selection, and a hard-incompatibility rejection with no silent partial effect. Derived artifacts are regenerated only through their owning commands, and required generated-output and validation gates pass.

## Non-goals

- Delivering Pi, a Pi overlay, or Pi-specific installation behavior.
- Promising that every current or future Container Superposition overlay is structurally compatible with every existing devcontainer.
- Automatically creating shared `superposition.yml` intent in a non-adopting repository, converting a team-owned devcontainer to Container Superposition ownership, or editing the team-owned base as part of a personal amendment.
- Automatically regenerating, refreshing, rebuilding, reopening, or launching a devcontainer after intent changes.
- Changing the existing `installCsCommand` contract for Container Superposition-generated devcontainers.
- Mutating the Git index, staging, committing, or otherwise making local amendment state shared.

## Ambiguities / Open Questions

- None blocking. The initial boundary is personal enrichment, evaluated leniently through compatibility checks rather than a named allowlist. The remaining implementation question is how to detect and report hard incompatibilities for the discovered devcontainer shape; it must preserve the complete-or-reject contract in AC-065-06 and belongs in planning, not further product shaping.

## Evidence / References

- `features/README.md` — repository convention and standard shape for an installable Dev Container Feature.
- `docs/specs/063-devcontainer-cs-command/spec.md` — existing generated-devcontainer `cs` installation contract, which remains unchanged.
- `docs/specs/060-local-devcontainer-amendment/spec.md` and `tool/commands/amend.ts` — local-only alternate-config ownership and current relocation of relative Dockerfile, build-context, Compose, and local Feature paths.
- `docs/foundation.md` and ADR `001` — project-file-first replay, standard editable devcontainer output, and no silent Git-index mutation.
- `docs/definition-of-done.md` — BDD, generated-output, documentation, and validation requirements for user-visible workflow changes.

## Risks / Constraints

- A Dev Container Feature must remain composable with an existing devcontainer rather than assume Container Superposition generated its base configuration.
- Overlay effects vary materially in structure. Catalog membership is not proof of compatibility: checks must recognize hard incompatibilities without regressing to a conservative allowlist, and must reject rather than silently omit any selected effect.
- Confusing installation of `cs` with selection, regeneration/refresh, or rebuilding can leave a user with stale configuration; guidance and test evidence must preserve the deliberate sequence.
- This changes user-visible devcontainer behavior across managed and local-only ownership models. Independent review is required before integration.

## Implementation-Ready Handoff

The product contract is ready for planning at `docs/specs/065-container-superposition-devcontainer-feature/plan.md`. The plan must define compatibility evidence and diagnostics for AC-065-06 without adding automatic lifecycle behavior, silent partial effects, or Pi-specific scope.

## Routing Decision

**Shaping → Planning.** A delivery plan is recommended next. Independent review is required because the work affects devcontainer Feature installation, generated output, local-only ownership, and user-visible command workflows.
