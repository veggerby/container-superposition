# Messaging Overlays - Quick Start Examples

This guide provides quick-start commands for using the new messaging overlays.

## Basic Usage

### RabbitMQ (Task Queues)

```bash
# Create a Node.js project with RabbitMQ
container-superposition --stack compose --language nodejs --database rabbitmq

# Create a Python microservice with RabbitMQ
container-superposition --stack compose --language python --database rabbitmq

# Add observability to RabbitMQ setup
container-superposition --stack compose \
  --language nodejs \
  --database rabbitmq \
  --observability prometheus,grafana
```

**Access:**

- AMQP: `amqp://guest:guest@rabbitmq:5672/`
- Management UI: `http://localhost:15672` (guest/guest)

### Redpanda (Event Streaming)

```bash
# Create a Node.js event streaming app
container-superposition --stack compose --language nodejs --database redpanda

# Create a Go data pipeline with Redpanda
container-superposition --stack compose --language go --database redpanda

# Add observability for stream monitoring
container-superposition --stack compose \
  --language nodejs \
  --database redpanda \
  --observability prometheus,grafana
```

**Access:**

- Kafka API: `redpanda:9092`
- Console UI: `http://localhost:8080`
- Schema Registry: `http://redpanda:8081`

### NATS (Pub/Sub Messaging)

```bash
# Create a microservice with NATS
container-superposition --stack compose --language nodejs --database nats

# Create a Python IoT app with NATS
container-superposition --stack compose --language python --database nats

# Microservices with NATS and database
container-superposition --stack compose \
  --language nodejs \
  --database nats,postgres
```

**Access:**

- Client: `nats://nats:4222`
- Monitoring: `http://localhost:8222`

## Multi-Service Examples

### Microservices Architecture

```bash
# Complete microservices stack
container-superposition --stack compose \
  --language nodejs \
  --database postgres,rabbitmq,redis \
  --observability otel-collector,jaeger,prometheus,grafana
```

**Services:**

- PostgreSQL: Persistent data storage
- RabbitMQ: Asynchronous task queues
- Redis: Session/cache storage
- OTEL + Jaeger: Distributed tracing
- Prometheus + Grafana: Metrics and dashboards

### Event-Driven Architecture

```bash
# Event streaming with analytics
container-superposition --stack compose \
  --language nodejs,python \
  --database redpanda,postgres \
  --observability prometheus,grafana
```

**Use Case:**

- Redpanda: Event log aggregation
- PostgreSQL: Analytics database
- Node.js: Event producers/consumers
- Python: Data processing pipelines

### Real-Time Messaging

```bash
# Fast pub/sub with persistence
container-superposition --stack compose \
  --language go \
  --database nats,postgres \
  --cloud-tools kubectl-helm
```

**Use Case:**

- NATS: Real-time updates
- PostgreSQL: Event sourcing
- Go: High-performance services
- Kubernetes: Deployment platform

### Hybrid Messaging

```bash
# All three messaging systems
container-superposition --stack compose \
  --language nodejs \
  --database rabbitmq,nats,redpanda,postgres
```

**Use Case:**

- RabbitMQ: Background jobs
- NATS: Service-to-service communication
- Redpanda: Event log aggregation
- PostgreSQL: Persistent storage

## Port Offset for Multiple Instances

```bash
# First instance (default ports)
container-superposition --stack compose \
  --database rabbitmq \
  --output ./project1

# Second instance (offset by 100)
container-superposition --stack compose \
  --database rabbitmq \
  --port-offset 100 \
  --output ./project2

# Third instance (offset by 200)
container-superposition --stack compose \
  --database rabbitmq \
  --port-offset 200 \
  --output ./project3
```

**Ports:**

- Project 1: RabbitMQ on 5672, Management on 15672
- Project 2: RabbitMQ on 5772, Management on 15772
- Project 3: RabbitMQ on 5872, Management on 15872

## Language-Specific Examples

### Node.js + RabbitMQ

```bash
container-superposition --stack compose \
  --language nodejs \
  --database rabbitmq,postgres \
  --dev-tools docker-sock
```

**Install client:**

```bash
npm install amqplib
```

### Python + Redpanda

```bash
container-superposition --stack compose \
  --language python \
  --database redpanda,postgres
```

**Install client:**

```bash
pip install confluent-kafka
```

### Go + NATS

```bash
container-superposition --stack compose \
  --language go \
  --database nats,redis
```

**Install client:**

```bash
go get github.com/nats-io/nats.go
```

### .NET + All Three

```bash
container-superposition --stack compose \
  --language dotnet \
  --database rabbitmq,redpanda,nats,sqlserver
```

**Install clients:**

```bash
dotnet add package RabbitMQ.Client
dotnet add package Confluent.Kafka
dotnet add package NATS.Client
```

## Cloud Deployment Examples

### AWS with RabbitMQ

```bash
container-superposition --stack compose \
  --language nodejs \
  --database rabbitmq,postgres \
  --cloud-tools aws-cli,terraform
```

### Azure with Redpanda

```bash
container-superposition --stack compose \
  --language dotnet \
  --database redpanda,sqlserver \
  --cloud-tools azure-cli,terraform
```

### GCP with NATS

```bash
container-superposition --stack compose \
  --language go \
  --database nats,postgres \
  --cloud-tools gcloud,kubectl-helm
```

### Kubernetes-Ready

```bash
container-superposition --stack compose \
  --language nodejs \
  --database nats,postgres \
  --cloud-tools kubectl-helm,terraform \
  --observability otel-collector,prometheus
```

## Development Workflow Examples

### Local Development

```bash
# Minimal setup for local dev
container-superposition --stack compose \
  --language nodejs \
  --database rabbitmq
```

### Integration Testing

```bash
# Full services for testing
container-superposition --stack compose \
  --language nodejs \
  --database rabbitmq,postgres,redis \
  --dev-tools playwright
```

### CI/CD Pipeline

```bash
# Automated testing environment
container-superposition --stack compose \
  --language nodejs \
  --database nats,postgres \
  --dev-tools docker-in-docker,pre-commit
```

## Interactive Mode

For guided selection, run without arguments:

```bash
container-superposition
```

The interactive questionnaire will let you select:

1. Base template (compose recommended for messaging)
2. Base image (Debian Bookworm recommended)
3. Language overlays
4. Database/messaging overlays (select multiple)
5. Observability tools
6. Cloud tools
7. Dev tools
8. Port offset (if needed)

## Verification

After generating your devcontainer:

```bash
# Open in VS Code
code your-project/

# VS Code will prompt: "Reopen in Container"
# Click to build and start all services

# Verify services are running
docker-compose ps

# Check RabbitMQ
curl http://localhost:15672

# Check Redpanda Console
curl http://localhost:8080

# Check NATS monitoring
curl http://localhost:8222/varz
```

## Next Steps

1. Review generated `.devcontainer/devcontainer.json`
2. Customize `.env` file (copy from `.env.example`)
3. Review service-specific READMEs:
   - `overlays/rabbitmq/README.md`
   - `overlays/redpanda/README.md`
   - `overlays/nats/README.md`
4. Check [messaging-comparison.md](messaging-comparison.md) for choosing between systems
5. Start coding!

## Troubleshooting

**Port conflicts?**

```bash
# Use port offset
container-superposition --port-offset 100 ...
```

**Service not starting?**

```bash
# Check Docker logs
docker-compose logs rabbitmq
docker-compose logs redpanda
docker-compose logs nats
```

**Need to change configuration?**

```bash
# Edit .devcontainer/.env
cd .devcontainer
cp .env.example .env
# Edit .env with your settings
# Rebuild container in VS Code
```

## Additional Resources

- **Full Documentation**: See individual overlay READMEs
- **Comparison Guide**: [messaging-comparison.md](messaging-comparison.md)
- **Code Examples**: Each README includes Node.js, Python, Go, .NET examples
- **Main Documentation**: `README.md` in repository root
