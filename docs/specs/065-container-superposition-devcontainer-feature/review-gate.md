# Review Gate — 065 Container Superposition Dev Container Feature

## Gate decision

- **Review mode:** `INDEPENDENT`
- **Verdict:** `CHANGES_REQUESTED`
- **Execution status impact:** `BLOCKED`
- **Risk status:** `PENDING_ACCEPTANCE`
- **Local contract verdict (excluding unauthorized public release evidence):** `CHANGES_REQUESTED`
- **Reviewed committed baseline / HEAD:** `c586d2589d0a51b0f87658079d8561ad38c00305`
- **Implementation commits:** none; reviewed as a dirty worktree over the baseline
- **Reviewed implementation-payload fingerprint:** SHA-256 `70fc19b0b6fe06011cdb5fde47f6402846ffd9ea9c24044af5331ba53a1b8d13`
- **Fingerprint provenance:** SHA-256 of the binary diff from `HEAD`, excluding the spec-local plan, validation record, independent gate, and self-check gate, concatenated with binary no-index diffs for all untracked files in sorted order. The untracked `tool/__tests__/overlay-effects.test.ts` is included.
- **Implementer fingerprint cross-reference:** `70fc19b0b6fe06011cdb5fde47f6402846ffd9ea9c24044af5331ba53a1b8d13`; independently reproduced exactly
- **Evidence provenance:** current dirty implementation payload, source-matched implementer `SELF_CHECK`, `artifacts/validation.md`, independently reproduced payload fingerprint, code review, and independent source/compiled disposable gap probes
- **Canonical authority:** `spec.md`, the Shared Import/Reference Traversal Redesign Addendum in `plan.md`, prior gates F065-001..005, `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, ADR 001, ADR 002, overlay schema/types/loader/catalog merger, and managed composer behavior

The correction closes the previously demonstrated `./features/demo` import case and preserves the tested transaction behavior, but the authorized redesign is still not semantically or mechanically exhaustive. The reference classifier treats bare relative paths such as `Dockerfile`, `context`, and `compose.yml` as remote. Both source and compiled `amend init` therefore accepted a namespace-qualified imported patch containing `dockerComposeFile: "compose.yml"`, wrote a successful alternate configuration with that dangling relative reference, and materialized no referenced compose file. The graph also emits effect kinds that amendment never disposes, while the exported `assertNever` is unused. F065-001 and F065-005 recur.

F065-003 and the public portion of F065-004 remain separate external evidence blockers. Publication was not authorized and was not attempted. They do not cause the local-contract failure in this gate; the independently reproduced local traversal defect does.

## Batched findings and stable-ID disposition

### High

#### F065-001 — OPEN / RECURRED: imported relative references can still be accepted without materialization

- **Severity:** High
- **Affected criteria:** AC-065-02, AC-065-04, AC-065-06, AC-065-08
- **Disposition suggestion:** `AUTOMATE`
- **Route:** implement the authorized traversal contract, then rerun the focused source/compiled no-partial matrix

`referenceClass()` in `tool/questionnaire/overlay-effects.ts` classifies a value as local-relative only when it begins with `./`, `../`, `.` or `..`. That is not the devcontainer relative-path contract already implemented for team-base relocation: `build.dockerfile: "Dockerfile"`, `build.context: "context"`, and `dockerComposeFile: "compose.yml"` are also relative paths. The shared walker therefore marks these as `remote`, and amendment rejects only references classified as `local-relative`.

Independent reproduction used a repository-relative, namespace-qualified path catalog with an imported JSON patch containing `dockerComposeFile: "compose.yml"` and an otherwise empty direct patch. Both commands exited `0`:

- source: `npx tsx scripts/init.ts amend init --project-root <fixture>`;
- compiled: `node dist/scripts/init.js amend init --project-root <fixture>`.

Each alternate config retained `"dockerComposeFile": "compose.yml"`; neither alternate nor receipt-owned output contained that file. The successful result is incomplete and cannot truthfully satisfy complete-or-reject.

The current design has two additional paths to the same defect class:

- references are discovered before parameter substitution, while `applyOverlay` substitutes both keys and values; a token classified as remote can become a local path after substitution;
- `environment-import` nodes are emitted, but amendment has no disposition or materialization path for them, so overlays such as `prometheus`/`otel-collector` can lose their declared `.env` support effect.

These are batched under the recurring complete-effect finding rather than assigned new IDs.

**Required correction:** classify relative paths using the actual field contract (absolute/URI versus relative), discover references on the substituted semantic document or otherwise prove substitution cannot alter classification, and make amendment explicitly consume or reject every environment/reference effect before mutation. Add bare-relative and parameterized-reference fixtures alongside the existing `./features/demo` case, with exact fresh/prior-state no-partial assertions.

#### F065-003 — EXTERNAL EVIDENCE BLOCKER: public publication/install proof remains unauthorized and absent

- **Severity:** High acceptance blocker; no new local implementation defect established in this pass
- **Affected criteria:** AC-065-01, AC-065-08
- **Disposition suggestion:** `AUTOMATE`
- **Route:** only after a local independent PASS, release maintainer authorizes and runs final publication

The static workflow controls remain present in the reviewed payload. No npm/GHCR publication, anonymous immutable-digest pull, exact-package Feature installation, or `cs --version` smoke was authorized or executed. This is intentionally separate from the local contract verdict. Repository/release-maintainer authority is required; the reviewer does not accept or authorize this risk.

### Medium

#### F065-004 — PARTIALLY RESOLVED: source-matched local gates are valid but miss the reproduced contract gap; public evidence remains external

- **Severity:** Medium
- **Affected criteria:** AC-065-01, AC-065-02, AC-065-04, AC-065-06, AC-065-08
- **Disposition suggestion:** `AUTOMATE`
- **Route:** add the finding-specific matrix, rerun source-matched local gates, then obtain separately authorized release evidence

The implementation fingerprint in the self-check is complete and independently reproducible, including the untracked resolver test. The recorded focused, BDD, build, mandatory, and generated checks therefore match the reviewed implementation payload and are reusable. They do not include bare relative references or substitution-sensitive reference classification and did not detect the source/compiled contract failure.

The local evidence must be expanded after correction. Public registry evidence remains unavailable by explicit authorization boundary and cannot be substituted with static workflow tests.

#### F065-005 — OPEN / RECURRED: consumer completeness is not mechanically exhaustive

- **Severity:** Medium
- **Affected criteria:** AC-065-06, AC-065-08
- **Disposition suggestion:** `AUTOMATE`
- **Route:** complete the already authorized closed semantic graph and exhaustive consumer dispositions

The authored-field registry and schema parity test are useful, and the direct/imported patch walker is shared. The implementation does not complete the addendum's mechanical boundary:

- `assertNever` is exported but unused;
- managed and amendment consumers do not exhaustively switch over `OverlayEffectNode`;
- amendment inspects only `patch`/`imported-patch` references and separately uses compatibility projections such as `imports`, `composeImports`, and `envExamplePath`;
- `environment-import` nodes have no amendment disposition;
- nodes do not carry the required effective-root, direct/transitive selection, and catalog identity provenance;
- parameter substitution occurs later in consumers rather than in the semantic graph.

Consequently a new or currently unhandled node/reference can still be accepted without a compile-time or runtime undisposed-effect failure. The bare-relative reproduction is the observable consequence.

**Required correction:** make both consumers exhaustive over the node/reference unions, with explicit `merge`, `materialize`, `metadata-only`, or `reject` decisions; apply parameter resolution before final reference disposition; and remove or subordinate compatibility projections so they cannot bypass the graph.

### Resolved and preserved

#### F065-002 — RESOLVED: tested amendment transaction atomicity remains preserved

The source-matched implementer evidence includes fresh-init and prior-refresh rollback checks for input, receipt, owned artifacts, exact local-exclude bytes, and Git-index state. The traversal changes did not alter the outer transaction boundary. No contradictory atomicity result was found. This does not rescue accepted-but-incomplete output under F065-001.

### New material findings

None assigned a new stable ID. Bare-relative, substitution-sensitive, and undisposed environment effects are equivalent instances of F065-001/F065-005.

## Acceptance-criteria classification

| Criterion | Status    | Independent disposition                                                                                                                                                  |
| --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-065-01 | `NOT_MET` | Feature source/workflow exist, but authorized public registry-backed installation of the real `cs` is absent (external F065-003).                                        |
| AC-065-02 | `NOT_MET` | Opt-in/non-Pi routing exists, but an accepted imported patch can produce an incomplete personal overlay result.                                                          |
| AC-065-03 | `MET`     | Documentation preserves canonical project-file intent and the explicit `cs regen` then rebuild sequence.                                                                 |
| AC-065-04 | `NOT_MET` | Team-base ownership is preserved, but a successful personal amendment can contain a dangling imported relative reference.                                                |
| AC-065-05 | `MET`     | No automatic regen, refresh, rebuild, reopen, launch, or Docker lifecycle behavior was introduced.                                                                       |
| AC-065-06 | `NOT_MET` | Direct/imported traversal handles the prior dot-relative Feature case but fails complete-or-reject for bare relative references and lacks exhaustive effect disposition. |
| AC-065-07 | `MET`     | Guidance distinguishes Feature installation, managed shared intent, personal amendment intent, and command-before-rebuild sequences.                                     |
| AC-065-08 | `NOT_MET` | Source-matched gates pass but omit the reproduced defect; local independent PASS and authorized public release evidence are absent.                                      |

## Validation/context manifest and gap analysis

### Context manifest

- **Reusable source identity:** baseline `c586d2589d0a51b0f87658079d8561ad38c00305` plus implementation payload `70fc19b0b6fe06011cdb5fde47f6402846ffd9ea9c24044af5331ba53a1b8d13` only. Any implementation or untracked-file change invalidates this gate.
- **Instruction/config authority inspected:** `AGENTS.md`, foundation, DoD, ADR 001, ADR 002, spec 065, full plan/addendum, prior independent gate, self-check, validation record, repository-local CLI/dogfooding/workflow guidance, and relevant source/tests.
- **Local skill discovery:** repository-local `cli-command-delivery`, `dogfooding-safety`, and `workflow-sync` matched the changed command/generated/workflow surfaces. No repository-local public-registry evidence skill exists.
- **Ownership boundaries:** schema/loader owns manifest meaning; shared resolver should own effective-root semantic discovery; managed composer and amendment own distinct materialization policy; amendment owns local transactionality; release CI owns external immutable publication evidence.

### Manifest gap analysis

- The previous `./features/demo` import reproduction is covered and now rejects.
- The complete-reference manifest remains invalid because local-relative classification covers only dot-prefixed paths and occurs before parameter substitution.
- Mechanical consumer closure remains absent; emitted environment effects can be undisposed.
- F065-002 transaction evidence remains valid for the exact payload.
- The `serviceOrder` overlay-manifest schema alignment is covered by the registry/schema parity test and did not introduce a new public field.
- Public release evidence remains intentionally unavailable and separate.

### Independently run

| Check                                                                                                    | Result             | Provenance / relevance                                                                             |
| -------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| Full implementation-payload fingerprint, including all untracked files                                   | PASS — `70fc19b0…` | Independently matches the implementer identity and binds reused evidence to the reviewed payload.  |
| `git diff --check` over the implementation payload                                                       | PASS               | No whitespace-error blocker.                                                                       |
| Direct walker probe for `Dockerfile`, `context`, and `compose.yml`                                       | **CONTRACT FAIL**  | All three values were classified as `remote`, contradicting the documented relative-path contract. |
| Disposable namespace-qualified path catalog with imported `dockerComposeFile: "compose.yml"`; source CLI | **CONTRACT FAIL**  | Exit `0`; alternate written with dangling `compose.yml`; referenced file not materialized.         |
| Same disposable fixture through compiled CLI                                                             | **CONTRACT FAIL**  | Exit `0` with the same dangling result, proving source/compiled parity of the defect.              |

### Inspected and reused, not blindly rerun

The implementation evidence is source-matched to the independently reproduced fingerprint:

- focused resolver/amend/composer: 61 tests passed;
- legacy import regression: 24 tests passed;
- amendment BDD: 12 scenarios / 132 steps passed;
- `npm run build` passed;
- `task validate`: 57 files / 831 tests passed, with 20 existing environment-gated skips;
- `task validate:generated`: full BDD (63 scenarios), docs/schema generation, root regen, and doctor Healthy;
- `git diff --check` passed.

These checks were intentionally reused per the review instruction. Repeating them would not resolve the finding-specific source/compiled failure.

### Intentionally skipped / unavailable

| Check                                                                              | Reason                                                                                            | Residual risk                                                                                                           |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Repeat focused/full Vitest, Behave, `task validate`, and `task validate:generated` | Exact-payload implementer evidence is valid; independent targeted probes are more discriminating. | Corrected code must add the missing cases and rerun all source-matched gates.                                           |
| Additional destructive fault injection                                             | F065-002 has exact-payload evidence and traversal did not move the transaction boundary.          | Atomicity must remain in the post-correction matrix.                                                                    |
| Live npm/GHCR publication and anonymous Feature smoke                              | Not authorized; privileged and externally visible.                                                | AC-065-01/08 remain not met; public visibility, digest linkage, exact package install, and `cs --version` are unproved. |

## Architecture, design, and implementation-ladder disposition

| Attribute                      | Status                 | Evidence / action                                                                                              |
| ------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| Correctness and task fit       | `CONFLICT`             | Source and compiled flows accept an imported dangling relative reference (F065-001).                           |
| Architectural fit              | `CONCERN`              | Effective-root sharing aligns with ADR 002, but resolver/consumer semantic ownership remains split (F065-005). |
| Simplicity and proportionality | `ALIGNED`              | A closed shared walker remains the correct small boundary; no dependency or framework is warranted.            |
| Maintainability                | `CONCERN`              | Compatibility projections and non-exhaustive consumers can drift from graph nodes.                             |
| Testability and evidence       | `CONCERN`              | Broad source-matched gates exist but omit bare/substitution-sensitive references and undisposed effects.       |
| Security/data safety           | `ALIGNED` with blocker | Git-index and transaction safety remain preserved; fail-closed compatibility is incomplete.                    |
| Reliability and operability    | `CONFLICT`             | A successful command can emit an alternate config with an unresolved local compose path.                       |
| Performance and scalability    | `ALIGNED`              | No material concern identified for the bounded synchronous catalog traversal.                                  |
| Compatibility and user impact  | `CONCERN`              | The complete-or-reject user contract remains false for a valid relative-path spelling.                         |
| Documentation and traceability | `ALIGNED` with blocker | Plan/self-check/evidence are traceable to one exact payload, but the completion claim is disproved.            |

- **Design-quality judgment:** the shared resolver is the right ownership seam, but path classification, substitution order, and consumer exhaustiveness do not yet implement the authorized design.
- **Implementation ladder:** rung 2/4 — reuse the existing base relocation semantics and parameter substitution, then add the smallest exhaustive union handling. No new dependency or plug-in framework.
- **ADR impact:** no ADR is required for the bounded correction. Lead/spec-owner review is required only if complete-or-reject, relative-reference meaning, or supported effect scope is to be narrowed.

## Residual risk and required acceptance authority

- **Residual risk:** accepted incomplete imported output; bare or substitution-produced local paths bypassing rejection; undisposed environment imports; non-exhaustive consumer drift; and absent public npm/GHCR installation evidence.
- **Reviewer risk acceptance:** none.
- **Required authority:** F065-001/F065-005 require implementation, not reviewer acceptance. Only the spec owner/Product Lead may re-scope complete-or-reject. Repository/release maintainers must separately authorize and execute immutable npm/GHCR publication and anonymous smoke evidence for F065-003/F065-004.

## Follow-up route

1. **Implement:** correct bare-relative and substitution-sensitive traversal and make both consumers exhaustive over every node/reference disposition; preserve F065-002.
2. **Validate locally:** add direct/imported bare-relative, parameterized-reference, and environment-import cases; rerun focused tests, amendment BDD, source/compiled disposable cases, `task validate`, and `task validate:generated` against one complete payload fingerprint.
3. **Independent re-review:** preserve F065-001..005 and review the exact validated payload.
4. **External release route:** only after local `PASS` and release-maintainer authorization, publish and record anonymous immutable-digest pull, exact npm package Feature install, `cs --version`, run URL, digest, and commit.

**No done/integration claim:** local correction is not ready for integration. Publication remains unauthorized. No commit, publish, staging, or unstaging was performed by this review.
