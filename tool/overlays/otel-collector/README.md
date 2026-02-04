# OpenTelemetry Collector Overlay

Adds OpenTelemetry Collector to your development environment for collecting traces, metrics, and logs.

## What's Included

- OpenTelemetry Collector (latest)
- Pre-configured receivers for OTLP (gRPC and HTTP)
- Batch processor for efficient data handling
- Memory limiter to prevent resource exhaustion
- Exporters for Jaeger (traces), Prometheus (metrics), and Loki (logs)

## Ports

- `4317` - OTLP gRPC receiver
- `4318` - OTLP HTTP receiver
- `8888` - Collector's own metrics
- `8889` - Prometheus exporter endpoint
- `13133` - Health check endpoint

## Configuration

The collector is configured via `otel-collector-config.yaml` with:

### Receivers
- OTLP protocol (both gRPC and HTTP)

### Processors
- `batch` - Batches telemetry data (10s timeout, 1024 batch size)
- `memory_limiter` - Limits memory usage (512MB)

### Exporters
- `otlp/jaeger` - Sends traces to Jaeger on port 4317
- `prometheus` - Exposes metrics on port 8889
- `loki` - Sends logs to Loki HTTP endpoint
- `debug` - Detailed logging for development

## Environment Variables

```bash
# OpenTelemetry Collector version
OTEL_COLLECTOR_VERSION=latest
```

## Usage

### Sending Telemetry from Your Application

#### Traces (gRPC)
```javascript
// Node.js example
const { trace } = require('@opentelemetry/api');
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');

const exporter = new OTLPTraceExporter({
  url: 'http://otel-collector:4317',
});
```

#### Traces (HTTP)
```python
# Python example
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

trace.set_tracer_provider(TracerProvider())
otlp_exporter = OTLPSpanExporter(endpoint="http://otel-collector:4318/v1/traces")
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(otlp_exporter)
)
```

#### Metrics
```csharp
// C# example
using OpenTelemetry;
using OpenTelemetry.Exporter;
using OpenTelemetry.Metrics;

var meterProvider = Sdk.CreateMeterProviderBuilder()
    .AddOtlpExporter(opt =>
    {
        opt.Endpoint = new Uri("http://otel-collector:4317");
        opt.Protocol = OtlpExportProtocol.Grpc;
    })
    .Build();
```

## Dependencies

Works best with:
- **jaeger** - For viewing distributed traces
- **prometheus** - For viewing metrics
- **loki** - For viewing logs
- **grafana** - For unified observability dashboard

## Typical Stack

```bash
compose + <language> + otel-collector + jaeger + prometheus + grafana + loki
```

This creates a complete observability stack where:
1. Your app sends telemetry to otel-collector
2. Collector forwards traces to Jaeger
3. Collector forwards metrics to Prometheus
4. Collector forwards logs to Loki
5. Grafana visualizes all three data sources
