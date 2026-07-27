---
name: overlay-requirements-capture
description: Capture the minimum useful requirements for a proposed new overlay, overlay set, preset, or extension before discovery or implementation.
---

# Overlay Requirements Capture

Use this skill when the starting point is a rough overlay idea, technology name, or workflow need rather than an implementation-ready overlay brief.

Examples:

- "We should add ontop"
- "I want something for copilot-cli"
- "Do we need one overlay or several for this workflow?"
- "Help me spec a new overlay set"

## Read first

1. `AGENTS.md`
2. `docs/foundation.md`
3. `.pi/skills/overlay-solution-discovery/SKILL.md`
4. `.pi/skills/overlay-development/SKILL.md`
5. relevant existing overlays under `overlays/**` when the named technology may already have a near-match

## Goal

Turn a rough idea into a short overlay brief that is good enough for `/overlay-discover` or `/overlay-write-loop`.

## Required workflow

### 1. Start from the requested capability

Do not anchor on the tool name alone.
Clarify what the contributor actually wants to enable:

- install a CLI or SDK
- run a long-lived service
- provide both service and client tooling
- bundle several overlays into one preset-like workflow
- extend an existing overlay family

### 2. Ask only focused blocker questions

Prefer the smallest set of questions that changes the outcome.
Cover only what is needed to shape the overlay brief:

- problem/outcome
- single overlay vs multiple overlays vs preset vs extension
- tool vs service vs both
- compose need
- likely ports, services, or background processes
- likely configuration inputs
- compatibility or conflict expectations
- constraints such as auth, licensing, platform, or image-size concerns

Do not run an open-ended interview.
If some answers are obvious from the request or repo context, do not ask them.

### 3. Keep handoff boundaries clear

This workflow captures requirements.
It does not decide finally whether an overlay already exists or perform implementation.

Use these next-step boundaries:

- if reuse vs new overlay is still uncertain, hand off to `/overlay-discover`
- if the contributor already has an approved brief and wants creation work, hand off to `/overlay-write-loop`

### 4. Produce a concise overlay brief

Include only the minimum useful fields:

- requested capability
- likely shape: single overlay / multiple overlays / preset / extension / unclear
- proposed overlay id or ids when reasonable
- main tools and/or services added
- whether compose is needed
- likely ports
- likely parameters
- likely requires / suggests / conflicts
- key constraints
- acceptance signals
- open questions

## Output contract

Use this structure:

### Result

- single overlay / multiple overlays / preset / extension / unclear

### Requirements Brief

- concise bullets for the proposed shape and requirements

### Acceptance Signals

- 3 to 5 bullets describing what success looks like

### Open Questions

- unresolved blockers only

### Recommended Next Step

- `/overlay-discover` or `/overlay-write-loop`, with one sentence explaining why

## Do not do this

- do not jump straight into overlay implementation
- do not produce a long architecture spec
- do not assume one overlay is the right shape when the request likely splits into service and CLI concerns
- do not skip compatibility or compose questions when they materially affect the solution

## Validation

Requirements-capture-only work normally does not require code validation.
If you edit `.pi` assets while improving this workflow, follow `workflow-sync` guidance and run `npm run lint` at minimum.
