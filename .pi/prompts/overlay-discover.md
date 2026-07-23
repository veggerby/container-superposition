---
description: Discover whether an existing overlay or preset already solves a stated problem, or produce a short overlay design brief and ask whether to start the write loop
argument-hint: '<problem statement>'
---

Use the project-local skill `/skill:overlay-solution-discovery`.

Task:

Given this problem statement:

`$ARGUMENTS`

perform repo-aware overlay discovery.

Requirements:

1. If the request is too vague to classify confidently, ask the smallest focused blocker questions first or recommend `/overlay-spec` as the requirements-capture entrypoint.
2. Search existing overlays, presets, generated overlay docs, and related READMEs first.
3. Before recommending a scratch-built overlay, also check whether an existing published Dev Container Feature could credibly cover the capability; use `fetch_content` to load `https://containers.dev/features` for discovery, use `get_search_content` if needed for more of the stored page content, and validate any candidate reference before recommending it.
4. Classify the result as one of:
    - existing overlay match
    - existing preset match
    - extend an existing overlay
    - reuse an existing Dev Container Feature in a thin overlay
    - new overlay needed
    - clarification needed
5. If a new overlay, feature-backed thin overlay, or extension is needed, output a **short design description** only.
6. End with exactly one explicit question asking whether to start `/overlay-write-loop`.

Output shape:

## Result

- short classification

## Evidence

- short bullets with file references

## Short Design Description

- only when extension, feature-backed thin overlay, or new overlay is needed

## Question

- one explicit question about starting `/overlay-write-loop`
