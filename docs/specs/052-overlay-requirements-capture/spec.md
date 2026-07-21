---
spec: '052-overlay-requirements-capture'
title: 'Overlay Requirements Capture Prompt and Skill'
status: 'Implemented'
qa_status: ''
priority: 'P2'
owner: 'developer'
product_approval: 'not-needed'
architecture_review: 'not-needed'
ux_review: 'not-needed'
created: '2026-07-21'
updated: '2026-07-21'
related_adrs: []
related_foundation:
    - 'docs/foundation.md'
related_specs:
    - '040-overlay-solution-discovery-and-write-loop'
normative_references:
    - 'AGENTS.md'
    - 'docs/definition-of-done.md'
    - '.pi/README.md'
    - '.pi/skills/overlay-solution-discovery/SKILL.md'
    - '.pi/prompts/overlay-discover.md'
---

# Overlay Requirements Capture Prompt and Skill

**Spec**: `052-overlay-requirements-capture`
**Status**: Implemented
**Created**: 2026-07-21
**Priority**: P2
**Product Approval**: not-needed
**Architecture Review**: not-needed
**UX Review**: not-needed

> P0 = unusable without; P1 = core value, ship v1; P2 = post-launch; P3 = backlog

## Description

Add a project-local Pi requirements-capture workflow for new overlay ideas so contributors can start from a technology name or rough workflow need, answer a small set of focused questions, and receive a concise overlay brief before discovery or implementation begins.

## Evidence

- `.pi/prompts/overlay-discover.md` — starts from a problem statement and classification workflow, but does not explicitly frame a requirements-capture interview for a new overlay idea.
- `.pi/prompts/overlay-write-loop.md` — assumes an approved brief or clear overlay goal already exists.
- `.pi/skills/overlay-solution-discovery/SKILL.md` — focuses on reuse-vs-new-overlay discovery after the need is stated, not on eliciting the need shape itself.
- `.pi/skills/overlay-development/SKILL.md` — governs implementation and review once the overlay scope is known.
- User request on 2026-07-21 — asked for “a prompt to capture requirements for a new (set of) overlay(s)” and to “capture it in .pi as overlay spec or something... add/update relevant skills, prompts agents etc”.

## Problem Statement

The repository has overlay discovery and overlay writing workflows, but it lacks a project-local entrypoint specifically for requirement capture when the starting input is just a named technology or rough idea such as `ontop` or `copilot-cli`. Contributors must improvise their own interview structure before they can produce a brief suitable for discovery or writing.

## User Goals / Jobs To Be Done

- As a contributor, I want a repeatable way to ask only the questions that matter for a new overlay idea.
- As a contributor, I want the output summarized as a short overlay brief I can hand into discovery or creation.
- As a contributor, I want the workflow to help distinguish single overlay vs multiple overlays vs preset vs extension.

## Success Signals

- Contributors can run one project-local prompt to interview for a new overlay idea and receive a concise requirements brief.
- The brief captures scope, compose needs, services/tools, parameters, compatibility expectations, and success signals.
- Existing overlay discovery and writing assets reference this requirements-capture step when starting scope is unclear.

## Confidence

- Overall confidence: high
- Confidence notes: the gap is directly evidenced by the existing `.pi` assets and the user request.

## User Stories

**US-1** As a contributor, I want to start from a technology name and get a focused requirements interview.

**US-2** As a contributor, I want the resulting brief to be short enough to paste into `/overlay-discover` or `/overlay-write-loop`.

## Goals

- Add one project-local skill for overlay requirements capture.
- Add one project-local prompt that runs the requirements-capture workflow.
- Update adjacent `.pi` assets so the new entrypoint is discoverable and truthfully documented.

## Non-Goals

- Replacing overlay discovery or overlay creation workflows.
- Automatically implementing overlays from a vague request.
- Creating new runtime CLI behavior outside `.pi` contributor assets.

## Authority and References

This spec must align with:

- `AGENTS.md`
- `docs/foundation.md`
- `docs/definition-of-done.md`
- `.pi/README.md`
- `.pi/skills/overlay-solution-discovery/SKILL.md`
- `.pi/skills/overlay-development/SKILL.md`

List the specific references for this spec:

- `.pi/prompts/overlay-discover.md`
- `.pi/prompts/overlay-write-loop.md`
- `.pi/agents/overlay-writer.md`

## Design

### Product / Behavior

Implementation adds a new project-local Pi requirements-capture surface:

1. `.pi/skills/overlay-requirements-capture/SKILL.md`
2. `.pi/prompts/overlay-spec.md`

The skill must instruct contributors to:

- start from a candidate technology, tool, service, or workflow need
- ask the smallest focused set of questions needed to clarify the requested capability
- determine whether the likely shape is one overlay, multiple overlays, a preset, or an extension to an existing overlay
- capture tool-vs-service expectations, compose needs, ports, parameters, compatibility, and constraints
- summarize the result as a concise overlay brief plus acceptance signals and remaining open questions
- route next steps toward `/overlay-discover` or `/overlay-write-loop` depending on how clear and approved the brief is

The prompt must:

- accept a technology name, workflow need, or rough overlay idea as its argument
- use the requirements-capture skill as the primary playbook
- ask blocker questions first rather than jumping straight into implementation
- output a short overlay brief that can be copied into the existing discovery/write loop

Adjacent `.pi` assets must be updated so they reflect the new workflow accurately:

- `.pi/README.md`
- `.pi/skills/overlay-development/SKILL.md`
- `.pi/skills/overlay-solution-discovery/SKILL.md`
- `.pi/prompts/overlay-discover.md`
- `.pi/agents/overlay-writer.md`

### Technical Notes

- Keep this as a docs-only `.pi` workflow change.
- Reuse existing skills rather than duplicating implementation handbooks.
- Keep the output intentionally short and handoff-oriented.

## Constraints

- The requirements-capture workflow must not auto-create overlays.
- Questions should stay focused and minimal.
- `.pi/README.md` must remain truthful to live files on disk.

## Risks

- The prompt could duplicate too much of overlay discovery instead of feeding it.
- The interview could become too open-ended if it does not constrain question scope.

## Acceptance Criteria

- [x] `.pi/skills/overlay-requirements-capture/SKILL.md` exists and defines a focused overlay requirements-capture workflow.
- [x] `.pi/prompts/overlay-spec.md` exists and produces a short overlay requirements brief from a rough overlay idea.
- [x] The new workflow captures single-vs-multi overlay shape, compose needs, services/tools, parameters, compatibility, success signals, and open questions.
- [x] Relevant `.pi` skills, prompts, or agents are updated so the new workflow is discoverable and correctly positioned relative to discovery and writing.
- [x] `.pi/README.md`, `docs/specs/README.md`, `docs/specs/taxonomy.md`, and `CHANGELOG.md` are synchronized.
- [x] Documentation and workflow artifacts are updated to match the implemented or reviewed state.

## Out of Scope

- Implementing any overlay itself.
- Adding new repo code, tests, or CLI commands.

## Assumptions

- The existing discovery and write-loop prompts remain the correct downstream handoff points.

## Open Questions

- None.

## Definition of Done

> Filled in progressively by each role. QA sets `Status: Final` only after verifying all gates.
> Full standards in `docs/definition-of-done.md`.

### Code

- [x] No lint errors
- [x] No type errors
- [x] No debug or uncommitted temporary code
- [x] Follows project conventions

### Tests

- [ ] Unit tests cover new pure logic
- [ ] Integration tests cover system boundaries
- [x] All tests pass
- [x] No unjustified skipped tests
- [ ] Failure and edge cases covered

### Documentation

- [x] Public interfaces documented
- [x] All new documentation in Markdown
- [x] All diagrams in Mermaid
- [x] README updated if behavior or setup changed
- [x] Architecture docs updated if ownership or boundaries changed

### Changelog

- [x] `CHANGELOG.md` updated under `[Unreleased]` for user-visible changes

### Workflow artifacts

- [x] Acceptance criteria checked off (met only — unmet left unchecked with explanation)
- [x] `## Implementation Notes` written
- [x] Spec status and index synchronized
- [x] QA feedback rows marked `Done` where applicable

### Architecture

- [x] No ADR or foundation rules silently violated
- [x] ADR created or amended if a standing decision was made or changed

### QA verification

- [ ] All above gates verified independently
- [ ] Acceptance criteria classified: MET / CLAIMED BUT FAILED / OPEN / UNCHECKED
- [ ] No regressions introduced
- [ ] Spec set to `Final`

## Implementation Notes

Added a new project-local requirements-capture workflow for early overlay ideation:

- `.pi/skills/overlay-requirements-capture/SKILL.md`
- `.pi/prompts/overlay-spec.md`

Updated adjacent `.pi` assets so the workflow is discoverable and correctly sequenced before overlay discovery or writing:

- `.pi/README.md`
- `.pi/skills/overlay-development/SKILL.md`
- `.pi/skills/overlay-solution-discovery/SKILL.md`
- `.pi/prompts/overlay-discover.md`
- `.pi/agents/overlay-writer.md`

Validation for this docs-only workflow change uses the repo-standard contributor gate:

- `task validate`
