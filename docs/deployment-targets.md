# Deployment Target Support

Container Superposition validates overlay compatibility with different deployment environments using the `--target` flag.

## Quick Start

```bash
# Specify deployment target
npx container-superposition init --target codespaces
npx container-superposition init --target gitpod
npx container-superposition init --target local  # default

# With specific configuration
npx container-superposition init \
    --stack compose \
    --language nodejs \
    --database postgres \
    --dev-tools docker-in-docker \
    --target codespaces
```

## Supported Deployment Targets

| Target        | Description                                | Docker Support      | Auto Port Forward |
| ------------- | ------------------------------------------ | ------------------- | ----------------- |
| **local**     | Local machine with Docker Desktop         | ✅ Host Docker      | No                |
| **codespaces** | GitHub Codespaces (cloud IDE)             | ⚠️  DinD only       | Yes               |
| **gitpod**    | Gitpod workspaces                          | ⚠️  DinD only       | Yes               |
| **devpod**    | DevPod client-only environments            | ✅ Host Docker      | No                |

## How It Works

### Interactive Mode

If you select incompatible overlays (e.g., `docker-sock` for Codespaces), the tool will:
- Show which overlays won't work in your target environment
- Suggest compatible alternatives
- Let you choose your deployment target with informed guidance

**Example interaction:**

```
⚠️  Deployment Target Compatibility Check:

Some selected overlays may not work in all environments.

• Docker (host socket)
  Not compatible with: GitHub Codespaces, Gitpod
  Alternatives: Docker-in-Docker

Which environment are you targeting?
❯ 🖥️  Local Development (Docker Desktop)
  ☁️  GitHub Codespaces
  🌐 Gitpod
  📦 DevPod
```

### CLI Mode

The target validates your selection and generates the configuration:
- Incompatibilities are allowed (you know what you're doing)
- Generated documentation notes any compatibility issues

## Example Configurations

### Optimized for GitHub Codespaces

```bash
npx container-superposition init \
    --stack compose \
    --language nodejs \
    --database postgres \
    --dev-tools docker-in-docker \
    --target codespaces
```

### Local Development

```bash
npx container-superposition init \
    --stack compose \
    --language nodejs \
    --database postgres \
    --dev-tools docker-sock \
    --target local
```

## Key Compatibility Rules

- ⚠️ **docker-sock** requires host Docker → Use in `local` or `devpod` only
- ✅ **docker-in-docker** works everywhere → Recommended for `codespaces` and `gitpod`
- 🔄 Cloud targets auto-forward ports → No manual forwarding needed

## Environment Differences

Different environments have different capabilities:

### Codespaces/Gitpod
- **No access to host Docker daemon** - Must use docker-in-docker
- **Auto-forward ports** - Ports are automatically accessible
- **Cloud-based** - Resources may be constrained

### Local
- **Full access to host Docker** - Can use docker-sock for better performance
- **Faster builds** - Shared cache with host
- **Manual port forwarding** - Need to expose ports explicitly

### DevPod
- **Client-managed** - Runs on your infrastructure
- **Can access host Docker** - Depending on setup
- **Flexible** - Configure based on your needs

## Why Deployment Targets?

The target system ensures you get warnings about incompatibilities before deploying. This prevents:
- Wasted time debugging environment-specific issues
- Confusion about why overlays don't work in cloud IDEs
- Having to manually research compatibility

## Configuration

Target configurations are stored in `overlays/.registry/deployment-targets.yml`. To add a new target, simply add an entry to this file:

```yaml
- id: new-target
  name: New Target
  description: Description of the target
  incompatibleOverlays:
      - docker-sock
  recommendations:
      docker-sock:
          - docker-in-docker
  portForwarding:
      defaultBehavior: notify
      autoForward: true
  constraints:
      hasHostDocker: false
      supportsPrivileged: true
```

## See Also

- [Discovery Commands](discovery-commands.md) - Explore overlays before generating
- [Overlays Documentation](overlays.md) - Complete overlay reference
