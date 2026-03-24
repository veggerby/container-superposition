# Ollama Overlay

Runs [Ollama](https://ollama.com) as a Docker Compose service inside the devcontainer, enabling local LLM inference without leaving the dev environment.

## Features

- **Ollama inference server** — Run large language models locally with a simple REST API
- **OpenAI-compatible endpoint** — Drop-in replacement for many OpenAI API integrations
- **Model management CLI** — Pull, list, and run models with `ollama` commands
- **Host model reuse** — Mounts your host's `~/.ollama` directory so models are shared without re-downloading
- **Port 11434** — Standard Ollama API port, accessible from the devcontainer as `http://ollama:11434`

## How It Works

Ollama runs as a long-lived Docker Compose service (`ollama`) alongside your devcontainer. The devcontainer connects to it using the hostname `ollama` on port `11434`.

**Service configuration:**

- Image: `ollama/ollama:latest`
- Network: `devnet` (shared with the dev container)
- Port: `11434` (REST API)
- Volume: `${OLLAMA_MODELS_PATH:-~/.ollama}:/root/.ollama` — mounts the host Ollama data directory

The `OLLAMA_HOST` environment variable is set to `http://ollama:11434` in the devcontainer, so tools that respect this variable (e.g. `ollama` CLI, custom scripts) will connect automatically.

## Mapping Host Models into the Container

This is the most important feature for day-to-day use. Models downloaded via `ollama pull` on the **host machine** are stored in `~/.ollama/models` (macOS/Linux) or `%USERPROFILE%\.ollama\models` (Windows). Re-downloading multi-gigabyte models inside the container on every rebuild is wasteful.

### Default Behaviour

The compose volume `${OLLAMA_MODELS_PATH:-~/.ollama}:/root/.ollama` automatically mounts the host's default Ollama data directory. Any model already pulled on the host is immediately available inside the container — no re-download required.

### Override Path

Set `OLLAMA_MODELS_PATH` in `.devcontainer/.env` to point at a different directory, for example an external drive with large models:

```bash
# .devcontainer/.env
OLLAMA_MODELS_PATH=/Volumes/BigDrive/ollama
```

### Windows Note

On Windows, `~` expansion may not work as expected. Set `OLLAMA_MODELS_PATH` explicitly:

```bash
OLLAMA_MODELS_PATH=C:/Users/you/.ollama
```

### Read-Write Mount

The mount is read-write by default, so `ollama pull` inside the container also saves models to the host directory. This means models downloaded inside the devcontainer are available on the host and in future container rebuilds.

## Common Commands

### Pull and Run Models

```bash
# Pull a model (saved to host's ~/.ollama)
ollama pull llama3.2

# Run a model interactively
ollama run llama3.2

# Run a smaller model for faster responses
ollama pull phi3.5
ollama run phi3.5

# Run a coding-focused model
ollama pull qwen2.5-coder
ollama run qwen2.5-coder
```

### Model Management

```bash
# List downloaded models
ollama list

# Show model information
ollama show llama3.2

# Remove a model
ollama rm llama3.2

# Copy a model
ollama cp llama3.2 my-custom-llama
```

### REST API

```bash
# Health check — list available models
curl http://ollama:11434/api/tags

# Generate a completion
curl http://ollama:11434/api/generate \
  -d '{
    "model": "llama3.2",
    "prompt": "Why is the sky blue?",
    "stream": false
  }'

# OpenAI-compatible chat endpoint
curl http://ollama:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# From the host machine (via forwarded port)
curl http://localhost:11434/api/tags
```

## GPU Acceleration

For faster inference, you can enable GPU passthrough. This requires the `cuda` overlay (for NVIDIA GPUs) or `rocm` overlay (for AMD GPUs).

### NVIDIA GPU (cuda overlay)

Add the `cuda` overlay alongside `ollama`, then extend the Ollama service in your `docker-compose.override.yml` (or a custom compose file) to enable GPU access:

```yaml
# .devcontainer/docker-compose.override.yml
services:
    ollama:
        deploy:
            resources:
                reservations:
                    devices:
                        - driver: nvidia
                          count: all
                          capabilities: [gpu]
```

Verify GPU access inside the container:

```bash
# Check NVIDIA GPU is detected
nvidia-smi

# Confirm Ollama is using GPU
ollama run llama3.2 "hello"
# GPU usage should appear in nvidia-smi output
```

> **Note:** GPU passthrough requires the NVIDIA Container Toolkit installed on the host. See the [cuda overlay](../cuda/README.md) for setup instructions.

## Use Cases

- **Offline AI coding** — Use local models with tools like `codex`, `claude-code`, or `amp` as a privacy-preserving backend
- **Privacy-preserving LLM APIs** — Process sensitive code or documents without sending data to cloud providers
- **Testing and prototyping** — Experiment with different models without API costs
- **CI/CD pipelines** — Run LLM-based tests or validations in an isolated environment
- **Custom fine-tuned models** — Load and serve models you have trained or customized

**Integrates well with:**

- `codex` — Point OpenAI Codex CLI at the local Ollama endpoint
- `claude-code` — Use with a local proxy that speaks the Anthropic API format
- `amp` — Configure Amp to use the local OpenAI-compatible endpoint

## Configuration

### Environment Variables

Copy `.devcontainer/.env.example` to `.devcontainer/.env` and customize:

```bash
cd .devcontainer
cp .env.example .env
```

| Variable             | Default     | Description                                            |
| -------------------- | ----------- | ------------------------------------------------------ |
| `OLLAMA_MODELS_PATH` | `~/.ollama` | Host path to Ollama data directory (models are shared) |
| `OLLAMA_VERSION`     | `latest`    | Ollama Docker image version                            |
| `OLLAMA_PORT`        | `11434`     | Host port for the Ollama API                           |

### Remote Env in Devcontainer

The following environment variable is set in the devcontainer:

| Variable      | Value                 | Description                                   |
| ------------- | --------------------- | --------------------------------------------- |
| `OLLAMA_HOST` | `http://ollama:11434` | URL for the Ollama API (used by CLI and SDKs) |

## Troubleshooting

### Models Not Found

If `ollama list` shows no models, the host model directory may not be mounted correctly:

```bash
# Check the mount inside the container
ls /root/.ollama/models

# Verify OLLAMA_MODELS_PATH points to the right directory
echo $OLLAMA_MODELS_PATH

# Pull a model manually
ollama pull llama3.2
```

### Port Conflicts

If port `11434` is already in use on your host:

```bash
# .devcontainer/.env
OLLAMA_PORT=11435
```

Then update `forwardPorts` in your devcontainer configuration accordingly, or use the `--port-offset` flag when generating.

### GPU Not Detected

```bash
# Check if NVIDIA driver is installed on host
nvidia-smi

# Check NVIDIA Container Toolkit
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi

# If toolkit is missing, install it:
# https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html
```

### Service Not Starting

```bash
# Check compose service status
docker compose ps

# View Ollama logs
docker compose logs ollama

# Restart the service
docker compose restart ollama
```

## References

- [Ollama Official Website](https://ollama.com)
- [Ollama Docker Image](https://hub.docker.com/r/ollama/ollama)
- [Ollama Model Library](https://ollama.com/library)
- [Ollama REST API Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [OpenAI Compatibility](https://github.com/ollama/ollama/blob/main/docs/openai.md)

**Related Overlays:**

- [`cuda`](../cuda/README.md) — NVIDIA GPU passthrough for faster inference
- [`rocm`](../rocm/README.md) — AMD GPU passthrough for faster inference
- [`codex`](../codex/README.md) — OpenAI Codex CLI (can use local endpoint)
- [`claude-code`](../claude-code/README.md) — Anthropic Claude CLI
- [`amp`](../amp/README.md) — Sourcegraph Amp CLI
