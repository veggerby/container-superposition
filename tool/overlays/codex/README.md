# Codex Overlay

Adds pnpm package manager and mounts the `.codex` folder from your home directory for persistent Codex configurations.

## What's Included

- **pnpm** - Fast, disk space efficient package manager
- **Home .codex mount** - Mounts `~/.codex` from host to container

## Environment Variables

- `CODEX_HOME` - Points to `/home/vscode/.codex`

## Usage

The `.codex` folder from your host machine will be available in the container, allowing you to share Codex configurations across multiple devcontainers.

```bash
# Use pnpm in your project
pnpm install
pnpm run dev
```

## Mounted Folders

- Host: `~/.codex` → Container: `/home/vscode/.codex`
