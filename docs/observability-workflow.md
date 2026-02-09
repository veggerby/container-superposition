# Complete Observability Stack Workflow

This guide demonstrates how to use the complete observability stack with all the enhanced components.

## Overview

The enhanced observability stack provides a complete solution for monitoring, tracing, and logging in development environments.

### Components

**Data Collection:**

- **OpenTelemetry Collector** - Centralized telemetry collection and routing
- **Promtail** - Log shipping with Docker auto-discovery

**Storage Backends:**

- **Tempo** - Lightweight distributed tracing (alternative to Jaeger)
- **Jaeger** - Traditional distributed tracing with built-in UI
- **Prometheus** - Metrics storage and querying
- **Alertmanager** - Alert routing and notification management
- **Loki** - Log aggregation and querying

**Visualization:**

- **Grafana** - Unified observability dashboard with auto-provisioning

**Demo Applications:**

- **OTel Demo (Node.js)** - Sample app with full OTel instrumentation
- **OTel Demo (Python)** - Flask app with OTel instrumentation

## Quick Start

### 1. Create a Complete Observability Stack

```bash
npm run init -- \
  --stack compose \
  --observability otel-collector,tempo,prometheus,alertmanager,loki,promtail,grafana,otel-demo-nodejs
```

This creates a development environment with:

- ✅ Distributed tracing (Tempo)
- ✅ Metrics collection (Prometheus)
- ✅ Alert management (Alertmanager)
- ✅ Log aggregation (Loki)
- ✅ Automated log shipping (Promtail)
- ✅ Unified dashboard (Grafana)
- ✅ Sample instrumented app (Node.js demo)

### 2. Start the Environment

```bash
cd your-project-name
code .
# Dev Containers: Rebuild and Reopen in Container
```

### 3. Access the Tools

Once started, you can access:

- **Grafana** - <http://localhost:3000> (admin/admin)
- **Prometheus** - <http://localhost:9090>
- **Tempo** - <http://localhost:3200>
- **Alertmanager** - <http://localhost:9093>
- **Loki** - <http://localhost:3100>
- **Demo App (Node.js)** - <http://localhost:8080>

## Complete Workflow

### Step 1: Generate Telemetry Data

**Access the demo app:**

```bash
# Open in browser
http://localhost:8080

# Or use curl
curl http://localhost:8080/api/data
curl http://localhost:8080/api/slow
curl http://localhost:8080/api/error
```

**Generate load:**

```bash
# Normal requests
for i in {1..50}; do curl -s http://localhost:8080/api/data > /dev/null; done

# Slow requests (for latency testing)
for i in {1..10}; do curl -s http://localhost:8080/api/slow > /dev/null; done

# Error requests (for alert testing)
for i in {1..5}; do curl -s http://localhost:8080/api/error > /dev/null; done
```

### Step 2: View Traces in Grafana

1. **Open Grafana:** <http://localhost:3000>
2. **Navigate to Explore** (compass icon)
3. **Select Tempo datasource** (top dropdown)
4. **Search for traces:**
    ```traceql
    { service.name = "otel-demo-nodejs" }
    ```
5. **Click on a trace** to see:
    - Request timeline
    - Span details
    - HTTP metadata
    - Custom attributes
    - Related logs (click "Logs for this span")

**Advanced queries:**

```traceql
# Find slow traces
{ duration > 1s }

# Find error traces
{ status = error }

# Find specific endpoint
{ service.name = "otel-demo-nodejs" && name = "GET /api/data" }

# Complex query
{ service.name = "otel-demo-nodejs" && http.status_code >= 500 && duration > 100ms }
```

### Step 3: View Metrics in Grafana

1. **Navigate to Explore**
2. **Select Prometheus datasource**
3. **Run queries:**

**Request rate:**

```promql
rate(http_requests_total{service="otel-demo-nodejs"}[5m])
```

**Request duration (p99):**

```promql
histogram_quantile(0.99,
  rate(http_request_duration_seconds_bucket{service="otel-demo-nodejs"}[5m])
)
```

**Error rate:**

```promql
rate(http_requests_total{service="otel-demo-nodejs", status="500"}[5m])
```

**Active requests:**

```promql
http_requests_active{service="otel-demo-nodejs"}
```

4. **Create dashboard panels:**
    - Click **Add to dashboard**
    - Customize visualization (Graph, Gauge, Stat)
    - Add multiple panels
    - Save dashboard

### Step 4: View Logs in Grafana

1. **Navigate to Explore**
2. **Select Loki datasource**
3. **Query logs:**

**All logs from demo app:**

```logql
{service="otel-demo-nodejs"}
```

**Error logs only:**

```logql
{service="otel-demo-nodejs"} | json | level="error"
```

**Logs for specific trace:**

```logql
{service="otel-demo-nodejs"} | json | `trace.id`="<trace-id-from-tempo>"
```

**Log patterns:**

```logql
{service="otel-demo-nodejs"} | json | unwrap duration | __error__=""
```

4. **Correlate logs with traces:**
    - Find a trace ID in logs
    - Click the trace ID link
    - Grafana jumps to trace view in Tempo

### Step 5: Use Pre-loaded Dashboard

1. **Navigate to Dashboards** (four squares icon)
2. **Open "Observability" folder**
3. **Click "Observability Overview"**

**What's included:**

- HTTP request rate by service and status
- Request duration percentiles (p50, p95, p99)
- Application logs stream

**Customize:**

- Click **Dashboard settings** (gear icon)
- Click **JSON Model** to see structure
- Modify panels and queries
- Save as new dashboard

### Step 6: Test Alerting

**View sample alert rules:**

```bash
cat .devcontainer/alert-rules-alertmanager.yml
```

**Configure Prometheus to use alert rules:**

1. **Edit `.devcontainer/prometheus-prometheus.yml`:**

```yaml
# Add after existing config
alerting:
    alertmanagers:
        - static_configs:
              - targets: ['alertmanager:9093']

rule_files:
    - '/etc/prometheus/alert-rules.yml'
```

2. **Mount alert rules in docker-compose:**

```yaml
# In .devcontainer/docker-compose.yml, prometheus service
volumes:
    - ./alert-rules-alertmanager.yml:/etc/prometheus/alert-rules.yml:ro
```

3. **Restart Prometheus:**

```bash
docker restart prometheus
```

4. **View alerts in Prometheus:**
    - Open <http://localhost:9090/alerts>
    - See firing alerts

5. **View alerts in Alertmanager:**
    - Open <http://localhost:9093>
    - See grouped alerts
    - Create silences
    - Configure receivers

### Step 7: Multi-Language Tracing

**Add Python demo for multi-language testing:**

```bash
# Update your project with Python demo
npm run init -- \
  --stack compose \
  --observability otel-demo-python
```

**Generate traces from both services:**

```bash
# Node.js
curl http://localhost:8080/api/data

# Python
curl http://localhost:8081/api/data
```

**View in Tempo:**

- Search for `{ service.name =~ "otel-demo-.*" }`
- See traces from both services
- Compare instrumentation approaches

## Advanced Scenarios

### Scenario 1: Debugging Slow Requests

1. **Generate slow traffic:**

    ```bash
    for i in {1..10}; do curl http://localhost:8080/api/slow; done
    ```

2. **Find slow traces in Tempo:**

    ```traceql
    { service.name = "otel-demo-nodejs" && duration > 1s }
    ```

3. **Analyze span timing:**
    - Click on trace
    - See which spans took longest
    - Check span events and attributes

4. **Correlate with metrics:**

    ```promql
    histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
    ```

5. **Check logs for context:**
    ```logql
    {service="otel-demo-nodejs"} | json | url="/api/slow"
    ```

### Scenario 2: Investigating Errors

1. **Generate errors:**

    ```bash
    for i in {1..5}; do curl http://localhost:8080/api/error; done
    ```

2. **Find error traces:**

    ```traceql
    { status = error }
    ```

3. **View error rate:**

    ```promql
    rate(http_requests_total{status="500"}[5m])
    ```

4. **Check error logs:**

    ```logql
    {service="otel-demo-nodejs"} | json | level="error"
    ```

5. **Create alert rule:**
    ```yaml
    - alert: HighErrorRate
      expr: rate(http_requests_total{status="500"}[5m]) > 0.05
      for: 5m
      labels:
          severity: critical
    ```

### Scenario 3: Service Dependency Mapping

1. **View service map in Grafana:**
    - Open Tempo trace
    - Click "Service graph" tab
    - See service dependencies

2. **Analyze request flow:**
    - See which services call others
    - View request rates between services
    - Identify bottlenecks

### Scenario 4: Log-Driven Development

1. **Watch logs in real-time:**

    ```logql
    {job="docker"} | json
    ```

2. **Filter by service:**

    ```logql
    {service="otel-demo-nodejs"}
    ```

3. **Search for specific messages:**

    ```logql
    {service="otel-demo-nodejs"} |= "User logged in"
    ```

4. **Jump to traces from logs:**
    - Click trace ID in log line
    - See full request context

## Best Practices

### 1. Instrumentation

**Do:**

- ✅ Use auto-instrumentation when available
- ✅ Add custom spans for business logic
- ✅ Include trace context in logs
- ✅ Use consistent service naming

**Don't:**

- ❌ Over-instrument (creates noise)
- ❌ Log sensitive data
- ❌ Create excessive custom metrics

### 2. Querying

**Do:**

- ✅ Use TraceQL for complex trace queries
- ✅ Use PromQL for metric aggregations
- ✅ Use LogQL for log pattern matching
- ✅ Save frequent queries as dashboards

**Don't:**

- ❌ Query unbounded time ranges
- ❌ Create dashboards with too many panels
- ❌ Ignore query performance

### 3. Alerting

**Do:**

- ✅ Alert on SLOs (error rate, latency)
- ✅ Use meaningful severity levels
- ✅ Include runbook links in alerts
- ✅ Test alert rules regularly

**Don't:**

- ❌ Alert on everything
- ❌ Create alert fatigue
- ❌ Ignore alert context

### 4. Dashboard Design

**Do:**

- ✅ Group related metrics together
- ✅ Use consistent time ranges
- ✅ Add panel descriptions
- ✅ Use variables for filtering

**Don't:**

- ❌ Create single-purpose dashboards
- ❌ Overload with too many panels
- ❌ Use unclear metric names

## Troubleshooting

### No Data in Grafana

**Check each component:**

```bash
# Verify services are running
docker ps

# Check otel-collector is receiving data
docker logs otel-collector | grep -i received

# Check Tempo has traces
curl http://tempo:3200/api/search

# Check Prometheus has metrics
curl http://prometheus:9090/api/v1/targets

# Check Loki has logs
curl "http://loki:3100/loki/api/v1/query" --data-urlencode 'query={job="docker"}'
```

### Traces Not Correlated with Logs

**Ensure trace context in logs:**

```javascript
// Node.js
logger.info({
    msg: 'User action',
    'trace.id': span.spanContext().traceId,
    'span.id': span.spanContext().spanId,
});
```

**Check Loki derived fields:**

- Open Grafana → Configuration → Data Sources → Loki
- Verify derived fields match your log format

### Alerts Not Firing

**Verify Prometheus config:**

```bash
# Check alertmanager targets
curl http://prometheus:9090/api/v1/alertmanagers

# Check alert rules
curl http://prometheus:9090/api/v1/rules

# Check if alerts are evaluating
# Open http://prometheus:9090/alerts
```

## Next Steps

1. **Add custom dashboards** for your specific use cases
2. **Configure alert receivers** (email, Slack, PagerDuty)
3. **Instrument your own applications** with OpenTelemetry
4. **Create SLOs and SLIs** for service reliability
5. **Explore advanced TraceQL** for complex trace analysis

## Resources

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [Tempo Documentation](https://grafana.com/docs/tempo/latest/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/latest/)
- [TraceQL Guide](https://grafana.com/docs/tempo/latest/traceql/)
- [PromQL Guide](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [LogQL Guide](https://grafana.com/docs/loki/latest/logql/)
