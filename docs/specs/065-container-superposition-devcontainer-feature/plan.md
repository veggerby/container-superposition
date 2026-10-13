# Plan

## Scope and Planning Baseline

- Canonical spec: `docs/specs/065-container-superposition-devcontainer-feature/spec.md`.
- Planning baseline: committed baseline `c586d2589d0a51b0f87658079d8561ad38c00305` plus the current dirty implementation payload reviewed under SHA-256 fingerprint `cfd1a3d5d7002d23b425ef4170598b61a7f4c6f7a80d581af3ef365dc1055405`. Re-record the exact commit and dirty-tree fingerprint at implementation, validation, and review handoffs.
- Preserve the current dirty task payload. Correction work must not discard, overwrite, or represent those uncommitted slices as committed evidence.
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

- **Execution profile:** **Governed** for the correction cycle because it combines privileged release publication, local-file transaction safety, shared composition architecture, and registry-backed release evidence. This supersedes the original Standard recommendation for the remaining work.
- **Route:** **direct bounded correction, then independent review**. Diagnosis-first is not required because review reproduced F065-001 and F065-002 and identified the concrete release and layering gaps. Fast path is not eligible.
- **Review gate:** **INDEPENDENT required**, matching the spec. The follow-up review must preserve finding IDs F065-001..005 and inspect Feature/workspace separation, package-selection safety, publish permissions/action pinning, effect completeness, no allowlist regression, byte-exact rollback, ownership preservation, and source-matched AC evidence.
- **Plan status:** **REPLANNED / BLOCKED pending correction**. Integration remains blocked by the current `CHANGES_REQUESTED` gate.

## Open Questions and Stop Conditions

- No product decision currently blocks this plan. Exact internal module names and the amendment schema filename may follow repository conventions without changing public behavior.
- Before implementation commits release automation, verify the canonical GHCR Feature coordinate and repository package visibility settings. If maintainers require a namespace or release cadence different from the repository's standard GHCR coordinate/final-release flow, return to Lead rather than inventing one.
- Route back to Lead/Interrogator if complete overlay application is intended to exclude any current overlay effect category, if external immutable catalogs must be prohibited, or if acceptance criteria/non-goals need revision.
- Stop for architecture/human decision if a compatible overlay can only be applied by mutating a team-owned/root shared file, if arbitrary overlay references cannot be relocated without a new declared overlay contract, or if the only publication design would publish unrelated Features.
- Stop if official Feature tooling cannot package/test the repository layout without a material repository restructure; propose the smallest layout decision with options rather than moving existing Features speculatively.
- Stop if real-container evidence shows the official Node dependency/npm global install cannot expose `cs` consistently for the configured remote user; do not replace the real command with a wrapper or silently fall back to lifecycle installation.

## Correction Plan After Independent Review

This bounded correction plan supersedes the remaining broad sequence where the two differ. It does not alter the spec, acceptance criteria, or non-goals.

### Required shared planner decision

Extract one **pure, exhaustive overlay-effect inventory/planning seam** from the managed composer and consume it from both managed generation and amendment composition. The seam owns effective-catalog-root lookup and typed discovery of manifest constraints, devcontainer imports/patches, compose imports/fragments, environment examples/imports, setup/verify scripts, and additional files. It returns provenance and resolved parameters but performs no writes and makes no amendment policy decisions. Managed generation retains its existing materializers and must remain byte-for-byte stable; amendment code owns base-shape compatibility, relocation, collision policy, local destinations, and transactionality. Unknown or unrepresentable effects fail closed. Do not create a general plug-in framework or a second composer.

This is the smallest shared boundary that resolves F065-005 and prevents the catalog-root/effect-family drift behind F065-001. No ADR is needed while this remains an internal extraction under existing foundation and ADR-002 ownership. Stop for Lead/ADR review only if implementation would change the overlay contract or source-of-truth model.

### Ordered correction work packages

1. **Lock the failing contracts before refactoring (F065-001, F065-002, F065-004).** Add focused regressions for an external compose overlay, `.env.example` and env imports, compose imports, namespace-qualified scripts with sibling utility sourcing, and fresh-init injected failure. Each success assertion enumerates the complete expected effect set; each rejection/failure assertion snapshots exact pre-command state.
2. **Extract and adopt the shared pure effect planner (F065-001, F065-005).** Inventory effects exclusively from the resolved effective `overlaysDir`, preserve direct/transitive provenance, and make managed composer plus amendment consume the same inventory. Characterization tests must prove no managed-generation output drift before amendment materialization changes continue.
3. **Close complete-or-reject behavior (F065-001).** For every inventoried effect, either materialize it with validated local relocation or reject the entire selection before mutation. Correct external compose lookup and namespace-aware script utility placement first; then support or explicitly reject env/import/reference and named-instance effects. A successful plan may not contain an unconsumed effect.
4. **Make init/refresh one rollback unit (F065-002).** Extend the command transaction to include creation/replacement of amendment input, all receipt-owned artifacts and receipt, and the exact worktree-exclude file state. Prepare and validate all output in temporary paths before commit; on any injected failure restore prior bytes and prior absence, remove temporary/empty command-created paths, and leave the Git index tree unchanged.
5. **Harden release publication as a separate privilege boundary (F065-003).** Keep npm trusted publication in its existing minimum-permission job; move Feature publication to a dependent job with only `contents: read` and `packages: write`. Pin every action in both the privileged Feature job and its artifact/evidence chain by immutable SHA. Poll for the exact released npm version with a bounded timeout and fail closed before publishing. Package/publish the Feature for that same source/version, then pull by immutable digest and build/install it with the exact npm version, recording `cs --version`, package/OCI digest, run URL, and commit.
6. **Complete the evidence matrix and handoff (F065-004 plus all findings).** Run the focused full-effect and no-partial matrix first, then source and compiled CLI cases, Feature packaging, `task validate`, `task validate:generated`, and the corrected registry-backed smoke against one recorded source identity. Update spec-local validation evidence with commands, environment, exit codes, hashes/digests, and skips; request a new independent review that disposes F065-001..005 individually.

### Finding-to-validation mapping

| Finding  | Correction proof required                                                                                                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F065-001 | Unit/BDD fixtures for built-in and namespace-qualified external overlays assert every planned patch, import, compose service/file reference, env-support file, script, utility, and additional file; unsupported effects reject before any write.      |
| F065-002 | Fresh init and existing refresh fault-injection tests compare byte hashes and existence for input, receipt, artifact subtree, exact `.git/info/exclude`, team base/shared files, plus the Git index tree before/after each failure boundary.           |
| F065-003 | Workflow static tests prove immutable action SHAs, job-level least privilege, hard exact-version availability, and publish ordering; release evidence proves exact npm version, OCI digest pull, installation, and `cs --version` for the same commit. |
| F065-004 | Positive/negative compatibility matrix, full focused Vitest and Behave, source/compiled command runs, mandatory/generated gates, and real registry smoke all carry one source identity and explicit AC-065-01..08 mapping.                             |
| F065-005 | Managed-composer characterization plus planner unit tests prove one catalog-root-aware inventory contract is shared, pure, exhaustive, and leaves managed output unchanged.                                                                            |

### Rollback and no-partial proof

- Treat planner extraction, amendment consumption, transaction expansion, and tests as one code rollback unit; reverting it restores the prior implementation without schema or receipt reinterpretation. Release-workflow hardening can be reverted independently before publication.
- Do not publish a Feature from a correction candidate until all local and generated gates pass. Published OCI artifacts are immutable: contain a bad release by withdrawing promotion/deprecating the affected version and publishing a corrected version, never by overwriting its digest.
- Automated no-partial proof must cover both initially absent state and a prior valid amendment. For every injected commit boundary, compare a manifest of path existence, byte hashes, exact exclude bytes, team/shared-file hashes, and Git index tree hash. Success requires exact equality after failure and no leftover temp files or empty command-created directories.

### Validation surface delta (DISCOVER)

- **Reuse decision:** retain the original repository commands and Feature-package checks, but invalidate the prior completeness and transaction portions of the manifest because independent review demonstrated blind spots. The correction matrix and registry evidence above replace those portions.
- **Selected checks:** focused planner/composer/amend/publish-workflow Vitest; focused amendment and Feature Behave; source and compiled disposable-repository cases; shell syntax plus official Feature packaging; `npm run build`; `task validate`; `task validate:generated`; release-job exact-version/OCI smoke.
- **Deferred/privileged:** live npm/GHCR publication and digest pull/install run only in the corrected release workflow with maintainer authorization. Absence or failure of that evidence leaves AC-065-01 and AC-065-08 `NOT_MET`; it is not acceptable residual risk.
- **Manifest invalidation triggers:** any change to overlay metadata/effect conventions, catalog materialization, amendment receipt/transaction format, Feature metadata/installer, package version selection, release job graph, or validation harness requires re-discovery.

### Clarification, open questions, and ADR needs

- **Spec clarification:** not required. The complete-or-reject, ownership, lifecycle, and evidence requirements already decide the findings; implementation must not narrow them implicitly.
- **Open implementation coordination:** repository/release maintainers must authorize and execute the live registry evidence, but no product choice is needed. The exact internal module filename may follow repository convention.
- **ADR:** none required for the bounded correction. Escalate before implementation only if the shared seam changes the public overlay contract, a supported effect would require mutating team-owned/shared files, or least-privilege publication cannot be achieved without a materially different release architecture.

### Convergence cycle 1

- **Source before / after:** committed baseline `c586d2589d0a51b0f87658079d8561ad38c00305` plus reviewed dirty payload fingerprint `cfd1a3d5d7002d23b425ef4170598b61a7f4c6f7a80d581af3ef365dc1055405`; unchanged by this planning-only cycle except for this plan artefact.
- **Findings resolved:** none yet; F065-001..005 remain open.
- **Findings remaining or new:** F065-001 effect omission, F065-002 non-atomic fresh init, F065-003 privileged release insecurity/sequencing, F065-004 incomplete evidence, F065-005 duplicated planning architecture; no new finding ID introduced.
- **Acceptance evidence gained:** independent reproductions established concrete failures for external compose omission and fresh-init rollback, while confirming AC-065-03, AC-065-05, and AC-065-07 remain met on the reviewed payload.
- **Validation state changed:** focused checks still pass, but their insufficiency is now bounded; final validation remains blocked pending complete-effect, rollback, generated, and registry evidence.
- **Repeated work or failures:** incremental slices added capabilities, but effect planning stayed duplicated and completeness claims outran matrix coverage. Repeating another effect-by-effect command-local slice would not converge.
- **Token/invocation telemetry:** no reliable prior subagent telemetry available; not used as a progress signal.
- **Decision:** **REPLAN** — review exposed plan-critical architecture, effect completeness, transaction, and release-boundary gaps; continuing the old slice order would repeat drift.
- **Next bounded work package:** implement work packages 1–4 as one amendment-safety package (regressions, shared planner, complete-or-reject, atomic init/refresh), then work package 5 release hardening, then work package 6 source-matched validation and independent re-review.

## Implementation Notes

### 2026-10-12 — Feature-installation slice

- **Delivered:** `features/container-superposition/` now provides a standard Feature with an official Node Feature dependency, strict exact-semver/simple-dist-tag validation, real `container-superposition` global installation, and `cs --version` verification. The final-release workflow publishes only this Feature after npm publication, with `packages: write`; documentation distinguishes install-only behavior from explicit shared `cs regen` and personal `cs amend refresh` routes.
- **Deviation:** Steps 1–7 and 10's amendment-overlay portions remain outstanding. Existing `amend` accepts only the prior local enrichment schema, so adding Feature packaging alone cannot satisfy the selected-overlay compatibility or materialization acceptance criteria. This is a coherent safe slice rather than a claim of full implementation.
- **Reason and authority:** The source history inspection showed commit `b5a1eaa` added only the spec/plan, not the claimed implementation. The approved spec permits an installable Feature, while the plan's effect-planning, atomic amendment, and schema work is materially larger and was not safely represented as completed without implementation and dedicated tests. No ADR or Lead decision was required because the Feature remains install-only and does not access the workspace.
- **Validation impact:** Feature package and release-workflow tests, full validation, BDD, build, generated-output/reproducibility checks passed. Local container smoke reached Feature dependency resolution but is blocked by GHCR authentication for the official Node Feature. Full evidence and AC disposition are recorded in `artifacts/validation.md`.

- Continue with the remaining amendment overlay schema, effect planner/compatibility, receipt transaction, diagnostics, and matrix coverage before changing task status or requesting the required independent review.

### 2026-10-12 — Amendment overlay safety slice

- **Delivered:** `.container-superposition/amendment.yml` accepts local `overlays` and `parameters`; amendment refresh resolves built-in dependency closure, conflicts, declared stack constraints, and required parameters before writes. Compatible patch-only selections apply their full devcontainer patch, and receipt v2 records requested/resolved selection and compatible base shape. Existing receipt-bounded removal and rollback apply to these results. `amend inspect --json` exposes the receipt unchanged.
- **Fail-closed boundary:** catalog overlays, compose fragments/services, setup/verify scripts, additional overlay files, env/ignore artifacts, and other non-patch effects are rejected before write because their complete local ownership/relocation is not implemented. This avoids the prohibited partial-effect behavior but is not the complete effect planner/materializer envisioned in steps 2–7.
- **Validation:** focused amendment unit tests and BDD prove full compatible patch application, compose-on-plain rejection, retention of a prior complete amendment, base preservation, and unchanged Git index. Core validation and compiled CLI build passed; detailed evidence is appended to `artifacts/validation.md`.
- **Status:** AC-065-02/04/06 are partially implemented but remain **NOT_MET** as full catalog/effect coverage is outstanding; AC-065-08 remains **NOT_MET** pending the complete matrix and registry-backed Feature smoke. Do not request independent review yet.

### 2026-10-12 — Local compatible-effect materialization slice

- **Delivered:** Amendment refresh now materializes compatible overlay setup/verify scripts (with the shared setup utility), additional regular overlay files, and compose fragments in the receipt-owned `.container-superposition/amendment/` subtree. Compose fragments are appended through the personal override only; team compose services/volumes cannot be overwritten. The receipt includes every materialized path and existing apply/remove rollback continues to own the full subtree atomically.
- **Safety boundary:** selections still reject before writes for declared stack mismatch, unresolved parameters, symlinks, overlay `.gitignore` effects, and team-compose service/volume collisions. External immutable catalogs, named instances, compose-import reference relocation, env artifacts, and broader effect diagnostics remain outstanding; no acceptance criterion is newly claimed met.
- **Validation:** focused amendment unit tests and amendment Behave coverage exercise setup scripts, a PostgreSQL compose fragment, base/Git-index preservation, and prior no-partial behavior. Copied support files are receipt-owned in the implementation, but reference-relocation coverage remains outstanding. Formatting, lint/typecheck, and compiled build passed; detailed evidence is appended to `artifacts/validation.md`.

### 2026-10-12 — External immutable catalog selection slice

- **Delivered:** Amendment input now accepts local `catalogs` declarations and resolves them through the existing ADR-002 effective-registry path before dependency, compatibility, and materialization work. Namespace-qualified external overlays use the same immutable git/archive or repo-relative path validation as managed catalogs; the receipt v3 records resolved catalog identities with the requested/resolved overlay set. Existing built-in selection remains unchanged.
- **Safety:** Catalog resolution and all overlay planning complete before local Git-exclude or artifact writes. Existing effect compatibility, receipt ownership, and rollback logic operate on the merged registry, so an incompatible external selection is rejected as a whole rather than dropping an effect or changing the team base.
- **Remaining boundary:** Compose-import/reference relocation, env/ignore artifacts, named instances, and the remaining complete-effect diagnostics/matrix are still outstanding. This slice does not make a universal external-overlay compatibility claim.
- **Validation:** focused Vitest covers a committed external git catalog and receipt identity; Behave covers a namespace-qualified repository-relative catalog path, full alternate-config effect, base preservation, and Git-index invariance. `task validate`, the focused Behave suite, `npm run build`, and a compiled-CLI external-catalog smoke passed; details are appended to `artifacts/validation.md`.

### 2026-10-12 — Correction package for F065-001..005

- **Delivered:** a narrow, read-only `overlay-effects` inventory is shared by managed composition and amendment planning, always rooted at the resolved effective catalog. Amendment materializes external compose effects, `.env.example`, scripts with namespace-safe sibling utilities, and additional files; non-relocatable imports reject before writes. Init/refresh now snapshot and restore amendment input, receipt, artifacts, and exact local exclude bytes as one transaction.
- **Publication:** final npm publish retains its existing trust permissions; Feature publication is a dependent least-privilege job with immutable action SHAs, blocking exact-version npm availability, and an OCI-digest/exact-package smoke step.
- **Validation:** the focused correction tests and `task validate:generated` passed against the recorded dirty source identity in `artifacts/validation.md`. Live npm/GHCR evidence was not run locally and remains a release/independent-review blocker for AC-065-01/08.
- **Plan deviation:** no unapproved authority decision or ADR change was required. The original plan's env/import requirement is met by materializing `.env.example` and rejecting import forms that cannot preserve their managed meaning; no effect is silently omitted.

### Convergence cycle 2 — 2026-10-12

- **Source before / after:** `c586d2589d0a51b0f87658079d8561ad38c00305` plus correction payload `9350b93eea5ce3ea418c80798ee509382a5e0485368f52f64cf9ef20e8958836`.
- **Findings resolved:** F065-002 is independently resolved; F065-003 static security controls improved.
- **Findings remaining or new:** F065-001 and F065-005 recurred: `compose_imports` is absent from the purported exhaustive inventory, allowing accepted `ollama` output to omit the requested GPU compose import. F065-003/004 also retain privileged public-registry evidence gaps.
- **Acceptance evidence gained:** atomic init rollback is independently proven; no additional acceptance criterion reached `MET`.
- **Validation state changed:** `task validate:generated` was recorded passing for the correction payload, but the independent disposable compose reproduction is a contract failure that invalidates completion evidence.
- **Repeated work or failures:** the same complete-or-reject finding recurred after a correction package, with a materially changed tree but no complete planner audit. Further effect-by-effect correction would repeat the failed approach.
- **Token/invocation telemetry:** multiple implementation slices and two independent reviews were required; this supports batching any future correction rather than further narrow loops.
- **Decision:** **STOP_NON_CONVERGENT** — do not launch another correction from this route. A spec-owner decision is required to authorize a fresh exhaustive manifest-effect audit/rework or to re-scope the complete-or-reject requirement; release-maintainer authorization is separately required for immutable npm/GHCR publication and anonymous smoke evidence.
- **Next action:** obtain the two explicit authorizations, then start a new governed implementation package with a full manifest-field inventory and source-matched public release evidence.

### Fresh governed rework — 2026-10-12

- **Scope delivered:** the effective-root inventory now types both manifest import effect families (`imports`, `compose_imports`) alongside patch, compose, environment, lifecycle, ignore, and additional-file effects. Amendment planning validates and materializes compose imports before direct compose fragments, preserving imported `devcontainer` GPU reservations. Managed compose and environment paths consume the same inventory for compose imports, environment imports, and environment examples.
- **Regression evidence:** built-in `ollama` and namespace-qualified immutable external catalog tests enumerate imported compose output; amendment BDD now asserts the built-in GPU reservation. Existing transaction/no-partial cases remained in the focused and generated gates.
- **F065-003 static correction:** release smoke clears GHCR credentials and omits `GITHUB_TOKEN`; an immutable-digest pull and Feature install can therefore demonstrate ordinary public access when release CI runs it.
- **Source / validation:** baseline `c586d2589d0a51b0f87658079d8561ad38c00305`, dirty-tree fingerprint `e04794c07b1e833b3b5728740f6dce40c075a86db6ed1ecefc245a568cfef2b3`; focused 70-test matrix, focused BDD (11 scenarios / 121 steps), lint/build, and `task validate:generated` (62 scenarios / 443 steps) passed. Details: `artifacts/validation.md`.
- **Remaining block:** no npm or GHCR publication was attempted. AC-065-01 and AC-065-08 remain blocked until authorized release CI records anonymous digest pull, exact npm Feature install, `cs --version`, and the required independent review. No plan/spec/ADR deviation was required.

### Convergence cycle 3 — 2026-10-12

- **Source before / after:** prior correction fingerprint `9350b93eea5ce3ea418c80798ee509382a5e0485368f52f64cf9ef20e8958836`; fresh rework validated at `e04794c07b1e833b3b5728740f6dce40c075a86db6ed1ecefc245a568cfef2b3`; independent review fingerprint `e702b0e83ba10003613af202b3ea593c583d9bcae8e1546207be45bf9dfc0f31` (review-gate artefact may itself affect the fingerprint). Baseline HEAD remains `c586d2589d0a51b0f87658079d8561ad38c00305`.
- **Findings resolved:** F065-002 remains independently resolved. The `compose_imports` reproduction was addressed, but F065-001/F065-005 are not resolved overall.
- **Findings remaining or new:** F065-001/F065-005 recur: an imported devcontainer patch can introduce a local Feature reference that `amend refresh` does not materialize or reject. F065-003/004 retain the authorized-publication evidence gap.
- **Acceptance evidence gained:** 70 focused tests and generated validation pass with `compose_imports` coverage, but the independent import-reference reproduction prevents complete-or-reject acceptance; no new criterion is independently confirmed `MET`.
- **Validation state changed:** broader generated and focused gates pass, yet the finding-specific reproduction fails the product contract. Public-install validation was not run because the user authorized rework only.
- **Repeated work or failures:** the same finding family recurred after a second claimed exhaustive inventory correction. Relevant source changed, but the completeness invariant remains unproven.
- **Token/invocation telemetry:** one fresh implementer package and one independent re-review this cycle; do not repeat broad checks without a source-matched invalidation reason.
- **Decision:** **STOP_NON_CONVERGENT**. Do not launch another incremental correction or claim integration on this source.
- **Next bounded action:** redesign the shared import/reference traversal and define a mechanically checked manifest-effect completeness boundary before a new implementation attempt. Separately, release-maintainer publication and anonymous-install evidence remain unauthorized.

## Shared Import/Reference Traversal Redesign Addendum — 2026-10-12

This addendum records the freshly authorized **redesign only** after recurring F065-001/F065-005. It supersedes the earlier path-inventory design for the next local implementation package, but it does not alter the spec, acceptance criteria, non-goals, local-only amendment ownership, or publication boundary. No implementation, publication, or commit is authorized by this addendum.

### Evidence and bounded diagnosis

- The current `OverlayEffectInventory` is exhaustive only over conventional overlay filenames plus the two manifest path arrays. It returns import path strings, not the parsed semantics or references of imported documents.
- Managed composition reparses `overlay.yml` and imported documents in `composer.ts`; amendment separately checks only direct-patch local Feature text and import extensions before calling the managed merge function. This split allowed an imported patch containing `features: {"./features/demo": {}}` to pass amendment compatibility and produce a dangling reference.
- The effective catalog merger rewrites `.shared/` import paths into the namespace-qualified merged root. Traversal must therefore start from `OverlaysContext.overlaysDir`, never from the built-in root or the pre-merge external source, and every resolved node must retain effective-root and declaration provenance.
- The typed manifest surface currently contains 18 authored fields—`id`, `name`, `description`, `category`, `supports`, `requires`, `suggests`, `conflicts`, `tags`, `ports`, `order`, `serviceOrder`, `imports`, `compose_imports`, `minimal`, `hidden`, `repeatable`, and `parameters`—plus loader-synthesized `origin`. Conventional file effects are `devcontainer.patch.json`, `docker-compose.yml`, `setup.sh`, `verify.sh`, `.env.example`, `.gitignore`, and additional files. Both sets must be represented explicitly rather than inferred by an open-ended directory copy.
- Current built-in `imports` use JSON devcontainer patches and `.env` fragments; current `compose_imports` use YAML compose fragments. External immutable catalogs can introduce any already documented supported import type, including a devcontainer patch containing local path references.

### Required design: one resolved semantic effect graph

Replace the filename inventory with one pure resolver that loads a selected overlay from the effective root and returns an ordered, provenance-bearing **semantic effect graph**. It performs reads, parsing, path containment checks, parameter substitution/validation, and reference discovery, but no output writes and no amendment policy decisions.

1. **Canonical manifest semantics registry.** Define one source-level authored-field registry keyed by `keyof Omit<OverlayMetadata, 'origin'>`, plus a separate explicit classification for synthesized `origin`, and use `satisfies Record<keyof Omit<OverlayMetadata, 'origin'>, ManifestFieldSemantics>` or an equivalent compile-time totality check. Classify authored fields as identity/display metadata, selection/compatibility semantics, parameter semantics, devcontainer imports, or compose imports. Keep a similarly closed registry for conventional overlay files. A field or conventional file-family addition must fail type/tests until its resolver and both consumer dispositions are declared.
2. **Runtime manifest closure.** Parse the raw selected manifest once through the canonical loader contract. Compare its authored keys with the declared authored-field registry and report unknown or malformed semantics as an unsupported effect for amendment rather than silently ignoring it. Add a schema/registry parity test against `tool/schema/overlay-manifest.schema.json`, excluding only the explicitly synthesized `origin`; align missing schema documentation for an already supported field such as `serviceOrder`, but do not add a new public field or globally tighten unrelated discovery behavior in this package.
3. **Typed ordered nodes.** Emit a discriminated union for manifest constraints, direct devcontainer patch, imported devcontainer patch, environment import/example, direct compose fragment, imported compose fragment, setup/verify script, ignore requirement, and additional file. Each node carries overlay ID, direct/transitive selection provenance, effective overlays root, overlay directory, declaring manifest field or conventional source, declared path, resolved absolute source, import ordinal, parsed/substituted value where applicable, and catalog origin/identity when available.
4. **Semantic devcontainer reference traversal.** Parse JSON/YAML devcontainer imports exactly once and run the same reference walker over direct and imported patches. The walker must cover the repository's documented relative-path contract already preserved for team bases: `features` source keys, `build.dockerfile`, `build.context`, and scalar/array `dockerComposeFile`. It returns typed references with JSON-pointer-like location and source-document provenance; it must not use regexes or treat a safe extension as proof that the document is self-contained. Remote Feature IDs/URLs and absolute paths are classified explicitly, not mistaken for local artifacts.
5. **No implicit recursive import language.** `imports` and `compose_imports` remain manifest-declared lists; imported documents do not gain nested import directives. Traversal follows references inside a parsed document, not arbitrary YAML keys or shell-string guesses. If implementation discovers another path-bearing devcontainer field already supported by managed composition and relevant to relocation, stop and amend this plan before coding rather than silently broadening the walker.
6. **Consumer exhaustiveness.** Managed generation and amendment consume the same union through exhaustive `switch`/`assertNever` handling. Managed materializers preserve current ordering and byte-for-byte output: devcontainer imports before the direct patch; environment imports/examples in existing order; compose imports before each direct compose fragment. Amendment maps every node and reference to an explicit disposition: `materialize`, `merge`, `metadata-only`, or `reject`. A successful plan is mechanically impossible while an undisposed node/reference remains.

### Effective-root and reference policy

- Resolve all declared imports beneath `<effective overlays root>/.shared`; retain both the rewritten declared path and resolved source. Keep namespace/catalog provenance from the effective manifest `origin` and `OverlaysContext.catalogs` for diagnostics and receipts.
- Continue to reject traversal, missing files, symlinks, malformed documents, unsupported extensions, unresolved tokens, and destination collisions before amendment mutation.
- **Team-base references:** continue the spec-060 relocation behavior from the team devcontainer directory to the alternate devcontainer directory. They are not overlay-owned artifacts.
- **Overlay remote/absolute references:** preserve only where the devcontainer contract already treats them as location-independent and compatibility checks find no hard incompatibility.
- **Overlay local relative references:** fail closed unless the semantic node identifies an existing, validated source and the amendment materializer has an explicit receipt-owned destination mapping. In this bounded correction, imported or direct local Feature references without such a declared mapping—including the reproduced `./features/demo` case—must reject the whole selection before writes. Do not guess that a similarly named file elsewhere in `.shared`, the overlay directory, or the repository is its source.
- Generic local-Feature discovery/copying, new catalog asset declarations, nested imports, and parsing arbitrary lifecycle shell strings would expand the overlay contract and are excluded. If satisfying a desired case requires one of those, stop for Lead/architecture review instead of adding heuristics. This preserves the current managed contract and makes the amendment's complete-or-reject behavior truthful.

### Ordered implementer package

1. **Characterize current managed semantics.** Add fixtures for all 18 authored manifest fields plus synthesized `origin`, all conventional file families, import ordering, parameter substitution, and effective-root namespace rewriting. Snapshot representative managed output before changing the resolver.
2. **Introduce the closed semantic model.** Add the manifest/file registries, typed effect/reference union, provenance types, `assertNever` helpers, and focused registry/schema parity tests. No materializer changes in this step.
3. **Resolve imports once from the effective root.** Move import containment, extension checks, parsing, ordering, and parameter resolution behind the pure resolver. Include built-in JSON and `.env` imports, built-in compose imports, and namespace-qualified external JSON/YAML/compose fixtures.
4. **Add shared devcontainer reference traversal.** Traverse direct and imported patch objects for the four documented path-bearing families. Remove the direct-patch regex and extension-only amendment checks only after equivalent semantic rejection tests are green.
5. **Adopt in managed composition.** Make managed devcontainer, environment, compose, and conventional-file materializers consume the resolved graph while proving byte-identical output and unchanged ordering. Do not move write policy into the resolver or create a second composer.
6. **Adopt in amendment planning/materialization.** Build the complete disposition map before calling `applyOverlay` or preparing writes. Merge supported semantic patches; retain existing receipt-owned scripts, environment examples, compose effects, and additional files; reject unsupported local references and any unknown/unconsumed node before the transaction begins.
7. **Lock the recurrence reproduction.** Add direct and imported local-Feature cases for built-in and namespace-qualified external catalogs. Assert actionable provenance in diagnostics and exact no-partial state for both fresh init and prior-valid refresh. Include a positive imported patch with only remote Features to prove the policy is not an import allowlist.
8. **Run source-matched validation and request independent review.** Record one complete dirty-payload fingerprint including untracked tests, then independently dispose F065-001 and F065-005. Keep F065-003/F065-004 publication evidence separate and blocked until release-maintainer authorization.

### Affected files and boundaries

Expected implementation surface:

- `tool/questionnaire/overlay-effects.ts` — replace path inventory with the pure semantic resolver and provenance model; a narrow module split such as `overlay-references.ts` is allowed if it keeps one ownership boundary.
- `tool/schema/types.ts`, `tool/schema/overlay-loader.ts`, `tool/schema/overlay-manifest.schema.json` — canonical field typing/parity and selected-manifest parsing; no new public fields or generated project-schema change is planned.
- `tool/schema/catalogs.ts` — preserve effective-root namespace rewriting and expose/reuse provenance only; do not change ADR-002 catalog identity or source rules.
- `tool/questionnaire/composer.ts` — consume resolved nodes and remove duplicate import reads while preserving managed output.
- `tool/commands/amend.ts` — consume semantic references/dispositions, remove regex/extension-only policy, and retain the already corrected transaction and receipt ownership.
- `tool/__tests__/overlay-effects.test.ts`, `tool/__tests__/composition.test.ts`, `tool/__tests__/amend.test.ts`, catalog/loader tests, and `tests/behave/features/local-amendment.feature` — exhaustive registry, managed characterization, targeted reproduction, and no-partial coverage.
- Test-only catalog fixtures may be created in disposable workspaces. Do not alter built-in overlay manifests merely to manufacture coverage, and do not edit generated output directly.

Boundaries that remain unchanged:

- No changes to `spec.md`, AC-065-01..08, non-goals, Feature installation/lifecycle behavior, spec-063 `installCsCommand`, team-owned files, shared project authority, Git index, or local-only publication rules.
- No Feature publication, npm publication, GHCR mutation, commit, staging/unstaging, or broad cleanup is part of this package.
- Preserve F065-002 transaction behavior and F065-003 static workflow hardening; do not reopen them while redesigning traversal.
- Add no dependency and no general plug-in, recursive-reference, or schema-generation framework.

### Validation surface (DISCOVER delta)

- **Manifest decision:** invalidate the prior completeness portion of the validation manifest. Reuse the transaction, release-static, mandatory-gate, and generated-output checks only after source changes warrant rerun. The recurrence shows that path-list tests are not acceptable completeness evidence.
- **Mechanical completeness:** compile-time total authored-field registry checks with explicit synthesized-provenance handling; runtime exact authored-key parity among the registry, `OverlayMetadata`, and overlay-manifest schema; a fixture matrix containing every manifest semantic class and conventional file class; exhaustive consumer switches that fail compilation on a new union member.
- **Targeted unit checks:** `npx vitest run tool/__tests__/overlay-effects.test.ts tool/__tests__/composition.test.ts tool/__tests__/amend.test.ts` plus loader/catalog tests touched by the implementation. Prove effective-root resolution, ordered JSON/YAML/ENV/compose imports, direct/imported reference provenance, remote Feature success, local Feature rejection, malformed/unknown effect rejection, and managed byte stability.
- **Targeted workflow checks:** `npm run test:bdd -- tests/behave/features/local-amendment.feature`; add the namespace-qualified imported-local-Feature rejection and no-partial assertions, while retaining the successful compose-import and base/index preservation scenarios.
- **Disposable source/compiled repro:** run the exact external-catalog fixture from F065-001 through source and `node dist/scripts/init.js`; both must reject before writes with overlay/import/reference provenance. Run a remote-Feature imported patch as the positive counterpart.
- **No-partial proof:** for fresh and prior-valid amendment states, compare input, receipt, artifact subtree, alternate config, exact `.git/info/exclude`, team/shared files, temp paths, and Git index tree before/after rejection.
- **Broader gates after focused success:** `npm run build`, `task validate`, and `task validate:generated`. Review generated diffs and do not absorb unrelated dirty-tree changes.
- **Not run in this redesign task:** tests, formatting, generation, publication, or registry smoke; only documentation was changed. Live npm/GHCR evidence remains separately unauthorized and continues to block AC-065-01/08.
- **Manifest invalidation triggers:** any new/changed overlay manifest field, conventional effect filename, import type/order, devcontainer relative-path contract, catalog rewrite rule, parameter substitution rule, or amendment destination mapping requires validation-surface rediscovery and an explicit new union/consumer disposition.

### Rollback and containment

- Implement the resolver model, both consumer migrations, and recurrence tests as one local code rollback unit. Do not delete the old duplicate readers until managed characterization and amendment rejection tests pass; if migration fails, revert the package rather than keeping mixed semantic/path inventories.
- Receipt format and existing amendment artifacts need no migration for this redesign because unsupported references reject before write and supported destinations remain unchanged. If implementation proves a receipt migration is required, stop: that is materially expanded scope needing a revised plan/Lead review.
- A failed or reverted implementation must leave the current transaction/rollback behavior and dirty task payload intact. No publication rollback applies because publication remains prohibited.

### Design-quality and architecture fit

- **Owning boundary:** schema/loader defines manifest meaning; the pure resolver defines effective-root semantic effects and references; managed composer and amendment remain separate policy/materialization owners.
- **Simplicity/proportionality:** this is a closed union and shared walker over already supported formats, not a plug-in engine. Existing `js-yaml`, merge, parameter, and catalog capabilities are reused; no dependency is justified.
- **Maintainability/testability:** compile-time field/union totality plus runtime schema parity turns future manifest/effect additions into visible work instead of silent omission. Provenance-rich pure nodes support focused tests without filesystem mutation.
- **Architecture verdict:** **PASS for this bounded internal redesign** under foundation ownership and ADR 002's one-effective-registry rule. No ADR is required while public overlay semantics, catalog identity, source-of-truth, and receipt format stay unchanged.
- **Stop conditions:** require Lead/architecture review before adding a new public manifest field, changing relative-reference meaning, introducing generic catalog asset declarations or nested imports, changing receipt compatibility, mutating team/shared files, or weakening fail-closed behavior. These are not authorized by the current task.

### Execution and handoff

- **Execution profile:** **Governed** — repeated high/medium findings, shared composer/amend boundary, and no-partial safety require source-matched expanded evidence.
- **Route:** **direct bounded implementation of steps 1–7, then independent review**. Diagnosis is now bounded by the reproduced semantic-reference gap; fast path is not eligible. Publication remains a later, separately authorized route after a local independent PASS.
- **Review gate:** **INDEPENDENT** with stable IDs F065-001 and F065-005. F065-002 must remain resolved; F065-003/F065-004 remain external/publication evidence blockers, not scope for this package.
- **Open questions:** none blocking for the fail-closed correction. Materializing arbitrary overlay-local Features is deliberately deferred because the current overlay contract does not declare their source mapping.
- **Implementer package:** use the required design, ordered steps, affected-file boundary, targeted matrix, and rollback rules in this addendum as one cohesive traversal correction. The first reviewable checkpoint is the closed semantic model plus failing recurrence fixtures; the package is not complete until both consumers are exhaustive and the source/compiled no-partial reproduction passes.
- **Blockers:** no local design blocker and no ADR need for implementation as bounded. Integration remains blocked by F065-001/F065-005 until independent PASS, and final completion remains additionally blocked by release-maintainer-authorized npm/GHCR publication plus anonymous immutable-digest install evidence. Preserve the staged/unstaged tree exactly apart from this planner-owned addendum.

### Convergence cycle 4 — 2026-10-12

- **Source before / after:** previous independently reviewed fingerprint `e702b0e83ba10003613af202b3ea593c583d9bcae8e1546207be45bf9dfc0f31`; redesigned implementation independently reviewed at `70fc19b0b6fe06011cdb5fde47f6402846ffd9ea9c24044af5331ba53a1b8d13` (fingerprint includes untracked resolver test). Baseline HEAD is `c586d2589d0a51b0f87658079d8561ad38c00305`.
- **Findings resolved:** F065-002 remains resolved. Direct/imported `./features/demo` rejection and schema parity improved locally, but F065-001/F065-005 are not independently closed.
- **Findings remaining or new:** F065-001 recurs for bare relative `compose.yml`, accepted as remote and left dangling in source and compiled CLI outputs. F065-005 recurs because semantic consumer handling is not exhaustive, environment imports lack amendment disposition, and parameter substitution can change reference classification. F065-003/F065-004 retain publication evidence gaps.
- **Acceptance evidence gained:** 61 focused and 24 legacy import tests, 12 focused BDD scenarios, `task validate`, and `task validate:generated` passed for the implementation payload, but no additional acceptance criterion was independently confirmed `MET`.
- **Validation state changed:** independent source and compiled probes both reproduced accepted incomplete output despite passing broad gates. Registry smoke was intentionally not run because publication was not authorized.
- **Repeated work or failures:** the same complete-or-reject finding family has recurred after multiple materially changed inventories and a semantic traversal redesign. Another narrow correction lacks convergence evidence.
- **Token/invocation telemetry:** one planner, one implementer, and one independent reviewer invocation for this redesign; broad validation was reused by the reviewer.
- **Decision:** **STOP_NON_CONVERGENT**. Do not launch a further correction or integrate the current source. A new route needs an explicit decision to re-scope the compatibility contract or fund a separately reviewed comprehensive semantic model with an independently verified failing-case matrix before implementation.
- **Next bounded action:** preserve the review gate and working tree; obtain a spec-owner decision on the completeness strategy. Public release evidence remains a separate authorization boundary.

### Spec-owner completeness decision — interactive clarification

- **Local references:** copy and relocate referenced files when their source and semantics can be validated; otherwise reject the entire overlay before writing. Do not reject all overlays with local references by default.
- **Dependency chain:** follow nested local-file references and validate the complete chain. If any required dependency cannot be resolved safely, reject the complete selection with an actionable diagnostic.
- **Ownership boundary:** copy only files belonging to the selected overlay. References escaping the selected overlay must not implicitly copy team-owned repository files or assets from other catalogs.
- **Opaque formats:** reject a file whose internal dependencies cannot reliably be inspected unless it can be proven self-contained. Copying bytes alone is not proof of completeness.
- **Execution status:** decision recorded; implementation and independent re-review have not yet been authorized by this clarification alone. F065-001/F065-005 remain open. Public npm/GHCR publication remains separately unauthorized.
