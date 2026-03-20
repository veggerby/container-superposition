# Doctor Fix Demo

This example demonstrates the `doctor --fix` auto-repair flow against a deliberately broken configuration.

The `superposition.json` in this directory is a **legacy manifest** (uses the old `version` field instead
of `manifestVersion`, and has no `generatedBy` field). The `.devcontainer/` directory and
`devcontainer.json` are intentionally absent.

Running `doctor --fix` against this directory hits **two auto-fixable issue classes** in the correct
prerequisite order:

| #   | Issue class                 | Trigger in this example                      | Outcome                                                  |
| --- | --------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| 1   | Stale legacy manifest       | `version` field instead of `manifestVersion` | `fixed` — migrated to current schema                     |
| 2   | Missing generated artifacts | No `devcontainer.json` present               | `fixed` — regenerated from manifest                      |
| 3   | Unsupported Node.js runtime | Only triggered if running Node < 20          | `fixed` (with nvm/fnm/volta) or `requires manual action` |
| 4   | Docker daemon inaccessible  | Only triggered if Docker is not running      | `requires manual action` — platform steps shown          |

---

## Try it yourself

### 1. Run plain diagnostics first (no changes made)

```bash
cd examples/doctor-fix-demo
npx container-superposition doctor --from-manifest superposition.json
```

Expected output:

```
⚠ Manifest version: Legacy format (tool 0.1.0)
  → Manifest is using legacy format
  → Current manifest version: 1
  → Manifest will be automatically migrated on next regeneration
  → Fixable with --fix flag
✗ DevContainer config: devcontainer.json not found
  → Devcontainer configuration file is missing or corrupted
  → Fixable with --fix flag

Summary:
  ✓ N passed
  ⚠ 1 warnings
  ✗ 1 errors
  ℹ 2 fixable issues
  Run with --fix to apply automatic fixes where possible.
```

You can also point at the manifest using its full path from any working directory:

```bash
npx container-superposition doctor --from-manifest ./examples/doctor-fix-demo/superposition.json
```

### 2. Apply all automatic fixes

```bash
npx container-superposition doctor --from-manifest superposition.json --fix
```

Expected output:

```
  → Planning fix for: Manifest version
    · Migrate superposition.json to current schema version
    · Create timestamped backup of the original manifest

  → Planning fix for: DevContainer config
    · Regenerate devcontainer.json from superposition.json
    · Create backup of existing .devcontainer/ files

Remediation Summary:
  ✓ Manifest version: fixed
    Reason: Manifest migrated to current schema version
    Changed: ./superposition.json
    Backup:  ./superposition.json.backup-<timestamp>

  ✓ DevContainer config: fixed
    Reason: devcontainer.json regenerated from superposition.json
    Changed: ./devcontainer.json

Fix Run Result:
  ✓ 2 fixed

  Exit status: success
```

After the fix run, the directory will contain:

```
examples/doctor-fix-demo/
├── superposition.json          ← migrated (manifestVersion: "1", generatedBy: "<version>")
├── superposition.json.backup-<timestamp>  ← backup of original legacy manifest
└── devcontainer.json           ← regenerated from manifest
```

### 3. Machine-readable output for CI

```bash
npx container-superposition doctor --from-manifest superposition.json --fix --json
```

The JSON response includes the full `FixRun` structure:

```json
{
    "outputPath": ".",
    "requestedJson": true,
    "initialFindings": [
        {
            "id": "manifest-version",
            "category": "manifest",
            "name": "Manifest version",
            "status": "warn",
            "fixEligibility": "automatic",
            "remediationKey": "manifest-migration"
        },
        {
            "id": "devcontainer-config",
            "category": "manifest",
            "name": "DevContainer config",
            "status": "fail",
            "fixEligibility": "automatic",
            "remediationKey": "devcontainer-regeneration"
        }
    ],
    "executions": [
        {
            "remediationKey": "manifest-migration",
            "attempted": true,
            "outcome": "fixed",
            "changedFiles": ["./superposition.json"],
            "backupPath": "./superposition.json.backup-<timestamp>",
            "rechecked": true
        },
        {
            "remediationKey": "devcontainer-regeneration",
            "attempted": true,
            "outcome": "fixed",
            "changedFiles": ["./devcontainer.json"],
            "rechecked": true
        }
    ],
    "summary": {
        "fixed": 2,
        "alreadyCompliant": 0,
        "skipped": 0,
        "requiresManualAction": 0,
        "total": 2
    },
    "exitDisposition": "success"
}
```

### 4. Node.js version fix (Class 3)

If your active Node.js version is below 20, `doctor` will report it as a `fail`.
When a version manager (`nvm`, `fnm`, or `volta`) is detected, it is automatically fixable:

```bash
# Simulate an old Node version (nvm required)
nvm use 18
npx container-superposition doctor --from-manifest superposition.json --fix
```

Expected execution:

```
  → Planning fix for: Node.js version
    · Use version manager to install and activate Node.js >= 20

Remediation Summary:
  ✓ Node.js version: fixed
    Reason: Node.js v20.x.x activated via nvm
```

If no version manager is present, the outcome is `requires manual action` with explicit
installation steps.

### 5. Docker daemon fix (Class 4)

Docker daemon issues are always `requires manual action` — the tool never silently restarts
system services. Instead it shows platform-specific next steps:

```
  ✗ Docker daemon: requires manual action
    Reason: Docker daemon repair requires manual intervention
    Manual steps:
      · Linux:   sudo systemctl start docker
      · macOS:   open -a Docker
      · Windows: Start Docker Desktop from the Start menu
```

---

## Restoring the broken state

To run the demo again after the fix has been applied:

```bash
cd examples/doctor-fix-demo

# Remove generated artifacts
rm -f devcontainer.json docker-compose.yml

# Restore the legacy manifest
cat > superposition.json <<'EOF'
{
    "version": "0.1.0",
    "generated": "2025-01-01T00:00:00.000Z",
    "baseTemplate": "plain",
    "baseImage": "bookworm",
    "overlays": ["nodejs", "git-helpers"],
    "portOffset": 0
}
EOF
```

---

## References

- [Doctor command quick reference](../../docs/quick-reference.md#doctor-command)
- [Spec: doctor --fix](../../docs/specs/004-doctor-fix/spec.md)
