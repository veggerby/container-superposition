# Roadmap

This roadmap is derived from the current opportunity backlog in `docs/opportunities/README.md`. Treat it as an outcome-oriented planning view rather than a commitment schedule.

## Now

- **Align discovery surfaces and canonical docs** so users can reliably find overlays, understand project-file-first workflows, and use current commands without stale examples or mental-model drift.
- **Keep command architecture maintainable** by continuing behavior-preserving modularization of oversized command modules and keeping workflow artifacts aligned with those refactors.

## Next

- **Improve onboarding for common jobs-to-be-done** with stronger preset-led setup paths and less choice overload for first-time users.
- **Make preview-first workflows more visible** so `plan`, `--verbose`, and `--diff` become an obvious safety step before generation and regeneration.

## Later

- **Support versioned private overlay and preset catalogs** so platform teams can publish, pin, and evolve internal catalogs without forking the tool.

## Assumptions and Dependencies

- ADR `001` remains the authority for project-file-first generation, replay, and remediation.
- Discovery and onboarding improvements depend on keeping user docs, CLI help, and generated reference docs aligned.
- Private-catalog work is higher-risk architecture work and should continue to be driven through explicit specs and ADR review.
