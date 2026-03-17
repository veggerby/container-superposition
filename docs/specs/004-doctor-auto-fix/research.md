# Research: Doctor Auto-Fix

## Decision 1: Use a remediation registry instead of ad hoc `if (--fix)` logic

**Decision**: Model each doctor finding with a remediation definition that declares fix eligibility, safety classification, execution preconditions, and a handler that can produce a structured outcome.

**Rationale**: The current `doctor` command already separates environment, overlay, manifest, merge, and port checks. A remediation registry keeps the diagnostic surface intact while making `--fix` deterministic, testable, and extensible. It also supports CI by letting JSON consumers receive explicit fix outcomes instead of parsing terminal narration.

**Alternatives considered**:

- Hardcode repairs inline in `applyFixes()`
  - Rejected because it would entangle presentation, detection, and repair flow and would make mixed-result summaries brittle.
- Create a separate `doctor-fix` command
  - Rejected because the spec explicitly calls for `doctor --fix`, and a separate command would duplicate the diagnostic pipeline.

## Decision 2: Initial auto-fix scope is conditional by issue class, not universal across all hosts

**Decision**: Support four initial remediation classes, with automation gated by explicit preconditions:

- stale or legacy `superposition.json` metadata: always auto-fixable when the manifest parses well enough to migrate
- derived `.devcontainer/` drift caused by stale manifest metadata or missing generated files: auto-fixable by regeneration from a valid manifest
- unsupported Node runtime: auto-fixable only when a supported version manager such as `nvm`, `fnm`, or `volta` is already installed and usable in the current shell
- container-tooling drift such as missing Compose v2 support or a stopped Docker environment: auto-fixable only when a known safe host command is available; otherwise the finding remains manual-only with explicit guidance

**Rationale**: The spec requires auto-fix coverage for common issues including container tooling, runtime compatibility, and metadata drift. The project must also obey the safety boundary that unattended repair only applies to supported and low-surprise operations. A precondition-gated model satisfies both: the issue class is in scope, but automation only runs when the host exposes a well-defined repair path.

**Alternatives considered**:

- Restrict auto-fix to project-local files only
  - Rejected because it would miss the runtime and container-tooling categories named in the approved spec.
- Attempt Docker or Node installation unconditionally on every host
  - Rejected because package-manager- and OS-specific installation behavior is too risky for unattended repair in a cross-platform CLI.

## Decision 3: Execute fixes in prerequisite-first order and re-run targeted diagnostics

**Decision**: Run fix actions in this order:

1. Host runtime and tooling prerequisites
2. Manifest migration
3. Regeneration of derived devcontainer artifacts from the repaired manifest
4. Targeted re-checks and final summary assembly

**Rationale**: Project-local regeneration depends on a usable runtime and valid manifest state. Stable ordering reduces partial repairs and makes outcome reporting predictable when multiple issues are present. Targeted re-checks are sufficient to confirm final state without rerunning unrelated validations.

**Alternatives considered**:

- Fix findings in the order they were detected
  - Rejected because the current report order mixes host checks and project checks, which could trigger regeneration before prerequisites are restored.
- Re-run the entire doctor suite after every fix
  - Rejected because it adds unnecessary latency and creates noisy intermediate states.

## Decision 4: Treat metadata repair as a transactional workflow with backup plus atomic replacement

**Decision**: Before rewriting `superposition.json` or regenerating derived artifacts, create a timestamped backup using the existing backup utility, write file updates to temporary paths where practical, and replace the target only after the updated artifact is valid.

**Rationale**: FR-008 requires the tool to avoid leaving project metadata partially repaired. The repository already has backup utilities used by generation flows. Reusing that capability is simpler and more compatible than inventing a new rollback mechanism. Atomic replacement is practical for single files such as `superposition.json`; directory-level regeneration can rely on backup plus validated rewrite.

**Alternatives considered**:

- Overwrite files in place without backup
  - Rejected because a failed regeneration would violate the spec’s partial-state requirement.
- Build a full transaction journal for every generated file
  - Rejected as unnecessary complexity for the current filesystem-based workflow.

## Decision 5: `doctor --fix --json` must execute fixes, not just serialize diagnostics

**Decision**: When `--fix --json` is present, the command performs the same remediation flow as text mode and returns machine-readable final outcomes, including per-finding actions, skipped reasons, and whether unresolved failures remain.

**Rationale**: The spec explicitly includes automated workflows and CI-oriented usage. The current behavior skips fixes when `--json` is set, which would leave the automation story incomplete. JSON consumers need structured result data, not a text-only fix path.

**Alternatives considered**:

- Keep JSON mode diagnostic-only
  - Rejected because it conflicts with the requirement to support automation.
- Emit text narration inside a JSON field
  - Rejected because it would force consumers to parse prose instead of stable machine fields.

## Decision 6: Unsupported automation paths resolve to `requires manual action`, not silent failure

**Decision**: If a finding belongs to an in-scope repair class but the host lacks the required execution preconditions, the final outcome is `requires manual action` with provider-specific next steps.

**Rationale**: Users need clear boundaries for trust, and CI needs a deterministic unresolved state. This also avoids over-claiming automation support while keeping the issue class visible in the supported repair matrix.

**Alternatives considered**:

- Mark such findings as `skipped`
  - Rejected because `skipped` is better reserved for intentionally not-run actions such as downstream repairs blocked by an earlier failure.
- Downgrade them to generic warnings
  - Rejected because that would hide unresolved blockers from automation and from the final summary.
