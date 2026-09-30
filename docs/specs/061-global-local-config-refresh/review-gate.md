# Self-check Gate — Global Local Config Refresh

- Review mode: `SELF_CHECK` (required integration review remains `INDEPENDENT`)
- Reviewed source revision: `cdaf936fb6f83e076e33f6fa4f6c2a68f952b760` plus working-tree implementation
- Verdict: `PASS`
- Execution status: `ACTIVE`
- Residual risk: independent review should inspect replacement/backup ordering and interactive TTY behavior.

## Validation evidence

- `npx vitest run tool/__tests__/global-defaults.test.ts` — PASS (36 tests)
- `npm run test:bdd -- tests/behave/features/core-tooling.feature` — PASS (35 scenarios)
- `task validate` — PASS (54 test files / 797 tests; expected integration suite skipped)
- `npm run build` and `node dist/scripts/init.js defaults refresh-local --help` — PASS
- `npm run init -- regen` and `npm run init -- doctor` — PASS; doctor healthy with no reproducibility errors.

## Acceptance criteria

| Criteria            | Status | Evidence                                                                                          |
| ------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| GLC-REFRESH-001–002 | MET    | selected-source and invalid/no-source unit command coverage                                       |
| GLC-REFRESH-003–005 | MET    | direct and stack-aware unit/BDD coverage; canonical project-stack-only implementation             |
| GLC-REFRESH-006–010 | MET    | non-TTY refusal, forced replacement, original-content backup, collision unit test, no-write cases |
| GLC-REFRESH-011     | MET    | retained init/regen/plan/doctor invalid-home isolation coverage                                   |
| GLC-REFRESH-012     | MET    | Commander help, README, quick reference, config guide, changelog                                  |
| GLC-REFRESH-013     | MET    | targeted unit/command coverage, BDD scenario, full validation                                     |

No implementation-plan deviations. The solution reuses schema-owned materialization helpers and Node filesystem primitives; no dependency or schema change was introduced.
