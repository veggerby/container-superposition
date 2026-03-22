# CUDA (NVIDIA GPU) Overlay

Enables NVIDIA GPU passthrough for containerized ML, inference, and CUDA compute workloads.

## Features

- **GPU passthrough** - `--gpus=all` added to container `runArgs` so all host GPUs are available
- **VS Code devcontainer GPU hint** - `hostRequirements.gpu = true` signals that a GPU is needed
- **Setup check** - `setup.sh` verifies `nvidia-smi` on container start and prints actionable guidance when GPU access is unavailable
- **Doctor integration** - `verify.sh` asserts `nvidia-smi` exits 0 for `container-superposition doctor` checks

## Prerequisites (host-side — out of scope for this overlay)

This overlay configures the *container* side of GPU passthrough. The host must be prepared independently:

1. **Supported NVIDIA GPU** — Pascal (GTX 10xx) or newer recommended
2. **NVIDIA drivers** — Install the appropriate driver for your OS from [https://www.nvidia.com/drivers](https://www.nvidia.com/drivers)
3. **NVIDIA Container Toolkit** — Install and configure following the [official guide](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html):
   ```bash
   # Example for Ubuntu
   curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
   curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
     sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
     sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
   sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
   ```
4. **Configure the Docker runtime** — Run once after installing the toolkit:
   ```bash
   sudo nvidia-ctk runtime configure --runtime=docker
   sudo systemctl restart docker
   ```

> ⚠️ **This overlay cannot install or replace host drivers.** Version alignment between the CUDA user-space libraries inside the container and the host kernel module is the user's responsibility.

## How It Works

The overlay patches `devcontainer.json` with two settings:

```json
{
    "runArgs": ["--gpus=all"],
    "hostRequirements": {
        "gpu": true
    }
}
```

- **`runArgs: ["--gpus=all"]`** — Passes all host GPUs into the container via the NVIDIA Container Runtime.
- **`hostRequirements.gpu: true`** — Tells VS Code that the host must have a GPU. VS Code will warn the user when opening the repo if no GPU is detected.

The container image itself does **not** need to be an official NVIDIA CUDA image for the passthrough to work; however, CUDA libraries (e.g., `libcuda.so`) must exist inside the image to use CUDA APIs. See [Base Image](#base-image) below.

## Base Image

For GPU workloads you typically want a CUDA-capable base image. Popular choices:

| Image | Use case |
| --- | --- |
| `nvidia/cuda:12.x.x-runtime-ubuntu22.04` | Runtime-only (inference) |
| `nvidia/cuda:12.x.x-devel-ubuntu22.04` | Full toolkit (compilation) |
| `nvcr.io/nvidia/pytorch:24.xx-py3` | PyTorch + CUDA pre-built |
| `nvcr.io/nvidia/tensorflow:24.xx-tf2-py3` | TensorFlow + CUDA pre-built |

Browse all tags at [hub.docker.com/r/nvidia/cuda](https://hub.docker.com/r/nvidia/cuda) and [catalog.ngc.nvidia.com](https://catalog.ngc.nvidia.com).

To use a CUDA image, set the `image` field in your `.devcontainer/devcontainer.json` (for plain stack) or as the `build.context` image (for compose stack).

## Common Commands

### Check GPU availability

```bash
# List GPUs and driver version
nvidia-smi

# Compact GPU list
nvidia-smi -L

# Watch GPU utilisation (refreshes every second)
nvidia-smi dmon -s u
```

### Query CUDA version

```bash
# CUDA runtime version (requires libcuda / nvidia-smi)
nvidia-smi | grep "CUDA Version"

# CUDA toolkit version (if nvcc is installed in the image)
nvcc --version
```

### Python / PyTorch smoke test

```python
import torch
print(torch.cuda.is_available())        # True
print(torch.cuda.get_device_name(0))    # e.g. "NVIDIA GeForce RTX 4090"
```

### TensorFlow smoke test

```python
import tensorflow as tf
print(tf.config.list_physical_devices('GPU'))
```

## Use Cases

- **Model inference** — Run LLM or CV model inference with GPU acceleration
- **Training** — Train deep learning models without leaving the dev container
- **CUDA compute** — General-purpose GPU programming with CUDA C/C++ or PyCUDA
- **Jupyter notebooks** — GPU-accelerated data science with Jupyter (combine with the `jupyter` overlay)
- **CI parity** — Reproduce GPU CI failures locally inside the same container image

**Integrates well with:**

- `python` — Python runtime for ML workloads
- `jupyter` — Interactive GPU notebooks

## Troubleshooting

### `nvidia-smi: command not found`

The container cannot see the GPU. Work through this checklist:

1. Verify host drivers: `nvidia-smi` should work on the *host* before it works inside the container.
2. Verify NVIDIA Container Toolkit is installed: `nvidia-ctk --version`.
3. Verify Docker is configured to use the NVIDIA runtime:
   ```bash
   docker info | grep -i runtime
   # Should list: nvidia
   ```
4. Rebuild the dev container after configuring the toolkit.

### `Failed to initialize NVML: Driver/library version mismatch`

The CUDA user-space library version inside the image does not match the host kernel module. Solutions:

- Use a container image whose CUDA version matches (or is older than) the driver's supported CUDA version (`nvidia-smi` shows the maximum supported CUDA version on the host).
- Update the host NVIDIA driver.

### `--gpus` flag not recognised by Docker

Your Docker version is older than 19.03 or the NVIDIA runtime is not configured as the default. Run:

```bash
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

Or pass the runtime explicitly (not needed if the overlay's `runArgs` is picked up):

```bash
docker run --runtime=nvidia --gpus all nvidia/cuda:12.0-base nvidia-smi
```

### GPU not visible in GitHub Codespaces / cloud dev environments

Cloud hosted dev environments (GitHub Codespaces, Gitpod) typically do not provide GPU pass-through. Use a GPU-enabled cloud VM (AWS p-instances, GCP A100, Azure NCv3) and run VS Code Remote SSH or a self-hosted Codespace runner with GPU support.

## Security Considerations

`--gpus=all` grants the container access to all host GPUs. This is appropriate for development but should not be used in untrusted or multi-tenant environments without additional isolation.

## References

- [NVIDIA Container Toolkit — install guide](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html)
- [NVIDIA CUDA Docker images](https://hub.docker.com/r/nvidia/cuda)
- [NVIDIA NGC catalogue](https://catalog.ngc.nvidia.com)
- [devcontainer spec — hostRequirements](https://containers.dev/implementors/json_reference/#general-properties)

**Related Overlays:**

- `python` — Python runtime for ML workloads
- `jupyter` — GPU-accelerated interactive notebooks
- `docker-in-docker` / `docker-sock` — Build GPU-enabled container images from within the dev container

> 🔜 **ROCm (AMD GPU)** support is tracked in a separate overlay (`rocm`). When that overlay is added it must declare `cuda` in its `conflicts` to satisfy the bidirectional conflict requirement.
