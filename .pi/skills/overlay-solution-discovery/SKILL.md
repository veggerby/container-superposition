---
name: overlay-solution-discovery
description: Discover whether an existing overlay or preset already solves a stated problem, or produce a short new-overlay design brief plus a handoff question into the overlay write loop.
---

# Overlay Solution Discovery

Use this skill when a contributor starts from a problem statement rather than a known overlay id.

Examples:

- "I need an overlay for a MongoDB database"
- "Is there already an overlay for local Kafka-style development?"
- "What overlay should we add for Terraform?"
- "Do we already have a preset or overlay for a Python docs workflow?"

## Read first

1. `AGENTS.md`
2. `.pi/skills/overlay-development/SKILL.md`
3. `docs/foundation.md`
4. `docs/definition-of-done.md` when discovery may turn into implementation planning
5. relevant existing overlays under `overlays/**`
6. `docs/overlays.md`, `README.md`, and overlay `README.md` files when they provide evidence about current support

## Primary files and surfaces

- `overlays/**`
- `overlays/*/overlay.yml`
- `overlays/*/README.md`
- `docs/overlays.md`
- `README.md`
- `.pi/skills/overlay-development/SKILL.md`
- `.pi/prompts/overlay-write-loop.md`

## Required workflow

### 1. Start from the problem, not from an assumed overlay

Rewrite the request into the capability being asked for:

- service or runtime
- developer tool
- observability component
- cloud utility
- preset-like bundle
- extension to an existing overlay

Do not assume a new overlay is needed just because the requester named a technology.

### 2. Search existing repo assets first

Check for, in this order:

1. exact existing overlay matches
2. near-match overlays in the same capability family
3. presets that already solve the workflow well enough
4. evidence that the capability should extend an existing overlay instead of creating a new one

Always use live repo evidence such as:

- overlay ids and manifests
- overlay README files
- generated overlay docs
- preset definitions when relevant

### 3. Classify the result

Choose exactly one primary result:

- **Existing overlay match**
- **Existing preset match**
- **Extend an existing overlay**
- **New overlay needed**
- **Need clarification before discovery can conclude**

If clarification is needed, ask one focused question only when the ambiguity blocks classification.

### 4. If a new overlay or extension is needed, produce a short design description

Keep it short and implementation-oriented.

Include only the minimum useful fields:

- proposed overlay id or extension target
- likely category
- likely stack support (`[]` or `[compose]`)
- whether compose is needed
- main capability added
- likely services or tools added
- likely ports
- likely parameters
- probable `requires`, `suggests`, or `conflicts`
- key repo-pattern notes from similar overlays

This is **not** a full spec. It is a concise brief for the write loop.

### 5. End with one explicit handoff question

Discovery output must end with one question that asks whether to start the write loop.

Preferred pattern:

- `Start /overlay-write-loop for this overlay brief?`

If an existing overlay already solves the problem, the question may ask whether to review or adapt that overlay instead.

## Output contract

Use this structure:

### Result

- one of: existing overlay / existing preset / extend existing overlay / new overlay needed / clarification needed

### Evidence

- short bullets with exact file references

### Short design description

- include only when extension or new overlay is needed

### Question

- one explicit question asking whether to start `/overlay-write-loop`

## Do not do this

- do not guess that an overlay exists without checking the repo
- do not jump straight into implementation
- do not produce a long architecture or product spec
- do not invent detailed parameters or conflicts without evidence from similar overlays or repo conventions
- do not duplicate the full overlay implementation handbook here; route implementation to `overlay-development`

## Escalate when

- the problem could reasonably map to several overlay categories and the difference changes implementation scope
- the request sounds like a preset or multi-overlay workflow rather than one overlay
- repo conventions or existing overlays suggest a significant architecture or schema change would be needed

## Validation

Discovery-only work normally does not require code validation.

If discovery turns into implementation planning or file changes:

- update only the relevant Pi inventory/docs assets
- run `npm run lint` before handoff

If implementation begins after approval, follow `overlay-development` validation rules.

## Related skills

- `overlay-development` — use once discovery turns into actual overlay creation or modification
