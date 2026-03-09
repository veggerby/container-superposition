# Amp Overlay

Adds the Sourcegraph Amp CLI (`amp`) for AI-powered code generation and development assistance.

## Features

- **Amp CLI** — Sourcegraph's AI coding agent for the terminal
- **Codebase-aware** — Understands your entire repository context

## What is Amp?

Amp is Sourcegraph's AI coding agent that works directly in your terminal with deep codebase understanding:

- **Code generation** — Generate new features from natural language
- **Codebase context** — Indexed understanding of your entire codebase
- **Multi-file edits** — Make consistent changes across the project
- **Task execution** — Autonomous multi-step development tasks

## How It Works

This overlay installs `@sourcegraph/amp` globally via npm, making the `amp` command available in your devcontainer.

## Common Commands

```bash
# Start an interactive session
amp

# Check version
amp --version
```

## Use Cases

- **Feature development** — Describe features, Amp implements them across the codebase
- **Large refactors** — Make consistent changes across many files
- **Code review** — AI-assisted code analysis
- **Spec-Driven Development** — Works with `spec-kit` overlay via `specify init --ai amp`

**Integrates well with:**

- `spec-kit` — Use Amp with the SDD workflow
- `nodejs` — Required for installation
- `git-helpers` — Git integration for AI-generated code

## Configuration

Authenticate with your Sourcegraph account:

```bash
amp auth
```

## Verification

```bash
bash .devcontainer/scripts/verify-amp.sh
```

## References

- [Amp by Sourcegraph](https://sourcegraph.com/amp)
- [Sourcegraph Platform](https://sourcegraph.com/)

**Related Overlays:**

- `spec-kit` — Spec-Driven Development with Amp as the AI agent
- `codex` — OpenAI Codex CLI (alternative AI assistant)
- `claude-code` — Anthropic Claude Code (alternative AI assistant)
- `nodejs` — Required for npm-based installation
