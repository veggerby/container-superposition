# Compose Template

Devcontainer with docker-compose for multi-service development environments.

## What's Included

- Debian-based devcontainer service
- Docker-outside-of-Docker for container management
- Network configured for multi-service communication
- Git and essential tools

## Usage

This template is designed to be extended with service overlays. Discover and inspect overlays with `npm run init -- list` and `npm run init -- explain postgres`, then record shared intent:

```yaml
# superposition.yml
stack: compose
overlays:
    - python
    - postgres
    - redis
    - otel-collector
    - jaeger
    - prometheus
    - grafana
```

Preview before writing:

```bash
npm run init -- plan --stack compose --overlays python,postgres,redis,otel-collector,jaeger,prometheus,grafana
npm run init -- init --no-interactive
```

Overlays will add their services to the docker-compose.yml file.
