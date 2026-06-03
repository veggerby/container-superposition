---
description: Review one changed container-superposition overlay using the project overlay reviewer subagent
argument-hint: '<overlay-id-or-path>'
---

Use `subagent` with exact args:

- `agent: "overlay-reviewer"`
- `agentScope: "project"`
- `cwd: "/workspaces/container-superposition"`

Task:

Review overlay `$ARGUMENTS`. Focus on `overlays/**` plus overlay-derived docs/schema files. Do not edit files. Report critical issues, warnings, passed checks, and validation results.
