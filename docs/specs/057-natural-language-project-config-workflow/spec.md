---
spec: '057-natural-language-project-config-workflow'
title: 'Natural-Language Project Config Authoring Workflow'
status: 'Final'
phase: 'INTEGRATED'
execution_profile: 'Standard'
review_gate: 'INDEPENDENT'
owner: 'delivery-lead'
created: '2026-09-11'
updated: '2026-09-11'
related_adrs:
    - 'docs/adr/adr001-project-file-first-replay-and-regeneration.md'
related_foundation:
    - 'docs/foundation.md'
related_specs:
    - 'docs/specs/018-init-project-file/spec.md'
    - 'docs/specs/033-cli-discovery-preview-and-fingerprint/spec.md'
    - 'docs/specs/037-cli-command-modularization/spec.md'
    - 'docs/specs/038-doctor-and-plan-command-modularization/spec.md'
    - 'docs/specs/039-project-local-contributor-skills-initiative/spec.md'
    - 'docs/specs/042-global-default-configuration/spec.md'
    - 'docs/specs/049-global-init-defaults-surface/spec.md'
taxonomy:
    - 'DOCS-GUIDE'
    - 'CLI-UX'
---

# Natural-Language Project Config Authoring Workflow

## Problem

Users and agents can ask for a Container Superposition project in natural language, such as “create container superposition project that supports nodejs,” but the repository does not yet provide a repo-local Pi workflow dedicated to translating that request into the same durable project-file outcome that `init` produces.

Today, contributors must either run `init` directly or infer the correct `superposition.yml` and `superposition.local.yml` shape from multiple docs and specs. The CLI also has no read-only command that exposes the one effective global-defaults document selected from the supported home files, so agents must reproduce filename precedence and parsing behavior themselves before authoring project config. That increases the chance that agent-authored project files drift from the canonical project-file-first model, choose Docker Compose unnecessarily, misread user-scoped defaults, or skip the CLI validation/discovery behavior that already exists.

## Why now

The repository already has project-local Pi assets for overlay workflows and contributor safety, and specs 042 and 049 established user-scoped global defaults for bootstrap-time `init`. The next gap is a user-facing Pi prompt and supporting skill, backed by the smallest safe read-only CLI defaults inspection command, so natural-language project-file authoring is reliable, discoverable, and aligned with existing `init` behavior without bypassing repository authority.

## Acceptance Criteria

- [x] AC-057-01: A repo-local Pi prompt exists for natural-language project setup requests and instructs the agent to produce or update repository-root `superposition.yml` and, when local-only preferences are needed, `superposition.local.yml` from the user’s stated intent.
- [x] AC-057-02: The delivered Pi workflow treats `superposition.yml` as canonical shared project intent and `superposition.local.yml` as optional machine-local enrichment, preserving the project-file-first boundary from foundation and ADR 001.
- [x] AC-057-03: For a request such as “create container superposition project that supports nodejs,” the workflow guides the agent to prefer the plain stack first and choose Compose only when the requested capabilities, selected overlays, or required local/default behavior materially require Compose.
- [x] AC-057-04: The workflow requires the agent to inspect existing project files before writing, update existing supported config files rather than creating conflicting duplicates, and avoid silently overwriting unrelated repository state.
- [x] AC-057-05: The workflow integrates with Container Superposition CLI behavior where practical, starting with the global-defaults inspection command and then using command output or validation to confirm available stacks, overlays, presets, schemas, and generated project-file compatibility rather than relying only on hand-written YAML knowledge.
- [x] AC-057-06: The workflow accounts for user-scoped global defaults and bootstrap defaults through the CLI inspection surface, while preserving their init-only/non-replay authority and without treating home-directory state as canonical project intent.
- [x] AC-057-07: The workflow makes ambiguity handling explicit: when the natural-language request lacks materially necessary choices, the agent asks focused questions; otherwise it records conservative assumptions in the output and generated files.
- [x] AC-057-08: The delivered prompt/skill guidance includes post-write verification expectations so changed project files are checked with the appropriate Container Superposition validation or dry-run/read-only command before handoff.
- [x] AC-057-09: Pi inventory documentation is updated so `.pi/README.md` truthfully lists any new prompt and skills delivered by this work.
- [x] AC-057-10: User-visible/contributor-visible documentation, command help, changelog, and automated coverage are updated where required by the Definition of Done for the new repo-local Pi workflow and CLI command.
- [x] AC-057-11: A read-only `defaults` CLI command exposes the validated effective global-defaults document selected from `~/.container-superposition.yml` and `~/.superposition.yml`, preserving the existing whole-file precedence in which `~/.container-superposition.yml` wins when both exist; scriptable JSON output identifies the selected source, any ignored lower-precedence source, and the normalized effective document.
- [x] AC-057-12: The `defaults` command succeeds with an explicit empty/no-source result when neither supported file exists, fails non-zero with a selected-path-specific diagnostic when the selected file is invalid, does not expand authored values, and never writes project, local, manifest, generated-output, home-directory, or Git-index state.
- [x] AC-057-13: Reading home state through `defaults` is inspection only: it does not make either home file an input to `plan`, `regen`, `doctor`, project replay, remediation, or runtime behavior, and it does not merge defaults into an existing repository project file.

## Non-goals

- Changing the `init`, `regen`, `doctor`, `plan`, `list`, or `explain` command contracts; this spec adds only the read-only `defaults` command.
- Expanding the global defaults schema or changing global defaults discovery precedence, parsing, validation, or init application semantics.
- Making home-directory global defaults a replay, remediation, or runtime authority.
- Replacing interactive `init`; the Pi workflow should assist natural-language project-file authoring, not remove the CLI path.
- Adding or changing overlays, presets, base templates, generated `.devcontainer/` output, or project schema fields as part of this spec.
- Prescribing the implementation design, internal prompt wording, or exact helper decomposition beyond the observable workflow outcomes above.

## Ambiguities / Open Questions

- No requirements-level questions remain open. Planning owns the minimal command-module placement, normalized output model, and test decomposition without broadening the command into an editor, merger, or replay input.
- The level of automated test coverage for static Pi prompt/skill assets is not yet established in this repository; planning should identify whether lint-only, fixture checks, or prompt/skill inventory tests are appropriate.

## Evidence / References

- `AGENTS.md` — spec-first requirement for new repo-local Pi workflow assets and mandatory validation expectations.
- `docs/foundation.md` — `superposition.yml` / `.superposition.yml` are canonical shared intent; `superposition.local.yml` is local-only enrichment; generated output remains standard devcontainer configuration.
- `docs/definition-of-done.md` — user-visible workflow and contributor guidance changes require synchronized documentation, tests where appropriate, and validation.
- `docs/specs/018-init-project-file/spec.md` — `init --project-file` establishes the baseline project-file outcome that the Pi workflow should align with.
- `docs/specs/033-cli-discovery-preview-and-fingerprint/spec.md` — read-only commands establish the repository's machine-readable output and preview-first conventions.
- `docs/specs/037-cli-command-modularization/spec.md` and `docs/specs/038-doctor-and-plan-command-modularization/spec.md` — command entries remain thin and command-specific logic stays in command-owned modules.
- `docs/specs/039-project-local-contributor-skills-initiative/spec.md` — project-local skills must be operational playbooks and Pi inventory must remain truthful.
- `docs/specs/042-global-default-configuration/spec.md` — global defaults are user-scoped, stack-aware where approved, and bootstrap-only.
- `docs/specs/049-global-init-defaults-surface/spec.md` — approved `initDefaults` surface and exclusions for user-scoped global defaults.
- Pi docs: `docs/skills.md` and `docs/prompt-templates.md` — project-local skills and prompts are discoverable from `.pi/skills/` and `.pi/prompts/`.

## Risks / Constraints

- Natural-language authoring could create project files that look plausible but do not match current CLI/schema behavior unless the workflow verifies with the tool.
- Compose may be over-selected by agents unless the prompt/skills encode the plain-first preference clearly.
- User-scoped defaults are hidden home-directory state; the inspection command and workflow must not let them undermine deterministic replay from repository project files or accidentally imply that inspection grants replay authority.
- Global defaults may contain personal or sensitive literals in local-template fields; command output must be explicit user-requested stdout, avoid telemetry or persistence, and the workflow must not repeat suspected secrets in handoff prose.
- Existing repo files may contain team intent; the workflow must merge/update conservatively and surface conflicts rather than overwrite.
- Because this changes contributor-visible Pi assets, implementation must keep `.pi/README.md`, changelog, and validation evidence synchronized as required by repo guidance.

## Notes

- The delivery plan is maintained at `docs/specs/057-natural-language-project-config-workflow/plan.md`.
- The newly authorized public command contract and home-state disclosure surface warrant an `INDEPENDENT` review recommendation in planning even though the implementation remains read-only and schema-neutral.
