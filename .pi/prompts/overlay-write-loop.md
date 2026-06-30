---
description: Start the overlay creation or modification loop from an approved discovery brief
argument-hint: '<approved overlay brief or overlay goal>'
---

Use the project-local skill `/skill:overlay-development`.

Run this workflow:

1. Treat `$ARGUMENTS` as the approved overlay brief or concise overlay goal.
2. Invoke the project `overlay-writer` agent with that brief and `cwd: "/workspaces/container-superposition"`.
3. After writing or modifying the overlay, invoke the project `overlay-reviewer` agent on the resulting overlay.
4. If the reviewer finds critical issues, fix them before final handoff.
5. Report:
    - files created or changed
    - validation results
    - reviewer findings
    - any remaining follow-up

Do not restart broad discovery unless the brief is missing or clearly insufficient.
