const http = require('http');
const pino = require('pino');
const { trace, metrics, context } = require('@opentelemetry/api');

// Create JSON logger
const logger = pino({
    level: 'info',
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
});

// Get tracer and meter
const tracer = trace.getTracer('otel-demo-nodejs', '1.0.0');
const meter = metrics.getMeter('otel-demo-nodejs', '1.0.0');

// Create custom metrics
const requestCounter = meter.createCounter('http_requests_total', {
    description: 'Total number of HTTP requests',
});

const requestDuration = meter.createHistogram('http_request_duration_seconds', {
    description: 'HTTP request duration in seconds',
});

const activeRequests = meter.createUpDownCounter('http_requests_active', {
    description: 'Number of active HTTP requests',
});

// Request handler
function handleRequest(req, res) {
    const startTime = Date.now();

    // Increment active requests
    activeRequests.add(1, { method: req.method, route: req.url });

    // Create span for request
    const span = tracer.startSpan(`${req.method} ${req.url}`, {
        kind: 1, // SERVER
        attributes: {
            'http.method': req.method,
            'http.url': req.url,
            'http.target': req.url,
        },
    });

    context.with(trace.setSpan(context.active(), span), () => {
        // Log request
        logger.info({
            msg: 'HTTP request received',
            method: req.method,
            url: req.url,
            'trace.id': span.spanContext().traceId,
            'span.id': span.spanContext().spanId,
        });

        // Route handling
        if (req.url === '/') {
            handleHome(req, res, span);
        } else if (req.url === '/api/data') {
            handleData(req, res, span);
        } else if (req.url === '/api/slow') {
            handleSlow(req, res, span);
        } else if (req.url === '/api/error') {
            handleError(req, res, span);
        } else if (req.url === '/health') {
            handleHealth(req, res, span);
        } else {
            handleNotFound(req, res, span);
        }

        // Record metrics
        const duration = (Date.now() - startTime) / 1000;
        requestCounter.add(1, {
            method: req.method,
            route: req.url,
            status: res.statusCode,
        });
        requestDuration.record(duration, {
            method: req.method,
            route: req.url,
            status: res.statusCode,
        });
        activeRequests.add(-1, { method: req.method, route: req.url });

        // Set span status and end
        span.setAttribute('http.status_code', res.statusCode);
        if (res.statusCode >= 400) {
            span.setStatus({ code: 2, message: 'Error' }); // ERROR
        } else {
            span.setStatus({ code: 1 }); // OK
        }
        span.end();
    });
}

function handleHome(req, res, span) {
    span.addEvent('Rendering home page');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>OpenTelemetry Demo - Node.js</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #333; }
        .endpoint { background: #f4f4f4; padding: 10px; margin: 10px 0; border-left: 4px solid #007acc; }
        .endpoint code { background: #e0e0e0; padding: 2px 6px; border-radius: 3px; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .error { color: #dc3545; }
      </style>
    </head>
    <body>
      <h1>🔭 OpenTelemetry Demo - Node.js</h1>
      <p>This is a sample application instrumented with OpenTelemetry.</p>
      
      <h2>Available Endpoints:</h2>
      
      <div class="endpoint">
        <strong class="success">GET /</strong><br>
        This page - application home
      </div>
      
      <div class="endpoint">
        <strong class="success">GET /api/data</strong><br>
        Returns sample JSON data with nested spans
      </div>
      
      <div class="endpoint">
        <strong class="warning">GET /api/slow</strong><br>
        Simulates slow request (2 second delay)
      </div>
      
      <div class="endpoint">
        <strong class="error">GET /api/error</strong><br>
        Simulates an error (500 status)
      </div>
      
      <div class="endpoint">
        <strong class="success">GET /health</strong><br>
        Health check endpoint
      </div>
      
      <h2>Observability Data:</h2>
      <ul>
        <li><strong>Traces:</strong> Sent to OTLP endpoint (view in Jaeger/Tempo via Grafana)</li>
        <li><strong>Metrics:</strong> Exported every 5 seconds (view in Prometheus/Grafana)</li>
        <li><strong>Logs:</strong> JSON formatted to stdout (view in Loki via Grafana)</li>
      </ul>
      
      <h2>Try It:</h2>
      <ul>
        <li><a href="/api/data">Call /api/data</a></li>
        <li><a href="/api/slow">Call /api/slow (slow)</a></li>
        <li><a href="/api/error">Call /api/error (error)</a></li>
        <li><a href="/health">Call /health</a></li>
      </ul>
    </body>
    </html>
  `);
}

function handleData(req, res, span) {
    // Create child span for data processing
    const childSpan = tracer.startSpan('process_data', {
        parent: span,
    });

    childSpan.addEvent('Fetching data');

    // Simulate data processing
    const data = {
        timestamp: new Date().toISOString(),
        items: [
            { id: 1, name: 'Item 1', value: Math.random() * 100 },
            { id: 2, name: 'Item 2', value: Math.random() * 100 },
            { id: 3, name: 'Item 3', value: Math.random() * 100 },
        ],
        trace: {
            traceId: span.spanContext().traceId,
            spanId: span.spanContext().spanId,
        },
    };

    childSpan.setAttribute('data.items', data.items.length);
    childSpan.end();

    logger.info({ msg: 'Data fetched successfully', itemCount: data.items.length });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
}

function handleSlow(req, res, span) {
    span.addEvent('Simulating slow operation');
    logger.warn({ msg: 'Slow endpoint called', expectedDelay: '2s' });

    // Simulate slow operation
    setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
            JSON.stringify({
                message: 'This was a slow request',
                duration: '2 seconds',
            })
        );
    }, 2000);
}

function handleError(req, res, span) {
    span.addEvent('Error occurred');
    logger.error({ msg: 'Error endpoint called', error: 'Simulated error' });

    span.recordException(new Error('Simulated error'));

    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
        JSON.stringify({
            error: 'Internal Server Error',
            message: 'This is a simulated error',
        })
    );
}

function handleHealth(req, res, span) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
        JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
        })
    );
}

function handleNotFound(req, res, span) {
    logger.warn({ msg: 'Not found', url: req.url });

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(
        JSON.stringify({
            error: 'Not Found',
            path: req.url,
        })
    );
}

// Create HTTP server
const server = http.createServer(handleRequest);

const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
    logger.info({ msg: 'Server started', port: PORT });
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
