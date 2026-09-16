---
spec: '059-cli-silent-mode'
title: 'CLI Silent Mode Across Commands'
status: 'Ready for integration'
phase: 'INTEGRATION'
execution_profile: 'Standard'
review_mode: 'INDEPENDENT'
review_gate: 'PASS'
owner: 'delivery-lead'
created: '2026-09-14'
updated: '2026-09-16'
related_adrs: []
related_foundation:
    - 'docs/foundation.md'
related_specs:
    - 'docs/specs/047-cli-output-relevance-and-noise-reduction/spec.md'
    - 'docs/specs/048-cross-command-cli-guidance-relevance/spec.md'
taxonomy:
    - 'CLI-FLAG'
    - 'CLI-UX'
normative_references:
    - 'AGENTS.md'
    - 'docs/definition-of-done.md'
---

# CLI Silent Mode Across Commands

## Problem

Users automating Container Superposition commands sometimes need the command's effects without human-readable status, guidance, progress, warning, or summary output. The CLI has no consistent opt-in quiet mode across its command surface. Current JSON-capable commands instead use `--json` as their machine-output contract, while write and diagnostic paths can emit human-readable tool output during normal operation.

Without a cross-command silent contract, callers must filter output inconsistently and cannot rely on a uniform way to run commands quietly while retaining their existing behavior and exit status.

## Why now

This is a public CLI contract that spans every command, so it must be specified before implementation rather than introduced piecemeal. Existing specs 047 and 048 establish that human-readable output should be relevant and non-redundant; this work adds an explicit user-controlled suppression mode without changing those commands' normal presentation contracts. The task is escalated from Fast to the Standard delivery profile because the option applies across the CLI and interacts with its machine-output contract.

## Scope

Add the public `--silent` option to every supported executable command: `init`, `regen`, `list`, `defaults`, `explain`, `plan`, `doctor`, `adopt`, `hash`, and `migrate`.

The option suppresses routine human-readable CLI and tool output for the invocation while preserving the command's existing operational behavior. `--json` remains the separate machine-output mode and cannot be combined with `--silent`.

## Resolved Decisions

- `--silent` combined with `--json` is invalid for every command that accepts both options. The CLI MUST fail clearly with a nonzero exit status.
- Conflict validation occurs before the command's normal work begins; a rejected invocation MUST NOT perform command work or write command-owned artifacts.
- Silent mode suppresses routine informational human-readable output, including presentation, progress, summaries, guidance, and non-fatal warnings that would otherwise be emitted as normal command output.
- Silent mode does not hide failure diagnostics needed to explain a nonzero result. Errors and the explicit `--silent`/`--json` conflict diagnostic remain observable.
- `--silent` alone does not change input selection, prompting/interaction policy, write behavior, produced artifacts, result semantics, or success/failure exit status.
- `--json` remains unchanged: valid JSON invocations continue to produce their established machine-readable stdout contract without human-readable contamination.

## Acceptance Criteria

- [x] AC-059-01: Every supported executable command (`init`, `regen`, `list`, `defaults`, `explain`, `plan`, `doctor`, `adopt`, `hash`, and `migrate`) advertises and accepts `--silent` as a public CLI option.
- [x] AC-059-02: For each command, a successful `--silent` invocation suppresses routine human-readable CLI/tool output, including command framing, progress/status output, summaries, next-step guidance, and ordinary non-fatal warnings.
- [x] AC-059-03: `--silent` preserves the invoked command's operational behavior and result: its normal inputs, prompt/interaction policy, writes or read-only behavior, generated artifacts, success/failure semantics, and exit status are unchanged except for suppression of routine human-readable output.
- [x] AC-059-04: Every command that accepts both `--silent` and `--json` rejects their combination with a clear human-readable diagnostic and nonzero exit status before command work or command-owned artifact writes occur.
- [x] AC-059-05: Silent mode does not suppress failure diagnostics required to understand a nonzero exit status; in particular, the `--silent`/`--json` conflict diagnostic remains observable.
- [x] AC-059-06: Valid `--json` invocations retain their existing parseable machine-output contract and are not changed into silent mode. JSON output remains free of human-readable routine output.
- [x] AC-059-07: Automated regression coverage proves the option's availability and behavior across the command surface, including representative read-only, write, diagnostic, and conversion commands; it also proves `--silent`/`--json` conflict failure and a no-work/no-write result for a rejected write-capable invocation.
- [x] AC-059-08: Behave coverage is added or updated for this user-visible command/workflow contract and run during delivery. BDD coverage is required rather than waived because this option changes observable behavior for command families explicitly named in the repository Definition of Done.
- [x] AC-059-09: Public CLI help and directly affected user-facing documentation accurately describe silent-mode behavior and the incompatibility with `--json`.
- [x] AC-059-10: `CHANGELOG.md` records this new user-visible CLI option under `[Unreleased]`, consolidated under `Added` according to repository changelog rules.
- [x] AC-059-11: Delivery records targeted test results, `task test:bdd`, `task validate`, and the required pre-merge doctor check (`npm run init -- doctor` at minimum, with no Reproducibility errors) against the implementation handoff.

## Non-goals

- Changing the normal, non-silent human-readable content, layout, relevance policy, or JSON schemas of commands.
- Defining a general logging framework, verbosity levels, configurable output destinations, or an environment-variable equivalent to `--silent`.
- Suppressing error diagnostics, changing error exit codes, or treating `--silent` as a success override.
- Making `--silent --json` select JSON-only output; that combination is explicitly invalid.
- Changing generation, project-file authority, overlay behavior, catalog resolution, or generated-output contents.
- Prescribing option-registration, output-capture, command-wiring, or test-helper implementation design.

## Ambiguities / Open Questions

- None material to implementation. The output boundary is resolved as routine human-readable output being suppressed while failure diagnostics remain observable.

## Evidence / References

- Source revision `6fc3cb938a0a1b70aee0da4ecc8b43427885cf7b`; follow-up warning-suppression evidence is recorded in `docs/specs/059-cli-silent-mode/evidence.md`.
- `tool/cli/args.ts` and `tool/cli/output.ts` — Commander registers `--silent` across the command surface and the CLI boundary suppresses routine `console.log` and `console.warn` output while preserving `console.error` diagnostics.
- `tool/cli/run.ts` and `tool/commands/*.ts` — write and command workflows emit human-readable output directly, while several commands branch to JSON output.
- `tool/__tests__/cli-write-output.test.ts` and `behave/features/core-tooling.feature` — existing command-level and Behave coverage already exercise JSON parseability and representative public workflows.
- `docs/specs/047-cli-output-relevance-and-noise-reduction/spec.md` and `docs/specs/048-cross-command-cli-guidance-relevance/spec.md` — existing authority for relevance-gated human-readable output and JSON/text semantic alignment.
- `AGENTS.md`, `docs/foundation.md`, and `docs/definition-of-done.md` — public CLI, validation, BDD, changelog, and review authority.

## Risks / Constraints

- This is a cross-command public contract. Inconsistent option availability or a single output path that bypasses suppression would make automation unreliable.
- JSON is an established scripting contract; allowing mixed JSON and silent semantics would be ambiguous and risks broken consumers. The explicit conflict must remain stable and be validated before side effects.
- Normal command behavior must remain unchanged when `--silent` is absent, preserving the presentation contracts defined by specs 047 and 048.
- The work does not itself change generated output; generated-artifact validation is not triggered solely by this spec unless implementation expands scope.

## Implementation-Ready Handoff

The product contract is ready for planning. Planning should identify the complete command/output surface, define evidence for each AC without changing the locked behavior above, and keep implementation choices out of this spec. It must include test and documentation/changelog work, with focused regression coverage plus the required BDD and validation gates.

## Routing Decision

**Shaping → Planning**

A delivery plan is recommended next at `docs/specs/059-cli-silent-mode/plan.md`. Independent review is recommended before merge because this changes a public, cross-command CLI contract and its scripting compatibility boundary. No ADR is currently indicated: the task changes a command option contract, not a standing architectural boundary.
