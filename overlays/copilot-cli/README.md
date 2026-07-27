# GitHub Copilot CLI

This overlay installs the official GitHub Copilot CLI in your devcontainer so you can use Copilot from the terminal for interactive coding, scripting, and repository-aware assistance without adding any sidecar services.

## Services

| Service | Port | Description                                         |
| ------- | ---- | --------------------------------------------------- |
| None    | —    | Installs terminal tooling only; no sidecar services |

## Configuration

| Parameter             | Default  | Description                               |
| --------------------- | -------- | ----------------------------------------- |
| `COPILOT_CLI_VERSION` | `latest` | GitHub Copilot CLI npm version to install |

## Connection

Authenticate after container creation with either browser login or a token environment variable:

```bash
copilot login
# or
export COPILOT_GITHUB_TOKEN=github_pat_...
```

GitHub Copilot CLI also checks `GH_TOKEN` and `GITHUB_TOKEN`. Classic `ghp_` personal access tokens are not supported.

## Usage

```bash
copilot
copilot --help
copilot -p "summarize this repository"
```

Verification:

```bash
bash .devcontainer/scripts/verify-copilot-cli.sh
```

The overlay requires the `nodejs` overlay and creates `~/.copilot` for local Copilot CLI state if file-based auth fallback is needed.
