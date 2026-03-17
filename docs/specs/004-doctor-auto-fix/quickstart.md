# Quickstart: Doctor Auto-Fix

## Goal

Validate that `doctor --fix` can repair supported issues safely, preserve normal `doctor` behavior without `--fix`, and produce deterministic outcomes for both terminal users and automation.

## Prerequisites

- Repository dependencies installed
- Working tree on branch `004-doctor-auto-fix`
- A shell environment where `npm test` and `npm run lint` are available

## Validation Steps

1. Run baseline diagnostics and confirm no mutation occurs:

```bash
npm run init -- doctor --output ./.devcontainer
```

Expected result:

- Standard diagnostics render
- No remediation section appears
- Existing exit behavior remains unchanged

2. Run the no-op fix path against a compliant configuration:

```bash
npm run init -- doctor --output ./.devcontainer --fix
```

Expected result:

- The command explains that no remediation was needed, or records only `already compliant` outcomes
- No project files are changed

3. Validate stale manifest repair in an isolated temp directory:

```bash
tmp_dir="$(mktemp -d)"
npm run init -- --stack plain --language nodejs --output "$tmp_dir/.devcontainer"
python3 - "$tmp_dir/.devcontainer/superposition.json" <<'PY'
import json, pathlib, sys
manifest = pathlib.Path(sys.argv[1])
data = json.loads(manifest.read_text())
data.pop("manifestVersion", None)
manifest.write_text(json.dumps(data, indent=2) + "\n")
PY
npm run init -- doctor --output "$tmp_dir/.devcontainer" --fix
```

Expected result:

- The command detects stale or legacy manifest metadata
- The manifest is migrated and any derived files are regenerated as needed
- The final summary marks the metadata issue as `fixed`

4. Validate machine-readable repair reporting:

```bash
npm run init -- doctor --output ./.devcontainer --fix --json
```

Expected result:

- Output is valid JSON
- The JSON includes remediation records and summary counts
- The final disposition distinguishes resolved vs unresolved runs

5. Validate manual fallback behavior for unsupported host repair:

```bash
npm run init -- doctor --output ./.devcontainer --fix
```

Expected result:

- If a supported host repair class lacks its required provider, the finding remains unchanged
- The final summary reports `requires manual action` with explicit guidance instead of silently failing

6. Run automated verification:

```bash
npm test
npm run lint
```

Expected result:

- Updated doctor command tests pass
- TypeScript and formatting checks pass

## Manual Edge Checks

- Mixed-result run: verify a fixable metadata issue and a manual-only host issue produce one ordered summary with different outcomes.
- Interrupted metadata repair: simulate a failing regeneration path and confirm the project is recoverable from backup without partial manifest loss.
- JSON automation run: confirm a CI consumer can tell whether the command fixed everything or left unresolved work.
- Baseline regression: confirm `doctor --json` without `--fix` stays diagnostics-only.
