# ComfyUI Overlay

Runs [ComfyUI](https://github.com/comfyanonymous/ComfyUI) as a Docker Compose service, providing a reproducible, containerised node-based image and video generation environment with a shared models directory accessible from both the devcontainer and the ComfyUI sidecar.

## Features

- **Node-based workflow UI** — Visual node editor for building Stable Diffusion and generative AI pipelines, accessible at `http://localhost:8188`
- **REST and WebSocket API** — Programmatically submit workflows and receive results via ComfyUI's built-in API
- **Custom node support** — Install community custom nodes to extend workflows with new models and operations
- **Shared models directory** — Single volume root (`/opt/comfyui-models`) mounted into both the devcontainer and the ComfyUI sidecar; model files are accessible by scripts running in the devcontainer without going through the HTTP API
- **Output persistence** — Generated images and videos are saved to a named volume (or host path) so they survive container restarts
- **Port 8188** — Standard ComfyUI web UI port, auto-forwarded and opened in the browser

## How It Works

ComfyUI runs as a long-lived Docker Compose service (`comfyui`) alongside your devcontainer. The devcontainer reaches it via the hostname `comfyui` on port `8188`.

**Service configuration:**

- Image: `ghcr.io/ai-dock/comfyui:latest-cuda` (configurable via `COMFYUI_VERSION`)
- Network: `devnet` (shared with the dev container)
- Port: `8188` (ComfyUI web UI and REST API)
- Volumes: single models root shared between devcontainer and ComfyUI sidecar

The `COMFYUI_URL` environment variable is set to `http://comfyui:8188` in the devcontainer so scripts and tools can connect without hard-coding the address.

The `COMFYUI_MODELS_DIR` environment variable is set to `/opt/comfyui-models` in the devcontainer — the fixed path where the shared models volume is mounted.

## Shared Models Directory

`/opt/comfyui-models` is the single models root visible to **both** the devcontainer and the ComfyUI sidecar. Files written to this directory from any side are immediately visible to the other — no restart required.

### Subdirectory Layout

`setup.sh` pre-creates all expected subdirectories on first run:

```
/opt/comfyui-models/
├── checkpoints/      — Stable Diffusion base models (.safetensors, .ckpt)
├── loras/            — LoRA fine-tuning weights
├── controlnet/       — ControlNet guidance models
├── clip_vision/      — CLIP Vision models
├── vae/              — VAE decoder models
├── embeddings/       — Textual inversion embeddings
└── upscale_models/   — Image upscaling models (ESRGAN, etc.)
```

### Tier 1 (default): Named Docker Volume

When `COMFYUI_MODELS_HOST_PATH` is **not** set (the default), a named Docker Compose volume `comfyui-models` is used. Models persist across container rebuilds without any host-side setup and work on all platforms.

```yaml
# docker-compose.yml (simplified)
volumes:
    comfyui-models:
        name: comfyui-models
```

### Tier 2 (opt-in): Bind Mount to Host Path

Set `COMFYUI_MODELS_HOST_PATH` in `.devcontainer/.env` to switch to a bind mount — the same Compose config handles both cases with no structural change:

```bash
# .devcontainer/.env

# macOS / Linux
COMFYUI_MODELS_HOST_PATH=~/.cache/comfyui/models

# Windows (Docker Desktop — use absolute path, no tilde)
COMFYUI_MODELS_HOST_PATH=C:/Users/you/.cache/comfyui/models

# Reuse an existing local ComfyUI install
COMFYUI_MODELS_HOST_PATH=~/ComfyUI/models
```

### Reusing an Existing Local ComfyUI Install

Point `COMFYUI_MODELS_HOST_PATH` at your existing models directory to avoid re-downloading multi-GB files:

```bash
COMFYUI_MODELS_HOST_PATH=~/ComfyUI/models
```

### Downloading Models from the Devcontainer

Use `curl`, `wget`, or `huggingface-cli` inside the devcontainer to download models directly into the shared directory — they are immediately visible in ComfyUI's model browser:

```bash
# Download a checkpoint
curl -L -o "${COMFYUI_MODELS_DIR}/checkpoints/my-model.safetensors" \
     "https://huggingface.co/.../resolve/main/my-model.safetensors"

# Download with wget
wget -P "${COMFYUI_MODELS_DIR}/checkpoints/" \
     "https://huggingface.co/.../resolve/main/my-model.safetensors"

# Download with huggingface-cli (requires huggingface_hub)
huggingface-cli download org/repo my-model.safetensors \
    --local-dir "${COMFYUI_MODELS_DIR}/checkpoints/"
```

Files written to `$COMFYUI_MODELS_DIR` are **immediately visible in ComfyUI** — no restart is needed because the volume is live-mounted.

### Windows Note

On Windows with Docker Desktop, use absolute paths with forward slashes for `COMFYUI_MODELS_HOST_PATH`. Tilde (`~`) expansion is unreliable:

```bash
# Windows — use absolute path
COMFYUI_MODELS_HOST_PATH=C:/Users/you/.cache/comfyui/models
```

## Common Workflows

### Open the Web UI

Once the container is running, open `http://localhost:8188` in your browser. The node editor loads automatically.

### Load a Workflow

1. Download a workflow JSON file (e.g. from [ComfyUI workflows](https://comfyworkflows.com/))
2. In the ComfyUI UI, click **Load** and select the JSON file
3. Connect missing model nodes to your available checkpoints and click **Queue Prompt**

### Run Inference via CLI

```bash
# Submit a workflow JSON via the ComfyUI API from inside the devcontainer
curl -X POST http://comfyui:8188/prompt \
  -H "Content-Type: application/json" \
  -d @workflow_api.json
```

### Save Outputs

Generated images appear in the `comfyui-output` named volume by default, or at the path configured in `COMFYUI_OUTPUT_PATH`.

## GPU Acceleration

GPU passthrough is enabled out of the box. The `comfyui` service receives `gpus: all` via the `deploy.resources.reservations.devices` block in the overlay's `docker-compose.yml`:

```yaml
deploy:
    resources:
        reservations:
            devices:
                - driver: nvidia
                  count: all
                  capabilities: [gpu]
```

### Prerequisites

GPU passthrough requires the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) installed and configured on the host:

```bash
# Verify NVIDIA driver is installed on the host
nvidia-smi

# Verify NVIDIA Container Toolkit
docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi
```

> **Note:** On machines without an NVIDIA GPU or without the NVIDIA Container Toolkit, Docker Compose may warn about unresolvable device requests. Use `COMFYUI_VERSION=latest-cpu` to switch to CPU-only mode (see below).

**See also:** The [`cuda`](../cuda/README.md) overlay installs NVIDIA CUDA toolkit support in the devcontainer itself.

### CPU-Only Mode

If you do not have an NVIDIA GPU, switch to the CPU image by setting `COMFYUI_VERSION` in `.devcontainer/.env`:

```bash
COMFYUI_VERSION=latest-cpu
```

CPU inference is significantly slower but works on any machine.

### AMD GPU (ROCm)

For AMD GPU support, use a ROCm-compatible image tag:

```bash
COMFYUI_VERSION=latest-rocm
```

**See also:** The [`rocm`](../rocm/README.md) overlay for ROCm toolkit support in the devcontainer.

## Custom Nodes

Custom nodes extend ComfyUI with new model types, loaders, and processing steps. To persist custom nodes across container rebuilds, add a named volume for the custom nodes directory via a custom Docker Compose patch in `.devcontainer/custom/docker-compose.patch.yml`:

```yaml
services:
    comfyui:
        volumes:
            - comfyui-custom-nodes:/opt/ComfyUI/custom_nodes

volumes:
    comfyui-custom-nodes:
```

Then install custom nodes from inside the running container:

```bash
docker compose exec comfyui bash -c \
  "cd /opt/ComfyUI/custom_nodes && git clone https://github.com/example/custom-node"
```

## API Usage

ComfyUI exposes a REST and WebSocket API for programmatic workflow execution.

### Submit a Workflow

```bash
# POST a workflow (in API format) to the queue
curl -X POST http://comfyui:8188/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": { /* workflow nodes */ }, "client_id": "my-client"}'
```

### Check Queue Status

```bash
curl http://comfyui:8188/queue
```

### Retrieve Output Files

```bash
# List generated images
curl http://comfyui:8188/history

# Download a specific file by filename
curl -O http://comfyui:8188/view?filename=ComfyUI_00001_.png&type=output
```

### WebSocket (real-time progress)

```python
import websocket, json

ws = websocket.WebSocket()
ws.connect("ws://comfyui:8188/ws?clientId=my-client")
while True:
    message = json.loads(ws.recv())
    print(message)  # progress updates, execution events, etc.
```

## Configuration

### Environment Variables

Set these in `.devcontainer/.env` (copy from `.devcontainer/.env.example`):

| Variable                   | Default               | Description                                                                                          |
| -------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| `COMFYUI_MODELS_DIR`       | `/opt/comfyui-models` | Path inside devcontainer where models are accessible (set in devcontainer.patch.json; do not change) |
| `COMFYUI_MODELS_HOST_PATH` | _(unset)_             | Host-side bind mount source; when unset the named volume `comfyui-models` is used                    |
| `COMFYUI_OUTPUT_PATH`      | _(unset)_             | Host path for generated outputs; when unset the named volume `comfyui-output` is used                |
| `COMFYUI_VERSION`          | `latest-cuda`         | Docker image tag (`latest-cuda`, `latest-cpu`, `latest-rocm`)                                        |
| `COMFYUI_PORT`             | `8188`                | Host port for the web UI                                                                             |
| `CLI_ARGS`                 | `--listen 0.0.0.0`    | Extra CLI arguments passed to ComfyUI at startup                                                     |

### Example `.env`

```bash
# Option A (default) — named Docker volume, no host path needed:
# Leave COMFYUI_MODELS_HOST_PATH unset.

# Option B — bind mount to host directory:
# macOS/Linux:
# COMFYUI_MODELS_HOST_PATH=~/.cache/comfyui/models
# Windows (Docker Desktop):
# COMFYUI_MODELS_HOST_PATH=C:/Users/you/.cache/comfyui/models

# Where generated outputs are saved (named volume by default):
# COMFYUI_OUTPUT_PATH=~/.cache/comfyui/output
```

## Troubleshooting

### Missing Model Files

**Symptom:** ComfyUI loads but shows "model not found" errors when running a workflow.

**Solution:** Ensure model files exist in the correct subdirectory inside the shared models root:

```bash
ls "${COMFYUI_MODELS_DIR}/checkpoints/"   # Should list .safetensors files
```

If `COMFYUI_MODELS_HOST_PATH` is set, verify the host directory contains the expected subdirectories.

### CUDA / GPU Not Detected

**Symptom:** ComfyUI runs on CPU despite having an NVIDIA GPU.

**Solutions:**

1. Ensure the `deploy.resources.reservations.devices` block is present in the compose service (see [GPU Acceleration](#gpu-acceleration) above)
2. Verify NVIDIA Container Toolkit is installed on the host: `nvidia-smi`
3. Switch to `COMFYUI_VERSION=latest-cuda` if using a different tag

### Port 8188 Already in Use

**Symptom:** Container fails to start with "port already in use".

**Solution:** Change the host port in `.devcontainer/.env`:

```bash
COMFYUI_PORT=8288
```

Then rebuild the container (`Dev Containers: Rebuild Container`).

### Container Starts but UI is Unreachable

**Symptom:** Browser shows "connection refused" on `http://localhost:8188`.

**Solutions:**

1. Check the container is running: `docker compose ps`
2. Check logs for startup errors: `docker compose logs comfyui`
3. Ensure `CLI_ARGS` includes `--listen 0.0.0.0` so ComfyUI accepts external connections

## References

- [ComfyUI GitHub Repository](https://github.com/comfyanonymous/ComfyUI)
- [ComfyUI API Documentation](https://github.com/comfyanonymous/ComfyUI/tree/master/script_examples)
- [ai-dock/comfyui Docker Image](https://github.com/ai-dock/comfyui)
- [ComfyUI Workflows Community](https://comfyworkflows.com/)
- [Civitai — Model Downloads](https://civitai.com/)

**Related Overlays:**

- [`cuda`](../cuda/README.md) — NVIDIA CUDA toolkit for GPU-accelerated workloads
- [`rocm`](../rocm/README.md) — AMD ROCm toolkit for GPU-accelerated workloads
- [`python`](../python/README.md) — Python runtime for automation scripts
- [`ollama`](../ollama/README.md) — Local LLM inference server
