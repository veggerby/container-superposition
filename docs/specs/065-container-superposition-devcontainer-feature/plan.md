# Plan

## Scope and Planning Baseline

- Canonical spec: `docs/specs/065-container-superposition-devcontainer-feature/spec.md`.
- Planning baseline: current working tree on the checked-out branch; record the exact commit and dirty-tree identity again at implementation and validation handoff.
- Pre-existing work to preserve: modified `docs/specs/README.md`, modified `docs/specs/taxonomy.md`, the untracked spec workspace, and especially staged `scripts/push-with-gh.sh`. Implementation must not edit, unstage, stage over, or otherwise disturb that unrelated script.
- Authority consulted: `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, ADR 001, specs 060 and 063, the existing Feature sources, `tool/commands/amend.ts`, overlay metadata/composition code, tests, Behave features, and npm release automation.
- This plan preserves the spec's separation of concerns: the Dev Container Feature installs the real `cs` executable; overlay selection and project-file access happen later through `cs regen` or `cs amend refresh` against the mounted workspace.

## Design Decision: Feature Installation vs. Overlay Integration

A Dev Container Feature install runs while the container is being built/configured and cannot reliably inspect the eventual host workspace, discover its project authority, or safely rewrite the host's team-owned devcontainer. Therefore:

1. **Feature responsibility is installation only.** The published Feature installs a Node runtime through standard Dev Container Feature dependency metadata when needed, installs the real `container-superposition` npm package, verifies `cs`, and exposes it on `PATH`. It accepts a safe npm version/dist-tag option but no overlay-selection or lifecycle option.
2. **The Feature never runs `regen`, `amend`, Docker, reopen, or rebuild operations.** It does not read `superposition.yml`, `.container-superposition/amendment.yml`, or the workspace during Feature installation.
3. **Managed overlay integration remains project-file-first.** An adopting repository records shared intent in `superposition.yml`/`.superposition.yml`; after the Feature has made `cs` available, the user explicitly runs `cs regen` and then rebuilds.
4. **Personal overlay integration extends the existing amendment path.** A non-adopting repository records local overlay intent in the amendment input, runs `cs amend refresh`, and rebuilds the generated alternate config. The team-owned base and shared authority remain untouched.

This boundary is required by the Dev Container Feature lifecycle and prevents an impossible or unsafe design in which Feature installation attempts to consume host project configuration.

## Technical Approach and Boundaries

### Published Feature

- Add one standard Feature source under `features/container-superposition/` with metadata, installer, README, and focused tests.
- Reuse the official Node Dev Container Feature as a declared dependency rather than implementing a runtime installer. Install `container-superposition@<selection>` with npm and verify both `cs --version` and that the resolved binary is on the normal container user's path.
- Validate the npm selection with the same semantic policy as spec 063: exact semver or a simple dist-tag; reject package names, paths, ranges, empty values, and shell syntax before interpolation. Keep the Feature option name and docs aligned with its metadata.
- Publish only this intended Feature through official Dev Container Feature tooling to the repository's GHCR namespace. Do not implicitly publish the repository's existing local/example Features. Final-release sequencing must make the npm package available before the GHCR Feature smoke test installs it.
- Keep npm publishing and GHCR Feature publishing as explicit release stages with least-privilege permissions. Pin third-party actions by immutable SHA in the delivery change, following the repository's existing trusted-publishing posture.

### Amendment overlay intent

- Introduce an amendment-specific input schema rather than adding `overlays` to `superposition.local.yml`. This keeps managed local config semantics unchanged while allowing `.container-superposition/amendment.yml` to add local-only `catalogs`, `overlays`, and `parameters` alongside its current personal-enrichment fields.
- Reuse existing overlay selection, immutable catalog resolution, dependency, conflict, named-instance, and parameter validation primitives. Built-in and explicitly declared immutable catalogs should follow the existing registry rules; do not create a second overlay vocabulary or a Feature-specific catalog.
- Determine the base shape from the already-discovered team devcontainer: `dockerComposeFile` means `compose`; otherwise it is `plain`. Resolve the complete dependency closure before compatibility evaluation.

### Effect-based compatibility, not an allowlist

Create or extract a pure overlay-effect planner shared with the managed composer where practical. It must describe every requested effect before writes, including:

- metadata constraints, dependencies, conflicts, and parameters;
- devcontainer patch/import effects, Features, lifecycle commands, environment, mounts, ports, and editor customizations;
- setup/verify scripts and additional overlay files;
- compose fragments/imports, services, volumes, networks, and their referenced files;
- local equivalents for overlay ignore/env-support artifacts where those are part of the selected overlay contract.

Compatibility is evaluated from the resolved effects plus the discovered base shape, not from a named list of approved overlays:

- Empty `supports` metadata remains lenient and means no declared stack restriction.
- A declared `supports` mismatch is a hard incompatibility; specifically, a compose-only overlay (for example `postgres`) over a plain base is rejected.
- Also reject detected conflicts, unresolved parameters/tokens, duplicate/colliding generated destinations, unsafe path escapes, compose service collisions that cannot preserve both meanings, unsupported command forms, or an effect whose references cannot be safely relocated into local amendment ownership.
- Do not filter incompatible members from the resolved set. If any direct or transitive selection is incompatible, reject the whole selection and report the selected overlay, dependency path/effect, discovered base shape, reason, and next route (`choose a compatible overlay`, `use a compose base`, or `adopt`/managed generation as appropriate).
- A compatible result materializes every planned effect. Unknown or unrepresentable effect shapes are hard incompatibilities, not permission to omit files, scripts, services, metadata, or commands.

### Local-only materialization and atomicity

- Materialize overlay support files beneath receipt-owned `.container-superposition/amendment/` paths and reference them from the alternate devcontainer/compose override. Rewrite only documented overlay-generated relative references (for example managed setup/verify script and compose bind-file paths) so their runtime meaning is retained from the alternate config.
- Extend the amendment receipt to record selected/resolved overlays, catalog identities, effect diagnostics, all generated artifact hashes, and a format-version migration. Do not record secrets, hostnames, timestamps, or absolute machine paths.
- Expand the receipt artifact allowlist from today's fixed filenames to a validated subtree owned by the amendment receipt. Continue rejecting traversal, symlink escape, unowned collisions, and modified receipt-owned files.
- Build the complete output map and compatibility report in memory before any file, receipt, or Git-exclude mutation. Apply the alternate config, compose override, scripts, copied files, receipt, and exact local exclude changes as one rollback-capable operation. On incompatibility or write failure, preserve the previous complete amendment byte-for-byte and create no subset of the new selection.
- Never write the team base, team compose files, shared project config, root `.gitignore`, Git index, or shared generated manifest. Translate an overlay's ignore needs to the worktree-local amendment protection where equivalent; reject the selection if a complete local equivalent is impossible.
- Keep `amend inspect` read-only and extend its human/JSON model with requested/resolved overlays and compatibility diagnostics. `amend remove` remains receipt-bounded and removes all overlay-derived local artifacts without touching the base.

### Design-quality and architecture assessment

- **Correctness/task fit — ALIGNED:** installation and workspace composition occur in lifecycle phases that can actually access their required inputs.
- **Architecture/layer placement — ALIGNED with extraction required:** Feature packaging owns command installation; schema/catalog modules own input validation; a pure composition layer owns overlay-effect planning; `amend` owns base discovery, local-only policy, transactionality, and presentation.
- **Simplicity/proportionality — CONCERN, contained:** duplicating the monolithic managed composer would drift. Extract only effect planning/normalization that both paths genuinely need; do not route an arbitrary team base through template generation or create a general plug-in framework.
- **Build-vs-buy — ALIGNED:** use official Dev Container Feature tooling, the official Node Feature, npm, and existing catalog/composition primitives. Add no runtime dependency for packaging, parsing, or merging.
- **Maintainability — CONCERN:** current overlay effects are convention-based and spread through `composer.ts`. The planner must inventory known effect families explicitly and fail closed on an unrepresentable effect rather than relying on silent file-copy conventions.
- **Testability — ALIGNED:** pure selection/effect/compatibility tests, command/filesystem transaction tests, Behave workflow tests, packaged-Feature validation, and real-container smoke evidence cover the changed boundaries.
- **Security/data safety — ALIGNED with gates:** validate package selections, pin publishing actions, use least-privilege GHCR permissions, preserve immutable catalog rules, contain generated paths, and keep personal artifacts ignored and out of the Git index.
- **Reliability/operability — ALIGNED:** diagnostics explain the blocking effect and route; atomic refresh retains the prior working amendment; no lifecycle operation is automatic.
- **Compatibility/user impact — CONCERN, documented:** users need one rebuild to obtain `cs`, then an explicit regen/refresh and another rebuild for structural changes. Documentation must state this sequence rather than implying a running container mutates itself.
- **ADR impact:** no ADR is required before implementation if the work remains within the Feature-installation and local-amendment boundaries above. Stop for Lead/ADR review if implementation requires Feature-time workspace access, a new shared source of truth, mutation of team-owned files, automatic rebuild/reopen, Git-index mutation, or a new general overlay execution platform.

## Ordered Steps

1. Add characterization tests around existing managed overlay resolution/composition and amendment transaction behavior, especially current dependency closure, stack metadata, path relocation, receipt ownership, and rollback. These protect managed output while shared effect planning is extracted.
2. Extract a pure overlay selection/effect planning seam from the current loader/composer. Preserve managed `regen` output byte-for-byte and centralize dependency/conflict/parameter resolution so managed and amendment flows cannot disagree.
3. Add the amendment-specific schema source and parser for local `catalogs`, `overlays`, and `parameters`; regenerate schema output only through `npm run schema:generate`. Keep `superposition.local.yml` types and behavior unchanged.
4. Implement compatibility analysis against the discovered base shape. Resolve the complete selection first, reject the entire plan on any hard incompatibility, and produce structured diagnostics with dependency/effect provenance. Add the compose-on-plain regression before adding successful composition cases.
5. Extend amendment composition to materialize all compatible planned effects under local receipt ownership, append compose overrides last, relocate generated references, and merge devcontainer effects without discarding base commands or settings.
6. Generalize receipt validation and apply/remove transactions for the bounded amendment artifact subtree. Include Git-exclude changes in rollback, preserve old complete output on refresh failure, and prove no incompatible selection can leave a partial new effect.
7. Extend `amend inspect` text/JSON and command guidance to report requested/resolved overlays, base shape, compatibility result, complete generated artifact set, and actionable next routes. Do not add automatic execution.
8. Add `features/container-superposition/` using standard metadata and a strict installer. Declare the official Node Feature dependency, safely install the selected real npm package, verify `cs`, and keep overlay/project options out of Feature metadata.
9. Add official Feature package/validation/release automation and tests, scoped so unrelated local Features are not accidentally published. Sequence final release as npm publication/availability, Feature packaging and GHCR publication, then pull/install smoke verification.
10. Add/update Vitest and Behave coverage for Feature availability, managed and amendment ownership paths, full compatible application, compose-on-plain rejection, transitive incompatibility, collision/unrepresentable-effect rejection, zero partial writes, no lifecycle automation, deterministic refresh, remove, and base/Git-index preservation.
11. Update user and maintainer documentation: Feature installation URI/options, the two explicit ownership routes, first rebuild versus post-intent rebuild, amendment overlay syntax, compatibility diagnostics, and the non-promise of universal overlay compatibility. Update `CHANGELOG.md` with one consolidated `[Unreleased]` → `Added` entry.
12. Run focused validation during implementation, packaged Feature checks, source/compiled CLI tests, focused/full Behave, real-container smoke tests, mandatory full/generated gates, and release-workflow static tests. Record expanded evidence and request independent review.

## Affected Areas

Likely paths; exact internal module split may be simplified without changing the boundaries above:

- `features/container-superposition/devcontainer-feature.json` — published Feature contract and safe npm selection option.
- `features/container-superposition/install.sh` — real package installation and command verification.
- `features/container-superposition/README.md`, `features/README.md` — Feature-specific and collection guidance.
- `.github/workflows/` — pinned Feature validation/publication workflow or a tightly scoped extension to release automation; do not weaken npm trusted publishing.
- `.github/scripts/` and workflow-focused tests — release sequencing/classification helpers if required.
- `tool/schema/project-config.ts`, `tool/schema/types.ts` — amendment-only selection/catalog/parameter types and parser reuse without changing managed local-config semantics.
- `scripts/generate-schema.ts` and generated `tool/schema/superposition.amendment.schema.json` (name may follow generator convention) — amendment schema source/generation and derived output.
- `tool/schema/overlay-loader.ts`, `tool/schema/catalogs.ts` — reuse/audit only; narrow extraction if needed for local registry resolution.
- `tool/questionnaire/composer.ts` — extract shared pure overlay-effect planning while preserving managed generation behavior.
- `tool/commands/plan/resolution.ts` or a new shared composition module — central dependency/conflict/stack compatibility primitives; avoid retaining divergent copies.
- `tool/commands/amend.ts` (or a command-local module split) — amendment parsing, effect compatibility, local materialization, receipt migration, transactionality, inspect/remove behavior, and diagnostics.
- `tool/utils/merge.ts`, parameter/path/Git-ignore utilities — reuse or narrow helpers only where semantics are genuinely shared.
- `tool/__tests__/project-cs-command.test.ts`, `tool/__tests__/composition.test.ts`, `tool/__tests__/amend.test.ts`, schema/catalog tests, and new Feature/workflow tests — focused regression surface.
- `tests/behave/features/local-amendment.feature`, core generation/tooling features, and narrow shared BDD steps — user-visible acceptance coverage.
- `README.md`, `docs/README.md`, `docs/local-devcontainer-amendment.md`, `docs/superposition-yml.md`, `docs/workflows.md`, `docs/filesystem-contract.md`, `docs/publishing.md`, and command help — ownership/lifecycle/publishing guidance.
- `CHANGELOG.md` — one consolidated user-visible Added entry.

### Boundaries not to cross

- Do not make Feature install scripts inspect or mutate the host workspace.
- Do not add overlay options to the Feature or automatically call `regen`/`amend`.
- Do not change the spec-063 `installCsCommand` contract for generated devcontainers.
- Do not edit `dist/`, root `.devcontainer/`, generated schema, or generated docs directly.
- Do not silently filter, skip, or partially apply any direct or transitive overlay effect.
- Do not use a conservative named-overlay allowlist as compatibility policy.
- Do not mutate the team base, team compose files, shared project intent, Git index, staging state, commits, or remotes.
- Do not touch or unstage `scripts/push-with-gh.sh`.

## Validation Surface and Strategy (DISCOVER)

- **Manifest source:** `AGENTS.md`, foundation, Definition of Done, ADR 001, specs 060/063/065, `package.json`, `Taskfile.yml`, existing Feature sources, release workflows, composer/amend code, Vitest suites, Behave features, and repository-local `dogfooding-safety`, `cli-command-delivery`, and `canonical-docs-alignment` guidance.
- **Manifest reuse decision:** no existing validation manifest covers a published Feature plus arbitrary-base overlay composition. Use this DISCOVER plan and re-discover if package scripts, Feature publication tooling, schema generation, catalog resolution, composer ownership, or the Behave harness changes.
- **Static/package checks:** validate Feature metadata with official Dev Container CLI Feature commands; shell syntax/lint the installer; package only the intended Feature; inspect the package contents and generated GHCR coordinate before publication.
- **Focused unit/contract checks:** run the exact amended schema, overlay resolution/effect planner, composition, amendment, Feature packaging, and publish-workflow test files. Include managed composition characterization tests to detect output drift.
- **BDD iteration:** `npm run test:bdd -- tests/behave/features/local-amendment.feature` plus the focused core-generation/Feature scenario path added by implementation.
- **Build/source/compiled behavior:** `npm run build`; run representative `amend refresh`/`inspect` success and rejection cases through both `npm run init -- ...` and `node dist/scripts/init.js ...` in disposable repositories.
- **Real Feature smoke:** with Docker and `devcontainer` available, build disposable plain and compose existing-devcontainer fixtures that reference the packaged/published Feature, assert `cs --version`, then separately exercise (a) managed `cs regen` and (b) amendment `cs amend refresh` followed by rebuild of the alternate config. Capture that no command runs automatically during the first Feature build.
- **Compatibility matrix:** at minimum cover a patch/Feature-only overlay on plain, a script/additional-file overlay, a compatible compose service overlay on compose, dependencies, parameters, an explicitly declared immutable catalog overlay, and compose-only on plain. Assert every expected file/command/service exists for success and no planned artifact changes for rejection.
- **No-partial evidence:** snapshot base, shared files, local receipt/artifacts, worktree exclude, and Git index before a rejected selection and an injected mid-transaction failure; compare byte hashes afterward. A prior valid amendment must remain complete and launchable.
- **Publishing evidence:** exercise workflow logic without publishing where possible; for final evidence record npm exact version availability, immutable Feature package digest/tag, GHCR pull, installed `cs` version, action SHAs, permissions, run URL, and exit status.
- **Mandatory gates:** `task validate`, `task test:bdd`, `npm run build`, and `task validate:generated`. Review generator-produced diffs; commit only task-owned derived outputs and treat unrelated drift as a blocker.
- **Generated-output/reproducibility:** run `npm run docs:generate` if overlay reference sources changed, `npm run schema:generate` for the amendment schema, `npm run init -- regen`, and `npm run init -- doctor`; no reproducibility error is acceptable.
- **Documentation/manual checks:** verify Feature URI/options and all CLI examples against packaged metadata and live source/compiled help. Confirm docs clearly show Feature install → rebuild → explicit regen/refresh → rebuild and never imply Feature-time workspace access.
- **Slow/privileged/CI-only checks:** Docker/devcontainer builds, GHCR publication, and post-publication pulls require an isolated Docker/CI environment and registry permissions. If unavailable locally, they remain required CI/release evidence and block final completion rather than being silently skipped.
- **Evidence profile:** Expanded — record commit and dirty-tree identity, timestamps, OS/architecture, Node/npm/Docker/devcontainer versions, commands, exit codes, package/OCI digests, fixture hashes, Git-index invariance, generated diffs, skipped checks, and reviewer identity.

## Acceptance-Criteria Evidence Plan

| Criterion | Planned evidence                                                                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-065-01 | Official package validation plus real-container build proves the published Feature installs the real package and exposes `cs` without any project conversion.                         |
| AC-065-02 | Feature metadata contains no Pi/overlay automation; docs and amendment tests prove explicit opt-in overlay selection with effect-based lenient compatibility.                         |
| AC-065-03 | Managed fixture and Behave/docs evidence prove canonical project-file intent, explicit `cs regen`, and rebuild guidance.                                                              |
| AC-065-04 | Amendment fixture/BDD proves local overlay intent, `cs amend refresh`, alternate rebuild, byte-identical team base/shared intent, and unchanged Git index.                            |
| AC-065-05 | Installer/source audit, lifecycle spies, and first-build smoke prove no automatic regen, refresh, rebuild, reopen, launch, or Docker invocation.                                      |
| AC-065-06 | Compatibility matrix proves complete compatible effects, compose-on-plain and transitive hard rejection, structured diagnostics, and byte-for-byte no-partial behavior.               |
| AC-065-07 | Live help and docs review prove Feature installation, managed intent, local amendment, ownership, and both explicit rebuild sequences are distinct.                                   |
| AC-065-08 | Focused Vitest, Behave, packaged Feature, real-container, generated-output, reproducibility, mandatory gate, and independent-review records provide the complete regression evidence. |

## Rollout, Rollback, and Containment

- **Rollout:** deliver Feature source, scoped publication automation, amendment overlay schema/compatibility/materialization, tests, BDD, docs, and changelog together. Do not publish the Feature before the npm version it installs is available.
- **User containment:** overlay use remains opt-in. Existing Feature users who do not author project/amendment intent receive only `cs`; existing amendments without overlays retain current output after receipt migration.
- **Feature rollback:** deprecate or stop promoting the affected GHCR Feature version and publish a corrected immutable version; never overwrite an immutable release digest. Removing the Feature entry from a devcontainer and rebuilding removes its install path without changing project intent.
- **Amendment rollback:** `cs amend remove` deletes receipt-owned local overlay artifacts and restores team-base selection. A failed refresh restores the previous complete amendment and exact worktree-exclude content.
- **Code rollback:** revert Feature/publishing additions, schema/parser changes, shared planner extraction, amendment changes, tests, docs, and changelog as one unit. Regenerate source-owned outputs; do not hand-edit them.
- **Blast-radius limits:** no default behavior change for `installCsCommand`, managed project schemas, `superposition.local.yml`, or repositories that do not select amendment overlays.

## Execution and Route Recommendation

- **Execution profile:** **Standard** — broad and release-sensitive, but reversible and covered by existing npm, devcontainer, composition, and amendment mechanisms. Escalate to Governed only if delivery introduces a new registry trust model or shared source-of-truth decision.
- **Route:** **direct implementation**, not diagnosis first. The lifecycle constraint and owning paths are established. Fast path is not eligible because the work spans publication, schemas, composition, local file safety, and real-container evidence.
- **Review gate:** **INDEPENDENT required**, matching the spec. Review must inspect Feature/workspace separation, package-selection safety, publish permissions/action pinning, effect completeness, no allowlist regression, no-partial transactionality, ownership preservation, and AC evidence.
- **Plan status:** ready for implementation within the stop conditions below.

## Open Questions and Stop Conditions

- No product decision currently blocks this plan. Exact internal module names and the amendment schema filename may follow repository conventions without changing public behavior.
- Before implementation commits release automation, verify the canonical GHCR Feature coordinate and repository package visibility settings. If maintainers require a namespace or release cadence different from the repository's standard GHCR coordinate/final-release flow, return to Lead rather than inventing one.
- Route back to Lead/Interrogator if complete overlay application is intended to exclude any current overlay effect category, if external immutable catalogs must be prohibited, or if acceptance criteria/non-goals need revision.
- Stop for architecture/human decision if a compatible overlay can only be applied by mutating a team-owned/root shared file, if arbitrary overlay references cannot be relocated without a new declared overlay contract, or if the only publication design would publish unrelated Features.
- Stop if official Feature tooling cannot package/test the repository layout without a material repository restructure; propose the smallest layout decision with options rather than moving existing Features speculatively.
- Stop if real-container evidence shows the official Node dependency/npm global install cannot expose `cs` consistently for the configured remote user; do not replace the real command with a wrapper or silently fall back to lifecycle installation.

## Implementation Notes

- Update this section only when implementation diverges from the original plan; record the reason, authority, validation impact, and whether Lead/ADR review was required.
