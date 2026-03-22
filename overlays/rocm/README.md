# ROCm (AMD GPU) Overlay

Enables AMD GPU passthrough for containerised ML, inference, and ROCm compute workloads.

> ⚠️ **ROCm-in-container is more fragile than CUDA.** It depends heavily on the host kernel version, AMD driver stack, specific device support, and container runtime configuration. Treat this as a separate supported profile — not a drop-in equivalent of CUDA.

## Features

- **AMD GPU passthrough** - Device flags added to container `runArgs` so host AMD GPUs are accessible
- **Group membership** - `--group-add=video` and `--group-add=render` ensure the container user can access GPU device nodes
- **Setup check** - `setup.sh` verifies `rocm-smi` / `rocminfo` on container start and prints actionable guidance when GPU access is unavailable
- **Doctor integration** - `verify.sh` asserts `rocm-smi` exits 0 for `container-superposition doctor` checks

## Prerequisites (host-side — out of scope for this overlay)

This overlay configures the _container_ side of GPU passthrough. The host must be prepared independently:

1. **Supported AMD GPU** — RDNA 2+ or most CDNA GPUs. Check the [ROCm hardware compatibility matrix](https://rocm.docs.amd.com/en/latest/compatibility/compatibility-matrix.html) before proceeding.
2. **AMD GPU drivers (`amdgpu`)** — Install the driver package for your Linux distribution:
    ```bash
    # Example for Ubuntu — use amdgpu-install from AMD's repository
    # https://rocm.docs.amd.com/projects/install-on-linux/en/latest/install/amdgpu-install.html
    sudo apt-get install amdgpu-dkms
    ```
3. **ROCm runtime** — Install on the host (or use a container image that bundles it):
    ```bash
    # Example for Ubuntu
    sudo apt-get install rocm
    ```
4. **Group membership** — Add your user to the `render` and `video` groups:
    ```bash
    sudo usermod -aG render,video $USER
    # Log out and back in (or reboot) for group changes to take effect
    ```
5. **Device nodes** — Verify `/dev/kfd` and `/dev/dri` exist on the host:
    ```bash
    ls -la /dev/kfd /dev/dri/
    ```

> ⚠️ **This overlay cannot install or replace host drivers.** Version alignment between the ROCm user-space libraries inside the container and the host kernel module is the user's responsibility.

## How It Works

The overlay patches `devcontainer.json` with:

```json
{
    "runArgs": ["--device=/dev/kfd", "--device=/dev/dri", "--group-add=video", "--group-add=render"]
}
```

| Flag | Purpose |
|------|---------|
| `--device=/dev/kfd` | AMD Kernel Fusion Driver; required for ROCm compute |
| `--device=/dev/dri` | Direct Rendering Infrastructure; gives access to GPU render nodes |
| `--group-add=video` | Adds the container user to the `video` group (owns `/dev/dri`) |
| `--group-add=render` | Adds the container user to the `render` group (owns `/dev/kfd`) |

The container image itself must include ROCm user-space libraries (e.g., `libamdhip64`) to use ROCm APIs. See [Base Image](#base-image) below.

## Base Image

For ROCm workloads you typically want a ROCm-capable base image. Popular choices:

| Image | Use case |
|-------|---------|
| `rocm/dev-ubuntu-22.04` | Ubuntu 22.04 with ROCm pre-installed |
| `rocm/dev-ubuntu-24.04` | Ubuntu 24.04 with ROCm pre-installed |
| `rocm/pytorch` | PyTorch with ROCm support |
| `rocm/tensorflow` | TensorFlow with ROCm support |

Browse all official ROCm images at [hub.docker.com/u/rocm](https://hub.docker.com/u/rocm).

To use a ROCm image, set the `image` field in your `.devcontainer/devcontainer.json` (for plain stack) or configure the appropriate service's `image` in your compose-based devcontainer setup (for compose stack).

## Common Commands

### Check GPU availability

```bash
# Show GPU product name and status
rocm-smi --showproductname

# Show all GPU information
rocm-smi

# Show GPU utilisation
rocm-smi --showuse

# List all HSA (Heterogeneous System Architecture) agents
rocminfo
```

### Discover device nodes

```bash
# List DRI render nodes on the host
ls -la /dev/dri/

# Show GPU device details
rocm-smi --showbus
```

### Query ROCm version

```bash
# ROCm version
cat /opt/rocm/.info/version 2>/dev/null || rocminfo | grep -i 'rocm\|version' | head -n5
```

### Python / PyTorch ROCm smoke test

```python
import torch
print(torch.cuda.is_available())        # True (ROCm uses the CUDA compatibility layer)
print(torch.cuda.get_device_name(0))    # e.g. "AMD Radeon RX 7900 XTX"
```

> **Note:** PyTorch ROCm uses `torch.cuda` APIs via the HIP/CUDA compatibility layer. Install the ROCm-specific PyTorch wheel:
> ```bash
> pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/rocm6.0
> ```
> Find the correct wheel URL at [pytorch.org/get-started/locally](https://pytorch.org/get-started/locally/).

### TensorFlow ROCm smoke test

```python
import tensorflow as tf
print(tf.config.list_physical_devices('GPU'))
```

> Install the ROCm-specific TensorFlow wheel from [tensorflow/rocm releases](https://github.com/ROCm/tensorflow-upstream/releases).

## Use Cases

- **Model inference** — Run LLM or CV model inference with AMD GPU acceleration
- **Training** — Train deep learning models without leaving the dev container
- **ROCm compute** — General-purpose GPU programming with HIP (AMD's CUDA-compatible API)
- **Jupyter notebooks** — GPU-accelerated data science with Jupyter (combine with the `jupyter` overlay)

**Integrates well with:**

- `python` — Python runtime for ML workloads
- `jupyter` — Interactive GPU notebooks

## Troubleshooting

### `rocm-smi: command not found`

The container image does not include the ROCm tools. Either:

1. Switch to a ROCm base image (e.g., `rocm/dev-ubuntu-22.04`)
2. Install ROCm tools inside the image:
    ```bash
    sudo apt-get install rocm-smi-lib rocminfo
    ```

### `No AMD GPU detected` / `/dev/kfd not found`

The GPU device nodes are not accessible inside the container. Work through this checklist:

1. Verify device nodes exist on the **host**:
    ```bash
    ls -la /dev/kfd /dev/dri/
    ```
2. Verify the `amdgpu` kernel module is loaded on the host:
    ```bash
    lsmod | grep amdgpu
    ```
3. Rebuild the dev container after confirming device nodes exist.

### `Permission denied on /dev/kfd`

The container user is not in the correct groups. Verify:

```bash
# Inside the container, check current groups
id

# On the host, add user to groups and re-login
sudo usermod -aG render,video $USER
```

### `ROCm version mismatch`

The ROCm user-space library version inside the image does not match the host kernel module version. Solutions:

- Use a container image whose ROCm version matches the host ROCm installation
- Check the host ROCm version: `cat /opt/rocm/.info/version`
- Use the corresponding `rocm/dev-*` image tag

### `--device` flag not recognised

Ensure your Docker version is 19.03+ and the Docker daemon can access the host device nodes.

### GPU not visible in GitHub Codespaces / cloud dev environments

Cloud hosted dev environments (GitHub Codespaces, Gitpod) typically do not provide AMD GPU passthrough. Use a GPU-enabled cloud VM with AMD GPU support and run VS Code Remote SSH.

## Known Limitations

- ROCm version support is tightly coupled to the host kernel version and AMD driver stack
- Device node names (`/dev/dri/renderD128`) may differ between hosts; the `--device=/dev/dri` flag passes the entire directory
- Not all AMD GPU architectures are supported — always consult the [ROCm compatibility matrix](https://rocm.docs.amd.com/en/latest/compatibility/compatibility-matrix.html)
- Some frameworks (PyTorch, TensorFlow) require separate ROCm-specific wheels — see [Common Commands](#common-commands)
- ROCm setup is generally less forgiving than CUDA; when in doubt, test `rocm-smi` on the host first

## Security Considerations

`--device=/dev/kfd` and `--device=/dev/dri` grant the container access to the GPU device nodes. This is appropriate for development but should not be used in untrusted or multi-tenant environments.

## References

- [ROCm documentation](https://rocm.docs.amd.com/)
- [ROCm hardware compatibility matrix](https://rocm.docs.amd.com/en/latest/compatibility/compatibility-matrix.html)
- [ROCm installation guide (Linux)](https://rocm.docs.amd.com/projects/install-on-linux/en/latest/)
- [ROCm Docker images (hub.docker.com/u/rocm)](https://hub.docker.com/u/rocm)
- [PyTorch ROCm wheels](https://pytorch.org/get-started/locally/)
- [TensorFlow ROCm releases](https://github.com/ROCm/tensorflow-upstream/releases)

**Related Overlays:**

- `python` — Python runtime for ML workloads
- `jupyter` — GPU-accelerated interactive notebooks
- `cuda` — NVIDIA GPU passthrough (conflicts with `rocm`)
