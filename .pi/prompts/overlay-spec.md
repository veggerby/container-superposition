---
description: Capture requirements for a proposed new overlay, overlay set, preset, or extension before discovery or implementation
argument-hint: '<technology, workflow, or rough overlay idea>'
---

Use the project-local skill `/skill:overlay-requirements-capture`.

Task:

Given this candidate overlay idea:

`$ARGUMENTS`

capture the minimum useful requirements before discovery or implementation.

Requirements:

1. Start from the capability needed, not just the technology name.
2. Ask only focused blocker questions needed to clarify shape and scope.
3. Determine whether this most likely wants:
    - a single overlay
    - multiple overlays
    - a preset
    - an extension to an existing overlay
    - or is still unclear
4. Capture tool-vs-service expectations, compose needs, likely ports, likely parameters, compatibility expectations, and constraints.
5. Produce a concise overlay brief suitable for handoff into `/overlay-discover` or `/overlay-write-loop`.

Output shape:

## Result

- short classification

## Requirements Brief

- concise bullets

## Acceptance Signals

- 3 to 5 bullets

## Open Questions

- blockers only

## Recommended Next Step

- `/overlay-discover` or `/overlay-write-loop`, with one-sentence rationale
