# Prometheus Overlay

Adds Prometheus to your development environment for metrics collection and monitoring.

## What's Included

- Prometheus (latest)
- Pre-configured scrape targets for common services
- Persistent storage volume
- Web UI for querying metrics

## Ports

- `9090` - Prometheus web UI and API

## Configuration

Prometheus is configured via `prometheus.yml` with default scrape targets:

```yaml
scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8889']
```

### Adding Custom Targets

Edit `prometheus.yml` in your project's `.devcontainer` directory:

```yaml
scrape_configs:
  # ... existing configs ...
  
  - job_name: 'my-app'
    static_configs:
      - targets: ['my-app:8080']
    scrape_interval: 5s
    metrics_path: '/metrics'
```

## Environment Variables

```bash
# Prometheus version
PROMETHEUS_VERSION=latest
```

## Usage

### Accessing the UI

Open your browser to:
```
http://localhost:9090
```

### Querying Metrics

#### PromQL Examples

**Request rate (last 5 minutes):**
```promql
rate(http_requests_total[5m])
```

**95th percentile latency:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**Memory usage:**
```promql
process_resident_memory_bytes
```

**Error rate:**
```promql
rate(http_requests_total{status=~"5.."}[5m])
```

### Exposing Metrics from Your Application

#### Node.js
```javascript
const client = require('prom-client');

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Create custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

#### Python
```python
from prometheus_client import Counter, Histogram, generate_latest
from flask import Response

# Define metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration')

# Expose metrics endpoint
@app.route('/metrics')
def metrics():
    return Response(generate_latest(), mimetype='text/plain')
```

#### .NET
```csharp
using Prometheus;

var app = WebApplication.Create(args);

// Expose metrics
app.UseMetricServer();  // Defaults to /metrics

// Create custom metrics
var counter = Metrics.CreateCounter("api_requests_total", "Total API requests");
counter.Inc();

app.Run();
```

## Best Practices

### Metric Naming
- Use snake_case: `http_request_duration_seconds`
- Include unit suffix: `_seconds`, `_bytes`, `_total`
- Use `_total` for counters
- Avoid generic names like `status` or `count`

### Labels
- Keep cardinality low (avoid user IDs, timestamps)
- Use consistent label names across metrics
- Common labels: `method`, `status_code`, `service`, `environment`

### Retention
Default retention is 15 days. Adjust via command args in `docker-compose.yml`:
```yaml
command:
  - '--storage.tsdb.retention.time=30d'
```

## Dependencies

Commonly used with:
- **otel-collector** - For OpenTelemetry metrics pipeline
- **grafana** - For visualization and dashboards
- **jaeger** - For correlation with traces

## Typical Stacks

### Standalone Metrics
```bash
compose + <language> + prometheus + grafana
```

### Full Observability
```bash
compose + <language> + otel-collector + prometheus + jaeger + grafana + loki
```

## Troubleshooting

### Target not being scraped
1. Check prometheus.yml configuration
2. Verify target is reachable: `docker-compose exec devcontainer curl http://target:port/metrics`
3. Check targets status: http://localhost:9090/targets

### High memory usage
1. Reduce retention time
2. Reduce scrape frequency
3. Limit metric cardinality (reduce label combinations)

### Metrics not appearing
1. Ensure metrics endpoint returns text format
2. Check metric names don't conflict
3. Verify Content-Type: `text/plain; version=0.0.4`
