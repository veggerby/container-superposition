# Dev Container CLI Overlay

Installs the [official devcontainer CLI](https://github.com/devcontainers/cli) (`@devcontainers/cli`) for building, running, and testing devcontainer configurations from the command line.

Useful for projects that generate or verify devcontainer configurations programmatically — including container-superposition itself.

## Features

- **`devcontainer` CLI** — Build, run, and test devcontainer configurations from the command line
- **Node.js LTS** — Required runtime (included if not already present)
- **VS Code Extension:** Dev Containers (ms-vscode-remote.remote-containers)

## How It Works

The setup script installs `@devcontainers/cli` as a global npm package. Node.js LTS is included via a devcontainer feature if not already available in the environment.

## Common Commands

```bash
# Build a devcontainer image
devcontainer build --workspace-folder .

# Start a devcontainer
devcontainer up --workspace-folder .

# Run a command inside the devcontainer
devcontainer exec --workspace-folder . -- bash -c "echo hello"

# Check the CLI version
devcontainer --version
```

## Use Cases

- **CI/CD validation** — Build and test devcontainer configurations in pipelines
- **Container-superposition development** — Verify generated `.devcontainer/` outputs actually build
- **Toolchain testing** — Ensure devcontainer features and overlays compose correctly

## Requires Docker

The devcontainer CLI needs a Docker daemon to build containers. Pair with one of:

- [`docker-sock`](../docker-sock/README.md) — bind-mount host Docker socket (simpler, works everywhere)
- [`docker-in-docker`](../docker-in-docker/README.md) — isolated Docker daemon (better for nested containers)

## References

- [devcontainers/cli on GitHub](https://github.com/devcontainers/cli)
- [Dev Containers specification](https://containers.dev/)
- [devcontainer CLI npm package](https://www.npmjs.com/package/@devcontainers/cli)
