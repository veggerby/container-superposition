# Minimal Trixie Example

A lightweight dev container using Debian Trixie as the base image with the Codex AI coding agent, configured entirely via a project file (`superposition.yml`).

## What's Included

**Base Image:**

- **Debian Trixie** — Latest Debian testing release with up-to-date system packages

**Stack:**

- **Plain** — Single-container setup, no Docker Compose orchestration

**Dev Tools:**

- **Codex** — OpenAI Codex CLI for AI-powered code generation and assistance
- **Node.js** — Pulled in automatically as a Codex dependency

**Host Integration:**

- **`~/.codex` mount** — Shares your host Codex configuration with the container so API keys and settings persist across rebuilds

## Getting Started

### 1. Create the host directory

Ensure the `.codex` directory exists on your host before starting the container:

```bash
mkdir -p ~/.codex
```

### 2. Generate the devcontainer

This example uses a `superposition.yml` project file instead of a manifest. Generate the devcontainer directly:

```bash
cd examples/minimal-trixie
npx container-superposition init
```

Because the project file pre-fills all values, the interactive questionnaire is skipped entirely.

### 3. Open in VS Code

```bash
code .
```

### 4. Reopen in Container

When prompted, click **"Reopen in Container"** or press `F1` and select:

```
Dev Containers: Reopen in Container
```

## Project File

The entire configuration lives in a single `superposition.yml`:

```yaml
stack: plain
baseImage: trixie
devTools:
    - codex
customizations:
    devcontainerPatch:
        mounts:
            - source=${localEnv:HOME}${localEnv:USERPROFILE}/.codex,target=${containerEnv:HOME}/.codex,type=bind,consistency=cached
```

The `customizations.devcontainerPatch` section adds a bind mount that maps `~/.codex` from the host into the container, so your API keys and Codex configuration persist across container rebuilds.

## When to Use This

- **AI-assisted development** — Use Codex CLI inside a clean, reproducible environment
- **Lightweight tasks** — Scripting, prototyping, or documentation with AI assistance
- **Starting point** — Add overlays incrementally as your project grows

## Adding Overlays

Extend the project file to add capabilities:

```yaml
stack: plain
baseImage: trixie
language:
    - nodejs
devTools:
    - codex
    - git-helpers
customizations:
    devcontainerPatch:
        mounts:
            - source=${localEnv:HOME}${localEnv:USERPROFILE}/.codex,target=${containerEnv:HOME}/.codex,type=bind,consistency=cached
```

Then regenerate:

```bash
npx container-superposition init
```
