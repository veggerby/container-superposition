# Opportunity Backlog

Last updated: 2026-07-28

## Prioritized

### 1. Discovery surface clarity and canonical docs alignment

- **type**: UX
- **status**: prioritized
- **value summary**: Improve user trust, discovery quality, and day-one experience by aligning CLI discovery surfaces, docs, examples, and preview-first workflow guidance around the current canonical model.
- **urgency**: High
- **confidence**: High
- **rough effort/risk**: Low-Medium effort, Low risk
- **evidence**:
    - Draft spec exists: `docs/specs/030-discovery-surface-and-docs-alignment/spec.md`.
    - Repo evidence in the spec/backlog shows missing `messaging` in default discovery, `[object Object]` rendering in filtered output, stale category-centric config guidance, and underexposed `plan` / `plan --verbose` / `plan --diff` workflow.
    - `docs/roadmap.md` currently places this theme in `Now`.
- **recommended next prompt or owner**: `/spec` or implementation handoff for `docs/specs/030-discovery-surface-and-docs-alignment/spec.md`.

### 2. Preset-led onboarding for common jobs-to-be-done

- **type**: feature
- **status**: candidate
- **value summary**: Reduce first-run choice overload by steering users toward opinionated presets first, while preserving direct overlay customization when needed.
- **urgency**: Medium
- **confidence**: Medium
- **rough effort/risk**: Medium effort, Medium risk
- **evidence**:
    - Draft spec exists: `docs/specs/031-preset-led-onboarding-for-common-jobs/spec.md`.
    - The spec cites 94 catalog items and 13 existing presets, with first-run surfaces still emphasizing manual composability in some places.
    - `docs/roadmap.md` currently places this theme in `Next`.
- **recommended next prompt or owner**: `/spec` or implementation handoff for `docs/specs/031-preset-led-onboarding-for-common-jobs/spec.md`.

### 3. Portfolio refresh after recent workflow and overlay-contract wins

- **type**: process
- **status**: candidate
- **value summary**: Keep planning artifacts trustworthy after recent shipping progress by reflecting that specs `050`, `052`, and `053` are now final and that BDD is now an explicit Definition-of-Done requirement for user-visible workflow changes.
- **urgency**: Medium
- **confidence**: High
- **rough effort/risk**: Low effort, Low risk
- **evidence**:
    - `docs/opportunities/README.md` and `docs/roadmap.md` were previously biased toward older discovery/skill opportunities.
    - Specs `050-compose-overlay-instances`, `052-overlay-requirements-capture`, and `053-behave-bdd-overlay-discovery` are now final.
    - `AGENTS.md` and `docs/definition-of-done.md` now explicitly require BDD coverage or justification for user-visible workflow changes.
- **recommended next prompt or owner**: `/roadmap` if a broader planning refresh is desired beyond this backlog update.

## Horizon buckets

### Quick wins

1. Discovery surface clarity and canonical docs alignment
2. Portfolio refresh after recent workflow and overlay-contract wins
3. Preset-led onboarding for common jobs-to-be-done

### Recently shipped / no longer active opportunities

- Versioned private overlay and preset catalogs shipped through spec `029-versioned-private-catalogs`.
- Repeatable compose-overlay rollout shipped through specs `050-compose-overlay-instances` and `051-repeatable-compose-overlay-rollout`.

### Longer-term options

- Catalog upgrade assistant after private catalogs foundation exists
- Usage analytics or feedback loops to validate onboarding and preset effectiveness
- Dependency-aware repeated overlay binding after `051` Phase 1 proves the audit/rollout model

## Notes

- Ranking emphasizes expected value first because the current prioritization request explicitly deprioritized effort as a decision driver.
- Confidence remains evidence-bound to repository docs/specs only; no telemetry, support volume, or market research was reviewed here.
- `030` remains the strongest broad UX/trust opportunity and is still the clearest low-risk shipping candidate.
- Private catalogs and repeatable compose-overlay rollout moved out of the active backlog because shipped specs `029`, `050`, and `051` now cover that work.
- Earlier repo-local Pi skill opportunities are no longer active backlog leaders because the relevant workflow/skill work has already shipped through specs `039` and `052`.
