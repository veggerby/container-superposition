# Review Gate — DEVCONTAINER-CS-063

- **Review mode:** INDEPENDENT
- **Verdict:** CHANGES_REQUESTED
- **Review status:** CHANGES_REQUESTED
- **Execution status:** BLOCKED
- **Risk status:** PENDING_ACCEPTANCE
- **Reviewed baseline:** `81c6694507b12a1123c211d14496d000ccb26f97` (`main`, dirty candidate)
- **Reviewed implementation identity:** tracked non-spec diff SHA-256 `18a8089a5f9ecee31caba91c884e40f8fd750b390cf4ab1f6f4c9b2aa4b11eb1`; untracked implementation inputs `templates/scripts/setup-container-superposition.sh` SHA-256 `aac7388a54d3ec0b95aa53bf072bb7170d5405dc5370292398c5b0abff629eca` and `tool/__tests__/project-cs-command.test.ts` SHA-256 `2df195e73e074824579b9879c05aa67322b4e02e72610f8076a0eb710aa9b554`.
- **Review timestamp:** 2026-10-06T17:37:21Z
- **Reviewer posture:** one batched independent pass; no production files changed.

## Independent review result

The source/config/schema/composer/test/documentation diff is coherent with project-file-first and source-owned generation boundaries. The implementation reuses the existing Node feature, setup utilities, lifecycle map, and package version helper without adding an overlay, package manager, wrapper, or dependency. Focused unit/regeneration tests pass.

Acceptance is nevertheless blocked by a source/package identity problem, not just by the reported Docker mount failure. The reviewed tree generates `container-superposition@0.1.3`, while the npm registry's immutable `container-superposition@0.1.3` package exposes only the `container-superposition` bin and does not expose `cs`. A clean prefix install independently confirmed that no `cs` executable is created. Consequently, this candidate's generated lifecycle script reaches its explicit `command -v cs` failure path, so the current exact-version artifact cannot satisfy the default-enabled command or in-container regen requirements.

A future source-matched PR prerelease can resolve that identity mismatch because the publish workflow assigns a unique prerelease version before packing. Evidence from such a package must still be tied to this reviewed source and exercised in a mount-capable real container before the gate can pass.

## Batched findings

| ID | Severity | Finding | AC effect | Required route | Suggested disposition |
| --- | --- | --- | --- | --- | --- |
| REV-063-001 | Blocker | The exact version emitted by the reviewed candidate is `0.1.3`, but the immutable npm `container-superposition@0.1.3` artifact has no `cs` bin. Independent clean-prefix installation produced only `container-superposition`; therefore the generated installer cannot expose `cs` and will fail verification. The Docker-blocked smoke cannot be treated as the only remaining uncertainty. | DEVCONTAINER-CS-002 and DEVCONTAINER-CS-003 are `NOT_MET`; DEVCONTAINER-CS-007 is `NOT_MET`. | Publish a unique source-matched PR prerelease (or otherwise provide an immutable candidate package produced from this exact source), generate with that same package/version, then run the specified real-container `devcontainer up` → `cs --version` → `cs regen` smoke in a mount-capable environment. Re-review the resulting source/package/container evidence. | AUTOMATE: add a post-publication package/bin plus disposable-container smoke gate so immutable registry drift cannot recur. |

No additional high-, medium-, or low-severity findings were identified in this pass.

## Acceptance-criteria classification

| Criterion | Status | Independent evidence |
| --- | --- | --- |
| DEVCONTAINER-CS-001 | MET | Loader allowlist and strict optional-boolean parsing are present; focused test rejects a string before composition. Both supported project-file names use the same loader path. |
| DEVCONTAINER-CS-002 | NOT_MET | Generated shape includes Node, installer, lifecycle, and remote PATH configuration, but the exact registry artifact selected by this tree does not expose `cs`; clean-prefix installation confirmed the runtime command is absent. |
| DEVCONTAINER-CS-003 | NOT_MET | The current exact package cannot provide `cs`, so `cs --version` and `cs regen` cannot succeed after lifecycle setup. The requested real-container smoke also remains unavailable because the reported daemon cannot mount the workspace. |
| DEVCONTAINER-CS-004 | MET | Source pins `container-superposition@${getToolVersion()}`, verifies command/version, propagates failure through `set -euo pipefail`, and preserves an existing Node feature configuration. The current verification failure is correctly visible, but does not satisfy AC-002/003. |
| DEVCONTAINER-CS-005 | MET | Explicit `false` omits capability-owned feature/script/lifecycle output and survives project serialization plus manifest replay in focused tests. |
| DEVCONTAINER-CS-006 | MET | Schema source/generated schema and `docs/superposition-yml.md` describe the boolean, default, opt-out, and in-container workflow. |
| DEVCONTAINER-CS-007 | NOT_MET | Focused/unit/Behave coverage exists, but the criterion explicitly requires a passing real-container command/regen smoke; additionally, the current immutable exact package lacks the `cs` bin. |
| DEVCONTAINER-CS-008 | MET | Changelog and generated schema are present; implementer evidence records passing `task validate`, `task validate:generated`, and diff hygiene for the reviewed diff identity. Independent review cannot pass overall while AC-002/003/007 fail. |

## Validation/context manifest gap analysis

### Authority and context inspected

- `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, ADR 001
- `CONTRIBUTING.md` and `.github/instructions/dogfooding.instructions.md`
- spec 063 `spec.md`, `plan.md`, prior self-check gate, and `artifacts/validation.md`
- complete candidate diff and both untracked implementation files
- relevant composer merge/order code, setup utilities, Node feature/setup patterns, package metadata, and publication workflow/docs
- repository-local `cli-command-delivery` and `dogfooding-safety` guidance

### Provenance assessment

- The reported tracked non-spec diff hash was independently reproduced.
- The prior record named but did not hash the two untracked implementation inputs; this gate adds their hashes so the reviewed tree identity is bounded.
- Implementer `task validate` and `task validate:generated` evidence matches the tracked diff identity and is accepted for broad lint/unit/BDD/generated/reproducibility coverage; it does not prove runtime installation.
- The prior Docker result is valid blocker evidence only: exit 125 occurred before lifecycle execution and proves neither success nor a code defect.
- The validation manifest omitted the immutable registry package/bin check. That gap was material because lifecycle behavior depends on an external exact-version package.

## Independent checks run

| Check | Command/method | Source/evidence identity | Result |
| --- | --- | --- | --- |
| Diff identity | SHA-256 of `git diff --binary` from baseline excluding spec-local artifacts | Reviewed dirty tree | PASSED — `18a8089a…b11eb1` reproduced. |
| Patch hygiene | `git diff --check` | Reviewed dirty tree | PASSED. |
| Focused tests | `npx vitest run tool/__tests__/project-cs-command.test.ts tool/__tests__/manifest-regeneration.test.ts` | Reviewed dirty tree | PASSED — 2 files, 9 tests. |
| Registry identity | `npm view container-superposition@0.1.3 version dist.tarball --json` and packed manifest inspection | npm registry immutable version `0.1.3` | PASSED as inspection; published manifest has only `container-superposition` bin. |
| Installed-bin probe | clean temporary `npm install --global --prefix <tmp> container-superposition@0.1.3` | npm registry immutable version `0.1.3` | FAILED requirement — only `container-superposition` symlink exists; `cs` is absent. |

## Checks intentionally not rerun

| Check | Reason | Residual risk |
| --- | --- | --- |
| Full `task validate` | Source-matched implementer run already passed 809 tests; focused independent tests covered changed logic. | Low for static/unit regressions. |
| `task validate:generated` | Existing source-matched pass covers BDD, generation, schema, regen, and doctor; rerun would not establish registry/container runtime behavior. | Low for deterministic generated shape; none of this evidence closes runtime ACs. |
| Docker/devcontainer smoke | Explicit task guardrail says to stop rather than attempt a container workaround; the known daemon cannot mount the workspace. | High and blocking: lifecycle, remote-user PATH, and in-container replay remain unproven for a source-matched package. |
| Build from compiled output | Implementer build/generated validation passed; no new source-vs-compiled path resolver was introduced. | Low. |

## Residual risk and acceptance authority

- **Residual risk:** High. A generated default-on lifecycle currently selects an immutable package that cannot create `cs`; even after a matching prerelease is published, remote-user PATH and in-container `regen` still require real-container proof.
- **Required acceptance authority:** the task/product owner must explicitly waive DEVCONTAINER-CS-002/003/007, with release-maintainer concurrence for accepting an unverified package-publication/runtime path. The independent reviewer does **not** accept this risk and does not recommend waiver while direct package evidence shows failure.

## Gate disposition and bounded recovery

**CHANGES_REQUESTED; execution remains BLOCKED.** Do not integrate or mark done.

Bounded recovery:

1. Produce a unique PR prerelease package from the exact candidate revision and record its version, tarball integrity, and source SHA.
2. Confirm that package exports both `container-superposition` and `cs`.
3. In a mount-capable Docker/Dev Container environment, generate the fixture using that same package/version, then prove lifecycle completion, `cs --version` equals the generator version, and `cs regen` succeeds from the mounted project file.
4. Attach concise source/package/container provenance to `artifacts/validation.md` and request one follow-up independent review.

If publishing a source-matched candidate is not authorized, route to the task owner for re-plan or explicit risk disposition; do not substitute the current `0.1.3` registry artifact or accept shape-only tests as runtime evidence.
