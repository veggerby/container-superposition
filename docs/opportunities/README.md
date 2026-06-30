# Opportunity Backlog

Last updated: 2026-06-30

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

### 6. Project-local CLI command delivery skill

- **type**: process
- **status**: candidate
- **value summary**: Speed up safe command work by giving contributors and agents one repo-specific playbook for `tool/commands/**`, including command-boundary rules, ADR `001` alignment, source-vs-compiled path handling, and targeted validation.
- **urgency**: High
- **confidence**: High
- **rough effort/risk**: Medium effort, Low risk
- **evidence**:
    - `docs/specs/README.md` currently lists 21 CLI-related specs (`CLI-UX`, `CLI-COMMAND`, `CLI-FLAG`) versus 4 `OVERLAY-NEW` specs, but `.pi/skills/` contains only `overlay-development`.
    - Recent specs `037-cli-command-modularization` and `038-doctor-and-plan-command-modularization` codify command-specific boundaries and behavior-preserving refactor rules.
    - `tool/commands/` now contains modular command trees for `adopt`, `doctor`, and `plan`, plus focused command tests, but no project-local Pi skill or prompt helps contributors apply those patterns consistently.
- **recommended next prompt or owner**: Draft `.pi/skills/cli-command-delivery/SKILL.md` from `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, ADR `001`, specs `033`–`038`, and `tool/commands/{adopt,doctor,plan}/`.

### 7. Canonical docs alignment skill for contributor sweeps

- **type**: documentation
- **status**: candidate
- **value summary**: Reduce docs drift by giving contributors and agents a repo-local checklist for project-file-first, flat `overlays:` guidance, preview-first command flows, and legacy-labeling rules.
- **urgency**: High
- **confidence**: High
- **rough effort/risk**: Low effort, Low risk
- **evidence**:
    - Draft spec `030-discovery-surface-and-docs-alignment` already bundles repo evidence about stale docs/help/examples and inconsistent discovery guidance.
    - `README.md` still teaches category-centric project config fields, `CONTRIBUTING.md` still teaches deprecated overlay/template registration patterns, and `.pi/README.md` mentions a `/delivery-loop` prompt that does not exist.
    - `docs/foundation.md` explicitly notes that some older docs still reflect earlier product phases and need follow-up alignment with ADR `001`.
- **recommended next prompt or owner**: Draft `.pi/skills/canonical-docs-alignment/SKILL.md` for README/docs/help/example cleanup against ADR `001`, spec `030`, and current CLI behavior.

### 8. Workflow artifact and Pi asset sync skill

- **type**: process
- **status**: candidate
- **value summary**: Prevent workflow drift by teaching contributors and agents how to keep specs, opportunities, roadmap, changelog, `.pi` assets, and other repo guidance synchronized after architecture or workflow changes.
- **urgency**: Medium
- **confidence**: High
- **rough effort/risk**: Low effort, Low risk
- **evidence**:
    - `AGENTS.md` and `docs/definition-of-done.md` require spec-first delivery, changelog updates, generated artifact regeneration, and workflow-doc synchronization.
    - `.pi/README.md` currently documents `/delivery-loop`, but `.pi/prompts/` contains only `overlay-audit.md` and `overlay-review.md`.
    - Spec `037-cli-command-modularization` calls out an empty `docs/specs/037-doctor-command-modularization/` directory as workflow hygiene debt.
- **recommended next prompt or owner**: Draft `.pi/skills/workflow-sync/SKILL.md` for repo artifact hygiene, including `.pi` inventory checks and when to update `docs/opportunities/README.md`, `docs/roadmap.md`, `CHANGELOG.md`, and spec indexes.

### 9. Dogfooding and generated-artifact safety skill

- **type**: reliability
- **status**: candidate
- **value summary**: Make risky repo-self-hosting changes safer by codifying when contributors may touch the root devcontainer, how to route changes back to source overlays/project config, and which regen/doctor checks prove the repo still dogfoods correctly.
- **urgency**: Medium
- **confidence**: Medium
- **rough effort/risk**: Medium effort, Medium risk
- **evidence**:
    - `CONTRIBUTING.md` states the repo dogfoods its own devcontainer workflow.
    - `.github/instructions/dogfooding.instructions.md` documents special handling for the root `.devcontainer/`, but there is no equivalent project-local Pi skill.
    - `AGENTS.md` and `docs/definition-of-done.md` enforce regen/doctor/reproducibility rules that are easy to miss during contributor automation work outside overlay-only tasks.
- **recommended next prompt or owner**: Draft `.pi/skills/dogfooding-safety/SKILL.md` around root `.devcontainer/`, project-file authority, regen/doctor validation, and generated-artifact boundaries.

## Horizon buckets

### Quick wins

1. Discovery surface clarity and docs alignment
2. Command and doc model simplification sweep
3. Canonical docs alignment skill for contributor sweeps
4. Workflow artifact and Pi asset sync skill
5. Power-user planning workflow visibility

### Next big bets

1. Project-local CLI command delivery skill
2. Versioned private overlay and preset catalogs
3. Preset-led onboarding for common jobs-to-be-done

### Longer-term options

- Dogfooding and generated-artifact safety skill
- Catalog version upgrade assistant after private catalogs foundation exists
- Usage analytics or feedback loops to validate preset/discovery effectiveness

## Notes

- Ranking based on repository evidence only. No telemetry, issue volume, or conversion data reviewed.
- Quick-win items likely compound together and may be worth bundling into one user-facing discovery/onboarding initiative.
- Contributor/agent skill opportunities added from a repo-local Pi audit on 2026-06-30; they target maintainer workflow quality rather than end-user product surface.
