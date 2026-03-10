# Contract: Plan Verbose Output

## Scope

This contract defines the user-visible behavior of the `plan` command when `--verbose` is requested. It covers terminal output and structured JSON output for the normal planning path.

## Command Surface

### New Option

- `--verbose`: Include dependency-resolution narration that explains why each overlay appears in the final plan.

### Compatibility Rules

- `plan` without `--verbose` keeps the existing concise output contract.
- `plan --json --verbose` returns the standard plan data plus structured explanation data.
- `plan --diff` remains a separate mode; verbose planning must not silently change diff semantics.

## Text Output Contract

When `--verbose` is present and the command completes normal planning:

1. The standard summary remains visible:
   - stack
   - overlays selected
   - auto-added dependencies
   - conflicts, if any
   - port mappings
   - files to create/modify
2. A dedicated explanation section appears after the overlay summary.
3. The explanation section must:
   - identify each included overlay exactly once
   - state whether it was selected directly or added automatically
   - name the parent overlay or overlays that required it
   - show transitive chains in request-to-dependency order
   - call out failure boundaries when conflicts or invalid selections prevent successful completion

### Example Shape

```text
Dependency Resolution:
  nodejs
    selected directly by the user
  grafana
    selected directly by the user
  prometheus
    required by grafana
    path: grafana -> prometheus
```

The wording may vary, but the content requirements above are mandatory.

## JSON Output Contract

When `--json --verbose` is present, the result must include:

- the existing standard plan fields
- an additional explanation payload that:
  - lists each included overlay once
  - distinguishes direct selections from dependency-driven inclusions
  - records one or more parent reasons for dependencies with shared ancestry
  - includes ordered dependency paths for transitive inclusions
  - optionally records failure context when planning cannot complete normally

### Minimum Field Expectations

The verbose payload must support these questions without requiring text parsing:

- Was this overlay selected by the user or added automatically?
- Which overlay or overlays caused this inclusion?
- What dependency path led to this overlay?
- Did resolution stop or skip anything, and why?

## Error and Failure Contract

- Unknown overlay IDs remain hard failures.
- Conflicts remain visible in both concise and verbose modes.
- Verbose mode adds context about the dependency path and failure boundary; it does not suppress or soften existing error behavior.

## Documentation Contract

The command reference and examples must show:

- one direct-selection example
- one auto-added dependency example
- one transitive or multi-parent explanation example
- one note confirming that default `plan` output stays concise without `--verbose`
