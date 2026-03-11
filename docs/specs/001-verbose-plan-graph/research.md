# Research: Verbose Plan Graph

## Decision 1: Attach explanation data to the existing dependency resolver

**Decision**: Extend the current `plan` dependency-resolution flow so it records inclusion reasons while producing the same resolved overlay set used by normal text and JSON output.

**Rationale**: `tool/commands/plan.ts` already resolves dependencies and feeds both text and JSON views. Reusing that path avoids divergence where verbose mode could explain a different result than the standard plan.

**Alternatives considered**:

- Build a separate explanation pass after resolution: rejected because it duplicates traversal logic and risks drifting from the actual resolver.
- Infer reasons only from `autoAddedOverlays`: rejected because it cannot represent transitive chains or multi-parent dependencies clearly enough.

## Decision 2: Model overlay inclusion as one final entry with one or more reasons

**Decision**: Represent each included overlay once, with attached reason records that indicate whether it was directly selected, required by another overlay, or reached through a transitive chain.

**Rationale**: The spec requires no duplicate final inclusion entries, even when a dependency is reached by multiple parents. A single overlay record with multiple reasons meets that requirement and keeps both text and JSON outputs easy to consume.

**Alternatives considered**:

- Emit one explanation row per path: rejected because the same overlay would appear multiple times and make the final resolved set harder to read.
- Keep only the first discovered reason: rejected because it hides valid parent relationships when multiple overlays require the same dependency.

## Decision 3: Keep verbose output opt-in and additive

**Decision**: Show the new explanation section only when `--verbose` is present, while leaving default text output unchanged.

**Rationale**: The existing `plan` command is a concise preview tool, and the spec explicitly requires backward-compatible default behavior. Opt-in narration preserves scanability for current users.

**Alternatives considered**:

- Always show inclusion reasons: rejected because it would alter the established command output and add noise to the common case.
- Replace the existing auto-added summary with verbose narration: rejected because it would collapse the quick summary and the detailed explanation into one harder-to-scan format.

## Decision 4: Expose explanation data in JSON only when verbose mode is requested

**Decision**: Add structured inclusion-reason data to the JSON plan payload when `--json` and `--verbose` are both present; preserve the existing JSON shape otherwise.

**Rationale**: Scripted consumers need access to the same reasoning as human readers, but existing JSON users should not be forced to adapt to new fields unless they explicitly request verbose mode.

**Alternatives considered**:

- Always add explanation fields to JSON: rejected because it changes the default contract for existing automation.
- Omit explanation data from JSON entirely: rejected because the spec requires structured verbose output for scripted consumers.

## Decision 5: Treat conflicts and invalid input as explanation boundaries, not silent failures

**Decision**: When resolution fails due to conflicts, unsupported overlays, or invalid overlay IDs, verbose mode should explain the last valid inclusion context and then identify the reason the plan cannot proceed.

**Rationale**: The feature principle is that nothing should feel magical. Users need to know where resolution stopped and why, especially when the command refuses to proceed.

**Alternatives considered**:

- Fall back to the existing failure messages without verbose context: rejected because it leaves the explanation incomplete in the scenarios where users most need it.
- Produce partial verbose output without marking the failure boundary: rejected because it could imply that the plan completed successfully.

## Decision 6: Verification should focus on command behavior, not only the helper function

**Decision**: Cover the new mode primarily with `planCommand` tests in `tool/__tests__/commands.test.ts`, supported by existing unit-level confidence around the command module.

**Rationale**: The user-visible risk is in the final text/JSON behavior and backward compatibility of the command surface. Command-level tests exercise option handling, output shaping, and failure behavior together.

**Alternatives considered**:

- Test only low-level resolver helpers: rejected because it would miss regressions in the rendered CLI and JSON contracts.
- Rely on manual validation alone: rejected because the change is user-visible and should be guarded by repeatable regression tests.

## Decision 7: Manifest-driven planning should reuse the same explanation model

**Decision**: When `plan` is run from an existing `superposition.json` manifest, verbose output should use the same inclusion-reason model and rendering rules as overlay-list-driven planning.

**Rationale**: Users should not receive different explanations depending on whether overlays were provided as flags or loaded from a manifest. One model keeps the output easier to reason about and reduces the risk of semantic drift.

**Alternatives considered**:

- Create a manifest-specific explanation mode: rejected because it would duplicate logic and force users to learn two explanation formats.
- Treat manifest-defined overlays as opaque input with no per-overlay reasoning: rejected because it violates the “nothing here is magic” principle.

## Decision 8: Manifest-defined overlays should be explained as the explicit starting set

**Decision**: In manifest-driven verbose planning, overlays loaded from the manifest should be treated as the explicit root selection set for explanation purposes, while still distinguishing auto-added dependencies from those roots.

**Rationale**: The user did not type the overlays on the current command line, but they are still part of an explicit saved configuration. Treating them as the root set preserves explainability without forcing users to re-enter them.

**Alternatives considered**:

- Label manifest overlays as dependencies: rejected because it misstates user intent and blurs the line between saved configuration and auto-resolved requirements.
- Add a third top-level selection mode with separate rendering rules: rejected because it adds conceptual weight without improving user value.

## Decision 9: Manifest failure should stop explanation before partial output is emitted

**Decision**: Missing, invalid, or semantically broken manifests should fail before verbose explanation output is produced, with a clear message explaining why planning cannot continue.

**Rationale**: A broken manifest means the plan has no trustworthy starting configuration. Producing partial verbose output in that state would make the command feel unreliable.

**Alternatives considered**:

- Emit partial verbose output for valid fragments of the manifest: rejected because partial planning from invalid input is misleading.
- Reconstruct overlays heuristically when the manifest is malformed: rejected because it adds hidden behavior and weakens trust.
