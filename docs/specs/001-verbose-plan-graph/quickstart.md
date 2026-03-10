# Quickstart: Verbose Plan Graph

## Goal

Validate that the `plan` command can explain dependency inclusion reasons for both direct overlay selection and existing manifest workflows without changing its default concise behavior.

## Prerequisites

- Repository dependencies installed
- Working tree on branch `001-verbose-plan-graph`

## Validation Steps

1. Run the existing concise plan and confirm no narration appears:

```bash
npm run init -- plan --stack compose --overlays grafana
```

Expected result:

- Standard plan summary appears
- `Auto-Added Dependencies` includes `prometheus`
- No dependency narration section is shown

2. Run the verbose text plan for a direct dependency:

```bash
npm run init -- plan --stack compose --overlays grafana --verbose
```

Expected result:

- Standard summary still appears
- A dependency narration section explains:
    - `grafana` was selected directly
    - `prometheus` was included because `grafana` requires it

3. Run the verbose JSON plan and inspect explanation data:

```bash
npm run init -- plan --stack compose --overlays grafana --json --verbose
```

Expected result:

- JSON remains valid
- Standard plan fields are still present
- Structured explanation data identifies direct vs dependency-driven inclusions

4. Run the verbose plan from an existing manifest:

```bash
npm run init -- --from-manifest .devcontainer/superposition.json --no-interactive
npm run init -- plan --from-manifest .devcontainer/superposition.json --verbose
```

Expected result:

- The plan loads overlays from the manifest without re-entering them manually
- The verbose explanation treats manifest-defined overlays as the explicit root set
- Auto-added dependencies are still explained separately from manifest-defined overlays

5. Run the automated regression suite:

```bash
npm test
npm run lint
```

Expected result:

- Updated command tests pass
- TypeScript and formatting checks pass

## Manual Edge Checks

- Multi-parent dependency case: choose overlays that share a required dependency and confirm the dependency appears once with multiple reasons.
- Stack-incompatible case: run a compose-only overlay against `--stack plain` with `--verbose` and confirm the skip reason and dependency path are shown.
- Manifest case: run a verbose plan from an existing `superposition.json` and confirm the explanation covers both manifest-defined overlays and auto-added dependencies.
- Conflict case: run a known conflicting pair with `--verbose` and confirm the failure context explains why the command cannot proceed.

## Validation Log

Validated on 2026-03-10:

- `npm run init -- plan --stack compose --overlays grafana`
    - Confirmed the concise plan output remains unchanged and still auto-adds `prometheus`
- `npm run init -- plan --stack compose --overlays grafana --verbose`
    - Confirmed verbose output adds a `Dependency Resolution` section with direct-selection and required-dependency reasons
- `npm run init -- plan --stack compose --overlays grafana --json --verbose`
    - Confirmed JSON output remains valid and adds a `verbose` object with inclusion reasons and summary counts
- `npm run init -- plan --from-manifest .devcontainer/superposition.json --verbose`
    - Confirmed manifest-driven verbose output treats manifest overlays as the root set and still explains manifest-triggered dependencies like `codex -> nodejs`
- `npm run init -- plan --from-manifest .devcontainer/superposition.json --json --verbose`
    - Confirmed JSON output records `inputMode: "manifest"` and marks manifest-defined overlays with `selectionSource: "manifest"`
- `npm run init -- plan --stack compose --overlays docker-in-docker,docker-sock --verbose`
    - Confirmed verbose output adds `Resolution Notes` for the conflict boundary before the command exits with the existing conflict failure
- `npm run init -- plan --stack plain --overlays grafana --verbose`
    - Confirmed verbose output reports stack-incompatible skip reasons for both `grafana` and its required dependency `prometheus`
- `npm test -- tool/__tests__/commands.test.ts`
    - Passed after adding verbose coverage for direct, transitive, multi-parent, conflict, and invalid-selection behavior
- `npm test`
    - Passed across the full Vitest suite after the verbose plan changes and documentation updates
- `npm run lint`
    - Passed after formatting the remaining repository files that were part of the active verification surface
