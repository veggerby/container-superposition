# Skaffold Overlay

Installs [Skaffold](https://skaffold.dev), Google's command-line tool for continuous development on Kubernetes — handling the build, push, and deploy lifecycle automatically as source files change.

> **Note:** This overlay conflicts with `tilt` because both tools serve the same "continuous Kubernetes development" role. Choose `skaffold` for a configuration-file-driven, CI-friendly pipeline, or `tilt` for a more interactive, UI-driven workflow.

## Features

- **`skaffold dev`** — Watch source files and automatically rebuild, push, and redeploy on changes
- **`skaffold run`** — One-shot build and deploy pipeline for CI/CD integration
- **Declarative config** — `skaffold.yaml` defines the entire build-test-deploy pipeline as code
- **Multiple builders** — Docker, Buildpacks, Bazel, Jib (Maven/Gradle), and more
- **Multiple deployers** — `kubectl`, Helm, Kustomize, and Cloud Run
- **Test integration** — Container Structure Tests and custom test steps built in
- **Profile support** — Swap out configs per environment (dev, staging, prod)

## How It Works

Skaffold is installed as a static binary in the devcontainer during `setup.sh`. It orchestrates the build-push-deploy cycle against whichever Kubernetes cluster is active in your `kubeconfig` (e.g. a k3d or kind cluster).

**Suggested overlays:**

- `kubectl-helm` — Kubernetes CLI and Helm used as Skaffold deployers
- `kind` — Full-conformance local Kubernetes cluster
- `k3d` — Lightweight local Kubernetes cluster

## Installation

Skaffold is installed automatically during devcontainer creation via `setup.sh`:

- Downloads the Skaffold binary for your architecture (amd64/arm64)
- Installs to `/usr/local/bin/skaffold`
- Verifies the installation

## Common Commands

### Development Workflow

```bash
# Continuous development — rebuild and redeploy on file changes
skaffold dev

# One-shot build + deploy
skaffold run

# Delete all resources deployed by Skaffold
skaffold delete

# Preview what Skaffold would deploy (dry run)
skaffold render
```

### Build and Test

```bash
# Build images only (no deploy)
skaffold build

# Run tests only
skaffold test

# Build and push to a registry
skaffold build --push
```

### Profiles

```bash
# Use a specific profile
skaffold dev --profile staging

# Combine multiple profiles
skaffold run --profile prod --profile feature-flag
```

### Debugging

```bash
# Enable port-forwarding for services
skaffold dev --port-forward

# Verbose output
skaffold dev -v debug

# Show rendered manifests
skaffold render --output manifests.yaml
```

## Configuration

### skaffold.yaml

Create a `skaffold.yaml` in your project root:

```yaml
apiVersion: skaffold/v4beta11
kind: Config
metadata:
    name: my-app
build:
    artifacts:
        - image: my-app
          docker:
              dockerfile: Dockerfile
deploy:
    kubectl:
        manifests:
            - k8s/*.yaml
test:
    - image: my-app
      structureTests:
          - ./structure-test.yaml
profiles:
    - name: prod
      deploy:
          helm:
              releases:
                  - name: my-app
                    chartPath: helm/my-app
```

### Common Builders

```yaml
# Docker (default)
build:
  artifacts:
    - image: my-app
      docker:
        dockerfile: Dockerfile

# Buildpacks (no Dockerfile needed)
build:
  artifacts:
    - image: my-app
      buildpacks:
        builder: gcr.io/buildpacks/builder:v1

# Jib (Java/Maven)
build:
  artifacts:
    - image: my-app
      jib:
        project: my-module
```

### Common Deployers

```yaml
# kubectl (plain manifests)
deploy:
  kubectl:
    manifests:
      - k8s/**/*.yaml

# Helm
deploy:
  helm:
    releases:
      - name: my-app
        chartPath: helm/my-app
        valuesFiles:
          - helm/values.yaml

# Kustomize
deploy:
  kustomize:
    paths:
      - k8s/overlays/dev
```

## Benefits vs Tilt

| Feature               | Skaffold (this overlay)           | Tilt                             |
| --------------------- | --------------------------------- | -------------------------------- |
| **Primary interface** | ✅ CLI + skaffold.yaml config     | Interactive UI (port 10350)      |
| **CI/CD suitability** | ✅ First-class CI support         | ⚠️ UI-oriented, less CI-friendly |
| **Config format**     | ✅ Declarative YAML               | Starlark/Python (Tiltfile)       |
| **Build systems**     | ✅ Docker, Buildpacks, Jib, Bazel | Docker, Buildpacks               |
| **Deploy targets**    | ✅ kubectl, Helm, Kustomize, Run  | kubectl, Helm                    |
| **Learning curve**    | Lower (declarative YAML)          | Programmable (more flexible)     |
| **Debugging support** | ✅ Built-in debug mode            | ✅ Built-in live updates         |

**Choose Skaffold when:**

- You want a declarative, portable, config-file-driven pipeline
- CI/CD integration is a priority
- You need support for multiple build systems (Jib, Buildpacks, Bazel)

**Choose Tilt when:**

- You prefer an interactive browser UI for development
- You want fine-grained control over the update pipeline via a Tiltfile

## Use Cases

- **Inner loop acceleration** — Rebuild and redeploy Kubernetes workloads on save, without manual `docker build && kubectl apply`
- **Multi-service applications** — Manage build and deploy of multiple microservices from a single `skaffold.yaml`
- **CI/CD integration** — Use `skaffold run` in pipelines for consistent build-test-deploy flows
- **Helm chart development** — Iterate on Helm charts with live cluster feedback
- **GitOps preview environments** — Render manifests for inspection or PR previews

**Integrates well with:**

- `kubectl-helm` — Used by Skaffold's deploy pipeline
- `k3d` — Lightweight local cluster for development
- `kind` — Full-conformance local cluster for testing

## Troubleshooting

### No kubeconfig Found

```bash
# Ensure kubectl is configured (kubectl-helm overlay must be selected)
kubectl cluster-info

# If using k3d, merge cluster config
k3d kubeconfig merge dev --kubeconfig-merge-default

# If using kind, kubeconfig is set automatically on cluster creation
kind create cluster --name dev
```

### Build Failures

```bash
# Check Docker is accessible
docker info

# Run with verbose logging
skaffold dev -v debug
```

### Deploy Failures

```bash
# View Kubernetes events
kubectl get events --sort-by='.lastTimestamp'

# Tail pod logs
kubectl logs -f deployment/my-app
```

## References

- [Skaffold Documentation](https://skaffold.dev/docs/)
- [Skaffold GitHub](https://github.com/GoogleContainerTools/skaffold)
- [skaffold.yaml Reference](https://skaffold.dev/docs/references/yaml/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

**Related Overlays:**

- [`kubectl-helm`](../kubectl-helm/README.md) — Kubernetes CLI and Helm (recommended with Skaffold)
- [`kind`](../kind/README.md) — Full-conformance local Kubernetes cluster
- [`k3d`](../k3d/README.md) — Lightweight local Kubernetes cluster
- [`tilt`](../tilt/README.md) — Alternative interactive Kubernetes development tool (conflicts)
