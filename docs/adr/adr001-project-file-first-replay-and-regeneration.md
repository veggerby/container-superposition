---
id: 001
title: Project-file-first replay and regeneration workflow
status: proposed
date: 2026-06-24
relationships:
  - type: relates-to
    spec: docs/specs/002-superposition-config-file/spec.md
  - type: relates-to
    spec: docs/specs/022-local-superposition-config/spec.md
  - type: relates-to
    spec: docs/specs/030-discovery-surface-and-docs-alignment/spec.md
  - type: relates-to
    spec: docs/specs/032-init-and-regen-guided-flows/spec.md
  - type: relates-to
    spec: docs/specs/033-cli-discovery-preview-and-fingerprint/spec.md
  - type: relates-to
    spec: docs/specs/034-doctor-diagnostics-and-remediation-ux/spec.md
  - type: relates-to
    spec: docs/specs/035-adopt-and-migrate-conversion-workflows/spec.md
---

# Context

Current implementation no longer matches `docs/architecture.md` statements like "no update command", "no state tracking", and "generate once, edit forever" as full product model.

Observed cross-cutting behavior:

- `tool/cli/run.ts` makes `regen` fail without repository project file, prefers project-file replay, writes/updates project file on `init`, and deprecates manifest replay for `regen`.
- `tool/commands/doctor.ts` uses project file as remediation authority for dependency fixes, parameter fixes, reproducibility regeneration, and drift checks.
- `tool/commands/migrate.ts` converts `superposition.json` into repository project file, then routes users to `regen`.
- `tool/commands/adopt.ts` writes repository project file plus compatibility manifest and preserved `custom/` patches.
- `docs/workflows.md`, `docs/filesystem-contract.md`, spec `002`, and spec `022` already describe repository-root project file and replay/remediation workflows.

Without written architecture authority, repo keeps re-litigating whether canonical input is manifest, project file, or generated output. Docs and command hints drift.

# Decision

1. Repository project file (`.superposition.yml` or `superposition.yml`) must be canonical durable input for shared generation intent, replay, and unattended remediation workflows.
2. `superposition.json` must remain generated artifact for reproducibility, inspection, compatibility, and migration support. It must not be treated as primary long-term shared source when repository project file exists.
3. `regen`, `doctor --fix`, reproducibility checks, dependency repairs, and similar replay/remediation flows must derive intended configuration from repository project file when available.
4. Manifest-driven replay may remain for compatibility and transition flows, but product UX must route users toward `migrate` + project-file-first replay rather than manifest-first steady-state workflows.
5. `init` may collect answers interactively, but successful runs must persist resulting shared intent back to repository project file unless feature scope explicitly documents exception.
6. Generated `.devcontainer/` output remains materialized artifact users may inspect and edit, but replay/remediation authority lives in repository project file plus preserved `custom/` escape hatches, not in ad hoc edits to generated files.
7. Tool may mutate explicit product artifacts needed for this workflow contract, including repository project file, generated manifest, generated output, backup directories, and ignore-file entries. Tool must not mutate Git index automatically; commands may warn and print manual `git rm --cached` guidance only.
8. Discovery, preview, adoption, migration, and next-step messaging must align with this model. Hints that imply direct-flag regeneration or manifest-first steady state should be treated as drift.

# Consequences

## Positive

- One authority for replay and safe auto-remediation.
- `doctor`, `regen`, `adopt`, and `migrate` share same mental model.
- Clear boundary between canonical intent, generated artifacts, and local-only enrichment.
- Easier docs alignment across onboarding, preview, and migration surfaces.

## Negative

- Existing architecture docs now need rewrite.
- Some legacy manifest-first docs, hints, and examples become explicitly deprecated.
- `adopt` still writing compatibility manifest creates temporary dual-artifact story until product decides whether manifest stays mandatory.

## Implementation impact

- Specs `032`, `034`, `035`: covered by this ADR. Feature work should not reopen canonical-input choice.
- Spec `033`: command hints and help text must align with project-file-first routing.
- Spec `030`: docs cleanup should treat this ADR as authority.
- Future proposal to auto-run `git rm --cached` or otherwise mutate Git index requires separate ADR or foundation rule.

# Quality attributes

## Reproducibility

Improves. Shared intent stored in stable repo file; generated output can be re-derived and verified.

## Operability

Improves. `doctor --fix` and `regen` get single remediation authority.

## UX clarity

Improves after docs cleanup. Current drift remains until docs and hints align.

## Reversibility

Mixed. Project-file-first model already implemented broadly, so ADR records current direction more than creating new coupling. Reversal would now be expensive.

## Safety

Improves by keeping Git-index mutation manual and by separating shared config from local-only enrichment.

# Evidence

- `docs/architecture.md`
- `docs/workflows.md`
- `docs/filesystem-contract.md`
- `tool/cli/run.ts`
- `tool/commands/doctor.ts`
- `tool/commands/adopt.ts`
- `tool/commands/migrate.ts`
- `docs/specs/002-superposition-config-file/spec.md`
- `docs/specs/022-local-superposition-config/spec.md`

# Open issues

- Repo lacks `docs/foundation.md`; future foundation file must align with or intentionally supersede this ADR.
- Product still needs explicit decision on whether compatibility manifest remains standard `adopt` output long-term or becomes optional transition artifact.
