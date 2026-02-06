# Docker (Host Socket) Overlay

Access the host Docker daemon by mounting the Docker socket. This is Docker-outside-of-Docker (DooD).

## Features

- **Docker CLI** - Docker command-line interface
- **Docker Compose** - Multi-container orchestration
- **Host Socket Mount** - `/var/run/docker.sock` mounted from host
- **Fast Performance** - Shares images and cache with host

## How It Works

This overlay mounts the host's Docker socket into the container, allowing the container to control the host's Docker daemon directly. This is also known as "Docker-outside-of-Docker" (DooD).

**Mount configuration:**
```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker-host.sock
```

## Use Cases

- **Building containers** - Build Docker images from within the dev container
- **docker-compose testing** - Test multi-service applications
- **CI/CD parity** - Simulate CI build environments locally
- **Container management** - Start/stop containers from dev environment

## Benefits vs Docker-in-Docker

| Feature | Docker-outside-of-Docker (This) | Docker-in-Docker |
|---------|--------------------------------|------------------|
| **Performance** | ✅ Fast (shared cache) | ⚠️ Slower |
| **Disk Usage** | ✅ Efficient (shared images) | ❌ Duplicates images |
| **Networking** | ✅ Simple | ⚠️ Complex |
| **Security** | ⚠️ Host access | ✅ Isolated |
| **Portability** | ⚠️ Local only | ✅ Works in Codespaces |

## Common Commands

### Build Images

```bash
# Build from Dockerfile
docker build -t myapp:latest .

# Build with build args
docker build --build-arg NODE_VERSION=20 -t myapp .

# Multi-stage build
docker build --target production -t myapp:prod .
```

### Run Containers

```bash
# Run container
docker run -d -p 8080:80 nginx

# Run with volume mount
docker run -v $(pwd):/app myapp

# Run with environment variables
docker run -e DATABASE_URL=postgres://... myapp
```

### Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Image Management

```bash
# List images
docker images

# Remove image
docker rmi myapp:latest

# Prune unused images
docker image prune -a

# Pull image
docker pull nginx:latest
```

### Container Management

```bash
# List running containers
docker ps

# List all containers
docker ps -a

# Stop container
docker stop CONTAINER_ID

# Remove container
docker rm CONTAINER_ID

# Execute command in container
docker exec -it CONTAINER_ID bash
```

## Security Considerations

⚠️ **Important Security Implications**

### Host Docker Access

Mounting `/var/run/docker.sock` grants **full control** over the host Docker daemon:

- ✅ **Can create containers** with host mounts
- ✅ **Can access host filesystem** via volume mounts
- ✅ **Can run privileged containers**
- ⚠️ **Equivalent to root access on host**

### Security Best Practices

1. **Use in trusted environments only** - Development machines, not production
2. **Don't expose to untrusted users** - Anyone with container access has Docker control
3. **Audit Docker commands** - Be aware of what containers you create
4. **Limit volume mounts** - Avoid mounting sensitive host directories
5. **Consider alternatives** - Use Docker-in-Docker for untrusted environments

### When NOT to Use

- **Multi-tenant environments** - Users should not share Docker access
- **Production containers** - Use proper orchestration (Kubernetes)
- **Untrusted code** - Malicious code can escape container
- **GitHub Codespaces** - Use Docker-in-Docker instead (this requires local Docker)

### When to Use

- ✅ **Local development** - Building/testing on your machine
- ✅ **CI/CD simulation** - Mimic CI build environment locally
- ✅ **Container development** - Building containerized apps
- ✅ **Testing docker-compose** - Multi-service application development

## Troubleshooting

### Permission denied on Docker socket

```bash
# Check socket permissions
ls -l /var/run/docker-host.sock

# Verify Docker feature configured correctly
# The devcontainers feature should handle user permissions automatically
```

### Docker daemon not accessible

Ensure Docker Desktop (or Docker daemon) is running on your host machine.

### Network conflicts

```bash
# List Docker networks
docker network ls

# Remove conflicting network
docker network rm NETWORK_NAME
```

### Can't connect to containers

When running containers from within the dev container, they are on the host's Docker network. Access them via:
- **`localhost`** - For published ports (e.g., `-p 8080:80`)
- **Container name** - If using custom networks
- **Host IP** - Check with `ip addr show docker0`

## Docker-in-Docker Alternative

If you need isolation or are working in GitHub Codespaces, use the **docker-in-docker** overlay instead:

- ✅ **Isolated** - Separate Docker daemon
- ✅ **Portable** - Works in Codespaces
- ❌ **Slower** - Nested virtualization overhead
- ❌ **Larger** - Duplicates images

**Switch overlays:**
```bash
# Remove this overlay, add docker-in-docker
# Conflicts are enforced in index.yml
```

## Best Practices

1. **Use .dockerignore** - Exclude unnecessary files from build context
2. **Multi-stage builds** - Reduce final image size
3. **Layer caching** - Order Dockerfile commands for optimal caching
4. **Clean up** - Regularly prune unused images/containers
5. **Named volumes** - Use Docker volumes instead of bind mounts when possible
6. **Network isolation** - Use custom networks for container communication

## Common Workflows

### Building and Testing

```bash
# Build application
docker build -t myapp:dev .

# Run tests
docker run --rm myapp:dev npm test

# Run application
docker run -p 3000:3000 myapp:dev
```

### Docker Compose Development

```bash
# Start all services
docker-compose up -d

# Watch logs
docker-compose logs -f app

# Rebuild specific service
docker-compose up -d --build app

# Run command in service
docker-compose exec app bash
```

## Related Overlays

- **docker-in-docker** - Conflicts with this overlay (use one or the other)
- **kubectl-helm** - For Kubernetes development
- **nodejs/python/dotnet** - Build containerized applications
- **postgres/redis** - Database services (can run via Docker)

## Notes

- This overlay conflicts with **docker-in-docker** - only one can be selected
- Requires Docker Desktop (or Docker daemon) running on host
- Does **not** work in GitHub Codespaces (use docker-in-docker instead)
- Socket mount path: `/var/run/docker-host.sock`
