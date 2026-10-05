# Correction-cycle validation evidence

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
