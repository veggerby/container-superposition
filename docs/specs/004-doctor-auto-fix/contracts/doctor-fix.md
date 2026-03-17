# Contract: Doctor Fix Flow

## Scope

This contract defines the user-visible and machine-readable behavior of `doctor --fix`. It extends the existing `doctor` command without changing the baseline diagnostic contract for users who do not request automatic repair.

## Command Surface

### Existing Option

- `--fix`: run supported automatic remediations for findings that are explicitly classified as safe and supported.

### Existing Output Modes

- `doctor` without `--fix` keeps the current diagnostics-only behavior.
- `doctor --fix` performs diagnosis, remediation, targeted re-checks, and final summary output.
- `doctor --json --fix` performs the same remediation flow and returns structured result data for scripting.

## Supported Remediation Classes

The initial release must document and implement support for these issue classes:

1. stale or legacy `superposition.json` metadata
2. derived `.devcontainer/` drift or missing generated artifacts that can be regenerated from a valid manifest
3. unsupported Node runtime when a supported Node version manager is already available
4. supported Docker or Compose drift when a known safe repair command is available on the host

Automation is conditional. If the host does not meet the action’s preconditions, the final outcome is `requires manual action`, not a silent skip.

## Outcome Vocabulary

Every remediated or evaluated finding must resolve to exactly one of:

- `fixed`
- `already compliant`
- `skipped`
- `requires manual action`

### Meaning

- `fixed`: the tool changed the environment or project state and the targeted re-check now passes
- `already compliant`: the requested fix path found no change was needed
- `skipped`: the tool intentionally did not attempt this action because an earlier failure or prerequisite blocked it
- `requires manual action`: the issue remains unresolved because automation is unsafe, unsupported, or unavailable in the current environment

## Text Output Contract

When `doctor --fix` completes in text mode:

1. The command still shows the diagnostic findings.
2. Before each attempted repair, the command explains the planned action in understandable user-facing language.
3. The command prints an ordered remediation summary after execution.
4. The summary must include:
    - finding name
    - final outcome vocabulary value
    - concise reason
    - any changed files or executed command family when relevant
5. If nothing is fixable, the command explicitly says no remediation was needed and leaves the environment unchanged.

## JSON Output Contract

When `doctor --json --fix` is used, the output must remain valid JSON and include:

- the standard diagnostic sections or their equivalent structured findings
- a remediation execution list with one record per attempted or evaluated fixable finding
- a summary block with counts for `fixed`, `already compliant`, `skipped`, and `requires manual action`
- a final disposition that distinguishes fully repaired runs from unresolved runs

### Minimum JSON Questions Answerable Without Text Parsing

- Which findings were eligible for automation?
- Which remediation actions were attempted?
- What changed?
- Which findings still require manual intervention?
- Did the command finish in a resolved or unresolved state?

## Ordering Contract

Fixes must execute in a stable order:

1. host prerequisites
2. manifest metadata repair
3. regeneration of derived devcontainer artifacts
4. targeted re-checks and final summary

The command must not reorder findings unpredictably between runs over the same starting state.

## Safety Contract

- `doctor --fix` must only execute actions classified as safe and supported.
- Unsupported or unsafe issues must remain unchanged and receive manual guidance.
- Metadata repair must avoid partial writes by using backup or atomic replacement patterns.
- `doctor` without `--fix` must not mutate the environment.

## Exit Behavior Contract

- Fully resolved or already-compliant runs exit successfully.
- Runs with unresolved failures after the fix flow must exit non-zero.
- Warnings alone must not be promoted to failures unless a documented unresolved remediation remains.

## Documentation Contract

The command reference and examples must document:

- when to use `doctor --fix`
- what kinds of changes it may make
- which fix classes are conditional on host capabilities
- how JSON output can be used in CI or scripted workflows
- what limitations still require manual intervention
