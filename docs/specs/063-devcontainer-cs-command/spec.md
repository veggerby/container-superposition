---
spec: '063-devcontainer-cs-command'
title: 'Container Superposition Command in Generated Devcontainers'
status: 'Implemented'
phase: 'VALIDATING'
execution_profile: 'Standard'
review_mode: 'SELF_CHECK'
review_gate: 'SELF_CHECK'
owner: 'delivery-implementer'
created: '2026-10-06'
updated: '2026-10-06'
related_adrs:
    - 'docs/adr/adr001-project-file-first-replay-and-regeneration.md'
related_foundation:
    - 'docs/foundation.md'
related_specs:
    - 'docs/specs/002-superposition-config-file/spec.md'
    - 'docs/specs/020-superposition-yml-schema/spec.md'
    - 'docs/specs/032-init-and-regen-guided-flows/spec.md'
taxonomy:
    - 'PROJECT'
    - 'SCHEMA-FIELD'
    - 'COMPOSER-FEAT'
normative_references:
    - 'AGENTS.md'
    - 'docs/definition-of-done.md'
---

# Container Superposition Command in Generated Devcontainers

## Problem

A generated devcontainer does not inherently provide the `cs` executable that created it. A developer working inside a running generated container can therefore have the canonical `superposition.yml` in the mounted workspace but still be unable to run `cs regen` there without separately discovering and installing Container Superposition.

The project file needs one generic, stack-independent switch that makes the command available in generated devcontainers by default while preserving an explicit opt-out for projects that do not want tool installation during container creation.

## Why now

The project-file-first workflow treats `superposition.yml` as durable replay authority and routinely directs users to `cs regen`. Making that command available inside generated development environments closes a practical workflow gap and lets a running container replay its own canonical project intent without manual bootstrapping.

## Scope and Resolved Decisions

- The canonical task authority is this new spec. Existing project-file, schema, and regen specs define adjacent contracts but do not own default installation of the CLI inside generated containers.
- The shared project-file field is the top-level boolean `installCsCommand`.
- Omitting `installCsCommand` has the same behavior as `installCsCommand: true`; `false` is the explicit opt-out.
- The behavior is generic across plain and compose stacks and does not require selecting the Node.js or another specific overlay.
- The installed `cs` executable is the real `container-superposition` package command, not a wrapper or lookalike command.
- The generated setup must reuse the repository's existing Node/devcontainer feature, setup-script, lifecycle-command, and package-version capabilities rather than introducing a new package manager, runtime platform, or overlay.

## Acceptance Criteria

- [ ] DEVCONTAINER-CS-001: `superposition.yml` and `.superposition.yml` accept a top-level boolean `installCsCommand`; non-boolean values fail project-config loading before generated output is written.
- [ ] DEVCONTAINER-CS-002: When `installCsCommand` is omitted or `true`, generated plain and compose devcontainers include the runtime and lifecycle setup needed to install the real `container-superposition` package and expose its `cs` executable on the configured remote user's `PATH`, including projects that do not select the Node.js overlay.
- [ ] DEVCONTAINER-CS-003: After creation of an enabled generated devcontainer, `cs --version` succeeds and `cs regen` can execute from the mounted workspace using the repository project file as canonical replay authority.
- [ ] DEVCONTAINER-CS-004: The enabled setup installs an exact Container Superposition package version matching the generator version, reports installation or verification failure through the devcontainer lifecycle command, and composes without duplicating or weakening an already-selected Node runtime feature.
- [ ] DEVCONTAINER-CS-005: When `installCsCommand: false`, generation adds no runtime feature, setup script, or lifecycle command solely for the `cs` command, and the explicit `false` value survives supported project-config serialization and compatibility-manifest replay.
- [ ] DEVCONTAINER-CS-006: The generated project schema and `docs/superposition-yml.md` describe the field, its default-enabled behavior, its opt-out, and the resulting in-container `cs regen` workflow.
- [ ] DEVCONTAINER-CS-007: Automated unit and Behave coverage proves parsing, default-enabled generation, explicit opt-out, plain/compose behavior, version pinning, coexistence with the Node.js overlay, deterministic regeneration, and invalid-value rejection; a real-container smoke check proves the installed command and in-container regen path.
- [ ] DEVCONTAINER-CS-008: The implementation updates `CHANGELOG.md` under `[Unreleased]`, regenerates affected derived artifacts only through their owning commands, and passes the repository's generated-output, reproducibility, and mandatory validation gates.

## Non-goals

- Add a new CLI flag, questionnaire prompt, global-default field, or local-config field for this setting.
- Add a new overlay or require users to select the existing Node.js overlay.
- Define a proprietary in-container daemon, background updater, wrapper command, or runtime service.
- Automatically run `cs regen` during container creation or startup.
- Mutate Git index state or treat generated `.devcontainer/`, `dist/`, `docs/overlays.md`, or generated schema files as authored edit surfaces.
- Guarantee offline installation when the selected package version is not already available to the container's package manager.

## Ambiguities / Open Questions

- None blocking. The public field name, default, opt-out semantics, version relationship, supported stacks, and runtime outcome are resolved above.

## Evidence / References

- Source and planning baseline: `81c6694507b12a1123c211d14496d000ccb26f97`; branch `main...origin/main` was clean before shaping.
- `docs/foundation.md` — project-file authority, deterministic composition, normal generated devcontainer output, and source-owned generated artifacts.
- `docs/adr/adr001-project-file-first-replay-and-regeneration.md` — `superposition.yml` authority and `cs regen` replay model.
- `tool/schema/project-config.ts` and `tool/schema/types.ts` — current top-level project-config parsing, answer mapping, serialization, and manifest contracts.
- `tool/questionnaire/composer.ts` — current feature composition, setup-script copying, lifecycle-command merging, and package-version lookup.
- `templates/scripts/setup-utils.sh` — existing non-interactive Node/npm PATH setup used by generated lifecycle scripts.
- `overlays/nodejs/devcontainer.patch.json` and `overlays/devcontainer-cli/setup.sh` — existing official Node feature and npm global-install patterns.
- `tests/behave/features/core-generation.feature` — shared generated-output acceptance surface.

## Risks / Constraints

- Default-enabled behavior changes generated output and container creation for existing project files that omit the field. The explicit `false` opt-out, documentation, and changelog must make that compatibility impact visible.
- Installation requires package-registry/network access during container creation and can increase build/setup time. Failures must remain visible rather than silently leaving `cs` unavailable.
- The installer must work in non-interactive lifecycle shells and for the configured remote user without assuming the Node.js overlay was selected.
- Exact version pinning protects replay compatibility but means an unpublished or unavailable generator version cannot be installed; this should fail clearly.
- Custom images and existing feature/lifecycle configuration must continue to compose through standard devcontainer mechanisms.
- Root `.devcontainer/`, `dist/`, `docs/overlays.md`, and generated schema are not direct edit surfaces. Any changed generated artifact must come from its owning source and generation command.

## Implementation-Ready Handoff

The product contract is ready for implementation planning at `docs/specs/063-devcontainer-cs-command/plan.md`. Implementation must remain source-first and gather durable validation plus an independent review record before integration.

## Routing Decision

**Shaping → Planning → Direct implementation after spec approval.** Diagnosis-first work is not required because the gap and owning paths are established. Independent review is required because this is a default-on lifecycle and generated-output change that adds runtime/package installation to all generated devcontainers unless explicitly disabled.

## Implementation Authorization

On 2026-10-06, the task owner explicitly authorized delivery to proceed after recovery. This advanced spec 063 past its shaping/approval gate without changing the approved requirements, acceptance criteria, or scope. Implementation is recorded as complete; validation remains blocked only on the real-container evidence described in `artifacts/validation.md`.
