---
spec: '060-local-devcontainer-amendment'
title: 'Local Devcontainer Amendment Without Adoption'
status: 'Implemented'
phase: 'INTEGRATION_APPROVED'
execution_profile: 'Standard'
review_mode: 'INDEPENDENT'
review_gate: 'approved'
owner: 'delivery-lead'
created: '2026-09-16'
updated: '2026-09-16'
related_adrs:
    - 'docs/adr/adr001-project-file-first-replay-and-regeneration.md'
related_foundation:
    - 'docs/foundation.md'
related_specs:
    - 'docs/specs/022-local-superposition-config/spec.md'
    - 'docs/specs/035-adopt-and-migrate-conversion-workflows/spec.md'
    - 'docs/specs/036-doctor-git-tracking-safety/spec.md'
taxonomy:
    - 'CLI-UX'
    - 'PROJECT'
normative_references:
    - 'AGENTS.md'
    - 'docs/definition-of-done.md'
---

# Local Devcontainer Amendment Without Adoption

## Problem

A developer may work in a repository that already has a functional, team-owned `.devcontainer/` setup but does not use Container Superposition. That developer may still need personal devcontainer additions, such as bind-mounted Pi coding agent state, local credentials directories, shell aliases, editor settings, or helper environment variables.

Today the safe Container Superposition paths do not fit that situation:

- `adopt` is a conversion workflow that creates shared Container Superposition intent for the repository.
- `superposition.local.yml` enriches repositories that already have shared Container Superposition config.
- editing the repository's existing `.devcontainer/` risks changing team-owned setup or committing machine-specific state.

The missing capability is a local-only amendment workflow that lets one developer use Container Superposition to layer personal devcontainer additions onto an existing repository devcontainer without asking the team to adopt Container Superposition.

## Why now

The Pi coding agent use case makes this gap concrete: a work repository can have a suitable devcontainer, while one developer wants local bind-mounted volumes and settings for Pi inside that container. The developer should be able to keep the repository's devcontainer setup intact, avoid committing local-only generated changes, and avoid introducing shared `superposition.yml` / `.superposition.yml` / `superposition.json` authority into a non-adopting team repository.

This needs a new spec because spec `022-local-superposition-config` assumes a repository already has shared Container Superposition project config, while this request targets repositories that explicitly do not adopt Container Superposition.

## Scope

Provide a documented CLI workflow for creating, refreshing, inspecting, and removing local-only devcontainer amendments for repositories that have an existing devcontainer but no shared Container Superposition project-file authority.

The workflow must preserve the repository's existing devcontainer behavior as the base setup and add only the requesting developer's local amendment layer.

## Resolved Decisions

- The canonical task authority is this new spec, not spec `022`, because the target repository intentionally lacks shared Container Superposition config.
- The feature serves non-adopting repositories with existing devcontainers; it must not require or imply team migration to Container Superposition.
- Local amendment state and any amended devcontainer artifacts are local-only and must be protected from accidental Git commits.
- Existing repository devcontainer files remain team-owned input. The workflow must not silently rewrite them as Container Superposition-owned generated output.
- The existing `adopt` workflow remains the path for teams that want Container Superposition to manage the repository devcontainer going forward.

## Acceptance Criteria

- [x] AC-060-01: Given a repository with an existing functional `.devcontainer/` and no `superposition.yml`, `.superposition.yml`, or `superposition.json`, a user can run a documented Container Superposition workflow that creates a local-only amendment layer without running `adopt` or creating shared Container Superposition project intent.
- [x] AC-060-02: The workflow retains the repository's existing devcontainer setup as the base configuration; after applying an amendment, team-owned devcontainer behavior remains available and local additions are layered on top rather than replacing the base setup.
- [x] AC-060-03: Local amendments support the same kinds of personal enrichment needed for local tooling setup, including bind mounts, environment values, shell customization, and editor/devcontainer patch-style settings where those concepts are already supported by Container Superposition local configuration.
- [x] AC-060-04: The workflow protects local-only amendment inputs and amended generated artifacts from accidental Git commits by default, with clear guidance when ignore rules or tracked files make that protection incomplete.
- [x] AC-060-05: The tool does not mutate the Git index, stage files, untrack files, or commit files as part of applying, refreshing, inspecting, or removing a local amendment. Any required Git cleanup is reported as explicit manual guidance.
- [x] AC-060-06: The workflow does not create or modify shared `superposition.yml`, `.superposition.yml`, or team-intended `superposition.json` files in a non-adopting repository. Any compatibility metadata needed for the local amendment must be local-only and clearly labeled as such.
- [x] AC-060-07: Re-running the workflow is deterministic for the same repository devcontainer, local amendment input, and filesystem/Git state; it updates the local amendment result without duplicating entries or accumulating stale local-only artifacts.
- [x] AC-060-08: Removing or disabling the local amendment restores the repository to using its original devcontainer setup, without requiring changes to team-owned devcontainer files and without deleting unrelated repository content.
- [x] AC-060-09: If the repository lacks a supported existing devcontainer, contains ambiguous devcontainer entrypoints, or cannot be safely amended, the workflow stops before writes and explains whether the user should fix the existing devcontainer, use `adopt`, or start a normal Container Superposition project workflow instead.
- [x] AC-060-10: Human-readable command output and documentation make the ownership model explicit: existing devcontainer equals team-owned base, local amendment equals personal uncommitted layer, and `adopt` equals team migration path.
- [x] AC-060-11: Automated regression coverage proves the non-adopting local amendment path, Git-safety behavior, repeat refresh behavior, removal behavior, and at least one Pi-style bind-mount use case.
- [x] AC-060-12: Behave coverage is added or updated because this introduces user-visible CLI/workflow behavior around devcontainer generation or amendment.
- [x] AC-060-13: User-facing documentation and CLI help describe when to use this workflow instead of `adopt`, how to keep artifacts local-only, and how to remove the amendment.
- [x] AC-060-14: `CHANGELOG.md` records the new user-visible workflow under `[Unreleased]` according to repository changelog rules.

## Non-goals

- Converting the repository or team to Container Superposition ownership.
- Replacing, redesigning, or deprecating `adopt`, `migrate`, `init`, `regen`, or `superposition.local.yml` for repositories that already use shared Container Superposition config.
- Inferring a complete overlay selection from the existing devcontainer or producing a shared project file; that remains `adopt` territory.
- Automatically mutating the Git index, running `git rm`, staging files, committing files, or editing remote repository settings.
- Making local amendments reproducible for the whole team or CI; this feature is intentionally personal and machine-local.
- Supporting arbitrary non-devcontainer container systems outside the repository's existing devcontainer entrypoint.
- Prescribing command names, file names, storage layout, or implementation modules in this spec.

## Ambiguities / Open Questions

- The exact public command shape and local artifact names are intentionally left for planning/design, provided the acceptance criteria above are met and the user-facing ownership model remains explicit.
- Planning should confirm which existing devcontainer shapes are supported initially, especially plain `devcontainer.json`, compose-backed devcontainers, multiple compose files, and devcontainer paths outside the default `.devcontainer/` directory.
- Planning should decide whether the workflow only warns about missing ignore rules or may safely append ignore entries, while preserving the no-Git-index-mutation rule.

## Evidence / References

- Source revision before spec authoring: `913fc6cadd1e4ece9ec14ccf7e28de197665ac90`; working tree was clean before creating this spec.
- `docs/foundation.md` — generated devcontainer output remains standard and editable; the tool must not silently take ownership of unrelated repository files or mutate Git index state.
- `docs/definition-of-done.md` — user-visible command/workflow changes need BDD coverage, documentation, changelog, and validation.
- `docs/specs/022-local-superposition-config/spec.md` — existing local config authority for repositories already using shared Container Superposition config.
- `docs/specs/035-adopt-and-migrate-conversion-workflows/spec.md` and `docs/adopt.md` — current conversion path for repositories that want Container Superposition ownership.
- `docs/specs/036-doctor-git-tracking-safety/spec.md` — existing safety precedent for local-only config and generated-output Git tracking diagnostics without automatic Git index mutation.

## Risks / Constraints

- The workflow touches devcontainer launch behavior in repositories not otherwise managed by Container Superposition, so ownership boundaries and rollback must be unambiguous.
- VS Code/devcontainer tooling may have constraints on how alternate or layered devcontainer files are selected; planning must validate the supported user path without relying on users to commit local-only generated output.
- Git safety is central: local bind mounts or credentials paths must not leak into team commits.
- The feature must not weaken the project-file-first model for adopting repositories; it is a separate local amendment path for non-adopting repositories.
- Public CLI/workflow behavior and devcontainer output behavior make independent review appropriate.

## Implementation Notes

- Compatibility amendment: `amend` accepts VS Code-style JSONC comments and trailing commas only when reading the team-owned base devcontainer input. Local amendment YAML and local receipt/state parsing remain governed by their existing strict contracts.

## Implementation-Ready Handoff

The product contract is ready for planning. A delivery plan should define the public workflow shape, supported devcontainer forms, local artifact and ignore strategy, evidence mapping for each acceptance criterion, and rollback/removal behavior. Keep file-level sequencing and implementation design in `plan.md`, not in this spec.

## Routing Decision

**Shaping → Planning**

A delivery plan is recommended next at `docs/specs/060-local-devcontainer-amendment/plan.md`. Independent review is recommended before merge because this introduces user-visible CLI/workflow behavior that affects devcontainer startup and local-only Git-safety expectations.
