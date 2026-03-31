# Kitchen Sink Example

A comprehensive project file that exercises every configuration option supported by `superposition.yml`. Use this as a reference when building your own project files.

## What's Included

**Base Configuration:**

- **Debian Trixie** base image
- **Docker Compose** stack with full service orchestration
- **Port offset 100** — all service ports shifted by +100
- **Local** deployment target
- **VS Code** editor profile
- Named container: `kitchen-sink`

**Preset (web-api) with Parameter Choices:**

- **Language**: Node.js
- **Database**: PostgreSQL (from preset) + MongoDB (additional)
- **Cache**: Redis
- **Broker**: NATS
- **Observability**: Full stack (OpenTelemetry Collector, Prometheus, Grafana, Loki)

**Additional Overlays:**

- **AWS CLI** — Cloud tooling
- **Codex** — AI coding agent with `~/.codex` host mount
- **git-helpers** — Git productivity tools
- **modern-cli-tools** — bat, fd, ripgrep, fzf
- **Playwright** — Browser automation and testing

**Customizations:**

- Bind mount for `~/.codex` from host
- First-class project `env` variables plus custom `.env.example` variables
- Docker Compose labels on the app service
- `postCreate` and `postStart` lifecycle scripts
- Generated `notes.md` file inside `.devcontainer/custom/`

## Project File Fields Reference

| Field            | Value                            | Purpose                               |
| ---------------- | -------------------------------- | ------------------------------------- |
| `stack`          | `compose`                        | Docker Compose orchestration          |
| `baseImage`      | `trixie`                         | Debian Trixie base                    |
| `containerName`  | `kitchen-sink`                   | Dev container display name            |
| `preset`         | `web-api`                        | Start from the Web API preset         |
| `presetChoices`  | `language: nodejs`, etc.         | Pre-fill preset parameter prompts     |
| `overlays`       | `[mongodb, aws-cli, codex, ...]` | Additional overlays beyond the preset |
| `portOffset`     | `100`                            | Shift all ports by +100               |
| `target`         | `local`                          | Deployment target                     |
| `minimal`        | `false`                          | Include optional overlays             |
| `editor`         | `vscode`                         | VS Code customizations                |
| `env`            | `APP_NAME`, `API_BASE_URL`, ...  | Project-level env routed by stack     |
| `customizations` | _(see below)_                    | Patches, env, scripts, files          |

### Environment Breakdown

- **`env`** — First-class environment variables for the devcontainer itself
- `stack: plain` writes them to `devcontainer.json -> remoteEnv`
- `stack: compose` materializes them into `.devcontainer/.env`, writes `docker-compose.yml -> services.devcontainer.environment` as `${KEY}`, and exposes them in `devcontainer.json` via `${containerEnv:KEY}`
- Compose values like `${API_BASE_URL}` can be sourced from the project root `.env`; generation resolves them into `.devcontainer/.env` for Docker Compose expansion

### Customizations Breakdown

- **`devcontainerPatch`** — Merged into `devcontainer.json` (mounts, remoteEnv, etc.)
- **`dockerComposePatch`** — Merged into `docker-compose.yml` (labels, extra config)
- **`envTemplate`** — Added to `.env.example` (template values for user-managed `.env`)
- **`scripts.postCreate`** — Shell commands run after container creation
- **`scripts.postStart`** — Shell commands run on each container start
- **`files`** — Extra files written to `.devcontainer/custom/`

## Getting Started

### 1. Create the host directory for Codex

```bash
mkdir -p ~/.codex
```

### 2. Generate the devcontainer

```bash
cd examples/kitchen-sink
npx container-superposition init
```

### 3. Open in VS Code and reopen in container

```bash
code .
```

Press `F1` → **Dev Containers: Reopen in Container**

### 4. Verify services

```bash
docker-compose ps
```

All services run on offset ports (e.g., PostgreSQL on 5532 instead of 5432).

## When to Use This

- **Reference** — See how every project file field works together
- **Copy-paste starting point** — Strip out what you don't need
- **Testing** — Validate that all project file features work end-to-end
