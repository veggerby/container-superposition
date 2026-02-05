# Codex Overlay

Adds pnpm package manager with a persistent `.codex` folder for configurations.

## What's Included

- **pnpm** - Fast, disk space efficient package manager
- **Codex directory** - Creates `/home/vscode/.codex` for persistent configurations

## Environment Variables

- `CODEX_HOME` - Points to `/home/vscode/.codex`

## Usage

The `.codex` folder is created in the container during setup.

```bash
# Use pnpm in your project
pnpm install
pnpm run dev
```

## Optional: Persistent .codex Mount

To share your `.codex` configurations between your host and container, first create the directory on your host:

```bash
mkdir -p ~/.codex
```

Then add this mount to your `devcontainer.json`:

```json
"mounts": [
  "source=${localEnv:HOME}${localEnv:USERPROFILE}/.codex,target=/home/vscode/.codex,type=bind,consistency=cached"
]
```

This allows you to share Codex configurations across multiple devcontainers and persist them on your host machine.

**Important**: Only add this mount after creating the `~/.codex` directory on your host. Otherwise, the container may fail to start.
