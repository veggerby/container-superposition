# Stack Presets Guide

Container Superposition provides **stack presets** - pre-configured combinations of overlays for common development scenarios. Presets save time by selecting and configuring multiple overlays with sensible defaults.

## What are Presets?

Presets are **meta-overlays** that:

- **Auto-select** multiple overlays at once
- **Configure** integration between services with pre-filled environment variables
- **Provide** usage documentation specific to the stack
- **Allow** customization after selection

## Available Presets

### 1. Web API Stack

**Best for:** REST/GraphQL API development

**Includes:**

- Language choice: Node.js, .NET, Python, Go, or Java
- PostgreSQL database
- Redis cache
- Full observability: OpenTelemetry Collector, Prometheus, Grafana, Loki

**Pre-configured:**

- Database connection strings
- Redis URL
- OpenTelemetry endpoints
- Health check endpoints

**Usage:**

```bash
npm run init
# Select "Web API Stack" when prompted
# Choose your language (e.g., Node.js)
# Customize if needed or use as-is
```

**What you get:**

- `DATABASE_URL` for PostgreSQL
- `REDIS_URL` for Redis
- `OTEL_EXPORTER_OTLP_ENDPOINT` for telemetry
- Grafana dashboard at http://localhost:3000
- Full monitoring stack ready to use

---

### 2. Microservice Stack

**Best for:** Microservices architecture development

**Includes:**

- Language choice: Node.js, .NET, Python, Go, or Java
- Message broker choice: RabbitMQ, Redpanda (Kafka), or NATS
- Distributed tracing: OpenTelemetry Collector, Jaeger
- Monitoring: Prometheus, Grafana

**Pre-configured:**

- Message broker connection URLs
- Distributed tracing endpoints
- Service-to-service communication

**Usage:**

```bash
npm run init
# Select "Microservice Stack"
# Choose language (e.g., Node.js)
# Choose message broker (e.g., RabbitMQ)
```

**What you get:**

- Messaging infrastructure (RabbitMQ/Redpanda/NATS)
- Full distributed tracing in Jaeger
- Metrics and dashboards in Grafana
- Service mesh ready configuration

---

### 3. Documentation Site

**Best for:** Documentation website development with MkDocs

**Includes:**

- MkDocs with Python
- Pre-commit hooks for quality checks
- Modern CLI tools (bat, fd, ripgrep, fzf)

**Pre-configured:**

- MkDocs development server on port 8000
- Pre-commit hooks for markdown linting
- GitHub Pages deployment ready

**Usage:**

```bash
npm run init
# Select "Documentation Site"
# No language choice needed
```

**What you get:**

- MkDocs server: `mkdocs serve`
- Quality checks: `pre-commit install`
- Deploy: `mkdocs gh-deploy`
- Modern CLI tools for productivity

---

### 4. Full-Stack Application

**Best for:** Complete full-stack web applications

**Includes:**

- Node.js (for frontend: React/Vue/Angular)
- Backend language choice: .NET, Python, Go, or Java
- PostgreSQL database
- Redis cache
- MinIO (S3-compatible object storage for file uploads)
- Full observability: OTEL Collector, Prometheus, Grafana, Loki

**Pre-configured:**

- Frontend on port 3000
- Backend on port 8000
- Database, cache, and storage connection strings
- Cross-origin configuration
- Full monitoring

**Usage:**

```bash
npm run init
# Select "Full-Stack Application"
# Choose backend language (e.g., .NET)
```

**What you get:**

- Frontend: Node.js dev server
- Backend: Your chosen language/framework
- Database: PostgreSQL
- Cache: Redis
- Storage: MinIO for file uploads
- Complete observability stack

---

## Using Presets

### Interactive Mode

```bash
npm run init
```

1. Choose "Start from preset" when prompted
2. Select your desired preset
3. Make user choices (language, message broker, etc.)
4. Optionally customize overlay selection
5. Complete questionnaire and generate

### Command-Line Mode

Use a preset as an optional shortcut, then commit the resulting `superposition.yml` as
team-owned intent. You can always author the equivalent flat `overlays:` list directly.

```bash
npm run init -- init --preset web-api
```

For an explicit project-file-first selection, use the flat form and preview it before writing:

```yaml
# superposition.yml
stack: compose
overlays:
    - python
    - postgres
    - redis
    - otel-collector
    - prometheus
    - grafana
    - loki
```

```bash
npm run init -- plan --stack compose --overlays python,postgres,redis,otel-collector,prometheus,grafana,loki
npm run init -- init --no-interactive
```

## Customizing Presets

After selecting a preset, you can:

1. **Add overlays:** Select additional overlays not in the preset
2. **Remove overlays:** Deselect preset overlays you don't need
3. **Change choices:** Pick different language or message broker

Example:

- Select "Web API Stack"
- Choose Node.js as language
- Select "Customize selection"
- Add `docker-sock` for Docker access
- Remove `loki` if you don't need log aggregation

## Glue Configuration

Presets include **glue configuration** that:

### Environment Variables

Pre-configured in `.env.example`:

```bash
# Web API preset
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/myapp
REDIS_URL=redis://redis:6379
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317

# Full-Stack preset
FRONTEND_PORT=3000
BACKEND_PORT=8000
API_URL=http://localhost:8000
MINIO_ENDPOINT=minio:9000
```

### Usage Documentation

Each preset generates `PRESET-README.md` with:

- Service overview
- Connection strings
- Quick start guide
- Next steps

### Port Mappings

Suggested ports (informational):

| Preset       | Service   | Port  |
| ------------ | --------- | ----- |
| Web API      | API       | 8000  |
| Web API      | Grafana   | 3000  |
| Microservice | Service   | 8080  |
| Microservice | Jaeger UI | 16686 |
| Full-Stack   | Frontend  | 3000  |
| Full-Stack   | Backend   | 8000  |

## Generated Receipt

The generated `superposition.json` compatibility/audit receipt can record the preset expansion:

```json
{
    "version": "X.Y.Z",
    "baseTemplate": "compose",
    "preset": "web-api",
    "presetChoices": {
        "language": "python"
    },
    "overlays": ["python", "postgres", "redis", "otel-collector", "prometheus", "grafana", "loki"]
}
```

This is useful for compatibility and audit inspection. The committed `superposition.yml`
remains the canonical shared input for replay and regeneration.

## Creating Custom Presets

To create your own preset:

1. Create `overlays/.presets/my-preset.yml`:

```yaml
id: my-preset
name: My Custom Stack
description: Description of your stack
type: meta
category: preset
supports: [compose] # or [] for both
tags: [preset, custom, ...]

selects:
    required:
        - overlay-1
        - overlay-2

    userChoice:
        language:
            id: language
            prompt: Select language
            options: [nodejs, python, go]
            defaultOption: nodejs

glueConfig:
    environment:
        MY_VAR: 'value'

    portMappings:
        service: 8000

    readme: |
        ## My Custom Stack

        Usage instructions here...
```

2. Keep all preset metadata and definition in that file. Do **not** register it in
   `overlays/index.yml`; that legacy index is not an authoring surface.

3. Test the metadata-driven preset through the live CLI:

```bash
npm run init -- list --category preset
npm run init -- init --preset my-preset
```

## Best Practices

1. **Start with a preset** if it matches your use case - saves time
2. **Customize after selection** to add project-specific needs
3. **Review PRESET-README.md** for usage instructions
4. **Copy .env.example to .env** and customize values
5. **Review `superposition.yml`** to understand and edit the shared selection; inspect `superposition.json` only as a generated compatibility/audit receipt

## FAQ

**Q: Can I change the preset after generating?**
A: No, but you can regenerate with a different preset or manually add/remove overlays using the questionnaire.

**Q: Do presets work with plain template?**
A: Some do! Check the preset's `supports` field. `docs-site` works with both, while most others require `compose`.

**Q: Can I combine presets?**
A: No, you can only select one preset. But you can customize it to add overlays from other presets.

**Q: What if I don't want to use a preset?**
A: Choose "Custom (select overlays manually)" when prompted and build your own configuration.

## Next Steps

- Try each preset to see which fits your workflow
- Read preset-specific READMEs for detailed setup
- Customize presets to match your team's needs
- Create custom presets for your organization's stacks
