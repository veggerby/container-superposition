---
spec: 'NNN-slug'
title: '[Short descriptive title]'
status: 'Draft'
qa_status: ''
priority: 'P0'
owner: 'pm'
product_approval: ''
architecture_review: ''
ux_review: ''
created: 'YYYY-MM-DD'
updated: 'YYYY-MM-DD'
related_adrs: []
related_foundation:
    - 'docs/foundation.md'
related_specs: []
normative_references: []
---

# [Title]

**Spec**: `NNN-slug`
**Status**: Draft
**Created**: YYYY-MM-DD
**Priority**: P0 | P1 | P2 | P3
**Product Approval**: pending | approved | not-needed
**Architecture Review**: pending | approved | not-needed
**UX Review**: pending | approved | not-needed

> P0 = unusable without; P1 = core value, ship v1; P2 = post-launch; P3 = backlog

## Description

[Describe the problem, user need, and intended outcome.]

## Evidence <!-- especially important for reverse-spec work -->

- [path or source 1] — [why it matters]
- [path or source 2] — [why it matters]

## Problem Statement

[What problem exists today, for whom, and why it matters.]

## User Goals / Jobs To Be Done

- [job or goal 1]
- [job or goal 2]

## Success Signals

- [signal 1]
- [signal 2]

## Confidence <!-- optional, especially for reverse-spec work -->

- Overall confidence: high | medium | low
- Confidence notes: [what is directly evidenced vs inferred]

## User Stories

**US-1** As a user, I want ...

## Goals

- [goal 1]
- [goal 2]

## Non-Goals

- [non-goal 1]
- [non-goal 2]

## Authority and References

This spec must align with:

- `docs/foundation.md`
- relevant ADRs in `docs/adr/`
- relevant project-context and normative-reference documents

List the specific references for this spec:

- [reference 1]
- [reference 2]

## Design

### Observed Behavior <!-- optional for reverse-spec work -->

[Describe observed current behavior from evidence.]

### Likely Intent <!-- optional for reverse-spec work -->

[Describe what the feature appears intended to accomplish.]

### Product / Behavior

[Describe the user-visible or system-visible behavior.]

### Technical Notes

[Describe technical expectations only when PM should make them explicit before architect handoff.]

### UX Notes <!-- optional -->

[Describe layout, interaction, wording, state, or navigation expectations when relevant.]

## Constraints

- [constraint 1]
- [constraint 2]

## Preferences / Tradeoffs <!-- optional -->

- [preferred approach or tradeoff 1]
- [preferred approach or tradeoff 2]

## Risks <!-- optional -->

- [risk 1]
- [risk 2]

## Implementation / Intent Mismatches <!-- optional, especially for reverse-spec work -->

- [mismatch 1]
- [mismatch 2]

## Acceptance Criteria

- [ ] [specific, testable criterion]
- [ ] [specific, testable criterion]
- [ ] All new or changed behavior is covered by automated tests at the appropriate level
- [ ] Documentation and workflow artifacts are updated to match the implemented or reviewed state

## Out of Scope

- [out of scope 1]
- [out of scope 2]

## Assumptions <!-- optional -->

- [assumption 1]

## Open Questions <!-- optional -->

- [question 1]

## Definition of Done

> Filled in progressively by each role. QA sets `Status: Final` only after verifying all gates.
> Full standards in `docs/definition-of-done.md`.

### Code

- [ ] No lint errors
- [ ] No type errors
- [ ] No debug or uncommitted temporary code
- [ ] Follows project conventions

### Tests

- [ ] Unit tests cover new pure logic
- [ ] Integration tests cover system boundaries
- [ ] All tests pass
- [ ] No unjustified skipped tests
- [ ] Failure and edge cases covered

### Documentation

- [ ] Public interfaces documented
- [ ] All new documentation in Markdown
- [ ] All diagrams in Mermaid
- [ ] README updated if behavior or setup changed
- [ ] Architecture docs updated if ownership or boundaries changed

### Changelog

- [ ] `CHANGELOG.md` updated under `[Unreleased]` for user-visible changes

### Workflow artifacts

- [ ] Acceptance criteria checked off (met only — unmet left unchecked with explanation)
- [ ] `## Implementation Notes` written
- [ ] Spec status and index synchronized
- [ ] QA feedback rows marked `Done` where applicable

### Architecture

- [ ] No ADR or foundation rules silently violated
- [ ] ADR created or amended if a standing decision was made or changed

### QA verification

- [ ] All above gates verified independently
- [ ] Acceptance criteria classified: MET / CLAIMED BUT FAILED / OPEN / UNCHECKED
- [ ] No regressions introduced
- [ ] Spec set to `Final`

## Implementation Notes <!-- developer-owned when implemented -->

[Brief summary of what was built, deviations, or reviewer-relevant notes.]

## QA Feedback <!-- QA-owned when needed -->

[Present only when QA adds it.]
