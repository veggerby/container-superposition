# Feature Specification: Overlay Solution Discovery and Write Loop

**Spec ID**: `040-overlay-solution-discovery-and-write-loop`
**Taxonomy**: `DOCS-GUIDE`
**Created**: 2026-06-30
**Author**: PM Agent
**Status**: Final
**Input**: Add a project-local skill and prompt flow that helps contributors discover which overlay solves a stated problem, identify whether a suitable overlay already exists, and if not, produce a short overlay design description plus a clear handoff question into overlay creation.

---

## Request Classification

New contributor-workflow feature for project-local Pi assets.

## Description

Contributors currently have strong guidance for writing or reviewing overlays once they already know what overlay they want, but no project-local discovery workflow for the earlier question:

- “What overlay should solve this problem?”
- “Does an existing overlay already cover this need?”
- “If not, what is the minimal overlay we should create?”

This spec adds a discovery skill and prompt-led handoff so contributors can start from a problem statement such as “I need an overlay for a MongoDB database” and get a short, evidence-backed overlay recommendation or a concise proposed overlay design.

## Evidence

- `.pi/skills/overlay-development/SKILL.md` covers overlay creation, modification, review, and audits, but assumes the contributor already knows which overlay to work on.
- `.pi/prompts/` currently contains `overlay-audit.md` and `overlay-review.md`, but no prompt for problem-led overlay discovery or prompt-led entry into an overlay creation loop.
- `.pi/agents/overlay-writer.md`, `.pi/agents/overlay-reviewer.md`, `.pi/agents/overlay-consistency.md`, and `.pi/agents/overlay-architect.md` provide downstream overlay roles, but there is no project-local guidance that routes from problem statement to existing-overlay discovery versus new-overlay creation.
- `AGENTS.md` and `docs/foundation.md` require source-owned changes, spec-first work, and clear overlay rules, which means discovery guidance should route contributors safely before they start implementation.
- `docs/opportunities/README.md` already tracks project-local contributor skill gaps; this feature is adjacent contributor-workflow leverage and may later merit backlog capture if follow-on expansion is needed.

## Problem Statement

The repository lacks a project-local Pi workflow that starts from a user or contributor problem statement and answers three questions safely and consistently:

1. Is there already an overlay that solves this problem?
2. If not, what is the smallest correct overlay shape to add?
3. How does the contributor start the existing overlay development loop without re-describing the problem from scratch?

Without this workflow, contributors must manually inspect the overlay catalog, infer naming/category conventions, and decide ad hoc whether to create or reuse an overlay.

## User Goals / Jobs To Be Done

- As a contributor, I want to describe a need in plain language and learn whether a matching overlay already exists.
- As a contributor, I want a minimal overlay design description when no existing overlay fits.
- As a contributor, I want a clear next question that starts the overlay creation loop only after discovery is complete.
- As a contributor, I want project-local prompts and skills to route me into the existing `overlay-writer` workflow without duplicating overlay implementation rules.

## Success Signals

- Contributors can start from a plain-language overlay need and receive either matching overlay candidates or a concise new-overlay design brief.
- Discovery output consistently ends with one explicit handoff question into the write loop.
- Contributors no longer need to invent their own discovery checklist before using `overlay-writer`.
- Pi inventory docs accurately list the new skill and prompt assets.

## Goals

- Add one project-local discovery skill for problem-led overlay identification.
- Add one prompt that performs overlay discovery from a plain-language problem statement.
- Add one prompt that starts an overlay write loop from an approved discovery brief.
- Keep overlay implementation rules centralized in existing overlay guidance rather than copied into discovery assets.

## Non-Goals

- Replacing `overlay-development` or `overlay-writer`.
- Auto-creating overlays without an explicit handoff question or approval step.
- Inventing speculative overlays when existing overlays or presets already solve the problem.
- Turning discovery output into a long architecture document; output should stay short and actionable.
- Creating new subagents for this flow.

## Authority and References

This spec must align with:

- `AGENTS.md`
- `docs/foundation.md`
- `docs/definition-of-done.md`
- `.pi/skills/overlay-development/SKILL.md`
- `.pi/agents/overlay-writer.md`
- `.pi/agents/overlay-reviewer.md`
- `.pi/README.md`

## Design

### Product / Behavior

Implementation must add the following project-local assets:

1. `.pi/skills/overlay-solution-discovery/SKILL.md`
2. `.pi/prompts/overlay-discover.md`
3. `.pi/prompts/overlay-write-loop.md`
4. `.pi/README.md` updates so the new skill and prompts are truthfully documented

### Discovery skill contract

The discovery skill must tell contributors how to:

- start from a plain-language problem statement
- search existing overlays, presets, docs, and related assets first
- determine whether the request maps to:
    - an existing overlay
    - an existing preset that already bundles the needed capability
    - a small extension to an existing overlay
    - a genuinely missing overlay
- produce a short, evidence-backed design description when a new overlay appears necessary
- end with a single explicit question that asks whether to start the overlay write loop

The skill must require contributors to read first:

1. `AGENTS.md`
2. `.pi/skills/overlay-development/SKILL.md`
3. relevant overlay manifests under `overlays/**`
4. relevant docs such as `docs/overlays.md`, `docs/README.md`, and overlay READMEs when discovery needs evidence

The skill must define the required output format for discovery work:

1. **Best-fit result**
    - existing overlay(s), preset(s), or “no sufficient match found”
2. **Why this fit**
    - short evidence-backed reasoning with file references
3. **Short design description**
    - only when a new overlay or overlay extension is needed
    - must include proposed overlay id/theme, likely category, expected stack support, likely services/tools added, likely parameters, likely ports, probable dependencies/conflicts, and whether compose is needed
4. **Handoff question**
    - one explicit question asking whether to initiate the overlay write loop

The skill must explicitly forbid:

- guessing an overlay exists without checking live repo assets
- guessing implementation details without evidence from similar overlays or repo conventions
- jumping straight into overlay creation without first classifying reuse vs extension vs new overlay
- outputting a long spec instead of the requested short design description

### Overlay discovery prompt contract

`/overlay-discover` must:

- accept a plain-language problem statement as its argument
- instruct the agent to inspect existing overlays, presets, docs, and manifests before proposing a new overlay
- use the discovery skill as the primary playbook
- return a short design-oriented result, not implementation
- end by asking whether to start the overlay write loop

The prompt must route contributors toward three possible outcomes:

1. **Use an existing overlay**
2. **Use or adapt an existing preset / existing overlay family**
3. **Create a new overlay**

### Overlay write loop prompt contract

`/overlay-write-loop` must exist because discovery and implementation are separate decisions.

It must:

- accept either the approved discovery brief or a concise overlay goal as input
- instruct the agent to use `overlay-development`
- route actual creation/modification work through the existing project-local overlay workflow, especially `overlay-writer` and then `overlay-reviewer`
- preserve the explicit approval boundary: discovery proposes, write loop creates
- not re-run broad discovery as its primary task unless the discovery brief is missing or clearly insufficient

The prompt should behave as the structured entry point into the existing overlay creation loop rather than embedding all writer/reviewer rules itself.

### Output contract for discovery

Discovery responses must stay short.

Expected shape:

- **Result** — existing overlay / preset / new overlay needed
- **Evidence** — short bullets with concrete file references
- **Short design description** — only when creation or extension is needed
- **Question** — one question asking whether to start `/overlay-write-loop`

Example final question style:

- `Start /overlay-write-loop for a new compose-only MongoDB overlay based on this brief?`

### Technical Notes

- The skill and prompts should reuse existing overlay authority instead of copying the entire overlay implementation handbook.
- The write loop prompt should leverage existing project agents rather than adding new ones.
- `.pi/README.md` must stop claiming nonexistent prompt surfaces and must list the newly added skill/prompt surfaces accurately after implementation.

## Constraints

- No new overlay implementation occurs during discovery.
- Discovery guidance must stay evidence-backed and repo-aware.
- The design description must be concise enough to hand directly into the write loop.
- Prompt and skill text must remain accurate to the actual project-local Pi assets present in the repo.

## Risks

- Discovery output could become too verbose and duplicate a full spec.
- Discovery could over-prefer new overlays instead of reuse if the prompt does not force repository scanning first.
- The write loop prompt could duplicate `overlay-development` if its scope is not kept narrow.

## Acceptance Criteria

- [x] `.pi/skills/overlay-solution-discovery/SKILL.md` exists and defines a repo-aware discovery workflow for mapping plain-language problems to existing overlays, presets, overlay extensions, or new overlays.
- [x] `.pi/prompts/overlay-discover.md` exists and uses the discovery skill to produce short, evidence-backed discovery output ending with one explicit handoff question.
- [x] `.pi/prompts/overlay-write-loop.md` exists and provides a structured handoff into the existing overlay creation/review loop without replacing `overlay-development`.
- [x] Discovery output explicitly checks for existing overlays or presets before proposing a new overlay.
- [x] When a new overlay is needed, discovery output includes a short design description covering likely category, stack support, services/tools, parameters, ports, and dependency/conflict expectations.
- [x] `.pi/README.md` is updated so it truthfully lists the new skill and prompts.
- [x] Validation appropriate to the asset type is defined and executed. For this docs-only `.pi` skill/prompt workflow, `npm run lint` plus manual verification of live `.pi` inventory and prompt/skill contract coverage is sufficient unless implementation introduces executable code.
- [x] Documentation and workflow artifacts are updated to match the implemented or reviewed state.

## Out of Scope

- Implementing a new overlay itself.
- Creating a new overlay-specific subagent.
- Adding product runtime behavior to the CLI.

## Assumptions

- The existing `overlay-writer` and `overlay-reviewer` agents are sufficient for the implementation phase once discovery is complete.
- A dedicated write-loop prompt is useful because the contributor should explicitly confirm the discovery brief before starting creation work.

## Open Questions

- Whether discovery should explicitly surface preset matches before overlay matches when both solve the stated problem equally well.

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

- [x] All above gates verified independently
- [x] Acceptance criteria classified: MET / CLAIMED BUT FAILED / OPEN / UNCHECKED
- [x] No regressions introduced
- [x] Spec set to `Final`

## Implementation Notes

Implemented project-local overlay discovery assets:

- `.pi/skills/overlay-solution-discovery/SKILL.md`
- `.pi/prompts/overlay-discover.md`
- `.pi/prompts/overlay-write-loop.md`
- `.pi/README.md` inventory update

Synchronized workflow artifacts:

- `docs/specs/040-overlay-solution-discovery-and-write-loop/spec.md`
- `docs/specs/README.md`
- `docs/specs/taxonomy.md`
- `CHANGELOG.md`

Key decisions implemented:

- discovery scans existing overlays, presets, and docs before proposing a new overlay
- discovery output stays short and ends with one explicit question about starting `/overlay-write-loop`
- `/overlay-write-loop` is kept narrow as an approved handoff into the existing `overlay-writer` + `overlay-reviewer` flow rather than a replacement for overlay-development guidance

Testing note:

- no repo test harness currently executes project-local Pi prompt/skill markdown assets directly
- for this docs-only workflow change, validation is asset-appropriate: lint plus manual verification of live `.pi` inventory and contract coverage
- no new pure logic or integration boundary was introduced, so unit/integration-specific checklist items remain not applicable

Validation run:

- `npm run lint`
- `npm test`

**QA Status**: Passed
