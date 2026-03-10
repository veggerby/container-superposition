# Quickstart: Verbose Plan Graph

## Goal

Validate that the `plan` command can explain dependency inclusion reasons without changing its default concise behavior.

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

4. Run the automated regression suite:

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
- Conflict case: run a known conflicting pair with `--verbose` and confirm the failure context explains why the command cannot proceed.

## Validation Log

Validated on 2026-03-10:

- `npm run init -- plan --stack compose --overlays grafana`
    - Confirmed the concise plan output remains unchanged and still auto-adds `prometheus`
- `npm run init -- plan --stack compose --overlays grafana --verbose`
    - Confirmed verbose output adds a `Dependency Resolution` section with direct-selection and required-dependency reasons
- `npm run init -- plan --stack compose --overlays grafana --json --verbose`
    - Confirmed JSON output remains valid and adds a `verbose` object with inclusion reasons and summary counts
- `npm run init -- plan --stack compose --overlays docker-in-docker,docker-sock --verbose`
    - Confirmed verbose output adds `Resolution Notes` for the conflict boundary before the command exits with the existing conflict failure
- `npm run init -- plan --stack plain --overlays grafana --verbose`
    - Confirmed verbose output reports stack-incompatible skip reasons for both `grafana` and its required dependency `prometheus`
- `npm test -- tool/__tests__/commands.test.ts`
    - Passed after adding verbose coverage for direct, transitive, multi-parent, conflict, and invalid-selection behavior
- `npm run lint`
    - `tsc --noEmit` completed, but `prettier --check` still reports unrelated pre-existing formatting issues elsewhere in the repository
