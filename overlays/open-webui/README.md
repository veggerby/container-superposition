# Open WebUI Overlay

Adds [Open WebUI](https://github.com/open-webui/open-webui) as a Docker Compose service, providing a polished browser-based chat interface for Ollama and other OpenAI-compatible LLM backends.

## Features

- **Browser-based chat UI** — Full-featured conversational interface for local LLMs at `http://localhost:3000`
- **Ollama integration** — Pre-configured to connect to the `ollama` sidecar when the `ollama` overlay is also selected
- **Multi-model support** — Switch between different Ollama models from the UI without CLI commands
- **Conversation history** — Persists chat history in a named Docker volume across container rebuilds
- **OpenAI-compatible** — Works with any backend that speaks the OpenAI Chat Completions API
- **Port 3000** — Web interface auto-forwarded and opened in the browser

## How It Works

Open WebUI runs as a Docker Compose service (`open-webui`) alongside your devcontainer. It connects to the Ollama service (or any OpenAI-compatible API) using the `OLLAMA_BASE_URL` environment variable.

**Service configuration:**

- Image: `ghcr.io/open-webui/open-webui:main`
- Network: `devnet` (shared with devcontainer and ollama)
- Port: `3000` on the host, mapped to `8080` inside the container
- Volume: `open-webui-data` for persistent chat history and settings

When used together with the `ollama` overlay, the stack looks like:

```
devcontainer ─── open-webui (port 3000) ─┐
                                          ├── devnet
                 ollama (port 11434) ─────┘
```

Open WebUI reads `OLLAMA_BASE_URL` to find the Ollama API. When the `ollama` overlay is selected, this is pre-set to `http://ollama:11434`.

## Common Commands

### Web Interface

```bash
# Open the web UI (auto-forwarded to localhost:3000)
# Navigate to http://localhost:3000 in your browser

# Check service status
docker compose ps open-webui

# View logs
docker compose logs open-webui
docker compose logs -f open-webui

# Restart the service
docker compose restart open-webui
```

### Using with Ollama

```bash
# Pull a model with the Ollama CLI (still available in devcontainer)
ollama pull llama3.2

# The model will automatically appear in the Open WebUI model picker
# Visit http://localhost:3000 and start chatting
```

### REST API

Open WebUI exposes an OpenAI-compatible REST API at `http://localhost:3000/api`:

```bash
# List available models via Open WebUI API
curl http://localhost:3000/api/models

# Chat completion via OpenAI-compatible endpoint
curl http://localhost:3000/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.2",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Configuration

### Environment Variables

Copy `.devcontainer/.env.example` to `.devcontainer/.env` and customize:

| Variable             | Default               | Description                                      |
| -------------------- | --------------------- | ------------------------------------------------ |
| `OPEN_WEBUI_VERSION` | `main`                | Open WebUI Docker image tag                      |
| `OPEN_WEBUI_PORT`    | `3000`                | Host port for the web interface                  |
| `OLLAMA_BASE_URL`    | `http://ollama:11434` | Base URL of the Ollama API                       |
| `WEBUI_SECRET_KEY`   | `supersecret`         | Secret key for session signing (change for prod) |

### Connecting to a Different LLM Backend

If you are not using the `ollama` overlay but have another OpenAI-compatible API available, set `OLLAMA_BASE_URL` in `.devcontainer/.env`:

```bash
# Point at a remote OpenAI-compatible server
OLLAMA_BASE_URL=http://my-llm-server:8000
```

## Use Cases

- **Local AI chat** — Interact with local models via a polished UI instead of the CLI
- **Model comparison** — Switch between models mid-conversation to compare quality
- **Prompt engineering** — Iterate on system prompts and parameters interactively
- **Offline AI workflows** — Full AI chat capability without internet access or API costs
- **Team demos** — Share the forwarded port URL with teammates for collaborative testing

**Integrates well with:**

- `ollama` — Provides the LLM backend; Open WebUI connects automatically
- `cuda` — GPU acceleration for faster Ollama inference
- `python` — Build integrations using the Open WebUI REST API

## Troubleshooting

### UI Not Loading

```bash
# Check the service is running
docker compose ps open-webui

# View startup logs
docker compose logs open-webui

# Restart the service
docker compose restart open-webui
```

### No Models Available

If the model picker in Open WebUI shows no models:

1. Ensure the `ollama` overlay is selected and the Ollama service is running
2. Pull a model with `ollama pull llama3.2` from the devcontainer terminal
3. Refresh the Open WebUI page

```bash
# Verify Ollama is reachable from within the Open WebUI container
docker compose exec open-webui curl -sf http://ollama:11434/api/tags
```

### Port Conflict on 3000

```bash
# .devcontainer/.env
OPEN_WEBUI_PORT=3001
```

## References

- [Open WebUI GitHub](https://github.com/open-webui/open-webui)
- [Open WebUI Documentation](https://docs.openwebui.com)
- [Open WebUI Docker Hub](https://ghcr.io/open-webui/open-webui)

**Related Overlays:**

- [`ollama`](../ollama/README.md) — Local LLM inference server (recommended companion)
- [`cuda`](../cuda/README.md) — NVIDIA GPU acceleration for faster inference
- [`python`](../python/README.md) — Python SDK for building integrations
