# Feature Taxonomy

This index maps all specs to their feature categories. Maintained by the `tool-pm` agent — update whenever a new spec is added.

## Taxonomy categories

```
OVERLAY          — Adding or modifying individual overlays
  OVERLAY-NEW    — New overlay
  OVERLAY-ENRICH — Enriching an existing overlay
  OVERLAY-FIX    — Correctness fix to an overlay

PRESET           — Preset bundles
  PRESET-NEW     — New preset
  PRESET-ENRICH  — Enriching an existing preset

COMPOSER         — Core composition pipeline (composer.ts, merge logic, imports)
  COMPOSER-FEAT  — New composition behaviour
  COMPOSER-FIX   — Bug fix

SCHEMA           — Overlay manifest schema, types, validation
  SCHEMA-FIELD   — New field in overlay.yml or related types
  SCHEMA-VALID   — New validation rule

CLI              — Command-line interface (init, regen, adopt, doctor)
  CLI-COMMAND    — New command or subcommand
  CLI-FLAG       — New flag on existing command
  CLI-UX         — Interactive prompt or output improvement

QUESTIONNAIRE    — Overlay selection logic
  QUEST-SECTION  — New questionnaire section
  QUEST-LOGIC    — Selection / dependency resolution logic

DOCS             — Documentation
  DOCS-SPEC      — Spec meta
  DOCS-GUIDE     — Developer or user guide
  DOCS-API       — Generated reference

INFRA            — Project infrastructure (tests, CI, tooling)
  INFRA-TEST     — Test coverage
  INFRA-LINT     — Lint / formatter
  INFRA-BUILD    — Build system
```

---

## OVERLAY — Individual overlays

### OVERLAY-NEW

| Spec                                                     | Title                                 | Status |
| -------------------------------------------------------- | ------------------------------------- | ------ |
| [003-mkdocs2-overlay](003-mkdocs2-overlay/spec.md)       | MkDocs 2.x Overlay                    | Final  |
| [005-cuda-overlay](005-cuda-overlay/spec.md)             | CUDA (NVIDIA GPU) Overlay             | Final  |
| [006-rocm-overlay](006-rocm-overlay/spec.md)             | ROCm (AMD GPU) Overlay                | Final  |
| [012-ollama-cli-overlay](012-ollama-cli-overlay/spec.md) | Split Ollama Service and CLI Overlays | Final  |

### OVERLAY-ENRICH

_No specs yet._

### OVERLAY-FIX

_No specs yet._

---

## PRESET — Preset bundles

### PRESET-NEW

_No specs yet._

### PRESET-ENRICH

_No specs yet._

---

## COMPOSER — Composition pipeline

### COMPOSER-FEAT

| Spec                                                                       | Title                                               | Status   |
| -------------------------------------------------------------------------- | --------------------------------------------------- | -------- |
| [010-compose-env-materialization](010-compose-env-materialization/spec.md) | Compose Env Materialization and Env Template Naming | Approved |

### COMPOSER-FIX

_No specs yet._

---

## SCHEMA — Overlay manifest schema

### SCHEMA-FIELD

| Spec                                                     | Title                                     | Status |
| -------------------------------------------------------- | ----------------------------------------- | ------ |
| [011-overlay-parameters](011-overlay-parameters/spec.md) | Overlay Parameters with Safe Substitution | Final  |

### SCHEMA-VALID

_No specs yet._

---

## CLI — Command-line interface

### CLI-COMMAND

| Spec                                     | Title                                    | Status |
| ---------------------------------------- | ---------------------------------------- | ------ |
| [004-doctor-fix](004-doctor-fix/spec.md) | `doctor --fix` — Interactive Auto-Repair | Final  |

### CLI-FLAG

| Spec                                                               | Title                         | Status |
| ------------------------------------------------------------------ | ----------------------------- | ------ |
| [007-target-aware-generation](007-target-aware-generation/spec.md) | Target-Aware Generation       | Final  |
| [017-doctor-dry-run](017-doctor-dry-run/spec.md)                   | Doctor `--fix --dry-run` Flag | Draft  |

### CLI-UX

| Spec                                                                                         | Title                                      | Status |
| -------------------------------------------------------------------------------------------- | ------------------------------------------ | ------ |
| [001-verbose-plan-graph](001-verbose-plan-graph/spec.md)                                     | Verbose Plan Graph                         | Final  |
| [013-doctor-dependency-check](013-doctor-dependency-check/spec.md)                           | Doctor Overlay Dependency Resolution Check | Draft  |
| [014-doctor-compose-port-cross-validation](014-doctor-compose-port-cross-validation/spec.md) | Doctor Compose / Port Cross-Validation     | Draft  |
| [015-doctor-env-example-drift](015-doctor-env-example-drift/spec.md)                         | Doctor `.env.example` Drift Detection      | Draft  |
| [016-doctor-reproducibility-check](016-doctor-reproducibility-check/spec.md)                 | Doctor Reproducibility Check               | Draft  |

---

## QUESTIONNAIRE — Overlay selection

### QUEST-SECTION

_No specs yet._

### QUEST-LOGIC

_No specs yet._

---

## DOCS — Documentation

### DOCS-SPEC

_No specs yet._

### DOCS-GUIDE

_No specs yet._

### DOCS-API

_No specs yet._

---

## INFRA — Project infrastructure

### INFRA-TEST

_No specs yet._

### INFRA-LINT

_No specs yet._

### INFRA-BUILD

_No specs yet._

---

## PROJECT — Project-level configuration

| Spec                                                                   | Title                                       | Status   |
| ---------------------------------------------------------------------- | ------------------------------------------- | -------- |
| [002-superposition-config-file](002-superposition-config-file/spec.md) | Project Configuration File                  | Final    |
| [008-project-file-canonical](008-project-file-canonical/spec.md)       | Project File Canonical Form                 | Approved |
| [009-project-env](009-project-env/spec.md)                             | Unified Project-Level Environment Variables | Approved |
| [018-init-project-file](018-init-project-file/spec.md)                 | `init --project-file`                       | Final    |
