# k3d Overlay

Installs [k3d](https://k3d.io), a lightweight wrapper that runs [k3s](https://k3s.io) (Rancher's minimal Kubernetes distribution) in Docker containers, enabling fast local Kubernetes clusters for development.

> **Note:** This overlay conflicts with `kind` because both tools create local Kubernetes clusters using Docker containers. Choose `k3d` for faster startup and lower resource usage, or `kind` for full Kubernetes conformance.

## Features

- **k3d CLI** — Create, manage, and delete local k3s clusters from the terminal
- **Fast cluster startup** — Clusters spin up in seconds, compared to heavier alternatives
- **Low resource usage** — k3s has a smaller memory and CPU footprint than full Kubernetes
- **Multi-node clusters** — Simulate multi-node topologies with server and agent nodes
- **Load balancer included** — Built-in k3s service load balancer for `LoadBalancer` services
- **Port and volume mapping** — Map host ports and directories into the cluster easily

## How It Works

k3d is installed as a static binary in the devcontainer during `setup.sh`. It requires Docker (provided by the `docker-in-docker` dependency) to create k3s nodes as Docker containers.

**Dependencies:**

- `docker-in-docker` (required) — Provides the Docker daemon that k3d uses to launch k3s nodes

**Suggested overlays:**

- `kubectl-helm` — Kubernetes CLI and Helm for interacting with k3d clusters

## Installation

k3d is installed automatically during devcontainer creation via `setup.sh`:

- Downloads the k3d binary for your architecture (amd64/arm64)
- Installs to `/usr/local/bin/k3d`
- Verifies Docker access

## Common Commands

### Cluster Management

```bash
# Create a single-node cluster (control plane + agent in one node)
k3d cluster create dev

# Create a cluster with multiple agents
k3d cluster create dev --agents 2

# Create with a specific k3s version
k3d cluster create dev --image rancher/k3s:v1.30.0-k3s1

# Create with port mapping (host 8080 → cluster LoadBalancer 80)
k3d cluster create dev -p "8080:80@loadbalancer"

# List all clusters
k3d cluster list

# Start/stop a cluster
k3d cluster start dev
k3d cluster stop dev

# Delete a cluster
k3d cluster delete dev
```

### Working with Clusters

```bash
# Merge k3d kubeconfig into default kubeconfig
k3d kubeconfig merge dev --kubeconfig-merge-default

# Get kubeconfig for a specific cluster
k3d kubeconfig get dev

# Import a Docker image into the cluster (avoids registry push/pull)
docker build -t myapp:dev .
k3d image import myapp:dev --cluster dev
```

### kubectl Integration

```bash
# Use kubectl with the k3d cluster
kubectl cluster-info --context k3d-dev

# Deploy a workload
kubectl create deployment nginx --image=nginx
kubectl expose deployment nginx --port=80 --type=LoadBalancer

# Port-forward for direct access
kubectl port-forward service/nginx 8080:80
```

## Configuration

### Multi-Node Cluster

```bash
k3d cluster create dev \
  --servers 1 \
  --agents 3 \
  --k3s-arg "--disable=traefik@server:*"
```

### Volume Mounts

```bash
# Mount a local directory into all nodes
k3d cluster create dev \
  --volume "${PWD}:/app@all"
```

### Port Mapping

```bash
# Expose ports 80 and 443 through the cluster load balancer
k3d cluster create dev \
  -p "80:80@loadbalancer" \
  -p "443:443@loadbalancer"
```

## Benefits vs kind

| Feature               | k3d (this overlay)          | kind                         |
| --------------------- | --------------------------- | ---------------------------- |
| **Distribution**      | k3s (lightweight variant)   | ✅ Full Kubernetes           |
| **Startup speed**     | ✅ Faster (~15–30 s)        | Moderate (~30–60 s)          |
| **Resource usage**    | ✅ Lower (~256 MB RAM/node) | Higher (~512 MB+ RAM/node)   |
| **Conformance**       | High (not 100%)             | ✅ 100% CNCF conformant      |
| **Port mapping**      | ✅ Built-in load balancer   | Manual NodePort/port-forward |
| **Production parity** | Sufficient for most apps    | ✅ Identical to production   |

**Choose k3d when:**

- Fast iteration cycles are more important than 100% conformance
- System resources are limited
- You want built-in load balancer for easy port mapping

**Choose kind when:**

- You need guaranteed Kubernetes API compatibility
- Developing Kubernetes operators or controllers
- Testing for production environments

## Use Cases

- **Rapid Kubernetes development** — Fast cluster creation and teardown for iterative development
- **Helm chart testing** — Deploy and test Helm charts locally before pushing
- **CI/CD prototyping** — Simulate cluster deployments in low-resource environments
- **Multi-node testing** — Test workloads across multiple nodes on a single machine
- **Learning Kubernetes** — Explore Kubernetes concepts with minimal overhead

**Integrates well with:**

- `kubectl-helm` — Kubernetes CLI and Helm package manager
- `tilt` — Live reload for Kubernetes workloads
- `skaffold` — Build/deploy automation for Kubernetes
- `terraform` — IaC for cluster configuration

## Troubleshooting

### Cluster Creation Fails

```bash
# Ensure Docker daemon is running
docker info

# Check Docker has sufficient resources
docker system df
```

### `kubectl` Cannot Connect

```bash
# Ensure kubeconfig is merged
k3d kubeconfig merge dev --kubeconfig-merge-default

# Verify cluster is running
k3d cluster list
kubectl cluster-info --context k3d-dev
```

### Image Not Found in Cluster

```bash
# Import local images directly (avoids registry round-trip)
k3d image import myapp:latest --cluster dev
```

## References

- [k3d Documentation](https://k3d.io)
- [k3d GitHub](https://github.com/k3d-io/k3d)
- [k3s Documentation](https://docs.k3s.io)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

**Related Overlays:**

- `docker-in-docker` — Required: provides the Docker daemon for k3d
- [`kubectl-helm`](../kubectl-helm/README.md) — Kubernetes CLI and Helm
- [`kind`](../kind/README.md) — Full-conformance K8s alternative (conflicts)
- [`tilt`](../tilt/README.md) — Live reload for Kubernetes development
- [`skaffold`](../skaffold/README.md) — K8s build and deploy automation
