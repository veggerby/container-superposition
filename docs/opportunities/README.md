# Opportunity Backlog

Last updated: 2026-06-22

## Prioritized

### 1. Discovery surface clarity and docs alignment

- **type**: UX
- **status**: prioritized
- **value summary**: Reduce first-run confusion and failed self-service discovery by making available overlays easier to find and current workflows easier to follow.
- **urgency**: High
- **confidence**: High
- **rough effort/risk**: Low–Medium effort, Low risk
- **evidence**:
    - Default `list` output omits `messaging` category despite 3 live messaging overlays.
    - `list --category messaging` and other filtered tables render many ports as `[object Object]`.
    - User docs still show deprecated patterns such as category-centric project config (`language:` / `database:`), old CLI examples (`--postgres`, `cs list --presets`), and `_serviceOrder` references.
    - `plan --diff` exists in CLI/help/tests but is lightly surfaced in docs.
- **recommended next prompt or owner**: Spec captured in `docs/specs/030-discovery-surface-and-docs-alignment/spec.md`.

### 2. Versioned private overlay and preset catalogs

- **type**: feature
- **status**: candidate
- **value summary**: Unlock platform-team adoption by letting orgs publish and pin private catalogs without forking tool.
- **urgency**: Medium
- **confidence**: Medium
- **rough effort/risk**: High effort, High architecture/security risk
- **evidence**:
    - Draft spec exists: `docs/specs/029-versioned-private-catalogs/spec.md`.
    - Opportunity aligns with platform/team workflow expansion and reproducible pinned project config model.
    - Spec now includes technical-design and routing closure for implementation handoff.
- **recommended next prompt or owner**: Spec captured in `docs/specs/029-versioned-private-catalogs/spec.md`.

### 3. Command and doc model simplification sweep

- **type**: documentation
- **status**: candidate
- **value summary**: Lower learning cost by aligning README/docs/help/examples around one canonical mental model: `superposition.yml` + flat `overlays:` + discovery commands.
- **urgency**: High
- **confidence**: High
- **rough effort/risk**: Medium effort, Low risk
- **evidence**:
    - `README.md` quickstart still shows category-based project file fields.
    - `tool/README.md`, `docs/quick-reference.md`, `docs/examples.md`, `docs/team-workflow.md`, `docs/messaging-quick-start.md`, `docs/creating-overlays.md`, `docs/dependencies.md` contain stale CLI/config guidance.
- **recommended next prompt or owner**: Covered by `docs/specs/030-discovery-surface-and-docs-alignment/spec.md`.

### 4. Preset-led onboarding for common jobs-to-be-done

- **type**: feature
- **status**: candidate
- **value summary**: Increase successful first-run setup by steering users toward opinionated presets instead of large overlay catalogs.
- **urgency**: Medium
- **confidence**: Medium
- **rough effort/risk**: Medium effort, Medium risk
- **evidence**:
    - 94 catalog items create high choice load.
    - 13 presets already exist for common scenarios (`frontend`, `web-api`, `microservice`, `local-llm`, etc.).
    - Docs emphasize composability, but preset-first guidance appears secondary in some entrypoints.
- **recommended next prompt or owner**: Spec captured in `docs/specs/031-preset-led-onboarding-for-common-jobs/spec.md`.

### 5. Power-user planning workflow visibility

- **type**: UX
- **status**: candidate
- **value summary**: Improve confidence before generation by surfacing `plan`, `--verbose`, and `--diff` as safer preview workflow.
- **urgency**: Medium
- **confidence**: Medium
- **rough effort/risk**: Low effort, Low risk
- **evidence**:
    - `plan --diff` fully exists in CLI/help/tests.
    - Main docs center `init`/`regen`; preview workflow less prominent.
- **recommended next prompt or owner**: Covered by `docs/specs/030-discovery-surface-and-docs-alignment/spec.md`.

## Horizon buckets

### Quick wins

1. Discovery surface clarity and docs alignment
2. Command and doc model simplification sweep
3. Power-user planning workflow visibility

### Next big bets

1. Versioned private overlay and preset catalogs
2. Preset-led onboarding for common jobs-to-be-done

### Longer-term options

- Catalog version upgrade assistant after private catalogs foundation exists
- Usage analytics or feedback loops to validate preset/discovery effectiveness

## Notes

- Ranking based on repository evidence only. No telemetry, issue volume, or conversion data reviewed.
- Quick-win items likely compound together and may be worth bundling into one user-facing discovery/onboarding initiative.
