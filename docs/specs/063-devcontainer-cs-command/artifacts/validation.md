# Validation Evidence — DEVCONTAINER-CS-063

- **Recorded source revision:** `81c6694507b12a1123c211d14496d000ccb26f97` plus this uncommitted implementation working tree.
- **Executor/environment:** local Linux workspace; Node.js 24.21.0; Docker Server 29.8.1; Dev Container CLI 0.89.0.
- **Date:** 2026-10-06.
- **Evidence profile:** Expanded, because generated output cannot prove lifecycle installation or in-container replay.

## Validation surface discovered

- **Build/type/format:** `npm run build`, `task validate` (within generated validation).
- **Unit:** focused `project-cs-command.test.ts`; full Vitest suite through `task validate:generated`.
- **User-visible workflow:** shared and overlay Behave features through `task validate:generated`.
- **Generated/schema/reproducibility:** `task validate:generated` (`docs:generate`, `schema:generate`, root `regen`, and `doctor`).
- **Runtime:** disposable plain no-Node-overlay Dev Container smoke: generate, `devcontainer up`, `cs --version`, and `cs regen`.
- **Patch hygiene:** `git diff --check` and scoped status inspection.

## Checks run

| Check                                                               | Result  | Evidence                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx vitest run tool/__tests__/project-cs-command.test.ts`          | PASSED  | 3 tests: default installation, false serialization/manifest replay, invalid-value rejection, Node coexistence.                                                                                                                            |
| `npm run test:bdd -- tests/behave/features/core-generation.feature` | PASSED  | 8 scenarios, including default plain output and compose false opt-out.                                                                                                                                                                    |
| `npm run build`                                                     | PASSED  | TypeScript compilation completed.                                                                                                                                                                                                         |
| `task validate:generated`                                           | PASSED  | Full lint/type/Vitest, Behave (56 scenarios), generated docs/schema, root regen, and healthy doctor. First attempt exposed stale-script and overlay Behave expectations; both were corrected before the passing rerun.                    |
| `git diff --check`                                                  | PASSED  | No whitespace errors.                                                                                                                                                                                                                     |
| disposable `devcontainer up` smoke                                  | BLOCKED | Feature image built successfully, but Docker Desktop rejected workspace bind mounts: `/host_mnt/private/tmp/cs-command-smoke` and `/workspaces/container-superposition` do not exist on the daemon host. The lifecycle command never ran. |

## Checks not run

| Check                                    | Reason                                                                                                        | Residual risk                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| In-container `cs --version` / `cs regen` | Docker daemon host cannot bind either available workspace path, blocking container start after feature build. | The package install, PATH exposure, and replay were not runtime-proven in this environment. |

## Acceptance criteria evidence

| Criterion           | Status       | Evidence                                                                                                                                  |
| ------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| DEVCONTAINER-CS-001 | MET          | Strict loader boolean validation and focused invalid-value test; regenerated project schema.                                              |
| DEVCONTAINER-CS-002 | MET          | Composer applies official Node feature, lifecycle installer, scripts, and remote PATH by default; plain/compose unit and Behave evidence. |
| DEVCONTAINER-CS-003 | UNVERIFIABLE | Runtime smoke blocked before lifecycle execution by Docker bind-mount environment.                                                        |
| DEVCONTAINER-CS-004 | MET          | Installer pins `getToolVersion()`, verifies `cs --version`, and feature merge preserves selected Node feature; focused test.              |
| DEVCONTAINER-CS-005 | MET          | Explicit false prevents capability output and survives project serialization and manifest replay; focused + Behave tests.                 |
| DEVCONTAINER-CS-006 | MET          | `scripts/generate-schema.ts`, regenerated schema, and `docs/superposition-yml.md`.                                                        |
| DEVCONTAINER-CS-007 | UNVERIFIABLE | Automated parsing/generation/BDD coverage passes, but required real-container smoke remains blocked.                                      |
| DEVCONTAINER-CS-008 | MET          | Changelog, generated schema by owning command, and passing `task validate:generated`.                                                     |

## Validation claim

- **Review mode:** SELF_CHECK candidate for later INDEPENDENT review.
- **Review status:** SELF_CHECKED.
- **Execution status:** BLOCKED.
- **Risk decision:** PENDING_ACCEPTANCE.
- **Validation status:** BLOCKED.

The implementation passes all runnable validation. It is not ready to claim DEVCONTAINER-CS-003 or DEVCONTAINER-CS-007 because the required real-container smoke could not reach the container lifecycle command.

## Resumed execution — source-matched self-check

- **Authorization:** task owner explicitly authorized proceeding after recovery on 2026-10-06; this record advances the approved task from shaping to implementation validation.
- **Source baseline:** `81c6694507b12a1123c211d14496d000ccb26f97` (`main`, dirty implementation tree).
- **Code-diff identity:** tracked source diff (excluding spec-local workflow artefacts) SHA-256 `18a8089a5f9ecee31caba91c884e40f8fd750b390cf4ab1f6f4c9b2aa4b11eb1`; untracked implementation inputs are `templates/scripts/setup-container-superposition.sh` and `tool/__tests__/project-cs-command.test.ts`.
- **Environment:** Linux workspace; Node.js 24.21.0; Docker Server 29.8.1; Docker context `default`.

| Check                     | Command or method                                                                       | Result             | Concise evidence                                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Mandatory core validation | `task validate`                                                                         | PASSED             | `lint:fix`, lint/typecheck, and Vitest passed: 55 test files / 809 tests; 1 integration test file / 20 tests intentionally skipped by its existing gate.           |
| Focused Docker retry      | `docker run --rm --mount "type=bind,src=$PWD,dst=/workspace,readonly" alpine:3.20 true` | BLOCKED (exit 125) | Daemon returned `bind source path does not exist: /workspaces/container-superposition`; it cannot see this workspace path. No container/lifecycle command started. |
| Patch hygiene             | `git diff --check`                                                                      | PASSED             | No whitespace errors.                                                                                                                                              |

The focused retry confirms the same daemon-host bind-mount blocker as the earlier disposable Dev Container attempt. Per the execution guardrail, no further Docker retry was attempted. The existing source-matched `task validate:generated` PASS remains the generated/schema/reproducibility evidence; the new `task validate` PASS revalidates the mandatory final gate after recovery.

## EXECUTE disposition

- **Review mode:** SELF_CHECK
- **Review status:** SELF_CHECKED
- **Execution status:** BLOCKED
- **Risk decision:** PENDING_ACCEPTANCE
- **Validation status:** BLOCKED
- **Residual risk:** DEVCONTAINER-CS-003 and DEVCONTAINER-CS-007 remain `UNVERIFIABLE` until a Docker daemon with a mountable workspace runs the disposable `devcontainer up` → `cs --version` → `cs regen` smoke, or the required authority accepts source-revision-matched equivalent CI evidence.

## 2026-10-07 version-selection amendment (supersedes earlier validation for changed source)

- Baseline: `27b68ff0d90e2327fd6a036125356983e62de7cb`; candidate is the unstaged diff in this worktree, excluding unrelated staged `Taskfile.yml` and `scripts/push-with-gh.sh` changes.
- `npx vitest run tool/__tests__/project-cs-command.test.ts tool/__tests__/manifest-regeneration.test.ts`: PASS, 13 tests before final explicit-true addition.
- `npm run test:bdd -- tests/behave/features/core-generation.feature`: PASS, 10 scenarios.
- `task validate:generated`: PASS after final source/root change; 814 unit tests passed, 20 existing Docker-dependent tests skipped, 58 Behave scenarios passed, generated schema/docs/regen/doctor completed, doctor Healthy with 0 blocking.
- `npm run build`: PASS. `git diff --check`: PASS.
- Isolated npm prefix installer check of generated root script (`installCsCommand: 0.1.14-main.37579967855`): PASS; installed `cs --version` returned `0.1.14-main.37579967855`, and `cs regen` from a disposable plain project succeeded.
- Isolated npm prefix installer check of default `latest`: PASS for installation, `cs --version` returned `0.1.13`; `cs regen` of a project with `installCsCommand: false` FAILED because published `0.1.13` does not understand the new field. At that time the root project pinned a compatible published prerelease; it now opts out. Default `latest` will support in-container regen only when the stable release includes the new field.
- Real-container check: BLOCKED. `docker run --rm -v "$PWD:/workspace:ro" mcr.microsoft.com/devcontainers/base:trixie ...` failed with Docker Desktop mount denial for `/workspaces/container-superposition` (exit 125). Dev Container lifecycle/PATH smoke remains unverified.
- Review status: SELF_CHECKED, independent re-review pending; execution BLOCKED for full acceptance until mount-capable smoke and review gate.

## 2026-10-07 user-confirmed generator-matched default

- User chose omitted/true to select the manifest `generatedBy` version; the prior `latest`-default evidence is historical, not evidence for the current default.
- Candidate identity: HEAD `27b68ff0d90e2327fd6a036125356983e62de7cb`, non-spec `git diff` SHA-256 `d6d22c2498204880f8506c0b7967f0b6e5ff643d9bf65074a58e0745e563f0b9`.
- `npx vitest run tool/__tests__/project-cs-command.test.ts tool/__tests__/manifest-regeneration.test.ts`: PASS (14 tests). `task validate:generated`: PASS (814 tests, 20 existing Docker-dependent skips; 58 Behave scenarios; schema/docs/regen/doctor Healthy). `npm run build`: PASS. `git diff --check`: PASS.
- At this validation point, the generated root script selected pinned published prerelease `0.1.14-main.37579967855` as then specified by root `superposition.yml`. Isolated temporary-prefix installation and `cs regen` from a disposable project succeeded; `cs --version` returned the selected prerelease.
- Default `generatedBy: 0.1.3` remains unverified for `cs` and is known broken against the immutable npm 0.1.3 artifact without a bin named `cs`. Real-container lifecycle smoke remains blocked by Docker Desktop host bind-mount denial. Independent re-review of this revised candidate remains pending; execution BLOCKED, risk PENDING_ACCEPTANCE.

## 2026-10-07 selector correction

- Candidate: HEAD `27b68ff0d90e2327fd6a036125356983e62de7cb`; current non-spec diff SHA-256 `2f4ea95bef58375f57fc1066274d8913f5c30e7f589f06da58706f4313fb93a4`.
- Focused Vitest: PASS (12 `project-cs-command` tests, including accepted special dist-tags and rejected semver-like ranges). `task validate:generated`: PASS (818 tests, 20 existing Docker-dependent skips; 58 Behave scenarios, schema/docs/regen/doctor Healthy). `npm run build`: PASS. `git diff --check`: PASS.
- Previous `task validate:generated` attempt failed a test that assumed YAML strings beginning with `-` were emitted unquoted. The assertion was corrected to parse the serialized YAML and the complete gate rerun passed.
- No new real-container evidence; known Docker Desktop mount blocker and published `0.1.3` bin mismatch remain.

## Root dogfooding opt-out

The root `superposition.yml` now sets `installCsCommand: false`. This repository uses `npm run init -- regen` from its checked-out source; it does not install a separate global `cs` package in its dogfooding container. The prior root prerelease installation evidence above is historical, not the current root configuration. `task validate:generated` passed against this tree (818 Vitest tests passed, 20 pre-existing Docker-dependent skips, 58 Behave scenarios; doctor Healthy with 0 blocking). After root regen, `.devcontainer/superposition.json` records `installCsCommand: false`, `.devcontainer/devcontainer.json` has no `setup-container-superposition` lifecycle command, and `.devcontainer/scripts/setup-container-superposition.sh` is absent. `git diff --check` passed. Consumer-project default-on behavior and its independent-review blocker remain unchanged.
