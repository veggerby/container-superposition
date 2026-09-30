---
spec: '062-github-copilot-code-review-instructions'
title: 'GitHub Copilot Repository-Wide Code Review Instructions'
status: 'Implemented'
phase: 'CLOSED'
execution_profile: 'Standard'
review_mode: 'INDEPENDENT'
review_status: 'PASS'
execution_status: 'ACTIVE'
risk_status: 'ACCEPTED'
completion: 'DONE'
owner: 'delivery-lead'
created: '2026-09-30'
updated: '2026-09-30'
related_adrs: []
related_foundation:
    - 'docs/foundation.md'
---

# GitHub Copilot Repository-Wide Code Review Instructions

## Problem

GitHub Copilot code review needs concise repository-wide guidance that directs reviews to this repository's existing authorities. Without it, reviews can miss repository-specific validation, generated-artifact, workflow, and documentation obligations or normalize conflicts between authorities.

## Why now

The repository already maintains authoritative contributor and review guidance in `AGENTS.md`, the foundation, Definition of Done, ADRs, specs, and path-specific Copilot instruction files. Publishing a supported repository-wide review entry point makes that guidance available to GitHub Copilot code review without duplicating or replacing those authorities.

## Acceptance Criteria

- [x] COPILOT-REVIEW-001: `.github/copilot-instructions.md` exists as concise repository-wide GitHub Copilot code-review guidance and directs reviews to apply `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, relevant ADRs/specs, and matching `.github/instructions/**/*.instructions.md` guidance.
- [x] COPILOT-REVIEW-002: The guidance preserves authority precedence by directing reviewers to flag conflicts rather than normalize or silently resolve them, and does not introduce a parallel `CLAUDE.md` or duplicate the existing authorities.
- [x] COPILOT-REVIEW-003: The guidance directs practical review attention to correctness/regressions, scope and ownership, required validation/tests/BDD where applicable, generated-artifact rules, documentation/changelog synchronization, and severity-based actionable feedback without approving unsupported changes.
- [x] COPILOT-REVIEW-004: This feature has a spec-first record, an in-folder plan, synchronized spec index and taxonomy records, and a compact implementation validation/review evidence record.
- [x] COPILOT-REVIEW-005: Documentation-change validation runs through `task validate`; the absence of targeted executable behavior tests is recorded with rationale.

## Non-goals

- Enabling or configuring GitHub Copilot, GitHub rulesets, workflows, MCP servers, or other platform settings.
- Changing `AGENTS.md`, production code, repository architecture, or path-specific instruction files.
- Adding `CLAUDE.md` or any other parallel agent-specific rule document.
- Broad documentation cleanup.

## Ambiguities / Open Questions

- None. GitHub's documented repository-wide location and existing repository authorities determine the instruction placement and precedence.

## Evidence / References

- GitHub Docs: <https://docs.github.com/en/copilot/how-tos/use-copilot-agents/request-a-code-review/use-code-review>
- `AGENTS.md` — authoritative contributor guidance and validation requirements
- `docs/foundation.md` — engineering ownership and generated-artifact boundaries
- `docs/definition-of-done.md` — review and validation expectations
- `.github/instructions/` — path-specific GitHub Copilot instruction files

## Risks / Constraints

- GitHub controls how Copilot discovers and applies this published configuration; this change must use the documented repository-wide location.
- The instruction file must remain a routing layer to current authorities, not a competing policy document.
- This is a repository-wide published review control and requires independent review before integration.

## Implementation Notes

- Added concise repository-wide `.github/copilot-instructions.md` guidance that routes Copilot reviews to current authorities and path-specific instructions without duplicating them.
- Added the required spec-first plan, compact validation evidence, and independent-review candidate; synchronized the spec index, taxonomy, and contributor-visible changelog.
- No production code, GitHub workflow/platform configuration, generated output, path-specific instruction, or `AGENTS.md` change was made. No `CLAUDE.md` was added.
- Validation: the recorded `task validate` passed for the unchanged implementation source tree; workflow-only lifecycle updates reuse that evidence. See `artifacts/validation.md` and `review-gate.md`; independent re-review passed and Lead integration closed the task without changing substantive implementation.
