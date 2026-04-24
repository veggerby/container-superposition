# Feature Specification: CUDA (NVIDIA GPU) Overlay

**Spec ID**: `005-cuda-overlay`
**Created**: 2026-03-22
**Status**: Final
**Input**: Add a `cuda` overlay to enable NVIDIA GPU-accelerated workloads inside a dev container.

## User Scenarios & Testing

### User Story 1 - GPU passthrough for ML/inference workloads (Priority: P1)

A developer wants to run NVIDIA GPU-accelerated workloads (ML training, inference, CUDA compute) inside a dev container without manually configuring Docker runtime flags.

**Why this priority**: GPU-accelerated dev containers require specific Docker runtime flags (`--gpus=all`) and VS Code devcontainer host requirements (`gpu: true`) that must be set correctly for the container to access the GPU. Without the overlay, users must add these manually and correctly every time.

**Independent Test**: Select the `cuda` overlay, rebuild the container, and confirm that `nvidia-smi` exits 0 and reports the GPU correctly.

**Acceptance Scenarios**:

1. **Given** a user selects the `cuda` overlay, **When** the devcontainer is built, **Then** `devcontainer.json` includes `"runArgs": ["--gpus=all"]` and `"hostRequirements": {"gpu": true}`.
2. **Given** the NVIDIA Container Toolkit is installed on the host, **When** the devcontainer starts, **Then** `nvidia-smi` is accessible inside the container.
3. **Given** the container is running, **When** `setup.sh` executes, **Then** it reports whether `nvidia-smi` is available and prints a helpful message if it is not.

---

### User Story 2 - Conflict enforcement between cuda and rocm (Priority: P1)

A user selects both `cuda` and `rocm` and expects the tool to report a conflict, because only one GPU compute framework can be active at a time.

**Why this priority**: CUDA (NVIDIA) and ROCm (AMD) are mutually exclusive GPU compute frameworks. Allowing both would produce an incoherent configuration.

**Independent Test**: Attempt to generate a devcontainer with both `cuda` and `rocm` selected and confirm the tool surfaces a conflict and blocks generation.

**Acceptance Scenarios**:

1. **Given** a user selects both `cuda` and `rocm`, **When** they run `container-superposition init`, **Then** the tool reports a conflict and prevents generation.
2. **Given** `cuda` lists `rocm` in `conflicts`, **When** `rocm` is added in the future, **Then** `rocm` must also list `cuda` in its `conflicts` (bidirectional enforcement). Note: `rocm` does not exist yet; when it is added the reciprocal conflict must be declared in `overlays/rocm/overlay.yml`.

---

## Design

### overlay.yml

```yaml
id: cuda
name: CUDA (NVIDIA GPU)
description: NVIDIA CUDA libraries and GPU passthrough for containerized ML/inference workloads
category: dev
supports: []
requires: []
suggests: []
conflicts:
    - rocm
tags:
    - gpu
    - cuda
    - nvidia
    - ml
    - inference
ports: []
```

### devcontainer.patch.json

Set `runArgs` for GPU passthrough and `hostRequirements` to signal GPU need:

```json
{
    "runArgs": ["--gpus=all"],
    "hostRequirements": { "gpu": true }
}
```

### setup.sh

- Check whether `nvidia-smi` is reachable inside the container.
- Print a helpful message if it is not (host driver / toolkit not configured).

### verify.sh

- Assert `nvidia-smi` exits 0 (used by the `doctor` command).

### README.md

- Clear prerequisites section (host drivers, NVIDIA Container Toolkit).
- Troubleshooting tips for common failure modes.
- Note that the overlay does not replace or install host drivers.

## Out of Scope

- Installing or replacing host NVIDIA drivers.
- Guaranteeing version alignment between CUDA user-space libraries and the host kernel module.
- ROCm (AMD GPU) support — tracked separately.
