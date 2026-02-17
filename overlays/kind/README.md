# kind (Kubernetes in Docker) Overlay

Local Kubernetes cluster for development and testing using kind.

## Features

- **kind** - Kubernetes in Docker for local cluster creation
- **Multi-node support** - Create single or multi-node clusters
- **Fast startup** - Lightweight compared to traditional VMs
- **Docker-based** - Uses Docker containers as Kubernetes nodes
- **Production-like** - Runs actual Kubernetes, not a simulator

## How It Works

This overlay installs kind (Kubernetes in Docker), a tool for running local Kubernetes clusters using Docker containers as nodes. It requires Docker-in-Docker to function.

**Dependencies:**

- `docker-in-docker` (required) - Provides Docker daemon for kind clusters

**Suggested overlays:**

- `kubectl-helm` - Kubernetes CLI and Helm package manager

## Installation

kind is installed automatically during devcontainer creation via `setup.sh`:

- Downloads kind binary for your architecture (amd64/arm64)
- Installs to `/usr/local/bin/kind`
- Verifies Docker access

## Common Commands

### Cluster Management

```bash
# Create a cluster
kind create cluster --name dev

# Create cluster with custom config
cat <<EOF | kind create cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
- role: worker
- role: worker
EOF

# List clusters
kind get clusters

# Delete a cluster
kind delete cluster --name dev
```

### Working with Clusters

```bash
# Get kubeconfig
kind get kubeconfig --name dev

# Load Docker image into cluster
docker pull nginx:latest
kind load docker-image nginx:latest --name dev

# Export logs
kind export logs /tmp/kind-logs --name dev
```

### kubectl Integration

```bash
# kind automatically updates kubeconfig
kubectl cluster-info --context kind-dev

# Deploy workload
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --port=80 --type=NodePort

# Access service
kubectl port-forward service/nginx 8080:80
```

## Configuration

### Custom Cluster Configuration

Create a `kind-config.yaml`:

```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
    - role: control-plane
      kubeadmConfigPatches:
          - |
              kind: InitConfiguration
              nodeRegistration:
                kubeletExtraArgs:
                  node-labels: "ingress-ready=true"
      extraPortMappings:
          - containerPort: 80
            hostPort: 80
            protocol: TCP
          - containerPort: 443
            hostPort: 443
            protocol: TCP
    - role: worker
    - role: worker
```

Use it:

```bash
kind create cluster --name dev --config kind-config.yaml
```

### Version Control

Specify kind version in setup.sh via environment variable:

```bash
KIND_VERSION=v0.22.0
```

## Use Cases

- **Kubernetes development** - Develop and test K8s applications locally
- **Operator development** - Build and test Kubernetes operators
- **CI/CD testing** - Run K8s tests in CI pipelines
- **Learning Kubernetes** - Experiment with K8s without cloud costs
- **Multi-cluster scenarios** - Test federation, service mesh across clusters

**Integrates well with:**

- `kubectl-helm` - Kubernetes CLI and Helm
- `tilt` - Live reload for Kubernetes development
- `skaffold` - Build/deploy automation for K8s
- `terraform` - Infrastructure as Code
- `nodejs`, `python`, `dotnet` - Application development

## Benefits vs k3d

| Feature               | kind                       | k3d                          |
| --------------------- | -------------------------- | ---------------------------- |
| **Distribution**      | ✅ Full Kubernetes         | ⚠️ k3s (lightweight variant) |
| **Conformance**       | ✅ 100% conformant         | ✅ High conformance          |
| **Speed**             | ⚠️ Moderate startup        | ✅ Faster startup            |
| **Resource Usage**    | ⚠️ Higher                  | ✅ Lower                     |
| **Production Parity** | ✅ Identical to production | ⚠️ Some differences          |
| **Maturity**          | ✅ CNCF project            | ✅ CNCF sandbox              |

**When to use kind:**

- Need 100% Kubernetes compatibility
- Testing for production environments
- Developing Kubernetes itself or operators
- Don't mind slightly higher resource usage

**When to use k3d:**

- Need faster iteration cycles
- Limited system resources
- Don't need full Kubernetes features

## Troubleshooting

### Cluster Creation Fails

Check Docker is running:

```bash
docker ps
```

Check Docker has sufficient resources (4GB+ RAM recommended).

### Network Issues

kind uses Docker networks. If having network issues:

```bash
# Delete and recreate cluster
kind delete cluster --name dev
kind create cluster --name dev
```

### Image Pull Failures

Load images manually:

```bash
docker pull myimage:tag
kind load docker-image myimage:tag --name dev
```

### Persistent Volumes

kind uses local path provisioner. PVs are stored in Docker containers:

```bash
# Inspect node container
docker exec -it dev-control-plane ls /var/local-path-provisioner
```

## References

- [kind Documentation](https://kind.sigs.k8s.io/)
- [kind Quick Start](https://kind.sigs.k8s.io/docs/user/quick-start/)
- [kind Configuration](https://kind.sigs.k8s.io/docs/user/configuration/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

**Related Overlays:**

- `docker-in-docker` - Required for kind to function
- `kubectl-helm` - Kubernetes CLI and Helm
- `tilt` - Live reload for Kubernetes
- `skaffold` - K8s build orchestration
- `k3d` - Alternative lightweight K8s (conflicts)
