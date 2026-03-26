# Deployment Target Support

Container Superposition generates workspace artifacts and setup guidance tailored to the
selected deployment environment using the `--target` flag.

## Quick Start

```bash
# Default — local development (no additional files)
npx container-superposition init --stack compose --language nodejs

# GitHub Codespaces (adds hostRequirements + CODESPACES.md)
npx container-superposition init --target codespaces

# Gitpod (adds .gitpod.yml + GITPOD.md)
npx container-superposition init --target gitpod

# DevPod (adds devpod.yaml + DEVPOD.md)
npx container-superposition init --target devpod

# Full example for Codespaces
npx container-superposition init \
    --stack compose \
    --language nodejs \
    --database postgres \
    --dev-tools docker-in-docker \
    --target codespaces
```

## Supported Deployment Targets

| Target         | Description                       | Docker Support | Auto Port Forward | Extra Artifacts                                          |
| -------------- | --------------------------------- | -------------- | ----------------- | -------------------------------------------------------- |
| **local**      | Local machine with Docker Desktop | ✅ Host Docker | No                | None (current behavior)                                  |
| **codespaces** | GitHub Codespaces (cloud IDE)     | ⚠️ DinD only   | Yes               | `hostRequirements` in devcontainer.json; `CODESPACES.md` |
| **gitpod**     | Gitpod workspaces                 | ⚠️ DinD only   | Yes               | `.gitpod.yml` at project root; `GITPOD.md`               |
| **devpod**     | DevPod client-only environments   | ✅ Host Docker | No                | `devpod.yaml` at project root; `DEVPOD.md`               |

## Target-Specific Artifact Inventory

### `--target codespaces`

| File                | Location         | Purpose                                                                           |
| ------------------- | ---------------- | --------------------------------------------------------------------------------- |
| `devcontainer.json` | `.devcontainer/` | Extended with `hostRequirements` (cpu/memory/storage recommendation)              |
| `CODESPACES.md`     | `.devcontainer/` | How to open the repo in a Codespace; machine-type guidance; port forwarding notes |

**Machine size recommendation** is determined automatically from the overlays selected:

- 0–1 service overlays → 2-core (default)
- 2–3 service overlays → 4-core recommended
- 4+ service overlays → 8-core recommended

### `--target gitpod`

| File          | Location         | Purpose                                                                             |
| ------------- | ---------------- | ----------------------------------------------------------------------------------- |
| `.gitpod.yml` | **Project root** | Gitpod workspace config; references devcontainer; declares tasks and port exposures |
| `GITPOD.md`   | `.devcontainer/` | One-click open badge; Gitpod-specific usage notes                                   |

### `--target devpod`

| File          | Location         | Purpose                                              |
| ------------- | ---------------- | ---------------------------------------------------- |
| `devpod.yaml` | **Project root** | DevPod workspace descriptor; references devcontainer |
| `DEVPOD.md`   | `.devcontainer/` | `devpod up` instructions; provider examples          |

### `--target local` / no `--target`

No additional files are written. Output is identical to the current local-first workflow.

## How It Works

### Interactive Mode

If you select overlays that may not work in a cloud environment (e.g. `docker-sock`), the tool
prompts you to choose a target so it can warn about incompatibilities:

```
⚠️  Deployment Target Compatibility Check:

Some selected overlays may not work in all environments.

• Docker (host socket)
  Not compatible with: GitHub Codespaces, Gitpod
  Alternatives: Docker-in-Docker

Which environment are you targeting?
❯ 🖥️  Local Development (Docker Desktop)
  ☁️  GitHub Codespaces
  🌐 Gitpod
  📦 DevPod
```

After you confirm the target, the generator produces the appropriate workspace artifacts
alongside the standard `.devcontainer/` output.

### CLI Mode

Pass `--target` directly — the target is applied without interactive prompts:

```bash
npx container-superposition init \
    --stack compose \
    --language nodejs \
    --dev-tools docker-in-docker \
    --target gitpod
```

### Regeneration

The selected target is saved in `superposition.json` as the `target` field. Regeneration
re-produces the correct artifacts automatically without re-prompting:

```bash
# superposition.json contains "target": "gitpod"
npx container-superposition regen   # → .gitpod.yml and GITPOD.md reproduced
```

To switch target on regeneration, pass `--target` explicitly:

```bash
npx container-superposition regen --target codespaces
```

Stale artifacts from the previous target (e.g. `.gitpod.yml`) are **removed automatically**
before the new target's artifacts are written.

## Key Compatibility Rules

- ⚠️ **docker-sock** requires host Docker → Use in `local` or `devpod` only
- ✅ **docker-in-docker** works everywhere → Recommended for `codespaces` and `gitpod`
- 🔄 Cloud targets auto-forward ports → No manual port forwarding needed

## Environment Differences

### Codespaces / Gitpod

- **No access to host Docker daemon** — Must use docker-in-docker
- **Auto-forward ports** — Ports declared in devcontainer.json are automatically accessible
- **Cloud-based** — Resources may be constrained; machine size matters

### Local

- **Full access to host Docker** — Can use docker-sock for better performance
- **Faster builds** — Shared cache with host
- **Manual port forwarding** — Expose ports explicitly when needed

### DevPod

- **Client-managed** — Runs on your infrastructure (local Docker, cloud VM, etc.)
- **Can access host Docker** — Depending on provider configuration
- **Flexible** — Provider chosen at `devpod up` time, not at generation time

## Configuration

Deployment target configurations (compatibility rules, port forwarding defaults) are stored in
`overlays/.registry/deployment-targets.yml`. To add a new target entry:

```yaml
- id: new-target
  name: New Target
  description: Description of the target
  incompatibleOverlays:
      - docker-sock
  recommendations:
      docker-sock:
          - docker-in-docker
  portForwarding:
      defaultBehavior: notify
      autoForward: true
  constraints:
      hasHostDocker: false
      supportsPrivileged: true
```

Target-specific file generation rules are implemented in `tool/schema/target-rules.ts`.

## See Also

- [Discovery Commands](discovery-commands.md) - Explore overlays before generating
- [Overlays Documentation](overlays.md) - Complete overlay reference
