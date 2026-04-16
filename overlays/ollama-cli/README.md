# Ollama CLI Overlay

Installs the [Ollama](https://ollama.com) command-line client in your devcontainer so you can use Ollama models from terminal tools without running an Ollama sidecar in the same compose stack.

## Features

- **Ollama CLI in devcontainer** — Run `ollama pull / run / list / rm` from the main container
- **Works in plain and compose stacks** — Can be used without a local Ollama service overlay
- **Remote-server friendly** — Supports connecting to host or external Ollama endpoints via `OLLAMA_HOST`
- **Fast install path** — Prefers extracting `/usr/bin/ollama` from local `ollama/ollama` Docker image when available
- **Archive fallback** — Falls back to official Linux release archives (`.tar.zst`, then legacy `.tgz`)

## How It Works

This overlay installs only the Ollama CLI binary in the devcontainer. It does **not** run `ollama serve` or create a compose service.

By default, the CLI targets `http://localhost:11434` unless `OLLAMA_HOST` is set. Set `OLLAMA_HOST` to point at your reachable Ollama server (host machine, sidecar, or remote endpoint).

## Configuration

Set `OLLAMA_HOST` in your devcontainer environment when needed:

```bash
# Example: host Ollama server
export OLLAMA_HOST=http://host.docker.internal:11434

# Example: remote Ollama server
export OLLAMA_HOST=http://10.0.0.50:11434
```

You can also set this in `devcontainer.json` (`containerEnv`/`remoteEnv`) or your shell profile.

## Common Commands

```bash
# Show CLI version
ollama --version

# Point to a specific server for one command
OLLAMA_HOST=http://host.docker.internal:11434 ollama list

# Pull and run models
ollama pull llama3.2
ollama run llama3.2 "explain this function"

# Model management
ollama list
ollama show llama3.2
ollama rm llama3.2
```

## Use Cases

- **Use host Ollama from containerized tooling** — Keep Ollama running on host, use CLI in devcontainer
- **Agent tooling integration** — Pair with `codex`, `claude-code`, or `amp` overlays while pointing at existing Ollama infrastructure
- **Remote inference endpoints** — Work against Ollama servers running on another machine or VM

**Integrates well with:**

- `ollama` — Compose sidecar server (this overlay is auto-required there)
- `codex` — OpenAI Codex CLI
- `claude-code` — Anthropic Claude Code CLI
- `amp` — Sourcegraph Amp CLI

## Troubleshooting

### `ollama` command not found

```bash
which ollama
ollama --version
```

If missing, rebuild the container so `setup.sh` runs again.

### Cannot reach Ollama endpoint

```bash
echo "$OLLAMA_HOST"
curl -v "$OLLAMA_HOST/api/tags"
```

Verify network reachability from inside the devcontainer and ensure the Ollama server is running.

## References

- [Ollama Official Website](https://ollama.com)
- [Ollama Model Library](https://ollama.com/library)
- [Ollama REST API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Ollama OpenAI Compatibility](https://github.com/ollama/ollama/blob/main/docs/openai.md)
