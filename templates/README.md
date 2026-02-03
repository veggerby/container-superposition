# Templates

Solution-ready devcontainer configurations for common development scenarios.

## Philosophy

These templates are **opinionated, batteries-included** setups that:
- ✅ Use official images and features from [containers.dev](https://containers.dev)
- ✅ Work immediately after copying (no configuration required)
- ✅ Include pre-configured VS Code extensions and settings
- ✅ Optimize for fast builds with proper caching
- ✅ Provide helpful post-create scripts
- ✅ Include comprehensive documentation

We **DO NOT** duplicate what's already available. We **COMPOSE** existing tools into complete solutions.

## Available Templates

### 🟢 node-typescript
**Full-stack Node.js development with TypeScript**

Ideal for: Express APIs, React apps, Next.js, Vite projects, SPAs

Includes:
- Node.js 20 LTS with TypeScript
- ESLint, Prettier, Jest
- Docker-in-Docker for containerization
- GitHub CLI
- Hot reload ready
- npm, pnpm, yarn support

**Use when:** Building modern JavaScript/TypeScript web applications and APIs

---

### 🔵 dotnet-webapi
**C# ASP.NET Core Web API development**

Ideal for: REST APIs, microservices, enterprise applications

Includes:
- .NET 8.0 SDK
- C# Dev Kit and extensions
- Entity Framework Core tools
- Docker-in-Docker
- dotnet-format, dotnet-ef
- Test explorer

**Use when:** Building high-performance C# backend services and APIs

---

### 📚 python-mkdocs
**Documentation with MkDocs and Material theme**

Ideal for: Project documentation, technical writing, knowledge bases

Includes:
- Python 3.12
- MkDocs with Material theme
- Markdown extensions and plugins
- Mermaid diagrams
- Live reload server
- GitHub Pages deployment

**Use when:** Creating beautiful, searchable documentation websites

## Quick Start

### 1. Choose a Template

Browse the templates and find one that matches your project type.

### 2. Copy to Your Project

```bash
# Copy the entire .devcontainer folder
cp -r templates/<template-name>/.devcontainer /path/to/your/project/

# Example:
cp -r templates/node-typescript/.devcontainer /path/to/my-project/
```

### 3. Open in VS Code

```bash
cd /path/to/my-project
code .
```

### 4. Reopen in Container

When prompted, click **"Reopen in Container"**

Or manually: `Cmd/Ctrl + Shift + P` → "Dev Containers: Reopen in Container"

### 5. Wait for Setup

First build takes a few minutes. Subsequent builds are faster due to caching.

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
