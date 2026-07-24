# Opportunity Backlog

Last updated: 2026-07-23

## Prioritized

### 1. Versioned private overlay and preset catalogs

- **type**: feature
- **status**: prioritized
- **value summary**: Unlock the biggest strategic expansion path by letting platform teams publish, pin, and evolve private catalogs without forking the tool, while preserving deterministic project-file-driven replay.
- **urgency**: Medium
- **confidence**: Medium
- **rough effort/risk**: High effort, High architecture/security risk
- **evidence**:
    - Draft spec exists: `docs/specs/029-versioned-private-catalogs/spec.md`.
    - The spec identifies blocked platform-team outcomes today: central platform ownership, independent catalog release cadence, reproducible pinning, and explicit trust/upgrade workflows.
    - The spec also identifies cross-command impact across `init`, `regen`, `doctor`, `list`, `explain`, and schema-aware authoring.
    - The spec explicitly calls for a new ADR because the feature changes trust boundaries, registry resolution order, validation, and cache/materialization responsibilities.
- **recommended next prompt or owner**: `/adr` for the catalog trust/resolution decision, then implementation planning against `docs/specs/029-versioned-private-catalogs/spec.md`.

### 2. Broaden repeatable compose overlays beyond PostgreSQL

- **type**: feature
- **status**: prioritized
- **value summary**: Expand real stack-building capability by making more infrastructure overlays repeatable through the now-final named-instance contract, increasing overlay availability and customization power for compose users.
- **urgency**: High
- **confidence**: Medium-High
- **rough effort/risk**: Medium effort, Medium risk
- **evidence**:
    - `docs/specs/050-compose-overlay-instances/spec.md` is now `Final`, so the core object-form multi-instance contract is complete.
    - `docs/specs/051-repeatable-compose-overlay-rollout/spec.md` already defines a phased rollout and approves Phase 1A candidates: `redis`, `fuseki`, `sqlserver`, and `nats`.
    - The `051` audit explicitly separates low-risk Class A overlays from deferred dependency-bound or multi-service families.
    - Recent BDD and plan-output hardening reduced regression risk for follow-on user-visible overlay work.
- **recommended next prompt or owner**: `/spec` or implementation handoff for `docs/specs/051-repeatable-compose-overlay-rollout/spec.md`.

### 3. Discovery surface clarity and canonical docs alignment

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

### 4. Preset-led onboarding for common jobs-to-be-done

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

### 5. Portfolio refresh after recent workflow and overlay-contract wins

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

### Next big bets

1. Versioned private overlay and preset catalogs
2. Broaden repeatable compose overlays beyond PostgreSQL

### Longer-term options

- Catalog upgrade assistant after private catalogs foundation exists
- Usage analytics or feedback loops to validate onboarding and preset effectiveness
- Dependency-aware repeated overlay binding after `051` Phase 1 proves the audit/rollout model

## Notes

- Ranking emphasizes expected value first because the current prioritization request explicitly deprioritized effort as a decision driver.
- Confidence remains evidence-bound to repository docs/specs only; no telemetry, support volume, or market research was reviewed here.
- `029` is ranked highest on upside, not on ease or certainty.
- `051` is the strongest newly strengthened near-term capability opportunity because `050` is now final and `051` already narrows the rollout to audited overlay classes.
- `030` remains the strongest broad UX/trust opportunity and is still the clearest low-risk shipping candidate.
- Earlier repo-local Pi skill opportunities are no longer active backlog leaders because the relevant workflow/skill work has already shipped through specs `039` and `052`.
