# Feature Specification: `init --project-file`

**Spec ID**: `018-init-project-file`
**Created**: 2026-03-23
**Status**: Final
**Input**: Extend the `init` command with a `--project-file` flag that persists the chosen init configuration into a repository-root project config file (creating `.superposition.yml` by default or updating an existing supported project config), aligning init runs with the project-config workflow.

## Summary

Allow `container-superposition init` to optionally write a repository-root
project config file (`.superposition.yml` by default, or the existing supported
project config path when one already exists) alongside the normal init output.

## Requirements

- `init` MUST accept a `--project-file` flag.
- When `--project-file` is set, `init` MUST write a repository-root project
  config that reflects the final selected configuration for that run.
- If the repository already contains exactly one supported project config file,
  `init --project-file` MUST update that file instead of creating a second one.
- If no project config file exists, `init --project-file` MUST write
  `.superposition.yml` at the repository root.
- The written project config MUST include supported fields represented by the
  final init answers, including stack, base image, overlays, output path,
  target, minimal mode, editor profile, preset, and preset choices.
- `init --project-file` MUST continue to write `superposition.json` the same way
  current `init` runs do.
- Project config write errors MUST NOT suppress devcontainer generation success; they MUST be reported separately.

## User Scenarios & Testing

### User Story 1 - Write project config alongside devcontainer generation (Priority: P1)

A developer wants to run `init` once and have both a `.devcontainer/` folder and a root-level project config file created, so they can commit the project config and regenerate consistently later.

**Why this priority**: The `--project-file` flag is the primary new capability. Without it working correctly for a fresh project, the feature has no value.

**Independent Test**: Run `init --project-file` in a directory with no existing project config, then confirm that `.superposition.yml` is created at the repo root and reflects the chosen stack and overlays.

**Acceptance Scenarios**:

1. **Given** a repository with no project config file, **When** the user runs `init --project-file`, **Then** `.superposition.yml` is created at the repository root with the selected stack, base image, overlays, and other init options.
2. **Given** a repository with an existing `.superposition.yml`, **When** the user runs `init --project-file`, **Then** the existing file is updated (not a new file created) to reflect the newly selected configuration.
3. **Given** the project config write fails (e.g., permission error), **When** `init --project-file` is run, **Then** the devcontainer generation still completes successfully and a clear error message is shown for the project-file failure only.

---

### User Story 2 - Update existing project config (Priority: P2)

A developer has an existing `superposition.yml` and wants to update it to reflect a changed overlay selection after re-running `init`.

**Why this priority**: Round-trip consistency (init → project config → regen) is the main value of the project-config workflow.

**Independent Test**: Create a `superposition.yml`, run `init --project-file` with different overlays, and confirm that the file is updated rather than a second file being created.

**Acceptance Scenarios**:

1. **Given** a repository with exactly one supported project config file, **When** the user runs `init --project-file` with new overlay selections, **Then** only that existing file is updated and no second project config is created.
2. **Given** two supported project config files exist simultaneously, **When** the user runs `init --project-file`, **Then** the command prints an error explaining that only one project config file should exist and does not proceed with the write.
