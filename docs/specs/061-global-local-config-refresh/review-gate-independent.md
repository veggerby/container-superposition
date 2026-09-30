# Independent Review Gate — Global Local Config Refresh

- Review mode: `INDEPENDENT`
- Reviewed candidate: `f64a9fbecd0a708f7d99346390b8f725b1f9df29`
- Candidate tree: `f0484825c4b15ea3167f583c2fbdce846feb363c`
- Base revision: `cdaf936fb6f83e076e33f6fa4f6c2a68f952b760`
- Base tree: `07a7672de6f601a0de407b7858b4e8fbd17b7483`
- Branch: `feat/refresh-local-config-from-global-defaults`
- Working tree at review start: clean; `HEAD` exactly matched the candidate
- Review timestamp: `2026-09-30T10:15:30+00:00`
- Verdict: `CHANGES_REQUESTED`
- Execution status: `BLOCKED`
- Risk decision: `PENDING_ACCEPTANCE`
- Follow-up route: `implement`, then rerun focused safety/CLI checks and repeat independent review

## Evidence provenance and context manifest

Authority consulted:

- `AGENTS.md`
- `docs/foundation.md`
- `docs/definition-of-done.md`
- `docs/adr/adr001-project-file-first-replay-and-regeneration.md`
- `docs/specs/042-global-default-configuration/spec.md`
- `docs/specs/061-global-local-config-refresh/spec.md`
- `docs/specs/061-global-local-config-refresh/plan.md`
- `docs/specs/061-global-local-config-refresh/review-gate.md` (implementer `SELF_CHECK`; retained unchanged)
- CLI boundary guidance and specs 033, 034, 037, and 038
- Candidate diff and all changed implementation/test/documentation surfaces

Owning boundaries are aligned in principle: Commander wiring remains in `tool/cli/args.ts`, command-specific refresh orchestration is in `tool/commands/defaults.ts`, and template/config semantics are exported from `tool/schema/project-config.ts`. No dependency, overlay, generated-output, generated-doc, or schema-shape change was found.

The implementer self-check reports targeted Vitest, focused BDD, `task validate`, build/compiled help, regen, and doctor passes. Its recorded source identity is the base revision plus an unspecified working tree, not the final candidate commit/tree. It is useful historical evidence but is not treated as source-revision-matched proof for a `PASS` verdict.

## Findings

### High

#### GLC-R001 — Valid direct templates are incorrectly validated as plain-stack templates

**Acceptance criteria:** GLC-REFRESH-003, GLC-REFRESH-010

`tool/commands/defaults.ts:104-105` supplies `stack ?? 'plain'` for every template. Direct templates deliberately do not load or infer a repository stack, so a structurally valid direct template containing a compose-only local field (for example `target: composeVolume`) is rejected as though the selected stack were plain. The approved plan explicitly says a direct template must not require or infer a project stack and the spec says it is refreshed as authored.

Independent reproduction against the candidate used only `~/.superposition.yml` with a direct `localConfigTemplate.mounts[].target: composeVolume` and no existing local file. Result: exit 1 with `Project mount target "composeVolume" requires stack: compose`; no local file was created.

**Required action:** preserve direct-template semantics without inventing a plain stack. Apply stack-dependent compatibility checks only where a canonical selected stack exists, or re-plan if direct-template compatibility needs a different authority contract. Add a regression test.

**Disposition suggestion:** `AUTOMATE`.

#### GLC-R002 — Destructive-adjacent safety coverage does not meet the explicit automated-coverage criterion

**Acceptance criteria:** GLC-REFRESH-006, GLC-REFRESH-008, GLC-REFRESH-010, GLC-REFRESH-013

The candidate adds four refresh-focused test cases, but does not automate the interactive approve/cancel branches, backup creation failure, atomic replacement/final-install failure and staged-file cleanup, invalid selected-template compatibility no-write behavior, or broad home-file immutability. The existing collision test proves exclusive backup naming, but not failure containment. The only BDD scenario covers creation into an absent target.

This is not only a generic coverage preference: GLC-REFRESH-013 explicitly requires confirmation/refusal, backup failure, and no-write failure-path proof, and the approved plan called for controlled failure injection and TTY-capable coverage. The self-check's grouped claim that GLC-REFRESH-006–010 are covered is not supported by the committed test inventory.

**Required action:** add focused automated tests/seams for both interactive outcomes and backup/replacement failure containment, including unchanged original bytes, no unintended target creation, no stale staged file, no backup on cancellation/refusal, and unchanged home defaults. Keep collision and successful forced replacement assertions.

**Disposition suggestion:** `AUTOMATE`.

### Medium

#### GLC-R003 — `refresh-local --help` omits required precedence and authority guidance

**Acceptance criterion:** GLC-REFRESH-012

The subcommand help at `tool/cli/args.ts:243-249` describes confirmation/`--force` and sibling backups, but does not identify `~/.container-superposition.yml` over `~/.superposition.yml` precedence and does not say refresh is explicit bootstrap/synchronization input rather than replay/remediation authority. Those facts exist in surrounding docs and partly in parent `defaults --help`, but are absent from the directly invoked public command's help.

**Required action:** make `cs defaults refresh-local --help` itself describe selected-file precedence, backup behavior, and the sync-only/non-replay boundary; add a help assertion.

**Disposition suggestion:** `AUTOMATE`.

### Low

#### GLC-R004 — The old materialization implementation remains duplicated and dead in `run.ts`

**Acceptance criteria:** GLC-REFRESH-004, GLC-REFRESH-011 (maintainability/architecture support)

Although init now invokes the schema-owned exports, `tool/cli/run.ts:72-196` still retains its prior private discriminator, compaction, merge, materialization, and validation implementation plus imports used only by that dead path. This contradicts the plan's single shared implementation intent and leaves two semantic models available to drift.

**Required action:** remove the superseded private implementation/imports after confirming the shared helper remains the sole init/refresh path.

**Disposition suggestion:** `REJECT_AS_NOISE` only if the Lead explicitly declines cleanup; otherwise `DOCUMENT` or remove in the correction.

## Acceptance-criteria classification

| Criterion       | Status  | Evidence / gap                                                                                                                                                                                                                                                             |
| --------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GLC-REFRESH-001 | MET     | Shared selected-file loader preserves precedence; existing loader tests cover both-file and fallback cases; refresh calls that loader.                                                                                                                                     |
| GLC-REFRESH-002 | MET     | Source/template validation precedes target-path writes; selected-path loader errors are preserved. Focused failure coverage remains incomplete under GLC-REFRESH-013.                                                                                                      |
| GLC-REFRESH-003 | NOT_MET | GLC-R001: a valid direct compose-oriented template is rejected through the invented plain-stack fallback.                                                                                                                                                                  |
| GLC-REFRESH-004 | MET     | Shared materializer implements common plus selected canonical branch; compose refresh test and existing plain/compose materialization tests support the behavior.                                                                                                          |
| GLC-REFRESH-005 | MET     | Stack-aware flow loads canonical project config before target/backup writes and does not consult local config or `initDefaults`; absent-authority command case passes.                                                                                                     |
| GLC-REFRESH-006 | MET     | Code uses stdin+stdout TTY classification, an explicit safe-default confirmation, and returns before backup on decline. Independent pseudo-TTY cancellation check preserved original bytes and created zero backups. Automated proof is still required by GLC-REFRESH-013. |
| GLC-REFRESH-007 | MET     | Non-TTY command test proves refusal; forced path validates/materializes before backup.                                                                                                                                                                                     |
| GLC-REFRESH-008 | MET     | `COPYFILE_EXCL` plus suffix retry prevents backup overwrite; backup occurs before atomic target rename and non-collision errors abort. Failure injection is missing under GLC-REFRESH-013.                                                                                 |
| GLC-REFRESH-009 | MET     | Forced replacement test proves refreshed output and byte-for-byte original sibling backup.                                                                                                                                                                                 |
| GLC-REFRESH-010 | MET     | Write ordering protects invalid/refused paths and no code writes home defaults; required automated failure matrix is incomplete under GLC-REFRESH-013.                                                                                                                     |
| GLC-REFRESH-011 | MET     | Refresh is explicitly wired; retained invalid-home tests cover replay-style init, regen, plan, and doctor isolation.                                                                                                                                                       |
| GLC-REFRESH-012 | NOT_MET | GLC-R003: direct subcommand help omits precedence and sync-only/non-replay authority. Docs/changelog are otherwise aligned.                                                                                                                                                |
| GLC-REFRESH-013 | NOT_MET | GLC-R002: required confirmation, backup-failure, atomic-failure, and no-write automation is absent.                                                                                                                                                                        |

## Validation-surface gap analysis

Relevant surface:

- Type/static/format: `npm run lint`; mandatory final aggregate is `task validate`.
- Targeted unit/command: `tool/__tests__/global-defaults.test.ts`.
- Public workflow BDD: `tests/behave/features/core-tooling.feature`.
- Source and compiled command grammar/help: source CLI plus `npm run build`/`dist` smoke.
- Replay isolation and repository health: regen/doctor.
- Safety-specific exploratory checks: direct-template compatibility, TTY cancellation, backup/final-install failures.
- Schema/generated checks: not triggered; no config shape, overlay, generated docs, or generated schema source changed.

### Checks executed independently on the candidate

| Check                                                     | Result                                      | Provenance                                                       |
| --------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------- |
| Git source/tree/status inspection                         | PASS                                        | `HEAD=f64a9fb...`, tree `f048482...`, clean tree at review start |
| Candidate diff and `git diff --check`                     | PASS                                        | Base `cdaf936...` to candidate                                   |
| `npx vitest run tool/__tests__/global-defaults.test.ts`   | PASS                                        | Candidate source; 36/36 tests                                    |
| Source `npm run init -- defaults refresh-local --help`    | PASS as execution; content finding GLC-R003 | Candidate source                                                 |
| Direct compose-oriented template exploratory reproduction | FAILED expected contract                    | Candidate source; finding GLC-R001                               |
| Pseudo-TTY safe-default cancellation                      | PASS                                        | Candidate source; original unchanged, zero backups               |

### Reused or skipped checks

| Check                       | Status                    | Reason / residual impact                                                                                                                                                           |
| --------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Implementer `task validate` | Reused as historical only | Recorded against base plus unspecified working tree, not candidate tree; cannot support final PASS provenance.                                                                     |
| Implementer focused BDD     | Reused as historical only | Same provenance limitation; committed BDD scenario was inspected and covers only absent-target creation.                                                                           |
| Full `task validate` rerun  | Intentionally skipped     | Targeted suite passed and material acceptance/test gaps already require changes; repeating the broad suite would not resolve them. Must be rerun on the corrected source revision. |
| Focused BDD rerun           | Intentionally skipped     | No independent gap required for the single committed happy-path scenario; missing safety scenarios need implementation first.                                                      |
| Build/compiled smoke rerun  | Intentionally skipped     | Implementer reported a pass, source help was independently checked, and no source-vs-compiled path logic changed. Must be source-revision-matched before a future PASS.            |
| Regen/doctor rerun          | Intentionally skipped     | Retained isolation tests passed in the targeted suite; implementer evidence is historical and should be refreshed after correction if source changes affect shared helpers.        |
| Schema/docs generation      | Not applicable            | No schema shape, overlays, or generated reference source changed.                                                                                                                  |
| Browser/E2E/migration       | Not applicable            | Terminal-local CLI; no browser or migration surface.                                                                                                                               |

## Architecture, design, and implementation-ladder assessment

- Correctness/task fit: `CONCERN` — direct-template fallback violates the approved contract.
- Architectural fit: `ALIGNED` — ownership is generally in the correct CLI/command/config layers and ADR 001 authority remains intact.
- Simplicity/proportionality: `ALIGNED` — Node filesystem primitives and existing config semantics are the appropriate implementation-ladder rung; no new dependency is justified.
- Maintainability: `CONCERN` — dead duplicate semantics remain in `run.ts`.
- Testability/evidence: `CONFLICT` — explicit safety branches lack committed automation despite a clear injectable-test plan.
- Security/privacy/data safety: `CONCERN` — no observed home mutation or literal expansion, but destructive failure containment lacks automated evidence.
- Reliability/operability: `CONCERN` — ordering is sensible, collision handling is exclusive, and replacement is staged; backup/final-install failures remain unproved.
- Performance/scalability: `NOT_APPLICABLE`.
- Compatibility/user impact: `CONCERN` — valid direct compose-oriented templates are rejected and command help is incomplete.
- Documentation/traceability: `CONCERN` — docs/changelog are aligned, but self-check overstates coverage and does not identify the final candidate tree.

Fit verdict: `CONCERNS`; no ADR amendment is required. Chosen implementation-ladder rung is existing repository capability plus small command-local Node filesystem code. Lower rungs were checked: the shared project-config loader/materializer/serializer is reused; no dependency or broader subsystem is needed.

## Residual risk and authority

Residual risk is **not accepted** by this reviewer. The unresolved risks are rejection of valid direct templates and unproved recovery/no-write behavior around interactive approval, backup failure, and atomic final-install failure.

If the Lead proposes accepting any safety-coverage gap rather than implementing it, explicit acceptance is required from the repository maintainer/product owner responsible for destructive local-file behavior; the independent reviewer is not acceptance authority. Acceptance is not recommended for GLC-R001 or GLC-R002 because both map directly to approved acceptance criteria.

## Review decision

`CHANGES_REQUESTED`, execution `BLOCKED`. Implement GLC-R001 through GLC-R003, address or explicitly disposition GLC-R004, run source-revision-matched targeted safety tests plus mandatory validation/build evidence, and return the corrected commit/tree for another independent review.
