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
- Conflict case: run a known conflicting pair with `--verbose` and confirm the failure context explains why the command cannot proceed.
