# Feature Specification: ROCm (AMD GPU) Overlay

## Status: Accepted

## Overview

Add a `rocm` overlay to enable AMD GPU-accelerated workloads inside a dev container using the ROCm open software platform.

> **Note:** ROCm-in-container is a supported but more fragile path than CUDA. It depends heavily on the host kernel version, AMD driver stack, specific device support, and container runtime configuration. Treat this as a separate supported profile — not a drop-in equivalent of CUDA.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - AMD GPU passthrough for ML/inference workloads (Priority: P1)

1. **Given** a user selects the `rocm` overlay, **When** the devcontainer is built, **Then** `devcontainer.json` includes `"runArgs": ["--device=/dev/kfd", "--device=/dev/dri", "--group-add=video", "--group-add=render"]`.
2. **Given** the AMD GPU drivers and ROCm runtime are installed on the host, **When** the devcontainer starts, **Then** `rocm-smi` is accessible inside the container.
3. **Given** the container is running, **When** `setup.sh` executes, **Then** it reports whether `rocm-smi` is available and prints a helpful message if it is not.
4. **Given** `rocm-smi` is not available, **When** `verify.sh` executes, **Then** it exits 1 for the `doctor` command.

---

## Prerequisites (host-side — out of scope for this overlay)

1. Supported AMD GPU hardware (RDNA 2+, most CDNA — check [ROCm hardware support matrix](https://rocm.docs.amd.com/en/latest/compatibility/compatibility-matrix.html))
2. AMD GPU drivers (`amdgpu`) installed on the host
3. ROCm runtime installed on the host (or the container image bundles it)
4. User added to the `render` and `video` groups, or appropriate device permissions set
5. `/dev/kfd` and `/dev/dri` devices accessible in the container

## Design

### overlay.yml

```yaml
id: rocm
name: ROCm (AMD GPU)
description: AMD ROCm libraries and GPU passthrough for containerised ML/inference workloads
category: dev
supports: []
requires: []
suggests: []
conflicts:
    - cuda
tags:
    - dev
    - gpu
    - rocm
    - amd
    - ml
    - inference
ports: []
```

### devcontainer.patch.json

Set `runArgs` for AMD GPU device passthrough:

```json
{
    "runArgs": ["--device=/dev/kfd", "--device=/dev/dri", "--group-add=video", "--group-add=render"]
}
```

- `/dev/kfd` — AMD Kernel Fusion Driver; required for ROCm compute
- `/dev/dri` — Direct Rendering Infrastructure; gives access to GPU render nodes
- `--group-add=video` and `--group-add=render` — add the container user to the groups that own the GPU device nodes

### setup.sh

- Check whether `rocm-smi` or `rocminfo` is reachable inside the container.
- Print a helpful message if neither is found (host driver / ROCm not configured).

### verify.sh

- Assert `rocm-smi` exits 0 (used by the `doctor` command).

### README.md

Must include:
- Prominent prerequisites section
- Known limitations (kernel version coupling, device node names may vary)
- ROCm framework wheels (PyTorch ROCm, TensorFlow ROCm)
- Troubleshooting section
- Link to ROCm compatibility matrix
- Clear note that this overlay does not replace host drivers

## Relationship to CUDA Overlay

- `cuda` and `rocm` must list each other in `conflicts` (bidirectional, per project rules)
- The `cuda` overlay already declares `rocm` in its `conflicts`
- CUDA is considered the primary GPU path; ROCm is a supported secondary path

## Known Constraints and Caveats

- ROCm version support is tightly coupled to kernel and driver versions
- Device node names (`/dev/dri/renderD128`) may differ per host
- Some frameworks publish separate ROCm wheels
- Less forgiving than CUDA during setup — detailed troubleshooting is essential
