# Loki Overlay

Adds Grafana Loki to your development environment for log aggregation and querying.

## What's Included

- Grafana Loki (latest)
- In-memory storage (suitable for development)
- LogQL query engine
- Integration with OpenTelemetry Collector and Grafana

## Ports

- `3100` - Loki HTTP API

## Configuration

Loki is configured via `loki-config.yaml` with:

- **Authentication**: Disabled (auth_enabled: false)
- **Storage**: Filesystem-backed (boltdb-shipper)
- **Retention**: Disabled (manual cleanup required)
- **Ingester**: In-memory ring with single replica

### Adjusting Configuration

Edit `loki-config.yaml` in your project's `.devcontainer` directory.

#### Enable Retention
```yaml
limits_config:
  retention_deletes_enabled: true
  retention_period: 168h  # 7 days
```

#### Increase Memory Limits
```yaml
ingester:
  chunk_idle_period: 10m
  chunk_retain_period: 1m
  max_chunk_age: 2h
```

## Environment Variables

```bash
# Loki version
LOKI_VERSION=latest
```

## Usage

### Sending Logs to Loki

#### Via OpenTelemetry Collector (Recommended)
The otel-collector overlay is pre-configured to send logs to Loki. Just send logs to the collector using OTLP.

#### Direct Push API
```bash
curl -X POST http://localhost:3100/loki/api/v1/push \
  -H "Content-Type: application/json" \
  -d '{
    "streams": [
      {
        "stream": {
          "service": "my-app",
          "level": "info"
        },
        "values": [
          ["'$(date +%s)000000000'", "This is a log message"]
        ]
      }
    ]
  }'
```

#### Using Promtail (Log Shipper)
Add promtail to ship logs from files:

```yaml
# docker-compose.promtail.yml
version: "3.8"
services:
  promtail:
    image: grafana/promtail:latest
    volumes:
      - /var/log:/var/log
      - ./promtail-config.yaml:/etc/promtail/config.yaml
    command: -config.file=/etc/promtail/config.yaml
    networks:
      - devnet
```

### Querying Logs

#### LogQL Query Examples

**All logs from a service:**
```logql
{service="my-app"}
```

**Error logs only:**
```logql
{service="my-app"} |= "error"
```

**JSON log parsing:**
```logql
{service="my-app"} | json | status >= 400
```

**Rate of errors:**
```logql
sum(rate({service="my-app"} |= "error" [5m]))
```

**Top 10 error messages:**
```logql
topk(10, sum by (msg) (rate({service="my-app", level="error"} [1h])))
```

### Using Grafana for Logs

1. Open Grafana: http://localhost:3000
2. Go to **Explore**
3. Select **Loki** datasource
4. Enter LogQL query
5. View logs in real-time

## Log Formats

### Structured Logging (Recommended)

#### Node.js (Pino)
```javascript
const pino = require('pino');
const logger = pino({
  level: 'info',
  formatters: {
    level: (label) => ({ level: label })
  }
});

logger.info({ userId: 123, action: 'login' }, 'User logged in');
```

#### Python (structlog)
```python
import structlog

logger = structlog.get_logger()
logger.info("user.login", user_id=123, ip="192.168.1.1")
```

#### .NET (Serilog)
```csharp
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(new JsonFormatter())
    .CreateLogger();

Log.Information("User {UserId} logged in from {IP}", 123, "192.168.1.1");
```

### Labels vs. Log Content

**Use labels for:**
- Service name
- Environment (dev, staging, prod)
- Log level
- Host/pod name

**Use log content for:**
- Detailed messages
- Variable data (user IDs, transaction IDs)
- Stack traces
- Structured data fields

⚠️ **Warning**: Too many unique label combinations cause high cardinality and performance issues.

## Best Practices

### Label Cardinality
- Keep label combinations low (< 100)
- Don't use user IDs, request IDs, or timestamps as labels
- Use structured log content instead

### Log Levels
Use consistent levels across services:
- `debug` - Detailed debugging information
- `info` - General informational messages
- `warn` - Warning messages
- `error` - Error conditions
- `fatal` - Critical failures

### Retention
Configure retention based on disk space:
```yaml
limits_config:
  retention_deletes_enabled: true
  retention_period: 168h  # 7 days for development
```

Production environments may need longer retention (30-90 days).

## Performance Tips

### Ingestion
- Batch log entries before sending
- Use compression (gzip)
- Limit label cardinality

### Queries
- Add time range filters
- Use specific label selectors
- Avoid regex when possible
- Use LogQL's pipeline operators efficiently

### Storage
- Monitor disk usage
- Enable compression
- Configure appropriate chunk sizes

## Dependencies

Commonly used with:
- **otel-collector** - For centralized log collection
- **grafana** - For log visualization and querying
- **prometheus** - For metrics correlation
- **jaeger** - For trace-log correlation

## Typical Stacks

### Logs Only
```bash
compose + <language> + loki + grafana
```

### Full Observability
```bash
compose + <language> + otel-collector + loki + jaeger + prometheus + grafana
```

With this stack:
1. Application sends logs via OTLP to otel-collector
2. Collector forwards to Loki
3. Grafana displays logs alongside metrics and traces

## Troubleshooting

### Logs not appearing
1. Check Loki is receiving logs: `curl http://localhost:3100/ready`
2. Verify push API: `curl http://localhost:3100/loki/api/v1/push`
3. Check Loki logs: `docker-compose logs loki`

### Out of memory
1. Reduce retention period
2. Decrease chunk sizes
3. Limit ingestion rate

### Slow queries
1. Add label filters first: `{service="app"}`
2. Narrow time range
3. Avoid regex matchers when possible
4. Use metrics for aggregations instead of log parsing

### High cardinality warnings
1. Review labels - remove high-cardinality ones
2. Move variable data to log content
3. Use structured logging with indexed fields
