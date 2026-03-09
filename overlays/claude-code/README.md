# Claude Code Overlay

Adds the Anthropic Claude Code CLI (`claude`) for AI-powered development assistance directly in the terminal.

## Features

- **Claude Code CLI** — Interactive AI coding assistant from Anthropic
- **Terminal-first workflow** — Agentic coding directly from the command line

## What is Claude Code?

Claude Code is Anthropic's agentic coding tool that lives in the terminal. It understands your codebase and helps you code faster through natural conversation and autonomous task execution:

- **Code generation** — Generate new features and components
- **Code review** — Get feedback on your code
- **Debugging** — Identify and fix issues
- **Refactoring** — Improve existing code
- **Testing** — Write and run tests

## How It Works

This overlay installs `@anthropic-ai/claude-code` globally via npm, making the `claude` command available in your devcontainer.

## Common Commands

```bash
# Start an interactive session
claude

# Ask a one-off question
claude "explain this function"

# Authenticate with your Anthropic account
claude auth

# Check current version
claude --version
```

## Use Cases

- **Feature development** — Describe what you want to build, Claude implements it
- **Code review** — Get AI feedback on pull requests or code changes
- **Learning** — Understand unfamiliar codebases or concepts
- **Refactoring** — Improve code quality with AI assistance
- **Spec-Driven Development** — Works with the `spec-kit` overlay via `specify init --ai claude`

**Integrates well with:**

- `spec-kit` — Use Claude Code with the SDD workflow
- `nodejs` — Required for installation
- `git-helpers` — Git integration for AI-generated code
- `pre-commit` — Quality gates for AI-generated code

## Configuration

Authentication is managed via the Anthropic API key:

```bash
# Set your API key
export ANTHROPIC_API_KEY=your-api-key

# Or authenticate interactively
claude auth
```

## Verification

```bash
bash .devcontainer/scripts/verify-claude-code.sh
```

## References

- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
- [Anthropic Platform](https://console.anthropic.com/)

**Related Overlays:**

- `spec-kit` — Spec-Driven Development with Claude as the AI agent
- `codex` — OpenAI Codex CLI (alternative AI assistant)
- `gemini-cli` — Google Gemini CLI (alternative AI assistant)
- `nodejs` — Required for npm-based installation
