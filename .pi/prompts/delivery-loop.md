---
description: Run the canonical PM/UX/Architect/Developer/QA delivery loop using project Pi agents
argument-hint: '<request>'
---

Use the `subagent` tool with `agentScope: "project"` and a chain matching the repository workflow in `AGENTS.md`.

For this request:

$ARGUMENTS

Recommended chain:

1. `pm` creates or updates the spec in `docs/specs/` and updates `docs/specs/README.md`.
2. If the work is user-facing, `ux` refines the interaction contract; otherwise skip UX.
3. If the work is technically non-trivial, `architect` refines the technical design; otherwise skip architecture.
4. `developer` implements only after the spec is implementation-ready.
5. `qa` reviews the implementation and finalizes or writes QA feedback.

Use `{previous}` placeholders to pass each prior agent's output to the next agent in the chain. Keep all spec workflow fields and the spec index synchronized.
