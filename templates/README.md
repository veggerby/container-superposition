# Templates

Minimal base templates for devcontainer configurations. These are designed to be **composed with overlays** to create your ideal development environment.

## Philosophy

These templates provide a **clean foundation** that:
- ✅ Start minimal - add only what you need via overlays
- ✅ Use official images and features from [containers.dev](https://containers.dev)
- ✅ Support both simple (image-based) and complex (docker-compose) scenarios
- ✅ Enable composability through overlay system
- ✅ Optimize for fast builds with proper caching

We **DO NOT** duplicate what's already available. We **COMPOSE** existing tools into complete solutions.

## Available Templates

### 🟢 plain
**Minimal image-based devcontainer**

Ideal for: Simple projects that don't need additional services

Includes:
- Debian base image
- Common utilities (git, zsh, curl, wget, vim)
- Basic shell enhancements
- Minimal footprint

**Use when:** Building single-service applications without external dependencies

**Compose with:**
- Language overlays (dotnet, nodejs, python, mkdocs)
- Development tools (playwright, aws-cli, azure-cli)

---

### 🔵 compose
**Docker Compose-based devcontainer**

Ideal for: Multi-service applications requiring databases, observability, etc.

Includes:
- Docker Compose infrastructure
- Devcontainer service on shared network
- Docker-outside-of-Docker support
- Ready for service composition

**Use when:** Building applications that need databases, caching, observability stack, or multiple services

**Compose with:**
- Language overlays (dotnet, nodejs, python, mkdocs)
- Databases (postgres, redis)
- Observability (otel-collector, jaeger, prometheus, grafana, loki)
- Cloud tools (aws-cli, azure-cli, kubectl-helm)

---

## Composing with Overlays

Templates are designed to work with the overlay system. Common combinations:

### Web API with Database
```bash
# compose + nodejs + postgres + redis
```

### Microservice with Observability
```bash
# compose + dotnet + postgres + otel-collector + jaeger + prometheus + grafana
```

### Documentation Site
```bash
# plain + mkdocs
```

### Fullstack Application
```bash
# compose + nodejs + python + postgres + redis + otel-collector + jaeger + grafana + loki
```

## Quick Start

### Using the Init Tool (Recommended)

```bash
cd /path/to/your/project
npx @veggerby/container-superposition init
```

The tool will guide you through:
1. Selecting a base template (plain or compose)
2. Choosing language/framework
3. Adding databases
4. Adding observability tools
5. Adding cloud/dev tools

### Manual Setup

1. Copy a template:
```bash
cp -r templates/compose/.devcontainer /path/to/my-project/
```

2. Add overlay configurations manually
3. Merge docker-compose files
4. Update devcontainer.json

The `postCreateCommand` script will:
- Install global tools
- Install project dependencies (if package.json exists)
- Configure the environment
- Display helpful next steps

### 6. Start Developing!

Your environment is ready. Start coding!

## Customization

### Add More Features

Browse [containers.dev/features](https://containers.dev/features) and add to `devcontainer.json`:

```json
{
  "features": {
    "ghcr.io/devcontainers/features/aws-cli:1": {},
    "ghcr.io/devcontainers/features/kubectl-helm-minikube:1": {}
  }
}
```

### Add VS Code Extensions

```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "your.extension.id"
      ]
    }
  }
}
```

### Change Base Image

Replace the `image` in `devcontainer.json` with any image from:
- [containers.dev/images](https://containers.dev/images)
- [Docker Hub](https://hub.docker.com)
- Your custom image

### Modify Post-Create Script

Edit `.devcontainer/post-create.sh` to:
- Install additional global tools
- Run custom initialization
- Configure git
- Set environment variables

## Mixing Templates

You can combine elements from different templates:

1. **Start with one template** as the base
2. **Copy useful scripts** from other templates
3. **Add features** from containers.dev
4. **Include custom features** from `/features`

Example: Start with `node-typescript`, add PostgreSQL from `full-stack-postgres`.

## Template Comparison

| Template | Language | Purpose | Complexity | Best For |
|----------|----------|---------|------------|----------|
| node-typescript | JavaScript/TS | Web Development | Simple | APIs, SPAs, Full-stack apps |
| dotnet-webapi | C# | Backend APIs | Simple | Enterprise APIs, Microservices |
| python-mkdocs | Python | Documentation | Simple | Tech docs, Wikis, Guides |

## Requirements

### System Requirements
- **VS Code** with [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
- **Docker Desktop** or Docker Engine
- **Git** (for cloning and version control)

### Recommended
- 8GB+ RAM (16GB for complex templates)
- SSD for faster container builds
- Good internet connection (first build downloads images)

## Performance Tips

### Fast Builds
- Templates use official images (cached by Docker)
- Layer caching optimizes rebuilds
- Volume mounts persist data across rebuilds

### Resource Usage
- Adjust Docker Desktop memory/CPU limits
- Use `.dockerignore` to exclude unnecessary files
- Clean up unused containers: `docker system prune`

### Development Speed
- Keep the container running (don't rebuild unnecessarily)
- Use hot reload (all templates support it)
- Leverage Nx cache for monorepos

## Troubleshooting

### Build Fails
- Check Docker Desktop is running
- Ensure you have internet connection
- Try: `Rebuild Container` from command palette

### Extensions Not Loading
- Rebuild container: `Cmd/Ctrl + Shift + P` → "Rebuild Container"
- Check extensions are supported in containers

### Slow Performance
- Increase Docker Desktop resources
- Use `.dockerignore` to reduce context size
- Check antivirus isn't scanning Docker files

### Port Already in Use
- Change `forwardPorts` in `devcontainer.json`
- Stop other services using the port
- Use different ports for multiple projects

## Contributing

Have improvements or new templates?

**Good template additions:**
- Solve a specific, common use case
- Use official images and features
- Include comprehensive documentation
- Are well-tested and production-ready
- Follow existing template structure

**Template structure:**
```
templates/your-template/
├── .devcontainer/
│   ├── devcontainer.json     # Main configuration
│   ├── post-create.sh        # Setup script
│   ├── Dockerfile            # (if needed)
│   └── docker-compose.yml    # (if multi-container)
└── README.md                  # Usage documentation
```

## Additional Resources

- [Dev Containers Documentation](https://code.visualstudio.com/docs/devcontainers/containers)
- [Dev Container Specification](https://containers.dev/)
- [Official Features](https://containers.dev/features)
- [Official Images](https://containers.dev/images)
- [VS Code Extension Guide](https://code.visualstudio.com/api/advanced-topics/remote-extensions)
