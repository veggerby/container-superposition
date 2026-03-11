# Implementation Plan: Project Configuration File

**Branch**: `002-superposition-config-file` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `docs/specs/002-superposition-config-file/spec.md`

**Note**: This plan follows the approved spec and constitution gates for the
active feature branch.

## Summary

Add repository-root project config support so `init` can load a committed
`.superposition.yml` or `superposition.yml` as the default source of truth for
clean generation, with full parity to supported generation inputs, including
customization surfaces such as custom container definitions, environment-related
settings, preset glue, and additional generated features. The design extends the
existing answer-merging flow instead of creating a second generation pipeline,
and keeps explicit manifest-based regeneration as a separate persisted-input
mode.

## Technical Context

**Language/Version**: TypeScript 5.3.3 on Node.js 20+  
**Primary Dependencies**: Commander, chalk, boxen, js-yaml, ora, Inquirer  
**Storage**: Filesystem-based project YAML config, `superposition.json`
manifests, overlay manifests, templates, and generated devcontainer artifacts  
**Testing**: Vitest unit and command tests, shell-based smoke tests, TypeScript
compile checks  
**Target Platform**: Node.js CLI on Linux, macOS, and Windows developer
environments  
**Project Type**: CLI scaffolding tool  
**Performance Goals**: Keep project-config discovery plus validation under 200
ms in representative repositories so initialization remains dominated by the
existing generation work rather than config loading  
**Constraints**: Preserve backward compatibility for interactive, flag-driven,
and explicit manifest-based flows; preserve source/dist path compatibility with
candidate-path resolution; maintain full parity between supported clean
generation inputs and project-config declarations; keep ambiguity and validation
failures user-facing and deterministic  
**Scale/Scope**: Single feature spanning `scripts/init.ts`, shared schema/types,
config-loading helpers, command and composition tests, documentation, and
generation parity for supported customization inputs

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design and
before implementation._

- [x] Spec exists at `docs/specs/002-superposition-config-file/spec.md`.
- [x] Spec is committed and reviewed before implementation tasks or code begin.
- [x] Plan scope, compatibility impact, and complexity notes match the approved
      spec.
- [x] Verification scope covers tests, smoke checks, and documentation updates
      needed for the change.
- [x] User-visible changes include documentation updates and an `[Unreleased]`
      `CHANGELOG.md` entry.

Gate status: Pass. Planning may proceed.

## Project Structure

### Documentation (this feature)

```text
docs/specs/002-superposition-config-file/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── init-project-config.md
└── tasks.md
```

### Source Code (repository root)

```text
scripts/
└── init.ts

tool/
├── __tests__/
│   ├── commands.test.ts
│   ├── composition.test.ts
│   ├── manifest-only.test.ts
│   ├── minimal-and-editor.test.ts
│   └── summary.test.ts
├── questionnaire/
│   └── composer.ts
├── schema/
│   ├── config.schema.json
│   ├── project-config.ts
│   └── types.ts
└── utils/
    └── summary.ts

docs/
├── examples.md
├── workflows.md
└── specs/

README.md
CHANGELOG.md
```

**Structure Decision**: Keep the feature centered on `scripts/init.ts`, because
input discovery, CLI parsing, manifest handling, and answer merging already
converge there. Add one focused schema/helper module for project-config
discovery and validation, extend existing shared types for parity with clean
generation inputs, and keep verification concentrated in existing command and
composition test suites.

## Phase 0: Research

### Research Goals

- Confirm the correct precedence between project config, direct command input,
  interactive completion, and explicit manifest mode.
- Define what “full parity to clean generation” means for supported
  customization inputs without introducing a second generation model.
- Confirm discovery, ambiguity handling, and validation boundaries for a
  repository-root YAML config.

### Research Outputs

- [research.md](research.md)

## Phase 1: Design

### Data Model

- [data-model.md](data-model.md)

### Contracts

- [init-project-config.md](contracts/init-project-config.md)

### Quickstart

- [quickstart.md](quickstart.md)

## Implementation Approach

1. Add repository-root project-config discovery and validation to the standard
   `init` flow without changing explicit manifest-based regeneration behavior.
2. Model project config as another partial-answer source that feeds the existing
   `QuestionnaireAnswers` merge path.
3. Extend the supported config shape so it can declare every supported
   clean-generation input, including customization surfaces already represented
   in the current answer and generation flow.
4. Preserve parity by ensuring project-config declarations yield the same final
   generated output as equivalent direct user selections.
5. Add regression coverage for no-config fallback, override precedence,
   manifest-isolation behavior, invalid config handling, ambiguity detection,
   and customization parity.
6. Update docs and changelog entries so the declarative workflow and its parity
   scope are user-visible and auditable.

## Verification Strategy

- Add or update automated coverage for:
    - repository-root project-config discovery
    - no-config fallback behavior
    - CLI-over-project-config precedence
    - explicit manifest isolation from project-config defaults
    - partial config completion through the existing questionnaire flow
    - invalid YAML, unsupported keys or values, conflicts, and dual-file
      ambiguity
    - parity for supported customization inputs such as custom images, preset
      glue, editor/minimal settings, environment-related settings, and additional
      generated features
- Run `npm test`.
- Run `npm run lint`.
- Run `npm run test:smoke` when generation behavior changes across representative
  stacks.
- Manually validate the scenarios in [quickstart.md](quickstart.md).

## Post-Design Constitution Check

- [x] Design preserves spec-first workflow and traces directly to the approved
      spec.
- [x] Design preserves overlay contract integrity by extending the existing
      answer and generation pipeline rather than inventing a parallel path.
- [x] Verification remains proportional to risk: automated tests, smoke
      validation where applicable, and documentation updates are planned before
      merge.
- [x] Documentation synchronization is explicit: `README.md`,
      `docs/workflows.md`, `docs/examples.md`, `quickstart.md`, and `CHANGELOG.md`.
- [x] Simplicity and compatibility remain intact: project config is a default
      persisted input source, explicit manifest mode remains separate, and
      candidate-path compatibility stays required.

## Complexity Tracking

No constitution violations require a design exception.
