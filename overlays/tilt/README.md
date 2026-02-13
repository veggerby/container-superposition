# Tilt Overlay

Live update and orchestration for Kubernetes development with real-time feedback.

## Features

- **Tilt** - Smart rebuilds and live updates for Kubernetes
- **Web UI** - Browser-based dashboard on port 10350
- **Live Updates** - See code changes instantly in K8s
- **Smart Builds** - Only rebuild what changed
- **Resource Orchestration** - Manage complex K8s workflows
- **Multi-service Support** - Handle microservices architectures

## How It Works

This overlay installs Tilt, a development tool that orchestrates your Kubernetes development workflow. Tilt watches your code, automatically rebuilds containers, and updates your Kubernetes cluster when files change.

**Suggested overlays:**

- `kind` - Local Kubernetes cluster
- `kubectl-helm` - Kubernetes CLI and Helm

**Conflicts:**

- `skaffold` - Alternative K8s build orchestration tool

## Installation

Tilt is installed automatically during devcontainer creation via `setup.sh`:

- Downloads and installs latest Tilt CLI
- Installs to `/usr/local/bin/tilt`
- Web UI accessible on port 10350

## Common Commands

### Starting Tilt

```bash
# Start Tilt with Tiltfile in current directory
tilt up

# Start Tilt in specific directory
tilt up --file ./services/api/Tiltfile

# Start without opening browser
tilt up --hud=false

# Run in CI mode (no interactive UI)
tilt ci
```

### Managing Resources

```bash
# List resources
tilt get uiresources

# Trigger manual build
tilt trigger <resource-name>

# Disable a resource
tilt disable <resource-name>

# Enable a resource
tilt enable <resource-name>
```

### Logs and Debugging

```bash
# View logs
tilt logs <resource-name>

# Get resource status
tilt get uiresources <resource-name>

# Dump snapshot for debugging
tilt dump engine
```

## Tiltfile Configuration

Create a `Tiltfile` in your project root:

### Basic Example

```python
# Build Docker image
docker_build('myapp', '.')

# Deploy to Kubernetes
k8s_yaml('k8s/deployment.yaml')

# Forward port
k8s_resource('myapp', port_forwards=8000)
```

### Live Update Example

```python
# Build with live update (no rebuild for code changes)
docker_build('myapp', '.',
  live_update=[
    sync('./src', '/app/src'),
    run('npm install', trigger=['package.json']),
    restart_container(),
  ]
)

k8s_yaml('k8s/deployment.yaml')
k8s_resource('myapp', port_forwards=8000)
```

### Multi-Service Example

```python
# API service
docker_build('api', './services/api')
k8s_yaml('./services/api/k8s.yaml')
k8s_resource('api', port_forwards=3000)

# Frontend service
docker_build('frontend', './services/frontend')
k8s_yaml('./services/frontend/k8s.yaml')
k8s_resource('frontend', port_forwards=8080)

# Database (no rebuild needed)
k8s_yaml('./infra/postgres.yaml')
k8s_resource('postgres', port_forwards=5432)
```

### Custom Buttons

```python
# Add custom actions to UI
local_resource(
  'db-migrate',
  'kubectl exec -it deploy/api -- npm run migrate',
  trigger_mode=TRIGGER_MODE_MANUAL,
  auto_init=False
)
```

## Use Cases

- **Microservices development** - Manage multiple services with dependencies
- **Rapid iteration** - See changes instantly without manual rebuilds
- **Team development** - Standardize local development workflow
- **Complex K8s apps** - Orchestrate multi-tier applications
- **Learning Kubernetes** - Simplified K8s development experience

**Integrates well with:**

- `kind` or `k3d` - Local Kubernetes clusters
- `kubectl-helm` - Kubernetes CLI and Helm
- `nodejs`, `python`, `dotnet` - Application development
- `docker-in-docker` - Docker builds

## Web UI

Access Tilt's web dashboard:

- **URL**: http://localhost:10350
- **Features**:
  - Real-time resource status
  - Build logs and errors
  - Resource dependencies graph
  - Manual trigger buttons
  - Performance metrics

The UI auto-opens when you run `tilt up`.

## Benefits vs Skaffold

| Feature              | Tilt                      | Skaffold                  |
| -------------------- | ------------------------- | ------------------------- |
| **UI**               | ✅ Rich web UI            | ⚠️ CLI only               |
| **Live Updates**     | ✅ Sophisticated          | ⚠️ Basic                  |
| **Configuration**    | ✅ Programmable (Python)  | ⚠️ Declarative (YAML)     |
| **Flexibility**      | ✅ Very flexible          | ⚠️ More opinionated       |
| **Learning Curve**   | ⚠️ Steeper                | ✅ Gentler                |
| **CI Integration**   | ✅ Good                   | ✅ Excellent              |

**When to use Tilt:**

- Need rich UI and debugging tools
- Want programmable configuration
- Developing complex microservices
- Value rapid feedback loops

**When to use Skaffold:**

- Prefer declarative configuration
- Focus on CI/CD pipelines
- Want simpler tool
- Need Google Cloud integration

## Troubleshooting

### Tilt Can't Find Kubernetes

Ensure you have a K8s cluster:

```bash
# Create kind cluster
kind create cluster --name dev

# Verify kubectl works
kubectl cluster-info
```

### Build Failures

Check build logs in Tilt UI or:

```bash
tilt logs <resource-name>
```

### Port Already in Use

Change Tilt UI port:

```bash
# In Tiltfile
config.define_string('ui-port', args=False, usage='Tilt UI port')
cfg = config.parse()
tilt_port = cfg.get('ui-port', '10350')
```

Or use port offset when generating devcontainer.

### Live Update Not Working

Ensure your Tiltfile has `live_update` configuration:

```python
docker_build('myapp', '.',
  live_update=[
    sync('./src', '/app/src'),
    restart_container(),
  ]
)
```

## References

- [Tilt Documentation](https://docs.tilt.dev/)
- [Tilt Getting Started](https://docs.tilt.dev/tutorial.html)
- [Tiltfile API Reference](https://docs.tilt.dev/api.html)
- [Tilt Examples](https://github.com/tilt-dev/tilt-example-html)

**Related Overlays:**

- `kind` - Local Kubernetes cluster (suggested)
- `kubectl-helm` - Kubernetes CLI and Helm (suggested)
- `skaffold` - Alternative K8s build tool (conflicts)
- `docker-in-docker` - Docker builds
