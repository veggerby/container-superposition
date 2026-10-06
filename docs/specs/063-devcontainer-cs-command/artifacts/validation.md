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
