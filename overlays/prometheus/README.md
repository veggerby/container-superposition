# Prometheus Overlay

Time-series database and monitoring system for collecting and querying metrics from your applications and infrastructure.

## Features

- **Prometheus server** - Latest version with TSDB storage
- **PromQL query language** - Powerful metrics querying and aggregation
- **Persistent storage** - Data survives container restarts
- **Web UI** - Built-in query interface and graph visualization
- **Service discovery** - Auto-discovery of scrape targets
- **Alerting support** - Rule evaluation and alert generation
- **Multi-dimensional data** - Flexible label-based data model

## How It Works

Prometheus is a pull-based monitoring system that periodically scrapes metrics from configured endpoints. It stores time-series data and provides a powerful query language (PromQL) for analysis and alerting.

**Architecture:**
```
┌─────────────────────────────────┐
│   Your Application              │
│   - Exposes /metrics endpoint   │
│   - Returns metrics in text fmt │
└──────────────┬──────────────────┘
               │
               │ HTTP pull (every 15s)
               │
┌──────────────▼──────────────────┐
│   Prometheus Server             │
│   - Scrapes metrics             │
│   - Stores in TSDB              │
│   - Evaluates rules             │
│   - Serves UI (http://...:9090) │
└─────────────────────────────────┘
```

**Metric Types:**
- **Counter** - Monotonically increasing value (requests, errors)
- **Gauge** - Value that can go up or down (memory, temperature)
- **Histogram** - Distribution of values (request durations)
- **Summary** - Similar to histogram, with quantiles

## Configuration

### Ports

- `9090` - Prometheus web UI and HTTP API

### Environment Variables

The overlay includes a `.env.example` file. Copy it to `.env` and customize:

```bash
cd .devcontainer
cp .env.example .env
```

**Available variables:**
```bash
# Prometheus version
PROMETHEUS_VERSION=latest

# Prometheus port (default 9090)
PROMETHEUS_PORT=9090
```

### Prometheus Configuration File

Prometheus is configured via `prometheus.yml` with default scrape targets:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8889']
```

### Adding Custom Scrape Targets

Edit `prometheus.yml` in your project's `.devcontainer` directory:

```yaml
scrape_configs:
  # ... existing configs ...
  
  - job_name: 'my-app'
    static_configs:
      - targets: ['my-app:8080']
    scrape_interval: 5s
    scrape_timeout: 5s
    metrics_path: '/metrics'
    scheme: http
```

### Service Discovery

**File-based service discovery:**
```yaml
scrape_configs:
  - job_name: 'services'
    file_sd_configs:
      - files:
        - '/etc/prometheus/targets/*.json'
        refresh_interval: 30s
```

**targets.json:**
```json
[
  {
    "targets": ["service1:8080", "service2:8080"],
    "labels": {
      "env": "development",
      "team": "backend"
    }
  }
]
```

**Docker service discovery:**
```yaml
scrape_configs:
  - job_name: 'docker'
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
    relabel_configs:
      - source_labels: [__meta_docker_container_name]
        target_label: container
```

### Port Configuration

Ports can be changed via `--port-offset`:

```bash
# Offset all ports by 100
container-superposition --port-offset 100

# Prometheus will be on 9190 instead of 9090
```

## Accessing Prometheus UI

Open your browser to:
```
http://localhost:9090
```

### UI Features

**1. Expression Browser**
- Execute PromQL queries
- View instant values
- Graph time series
- Export to CSV/JSON

**2. Targets**
- View all scrape targets
- Check target health (up/down)
- See last scrape time
- View scrape errors

**3. Rules**
- View recording rules
- View alerting rules
- Check rule evaluation

**4. Alerts**
- See active alerts
- View alert history
- Check alert conditions

**5. Service Discovery**
- View discovered targets
- Check target labels
- Inspect metadata

## PromQL Query Examples

### Basic Queries

**Current value of metric:**
```promql
http_requests_total
```

**Filter by labels:**
```promql
http_requests_total{method="GET", status="200"}
```

**Regular expression matching:**
```promql
http_requests_total{status=~"2.."}  # 2xx status codes
http_requests_total{path!~"/health|/metrics"}  # Exclude paths
```

### Rate and Increase

**Request rate (per second over 5 minutes):**
```promql
rate(http_requests_total[5m])
```

**Request rate by status code:**
```promql
sum by (status) (rate(http_requests_total[5m]))
```

**Total requests in last hour:**
```promql
increase(http_requests_total[1h])
```

**Requests per minute:**
```promql
rate(http_requests_total[1m]) * 60
```

### Aggregation

**Total requests across all instances:**
```promql
sum(rate(http_requests_total[5m]))
```

**Average by service:**
```promql
avg by (service) (http_request_duration_seconds)
```

**Maximum value:**
```promql
max(process_resident_memory_bytes)
```

**Count number of instances:**
```promql
count(up{job="my-app"})
```

**Group by multiple labels:**
```promql
sum by (service, method) (rate(http_requests_total[5m]))
```

### Percentiles and Histograms

**95th percentile latency:**
```promql
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

**99th percentile by endpoint:**
```promql
histogram_quantile(0.99, 
  sum by (le, endpoint) (rate(http_request_duration_seconds_bucket[5m]))
)
```

**Average request duration:**
```promql
rate(http_request_duration_seconds_sum[5m]) / 
rate(http_request_duration_seconds_count[5m])
```

### Error Rate

**Error rate (5xx responses):**
```promql
rate(http_requests_total{status=~"5.."}[5m])
```

**Error ratio:**
```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) /
sum(rate(http_requests_total[5m]))
```

**Percentage of errors:**
```promql
100 * (
  sum(rate(http_requests_total{status=~"5.."}[5m])) /
  sum(rate(http_requests_total[5m]))
)
```

### Prediction and Trending

**Predict value in 1 hour:**
```promql
predict_linear(disk_usage_bytes[1h], 3600)
```

**Derive change over time:**
```promql
deriv(cpu_usage_percent[5m])
```

### Mathematical Operations

**Memory usage percentage:**
```promql
100 * (1 - (node_memory_available_bytes / node_memory_total_bytes))
```

**Rate difference:**
```promql
rate(http_requests_total{status="200"}[5m]) -
rate(http_requests_total{status="200"}[5m] offset 1h)
```

**Compare with offset:**
```promql
http_requests_total - http_requests_total offset 1h
```

## Application Integration

### Node.js (prom-client)

Install dependency:
```bash
npm install prom-client
```

**Basic setup:**
```javascript
const express = require('express');
const promClient = require('prom-client');

const app = express();

// Create registry
const register = new promClient.Registry();

// Collect default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ 
  register,
  prefix: 'myapp_',
});

// Create custom counter
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Create histogram for latency
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register]
});

// Create gauge for active connections
const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register]
});

// Middleware to track metrics
app.use((req, res, next) => {
  const start = Date.now();
  activeConnections.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    });
    
    httpRequestDuration.observe({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    }, duration);
    
    activeConnections.dec();
  });
  
  next();
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.listen(3000);
```

### Python (prometheus_client)

Install dependency:
```bash
pip install prometheus-client
```

**Flask application:**
```python
from flask import Flask, Response
from prometheus_client import Counter, Histogram, Gauge, generate_latest, REGISTRY
from prometheus_client import make_wsgi_app
from werkzeug.middleware.dispatcher import DispatcherMiddleware
import time

app = Flask(__name__)

# Create metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint'],
    buckets=[0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0]
)

ACTIVE_REQUESTS = Gauge(
    'active_requests',
    'Number of active requests'
)

# Middleware to track metrics
@app.before_request
def before_request():
    request._start_time = time.time()
    ACTIVE_REQUESTS.inc()

@app.after_request
def after_request(response):
    duration = time.time() - request._start_time
    
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.endpoint or request.path,
        status=response.status_code
    ).inc()
    
    REQUEST_DURATION.labels(
        method=request.method,
        endpoint=request.endpoint or request.path
    ).observe(duration)
    
    ACTIVE_REQUESTS.dec()
    
    return response

# Expose metrics endpoint
@app.route('/metrics')
def metrics():
    return Response(generate_latest(REGISTRY), mimetype='text/plain')

# Alternative: Use wsgi middleware
app.wsgi_app = DispatcherMiddleware(app.wsgi_app, {
    '/metrics': make_wsgi_app()
})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

### .NET (prometheus-net)

Install package:
```bash
dotnet add package prometheus-net.AspNetCore
```

**ASP.NET Core configuration:**
```csharp
using Prometheus;

var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

// Create custom metrics
var requestCounter = Metrics.CreateCounter(
    "http_requests_total",
    "Total HTTP requests",
    new CounterConfiguration
    {
        LabelNames = new[] { "method", "endpoint", "status" }
    }
);

var requestDuration = Metrics.CreateHistogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    new HistogramConfiguration
    {
        LabelNames = new[] { "method", "endpoint" },
        Buckets = new[] { 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0 }
    }
);

var activeRequests = Metrics.CreateGauge(
    "active_requests",
    "Number of active requests"
);

// Use HTTP metrics middleware
app.UseHttpMetrics(options =>
{
    options.AddCustomLabel("host", context => context.Request.Host.Host);
});

// Expose /metrics endpoint
app.UseMetricServer();  // Uses /metrics by default

// Or specify custom path
// app.MapMetrics("/custom-metrics");

// Custom middleware for additional metrics
app.Use(async (context, next) =>
{
    using (requestDuration
        .WithLabels(context.Request.Method, context.Request.Path)
        .NewTimer())
    {
        activeRequests.Inc();
        
        await next();
        
        activeRequests.Dec();
        
        requestCounter
            .WithLabels(
                context.Request.Method,
                context.Request.Path,
                context.Response.StatusCode.ToString()
            )
            .Inc();
    }
});

app.Run();
```

### Go (prometheus/client_golang)

Install package:
```bash
go get github.com/prometheus/client_golang/prometheus
go get github.com/prometheus/client_golang/prometheus/promhttp
```

**HTTP server with metrics:**
```go
package main

import (
    "net/http"
    "time"
    
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )
    
    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: []float64{0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0},
        },
        []string{"method", "endpoint"},
    )
    
    activeRequests = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_requests",
            Help: "Number of active requests",
        },
    )
)

func init() {
    prometheus.MustRegister(httpRequestsTotal)
    prometheus.MustRegister(httpRequestDuration)
    prometheus.MustRegister(activeRequests)
}

func metricsMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        activeRequests.Inc()
        defer activeRequests.Dec()
        
        // Wrap response writer to capture status code
        wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
        
        next(wrapped, r)
        
        duration := time.Since(start).Seconds()
        
        httpRequestsTotal.WithLabelValues(
            r.Method,
            r.URL.Path,
            http.StatusText(wrapped.statusCode),
        ).Inc()
        
        httpRequestDuration.WithLabelValues(
            r.Method,
            r.URL.Path,
        ).Observe(duration)
    }
}

type responseWriter struct {
    http.ResponseWriter
    statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

func main() {
    http.Handle("/metrics", promhttp.Handler())
    http.HandleFunc("/api/hello", metricsMiddleware(helloHandler))
    
    http.ListenAndServe(":8080", nil)
}

func helloHandler(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("Hello, World!"))
}
```

## Recording Rules

Recording rules pre-compute expensive queries and store results as new time series.

**prometheus.yml:**
```yaml
rule_files:
  - "/etc/prometheus/rules/*.yml"
```

**rules/app_rules.yml:**
```yaml
groups:
  - name: app_rules
    interval: 30s
    rules:
      # Pre-calculate request rate
      - record: job:http_requests:rate5m
        expr: sum by (job) (rate(http_requests_total[5m]))
      
      # Pre-calculate error rate
      - record: job:http_errors:rate5m
        expr: |
          sum by (job) (rate(http_requests_total{status=~"5.."}[5m]))
      
      # Pre-calculate error ratio
      - record: job:http_errors:ratio5m
        expr: |
          job:http_errors:rate5m / job:http_requests:rate5m
      
      # Pre-calculate 95th percentile latency
      - record: job:http_request_duration:p95
        expr: |
          histogram_quantile(0.95, 
            sum by (job, le) (rate(http_request_duration_seconds_bucket[5m]))
          )
```

## Alerting Rules

Define alerts that trigger when conditions are met.

**rules/alerts.yml:**
```yaml
groups:
  - name: app_alerts
    interval: 15s
    rules:
      # Alert when error rate is high
      - alert: HighErrorRate
        expr: |
          (
            sum(rate(http_requests_total{status=~"5.."}[5m])) /
            sum(rate(http_requests_total[5m]))
          ) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"
      
      # Alert when latency is high
      - alert: HighLatency
        expr: |
          histogram_quantile(0.95,
            sum by (le) (rate(http_request_duration_seconds_bucket[5m]))
          ) > 1.0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected"
          description: "95th percentile latency is {{ $value }}s"
      
      # Alert when service is down
      - alert: ServiceDown
        expr: up{job="my-app"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"
      
      # Alert when disk space is low
      - alert: DiskSpaceLow
        expr: |
          (
            node_filesystem_avail_bytes{mountpoint="/"} /
            node_filesystem_size_bytes{mountpoint="/"}
          ) < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk space is running low"
          description: "Only {{ $value | humanizePercentage }} disk space remaining"
```

## Grafana Integration

### Adding Prometheus Data Source

1. Open Grafana: http://localhost:3000
2. Go to **Configuration** → **Data Sources**
3. Click **Add data source**
4. Select **Prometheus**
5. Set URL: `http://prometheus:9090`
6. Click **Save & Test**

### Example Dashboard JSON

```json
{
  "dashboard": {
    "title": "Application Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{status}}"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m]))",
            "legendFormat": "Errors"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Latency (95th percentile)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p95"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

## Best Practices

### Metric Naming Conventions

**✅ Good names:**
- `http_requests_total` - Counter with `_total` suffix
- `http_request_duration_seconds` - Histogram with unit
- `active_connections` - Gauge, no suffix
- `process_cpu_seconds_total` - Counter with unit and `_total`

**❌ Bad names:**
- `requests` - Too generic, no type/unit
- `http_request_duration` - Missing unit
- `activeConnections` - Use snake_case, not camelCase
- `http_requests_count` - Use `_total`, not `_count`

### Label Best Practices

**✅ Good labels:**
```promql
http_requests_total{method="GET", status="200", service="api"}
# Low cardinality, meaningful dimensions
```

**❌ Bad labels:**
```promql
http_requests_total{user_id="12345", timestamp="1234567890"}
# High cardinality, creates millions of time series
```

**Keep label cardinality low:**
- ✅ `status="200"` - ~5-10 values
- ✅ `method="GET"` - ~10 values
- ✅ `service="api"` - ~10-100 values
- ❌ `user_id="12345"` - Millions of values
- ❌ `request_id="abc-123"` - Unique per request
- ❌ `timestamp="..."` - Always unique

### Metric Types Usage

**Counter** - Always increasing values:
```python
# ✅ Correct
requests_total.inc()
errors_total.inc()
bytes_sent_total.inc(size)

# ❌ Wrong
active_connections.inc()  # Use Gauge instead
```

**Gauge** - Values that go up and down:
```python
# ✅ Correct
temperature.set(23.5)
active_connections.inc()
active_connections.dec()
memory_usage.set(1024)

# ❌ Wrong
requests_total.set(100)  # Use Counter instead
```

**Histogram** - Distribution of values:
```python
# ✅ Correct
request_duration.observe(0.234)
response_size.observe(1024)

# Define appropriate buckets
Histogram('http_request_duration_seconds',
  buckets=[0.001, 0.01, 0.1, 1.0, 10.0])
```

### Query Optimization

**Use recording rules for expensive queries:**
```yaml
# Instead of running this complex query repeatedly:
histogram_quantile(0.95, 
  sum by (service, le) (rate(http_request_duration_seconds_bucket[5m]))
)

# Pre-calculate with recording rule:
- record: service:http_request_duration:p95
  expr: |
    histogram_quantile(0.95,
      sum by (service, le) (rate(http_request_duration_seconds_bucket[5m]))
    )
```

**Filter early, aggregate late:**
```promql
# ✅ Good - Filter first
sum(rate(http_requests_total{service="api", status="200"}[5m]))

# ❌ Bad - Aggregate then filter
sum(rate(http_requests_total[5m])) and {service="api"}
```

## Performance Tuning

### Storage Optimization

**Adjust retention:**
```yaml
# docker-compose.yml
services:
  prometheus:
    command:
      - '--storage.tsdb.retention.time=30d'  # Keep 30 days
      - '--storage.tsdb.retention.size=10GB'  # Max 10GB
```

**Tune for write performance:**
```yaml
command:
  - '--storage.tsdb.min-block-duration=2h'
  - '--storage.tsdb.max-block-duration=2h'
```

### Scrape Configuration

**Adjust scrape intervals:**
```yaml
global:
  scrape_interval: 15s      # Default
  scrape_timeout: 10s
  evaluation_interval: 15s  # How often to evaluate rules

scrape_configs:
  - job_name: 'high-frequency'
    scrape_interval: 5s     # Override for specific job
    static_configs:
      - targets: ['app:8080']
  
  - job_name: 'low-frequency'
    scrape_interval: 60s    # Less frequent scraping
    static_configs:
      - targets: ['batch:8080']
```

### Memory Management

**Limit memory usage in docker-compose.yml:**
```yaml
services:
  prometheus:
    mem_limit: 2g
    environment:
      - GOGC=50  # More aggressive garbage collection
```

**Monitor Prometheus itself:**
```promql
# TSDB size
prometheus_tsdb_storage_blocks_bytes

# Number of time series
prometheus_tsdb_head_series

# Ingestion rate
rate(prometheus_tsdb_head_samples_appended_total[5m])
```

## Remote Write/Read

### Remote Write to Long-term Storage

**prometheus.yml:**
```yaml
remote_write:
  - url: "http://remote-storage:9201/write"
    queue_config:
      capacity: 10000
      max_shards: 50
      max_samples_per_send: 5000
    write_relabel_configs:
      - source_labels: [__name__]
        regex: 'expensive_.*'
        action: drop
```

### Remote Read

```yaml
remote_read:
  - url: "http://remote-storage:9201/read"
    read_recent: true
```

## Troubleshooting

### Target not being scraped

**Check targets page:**
```
http://localhost:9090/targets
```

**Verify target is reachable:**
```bash
# From Prometheus container
docker-compose exec prometheus wget -O- http://my-app:8080/metrics

# From dev container
curl http://my-app:8080/metrics
```

**Check logs:**
```bash
docker-compose logs prometheus | grep -i error
```

**Common issues:**
- Wrong hostname (use Docker service name, not localhost)
- Wrong port
- Metrics endpoint not implemented
- Network not shared (check `networks:` in docker-compose)

### Metrics not appearing

**Verify metric format:**
```bash
curl http://localhost:8080/metrics
```

**Should return:**
```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1234
```

**Check:**
- Correct Content-Type: `text/plain; version=0.0.4`
- Metric names follow conventions (snake_case)
- Counter names end with `_total`
- Include unit in name (`_seconds`, `_bytes`)

### High memory usage

**Check time series count:**
```promql
prometheus_tsdb_head_series
```

**If too high (>1 million):**
1. Reduce label cardinality
2. Drop unnecessary metrics with relabel configs
3. Decrease retention time
4. Use recording rules

**Drop metrics:**
```yaml
scrape_configs:
  - job_name: 'my-app'
    static_configs:
      - targets: ['my-app:8080']
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'go_.*|process_.*'  # Drop Go runtime metrics
        action: drop
```

### Slow queries

**Check query stats:**
```
http://localhost:9090/tsdb-status
```

**Optimize queries:**
```promql
# ❌ Slow - Processes all data then filters
rate(http_requests_total[5m]){status="200"}

# ✅ Fast - Filters first
rate(http_requests_total{status="200"}[5m])
```

**Use recording rules for repeated queries:**
```yaml
- record: job:http_requests:rate5m
  expr: sum by (job) (rate(http_requests_total[5m]))
```

### Data not persisting

**Check volume mount:**
```bash
docker volume ls
docker volume inspect <prometheus_volume>
```

**Verify in docker-compose.yml:**
```yaml
services:
  prometheus:
    volumes:
      - prometheus_data:/prometheus

volumes:
  prometheus_data:
```

## Use Cases

### Application Monitoring
- Track request rates and latencies
- Monitor error rates
- Measure business metrics (orders, sign-ups)
- Track API usage

### Infrastructure Monitoring
- CPU, memory, disk usage
- Network traffic
- Container metrics
- Database performance

### SLI/SLO Tracking
- Service availability
- Request latency percentiles
- Error budget consumption
- SLA compliance

### Capacity Planning
- Resource utilization trends
- Growth predictions
- Scaling triggers
- Cost optimization

## Related Overlays

- **grafana** - Visualization and dashboards for Prometheus metrics
- **otel-collector** - Collect metrics via OpenTelemetry and export to Prometheus
- **jaeger** - Correlation between metrics and traces
- **loki** - Correlation between metrics and logs
- **nodejs/python/dotnet/go** - Application frameworks with Prometheus clients

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Best Practices](https://prometheus.io/docs/practices/)
- [Metric Types](https://prometheus.io/docs/concepts/metric_types/)
- [Recording Rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Alerting Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Awesome Prometheus](https://github.com/roaldnefs/awesome-prometheus)

## Notes

- This overlay **requires compose stack** (uses docker-compose)
- Prometheus runs on port **9090** (configurable with port-offset)
- Data persists in Docker volume `prometheus_data`
- Default retention is **15 days** (configurable via command args)
- Use hostname **`prometheus`** from other containers
- Use **`localhost`** from host machine
- Scrape interval defaults to **15 seconds**
