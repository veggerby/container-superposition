# Grafana Overlay

Adds Grafana to your development environment for metrics, logs, and traces visualization.

## What's Included

- Grafana (latest)
- Pre-configured datasources (Prometheus, Loki, Jaeger)
- Persistent storage for dashboards and settings
- Admin credentials configurable via environment variables

## Ports

- `3000` - Grafana web UI

## Default Credentials

```
Username: admin
Password: admin
```

Change these via environment variables (see below).

## Configuration

### Pre-configured Datasources

The overlay includes `grafana-datasources.yml` with:

- **Prometheus** - http://prometheus:9090 (default datasource)
- **Loki** - http://loki:3100
- **Jaeger** - http://jaeger:16686

These are automatically configured when Grafana starts.

### Adding Custom Datasources

Edit `grafana-datasources.yml` in your project's `.devcontainer` directory:

```yaml
apiVersion: 1

datasources:
    # ... existing datasources ...

    - name: PostgreSQL
      type: postgres
      url: postgres:5432
      database: devdb
      user: postgres
      secureJsonData:
          password: postgres
      jsonData:
          sslmode: disable
```

## Environment Variables

```bash
# Grafana version
GRAFANA_VERSION=latest

# Admin credentials (change these!)
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=admin
```

⚠️ **Security**: Change the admin password for any environment accessible beyond localhost.

## Usage

### Accessing Grafana

1. Open your browser to: http://localhost:3000
2. Log in with admin credentials
3. Start creating dashboards or importing existing ones

### Creating Dashboards

#### Prometheus Metrics Dashboard

1. Click **+** → **Dashboard** → **Add visualization**
2. Select **Prometheus** datasource
3. Enter a PromQL query:
    ```promql
    rate(http_requests_total[5m])
    ```
4. Customize visualization type (Graph, Gauge, Stat, etc.)
5. Save dashboard

#### Loki Logs Dashboard

1. Add visualization → Select **Loki**
2. Enter LogQL query:
    ```logql
    {service="my-app"} |= "error"
    ```
3. Use **Logs** panel type for log streaming

#### Jaeger Traces Dashboard

1. Add visualization → Select **Jaeger**
2. Search for traces by service name or trace ID
3. Visualize trace spans and timing

### Importing Dashboards

Grafana has thousands of community dashboards at https://grafana.com/grafana/dashboards/

Example imports:

- **Node Exporter Full** (ID: 1860) - System metrics
- **Loki Dashboard** (ID: 13639) - Log analysis
- **Jaeger Dashboard** (ID: 12628) - Trace visualization

To import:

1. Go to **Dashboards** → **Import**
2. Enter dashboard ID or paste JSON
3. Select datasources
4. Click **Import**

## Common Dashboard Patterns

### Application Performance

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m])

# Latency (95th percentile)
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Resource Usage

```promql
# CPU usage
rate(process_cpu_seconds_total[5m])

# Memory usage
process_resident_memory_bytes

# Disk I/O
rate(node_disk_io_time_seconds_total[5m])
```

### Database Performance

```promql
# Connection pool usage
db_connection_pool_active / db_connection_pool_size

# Query duration
histogram_quantile(0.95, rate(db_query_duration_seconds_bucket[5m]))
```

## Features

### Alerts

Configure alerts to notify you of issues:

1. Edit panel → **Alert** tab
2. Create alert rule with conditions
3. Configure notification channels (Slack, email, etc.)

### Variables

Create dynamic dashboards with variables:

1. **Dashboard settings** → **Variables**
2. Add variable (e.g., `service` from Prometheus label)
3. Use in queries: `{service="$service"}`

### Annotations

Mark important events on graphs:

1. **Dashboard settings** → **Annotations**
2. Add annotation query
3. Events appear as vertical lines on graphs

## Best Practices

### Organization

- Create folders for different teams/projects
- Use consistent naming conventions
- Tag dashboards for easy discovery

### Performance

- Limit time range for large datasets
- Use recording rules in Prometheus for expensive queries
- Enable query caching where appropriate

### Sharing

- Export dashboards as JSON for version control
- Use templating for reusable dashboards
- Document dashboard purpose and panels

## Dependencies

Datasources (optional but commonly used):

- **prometheus** - For metrics
- **loki** - For logs
- **jaeger** - For traces

## Typical Stack

```bash
compose + <language> + prometheus + loki + jaeger + grafana
```

Or with collector:

```bash
compose + <language> + otel-collector + prometheus + loki + jaeger + grafana
```

## Troubleshooting

### Cannot connect to datasource

1. Verify service names match docker-compose network
2. Check that datasource services are running: `docker-compose ps`
3. Test connectivity: `docker-compose exec grafana curl http://prometheus:9090`

### Dashboard not updating

1. Check time range (top-right corner)
2. Verify auto-refresh is enabled
3. Check that datasource is returning data

### Slow queries

1. Reduce time range
2. Increase query interval
3. Use Prometheus recording rules for complex queries
4. Consider data retention policies

## Enhanced Provisioning

The Grafana overlay now includes automatic provisioning of datasources and dashboards.

### Auto-Provisioned Datasources

The following datasources are automatically configured:

- **Prometheus** - Metrics backend (http://prometheus:9090)
    - Default datasource for new dashboards
    - 15-second scrape interval
- **Loki** - Logs backend (http://loki:3100)
    - Derived fields for trace correlation
    - Links to Tempo and Jaeger from trace IDs in logs
- **Jaeger** - Distributed tracing backend (http://jaeger:16686)
    - UID: `jaeger` for linking
- **Tempo** - Alternative distributed tracing backend (http://tempo:3200)
    - UID: `tempo` for linking
    - Trace-to-logs correlation enabled
    - Trace-to-metrics correlation enabled
    - Service map and node graph enabled

### Correlation Features

**Logs ↔ Traces:**

- Click trace ID in logs to view trace in Tempo/Jaeger
- Click "Logs for this span" in trace view to see related logs

**Traces ↔ Metrics:**

- View metrics for services in trace view
- Service map shows request rates between services

### Pre-loaded Dashboards

The overlay includes sample dashboards in the "Observability" folder:

**Observability Overview:**

- HTTP request rate by service and status
- HTTP request duration percentiles (p50, p95, p99)
- Application logs stream with JSON parsing

Access at: http://localhost:3000/dashboards

### Adding Custom Dashboards

**Option 1: Create in UI**

1. Create dashboard in Grafana UI
2. Click **Dashboard settings** (gear icon)
3. Click **JSON Model**
4. Copy JSON
5. Save to `.devcontainer/dashboards/my-dashboard.json`
6. Restart Grafana to load

**Option 2: Export from Grafana.com**

1. Browse https://grafana.com/grafana/dashboards/
2. Find dashboard (e.g., Node Exporter Full)
3. Download JSON
4. Save to `.devcontainer/dashboards/`
5. Restart Grafana

**Dashboard structure:**

```
.devcontainer/
├── dashboards/
│   ├── observability-overview.json
│   ├── my-custom-dashboard.json
│   └── node-exporter.json
├── dashboard-provider-grafana.yml  # Auto-generated
└── grafana-datasources-grafana.yml # Auto-generated
```

## Troubleshooting

### Issue: Datasources Not Auto-Configured

**Symptoms:**

- Datasources missing in Grafana

**Solution:**

```bash
# Check datasources are mounted
docker exec grafana ls /etc/grafana/provisioning/datasources/

# Check Grafana logs
docker logs grafana | grep -i datasource

# Restart Grafana
docker restart grafana
```

### Issue: Tempo Not Showing Traces

**Symptoms:**

- Tempo datasource configured but no traces visible

**Solution:**

```bash
# Verify Tempo is receiving traces
curl http://tempo:3200/api/search

# Check OTLP collector is forwarding to Tempo
docker logs otel-collector | grep tempo

# Check Tempo configuration
docker exec tempo cat /etc/tempo/tempo-config.yaml
```

### Issue: Dashboards Not Loading

**Symptoms:**

- Dashboards folder empty or dashboards not appearing

**Solution:**

```bash
# Check dashboard provider is mounted
docker exec grafana ls /etc/grafana/provisioning/dashboards/

# Check dashboard files are present
docker exec grafana ls /etc/grafana/provisioning/dashboards/*.json

# Check Grafana logs for errors
docker logs grafana | grep -i dashboard

# Validate JSON syntax
jq . .devcontainer/dashboards/my-dashboard.json
```

### Issue: Correlation Links Not Working

**Symptoms:**

- Cannot jump from logs to traces or vice versa

**Solution:**

- Ensure logs include `trace.id` field in JSON
- Verify datasource UIDs match (`tempo`, `jaeger`, `loki`)
- Check derived fields configuration in Loki datasource
- Ensure applications emit trace context in logs

## Advanced Configuration

### Custom Correlation Rules

Edit `.devcontainer/grafana-datasources-grafana.yml`:

```yaml
- name: Loki
  type: loki
  url: http://loki:3100
  jsonData:
      derivedFields:
          - datasourceUid: tempo
            matcherRegex: "trace_id=(\\w+)" # Custom field name
            name: TraceID
            url: '$${__value.raw}'
```

### Adding More Datasources

Add to `grafana-datasources.yml`:

```yaml
- name: PostgreSQL
  type: postgres
  url: postgres:5432
  database: myapp
  user: postgres
  jsonData:
      sslmode: disable
```

### Dashboard Auto-Refresh

Edit dashboard JSON:

```json
{
    "refresh": "5s", // Auto-refresh every 5 seconds
    "time": {
        "from": "now-15m",
        "to": "now"
    }
}
```

## References

- [Grafana Documentation](https://grafana.com/docs/grafana/latest/)
- [Provisioning Datasources](https://grafana.com/docs/grafana/latest/administration/provisioning/#data-sources)
- [Provisioning Dashboards](https://grafana.com/docs/grafana/latest/administration/provisioning/#dashboards)
- [Tempo Datasource](https://grafana.com/docs/grafana/latest/datasources/tempo/)
- [Trace to Logs](https://grafana.com/docs/grafana/latest/datasources/tempo/#trace-to-logs)

**Related Overlays:**

- `prometheus` - Metrics datasource
- `loki` - Logs datasource
- `jaeger` - Tracing datasource
- `tempo` - Alternative tracing datasource
- `promtail` - Log shipping to Loki
- `alertmanager` - Alert visualization
