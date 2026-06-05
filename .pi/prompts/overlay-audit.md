---
description: Run cross-overlay consistency and architecture audits using project overlay agents
argument-hint: '[instructions]'
---

Run a two-step audit chain:

1. Invoke `overlay-consistency` — run full consistency audit. Skip dot-prefixed support dirs. Do not edit files. Report critical issues, warnings, and validation results.
2. Invoke `overlay-architect` — run architecture review using consistency results from step 1 plus user instructions. Produce prioritized improvement backlog.

Pass the consistency output from step 1 as context into step 2.

User instructions: $ARGUMENTS
