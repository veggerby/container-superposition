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

| Spec                                                                                     | Title                                                 | Status |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------ |
| [051-repeatable-compose-overlay-rollout](051-repeatable-compose-overlay-rollout/spec.md) | Broaden Repeatable Compose Overlays Beyond PostgreSQL | Draft  |

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

| Spec                                                                                     | Title                                                   | Status                        |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------- |
| [010-compose-env-materialization](010-compose-env-materialization/spec.md)               | Compose Env Materialization and Env Template Naming     | Final                         |
| [043-compose-network-name](043-compose-network-name/spec.md)                             | Project-Specific Compose Network Names                  | Final                         |
| [050-compose-overlay-instances](050-compose-overlay-instances/spec.md)                   | Multi-Instance Compose Overlays with Instance Overrides | Implemented — QA: Needs Fixes |
| [051-repeatable-compose-overlay-rollout](051-repeatable-compose-overlay-rollout/spec.md) | Broaden Repeatable Compose Overlays Beyond PostgreSQL   | Draft                         |

### COMPOSER-FIX

| Spec                                                                                                                                       | Title                                                               | Status |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------ |
| [044-deterministic-compose-port-rendering-and-optional-env-files](044-deterministic-compose-port-rendering-and-optional-env-files/spec.md) | Deterministic Compose Port Rendering and Optional Env File Emission | Final  |

---

## SCHEMA — Overlay manifest schema, types, validation

### SCHEMA-FIELD

| Spec                                                                                 | Title                                                   | Status                        |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------- | ----------------------------- |
| [011-overlay-parameters](011-overlay-parameters/spec.md)                             | Overlay Parameters with Safe Substitution               | Final                         |
| [020-superposition-yml-schema](020-superposition-yml-schema/spec.md)                 | JSON Schema for `superposition.yml`                     | Final                         |
| [024-project-ports](024-project-ports/spec.md)                                       | Project-Level `ports` Field (plain/compose redesign)    | Final                         |
| [025-variable-expansion-consolidation](025-variable-expansion-consolidation/spec.md) | Variable Expansion and Substitution Consolidation       | Final                         |
| [026-adhoc-project-parameters](026-adhoc-project-parameters/spec.md)                 | Ad-hoc Project Parameters                               | Final                         |
| [050-compose-overlay-instances](050-compose-overlay-instances/spec.md)               | Multi-Instance Compose Overlays with Instance Overrides | Implemented — QA: Needs Fixes |

### SCHEMA-VALID

| Spec                                                                         | Title                                                        | Status |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ |
| [042-global-default-configuration](042-global-default-configuration/spec.md) | User-Scoped Global Defaults with Stack-Aware Local Templates | Final  |
| [049-global-init-defaults-surface](049-global-init-defaults-surface/spec.md) | Expand User-Scoped Global Init Defaults Surface              | Final  |

---

## CLI — Command-line interface (init, regen, adopt, doctor)

### CLI-COMMAND

| Spec                                                                                             | Title                                    | Status |
| ------------------------------------------------------------------------------------------------ | ---------------------------------------- | ------ |
| [004-doctor-fix](004-doctor-fix/spec.md)                                                         | `doctor --fix` — Interactive Auto-Repair | Final  |
| [037-cli-command-modularization](037-cli-command-modularization/spec.md)                         | Adopt Command Modularization             | Final  |
| [038-doctor-and-plan-command-modularization](038-doctor-and-plan-command-modularization/spec.md) | Doctor and Plan Command Modularization   | Final  |

### CLI-FLAG

| Spec                                                                                                                                       | Title                                                               | Status |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------ |
| [007-target-aware-generation](007-target-aware-generation/spec.md)                                                                         | Target-Aware Generation                                             | Final  |
| [017-doctor-dry-run](017-doctor-dry-run/spec.md)                                                                                           | Doctor `--fix --dry-run` Flag                                       | Final  |
| [044-deterministic-compose-port-rendering-and-optional-env-files](044-deterministic-compose-port-rendering-and-optional-env-files/spec.md) | Deterministic Compose Port Rendering and Optional Env File Emission | Final  |

### CLI-UX

| Spec                                                                                                 | Title                                                                   | Status |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------ |
| [001-verbose-plan-graph](001-verbose-plan-graph/spec.md)                                             | Verbose Plan Graph                                                      | Final  |
| [013-doctor-dependency-check](013-doctor-dependency-check/spec.md)                                   | Doctor Overlay Dependency Resolution Check                              | Final  |
| [014-doctor-compose-port-cross-validation](014-doctor-compose-port-cross-validation/spec.md)         | Doctor Compose / Port Cross-Validation                                  | Final  |
| [015-doctor-env-example-drift](015-doctor-env-example-drift/spec.md)                                 | Doctor `.env.example` Drift Detection                                   | Final  |
| [016-doctor-reproducibility-check](016-doctor-reproducibility-check/spec.md)                         | Doctor Reproducibility Check                                            | Final  |
| [021-deterministic-generated-readme](021-deterministic-generated-readme/spec.md)                     | Deterministic Generated README Header                                   | Final  |
| [025-variable-expansion-consolidation](025-variable-expansion-consolidation/spec.md)                 | Variable Expansion and Substitution Consolidation                       | Final  |
| [026-adhoc-project-parameters](026-adhoc-project-parameters/spec.md)                                 | Ad-hoc Project Parameters                                               | Final  |
| [027-devcontainer-gitignore-content](027-devcontainer-gitignore-content/spec.md)                     | devcontainerGitignore — Drop `!.gitignore` from Generated Content       | Final  |
| [030-discovery-surface-and-docs-alignment](030-discovery-surface-and-docs-alignment/spec.md)         | Discovery Surface and Canonical Docs Alignment                          | Draft  |
| [031-preset-led-onboarding-for-common-jobs](031-preset-led-onboarding-for-common-jobs/spec.md)       | Preset-Led Onboarding for Common Jobs-to-be-Done                        | Draft  |
| [032-init-and-regen-guided-flows](032-init-and-regen-guided-flows/spec.md)                           | Init and Regen Guided Flows                                             | Final  |
| [033-cli-discovery-preview-and-fingerprint](033-cli-discovery-preview-and-fingerprint/spec.md)       | CLI Discovery, Preview, and Fingerprint Commands                        | Final  |
| [034-doctor-diagnostics-and-remediation-ux](034-doctor-diagnostics-and-remediation-ux/spec.md)       | Doctor Diagnostics and Remediation UX                                   | Final  |
| [035-adopt-and-migrate-conversion-workflows](035-adopt-and-migrate-conversion-workflows/spec.md)     | Adopt and Migrate Conversion Workflows                                  | Final  |
| [036-doctor-git-tracking-safety](036-doctor-git-tracking-safety/spec.md)                             | Doctor Git-Tracking Safety Checks for Local Config and Generated Output | Final  |
| [042-global-default-configuration](042-global-default-configuration/spec.md)                         | User-Scoped Global Defaults with Stack-Aware Local Templates            | Final  |
| [046-explain-port-rendering-and-readability](046-explain-port-rendering-and-readability/spec.md)     | Explain Port Rendering and Readability Polish                           | Final  |
| [047-cli-output-relevance-and-noise-reduction](047-cli-output-relevance-and-noise-reduction/spec.md) | CLI Output Relevance and Noise Reduction                                | Final  |
| [048-cross-command-cli-guidance-relevance](048-cross-command-cli-guidance-relevance/spec.md)         | Cross-Command CLI Guidance Relevance and Redundancy Reduction           | Final  |
| [049-global-init-defaults-surface](049-global-init-defaults-surface/spec.md)                         | Expand User-Scoped Global Init Defaults Surface                         | Final  |

---

## QUESTIONNAIRE — Overlay selection logic

### QUEST-SECTION

_No specs yet._

### QUEST-LOGIC

_No specs yet._

---

## DOCS — Documentation

### DOCS-SPEC

_No specs yet._

### DOCS-GUIDE

| Spec                                                                                                                     | Title                                                                                      | Status      |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------- |
| [030-discovery-surface-and-docs-alignment](030-discovery-surface-and-docs-alignment/spec.md)                             | Discovery Surface and Canonical Docs Alignment                                             | Draft       |
| [031-preset-led-onboarding-for-common-jobs](031-preset-led-onboarding-for-common-jobs/spec.md)                           | Preset-Led Onboarding for Common Jobs-to-be-Done                                           | Draft       |
| [039-project-local-contributor-skills-initiative](039-project-local-contributor-skills-initiative/spec.md)               | Project-Local Contributor Skills Initiative                                                | Final       |
| [040-overlay-solution-discovery-and-write-loop](040-overlay-solution-discovery-and-write-loop/spec.md)                   | Overlay Solution Discovery and Write Loop                                                  | Final       |
| [042-global-default-configuration](042-global-default-configuration/spec.md)                                             | User-Scoped Global Defaults with Stack-Aware Local Templates                               | Final       |
| [045-root-taskfile-and-mandatory-contributor-validation](045-root-taskfile-and-mandatory-contributor-validation/spec.md) | Root Taskfile and Mandatory Contributor Validation Run                                     | Final       |
| [052-overlay-requirements-capture](052-overlay-requirements-capture/spec.md)                                             | Overlay Requirements Capture Prompt and Skill                                              | Implemented |
| [053-behave-bdd-overlay-discovery](053-behave-bdd-overlay-discovery/spec.md)                                             | Behave BDD Coverage, Overlay Discovery, Semantic Assertions, and Inline Workspace Fixtures | Final       |

### DOCS-API

_No specs yet._

---

## INFRA — Project infrastructure (tests, CI, tooling)

### INFRA-TEST

| Spec                                                                         | Title                                                                                      | Status |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------ |
| [053-behave-bdd-overlay-discovery](053-behave-bdd-overlay-discovery/spec.md) | Behave BDD Coverage, Overlay Discovery, Semantic Assertions, and Inline Workspace Fixtures | Final  |

### INFRA-LINT

_No specs yet._

### INFRA-BUILD

| Spec                                                                                                                     | Title                                                     | Status |
| ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ------ |
| [023-pr-prerelease-gate](023-pr-prerelease-gate/spec.md)                                                                 | PR Prerelease Deployment Gate                             | Final  |
| [028-publish-summaries-and-pr-comments](028-publish-summaries-and-pr-comments/spec.md)                                   | Publish Workflow Summaries and Shared Prerelease Tag Only | Final  |
| [045-root-taskfile-and-mandatory-contributor-validation](045-root-taskfile-and-mandatory-contributor-validation/spec.md) | Root Taskfile and Mandatory Contributor Validation Run    | Final  |

---

## PROJECT — Project-level configuration

| Spec                                                                           | Title                                                        | Status                        |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------------- |
| [002-superposition-config-file](002-superposition-config-file/spec.md)         | Project Configuration File                                   | Final                         |
| [008-project-file-canonical](008-project-file-canonical/spec.md)               | Make superposition.yml Canonical Input                       | Final                         |
| [009-project-env](009-project-env/spec.md)                                     | Unified Project-Level Environment Variables                  | Final                         |
| [018-init-project-file](018-init-project-file/spec.md)                         | `init --project-file`                                        | Final                         |
| [019-project-mounts](019-project-mounts/spec.md)                               | First-Class Mounts Support                                   | Final                         |
| [022-local-superposition-config](022-local-superposition-config/spec.md)       | Local Superposition Config                                   | Final                         |
| [029-versioned-private-catalogs](029-versioned-private-catalogs/spec.md)       | Versioned Private Overlay and Preset Catalogs                | Draft                         |
| [041-local-port-conflict-overrides](041-local-port-conflict-overrides/spec.md) | Local Port Conflict Overrides in `superposition.local.yml`   | Final                         |
| [042-global-default-configuration](042-global-default-configuration/spec.md)   | User-Scoped Global Defaults with Stack-Aware Local Templates | Final                         |
| [043-compose-network-name](043-compose-network-name/spec.md)                   | Project-Specific Compose Network Names                       | Final                         |
| [049-global-init-defaults-surface](049-global-init-defaults-surface/spec.md)   | Expand User-Scoped Global Init Defaults Surface              | Final                         |
| [050-compose-overlay-instances](050-compose-overlay-instances/spec.md)         | Multi-Instance Compose Overlays with Instance Overrides      | Implemented — QA: Needs Fixes |
