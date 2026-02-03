# Full Stack Development Template with Observability

Complete full-stack development environment with PostgreSQL, Redis, and a comprehensive observability stack (OpenTelemetry, Jaeger, Prometheus, Grafana, Loki).

## What's Included

### Base Image
- **Microsoft DevContainer**: `base:trixie` (Debian Trixie)
- Minimal base image optimized for DevContainers

### Features (from containers.dev)
- **common-utils**: Zsh, Oh My Zsh, and common development utilities
- **Git**: Latest version with PPA support
- **Node.js**: Version 22 with npm, Yarn support
- **Python**: Version 3.12 with pip and development tools
- **apt-get-packages**: Essential development and database tools (postgresql-client, redis-tools, build-essential, curl, wget, jq, yq, etc.)
- **GitHub CLI**: gh command-line tool
- **Docker-outside-of-Docker**: Access host Docker daemon

### Data Stores

#### PostgreSQL 16
- Full-featured relational database
- Persistent storage with health checks
- Pre-configured connection via environment variables
- Client tools included (psql, pg_isready)

#### Redis 7
- In-memory cache and session store
- AOF persistence enabled
- Health checks configured
- CLI tools included (redis-cli)

### Observability Stack

#### OpenTelemetry Collector
- Central telemetry aggregation hub
- Receives traces, metrics, and logs via OTLP (HTTP/gRPC)
- Exports to Jaeger (traces), Prometheus (metrics), and Loki (logs)
- Debug exporter for development visibility
- Memory limits and batching configured

#### Jaeger
- Distributed tracing UI
- OTLP-compatible collector
- Search and analyze request traces
- Performance bottleneck identification
- Access at: http://localhost:16686

#### Prometheus
- Time-series metrics database
- Scrapes OTel Collector metrics
- Remote write enabled
- Query and alert on metrics
- Access at: http://localhost:9090

#### Grafana
- Unified observability dashboards
- Pre-configured datasources:
  - Prometheus (metrics)
  - Loki (logs)
  - Jaeger (traces)
  - OTel Collector (self-monitoring)
- Create custom dashboards
- Default credentials: admin/admin
- Access at: http://localhost:3100

#### Loki
- Log aggregation system
- 7-day retention for development
- Queryable log streams
- Integration with Grafana
- Access at: http://localhost:3101

### VS Code Extensions
- **ESLint & Prettier**: Code linting and formatting
- **Python & Pylance**: Python development
- **Docker**: Container management
- **YAML**: Configuration file editing
- **Markdown**: Documentation tools
- **GitHub Copilot & Copilot Chat**: AI-powered assistance
- **GitLens**: Git supercharged
- **SQLTools**: Database management
- **Redis Client**: Redis management
- **REST Client**: API testing

### Port Forwarding
Pre-configured ports:
- `3000` - Node.js application
- `5000` - Python application
- `8080` - Alternative application port
- `5432` - PostgreSQL
- `6379` - Redis
- `9090` - Prometheus (metrics UI)
- `3100` - Grafana (dashboards)
- `16686` - Jaeger (tracing UI)
- `3101` - Loki (logs)

## Usage

### Copy to Your Project
```bash
cp -r templates/fullstack/.devcontainer /path/to/your/project/
cd /path/to/your/project
```

### Configure Environment
```bash
# Copy environment template
cp .devcontainer/.env.example .devcontainer/.env

# Edit with your settings (optional, defaults work for development)
nano .devcontainer/.env
```

### Open in VS Code
1. Open your project in VS Code
2. Click "Reopen in Container" when prompted
3. Wait for containers to start (first time takes a few minutes)
4. Services will be automatically started and health-checked

## Connecting to Services

### PostgreSQL

**Command line:**
```bash
# Using psql
psql -h postgres -U appuser -d appdb

# Using environment variables
psql $DATABASE_URL
```

**Connection string:**
```
postgresql://appuser:dev_password@localhost:5432/appdb
```

**From your application:**
```javascript
// Node.js
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});
```

```python
# Python
import psycopg2
conn = psycopg2.connect(os.environ['DATABASE_URL'])
```

### Redis

**Command line:**
```bash
# Using redis-cli
redis-cli -h redis

# Test connection
redis-cli -h redis ping
```

**Connection string:**
```
redis://localhost:6379
```

**From your application:**
```javascript
// Node.js
const redis = require('redis');
const client = redis.createClient({
  url: process.env.REDIS_URL
});
```

```python
# Python
import redis
r = redis.from_url(os.environ['REDIS_URL'])
```

## OpenTelemetry Instrumentation

### Node.js / JavaScript

**Install dependencies:**
```bash
npm install --save \
  @opentelemetry/sdk-node \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http
```

**Create instrumentation file** (`instrumentation.js`):
```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');

const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME || 'my-app',
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/traces'
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/metrics'
    })
  }),
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();
```

**Run your application:**
```bash
node --require ./instrumentation.js app.js
```

### Python

**Install dependencies:**
```bash
pip install \
  opentelemetry-distro \
  opentelemetry-exporter-otlp \
  opentelemetry-instrumentation-flask \
  opentelemetry-instrumentation-psycopg2 \
  opentelemetry-instrumentation-redis
```

**Auto-instrumentation:**
```bash
# Automatically instrument your application
opentelemetry-bootstrap -a install

# Run with instrumentation
opentelemetry-instrument python app.py
```

**Manual instrumentation:**
```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# Setup tracing
trace.set_tracer_provider(TracerProvider())
otlp_exporter = OTLPSpanExporter(
    endpoint=f"{os.getenv('OTEL_EXPORTER_OTLP_ENDPOINT')}/v1/traces"
)
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(otlp_exporter)
)

# Use tracer
tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("my-operation"):
    # Your code here
    pass
```

## Observability Workflow

### 1. View Traces in Jaeger
1. Open http://localhost:16686
2. Select your service from the dropdown
3. Click "Find Traces"
4. Explore request flows, latencies, and errors

### 2. Query Metrics in Prometheus
1. Open http://localhost:9090
2. Use PromQL to query metrics:
   ```promql
   # Request rate
   rate(http_requests_total[5m])
   
   # Request duration
   histogram_quantile(0.95, http_request_duration_seconds_bucket)
   ```

### 3. Build Dashboards in Grafana
1. Open http://localhost:3100 (admin/admin)
2. Create a new dashboard
3. Add panels with different visualizations
4. Query from Prometheus, Loki, or Jaeger datasources
5. Combine traces, metrics, and logs in one view

### 4. Search Logs in Loki
In Grafana:
1. Explore → Select Loki datasource
2. Use LogQL to query:
   ```logql
   {service_name="my-app"} |= "error"
   ```

## Environment Variables

All configuration is done through environment variables in `.devcontainer/.env`:

### Application
- `NODE_ENV`: development/production
- `LOG_LEVEL`: debug/info/warn/error

### Database
- `POSTGRES_HOST`: PostgreSQL hostname
- `POSTGRES_PORT`: PostgreSQL port
- `POSTGRES_DB`: Database name
- `POSTGRES_USER`: Database user
- `POSTGRES_PASSWORD`: Database password
- `DATABASE_URL`: Full connection string (auto-generated)

### Redis
- `REDIS_HOST`: Redis hostname
- `REDIS_PORT`: Redis port
- `REDIS_URL`: Full connection string (auto-generated)

### OpenTelemetry
- `OBSERVABILITY_ENABLED`: Enable/disable observability
- `OTEL_EXPORTER_OTLP_ENDPOINT`: Collector endpoint
- `OTEL_SERVICE_NAME`: Your service name
- `OTEL_SERVICE_VERSION`: Your service version
- `OTEL_DEPLOYMENT_ENVIRONMENT`: development/staging/production
- `OTEL_TRACES_SAMPLER_ARG`: Trace sampling rate (0.0-1.0)
- `OTEL_TRACES_ENABLED`: Enable traces
- `OTEL_METRICS_ENABLED`: Enable metrics
- `OTEL_LOGS_ENABLED`: Enable logs

## Development Workflows

### Create a New Node.js Project
```bash
# Express API
npm init -y
npm install express
npm install --save-dev nodemon

# Create simple server
cat > server.js << 'EOF'
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
EOF

# Run with nodemon
npx nodemon server.js
```

### Create a New Python Project
```bash
# Flask API
pip install flask

# Create simple server
cat > app.py << 'EOF'
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/')
def hello():
    return jsonify(message='Hello World')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
EOF

# Run
python app.py
```

### Database Migrations

**Node.js with Prisma:**
```bash
npm install -D prisma
npx prisma init
npx prisma migrate dev --name init
```

**Python with Alembic:**
```bash
pip install alembic psycopg2-binary
alembic init migrations
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

## Troubleshooting

### Services not starting
```bash
# Check service logs
docker compose -f .devcontainer/docker-compose.yml logs

# Restart services
docker compose -f .devcontainer/docker-compose.yml restart
```

### Database connection issues
```bash
# Check PostgreSQL is ready
pg_isready -h postgres -U appuser

# View logs
docker compose -f .devcontainer/docker-compose.yml logs postgres
```

### Clear all data
```bash
# Stop and remove volumes (WARNING: deletes all data)
docker compose -f .devcontainer/docker-compose.yml down -v
```

### Observability not working
1. Check `OBSERVABILITY_ENABLED=true` in `.env`
2. Verify OTel Collector is running:
   ```bash
   curl http://localhost:4318/v1/traces
   ```
3. Check collector logs:
   ```bash
   docker compose -f .devcontainer/docker-compose.yml logs otel-collector
   ```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 Your Application                     │
│         (Node.js, Python, or other)                 │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │   OpenTelemetry SDK                        │    │
│  │   - Auto-instrumentation                   │    │
│  │   - Custom spans/metrics/logs              │    │
│  └────────────────┬───────────────────────────┘    │
│                   │ OTLP (HTTP/gRPC)                │
└───────────────────┼─────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │  OTel Collector       │
        │  - Receives telemetry │
        │  - Processes & batches│
        │  - Routes to backends │
        └───────┬───────────────┘
                │
        ┌───────┴────────┬──────────┐
        │                │          │
        ▼                ▼          ▼
┌─────────────┐  ┌─────────────┐  ┌─────────┐
│   Jaeger    │  │ Prometheus  │  │  Loki   │
│   Traces    │  │  Metrics    │  │  Logs   │
└──────┬──────┘  └──────┬──────┘  └────┬────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
                ┌──────────────┐
                │   Grafana    │
                │  Dashboards  │
                └──────────────┘
```

## Best Practices

1. **Use environment variables** for all configuration
2. **Enable sampling in production** (set `OTEL_TRACES_SAMPLER_ARG=0.1` for 10%)
3. **Add custom spans** for business-critical operations
4. **Use structured logging** that works well with Loki
5. **Create Grafana dashboards** for key metrics (error rates, latencies, throughput)
6. **Set up alerts** in Grafana for critical conditions
7. **Use trace context propagation** across service boundaries
8. **Monitor database query performance** with traces
9. **Keep sensitive data** out of logs and traces
10. **Document your metrics** and dashboard meanings

## Resources

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Jaeger Documentation](https://www.jaegertracing.io/docs/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
