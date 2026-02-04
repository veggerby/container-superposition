# Jaeger Overlay

Adds Jaeger all-in-one to your development environment for distributed tracing.

## What's Included

- Jaeger all-in-one (latest) - includes collector, query, agent, and UI
- OTLP support enabled for OpenTelemetry compatibility
- In-memory storage (suitable for development)

## Ports

- `16686` - Jaeger UI (web interface)
- `4317` - OTLP gRPC receiver
- `4318` - OTLP HTTP receiver

## Environment Variables

```bash
# Jaeger version
JAEGER_VERSION=latest
```

## Usage

### Accessing the UI

Once your devcontainer starts, open your browser to:
```
http://localhost:16686
```

The UI provides:
- **Search** - Find traces by service, operation, tags, duration
- **Compare** - Compare trace timings
- **System Architecture** - Visualize service dependencies
- **Statistics** - View request rates and error rates

### Sending Traces Directly

#### Using OTLP (Recommended)
```javascript
// Node.js with OpenTelemetry
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');

const exporter = new OTLPTraceExporter({
  url: 'http://jaeger:4317',
});
```

#### Using Jaeger Client Libraries
```python
# Python with Jaeger client
from jaeger_client import Config

config = Config(
    config={
        'sampler': {'type': 'const', 'param': 1},
        'local_agent': {
            'reporting_host': 'jaeger',
            'reporting_port': '6831',
        },
        'logging': True,
    },
    service_name='my-service',
)
tracer = config.initialize_tracer()
```

## Best Practices

### Trace Sampling
- Development: Use 100% sampling (`JAEGER_SAMPLER_PARAM=1`)
- Production: Use probabilistic sampling (e.g., `JAEGER_SAMPLER_PARAM=0.1` for 10%)

### Span Attributes
Always include:
- `service.name` - Name of your service
- `service.version` - Version of your service
- `deployment.environment` - dev, staging, production
- HTTP status codes, error flags, user IDs (where applicable)

### Trace Context Propagation
Ensure trace context is propagated across service boundaries using W3C Trace Context headers.

## Dependencies

Commonly used with:
- **otel-collector** - For centralized telemetry collection
- **prometheus** - For metrics correlation
- **grafana** - For unified observability

## Typical Stacks

### Direct Tracing
```bash
compose + <language> + jaeger
```
Your application sends traces directly to Jaeger.

### With Collector
```bash
compose + <language> + otel-collector + jaeger + prometheus + grafana
```
Your application sends to otel-collector, which forwards to Jaeger.

## Troubleshooting

### No traces appearing
1. Check that your app is sending to the correct endpoint
2. Verify OTLP is enabled: `COLLECTOR_OTLP_ENABLED=true` (already set in overlay)
3. Check logs: `docker-compose logs jaeger`

### UI not loading
1. Ensure port 16686 is forwarded
2. Check that Jaeger container is running: `docker-compose ps`
3. Try accessing directly: http://localhost:16686
