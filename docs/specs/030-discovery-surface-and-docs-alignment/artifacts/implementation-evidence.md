# Correction-cycle validation evidence

## 2026-10-05 authorized completion batch (latest implementer self-check)

- User authorization: finish Spec 030 from the preserved working tree, including
  guidance inventory, filesystem contract, team workflow, and all remaining
  review findings. Earlier stopped cycles below are retained as historical
  evidence, not current execution blockers after this explicit authorization.
- Revision: `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`;
  intentionally non-clean candidate preserved. Executor: coding implementer.
  Environment: Node v24.21.0, npm 11.19.0, Task 3.45.4.
- An independent pre-edit inventory review reproduced the historical 260/151/50
  scan, identified `CONTRIBUTING.md` as an additional current conflict, and
  confirmed the two root-receipt corrections. The amended inventory records
  the initial 13 guidance-file boundary and the fourteenth `docs/presets.md`
  correction after independent review. No CLI source, overlay manifests,
  schema types, or generated output behavior changed in this correction batch.
- `npm run test:bdd -- tests/behave/features/core-tooling.feature`: exit 0,
  36 scenarios / 206 steps passed. The candidate already includes the Behave
  rendering scenario; the additional documentation-only correction does not
  require a new scenario.
- `npx vitest run tool/__tests__/commands.test.ts tool/__tests__/ux-renderers.test.ts`:
  exit 0, 94 tests passed.
- `task validate`: exit 0, lint:fix, lint/typecheck, 806 tests passed;
  20 normally gated integration tests skipped.
- `npm run docs:generate`, `npm run schema:generate`: exit 0, generated files
  unchanged; executed because overlay README guidance changed. `npm run init -- doctor`:
  exit 0, healthy (21 checks, 0 blocking, 0 reproducibility errors).
- Seven distinct safe `npm run init -- plan --stack ... --overlays ...`
  selections were executed against live source CLI, including the observability
  stack with and without Python demo, plain Node.js, Python/Jupyter, LocalStack,
  PostgreSQL, and the final compose template Python selection. The initially
  proposed compose example with Node.js and Grafana returned a conflict (exit 1)
  and was replaced by the verified Python selection; no invalid example remains
  in that template. Help confirms the `--port-offset` flag. Changed write
  examples were checked against help but not executed against the root project.
- `git diff --check HEAD`: exit 0. Source/compiled build, `regen`, and browser
  checks not selected because the batch only corrects guidance, not generator
  behavior; doctor plus regenerated overlay reference/schema cover the overlay
  README boundary. No manual generated artifact edit was made.
- AC-1/2/8: focused unit and BDD coverage for default categories and filtered
  port metadata. AC-3/4/5/6: amended finite inventory, fourteen corrected
  surfaces, named guides, and executable preview examples. AC-7: no changes to
  `init`, `regen`, or `plan` semantics in this correction batch.
- First independent final-tree review requested two corrections: a conflicting
  `docs/presets.md` runnable example and a duplicate changelog addition under
  released `0.1.13`. Both were corrected: the replacement preset selection
  `python,postgres,redis,otel-collector,prometheus,grafana,loki` ran through
  live `plan` with exit 0 and no conflicts; only the added released entry was
  removed while `[Unreleased]` retained the current candidate description.
- Review status: **SELF_CHECK** on these corrections; independent re-review
  of the final tree is required before claiming completion.

---

- **Executor:** coding implementer
- **Correction baseline/tree identity:** `07bb3e8bdc77675df563632a49532081ccd9f1376c833470fa00b93d194415de`
- **Source revision:** `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`
- **Validation timestamp:** `2026-10-02T09:32:31Z`
- **Environment:** Node `v24.21.0`, npm `11.19.0`, Task `3.45.4`
- **Tracked working-tree fingerprint:** `afd6a7f60c5e95e4f2791120eef2c52687fbd390c07649ffb49cceed2903f7ce` from `git diff --no-ext-diff HEAD | sha256sum` immediately after the final validation; this identifies the tracked correction tree and intentionally excludes spec-local untracked evidence files.
- **Review mode / status:** INDEPENDENT / re-verification pending. This is implementer `SELF_CHECK` evidence, not review approval.

## Validation surface discovered

- **Formatting, typecheck, and unit suite:** `task validate` (runs `lint:fix`, lint, then Vitest).
- **Focused command regression:** `tool/__tests__/commands.test.ts` and `tool/__tests__/ux-renderers.test.ts`.
- **BDD command behavior:** `tests/behave/features/core-tooling.feature` because filtered `list` text is user-visible behavior.
- **Manual command/docs checks:** live filtered list and `init`/`plan`/`doctor` help; `git diff --check`; current-document `--from-manifest` label scan; custom-patches link existence.
- **Not triggered:** build, generated-output, schema, overlay-doc, regen, and doctor checks. This correction changes list rendering/help/docs/tests only; it does not alter overlays, schemas, generation, or compiled-output path logic.

## Checks run

| Check                     | Command or method                                                                                                                                                                                                                  | Source revision              | Exit code | Result                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- |
| Focused regression        | `npx vitest run tool/__tests__/commands.test.ts tool/__tests__/ux-renderers.test.ts`                                                                                                                                               | `12f3dd65` + correction tree | 0         | PASS — 94 tests                                                                                             |
| BDD command behavior      | `npm run test:bdd -- tests/behave/features/core-tooling.feature`                                                                                                                                                                   | `12f3dd65` + correction tree | 0         | PASS — 36 scenarios, 206 steps                                                                              |
| Live behavior/help        | `npm run init -- list --category database`; `npm run init -- init --help`; `npm run init -- plan --help`; `npm run init -- doctor --help`                                                                                          | `12f3dd65` + correction tree | 0         | PASS — readable PostgreSQL port token; each help surface labels manifest input compatibility/migration-only |
| Documentation/link checks | `grep -RIn --include='*.md' -- '--from-manifest' README.md tool/README.md docs .github/instructions`; `test -f docs/custom-patches.md`; `grep -Fq '[Custom Patches](custom-patches.md)' docs/team-workflow.md`; `git diff --check` | `12f3dd65` + correction tree | 0         | PASS — retained current guidance is compatibility/migration-context; link resolves; no whitespace errors    |
| Mandatory gate            | `task validate`                                                                                                                                                                                                                    | `12f3dd65` + correction tree | 0         | PASS — 806 tests passed; 20 integration tests skipped by their normal gate                                  |

## Self-check fixes

- The first new unit assertion expected stale PostgreSQL description text; corrected it to the live `PostgreSQL 16 database` metadata and reran the focused suite successfully.
- The new BDD scenario initially used a missing negative-output step. Added the reusable `the command stdout should not contain` step, then reran the focused feature successfully.
- An initial focused command run timed out in an unrelated existing project-file replay test while it ran concurrently with BDD. The serial targeted rerun passed all 94 tests; no product change was needed.

## Checks not run

| Check                                                                | Reason                                                                                                        | Residual risk                                                                          |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `npm run build`                                                      | No compiled CLI behavior or source/compiled path logic changed.                                               | Compiled artifact is not directly exercised; TypeScript is checked by `task validate`. |
| `task validate:generated`, docs/schema generation, `regen`, `doctor` | No overlay, schema, generated-output, or reproducibility trigger applies; this is not an integration handoff. | None expected for generation behavior.                                                 |

## Finding dispositions

| Finding    | Disposition | Evidence                                                                                                                                               |
| ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SPEC030-R1 | RESOLVED    | Filtered `list` rows now append normalized `Ports:` metadata; focused unit and BDD coverage assert readable rich-port output and no `[object Object]`. |
| SPEC030-R2 | RESOLVED    | README corrects normal `regen` authority; CLI help and current docs label `--from-manifest` as compatibility/migration-only.                           |
| SPEC030-R3 | RESOLVED    | This evidence records revision, timestamp, environment, tracked-tree fingerprint, commands, results, skips, and correction self-checks.                |
| SPEC030-R4 | RESOLVED    | Team workflow links to `docs/custom-patches.md`; opportunities last-updated date is `2026-10-02`.                                                      |

## Acceptance criteria evidence

| Criterion ID | Evidence                                                                                                                         | Status |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-1         | Existing messaging category coverage remains in focused command/UX tests; no regression in this correction.                      | MET    |
| AC-2         | Filtered database list prints `Ports: 5432/tcp — postgres — PostgreSQL database connection`; unit and BDD regression tests pass. | MET    |
| AC-3         | Named guides retain canonical project-file-first guidance; manifest references are reframed.                                     | MET    |
| AC-4         | README and current `--from-manifest` documentation/help explicitly frame legacy input as compatibility/migration-only.           | MET    |
| AC-5         | Existing preview-first documentation remains intact; no change to plan/init/regen semantics.                                     | MET    |
| AC-6         | Current-doc scan and existing docs alignment preserve removal of stale primary guidance.                                         | MET    |
| AC-7         | Focused command, BDD, and mandatory tests pass; the correction changes only list presentation and guidance.                      | MET    |
| AC-8         | New focused unit test and BDD scenario cover category-filtered port rendering and prevent object stringification.                | MET    |

## Validation claim

- **Validation status:** PASS
- **Execution status:** ACTIVE
- **Residual risk:** independent re-verification remains required by the selected INDEPENDENT review mode. No known failing relevant check.

---

# Authorized AC-6 correction evidence

- **Executor:** coding implementer (`SELF_CHECK` only)
- **Authorization:** explicit maintainer authorization after `STOP_NON_CONVERGENT`; one bounded correction for `SPEC030-R5`, then stop for comprehensive independent review
- **Source revision:** `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`
- **Validation timestamp:** `2026-10-02T11:30:10Z`
- **Tracked working-tree fingerprint:** `25cf7281b08a879c7b91971b29a2dc2ca57bb9ca49565e5222fb7854c018f623` from `git diff --no-ext-diff HEAD | sha256sum`; it identifies the tracked partial-change tree and intentionally excludes this spec-local untracked evidence.
- **Working tree:** intentionally non-clean (24 entries), with prior tracked partial changes preserved. This correction adds `docs/adopt.md`; the pre-existing modification to `.github/instructions/dogfooding.instructions.md` is completed rather than reverted.

## Validation surface executed

| Check                    | Command or method                                                                                                               | Result | Evidence                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live command contract    | `npm run init -- plan --help`; `npm run init -- regen --help`; `npm run init -- adopt --help`; `npm run init -- migrate --help` | PASSED | Help confirms preview flags, project-file replay, standard project-file adoption, and migration-only manifest support.                                                     |
| Adoption safety          | `npm run init -- adopt --dry-run`                                                                                               | PASSED | Read-only output identifies the project file as canonical shared intent, `superposition.json` as compatibility artifact, and generated output as unchanged.                |
| Documentation checks     | Targeted stale-guidance scan; `npx prettier --check` for changed docs/artifacts; link existence; `git diff --check`             | PASSED | No `_serviceOrder`, `--postgres`, `--write-manifest`, manifest-first, or suggested-command guidance remains in the two corrected surfaces; formatting and whitespace pass. |
| Required repository gate | `task validate`                                                                                                                 | PASSED | 806 tests passed; 20 integration tests were normally skipped. The gate ran `lint:fix`, lint/type checks, and Vitest.                                                       |

## Checks not run

| Check                                                                                         | Reason                                                                                                                                                                                 | Residual risk                                                                                 |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Focused Behave feature                                                                        | The authorized correction changes only Markdown/instructions; it does not alter observable workflow behavior. Existing BDD evidence remains applicable to the prior CLI rendering fix. | Prose is not machine-asserted; independent content review is required.                        |
| `npm run build`, `task validate:generated`, `npm run init -- regen`, `npm run init -- doctor` | No CLI, overlay, schema, generated-output, or reproducibility behavior changed.                                                                                                        | None expected beyond documentation accuracy, addressed by live help and dry-run verification. |

## Finding and acceptance evidence

| Finding / criterion | Evidence                                                                                                                                                                                                                                                                                                                        | Status                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `SPEC030-R5`        | `docs/adopt.md` makes project files the default adoption output and editable shared intent; it retains the manifest solely as a compatibility/audit receipt and labels `--project-file` deprecated. Dogfooding instructions use root `superposition.yml` → `plan`/`plan --diff` → `regen`, with manifest replay migration-only. | RESOLVED_PENDING_INDEPENDENT_REVIEW |
| AC-6                | Targeted scan and manual classification confirm neither corrected document teaches manifest-first, category-flag, stale-flag, or implementation-internal workflow as current guidance.                                                                                                                                          | MET (SELF_CHECK)                    |
| AC-7                | Diff is documentation/instruction/workflow-evidence only; no CLI source changed in this correction. `task validate` passed.                                                                                                                                                                                                     | MET (SELF_CHECK)                    |

## Validation claim

- **Validation status:** PASS
- **Execution status:** ACTIVE
- **Review mode / status:** `SELF_CHECK` / `SELF_CHECKED`; comprehensive `INDEPENDENT` review remains required.
- **Residual risk:** The CLI still emits a legacy `suggestedCommand` value in its JSON/analysis model, but this authorized documentation-only scope does not change CLI behavior. The corrected end-user documentation deliberately does not present it as recommended workflow; independently review this boundary against AC-6.

---

# Maintainer-authorized R5–R7 correction-batch evidence

- **Executor / review mode:** coding implementer; `SELF_CHECK` only.
- **Source revision:** `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`.
- **Source-tree condition:** intentionally non-clean tree containing prior Spec 030 changes; those changes were preserved. The final tracked-tree fingerprint and timestamp are reported in the implementation handoff. Spec-local artifacts are intentionally excluded from the provenance fingerprint convention.
- **Scope:** documentation/workflow-artifact correction only. No CLI behavior change was made for R5–R7.

## Validation surface executed

| Surface                  | Check / method                                                                                                                                 | Result                                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Live example contract    | `npm run init -- plan --stack compose --overlays nodejs,postgres` plus `--verbose` and `--diff`; root dogfooding plain selection plus `--diff` | PASSED — each exit 0                                                                                                             |
| Command contract         | `npm run init -- init --help`; `regen --help`; `adopt --help`; `migrate --help`; `npm run init -- list --category preset`                      | PASSED — options and current metadata discovery verified                                                                         |
| Existing CLI regression  | `npx vitest run tool/__tests__/commands.test.ts tool/__tests__/ux-renderers.test.ts`                                                           | PASSED — 94 tests                                                                                                                |
| Existing BDD regression  | `npm run test:bdd -- tests/behave/features/core-tooling.feature`                                                                               | PASSED — 36 scenarios / 206 steps                                                                                                |
| Doctor                   | `npm run init -- doctor`                                                                                                                       | PASSED — no reproducibility error                                                                                                |
| Required repository gate | `task validate`                                                                                                                                | PASSED — 806 tests passed; 20 normally gated integration tests skipped                                                           |
| Documentation hygiene    | focused R5/R6 token scan, `git diff --check`                                                                                                   | PASSED — all retained matches are valid flat-overlay input, compatibility/audit wording, or an explicit legacy-index prohibition |

## R5–R7 dispositions and acceptance evidence

| Finding / criterion       | Evidence                                                                                                                                                                  | Status           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `SPEC030-R5` / AC-6       | `docs/adopt.md` and dogfooding preview commands now supply live `--stack` and `--overlays` values; runtime plan variants exit 0.                                          | MET (SELF_CHECK) |
| `SPEC030-R6` / AC-4, AC-6 | `custom-patches`, filesystem, overlay-authoring, preset, and deployment-target guides now lead with `superposition.yml` / flat `overlays:` and label manifests correctly. | MET (SELF_CHECK) |
| `SPEC030-R7`              | Spec notes and changelog identify the actual candidate's list rendering, command-test, and Behave work.                                                                   | MET (SELF_CHECK) |
| AC-1, AC-2, AC-8          | Existing candidate tests and focused BDD continue to cover messaging category presence and readable filtered port rendering.                                              | MET (SELF_CHECK) |
| AC-3, AC-5, AC-7          | Named guides plus corrected first-party surfaces retain canonical preview-first guidance; no init/regen/plan semantics changed in this batch.                             | MET (SELF_CHECK) |

## BDD justification

No Behave scenario changed for R5–R7 because these corrections change Markdown and workflow records, not observable command behavior. The candidate's existing user-visible filtered-list rendering correction already adds Behave coverage; the focused feature was rerun successfully. Live help/runtime verification covers corrected executable documentation examples.

## Skipped checks and residual risk

- `npm run build`, generated docs/schema, and `regen` were not selected: no source, overlay, schema, or generated-output behavior changed in R5–R7. Residual risk is documentation accuracy, mitigated by live command verification and independent review.
- Independent review/integration are not performed by this implementer. Existing review verdict remains `CHANGES_REQUESTED` until a reviewer rechecks this exact final tree.

## Validation claim

- **Validation status:** PASS (implementer self-check)
- **Execution status:** ACTIVE
- **Risk decision:** PENDING_ACCEPTANCE by independent review
- **Handoff:** ready for the requested independent gate; not integrated.

---

# Authorized complete R6/R7 correction evidence

- **Executor / review mode:** coding implementer; `SELF_CHECK` only.
- **Source revision:** `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` on `main`.
- **Validation timestamp:** `2026-10-05T07:08:39Z`.
- **Environment:** Node `v24.21.0`, npm `11.19.0`, Task `3.45.4`.
- **Tracked working-tree fingerprint:** `e93254c072cd4762f93ffff49a288045fc2b010d7175772a5f50de4a70017cb9` from `git diff --no-ext-diff HEAD | sha256sum`; the intentionally unclean tree and spec-local artifacts are preserved.
- **Scope:** all explicitly authorized first-party R6 docs/examples, target-preview wording, receipt path, and R7 changelog placement. No CLI behavior changed.

## Finding and acceptance evidence

| Finding / criterion       | Evidence                                                                                                                                                                                                                                                                                     | Status             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `SPEC030-R6` / AC-4, AC-6 | Messaging, minimal/editor, workflow, custom-patch, and custom-patch-example guidance now lead with project files and flat overlays; receipt inspection uses `.devcontainer/superposition.json`. Deployment-target guidance explicitly states that `plan` cannot accept or preview `target:`. | MET (`SELF_CHECK`) |
| `SPEC030-R7`              | Current canonical-guides and filtered-list-rendering entries are under `[Unreleased]`; `0.1.13` released history is preserved.                                                                                                                                                               | MET (`SELF_CHECK`) |
| AC-1, AC-2, AC-8          | Existing candidate command and Behave coverage remains unchanged; full validation passed.                                                                                                                                                                                                    | MET (`SELF_CHECK`) |
| AC-3, AC-5, AC-7          | Existing named-guide alignment remains intact; this pass changes docs/workflow records only.                                                                                                                                                                                                 | MET (`SELF_CHECK`) |

## Checks run

| Check                    | Command or method                                                                     | Result                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Live command contract    | `npm run init -- plan --help`, `init --help`, and `regen --help`                      | PASSED — confirmed plan has no target input and current init/regen contracts.                                       |
| Corrected examples       | Every changed `plan --stack … --overlays …` command, including `--diff`               | PASSED — all exit 0.                                                                                                |
| Documentation scan       | Targeted stale category-flag, manifest-replay, receipt-path, and target-preview scans | PASSED — no current stale token remains in the corrected files; receipt path is `.devcontainer/superposition.json`. |
| Doctor                   | `npm run init -- doctor`                                                              | PASSED — healthy; no reproducibility error.                                                                         |
| Required repository gate | `task validate`                                                                       | PASSED — 806 tests passed; 20 integration tests skipped by the normal gate.                                         |
| Diff hygiene             | `git diff --check`                                                                    | PASSED.                                                                                                             |

## Checks not run

| Check                                                                       | Reason                                                                                                                              | Residual risk                                                                           |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `npm run build`, `task validate:generated`, schema/docs generation, `regen` | No source, overlay, schema, generated-output, or compilation change.                                                                | Documentation accuracy is mitigated by live CLI checks; compiled behavior is unchanged. |
| Behave edit/run                                                             | Documentation and workflow-record correction only; existing candidate Behave coverage is for the unchanged list rendering behavior. | Prose remains subject to independent content review.                                    |

## Validation claim

- **Validation status:** PASS (`SELF_CHECK`)
- **Execution status:** ACTIVE
- **Review mode / status:** `INDEPENDENT` requested; existing independent verdict remains `CHANGES_REQUESTED` until re-review of fingerprint `e93254c0…`.
- **Risk decision:** PENDING_ACCEPTANCE by independent review; integration is not claimed.
