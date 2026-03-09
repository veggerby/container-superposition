# opencode Overlay

Adds the `opencode` AI coding agent for terminal-based development assistance.

## Features

- **opencode CLI** — Multi-provider AI coding agent for the terminal
- **Provider flexibility** — Supports multiple AI providers (OpenAI, Anthropic, Google, and more)

## What is opencode?

opencode is an open-source, terminal-based AI coding agent that supports multiple AI providers:

- **Multi-provider** — Choose from OpenAI, Anthropic, Google Gemini, and other providers
- **Code generation** — Generate new code from natural language descriptions
- **Codebase context** — Understands your project structure
- **Agentic tasks** — Execute multi-step coding tasks autonomously

## How It Works

This overlay installs `opencode-ai` globally via npm, making the `opencode` command available in your devcontainer.

## Common Commands

```bash
# Start an interactive session
opencode

# Check version
opencode --version
```

## Use Cases

- **Flexible AI assistant** — Switch between AI providers as needed
- **Open-source first** — Works with self-hosted models via compatible APIs
- **Spec-Driven Development** — Works with `spec-kit` overlay via `specify init --ai opencode`

**Integrates well with:**

- `spec-kit` — Use opencode with the SDD workflow
- `nodejs` — Required for installation
- `git-helpers` — Git integration for AI-generated code

## Configuration

Configure your AI provider API key:

```bash
# For OpenAI
export OPENAI_API_KEY=your-key

# For Anthropic
export ANTHROPIC_API_KEY=your-key

# For Google Gemini
export GEMINI_API_KEY=your-key
```

## Verification

```bash
bash .devcontainer/verify-opencode.sh
```

## References

- [opencode Website](https://opencode.ai)
- [opencode GitHub](https://github.com/sst/opencode)

**Related Overlays:**

- `spec-kit` — Spec-Driven Development with opencode as the AI agent
- `codex` — OpenAI Codex CLI (alternative AI assistant)
- `claude-code` — Anthropic Claude Code (alternative AI assistant)
- `nodejs` — Required for npm-based installation
