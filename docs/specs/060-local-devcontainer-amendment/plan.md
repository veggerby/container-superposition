# Plan

## Scope and Planning Baseline

- Canonical spec: `docs/specs/060-local-devcontainer-amendment/spec.md`.
- Source revision: `913fc6cadd1e4ece9ec14ccf7e28de197665ac90` on `main` (`main...origin/main`).
- Working tree at planning time: `docs/specs/README.md` is modified and `docs/specs/060-local-devcontainer-amendment/` is untracked. These are task-provided shaping artefacts; implementation must preserve them and must not revise the spec's requirements, acceptance criteria, or non-goals.
- Related authority: `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, ADR 001, and specs 022, 035, and 036.
- Scope is a local amendment lane for a repository that has an existing devcontainer and no shared `superposition.yml`, `.superposition.yml`, or `superposition.json`. It is not an `init`, `regen`, `adopt`, or `migrate` mode.

## Resolved Public Contract

### Command shape

Add one top-level lifecycle command with explicit actions:

```text
cs amend init [--base <path>] [--project-root <path>]
cs amend refresh [--project-root <path>]
cs amend inspect [--project-root <path>] [--json]
cs amend remove [--project-root <path>] [--purge]
```

- `amend init` performs all preflight checks, creates the local amendment input and receipt, emits a no-op amended devcontainer artifact, installs local ignore protection, and prints the exact alternate-config launch command. It fails if amendment state already exists and routes the user to `amend refresh`.
- `amend refresh` re-reads the team-owned base plus local input and deterministically replaces only receipt-owned local artifacts. It is the repeatable apply operation.
- `amend inspect` is read-only. Human output reports ownership, base path/hash status, local input, generated local artifacts, Git protection, supported launch command, and any blocker. `--json` emits the same normalized model for scripting.
- `amend remove` deletes only generated local artifacts and the receipt, restores default devcontainer discovery by leaving the team base untouched, and retains the user-authored amendment input plus its local ignore protection. `--purge` additionally removes the input and the command-owned ignore block after an explicit human-readable preview; it must still refuse to delete paths not listed in the receipt.
- All four actions support `--silent` consistently with the existing cross-command contract; `amend inspect --json --silent` is rejected before work. Do not add implicit adoption, project-file creation, or an `amend` alias under `regen`.

### Local files and ownership

Use these names unless implementation discovers a platform collision that requires replanning:

- `.container-superposition/amendment.yml` — user-authored local input, using the existing local-config field shapes and schema URL; never shared project intent.
- `.container-superposition/amendment-state.json` — deterministic local receipt containing format version, repository-relative base path, base SHA-256, input SHA-256, generated artifact paths, and selected devcontainer/compose mode. Do not include timestamps, hostnames, secret values, or absolute machine paths.
- `.container-superposition/amendment/` — generated local compose override and shell/customization support files, when needed.
- A sibling alternate config beside the team base: `devcontainer.superposition-local.json` when the base is `devcontainer.json`, or `.devcontainer.superposition-local.json` when the base is root `.devcontainer.json`. Keeping it beside the base preserves relative `build.dockerfile`, `build.context`, `dockerComposeFile`, and other devcontainer path semantics.

The team base and every referenced team compose file are read-only inputs. The tool must never overwrite, rename, copy back into, or mark them as generated. `superposition.yml`, `.superposition.yml`, `superposition.json`, and `superposition.local.yml` are neither created nor modified by this lane.

### Supported devcontainer forms for the initial release

1. Auto-discovery supports exactly one of:
    - `<project-root>/.devcontainer/devcontainer.json`; or
    - `<project-root>/.devcontainer.json`.
2. `amend init --base <path>` supports a repository-contained `devcontainer.json` or `.devcontainer.json` at another location. The alternate generated config remains its sibling. Paths outside `projectRoot`, symlink escapes outside the repository, and non-file inputs are rejected before writes.
3. Strict JSON object input is supported initially. JSONC/comments or malformed JSON stop before writes with an actionable parse diagnostic; do not introduce an ad-hoc JSONC parser or a new parsing dependency in this change.
4. Image-based and Dockerfile/build-based devcontainers are supported because the sibling artifact preserves their relative fields unchanged.
5. Compose-backed devcontainers are supported when `dockerComposeFile` is a string or non-empty string array and every referenced file resolves and exists. Multiple compose files and repository-contained relative paths outside the devcontainer directory are supported. Local compose changes are emitted as one final local override file and appended to the alternate config's `dockerComposeFile` array; original compose files remain unchanged.
6. Compose-targeted `env`, `composeVolume` mounts, or `dockerComposePatch` require a valid `service` in the base config. If that service cannot be safely targeted, preflight stops before writes.
7. Ambiguous dual default entrypoints, multiple workspace candidates without `--base`, invalid/remote compose references, unsupported `dockerComposeFile` values, bases outside the repository, and unsafe generated-path collisions are unsupported and fail before writes. Guidance must distinguish fixing the base, selecting `--base`, using `adopt` for team migration, or using normal `init` for a new managed setup.

### Amendment semantics

Reuse the parser and normalized local shapes from spec 022 rather than creating a second schema vocabulary. Refactor parsing only as needed so a caller can provide a source path/label. The amendment input supports:

- `env`
- `mounts`
- `shell`
- `vscodeExtensions`
- `customizations.devcontainerPatch`
- `customizations.dockerComposePatch`

Apply local values after the parsed base, using existing merge/dedupe behavior where it is valid for arbitrary devcontainer input:

- devcontainer-targeted environment values merge into `remoteEnv`;
- compose-targeted environment values merge into a final compose override for the selected service;
- default/`devcontainerMount` mounts append to and deduplicate `mounts` in the alternate config;
- `composeVolume` mounts append to and deduplicate the selected service's override volumes;
- VS Code extensions append/deduplicate under `customizations.vscode.extensions`;
- patch-style devcontainer settings deep-merge local-last;
- compose patches deep-merge into the generated final override, local-last;
- shell aliases/snippets generate local support scripts under `.container-superposition/amendment/` and add a uniquely named `postCreateCommand` entry without discarding any team command form.

Do not route this workflow through the template/overlay composer, infer overlays, or synthesize a stack/project file. Extract only narrow pure merge/render helpers when existing composer helpers are too coupled to generated-project assumptions.

### Launch and editor boundary

The supported launch path is the standard Dev Container CLI alternate-config capability:

```text
devcontainer up --workspace-folder <project-root> --config <generated-alternate-config>
```

`amend init`, `refresh`, and `inspect` print this command using repository-relative paths when invoked from the project root. The tool does not launch Docker, install the Dev Container CLI, alter VS Code workspace settings, or replace the editor's default reopen command. Documentation must state that ordinary editor auto-discovery continues to select the team base; use the printed `devcontainer --config` path (then attach/open through the user's normal tooling) for the personal amended configuration.

### Git protection strategy

- In a Git worktree, resolve the worktree-local exclude file through `git rev-parse --git-path info/exclude`; do not assume `.git` is a directory. Add one labeled, idempotent Container Superposition block covering `.container-superposition/` and the exact sibling alternate-config path.
- `.git/info/exclude` is local metadata, is not staged, and avoids modifying the team's root `.gitignore`. This is the default protection strategy.
- Before any write, query `git ls-files -- <candidate paths>`. If the input, receipt, or generated paths are already tracked, stop and print exact manual `git rm --cached -- ...` guidance. Never invoke index-mutating commands.
- Verify protection with `git check-ignore -v` after writing the exclude block. If Git metadata cannot be resolved or the path remains unignored, stop before creating amendment artifacts and print exact manual exclude guidance. A non-Git directory may proceed only with a prominent warning that no Git protection can be established; `inspect` must continue reporting that state.
- `remove` keeps the input's exclude protection. `remove --purge` removes only the exact command-owned block when all command-owned paths are gone; unrelated ignore content is preserved.

## Technical Approach and Boundaries

1. **CLI ownership:** `tool/cli/args.ts` owns registration, option conflicts, and dispatch. Add a small repeated-option helper only if it reduces drift across the four nested actions. The command implementation belongs under `tool/commands/amend/` with `tool/commands/amend.ts` as a thin stable entrypoint.
2. **Normalized lifecycle model:** resolve project root, authority conflicts, base form, local paths, Git status, base hash, and receipt state once into a command-local model. Human output, JSON inspection, preflight, writes, and removal must consume this model rather than independently rediscovering paths.
3. **Read/validate before write:** parse the base, resolve compose references, parse amendment input, compute all outputs in memory, validate generated paths and Git safety, then perform writes. A failed preflight or refresh leaves all existing team and local artifacts byte-for-byte unchanged.
4. **Atomic local writes:** write generated files to sibling temporary files and rename them into place only after all content is ready. Write the receipt last. On refresh failure, retain the last complete amendment and report that it remains active; do not leave partial replacement files.
5. **Receipt-bounded ownership:** init refuses any target collision it cannot prove it owns. Refresh and remove act only on paths in a valid receipt and reject path traversal, repository escape, symlink escape, receipt/base mismatch, or unexpected ownership changes.
6. **Determinism and drift:** content is a pure function of base bytes, local input, and supported filesystem/Git state. Refresh rewrites complete outputs, removes stale receipt-owned generated files, and records stable hashes. Inspect reports `current`, `base changed — refresh required`, `input changed — refresh required`, `missing artifact`, or `unsafe/tracked`; it does not write.
7. **No new dependency:** use Node `crypto`, filesystem/path APIs, `js-yaml`, existing merge utilities, and non-mutating Git subprocess patterns. Strict JSON is a deliberate initial boundary; do not hand-roll JSONC support.
8. **No schema expansion by default:** the input reuses the existing local schema shapes. If implementation proves a new field or generated schema is required, stop and replan rather than silently broadening project-config authority.

### Architecture and design-quality assessment

- **Correctness/task fit — ALIGNED:** the separate `amend` lane satisfies the non-adopting repository use case without weakening `adopt` or project-file-first replay.
- **Architecture/layer placement — ALIGNED:** CLI orchestration remains in `tool/cli`, lifecycle logic in a command module, reusable parsing in `tool/schema`, narrow Git plumbing in `tool/utils`, and team devcontainer files remain external inputs.
- **Simplicity/proportionality — ALIGNED:** a sibling alternate config plus final compose override uses standard devcontainer/compose capabilities and avoids copying a whole devcontainer tree, rewriting relative paths, or building a proprietary runtime.
- **Maintainability — CONCERN, contained:** arbitrary devcontainer merge semantics can grow into a second composer. Keep the supported field list explicit, share narrow merge helpers, and reject forms that cannot be preserved safely.
- **Testability — ALIGNED:** pure resolution/composition can be unit-tested; subprocess tests prove CLI, filesystem, and Git boundaries; Behave proves the user workflow.
- **Security/privacy/data safety — ALIGNED with required gates:** local paths and values are not printed or placed in shared files; path containment, symlink checks, tracked-file preflight, receipt allowlisting, and atomic writes are mandatory.
- **Reliability/operability — ALIGNED:** hashes and inspect status make stale-base behavior visible; refresh is deterministic; remove is receipt-bounded.
- **Compatibility/user impact — CONCERN, documented:** alternate-config launch is supported through `devcontainer --config`, not ordinary editor auto-discovery. Docs and command output must not imply otherwise.
- **Dependency/build-vs-buy judgment:** use the installed user's Dev Container CLI as the commodity launcher; do not wrap or vendor it. No parsing/merge dependency is justified for the strict-JSON initial boundary.
- **ADR impact:** no ADR is required before implementation. The spec explicitly authorizes a separate local-only exception, while foundation/ADR 001 continue to govern adopting repositories and forbid Git-index mutation. Stop for ADR/Lead review if implementation requires shared project authority, mutation of team devcontainer files, editor settings takeover, a proprietary launcher, or automatic Git-index cleanup.

## Ordered Steps

1. Add focused failing unit tests for base discovery/preflight, state-path containment, sibling artifact naming, strict JSON handling, authority conflicts, compose string/array resolution, hash status, and no-write failures.
2. Refactor the existing local-config parser behind a source-path/source-label API while preserving `loadLocalProjectConfig()` and all spec-022 behavior. Add amendment-input tests for the approved field set and local-specific diagnostics.
3. Extend `tool/utils/git.ts` with non-mutating worktree-aware helpers for resolving `info/exclude`, listing tracked candidate paths, and checking ignore provenance. Add a surgical labeled-block writer/remover beside the existing append utility; do not change existing root `.gitignore` behavior.
4. Implement pure command-local resolution and composition modules under `tool/commands/amend/`: types/model, discovery/preflight, devcontainer merge, compose override, shell/support artifacts, receipt/hash handling, Git protection plan, and presentation.
5. Implement atomic apply/refresh and receipt-bounded removal. Prove that team base/compose bytes and `git ls-files` are unchanged, stale receipt-owned outputs are removed on refresh, failed refresh preserves the prior complete local result, and remove restores default base selection.
6. Add `tool/commands/amend.ts` as the thin lifecycle orchestrator and wire `amend init|refresh|inspect|remove` in `tool/cli/args.ts`, including `--silent`, inspect JSON conflict handling, project-root resolution, help text, status codes, and actionable route guidance.
7. Add subprocess-level command coverage in a dedicated `tool/__tests__/amend.test.ts` (with smaller pure-module tests if useful). Cover plain/image, Dockerfile/build, compose string, multiple compose files, external relative compose file, Pi-style bind mount, env, shell, VS Code settings/extensions, repeated refresh, drift inspection, tracked collisions, worktrees, non-Git warning, ambiguous/unsupported forms, remove, and purge.
8. Add Behave scenarios to `tests/behave/features/core-tooling.feature` (or a focused `local-amendment.feature` if scenario density warrants it) and only the narrow reusable file/Git assertions needed in `tests/behave/steps/generation_steps.py`.
9. Add a canonical `docs/local-devcontainer-amendment.md` guide and link it from `README.md`, `docs/README.md`, `docs/quick-reference.md`, `docs/workflows.md`, `docs/filesystem-contract.md`, and `docs/adopt.md`. Align command help with live behavior and clearly distinguish amend vs adopt vs normal project flow, supported forms, local excludes, alternate launch, refresh, and removal.
10. Add one consolidated `CHANGELOG.md` entry under `[Unreleased]` → `Added`. Do not duplicate the same new workflow under `Changed` or `Fixed`.
11. Run focused tests during implementation, the focused/full Behave gates, source and compiled CLI lifecycle smoke tests in disposable Git worktrees, then the mandatory full/generated validation. Record source revision, dirty-tree identity, environment, commands, timestamps, exit codes, changed-file hashes, Git-index before/after, and AC evidence.
12. Hand the complete change to an independent reviewer. Review must specifically inspect command/form completeness, path and symlink containment, no shared-authority writes, Git-index invariance, ignore provenance, atomic refresh, receipt-bounded removal, launch guidance, and AC mapping.

## Affected Areas

- `tool/cli/args.ts` — public `amend` lifecycle registration, options, conflicts, and dispatch.
- `tool/commands/amend.ts` (new) — thin command entrypoint.
- `tool/commands/amend/{types,discovery,composition,state,git-safety,presentation,write}.ts` (new; exact split may be simplified) — command-local normalized model, pure transforms, and bounded side effects.
- `tool/schema/project-config.ts` — reusable path/label-based parsing for existing local-config shapes without changing shared/local project behavior.
- `tool/utils/git.ts` — non-mutating tracked/ignore/worktree queries.
- `tool/utils/gitignore.ts` or a focused local-exclude utility — exact labeled-block write/removal while preserving unrelated content.
- `tool/utils/merge.ts` and `tool/questionnaire/composer.ts` — audit/reuse boundary only; extract narrow pure merge behavior if needed, but do not route arbitrary bases through template composition or broaden composer ownership.
- `tool/__tests__/amend*.test.ts` (new), `local-config.test.ts`, and Git utility tests — pure, filesystem, subprocess, and regression coverage.
- `tests/behave/features/core-tooling.feature` or `tests/behave/features/local-amendment.feature` plus narrow shared steps — public lifecycle acceptance coverage.
- `README.md`, `docs/README.md`, `docs/local-devcontainer-amendment.md` (new), `docs/quick-reference.md`, `docs/workflows.md`, `docs/filesystem-contract.md`, `docs/adopt.md` — user workflow and ownership guidance.
- `CHANGELOG.md` — consolidated Unreleased Added entry.

### Boundaries not to cross

- Do not edit `dist/`, root `.devcontainer/`, generated overlay docs, or generated schemas directly.
- Do not create/modify shared project config, compatibility manifests, `superposition.local.yml`, team devcontainer/compose files, VS Code settings, Git index, staging area, commits, or remotes.
- Do not invoke overlay discovery/inference or write `custom/` adoption patches.
- Do not claim ordinary VS Code auto-discovery uses the alternate artifact.
- Do not add JSONC, remote/external base paths, arbitrary container systems, or automatic Dev Container CLI installation in this release.

## Explicit BDD Plan

1. **Pi-style plain amendment:** initialize a Git fixture with `.devcontainer/devcontainer.json`, run `amend init`, edit the local input with a `${localEnv:HOME}` Pi state bind mount and VS Code setting, run `amend refresh`, and assert the alternate config contains base behavior plus local additions while the base bytes and Git index remain unchanged.
2. **Deterministic refresh:** rerun refresh and assert byte-identical alternate config/receipt, no duplicate mount/extension/command entries, and no stale generated support file after removing a local field.
3. **Compose array preservation:** use two repository compose files, local compose-targeted env/mount/patch, and assert the alternate config retains both team files in order and appends one local override; both originals remain unchanged.
4. **Git protection and tracked blocker:** assert generated/input paths are ignored through worktree-local `info/exclude`; then fixture a tracked collision and assert init/refresh fails before writes, leaves `git ls-files` unchanged, and prints manual untrack guidance.
5. **Inspect and drift:** assert human/JSON inspect identify team base, personal layer, launch command, protected artifacts, and base/input hash drift without writes.
6. **Removal:** run remove, assert the team base and unrelated files are unchanged, generated alternate/support artifacts disappear, input remains protected, and default devcontainer discovery is restored; cover `--purge` separately in Vitest to avoid destructive BDD duplication.
7. **Unsupported/ambiguous form:** fixture both default entrypoints or an invalid compose reference and assert failure before any amendment file, receipt, alternate config, or ignore mutation.

## Acceptance-Criteria Validation Map

| Criterion | Planned evidence                                                                                                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-060-01 | CLI/subprocess and BDD plain-path tests prove `amend init`/`refresh` work with no shared project/manifest and do not invoke adopt.                                                           |
| AC-060-02 | Base-byte snapshots plus merged alternate-config assertions prove image/build/compose behavior is retained and local values are additive/local-last.                                         |
| AC-060-03 | Unit/subprocess coverage exercises bind mounts, remote/compose env, shell aliases/snippets, VS Code extensions/settings, and devcontainer/compose patches.                                   |
| AC-060-04 | Git worktree tests verify exact `info/exclude` protection, `check-ignore -v` provenance, tracked-collision blocking, and non-Git/incomplete-protection guidance.                             |
| AC-060-05 | Before/after `git ls-files`, `git diff --cached`, and subprocess spying/source audit prove no add/rm/update-index/commit behavior across all four actions.                                   |
| AC-060-06 | Negative file assertions and shared-authority byte snapshots prove no project config, compatibility manifest, or `superposition.local.yml` write.                                            |
| AC-060-07 | Two-refresh byte/hash equality, dedupe assertions, and stale receipt-owned artifact cleanup prove deterministic replacement rather than accumulation.                                        |
| AC-060-08 | Remove BDD/subprocess tests prove alternate/support artifacts are deleted, base remains byte-identical, input retention is explicit, and purge is receipt-bounded.                           |
| AC-060-09 | Table-driven preflight tests cover missing, dual, malformed, outside-root, unsafe symlink, invalid compose, missing service, and collision cases with route-specific guidance and no writes. |
| AC-060-10 | Help/output snapshot assertions and docs review verify the exact team base / personal layer / adopt migration ownership language.                                                            |
| AC-060-11 | Dedicated unit/subprocess suite plus Pi bind-mount BDD scenario covers non-adopting path, Git safety, repeat refresh, and removal.                                                           |
| AC-060-12 | Focused and full Behave results are recorded for the explicit scenarios above.                                                                                                               |
| AC-060-13 | Live source/compiled help is checked against README, canonical amendment guide, quick reference, workflow, filesystem, and adopt cross-links.                                                |
| AC-060-14 | Diff/review confirms one `[Unreleased]` → `Added` entry and no duplicate categorization.                                                                                                     |

## Validation Surface and Strategy (DISCOVER)

- **Manifest source:** `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, ADR 001, specs 022/035/036/060, `Taskfile.yml`, `package.json`, `.pi/skills/{cli-command-delivery,canonical-docs-alignment,dogfooding-safety,workflow-sync}`, CLI wiring, local-config parser/merge tests, adopt compose resolution/tests, Git utilities/tests, and Behave core tooling/generation surfaces.
- **Manifest reuse decision:** no reusable validation manifest exists for this new command. Use this plan's DISCOVER surface; re-discover if package scripts, dependencies, schemas, overlays, BDD harness, devcontainer CLI contract, or generated-output ownership changes.
- **Focused unit/contract checks:** `npx vitest run tool/__tests__/amend*.test.ts tool/__tests__/local-config.test.ts tool/__tests__/gitignore.test.ts` plus the exact Git utility test file introduced/changed. Include existing `adopt.test.ts` only if compose resolution is shared/refactored.
- **BDD iteration:** `npm run test:bdd -- tests/behave/features/core-tooling.feature` or the new focused feature path.
- **Full BDD:** `task test:bdd` because this is a user-visible command and generated-devcontainer workflow.
- **Build/source/compiled contract:** `npm run build`; compare `npm run init -- amend --help`/action help with `node dist/scripts/init.js amend --help`; smoke init, refresh, inspect text/JSON, remove, and failure paths from disposable repositories and a linked worktree.
- **Mandatory full gate:** `task validate`.
- **Generated/reproducibility gate:** `task validate:generated`, because tooling creates devcontainer/compose output and AGENTS/DoD require the broader gate for generated-output behavior. Review regenerated files and fail if unrelated generated diffs appear.
- **Git-safety manual evidence:** record `git ls-files`, `git diff --cached --name-status`, `git check-ignore -v`, base/compose SHA-256 values, generated path list, and worktree `git rev-parse --git-path info/exclude` before/after each representative lifecycle.
- **Dev Container contract smoke:** when `devcontainer` CLI is available, run `devcontainer read-configuration --workspace-folder <fixture> --config <alternate>` for plain and compose fixtures. Do not require Docker startup for the unit gate; record the check as unavailable if the CLI is absent. A real `devcontainer up` run is optional/slow and should only be used in an isolated fixture with Docker available.
- **Documentation/manual:** verify examples against live source and compiled help and ensure docs never imply editor auto-discovery, shared reproducibility, or automatic untracking.
- **Not selected by default:** browser/E2E, overlay integration, docs generation due overlay changes, and schema changes. `task validate:generated` still runs the repo-wide generators as the prescribed final gate; any resulting source-relevant diff is a blocker, not an automatic commit.
- **Evidence profile:** Expanded. Record revision/tree identity, Node/npm/devcontainer/Git versions, OS, fixture/worktree setup, commands, timestamps, exit codes, stdout/stderr, hashes, Git-index invariance, skipped checks, and independent reviewer identity.
- **Planning checks run:** read-only repository inspection and local `devcontainer up --help` confirmed `--config` accepts an alternate `devcontainer.json`; no implementation validation was run.

## Rollout, Rollback, and Containment

- **Rollout:** ship command registration, all lifecycle actions, input/state contract, Git protection, tests, BDD, docs, and changelog atomically. Do not ship init/refresh without inspect/remove or without local ignore protection.
- **User rollback:** `cs amend remove` removes generated personal artifacts and returns the repository to ordinary team devcontainer discovery while retaining the editable amendment input. `cs amend remove --purge` removes all receipt-owned local state and its exact ignore block. Neither path touches the team base or Git index.
- **Code rollback:** revert command wiring/modules, parser/Git helper extensions, tests, docs, and changelog together. Existing init/regen/adopt/local-config flows remain unchanged because no shared project format or generated schema migration is introduced.
- **Failure containment:** all validation and content generation occur before writes; atomic replacement and receipt-last ordering preserve the prior complete amendment on failed refresh. Never infer ownership from filename alone during remove.
- **Collision containment:** pre-existing sibling/local-state paths not proven receipt-owned are blockers. Do not overwrite them with `--force`; the user must move/resolve them explicitly.
- **Drift containment:** refresh may consume a changed team base only after revalidation and then records its new hash. Inspect reports drift but does not silently refresh.

## Risks and Dependencies

- **Alternate-launch UX:** standard editor discovery ignores the local sibling. Mitigate with exact `devcontainer --config` output and honest docs; do not mutate workspace settings.
- **Second-composer risk:** arbitrary patch support can duplicate the project composer. Keep the field list bounded, reuse parser/merge primitives, and stop on unsafe forms.
- **Relative-path risk:** placing the alternate config beside the base preserves path semantics; tests must cover Dockerfile context and compose files inside/outside the devcontainer directory.
- **Command-form merge risk:** `postCreateCommand` supports string, array, and object forms. Preserve all existing commands and add one namespaced entry; reject unknown/nonconforming forms rather than dropping behavior.
- **Compose override risk:** multiple compose files have order-sensitive semantics. Always append one generated override last and never flatten/rewrite originals.
- **Git worktree risk:** `.git` may be a file. Resolve `info/exclude` through Git and test a linked worktree.
- **Privacy risk:** amendment files may contain host paths or sensitive environment values. Never echo values in output/receipt, and ensure every artifact path is locally excluded before materialization.
- **Removal risk:** receipt tampering could target unrelated paths. Validate version, containment, expected naming, symlinks, and ownership before deletion; otherwise stop with manual guidance.
- **External tool dependency:** launching depends on the user's Dev Container CLI, but generation/inspection/removal do not. Detecting or installing that CLI is out of scope.

## Execution and Route Recommendation

- **Execution profile:** **Standard** — no irreversible migration or new dependency, but the change spans a public CLI lifecycle, filesystem/Git safety, devcontainer and compose semantics, generated artifacts, BDD, and documentation.
- **Route:** **direct implementation**. Diagnosis first is not required; the spec, repository ownership, and alternate-config platform capability are sufficiently clear. Fast path is not eligible due to multi-file write safety and user-visible workflow breadth.
- **Review mode:** **INDEPENDENT required** before merge, as requested by the spec metadata and task. Review status remains `NOT_STARTED` during planning.
- **Plan status:** **Ready for implementation.** No human choice or ADR blocks implementation under the boundaries above.

## Open Questions and Stop Conditions

- No blocking product questions remain. Exact internal filenames inside `tool/commands/amend/` may follow repository convention without changing the public/file contract.
- Route back to Lead/Interrogator if implementation requires changing an acceptance criterion, supporting JSONC or external bases to make the workflow viable, modifying team-owned files, creating project-file authority, or weakening the default Git-protection requirement.
- Stop for ADR/human decision if the only viable editor path requires writing `.vscode/settings.json`, replacing the canonical `.devcontainer/devcontainer.json`, introducing a proprietary launcher/runtime, or automatically mutating the Git index.
- Stop and replan if a supported base field cannot retain its path/behavior from a sibling alternate config, compose overrides cannot preserve multi-file ordering, or shell enrichment cannot be added without discarding an existing command form.
- If the repository's Dev Container CLI contract no longer exposes `--config`, mark execution blocked and request a public launch-path decision rather than shipping undocumented behavior.

## Implementation Notes

- Implemented the planned `amend` lifecycle with correction hardening for independent review findings RG-060-001 through RG-060-006.
- Correction cycle added strict receipt schema and artifact hashes, receipt artifact allowlisting, symlink-safe path checks, unowned-collision rejection, rollback-on-refresh-failure behavior, supported `postCreateCommand` form preservation, and `git check-ignore -v` provenance reporting/classification.
- No acceptance criteria, public command names, local artifact names, or non-goals were broadened during correction.
