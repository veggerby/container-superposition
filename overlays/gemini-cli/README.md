# Gemini CLI Overlay

Adds the Google Gemini CLI (`gemini`) for AI-powered development assistance directly in the terminal.

## Features

- **Gemini CLI** — Google's AI-powered coding assistant for the terminal
- **Gemini 2.0 Flash** — Free tier available with Google account

## What is Gemini CLI?

The Google Gemini CLI is an open-source AI agent that brings Google's Gemini models directly to your terminal workflow:

- **Code generation** — Generate code from natural language descriptions
- **Codebase queries** — Ask questions about your code
- **Agentic tasks** — Execute multi-step coding tasks autonomously
- **Web grounding** — Access Google Search for up-to-date information

## How It Works

This overlay installs `@google/gemini-cli` globally via npm, making the `gemini` command available in your devcontainer.

## Common Commands

```bash
# Start an interactive session
gemini

# Ask a one-off question
gemini "how do I implement a binary search tree in TypeScript?"

# Check version
gemini --version
```

## Use Cases

- **Code generation** — Describe features, Gemini implements them
- **Codebase exploration** — Understand large or unfamiliar codebases
- **Debugging** — Diagnose and fix errors with AI help
- **Spec-Driven Development** — Works with `spec-kit` overlay via `specify init --ai gemini`

**Integrates well with:**

- `spec-kit` — Use Gemini CLI with the SDD workflow
- `nodejs` — Required for installation
- `git-helpers` — Git integration for AI-generated code

## Configuration

Authenticate using your Google account or a Gemini API key:

```bash
# Interactive authentication (opens browser)
gemini auth

# Or set API key
export GEMINI_API_KEY=your-api-key
```

## Verification

```bash
bash .devcontainer/scripts/verify-gemini-cli.sh
```

## References

- [Gemini CLI GitHub](https://github.com/google-gemini/gemini-cli)
- [Google AI Studio](https://aistudio.google.com/)

**Related Overlays:**

- `spec-kit` — Spec-Driven Development with Gemini as the AI agent
- `codex` — OpenAI Codex CLI (alternative AI assistant)
- `claude-code` — Anthropic Claude Code (alternative AI assistant)
- `nodejs` — Required for npm-based installation
