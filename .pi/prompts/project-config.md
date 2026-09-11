---
description: Author or update Container Superposition project config from a natural-language setup request
argument-hint: '<project setup intent>'
---

Use the project-local skill `/skill:project-config-authoring`.

Task:

Given this natural-language project setup intent:

`$ARGUMENTS`

author or update the repository-root Container Superposition project config.

Requirements:

1. Start by running `npx container-superposition defaults --json` to inspect effective user-scoped global defaults read-only; fall back to direct home-file inspection only if the command is unavailable.
2. Inspect existing `superposition.yml`, `.superposition.yml`, and `superposition.local.yml` state before writing.
3. Discover available stacks, overlays, presets, and compatibility through read-only CLI output before finalizing YAML.
4. Prefer `stack: plain`; choose Compose only when the requested capability, selected overlays, or accepted local/default behavior materially requires it.
5. Account for supported user-scoped global defaults as bootstrap-only suggestions, never as replay authority.
6. Ask focused questions only for materially ambiguous choices; otherwise record conservative assumptions.
7. Write only the narrowest safe diff to the supported shared project file and optional `superposition.local.yml`.
8. Run an appropriate read-only post-write preview or validation before handoff.

Output shape:

## Result

- files changed and selected config authority

## Assumptions and Questions

- conservative assumptions and any focused questions asked

## Stack and Capability Rationale

- stack choice, overlays/presets, and CLI discovery evidence

## Defaults Considered

- global/default files considered and how they were treated

## Validation

- post-write commands with exit statuses and residual risks
