# Spec Kit (SDD) Overlay

Installs the `specify` CLI and its prerequisites (`uv`) for **Spec-Driven Development** — a disciplined workflow that elevates specifications to first-class artifacts driving AI-powered implementation.

## Features

- **`specify` CLI** — Interactive SDD workflow commands for any supported AI coding agent
- **`uv`** — Fast Python package manager used to install and run `specify`
- **20+ AI agent integrations** — Works with Codex, Claude Code, Gemini CLI, GitHub Copilot, Cursor, Windsurf, Amp, and more

## What is Spec-Driven Development?

Spec-Driven Development (SDD) flips the traditional workflow: instead of vibe-coding, you author rich specifications that become executable artifacts driving AI agents through a disciplined multi-step process:

| Step | Command                 | Description                               |
| ---- | ----------------------- | ----------------------------------------- |
| 1    | `/speckit.constitution` | Create project governing principles       |
| 2    | `/speckit.specify`      | Define requirements (what & why, not how) |
| 3    | `/speckit.clarify`      | Clarify underspecified areas              |
| 4    | `/speckit.plan`         | Create a technical implementation plan    |
| 5    | `/speckit.analyze`      | Cross-artifact consistency analysis       |
| 6    | `/speckit.tasks`        | Break plan into actionable tasks          |
| 7    | `/speckit.implement`    | Execute tasks with an AI agent            |

## How It Works

This overlay:

1. Installs `uv` (Astral's fast Python package manager) if not already present
2. Uses `uv tool install` to install `specify-cli` from the [github/spec-kit](https://github.com/github/spec-kit) repository
3. Makes `specify` available on the PATH inside the devcontainer

**Why `uv`?** Spec Kit uses `uv` as its package manager for fast, isolated tool installation — it avoids the overhead of creating a full virtual environment while keeping `specify` globally accessible.

## Common Commands

### Initialize a project

```bash
# Initialize SDD for a project with a specific AI agent
specify init . --here --ai codex
specify init . --here --ai claude
specify init . --here --ai gemini
specify init . --here --ai copilot
specify init . --here --ai amp
```

### SDD Workflow

```bash
# After initializing, use the installed slash commands in your AI agent:
# /speckit.constitution  — Define project principles
# /speckit.specify       — Author requirements spec
# /speckit.clarify       — Clarify ambiguities
# /speckit.plan          — Generate implementation plan
# /speckit.analyze       — Check consistency
# /speckit.tasks         — Break into tasks
# /speckit.implement     — Implement with AI
```

### Utility Commands

```bash
# Check specify is available
specify --version

# List supported agents
specify --help
```

## Supported AI Agents

The `specify` CLI supports the following agents (pass as `--ai <agent>`):

| Agent                 | `--ai` flag    | Notes                                   |
| --------------------- | -------------- | --------------------------------------- |
| OpenAI Codex          | `codex`        | Requires `codex` overlay                |
| Anthropic Claude Code | `claude`       | Requires `claude-code` overlay          |
| Google Gemini CLI     | `gemini`       | Requires `gemini-cli` overlay           |
| GitHub Copilot        | `copilot`      | IDE-integrated, no extra overlay needed |
| Cursor Agent          | `cursor-agent` | IDE-integrated                          |
| Codeium Windsurf      | `windsurf`     | Requires `windsurf-cli` overlay         |
| Sourcegraph Amp       | `amp`          | Requires `amp` overlay                  |
| opencode              | `opencode`     | Requires `opencode` overlay             |
| Roo Code              | `roo-code`     | IDE-integrated                          |
| Kiro CLI              | `kiro`         | Check upstream docs                     |
| Generic (BYOA)        | `generic`      | Bring your own agent                    |

For the full list see the [spec-kit supported agents documentation](https://github.com/github/spec-kit#-supported-ai-agents).

## Use Cases

- **Greenfield projects** — Start with a specification before writing any code
- **Feature development** — Spec out new features before asking AI to implement them
- **Team alignment** — Share specifications as structured artifacts
- **AI-assisted refactoring** — Spec the desired end state, let AI plan the migration
- **Documentation-driven development** — Specifications become living documentation

**Integrates well with:**

- `codex` — OpenAI Codex CLI (most common with SDD)
- `claude-code` — Anthropic Claude Code
- `gemini-cli` — Google Gemini CLI
- `amp` — Sourcegraph Amp
- `git-helpers` — Git integration for specification artifacts
- `pre-commit` — Quality gates for specification files

## Configuration

The `specify` tool stores its slash-command templates in your project directory after running `specify init`. These files are committed to your repository.

**Environment variable (optional):**

```bash
# Set a default AI agent to avoid passing --ai on every command
export SPECIFY_AI_AGENT=codex
```

## Verification

After setup, run the verification script to ensure proper installation:

```bash
bash .devcontainer/scripts/verify-spec-kit.sh
```

This checks:

- `uv` is installed
- `specify` CLI is available on PATH

## Troubleshooting

### `specify` command not found

**Solution:**

Ensure `$HOME/.local/bin` is on your PATH:

```bash
export PATH="$HOME/.local/bin:$PATH"

# Or add to your shell profile:
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
```

### `uv` not found

**Solution:**

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
```

### `specify` fails to install

**Solution:**

Check internet connectivity and try reinstalling:

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git --force
```

## References

- [Spec Kit GitHub](https://github.com/github/spec-kit)
- [Spec-Driven Development Methodology](https://github.com/github/spec-kit/blob/main/spec-driven.md)
- [Specify CLI Reference](https://github.com/github/spec-kit#-specify-cli-reference)
- [Supported AI Agents](https://github.com/github/spec-kit#-supported-ai-agents)
- [uv Documentation](https://docs.astral.sh/uv/)

**Related Overlays:**

- `codex` — OpenAI Codex CLI
- `claude-code` — Anthropic Claude Code
- `gemini-cli` — Google Gemini CLI
- `amp` — Sourcegraph Amp
- `opencode` — opencode CLI
- `windsurf-cli` — Codeium Windsurf CLI
