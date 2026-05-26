# Pi Overlay

Adds the [Pi](https://pi.dev) terminal coding agent (`pi`) — a minimal, open-source, self-extensible AI coding harness that lets you use LLMs directly in your terminal to read, write, edit, and run code.

## What is Pi?

Pi is a deliberately minimal terminal coding agent. Unlike heavier AI coding tools, Pi keeps its core tiny and pushes everything extra (MCP, sub-agents, themes, prompt templates) to a TypeScript extension and package system. It supports a wide range of LLM providers, including Anthropic Claude, OpenAI GPT, Google Gemini, DeepSeek, Mistral, Groq, and many more.

## Features

- **Interactive TUI** — Four-panel terminal UI with file reference (`@`), inline shell commands (`!cmd`), and message queueing
- **Multi-provider LLM support** — Anthropic, OpenAI, Google Gemini, DeepSeek, Mistral, Groq, xAI, OpenRouter, Azure OpenAI, Amazon Bedrock, GitHub Copilot, and more
- **Built-in tools** — `read`, `write`, `edit`, `bash`, `grep`, `find`, `ls`
- **Session management** — Auto-saved sessions with branching, forking, compaction, and resumption
- **Non-interactive mode** — `pi -p "prompt"` for scripted use or CI pipelines
- **Extensible** — TypeScript extensions, Skills (SKILL.md), prompt templates, and pi packages

## Installation

This overlay installs Pi via npm (`@earendil-works/pi-coding-agent`), which is the same package installed by the official installer at [pi.dev/install.sh](https://pi.dev/install.sh).

## How It Works

This overlay installs `@earendil-works/pi-coding-agent` globally via npm, making the `pi` command available in your devcontainer.

## Common Commands

```bash
# Start an interactive session in the current project
pi

# One-shot non-interactive prompt
pi -p "Summarize this codebase"

# Pipe content to Pi
cat README.md | pi -p "Summarize this"

# Resume the last session
pi /resume

# Check version
pi --version
```

## Use Cases

- **Terminal-first coding assistant** — Use Pi interactively while editing and debugging from the CLI
- **Automated one-shot tasks** — Run `pi -p "..."` in scripts or CI pipelines
- **Multi-provider flexibility** — Switch between Anthropic, OpenAI, Gemini, and other supported providers

## Authentication

Set one or more provider API keys as environment variables:

```bash
# Anthropic Claude
export ANTHROPIC_API_KEY=sk-ant-...

# OpenAI
export OPENAI_API_KEY=sk-...

# Google Gemini
export GEMINI_API_KEY=...
```

Alternatively, use the interactive login command inside Pi:

```bash
/login
```

## Configuration

Settings are stored in `~/.pi/agent/settings.json` (global) or `.pi/settings.json` (project-local):

```json
{
    "defaultProvider": "anthropic",
    "defaultModel": "claude-sonnet-4-20250514",
    "compaction": { "enabled": true }
}
```

| Environment Variable    | Description                                        |
| ----------------------- | -------------------------------------------------- |
| `ANTHROPIC_API_KEY`     | Anthropic Claude API key                           |
| `OPENAI_API_KEY`        | OpenAI API key                                     |
| `GEMINI_API_KEY`        | Google Gemini API key                              |
| `PI_OFFLINE`            | Disable startup network operations                 |
| `PI_SKIP_VERSION_CHECK` | Skip automatic version update check                |
| `PI_CODING_AGENT_DIR`   | Override config directory (default: `~/.pi/agent`) |

## Verification

```bash
bash .devcontainer/scripts/verify-pi.sh
```

## Usage

### Interactive session

Run `pi` in any project directory to start an interactive TUI session. Use `@` to reference files, `!cmd` to run a shell command and send its output to the LLM, and `/help` to list available slash commands.

### Non-interactive / CI mode

```bash
# Print response and exit
pi -p "What tests should I write for this function?"

# Output all events as JSONL (for scripting or piping)
pi --mode json -p "List TODOs in this repo"
```

### Extending Pi

Pi supports TypeScript extensions, Skills, and npm/git packages:

```bash
# Install a pi package
pi install <package-name>

# List installed packages
pi /packages
```

## References

- [Pi Website](https://pi.dev)
- [GitHub Repository](https://github.com/earendil-works/pi)
- [Usage Documentation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/usage.md)
- [Provider Documentation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/providers.md)
- [Extensions Documentation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md)

**Related Overlays:**

- `nodejs` — Required for npm-based installation
- `claude-code` — Anthropic Claude Code CLI (alternative AI assistant)
- `codex` — OpenAI Codex CLI (alternative AI assistant)
- `gemini-cli` — Google Gemini CLI (alternative AI assistant)
- `opencode` — opencode AI coding agent (alternative)
