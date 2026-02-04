# Compose Template

Devcontainer with docker-compose for multi-service development environments.

## What's Included

- Debian-based devcontainer service
- Docker-outside-of-Docker for container management
- Network configured for multi-service communication
- Git and essential tools

## Usage

This template is designed to be extended with service overlays:

```bash
npm run init -- --stack compose --db postgres,redis --observability jaeger
```

Overlays will add their services to the docker-compose.yml file.
