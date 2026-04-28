# Feature Specification: Target-Aware Generation

**Spec ID**: `007-target-aware-generation`
**Created**: 2026-03-23
**Status**: Final
**Input**: Issue [feat] Target-aware generation — produce workspace artifacts and guidance for codespaces, gitpod, and devpod

## User Scenarios & Testing

### User Story 1 — Generate codespaces artifacts (Priority: P1)

A user generates with `--target codespaces` and expects to receive Codespaces-specific files and
guidance alongside the normal devcontainer output.

**Acceptance:**

1. `--target codespaces` → `devcontainer.json` extended with `hostRequirements`, `CODESPACES.md` written to `.devcontainer/`.
2. `--target local` or no `--target` → no `CODESPACES.md`, no `hostRequirements` in devcontainer.

### User Story 2 — Generate gitpod artifacts (Priority: P1)

A user generates with `--target gitpod` and expects a `.gitpod.yml` in the project root and
setup guidance inside `.devcontainer/`.

**Acceptance:**

1. `--target gitpod` → `.gitpod.yml` at project root with tasks and port exposures from selected overlays; `GITPOD.md` written to `.devcontainer/`.
2. `--target local` → no `.gitpod.yml`, no `GITPOD.md`.

### User Story 3 — Generate devpod artifacts (Priority: P1)

A user generates with `--target devpod` and expects a `devpod.yaml` at the project root and
setup guidance inside `.devcontainer/`.

**Acceptance:**

1. `--target devpod` → `devpod.yaml` at project root; `DEVPOD.md` written to `.devcontainer/`.
2. `--target local` → no `devpod.yaml`, no `DEVPOD.md`.

### User Story 4 — Local generation unchanged (Priority: P1)

When a user generates without specifying a target, or with `--target local`, the output must
not contain any non-local artifacts.

**Acceptance:**

1. No `--target` flag → output identical to current behavior; no new files written.
2. `--target local` (explicit) → same output as omitting `--target`.

### User Story 5 — Regeneration from manifest with target (Priority: P2)

A user regenerates from an existing `superposition.json` that includes `"target": "gitpod"` and
expects the same Gitpod-specific artifacts without being prompted again.

**Acceptance:**

1. Manifest with `target: gitpod` → regen produces `.gitpod.yml` and `GITPOD.md`.
2. Manifest with no `target` or `target: local` → regen produces no target-specific artifacts.

### User Story 6 — Target switching cleans up stale artifacts (Priority: P2)

A user regenerates with a different `--target` value and expects the previous target's
project-root artifacts to be removed.

**Acceptance:**

1. Previous run was `--target gitpod` (`.gitpod.yml` exists); regeneration with `--target codespaces` → `.gitpod.yml` removed, `CODESPACES.md` written.
2. Previous run was `--target devpod`; regeneration with `--target local` → `devpod.yaml` removed.

## Technical Design

### `TargetRule` interface

A `TargetRule` encapsulates everything about generating artifacts for one deployment target:

```typescript
interface TargetRule {
    target: DeploymentTarget;
    /** Extra fields merged into devcontainer.json */
    devcontainerPatch(context: TargetRuleContext): Partial<DevContainer>;
    /** Files to write; keys are relative to outputPath, '../<name>' writes to project root */
    generateFiles(context: TargetRuleContext): Map<string, string>;
    /** All relative paths owned by this rule (for stale-cleanup on target switch) */
    ownedFiles(): string[];
}
```

### Per-target rules

| Target       | devcontainer.json change | Files in `.devcontainer/` | Files at project root |
| ------------ | ------------------------ | ------------------------- | --------------------- |
| `local`      | none                     | none                      | none                  |
| `codespaces` | `hostRequirements`       | `CODESPACES.md`           | none                  |
| `gitpod`     | none                     | `GITPOD.md`               | `.gitpod.yml`         |
| `devpod`     | none                     | `DEVPOD.md`               | `devpod.yaml`         |

### `SuperpositionManifest` update

Add `target?: DeploymentTarget` so regeneration reproduces the correct artifacts without
re-prompting.

### Stale-artifact cleanup

On each generation, before writing new target artifacts:

1. Read existing `superposition.json` from `outputPath` (if it exists).
2. If `manifest.target !== answers.target`, identify previous target's owned project-root
   files (e.g., `.gitpod.yml`) and remove them from the project root.

The `.devcontainer/`-local files are already handled by `cleanupStaleFiles` via `FileRegistry`.

## Functional Requirements (from issue)

- **FR-001**: Target is a real generation input that changes produced artifacts.
- **FR-002**: `codespaces`, `gitpod`, `devpod` produce target-specific workspace artifacts.
- **FR-003**: `local` (explicit or default) produces no additional artifacts.
- **FR-009**: Regeneration from manifest reproduces target-aware output automatically.
- **FR-010**: Target switch between runs removes stale artifacts from the previous target.
- **FR-011**: Backward compatible — manifests without `target` or with `target: local` unchanged.
