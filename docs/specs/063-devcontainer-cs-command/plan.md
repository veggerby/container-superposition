# Plan

## Scope and Delivery Posture

- Spec: `docs/specs/063-devcontainer-cs-command/spec.md`
- Planning baseline: `81c6694507b12a1123c211d14496d000ccb26f97`; branch `main...origin/main` was clean before shaping.
- Execution profile: **Standard** — the change is bounded but crosses the public project-file contract, composition, lifecycle setup, generated schema/output, documentation, and runtime validation.
- Route recommendation: **direct implementation after spec approval**, followed by **INDEPENDENT** review. Diagnosis first is not required; current ownership and the missing capability are established.
- Requirements authority remains `spec.md`; this plan does not change its acceptance criteria or non-goals.

## Technical Approach and Boundaries

- Add `installCsCommand?: boolean | string` to the shared project selection and composition-answer contracts. Resolve `undefined` and `true` to the exact version recorded as manifest `generatedBy` at the composition boundary; persist explicit `false` and string selections for replay.
- Reuse the official Node Dev Container Feature already used by Node-related overlays to provide npm when enabled. Deep-merge it through existing feature composition so an overlay-provided Node feature is neither duplicated nor downgraded.
- Reuse `getToolVersion()`, the generated `postCreateCommand` map, and `templates/scripts/setup-utils.sh`. Add a narrowly owned generated setup script that loads npm for a non-interactive lifecycle shell, installs `container-superposition@<selected version or tag>` globally, and verifies `cs` resolution and execution. Do not create an overlay, wrapper command, daemon, or dependency.
- Apply the built-in capability before project/custom patches through the normal composition pipeline, using stable feature and lifecycle keys. Preserve existing custom-patch ordering and standard devcontainer merge semantics.
- Record explicit `false` in `superposition.json` so compatibility replay/migration does not lose the opt-out; absent values in legacy receipts retain the new default-enabled behavior. A manifest schema-version increment is not expected for this additive optional field.
- Add an explicit, currently compatible published npm version to the repository-root `superposition.yml` for dogfooding until the published generator-matched version supports this field and exports `cs`. Do not hand-edit root `.devcontainer/`; use regen only for inspection/evidence.
- Change schema source in `scripts/generate-schema.ts`, then regenerate `tool/schema/superposition.schema.json`. Do not directly edit generated schema, `dist/`, or `docs/overlays.md`.
- Keep the field out of `superposition.local.yml`, global init defaults, CLI flags, and questionnaire prompts as required by the spec non-goals.

## Ordered Steps

1. Confirm spec approval and preserve the canonical field/default decisions in `docs/specs/063-devcontainer-cs-command/spec.md`; keep the index and taxonomy synchronized.
2. Extend `ProjectConfigSelection`, `QuestionnaireAnswers`, and `SuperpositionManifest`, then update project-config supported-key validation, boolean parsing, answer conversion, project serialization, manifest conversion, and merge paths. Verify omitted means enabled while explicit `false` survives project and compatibility-receipt round trips.
3. Add the source-owned generic installer script and composer helper. When enabled, merge the existing official Node feature, emit/register the script and shared setup utilities, append a stable post-create entry, pin the npm package to `getToolVersion()`, and fail visibly when install or verification fails. When disabled, emit none of these additions solely for this capability.
4. Add the explicit dogfooding setting to root `superposition.yml`; do not directly edit generated root output.
5. Extend the project-schema generator and regenerate the project schema through `npm run schema:generate`; confirm local/global schema surfaces did not acquire the field.
6. Add focused Vitest coverage for parsing/type rejection, omitted/true/false behavior, project and manifest round trips, exact-version installation, no-Node-overlay generation, plain/compose generation, Node-overlay coexistence, lifecycle merge behavior, and deterministic repeated generation.
7. Add a shared Behave scenario in `tests/behave/features/core-generation.feature` that exercises default-enabled project-file replay and explicit opt-out with semantic assertions for the generated feature, setup script, and lifecycle command.
8. Update `docs/superposition-yml.md` and `CHANGELOG.md` under `[Unreleased]`; retain a single `Added` entry for this new user-visible capability.
9. Run focused checks, generated/schema/reproducibility checks, and a disposable real-container smoke test. Capture source-revision-matched results in `docs/specs/063-devcontainer-cs-command/artifacts/validation.md`.
10. Create `docs/specs/063-devcontainer-cs-command/review-gate.md` with the self-check candidate, then obtain an independent review against all acceptance criteria. Address findings and rerun invalidated checks before integration.

## Affected Areas

- `tool/schema/types.ts` — shared project, answer, and compatibility-manifest field contracts.
- `tool/schema/project-config.ts` — supported-key validation, strict boolean parsing, answer/manifest conversion, merging, and serialization.
- `tool/questionnaire/composer.ts` — default resolution, Node feature merge, generated installer registration, lifecycle command, and receipt output.
- `templates/scripts/setup-container-superposition.sh` (new, likely name) — source-owned npm installation and `cs` verification logic.
- `templates/scripts/setup-utils.sh` — reuse as-is unless a focused, generally useful correction is proven necessary; avoid task-specific expansion without evidence.
- `scripts/generate-schema.ts` — authored project-schema definition and default/description.
- `tool/schema/superposition.schema.json` — generated only by `npm run schema:generate`, never directly edited.
- `superposition.yml` — explicit dogfooding declaration on the authored canonical root project file.
- `tool/__tests__/project-cs-command.test.ts` (new, likely name), plus nearby project/manifest tests if better scoped — focused contract and composition coverage.
- `tests/behave/features/core-generation.feature` — user-visible generated-output scenarios.
- `docs/superposition-yml.md` — user-facing field and in-container workflow reference.
- `CHANGELOG.md` — consolidated user-visible `Added` entry under `[Unreleased]`.
- `docs/specs/063-devcontainer-cs-command/artifacts/validation.md` — durable command/runtime evidence created during implementation.
- `docs/specs/063-devcontainer-cs-command/review-gate.md` — durable review lifecycle record created before review.
- `docs/specs/README.md` and `docs/specs/taxonomy.md` — synchronized spec discovery and categorization.

### Explicitly excluded edit surfaces

- Root `.devcontainer/` — generated/dogfooded output; inspect only after `npm run init -- regen`.
- `dist/` — compiler output; build for evidence, never hand-edit.
- `docs/overlays.md` — unrelated generated overlay reference; do not edit.
- Generated schema JSON — regenerate from `scripts/generate-schema.ts`, never hand-edit.
- Overlay manifests/patches — the capability is project-level and generic, not an overlay.

## Architecture and Engineering Fit

| Attribute                          | Status  | Evidence / required action                                                                                                                                                  |
| ---------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Correctness and task fit           | ALIGNED | A default-enabled root project field directly supplies `cs` in generated containers; `false` provides containment.                                                          |
| Architectural fit                  | ALIGNED | Project intent stays in `superposition.yml`; composer owns materialization; generated output remains standard devcontainer configuration.                                   |
| Simplicity and proportionality     | ALIGNED | Reuses the existing official Node feature, npm package, version helper, setup utility, script registry, and lifecycle merge rather than adding an overlay or dependency.    |
| Maintainability                    | ALIGNED | One generic composer capability and one focused setup script avoid duplicating overlay setup logic.                                                                         |
| Testability and evidence           | ALIGNED | Parser/composer tests, BDD output assertions, deterministic replay, and a real-container execution check cover the relevant boundaries.                                     |
| Security, privacy, and data safety | ALIGNED | Installs a public package at an exact version; no credentials or Git-index mutation are introduced. Registry/network trust and lifecycle execution remain visible.          |
| Reliability and operability        | CONCERN | Default-on network installation can fail or slow container creation; exact pinning, explicit errors, runtime smoke evidence, and `false` containment are required.          |
| Performance and scalability        | CONCERN | Every enabled container incurs Node/runtime and package setup when not otherwise present; measure/record smoke timing if material and avoid duplicate feature/install work. |
| Compatibility and user impact      | CONCERN | Omitted field changes existing generated output. Documentation, changelog, explicit opt-out tests, and independent review are mandatory.                                    |
| Documentation and traceability     | ALIGNED | Spec, plan, index/taxonomy, schema, docs, changelog, validation artifact, and review gate form a durable chain.                                                             |

**Fit verdict:** PASS WITH MANAGED CONCERNS. No ADR is required: this extends the existing project-file and composition contracts without changing their ownership or introducing a new architecture boundary. If implementation requires a new package source, privilege model, or nonstandard runtime mechanism, stop and reassess ADR need before proceeding.

## Validation Surface and Strategy — DISCOVER

- Manifest source: `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, ADR 001, `CONTRIBUTING.md`, dogfooding instructions, `Taskfile.yml`, `package.json`, nearby project/composition/manifest tests, shared Behave features, and CI devcontainer-build guidance at baseline `81c6694507b12a1123c211d14496d000ccb26f97`.
- Manifest reuse decision: **discover fresh for implementation**. No reusable spec-local validation manifest exists, and the new lifecycle/runtime behavior changes generated output and invalidates a docs-only or schema-only manifest.
- Invalidation triggers: changes to acceptance criteria, package version, installer command/script, Node feature options, composition ordering, schema generator, package scripts/Taskfile, devcontainer CLI version, or runtime image/network environment.
- Evidence profile: **Expanded** because generated shape alone cannot prove that `cs` is installed, on `PATH`, version-compatible, and able to execute regen inside a running container.

| Level                     | Command / method                                                                                                                                                                                                                                            | Purpose                                                                                                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused unit              | `npx vitest run tool/__tests__/project-cs-command.test.ts` plus any touched manifest/project test file                                                                                                                                                      | Prove parsing, serialization, default/false behavior, feature/lifecycle composition, version/tag selection, and deterministic output.                                        |
| Focused BDD               | `npm run test:bdd -- tests/behave/features/core-generation.feature`                                                                                                                                                                                         | Prove project-file-first user-visible generation and opt-out using shared semantic assertions.                                                                               |
| Schema                    | `npm run schema:generate` followed by clean-diff inspection                                                                                                                                                                                                 | Prove source-derived project schema support and no accidental local/global field exposure.                                                                                   |
| Build/static              | `npm run build`; final `task validate`                                                                                                                                                                                                                      | Prove compiled ESM behavior, formatting/type checks, and full Vitest suite.                                                                                                  |
| Generated/reproducibility | `task validate:generated`                                                                                                                                                                                                                                   | Required broad gate for schema and generated-output behavior; includes BDD, schema/docs generation, root regen, and doctor. Inspect that no unrelated generated docs change. |
| Real-container smoke      | In a disposable no-Node-overlay plain fixture, run Dev Container CLI `up`, then `exec` `cs --version` and `cs regen`; inspect exit codes and regenerated output. Add a compose-shape generation/build check if not already covered by selected CI evidence. | Prove the lifecycle install, remote-user PATH, exact command, and in-container replay outcome rather than only generated text.                                               |
| Patch hygiene             | `git diff --check`, scoped `git status --short`, and source/generated diff review                                                                                                                                                                           | Prove no direct edits to prohibited surfaces and no unrelated change.                                                                                                        |

### Acceptance-Criteria Evidence Plan

| Criterion           | Planned evidence                                                                                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEVCONTAINER-CS-001 | Focused parser tests for accepted booleans and pre-write rejection of invalid values; generated schema inspection.                                    |
| DEVCONTAINER-CS-002 | Plain/compose composer tests and Behave assertions proving default/true output with no Node overlay.                                                  |
| DEVCONTAINER-CS-003 | Real-container `cs --version` and `cs regen` transcript with source revision, image/tool versions, executor, timestamp, and exit codes.               |
| DEVCONTAINER-CS-004 | Unit assertions for exact package version, visible failure behavior, stable lifecycle key, and coexistence with Node overlay; runtime version output. |
| DEVCONTAINER-CS-005 | Unit/BDD opt-out assertions plus project serialization and compatibility-manifest replay tests.                                                       |
| DEVCONTAINER-CS-006 | Regenerated schema diff and `docs/superposition-yml.md` inspection.                                                                                   |
| DEVCONTAINER-CS-007 | Focused test, BDD, deterministic replay, and real-container evidence recorded in `artifacts/validation.md`.                                           |
| DEVCONTAINER-CS-008 | Changelog inspection, generated-file provenance, `task validate:generated`, `git diff --check`, and final independent review record.                  |

### Durable Evidence and Review Gate

- `artifacts/validation.md` must record command/method, exact source revision or tree identity, environment, timestamp, executor, exit code/result, relevant concise output, skipped checks, and residual risk. It must map each criterion to `MET`, `NOT_MET`, `UNVERIFIABLE`, or `NOT_APPLICABLE`.
- `review-gate.md` must record review mode `INDEPENDENT`, reviewed source revision/tree identity, reviewer, criterion findings, check provenance, verdict, residual risk, and execution-status impact. A self-check may prepare the record but cannot mark the independent gate passed.
- Runtime smoke evidence may be a concise transcript in `artifacts/validation.md`; bulky logs should be linked or stored under the spec-local `artifacts/` directory, not pasted into the plan.
- A missing real-container check is a material residual risk for DEVCONTAINER-CS-003 and must be `UNVERIFIABLE`/blocking unless the independent reviewer accepts equivalent source-revision-matched CI evidence. Network unavailability alone is not evidence that the runtime criterion passed.

## Rollback / Containment

- Immediate project-level containment is `installCsCommand: false`, followed by `cs regen` from an environment where the command remains available; this removes only tool-owned runtime/script/lifecycle additions for the capability.
- Repository rollback reverts the field/type/parser/composer/script/schema-source/tests/docs/changelog/root-project changes, then regenerates schema and output from the reverted sources and runs doctor.
- Because output uses standard devcontainer features and lifecycle commands and stores no service state, rollback requires no data migration. Already-created containers may retain a globally installed package until rebuilt; document that rebuild is needed for complete runtime removal.

## Open Questions

- None blocking. During implementation, confirm the stable lifecycle key and generated script filename against collision checks; naming adjustments that do not change the public field or behavior may remain plan implementation notes.

## Risks / Dependencies

- npm registry availability of the selected version or tag is an external dependency for container creation and runtime smoke validation.
- Custom base-image compatibility depends on the official Node Dev Container Feature's supported distributions and user model; unsupported images should fail through standard feature/lifecycle diagnostics rather than silent fallback installation.
- Applying project/custom patches after the built-in capability preserves existing composition order but permits an advanced patch to override the same lifecycle key. Tests and review must confirm this does not silently disable the default path under ordinary merges.
- `task validate:generated` may regenerate root dogfooded output and schema. Review provenance to distinguish command-generated changes from forbidden direct edits, and do not commit unrelated generated churn.

## Implementation Notes

- Implemented the generic composer capability using the existing official Node feature, `getToolVersion()`, lifecycle command map, and `setup-utils.sh`; no new dependency, overlay, package manager, or wrapper was added.
- Added the explicit root dogfood declaration. Following the npm version-selection amendment, the root project selects the published `0.1.14-main.37579967855` prerelease because the published generator-matched `0.1.3` does not export `cs` and stable `0.1.13` does not recognize the new project field; root `.devcontainer/` is regenerated from source.
- Validation correction: the default capability intentionally retains `scripts/` after overlay scripts are removed, so the stale-script regression now asserts removal of the overlay script and retention of the CS installer. Task overlay Behave expectations now include the additive lifecycle entry.
- `task validate:generated` passed after those corrections. Disposable real-container smoke reached feature image build but Docker Desktop rejected both available workspace bind-mount paths before container start; DEVCONTAINER-CS-003 and DEVCONTAINER-CS-007 remain unverified. See `artifacts/validation.md` and `review-gate.md`.
- No material scope or architecture deviation occurred. The task owner explicitly authorized implementation after recovery on 2026-10-06; this advanced the approved work past shaping without changing requirements.
- The selected implementation review mode is SELF_CHECK. It is recorded in `review-gate.md`; any later independent review cannot pass the candidate without runtime evidence or explicit risk acceptance.
