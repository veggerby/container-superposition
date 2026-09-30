# Code Review Instructions

Review changes against this repository's current authorities. `AGENTS.md` is authoritative; also apply `docs/foundation.md`, `docs/definition-of-done.md`, relevant ADRs and feature specs, and every matching path-specific file in `.github/instructions/**/*.instructions.md`.

Treat path-specific instructions as additional guidance for matching files. If authorities conflict or the required authority is unclear, flag the conflict for maintainers; do not silently normalize it, invent an exception, or approve unsupported behavior.

Focus review feedback on:

- correctness, regressions, and edge cases;
- approved scope and the ownership boundaries in the foundation and relevant spec;
- required validation, targeted tests, and BDD coverage where applicable;
- source-owned generated artifacts and prohibited direct edits;
- synchronized documentation, specs/indexes, and changelog entries when required; and
- real, severity-appropriate, actionable findings.

Do not approve a change solely because it appears plausible or tests pass when required authority, validation, or documentation evidence is missing.
