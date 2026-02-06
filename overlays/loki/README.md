# Loki Overlay

Multi-tenant log aggregation system designed for storing and querying logs from all your applications and infrastructure.

## Features

- **Grafana Loki** - Horizontally scalable, highly available log aggregation
- **LogQL query language** - Inspired by PromQL for familiar syntax
- **Label-based indexing** - Cost-effective storage with selective indexing
- **Persistent storage** - Filesystem-backed with BoltDB
- **Multi-tenancy support** - Isolated log streams per tenant
- **Native Grafana integration** - Seamless visualization in Grafana
- **Compressed storage** - Efficient log storage with compression

## How It Works

Loki is a log aggregation system inspired by Prometheus. Unlike traditional log systems that index the entire log line, Loki only indexes metadata (labels), making it extremely cost-effective for storing large volumes of logs.

**Architecture:**
```
┌─────────────────────────────────┐
│   Application                   │
│   - Sends logs via OTLP         │
│   - Or via Promtail shipper     │
└──────────────┬──────────────────┘
               │
               │ HTTP POST
               │
┌──────────────▼──────────────────┐
│   Grafana Loki                  │
│                                  │
│   Ingester → Storage             │
│   - Index labels only           │
│   - Store logs compressed       │
│   - Query via LogQL             │
│   - API: http://...:3100        │
└─────────────────────────────────┘
               │
               │ Query
               │
┌──────────────▼──────────────────┐
│   Grafana Dashboard             │
│   - Explore logs                │
│   - Build dashboards            │
│   - Alert on log patterns       │
└─────────────────────────────────┘
```

**Key Concepts:**
- **Labels** - Indexed metadata (service, level, host)
- **Log streams** - Unique combination of labels
- **Chunks** - Compressed log data stored on disk
- **LogQL** - Query language for filtering and aggregating logs

## Configuration

### Ports

- `3100` - Loki HTTP API (push, query, health)

### Environment Variables

The overlay includes a `.env.example` file. Copy it to `.env` and customize:

```bash
cd .devcontainer
cp .env.example .env
```

**Available variables:**
```bash
# Loki version
LOKI_VERSION=latest

# Loki port (default 3100)
LOKI_PORT=3100
```

### Loki Configuration File

Loki is configured via `loki-config.yaml`:

**Key sections:**
```yaml
auth_enabled: false          # Disable multi-tenancy auth

server:
  http_listen_port: 3100     # HTTP API port

ingester:                    # In-memory log processing
  chunk_idle_period: 5m      # How long before flushing chunks
  chunk_retain_period: 30s   # Retain in memory after flush
  
schema_config:               # Index schema
  configs:
    - from: 2020-10-24
      store: boltdb-shipper  # Index storage
      object_store: filesystem
      schema: v11

storage_config:              # Where to store data
  boltdb_shipper:
    active_index_directory: /loki/index
  filesystem:
    directory: /loki/chunks

limits_config:
  reject_old_samples: true   # Reject logs older than 168h
  reject_old_samples_max_age: 168h
```

### Enabling Retention

Edit `loki-config.yaml` to enable automatic log deletion:

```yaml
limits_config:
  retention_deletes_enabled: true
  retention_period: 168h  # 7 days for development

compactor:
  working_directory: /loki/compactor
  shared_store: filesystem
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150
```

### Adjusting Performance

```yaml
ingester:
  chunk_idle_period: 10m     # Longer period = larger chunks
  chunk_block_size: 262144   # 256KB chunks
  chunk_retain_period: 1m    # Keep in memory longer
  max_chunk_age: 2h          # Force flush after 2h

limits_config:
  ingestion_rate_mb: 10      # Max MB/s per stream
  ingestion_burst_size_mb: 20
  max_streams_per_user: 10000
  max_line_size: 256000      # 256KB max line size
```

### Port Configuration

Ports can be changed via `--port-offset`:

```bash
# Offset all ports by 100
container-superposition --port-offset 100

# Loki will be on 3200 instead of 3100
```

## Sending Logs to Loki

### Via OpenTelemetry Collector (Recommended)

The otel-collector overlay is pre-configured to forward logs to Loki:

```javascript
// Node.js - Send logs via OTLP
const { logs } = require('@opentelemetry/api-logs');
const { LoggerProvider } = require('@opentelemetry/sdk-logs');
const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-http');

const loggerProvider = new LoggerProvider();
loggerProvider.addLogRecordProcessor(
  new BatchLogRecordProcessor(
    new OTLPLogExporter({
      url: 'http://otel-collector:4318/v1/logs',
    })
  )
);

const logger = loggerProvider.getLogger('my-service');
logger.emit({
  severityText: 'INFO',
  body: 'User logged in',
  attributes: {
    'user.id': '12345',
    'http.method': 'POST',
  },
});
```

### Direct Push API

Send logs directly to Loki's push endpoint:

```bash
curl -X POST http://localhost:3100/loki/api/v1/push \
  -H "Content-Type: application/json" \
  -d '{
    "streams": [
      {
        "stream": {
          "service": "my-app",
          "level": "info",
          "environment": "development"
        },
        "values": [
          ["'$(date +%s)000000000'", "User logged in successfully"],
          ["'$(date +%s)000000000'", "Session created"]
        ]
      }
    ]
  }'
```

**Push format:**
- Timestamp in nanoseconds (string)
- Log line (string)
- Labels in `stream` object

### Using Promtail (Log Shipper)

Promtail tails log files and ships them to Loki:

**docker-compose.promtail.yml:**
```yaml
version: "3.8"
services:
  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log:ro
      - ./promtail-config.yaml:/etc/promtail/config.yaml:ro
    command: -config.file=/etc/promtail/config.yaml
    networks:
      - devnet
    depends_on:
      - loki

networks:
  devnet:
    name: devnet
```

**promtail-config.yaml:**
```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          host: devcontainer
          __path__: /var/log/*.log

  - job_name: application
    static_configs:
      - targets:
          - localhost
        labels:
          job: app
          service: my-app
          __path__: /var/log/app/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            timestamp: time
            message: msg
      - labels:
          level:
      - timestamp:
          source: timestamp
          format: RFC3339
      - output:
          source: message
```

### Using Docker Logging Driver

Send container logs directly to Loki:

```yaml
# docker-compose.yml
services:
  my-app:
    image: my-app:latest
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-batch-size: "400"
        loki-retries: "2"
        labels: "service,environment"
    labels:
      service: "my-app"
      environment: "development"
```

### Using Application Libraries

#### Node.js (Winston + winston-loki)

```bash
npm install winston winston-loki
```

```javascript
const winston = require('winston');
const LokiTransport = require('winston-loki');

const logger = winston.createLogger({
  transports: [
    new LokiTransport({
      host: 'http://loki:3100',
      labels: {
        service: 'my-app',
        environment: 'development',
      },
      json: true,
      format: winston.format.json(),
      replaceTimestamp: true,
      onConnectionError: (err) => console.error(err),
    })
  ]
});

logger.info('User logged in', { userId: '12345', method: 'POST' });
logger.error('Payment failed', { orderId: '67890', error: 'timeout' });
```

#### Python (python-logging-loki)

```bash
pip install python-logging-loki
```

```python
import logging
import logging_loki

handler = logging_loki.LokiHandler(
    url="http://loki:3100/loki/api/v1/push",
    tags={"service": "my-app", "environment": "development"},
    version="1",
)

logger = logging.getLogger("my-app")
logger.addHandler(handler)
logger.setLevel(logging.INFO)

logger.info("User logged in", extra={"user_id": "12345"})
logger.error("Database connection failed", extra={"db": "postgres", "retry": 3})
```

#### Go (grafana/loki-client-go)

```bash
go get github.com/grafana/loki-client-go/loki
```

```go
package main

import (
    "github.com/grafana/loki-client-go/loki"
    "github.com/prometheus/common/model"
)

func main() {
    cfg := loki.Config{
        URL: "http://loki:3100",
    }
    
    client, err := loki.New(cfg)
    if err != nil {
        panic(err)
    }
    defer client.Stop()
    
    labels := model.LabelSet{
        "service":     "my-app",
        "environment": "development",
        "level":       "info",
    }
    
    client.Handle(labels, time.Now(), "User logged in successfully")
}
```

## Querying Logs with LogQL

### Basic Queries

**All logs from a service:**
```logql
{service="my-app"}
```

**Logs from multiple services:**
```logql
{service=~"api|web"}
```

**Exclude specific services:**
```logql
{service!="health-check"}
```

**Multiple label filters:**
```logql
{service="api", environment="production", level="error"}
```

### Line Filtering

**Logs containing text (case-sensitive):**
```logql
{service="my-app"} |= "error"
```

**Logs NOT containing text:**
```logql
{service="my-app"} != "debug"
```

**Case-insensitive search:**
```logql
{service="my-app"} |~ "(?i)error"
```

**Regex pattern:**
```logql
{service="my-app"} |~ "user_id=[0-9]+"
```

**Multiple filters:**
```logql
{service="my-app"} |= "error" != "timeout" |~ "database"
```

### Parsing and Formatting

**JSON parsing:**
```logql
{service="my-app"} | json
```

**JSON parsing with field extraction:**
```logql
{service="my-app"} | json | status_code >= 400
```

**Logfmt parsing:**
```logql
{service="my-app"} | logfmt | level="error"
```

**Pattern extraction:**
```logql
{service="my-app"} | pattern `<ip> - - <_> "<method> <uri> <_>" <status> <_>`
```

**Regex extraction:**
```logql
{service="my-app"} | regexp `user_id=(?P<user_id>\d+)`
```

**Line formatting:**
```logql
{service="my-app"} | json | line_format "{{.level}}: {{.message}}"
```

**Label formatting:**
```logql
{service="my-app"} | json | label_format user="user_{{.user_id}}"
```

### Aggregations and Metrics

**Count log lines:**
```logql
count_over_time({service="my-app"}[5m])
```

**Rate of log lines (per second):**
```logql
rate({service="my-app"}[5m])
```

**Sum of extracted values:**
```logql
sum(rate({service="my-app"} | json | __error__="" [5m]))
```

**Rate of errors:**
```logql
sum(rate({service="my-app"} |= "error" [5m]))
```

**Error ratio:**
```logql
sum(rate({service="my-app"} |= "error" [5m])) / 
sum(rate({service="my-app"} [5m]))
```

**Bytes processed:**
```logql
sum(bytes_over_time({service="my-app"}[5m]))
```

**Bytes rate:**
```logql
sum(bytes_rate({service="my-app"}[5m]))
```

### Aggregation Functions

**Sum by label:**
```logql
sum by (service) (rate({environment="production"}[5m]))
```

**Average:**
```logql
avg(rate({service="my-app"} | json | unwrap response_time [5m]))
```

**Min/Max:**
```logql
min(rate({service="my-app"} | json | unwrap duration [5m]))
max(rate({service="my-app"} | json | unwrap duration [5m]))
```

**Count distinct:**
```logql
count(count by (user_id) ({service="my-app"} | json))
```

**Top K:**
```logql
topk(10, sum by (endpoint) (rate({service="api"}[5m])))
```

**Bottom K:**
```logql
bottomk(5, avg by (service) (rate({environment="production"}[1h])))
```

### Advanced Queries

**Quantile (percentile):**
```logql
quantile_over_time(0.95, 
  {service="my-app"} | json | unwrap response_time [5m]
)
```

**Histogram:**
```logql
histogram_over_time(
  {service="my-app"} | json | unwrap duration [5m]
)
```

**Stddev/Stdvar:**
```logql
stddev_over_time({service="my-app"} | json | unwrap latency [5m])
```

**IP filtering:**
```logql
{service="nginx"} 
  | json 
  | remote_addr != "127.0.0.1" 
  | remote_addr !~ "192.168.*"
```

**Complex parsing and filtering:**
```logql
{service="my-app"} 
  | json 
  | level="error" 
  | http_status >= 500 
  | duration > 1000 
  | line_format "{{.timestamp}} [{{.level}}] {{.message}}"
```

## Structured Logging Best Practices

### Node.js (Pino)

```bash
npm install pino pino-pretty
```

```javascript
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    service: 'my-app',
    environment: process.env.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Structured logging
logger.info(
  { userId: '12345', action: 'login', ip: '192.168.1.1' },
  'User logged in successfully'
);

logger.error(
  { 
    userId: '12345', 
    orderId: '67890', 
    error: 'timeout',
    duration: 5000 
  },
  'Payment processing failed'
);

// With child loggers
const requestLogger = logger.child({ requestId: 'abc-123' });
requestLogger.info('Processing request');
```

### Python (structlog)

```bash
pip install structlog
```

```python
import structlog

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Bind context
logger = logger.bind(service="my-app", environment="production")

# Log with structure
logger.info(
    "user.login",
    user_id="12345",
    ip="192.168.1.1",
    method="POST"
)

logger.error(
    "payment.failed",
    user_id="12345",
    order_id="67890",
    error="timeout",
    duration_ms=5000
)
```

### .NET (Serilog)

```bash
dotnet add package Serilog.AspNetCore
dotnet add package Serilog.Sinks.Console
dotnet add package Serilog.Formatting.Compact
```

```csharp
using Serilog;
using Serilog.Formatting.Compact;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .Enrich.WithProperty("Service", "my-app")
    .Enrich.WithProperty("Environment", "production")
    .Enrich.FromLogContext()
    .WriteTo.Console(new CompactJsonFormatter())
    .CreateLogger();

// Structured logging
Log.Information(
    "User {UserId} logged in from {IpAddress}",
    "12345",
    "192.168.1.1"
);

Log.Error(
    "Payment processing failed for order {OrderId}: {Error}",
    "67890",
    "timeout"
);

// With scoped properties
using (LogContext.PushProperty("RequestId", "abc-123"))
{
    Log.Information("Processing request");
}
```

### Go (zap)

```bash
go get go.uber.org/zap
```

```go
package main

import "go.uber.org/zap"

func main() {
    logger, _ := zap.NewProduction()
    defer logger.Sync()
    
    logger = logger.With(
        zap.String("service", "my-app"),
        zap.String("environment", "production"),
    )
    
    // Structured logging
    logger.Info("User logged in",
        zap.String("user_id", "12345"),
        zap.String("ip", "192.168.1.1"),
        zap.String("method", "POST"),
    )
    
    logger.Error("Payment processing failed",
        zap.String("user_id", "12345"),
        zap.String("order_id", "67890"),
        zap.String("error", "timeout"),
        zap.Int("duration_ms", 5000),
    )
}
```

## Grafana Integration

### Adding Loki Data Source

1. Open Grafana: http://localhost:3000
2. Go to **Configuration** → **Data Sources**
3. Click **Add data source**
4. Select **Loki**
5. Set URL: `http://loki:3100`
6. Click **Save & Test**

### Exploring Logs in Grafana

1. Click **Explore** (compass icon)
2. Select **Loki** data source
3. Enter LogQL query
4. Adjust time range
5. Click **Run query**

**Features:**
- Live tailing (follow logs in real-time)
- Log context (view surrounding log lines)
- Log labels (filter by clicking labels)
- Share query link
- Export to dashboard

### Creating Dashboards

**Log volume panel:**
```logql
sum(rate({service="my-app"}[1m]))
```

**Error rate panel:**
```logql
sum(rate({service="my-app"} |= "error" [5m]))
```

**Response time distribution:**
```logql
histogram_over_time(
  {service="my-app"} | json | unwrap response_time [5m]
)
```

### Alerting on Logs

Create an alert rule in Grafana:

```logql
# Alert if error rate > 10 per minute
sum(rate({service="my-app"} |= "error" [5m])) > 10
```

**Alert configuration:**
- Evaluation interval: 1m
- For: 5m (alert after 5 minutes)
- Notification channel: Slack, email, PagerDuty

## Best Practices

### Label Strategy

**✅ Good labels (low cardinality):**
```json
{
  "service": "api",
  "environment": "production",
  "level": "error",
  "host": "server-1"
}
```

**❌ Bad labels (high cardinality):**
```json
{
  "user_id": "12345",      // Millions of unique values
  "request_id": "abc-123",  // Every request unique
  "timestamp": "..."        // Always unique
}
```

**Rule:** Keep total unique label combinations under 100-1000.

### Label vs. Log Content

**Use labels for:**
- Service identification
- Environment (dev/staging/prod)
- Log level (debug/info/warn/error)
- Component/module
- Deployment/cluster

**Use log content for:**
- User IDs, transaction IDs
- Error messages
- Detailed context
- Variable data
- Metrics to extract

### Log Levels

Use consistent levels:
```javascript
logger.debug({ details: '...' }, 'Detailed debugging');
logger.info({ user: '123' }, 'Normal operation');
logger.warn({ threshold: 80 }, 'Warning condition');
logger.error({ err }, 'Error occurred');
logger.fatal({ err }, 'Fatal error, exiting');
```

### Performance Optimization

**Batch log entries:**
```javascript
// Bad: One network request per log
logger.info('Log 1');
logger.info('Log 2');

// Good: Batch multiple logs
const batch = [
  { timestamp: Date.now(), message: 'Log 1' },
  { timestamp: Date.now(), message: 'Log 2' },
];
sendBatch(batch);
```

**Use appropriate retention:**
```yaml
limits_config:
  retention_period: 168h  # 7 days for dev
  # retention_period: 2160h  # 90 days for prod
```

**Limit log line size:**
```yaml
limits_config:
  max_line_size: 256000  # 256KB
```

**Rate limiting:**
```yaml
limits_config:
  ingestion_rate_mb: 10
  ingestion_burst_size_mb: 20
```

## Troubleshooting

### Logs not appearing

**Check Loki is running:**
```bash
docker-compose ps loki
docker-compose logs loki
```

**Check Loki health:**
```bash
curl http://localhost:3100/ready
# Should return: ready

curl http://localhost:3100/metrics
# Should return Prometheus metrics
```

**Test push API:**
```bash
curl -X POST http://localhost:3100/loki/api/v1/push \
  -H "Content-Type: application/json" \
  -d '{
    "streams": [{
      "stream": {"test": "value"},
      "values": [["'$(date +%s)000000000'", "test log"]]
    }]
  }'
```

**Query for test logs:**
```bash
curl 'http://localhost:3100/loki/api/v1/query?query={test="value"}'
```

### Out of memory

**Reduce chunk sizes:**
```yaml
ingester:
  chunk_block_size: 131072  # 128KB (default 256KB)
  chunk_idle_period: 3m     # Flush more frequently
```

**Enable retention:**
```yaml
limits_config:
  retention_deletes_enabled: true
  retention_period: 168h  # 7 days
```

**Limit ingestion rate:**
```yaml
limits_config:
  ingestion_rate_mb: 5      # Reduce from 10
  max_streams_per_user: 5000
```

**Check memory usage:**
```bash
docker stats loki
```

### Slow queries

**Add label filters:**
```logql
# ✅ Good - Specific labels
{service="my-app", level="error"}

# ❌ Bad - No label filters
{} |= "error"
```

**Narrow time range:**
```logql
# Query last 5 minutes, not last 24 hours
{service="my-app"}[5m]
```

**Avoid expensive parsing:**
```logql
# ❌ Slow - Parses all lines
{service="my-app"} | json | user_id="12345"

# ✅ Fast - Filter first, then parse
{service="my-app"} |= "12345" | json | user_id="12345"
```

**Use metrics for aggregations:**
```logql
# For high-volume logs, use Prometheus for metrics
# Use Loki for actual log content
```

### High cardinality warnings

**Check stream count:**
```bash
curl http://localhost:3100/loki/api/v1/streams
```

**Fix high cardinality:**
```yaml
# Before (bad):
labels:
  user_id: "12345"        # Millions of streams
  request_id: "abc-123"   # Every request creates new stream

# After (good):
labels:
  service: "my-app"       # Few streams
  level: "info"           # Few streams
# Move user_id to log content:
message: "User 12345 logged in"
```

**Monitor ingester streams:**
```promql
loki_ingester_streams
```

### Data not persisting

**Check volume mount:**
```bash
docker volume ls | grep loki
docker volume inspect <loki_volume>
```

**Verify configuration:**
```yaml
storage_config:
  boltdb_shipper:
    active_index_directory: /loki/index
  filesystem:
    directory: /loki/chunks
```

**Check disk space:**
```bash
docker-compose exec loki df -h /loki
```

## Use Cases

### Application Logging
- Centralized log aggregation from microservices
- Error tracking and debugging
- Audit trails and compliance logs
- Request/response logging

### Infrastructure Monitoring
- System logs (syslog, journald)
- Container logs (Docker, Kubernetes)
- Network device logs
- Security logs

### Correlation with Metrics and Traces
- Link logs to traces via trace ID
- Correlate errors with metrics spikes
- Debug performance issues
- Root cause analysis

### Real-time Monitoring
- Live log tailing in Grafana
- Alert on log patterns
- Security incident detection
- Business event tracking

## Related Overlays

- **grafana** - Visualization and querying interface for Loki
- **otel-collector** - Centralized telemetry collection (logs, traces, metrics)
- **prometheus** - Metrics correlation with logs
- **jaeger** - Trace-log correlation
- **nodejs/python/dotnet/go** - Application frameworks with structured logging

## Additional Resources

- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Best Practices](https://grafana.com/docs/loki/latest/best-practices/)
- [Promtail Configuration](https://grafana.com/docs/loki/latest/clients/promtail/)
- [Loki API](https://grafana.com/docs/loki/latest/api/)
- [Label Best Practices](https://grafana.com/docs/loki/latest/best-practices/#labels)

## Notes

- This overlay **requires compose stack** (uses docker-compose)
- Loki runs on port **3100** (configurable with port-offset)
- Data persists in Docker volume `loki_data`
- Default retention is **disabled** (enable in config for auto-cleanup)
- Keep label cardinality **low** (< 1000 unique combinations)
- Use hostname **`loki`** from other containers
- Use **`localhost`** from host machine
- Index only labels, not log content (cost-effective storage)
- Use **structured logging** for better queryability
