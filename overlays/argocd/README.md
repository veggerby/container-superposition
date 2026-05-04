# Argo CD CLI Overlay

Adds the `argocd` CLI for GitOps workflows with Argo CD.

## Features

- **Argo CD CLI** — `argocd` client for login, app sync, and app lifecycle operations
- **Release install** — binary downloaded from official Argo CD GitHub releases
- **Architecture-aware** — installs amd64 or arm64 automatically

## Quick Start

```bash
argocd version --client
```

Login to an Argo CD server:

```bash
argocd login argocd.example.com
```

If using local port-forwarding:

```bash
kubectl -n argocd port-forward svc/argocd-server 8080:443
argocd login localhost:8080 --insecure
```

Common commands:

```bash
# List applications
argocd app list

# Sync an app
argocd app sync my-app

# Check app health/status
argocd app get my-app

# View app history
argocd app history my-app
```

## Suggested Pairings

- `kubectl-helm` — cluster access and Helm packaging
- `k3d` / `kind` — local Kubernetes clusters for GitOps testing
