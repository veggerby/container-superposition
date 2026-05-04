# Argo CD CLI Overlay

Adds the [`argocd`](https://argo-cd.readthedocs.io/) CLI for managing GitOps workflows with an Argo CD server — log in, inspect apps, trigger syncs, and manage rollouts without leaving your devcontainer.

## Features

- **Argo CD CLI** — `argocd` client for login, app sync, rollback, and lifecycle operations
- **Release install** — binary downloaded from official Argo CD GitHub releases
- **Architecture-aware** — installs `amd64` or `arm64` automatically

## How It Works

The `argocd` binary is downloaded from the official Argo CD GitHub releases page (`github.com/argoproj/argo-cd`) during devcontainer creation via `setup.sh`.

- Detects host architecture (`amd64` / `arm64`) automatically
- Downloads the matching pre-built binary and places it in `/usr/local/bin/argocd`
- No Argo CD server is run inside the devcontainer — the CLI connects to an external (or locally port-forwarded) Argo CD server

**Dependencies:** None required. Pair with `kubectl-helm` for full cluster access, and `k3d` or `kind` for local Kubernetes clusters where you can deploy Argo CD for testing.

## Common Commands

### Authentication

```bash
# Login to an Argo CD server
argocd login argocd.example.com

# Login with TLS disabled (for local/dev servers)
argocd login localhost:8080 --insecure

# Login and save context (avoids re-entering credentials)
argocd login argocd.example.com --grpc-web

# Check current logged-in context
argocd context

# Switch context
argocd context my-cluster

# Logout
argocd logout argocd.example.com
```

### Application Management

```bash
# List all applications
argocd app list

# Get detailed status of an app
argocd app get my-app

# Create an app (GitOps source)
argocd app create my-app \
  --repo https://github.com/myorg/my-manifests.git \
  --path k8s/overlays/dev \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace my-app

# Sync (deploy) an app
argocd app sync my-app

# Wait for sync to complete
argocd app wait my-app --sync

# Delete an app (without deleting cluster resources)
argocd app delete my-app

# Delete an app and all managed cluster resources
argocd app delete my-app --cascade
```

### Sync Operations

```bash
# Sync only specific resources
argocd app sync my-app --resource apps:Deployment:my-app

# Force sync (ignores resource health)
argocd app sync my-app --force

# Dry-run sync (show diff without applying)
argocd app diff my-app

# Rollback to a previous revision
argocd app rollback my-app 3

# View app history
argocd app history my-app
```

### Projects & RBAC

```bash
# List projects
argocd proj list

# Create a project
argocd proj create my-project \
  --description "My project" \
  --src https://github.com/myorg/my-manifests.git \
  --dest https://kubernetes.default.svc,my-namespace

# List project roles
argocd proj role list my-project
```

## Local Port-Forward Workflow

When testing Argo CD in a local cluster (k3d / kind):

```bash
# Install Argo CD in the cluster
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for pods to be ready
kubectl -n argocd wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server --timeout=120s

# Port-forward the API server
kubectl -n argocd port-forward svc/argocd-server 8080:443 &

# Get the initial admin password
argocd admin initial-password -n argocd

# Login
argocd login localhost:8080 --insecure
```

## Use Cases

- **GitOps deployments** — Sync Kubernetes manifests from Git to a cluster via Argo CD
- **Multi-environment promotion** — Manage dev/staging/production app variants with app-of-apps patterns
- **Rollback workflows** — Inspect history and revert to a previous known-good revision
- **Local GitOps testing** — Deploy Argo CD to a local `k3d` or `kind` cluster to test GitOps pipelines without a cloud environment
- **Drift detection** — Use `argocd app diff` to detect config drift before syncing

**Integrates well with:**

- `kubectl-helm` — Kubernetes CLI and Helm for inspecting or patching resources managed by Argo CD
- `k3d` — Lightweight local clusters for GitOps development and testing
- `kind` — Full-conformance local clusters for Argo CD testing
- `terraform` — Provision the cluster and bootstrap Argo CD with Terraform, then manage apps with the CLI

## References

- [Argo CD Documentation](https://argo-cd.readthedocs.io/)
- [Argo CD CLI Reference](https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd/)
- [Argo CD GitHub Releases](https://github.com/argoproj/argo-cd/releases)
- [Argo CD Getting Started](https://argo-cd.readthedocs.io/en/stable/getting_started/)
- [App of Apps Pattern](https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/)

**Related Overlays:**

- [`kubectl-helm`](../kubectl-helm/README.md) — Kubernetes CLI and Helm package manager
- [`k3d`](../k3d/README.md) — Lightweight local Kubernetes clusters
- [`kind`](../kind/README.md) — Full-conformance local Kubernetes clusters
