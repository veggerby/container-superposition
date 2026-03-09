# Windsurf CLI Overlay

Adds the Codeium Windsurf CLI (`windsurf`) for AI-powered development assistance in the terminal.

## Features

- **Windsurf CLI** — Codeium's AI coding agent for terminal use
- **Cascade flows** — AI-driven multi-step development tasks

## What is Windsurf CLI?

Windsurf CLI is Codeium's headless agentic coding assistant that brings the power of the Windsurf IDE agent to the command line:

- **Agentic coding** — Autonomous multi-step task execution
- **Codebase understanding** — Deep indexing of your repository
- **Code generation** — Create features from natural language
- **Refactoring** — Improve existing code with AI guidance

## How It Works

This overlay installs the Windsurf CLI globally via npm, making the `windsurf` command available in your devcontainer.

## Common Commands

```bash
# Start an interactive session
windsurf

# Check version
windsurf --version
```

## Use Cases

- **Feature implementation** — Describe what you want, Windsurf implements it
- **Code exploration** — Understand large or complex codebases
- **Spec-Driven Development** — Works with `spec-kit` overlay via `specify init --ai windsurf`

**Integrates well with:**

- `spec-kit` — Use Windsurf with the SDD workflow
- `nodejs` — Required for installation
- `git-helpers` — Git integration for AI-generated code

## Configuration

Authenticate with your Codeium account:

```bash
windsurf auth
```

## Verification

```bash
bash .devcontainer/verify-windsurf-cli.sh
```

## References

- [Windsurf Documentation](https://docs.codeium.com/windsurf/getting-started)
- [Codeium Platform](https://codeium.com/)

**Related Overlays:**

- `spec-kit` — Spec-Driven Development with Windsurf as the AI agent
- `codex` — OpenAI Codex CLI (alternative AI assistant)
- `claude-code` — Anthropic Claude Code (alternative AI assistant)
- `nodejs` — Required for npm-based installation
