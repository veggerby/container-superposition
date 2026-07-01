---
name: cli-command-delivery
description: CLI command delivery guidance for container-superposition. Use when creating, modifying, or reviewing command code, command tests, command help/UX, or command-adjacent docs.
---

# CLI Command Delivery

Use this skill when work touches `tool/commands/**`, `tool/cli/**`, `scripts/**`, command-level tests, command-facing presentation, or command-adjacent docs and help text.

## When to use this skill

- Adding, modifying, or refactoring any command entry, command module, or command helper
- Changing command options, flags, argument parsing, or output formatting
- Changing or adding command-facing UX (`tool/ux/**`)
- Updating command tests in `tool/__tests__/**`
- Updating help text, walkthroughs, or examples tied to command behavior
- Adding path-sensitive logic where source vs. compiled execution paths differ

## Read first

Before making any changes, read these in order:

1. `AGENTS.md` — authoritative project contributor rules and validation commands
2. `docs/foundation.md` — engineering boundary authority (command ownership, thin-orchestrator rules)
3. `docs/definition-of-done.md` — validation gates and completion criteria
4. `docs/adr/adr001-project-file-first-replay-and-regeneration.md` — project-file-first and generated-artifact safety authority
5. `docs/specs/033-cli-discovery-preview-and-fingerprint/spec.md` — `discover → inspect → preview → write` ladder and current read-command contracts
6. `docs/specs/034-doctor-diagnostics-and-remediation-ux/spec.md` — doctor mode labels, verdict-first framing, bucket ordering, fix-plan-before-mutation contract
7. `docs/specs/037-cli-command-modularization/spec.md` — adopt command modularization boundaries
8. `docs/specs/038-doctor-and-plan-command-modularization/spec.md` — doctor/plan command modularization boundaries
9. The live command module(s), tests, and help/docs being changed

## Primary files and surfaces

| Surface                     | Path              |
| --------------------------- | ----------------- |
| Command entry files         | `tool/commands/`  |
| CLI wiring                  | `tool/cli/`       |
| Init/regen/doctor scripts   | `scripts/`        |
| Command-level UX            | `tool/ux/`        |
| Command tests               | `tool/__tests__/` |
| Compiled output (read-only) | `dist/`           |

## Required workflow

### 1. Preserve thin-orchestrator command boundaries

Where `adopt`, `doctor`, or `plan` have been modularized into orchestrator-plus-modules structure (as required by specs 037 and 038):

- Keep command entry files as thin orchestrators that delegate to modules
- Do not re-monolithize them by inlining module logic back into the entry file
- Keep analysis, presentation, and write-side logic separated where specs 037 and 038 require those seams

Authority: `docs/specs/037-cli-command-modularization/spec.md`, `docs/specs/038-doctor-and-plan-command-modularization/spec.md`

### 2. Preserve one normalized behavior model per command flow

Where the current spec requires semantic parity across output modes:

- Text output, JSON output, preview state, and write state must come from the same normalized command-local model
- Do not introduce duplicate recomputation paths for the same semantic result — paths that can drift apart over time
- If you add a new output format, derive it from the single normalized model, not from a separate recomputation

Authority: `docs/specs/033-cli-discovery-preview-and-fingerprint/spec.md`, `docs/specs/034-doctor-diagnostics-and-remediation-ux/spec.md`

### 3. Preserve current command UX contracts

Unless an approved spec explicitly changes them, keep these contracts intact:

- `plan --diff` headline classes: `First write`, `Change intent and regenerate`, `Replay canonical intent`, `Cleanup stale generated files`, `No material change`
- `doctor` verdict-first framing, mode labels, bucket ordering, and fix-plan-before-mutation contract per spec 034
- `discover → inspect → preview → write` command ladder per spec 033 (surface `list`, `explain`, `plan`, `plan --verbose`, `plan --diff` as the safe path before `init` or `regen`)

Authority: `docs/specs/033-cli-discovery-preview-and-fingerprint/spec.md`, `docs/specs/034-doctor-diagnostics-and-remediation-ux/spec.md`

### 4. Preserve project-file-first behavior

- Treat `superposition.yml` / `.superposition.yml` as canonical shared intent
- Treat `superposition.json` as compatibility/reproducibility output rather than the primary steady-state source when a project file exists
- Keep replay, drift detection, remediation, and next-step guidance aligned with ADR 001

Authority: `docs/adr/adr001-project-file-first-replay-and-regeneration.md`

### 5. Preserve stable command-entry exports

If internal extraction moves helpers or refactors internals:

- The command entry path must continue exporting the surfaces that current tests or CLI wiring rely on
- Use direct re-exports if necessary — do not break callers silently

### 6. Preserve source-vs-compiled path safety

When adding path-sensitive logic (file resolution, `__dirname`-based paths):

- Follow the `OVERLAYS_DIR_CANDIDATES` pattern in `scripts/init.ts` — use a candidate array covering both source and compiled locations
- Test that new path logic works from both `tsx`-run source and compiled `dist/` output

Authority: `AGENTS.md` ("Path resolution" rule)

### 7. Update adjacent surfaces in the same change

When command behavior or wording changes:

- Update command help text and inline examples in the same commit
- Update `CHANGELOG.md` when the change is user-visible
- Update relevant Pi guidance (`.pi/skills/`, `.pi/README.md`) if contributor workflow instructions change
- Update or add tests covering the changed behavior

## Do not do this

- Edit `dist/` directly — it is compiled output; fix the source
- Silently change a command contract already specified in a spec without an approved spec covering the new behavior
- Add path-sensitive logic that works only from source (`scripts/`) or only from compiled (`dist/`) output
- Allow text/JSON/preview/write state to drift by duplicating the recomputation
- Ship user-visible command changes without updating the matching docs, help, and `CHANGELOG.md`
- Re-monolithize a command that specs 037 or 038 required to be modularized

## Escalate when

- Requested command behavior conflicts with a current spec or with ADR 001 — escalate before changing behavior
- A user-visible command contract change has no approved spec — escalate rather than treating it as a copy edit
- You cannot place a helper within command-local vs shared ownership without changing established layer boundaries — escalate rather than making an ad-hoc decision
- Work conflicts with `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, ADR 001, or an approved feature spec — escalate; do not invent a local exception

## Validation

Select validation by change type:

| Change type                                                   | Required validation                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------ |
| Formatting-affecting file changes                             | `npm run lint:fix` then `npm run lint`                       |
| Any shipped change                                            | `npm run lint`                                               |
| Targeted command or pure-logic change                         | Targeted tests for changed area at minimum                   |
| Broad command refactor or broad workflow change               | `npm test`                                                   |
| Compiled CLI behavior or source/compiled path-sensitive flows | `npm run build` + verify from compiled output                |
| Overlay-source changes affecting generated overlay docs       | `npm run docs:generate`                                      |
| Overlay or schema-type changes affecting generated schema     | `npm run schema:generate`                                    |
| User-visible or tooling changes affecting generated output    | `npm run init -- regen`                                      |
| Generated-output workflows affected before merge              | `npm run init -- doctor` — no reproducibility errors allowed |

Full command reference: `AGENTS.md` → Commands section.

## Related skills

- `overlay-development` — when the primary scope is overlay files rather than command code
- `canonical-docs-alignment` — when the scope shifts to README/docs/help cleanup against the canonical workflow
- `workflow-sync` — when spec metadata, changelogs, or Pi inventory need updating as a result of command work
- `dogfooding-safety` — when the change touches generated output, root `.devcontainer/`, or regen/doctor flows
