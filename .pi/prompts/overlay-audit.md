---
description: Run cross-overlay consistency and architecture audits using project overlay agents
argument-hint: '[instructions]'
---

Run a two-step audit chain:

1. Invoke `overlay-consistency` — run full consistency audit. Skip dot-prefixed support dirs. Do not edit files. Report critical issues, warnings, validation results, and feature-reuse opportunities that deserve a balanced custom-vs-feature decision. When checking published Dev Container Feature candidates, use `fetch_content` to load `https://containers.dev/features` and `get_search_content` if more of the stored page content is needed.
2. Invoke `overlay-architect` — run architecture review using consistency results from step 1 plus user instructions. Produce prioritized improvement backlog, including whether any overlay should reuse an existing published Dev Container Feature instead of bespoke logic. Use `fetch_content` / `get_search_content` for feature-catalog evidence when needed.

Pass the consistency output from step 1 as context into step 2.

User instructions: $ARGUMENTS
