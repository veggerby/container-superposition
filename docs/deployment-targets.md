# Deployment Target Support

Container Superposition generates workspace artifacts and setup guidance tailored to the
selected deployment environment using the `--target` flag.

## Quick Start

Set the deployment target in the canonical shared project file alongside the flat overlay
selection. `plan` can preview the stack and overlays, but it does not accept `target:` and
therefore does not preview target-specific artifacts. Review the project file, preview the
selection, then write it:

```yaml
# superposition.yml
stack: compose
target: codespaces
overlays:
    - nodejs
    - postgres
    - docker-in-docker
```

```bash
npx container-superposition plan --stack compose --overlays nodejs,postgres,docker-in-docker
npx container-superposition init --no-interactive
```

Use `target: local`, `codespaces`, `gitpod`, or `devpod` in `superposition.yml`. A
preset may be a shortcut for choosing overlays, but the project file remains the shared
regeneration authority.

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

For unattended CLI use, put the target in the project file; `init --no-interactive` applies
it without prompts. The preview still covers only the stack and overlays:

```yaml
# superposition.yml
stack: compose
target: gitpod
overlays:
    - nodejs
    - docker-in-docker
```

```bash
npx container-superposition plan --stack compose --overlays nodejs,docker-in-docker
npx container-superposition init --no-interactive
```

### Regeneration

The selected target is stored in `superposition.yml` as the canonical shared intent.
`superposition.json` may record it as a generated compatibility/audit receipt. Regeneration
reproduces the correct artifacts without re-prompting:

```bash
# superposition.yml contains: target: gitpod
npx container-superposition regen   # → .gitpod.yml and GITPOD.md reproduced
```

To switch targets, edit `target:` in `superposition.yml`, review that target change, preview
the corresponding flat overlay selection with `plan`, then run `regen`. `plan` does not
accept a target input, so it cannot preview target-specific artifacts.

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
