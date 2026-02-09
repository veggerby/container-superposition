# Codex Overlay

Adds OpenAI Codex CLI with a persistent `.codex` folder for configurations.

## Features

- **OpenAI Codex CLI** - AI-powered code generation and assistance from the command line
- **Codex directory** - Creates `$HOME/.codex` for persistent configurations

## What is OpenAI Codex CLI?

The OpenAI Codex CLI (`@openai/codex`) provides command-line access to OpenAI's Codex AI model for:

- **Code generation** - Generate code from natural language descriptions
- **Code completion** - Intelligent code suggestions
- **Code explanation** - Understand complex code
- **Refactoring** - Improve existing code

## Configuration

**Configured paths:**

- `$HOME/.codex` - Configuration and tools directory (created automatically during setup)

## How It Works

This overlay:

1. Installs OpenAI Codex CLI globally via npm (`npm install -g @openai/codex`)
2. Creates the `$HOME/.codex` directory for persistent configurations

**After setup:**

- The `codex` command will be available immediately (npm global binaries are in PATH)
- Use it for AI-powered coding assistance

## Verification

After setup, run the verification script to ensure proper installation:

```bash
bash .devcontainer/verify-codex.sh
```

This will check:
- Codex CLI is installed and in PATH
- `.codex` directory exists

## Troubleshooting

### codex command not found

**Issue:** After installing codex overlay, `codex` command is not recognized.

**Solution:**

1. Verify npm global binaries are in PATH:

   ```bash
   npm config get prefix
   # Should show: /usr/local or similar

   which codex
   # Should show: /usr/local/bin/codex or similar
   ```

2. If not found, rebuild the devcontainer:
   - VS Code: `Cmd+Shift+P` → "Dev Containers: Rebuild Container"

3. Check installation manually:

   ```bash
   npm list -g @openai/codex
   # Should show installed version
   ```

## Usage

### Basic Commands

```bash
# Generate code from natural language
codex "create a function that fetches user data from an API"

# Get code explanations
codex explain "what does this regex do: /^[a-zA-Z0-9]+$/"

# Code completion (provide partial code)
codex complete "function fibonacci(n) {"
```

For full documentation, visit: [OpenAI Codex CLI Documentation](https://github.com/openai/openai-codex-cli)

## Optional: Persistent .codex Mount

To share your `.codex` configurations between your host and container, create the directory on your host:

```bash
mkdir -p ~/.codex
```

Then add this mount to your `devcontainer.json`:

```json
"mounts": [
  "source=${localEnv:HOME}${localEnv:USERPROFILE}/.codex,target=${containerEnv:HOME}/.codex,type=bind,consistency=cached"
]
```

This allows you to:

- Share Codex configurations across multiple devcontainers
- Persist configurations on your host machine
- Maintain consistent settings across projects

**Important**: Only add this mount after creating the `~/.codex` directory on your host. Otherwise, the container may fail to start.

## Related Overlays

- **nodejs** - Required for npm and running the Codex CLI
- **git-helpers** - Git integration for AI-generated code
- **pre-commit** - Quality gates for AI-generated code

## Additional Resources

- [OpenAI Codex CLI](https://github.com/openai/openai-codex-cli)
- [OpenAI Platform](https://platform.openai.com/)

