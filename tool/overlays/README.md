# Overlays

Overlays are composable configuration fragments that add specific capabilities to your base devcontainer template.

## Structure

Each overlay directory contains:

- `devcontainer.patch.json` - Partial devcontainer configuration to merge
- `docker-compose.yml` (optional) - Service definitions for Docker Compose
- Additional scripts or files as needed

## Available Overlays

### Databases

- **postgres** - PostgreSQL 16 with client tools and environment variables
- **redis** - Redis 7 with redis-tools and persistence

### Development Tools

- **playwright** - Browser automation with Chromium installed
- **azure-cli** - Azure command-line tools
- **kubectl-helm** - Kubernetes CLI and Helm package manager

## Environment Variables

Docker Compose services support customization via `.env` file in your project root:

### PostgreSQL Variables
- `POSTGRES_VERSION` - PostgreSQL version (default: 16)
- `POSTGRES_DB` - Database name (default: devdb)
- `POSTGRES_USER` - Database user (default: postgres)
- `POSTGRES_PASSWORD` - Database password (default: postgres)
- `POSTGRES_PORT` - Port mapping (default: 5432)

### Redis Variables
- `REDIS_VERSION` - Redis version (default: 7)
- `REDIS_PORT` - Port mapping (default: 6379)
- `REDIS_PASSWORD` - Optional password for Redis authentication

### Using .env

1. Copy `.env.example` to your project root as `.env`
2. Customize values as needed
3. Restart your dev container

Example `.env`:
```bash
POSTGRES_PASSWORD=my-secure-password
REDIS_PASSWORD=another-secure-password
POSTGRES_VERSION=15
```

The `.env` file is automatically ignored by git (add to `.gitignore`).

## How Overlays Work

The init tool merges overlay configurations with your base template:

1. Features are deep-merged (package lists concatenated)
2. Environment variables are added
3. Ports are appended to forwardPorts
4. Port attributes are merged for labeled ports
5. Docker Compose files are merged or referenced

## Adding New Overlays

To add a new overlay:

1. Create a directory under `tool/overlays/`
2. Add `devcontainer.patch.json` with the partial configuration
3. Optionally add `docker-compose.yml` for services
4. Update the questionnaire in `scripts/init.ts` to offer the option
