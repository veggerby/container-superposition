---
description: Run cross-overlay consistency and architecture audits using project overlay subagents
argument-hint: '[instructions]'
---

Use `subagent` with `agentScope: "project"`, `cwd: "/workspaces/container-superposition"`, and a two-step chain:

1. `overlay-consistency` — run full consistency audit. Skip dot-prefixed support dirs. Do not edit files. Report critical issues, warnings, and validation results.
2. `overlay-architect` — run architecture review using consistency results from step 1 plus user instructions. Produce prioritized improvement backlog.

Use `{previous}` to pass consistency output into architecture step.

User instructions: $ARGUMENTS
