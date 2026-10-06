# Roadmap

This roadmap is derived from the current opportunity backlog in `docs/opportunities/README.md`. Treat it as an outcome-oriented planning view rather than a commitment schedule.

## Now

- **Keep command architecture maintainable** by continuing behavior-preserving modularization of oversized command modules and keeping workflow artifacts aligned with those refactors.

## Next

- **Improve onboarding for common jobs-to-be-done** with stronger preset-led setup paths and less choice overload for first-time users.

## Recently shipped

- **Discovery surfaces and canonical docs alignment** now include `messaging` in discovery, readable rich port metadata, and project-file-first guides that place `list`/`explain` and `plan`/`--verbose`/`--diff` before writes.
- **Versioned private overlay and preset catalogs** now let platform teams publish, pin, and evolve internal catalogs without forking the tool.
- **Repeatable compose-overlay rollout** now extends named-instance support beyond PostgreSQL to the audited `redis`, `fuseki`, `sqlserver`, and `nats` overlays.

## Assumptions and Dependencies

- ADR `001` remains the authority for project-file-first generation, replay, and remediation.
- Discovery and onboarding improvements depend on keeping user docs, CLI help, and generated reference docs aligned.
- Future private-catalog extensions should continue to be driven through explicit specs and ADR review.
