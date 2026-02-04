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
