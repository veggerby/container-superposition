# Feature Specification: Doctor Git-Tracking Safety Checks for Local Config and Generated Output

**Spec ID**: `036-doctor-git-tracking-safety`
**Taxonomy**: `CLI-UX`
**Created**: 2026-06-29
**Author**: PM Agent
**Status**: Final
**Input**: Reconsidered scope — this is doctor work, not regen UX. When `doctor` sees `devcontainerGitignore: true` and files under `outputPath` are still tracked by Git, it should report that state. When local config is present/configured, `doctor` should also catch tracked `superposition.local.yml` and support `--fix` only where remediation is safe under current doctor constraints.

## Problem Statement

Current local-config safety contract lives mostly in `init` / `regen` UX. `doctor` already uses local config during reproducibility dry-compose, but it does not diagnose Git-tracking safety drift:

- generated output can still be tracked even when `devcontainerGitignore: true`
- `superposition.local.yml` can be committed or remain tracked
- root `.gitignore` may still miss `superposition.local.yml`

Result: repo can look operationally healthy while still leaking local-only state into Git.

## Goals

- Make `doctor` report tracked generated output when `devcontainerGitignore: true` is enabled.
- Make `doctor` report tracked `superposition.local.yml` when local config exists.
- Let `doctor --fix` perform only safe, non-index-mutating remediation.
- Keep manual `git rm --cached` guidance explicit where tracked files already exist.
- Preserve existing doctor preview/fix UX contracts.

## Non-Goals

- Running `git rm`, `git add`, `git update-index`, or any other Git index mutation automatically.
- Reworking `init` / `regen` local-only trust contract.
- Adding catalog-wide overlay validation behavior.
- Treating non-Git workspaces as failures.
- Extending these Git-safety findings to legacy manifest-only diagnosis; this spec applies to shared-project-file project diagnosis/fix flows.

## Minimal Route Recommendation

1. Add dedicated doctor Git-safety checks in `tool/commands/doctor.ts`.
2. Reuse `tool/utils/git.ts` non-mutating queries for tracked-path detection.
3. Add one safe remediation only: append `superposition.local.yml` to root `.gitignore` when local config exists and ignore entry is missing.
4. Keep tracked-file findings manual-only. `doctor --fix` may guide, but must not untrack files.
5. Surface findings through existing doctor verdict / fix-plan / post-fix buckets. No new command needed.

## Proposed Behavior

### Check A — tracked generated output under ignored output path

When all are true:

- shared project file exists
- effective `devcontainerGitignore === true`
- `git ls-files -- <outputPath>` returns tracked files

`doctor` emits manual-follow-up finding:

- severity: `warn`
- fix eligibility: `manual-only`
- message explains ignore rules protect only new files
- exact remediation command uses resolved `outputPath`:

```bash
git rm -r --cached -- <outputPath>
```

This finding belongs in normal project diagnosis/fix modes, not catalog validation.

### Check B — tracked local config

When `superposition.local.yml` exists and is tracked by Git, `doctor` emits manual-follow-up finding:

- severity: `warn`
- fix eligibility: `manual-only`
- message explains local config is personal input and should not stay committed
- remediation command:

```bash
git rm --cached -- superposition.local.yml
```

If root `.gitignore` also lacks `superposition.local.yml`, doctor may report separate safe remediation or fold that into one related finding, but tracked-state cleanup remains manual.

### Check C — local config present but root `.gitignore` missing entry

When `superposition.local.yml` exists and root `.gitignore` does not ignore it, `doctor` emits automatic finding:

- severity: `warn`
- fix eligibility: `automatic`
- remediation key: new Git-safety remediation key
- planned change: append `superposition.local.yml` to root `.gitignore`

`doctor --fix` may apply this change because repo already allows explicit ignore-file mutation and this does not touch Git index.

### `doctor --fix` behavior

- MAY append `superposition.local.yml` to root `.gitignore` when Check C fires.
- MUST NOT run `git rm` for Check A or Check B.
- MUST show tracked-file cleanup commands as manual follow-up in live fix and dry-run.
- If automatic `.gitignore` fix succeeds but files remain tracked, final outcome still shows manual follow-up.

### `doctor --fix --dry-run`

Dry-run remains preview-only:

- planned actions include `.gitignore` append when Check C applies
- tracked generated output and tracked local config remain manual findings, not planned file mutations
- output still says `No files changed`

### Doctor UX bucket placement

- Check A lands in `Review next` during diagnosis/fix preview and `Still needs action` after any fix run.
- Check B lands in `Review next` during diagnosis/fix preview and `Still needs action` after any fix run.
- Check C lands in `Can fix now` and contributes a `.gitignore` append row in `Fix plan`.
- Catalog validation (`--all-overlays`) shows none of Check A/B/C.

## UX / Copy Contract

Prefer wording:

- `generated output is still tracked by Git`
- `local-only config is tracked by Git`
- `ignored for new files only`
- `manual follow-up`
- `untrack generated output`
- `untrack local-only config`

Do not imply:

- `.gitignore` removes existing tracked files
- `doctor --fix` will clean Git index
- tracked-file findings are reproducibility failures

## Acceptance Criteria

| #    | Criterion                                                                                                                                                                                                                                                                                                               |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | Given project file sets `devcontainerGitignore: true` and Git tracks at least one file under resolved `outputPath`, when `cs doctor` runs in project mode, then output contains manual-follow-up finding explaining generated output is still tracked and prints `git rm -r --cached -- <outputPath>` with actual path. |
| AC-2 | Given `superposition.local.yml` exists and is tracked by Git, when `cs doctor` runs, then output contains manual-follow-up finding explaining local-only config is tracked and prints `git rm --cached -- superposition.local.yml`.                                                                                     |
| AC-3 | Given `superposition.local.yml` exists and root `.gitignore` does not ignore it, when `cs doctor --fix --dry-run` runs, then fix plan includes append of `superposition.local.yml` to root `.gitignore` and output still states `No files changed`.                                                                     |
| AC-4 | Given Check C only, when `cs doctor --fix` runs, then root `.gitignore` gains `superposition.local.yml`, re-check clears ignore-entry finding, and no Git index mutation command is executed by tool.                                                                                                                   |
| AC-5 | Given Check A or Check B, when `cs doctor --fix` runs, then tracked-file findings remain in manual follow-up / still-needs-action output after fix attempt unless user manually untracks files outside tool.                                                                                                            |
| AC-6 | Given workspace is not inside Git repo or Git query fails, when `cs doctor` runs, then command does not fail solely because Git-tracking safety could not be inspected.                                                                                                                                                 |
| AC-7 | Catalog validation mode does not surface repo-local Git-safety findings unless future spec explicitly expands scope.                                                                                                                                                                                                    |

## QA-Relevant Cases

1. `devcontainerGitignore: true`, `.devcontainer/devcontainer.json` tracked, doctor text output shows untrack-generated-output command.
2. Custom `outputPath`, tracked file under that path, command uses custom relative path in message and manual command.
3. `superposition.local.yml` tracked and `.gitignore` missing entry: doctor shows both manual untrack guidance and auto-fixable ignore-entry action.
4. `doctor --fix --dry-run` with case 3: plan shows only `.gitignore` append under fix plan; tracked-file items remain manual.
5. `doctor --fix` with case 3: `.gitignore` updated, `git ls-files` still lists tracked local config, final output keeps manual follow-up.
6. Git query failure / non-repo: no crash, no false warning.
7. `--all-overlays`: no Git-safety noise in catalog validation output.

## Ownership Boundaries

- `tool/commands/doctor.ts` owns detection, finding construction, remediation routing, and doctor copy.
- `tool/utils/git.ts` remains non-mutating Git query layer.
- Existing `.gitignore` append utility remains only safe write path.
- `tool/cli/run.ts` local-config trust contract remains unchanged by this work.

## Spec Delta Recommendation

Preferred path: **new spec** `docs/specs/036-doctor-git-tracking-safety/spec.md`.

Reason:

- scope is doctor-specific, not init/regen UX
- current spec `022-local-superposition-config` explicitly says doctor behavior change not required initially
- current spec `017-doctor-dry-run` and `034-doctor-diagnostics-and-remediation-ux` need behavior alignment, not wholesale rewrite

Follow-up doc note after implementation:

- amend `022` implementation notes / architecture-impact note to reference this doctor follow-up
- no new ADR needed unless future work proposes automatic Git index mutation

## Spec Conflicts / Alignment Notes

### Conflict with spec `022-local-superposition-config`

`022` says:

- `doctor`: no behavior change required initially
- `doctor --fix` must not offer Git index repair in initial implementation

This proposal **amends scope** without violating core safety rule:

- `doctor` now gains detection
- `doctor --fix` may repair `.gitignore` entry only
- `doctor --fix` still MUST NOT run `git rm --cached`

### Alignment with spec `017-doctor-dry-run`

Compatible. Dry-run can preview `.gitignore` append and list manual findings separately. No-write guarantee stays intact.

### Alignment with spec `034-doctor-diagnostics-and-remediation-ux`

Compatible. Check A / B land in `Review next` or `Still needs action`. Check C appears in `Can fix now` / `Fix plan`.

## Requirements

- **FR-001**: Doctor MUST detect tracked files under `outputPath` when effective `devcontainerGitignore` is `true` and Git query succeeds.
- **FR-002**: Doctor MUST detect tracked `superposition.local.yml` when that file exists and Git query succeeds.
- **FR-003**: Doctor MUST detect missing root `.gitignore` ignore entry for `superposition.local.yml` when local config exists.
- **FR-004**: Doctor `--fix` MAY append `superposition.local.yml` to root `.gitignore`.
- **FR-005**: Doctor `--fix` MUST NOT mutate Git index for generated output or local config.
- **FR-006**: Doctor dry-run MUST preserve no-write contract while previewing any safe `.gitignore` append.
- **FR-007**: Git query failure or non-repo state MUST fail closed without blocking doctor.

## Routing Decision

**PM → Developer**

Reason: minimal path clear, ownership clear, no new ADR needed as long as Git index mutation stays manual-only.

## Implementation Notes

Implemented doctor Git-safety checks and safe remediation follow-up.

Changes shipped:

- `cs doctor` now warns when `devcontainerGitignore: true` output remains tracked by Git and prints `git rm -r --cached -- <outputPath>`
- `cs doctor` now warns when `superposition.local.yml` is tracked by Git and prints `git rm --cached -- superposition.local.yml`
- `cs doctor --fix` can append `superposition.local.yml` to root `.gitignore`
- tracked-file cleanup remains manual-only; tool never mutates Git index
- `init`/`regen` local trust contract stays preventive; tracked-file cleanup messaging moved to doctor ownership
- catalog validation mode excludes repo-local Git-safety findings

Validation run:

- `npm run lint:fix`
- `npm run lint`
- `npm test -- --run tool/__tests__/doctor-git-safety.test.ts tool/__tests__/local-config.test.ts`
