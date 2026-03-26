# ComfyUI Overlay

Runs [ComfyUI](https://github.com/comfyanonymous/ComfyUI) as a Docker Compose service, providing a reproducible, containerised node-based image and video generation environment with host model directories mounted into the container.

## Features

- **Node-based workflow UI** — Visual node editor for building Stable Diffusion and generative AI pipelines, accessible at `http://localhost:8188`
- **REST and WebSocket API** — Programmatically submit workflows and receive results via ComfyUI's built-in API
- **Custom node support** — Install community custom nodes to extend workflows with new models and operations
- **Host model reuse** — Per-subdirectory volume mounts mean multi-GB checkpoints, LoRAs, VAEs, and ControlNets are shared from the host without re-downloading on every container rebuild
- **Output persistence** — Generated images and videos are saved to the host so they survive container restarts
- **Port 8188** — Standard ComfyUI web UI port, auto-forwarded and opened in the browser

## How It Works

ComfyUI runs as a long-lived Docker Compose service (`comfyui`) alongside your devcontainer. The devcontainer reaches it via the hostname `comfyui` on port `8188`.

**Service configuration:**

- Image: `ghcr.io/ai-dock/comfyui:latest-cuda` (configurable via `COMFYUI_VERSION`)
- Network: `devnet` (shared with the dev container)
- Port: `8188` (ComfyUI web UI and REST API)
- Volumes: per-subdirectory mounts from `COMFYUI_MODELS_PATH` on the host

The `COMFYUI_URL` environment variable is set to `http://comfyui:8188` in the devcontainer so scripts and tools can connect without hard-coding the address.

## Mapping Host Models into the Container

This is the most important feature for day-to-day use. ComfyUI model directories are typically 10s–100s of GB spread across multiple subdirectories. Re-downloading on every container rebuild is not feasible.

### Default Layout

`COMFYUI_MODELS_PATH` defaults to `~/.cache/comfyui/models` on the host. Each subdirectory is independently mounted so ComfyUI discovers each model type correctly:

| Host path (relative to `COMFYUI_MODELS_PATH`) | Container path                        | Purpose                                                |
| --------------------------------------------- | ------------------------------------- | ------------------------------------------------------ |
| `checkpoints/`                                | `/opt/ComfyUI/models/checkpoints/`    | Stable Diffusion base models (`.safetensors`, `.ckpt`) |
| `loras/`                                      | `/opt/ComfyUI/models/loras/`          | LoRA fine-tuning weights                               |
| `vae/`                                        | `/opt/ComfyUI/models/vae/`            | VAE decoder models                                     |
| `controlnet/`                                 | `/opt/ComfyUI/models/controlnet/`     | ControlNet guidance models                             |
| `embeddings/`                                 | `/opt/ComfyUI/models/embeddings/`     | Textual inversion embeddings                           |
| `upscale_models/`                             | `/opt/ComfyUI/models/upscale_models/` | Image upscaling models (ESRGAN, etc.)                  |

### Reusing an Existing ComfyUI Installation

If you already have ComfyUI installed locally, point `COMFYUI_MODELS_PATH` at your existing models directory to reuse downloaded models without copying them:

```bash
# .devcontainer/.env
COMFYUI_MODELS_PATH=~/ComfyUI/models
```

### Downloading New Models (Civitai / HuggingFace)

Downloaded `.safetensors` files placed into the appropriate subdirectory on the **host** are immediately visible inside the container — no restart required:

```bash
# Example: download a checkpoint directly into the host models directory
mkdir -p ~/.cache/comfyui/models/checkpoints
curl -L -o ~/.cache/comfyui/models/checkpoints/my-model.safetensors \
     "https://huggingface.co/.../resolve/main/my-model.safetensors"
```

### Windows Note

On Windows, `~` expansion may be unreliable with Docker Desktop. Set `COMFYUI_MODELS_PATH` explicitly in `.devcontainer/.env`:

```bash
COMFYUI_MODELS_PATH=C:/Users/you/ComfyUI/models
COMFYUI_OUTPUT_PATH=C:/Users/you/ComfyUI/output
```

### Output Persistence

`COMFYUI_OUTPUT_PATH` (defaults to `~/.cache/comfyui/output`) is mounted to `/opt/ComfyUI/output` inside the container. Generated images and videos are written here and survive container rebuilds.

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

Generated images appear in `~/.cache/comfyui/output` on the host (or the path configured in `COMFYUI_OUTPUT_PATH`).

## GPU Acceleration

GPU passthrough is enabled out of the box. The `comfyui` service receives `gpus: all` via the `deploy.resources.reservations.devices` block in the overlay's `docker-compose.yml`:

```yaml
deploy:
    resources:
        reservations:
            devices:
                - driver: nvidia
                  count: 1
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

| Variable              | Default                   | Description                                                   |
| --------------------- | ------------------------- | ------------------------------------------------------------- |
| `COMFYUI_MODELS_PATH` | `~/.cache/comfyui/models` | Root host path for model subdirectories                       |
| `COMFYUI_OUTPUT_PATH` | `~/.cache/comfyui/output` | Host path for generated outputs                               |
| `COMFYUI_VERSION`     | `latest-cuda`             | Docker image tag (`latest-cuda`, `latest-cpu`, `latest-rocm`) |
| `COMFYUI_PORT`        | `8188`                    | Host port for the web UI                                      |
| `CLI_ARGS`            | `--listen 0.0.0.0`        | Extra CLI arguments passed to ComfyUI at startup              |

### Example `.env`

```bash
# Root path for ComfyUI model files on the host.
# Subdirectories (checkpoints, loras, vae, etc.) are mounted individually.
# Point this at an existing ComfyUI models dir to reuse downloaded models.
# COMFYUI_MODELS_PATH=~/ComfyUI/models
COMFYUI_MODELS_PATH=~/.cache/comfyui/models

# Where generated outputs are saved on the host.
COMFYUI_OUTPUT_PATH=~/.cache/comfyui/output
```

## Troubleshooting

### Missing Model Files

**Symptom:** ComfyUI loads but shows "model not found" errors when running a workflow.

**Solution:** Ensure model files exist in the correct subdirectory on the host:

```bash
ls ~/.cache/comfyui/models/checkpoints/   # Should list .safetensors files
```

If using a custom path, verify `COMFYUI_MODELS_PATH` is set correctly in `.devcontainer/.env`.

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
