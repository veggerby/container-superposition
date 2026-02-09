# OpenTelemetry Demo - Python

Sample Python Flask application fully instrumented with OpenTelemetry to demonstrate distributed tracing, metrics, and logging.

## Features

- **Auto-instrumentation** - Automatic Flask request tracing
- **Custom metrics** - Request counters and duration histograms
- **Structured logs** - JSON formatted logs with trace context
- **Multiple endpoints** - Various scenarios (normal, slow, error)
- **OTLP export** - Sends traces and metrics to OpenTelemetry Collector
- **Zero-config** - Works out-of-box with the observability stack

## How It Works

This Flask application demonstrates the three pillars of observability using OpenTelemetry's Python SDK with auto-instrumentation.

**Key Components:**

- `opentelemetry-instrument` - Auto-instruments Flask
- Flask application - HTTP server with sample endpoints
- JSON logging - Structured logs with trace correlation
- Custom spans and metrics - Business logic instrumentation

## Configuration

### Ports

- `8081` - HTTP API (web interface and endpoints)

### Environment Variables

```bash
# OTLP endpoint (OpenTelemetry Collector)
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317

# Service identification
OTEL_SERVICE_NAME=otel-demo-python
OTEL_RESOURCE_ATTRIBUTES=service.version=1.0.0,deployment.environment=dev
```

### Dependencies

Requires:

- **otel-collector** - Required to receive and route telemetry
- **jaeger** or **tempo** - Recommended for trace visualization
- **prometheus** - Recommended for metrics visualization
- **loki** - Recommended for log aggregation
- **grafana** - Recommended for unified visualization

## Available Endpoints

Same as Node.js demo:

- `GET /` - Home page with documentation
- `GET /api/data` - Returns JSON data with trace context
- `GET /api/slow` - Simulates 2-second delay
- `GET /api/error` - Returns 500 error
- `GET /health` - Health check

## Use Cases

- **Learning OpenTelemetry** - Python/Flask implementation
- **Testing observability stack** - Verify traces, metrics, and logs work
- **Multi-language tracing** - See trace correlation across services
- **Dashboard development** - Real data for creating Grafana dashboards

## References

- [OpenTelemetry Python](https://opentelemetry.io/docs/instrumentation/python/)
- [Flask Instrumentation](https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html)
- [Auto-instrumentation](https://opentelemetry.io/docs/instrumentation/python/automatic/)

**Related Overlays:**

- `otel-collector` - Required for receiving telemetry
- `otel-demo-nodejs` - Node.js demo app for multi-language testing
- `jaeger` or `tempo` - Trace visualization
- `prometheus` - Metrics storage
- `loki` - Log aggregation
- `grafana` - Unified observability UI
