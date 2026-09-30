# Self-check Gate — Global Local Config Refresh Correction

- Review mode: `SELF_CHECK` (required integration review remains `INDEPENDENT`)
- Reviewed source: correction working tree based on `f64a9fbecd0a708f7d99346390b8f725b1f9df29`; this record is committed with the correction.
- Verdict: `PASS` for implementer self-check; independent re-review remains required.
- Execution status: `ACTIVE`
- Residual risk: filesystem permission, device-crossing rename, and real terminal integration remain platform-dependent; controlled failure seams cover the command's containment behavior.

## Finding dispositions

| Finding  | Disposition | Evidence                                                                                                                                                                                        |
| -------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GLC-R001 | Fixed       | Direct templates no longer receive an invented `plain` stack; compose-oriented direct-mount regression passes.                                                                                  |
| GLC-R002 | Fixed       | Injected confirmation, backup, atomic-write seams cover approve/cancel, noninteractive refusal, backup failure, install failure, staged-file cleanup, byte preservation, and home immutability. |
| GLC-R003 | Fixed       | Direct subcommand help states precedence, `--force`, sibling backups, and bootstrap/sync-only non-replay authority.                                                                             |
| GLC-R004 | Fixed       | Removed the unused materialization/validation implementation and imports from `tool/cli/run.ts`; init regressions remain in the targeted suite.                                                 |

## Validation evidence

- `npx vitest run tool/__tests__/global-defaults.test.ts` — PASS (42 tests), including correction safety regressions and existing init/replay isolation tests.
- `npm run test:bdd -- tests/behave/features/core-tooling.feature` — PASS (35 scenarios).
- `npm run build` — PASS.
- Compiled help and happy refresh smoke — PASS: `node dist/scripts/init.js defaults refresh-local --help` asserted direct precedence text; a temporary workspace with a compose-oriented direct template created the local file successfully.
- `npm run init -- regen` — PASS.
- `npm run init -- doctor` — PASS; healthy with no reproducibility errors.
- `git diff --check` — PASS.
- `task validate` — executed as the final required gate for this correction before commit.

## Acceptance criteria

| Criteria            | Status | Evidence                                                                                                                                |
| ------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| GLC-REFRESH-001–002 | MET    | Selected-source loader and selected-file/no-write command coverage.                                                                     |
| GLC-REFRESH-003–005 | MET    | Direct compose-oriented regression and stack-aware canonical-project regressions.                                                       |
| GLC-REFRESH-006–010 | MET    | Automated interactive approve/cancel, noninteractive refusal, backup/install failure, cleanup, original-byte, and home-byte assertions. |
| GLC-REFRESH-011     | MET    | Retained init/regen/plan/doctor invalid-home isolation coverage.                                                                        |
| GLC-REFRESH-012     | MET    | Direct source and compiled help checks plus automated help assertion.                                                                   |
| GLC-REFRESH-013     | MET    | Targeted command/unit suite, focused BDD, required validation, compiled smoke, and health checks.                                       |

No schema or overlay change occurred, so schema/docs generation is not applicable. Browser and migration checks are not applicable to this terminal-local command. The source revision is intentionally not claimed as independently reviewed; route this committed correction to `INDEPENDENT` review.
