import time
import random
import logging
import json
from flask import Flask, jsonify, request
from opentelemetry import trace, metrics
from opentelemetry.trace import Status, StatusCode

# Configure JSON logging
class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            'timestamp': self.formatTime(record),
            'level': record.levelname.lower(),
            'message': record.getMessage(),
            'logger': record.name,
        }
        
        # Add trace context if available
        span = trace.get_current_span()
        if span and span.get_span_context().is_valid:
            ctx = span.get_span_context()
            log_data['trace.id'] = format(ctx.trace_id, '032x')
            log_data['span.id'] = format(ctx.span_id, '016x')
        
        return json.dumps(log_data)

# Setup logging
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger = logging.getLogger(__name__)
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Create Flask app
app = Flask(__name__)

# Get tracer and meter
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)

# Create custom metrics
request_counter = meter.create_counter(
    name="http_requests_total",
    description="Total number of HTTP requests",
)

request_duration = meter.create_histogram(
    name="http_request_duration_seconds",
    description="HTTP request duration in seconds",
)

@app.route('/')
def home():
    """Home page with documentation"""
    span = trace.get_current_span()
    span.add_event("Rendering home page")
    
    logger.info("Home page requested")
    
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>OpenTelemetry Demo - Python</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
            h1 { color: #333; }
            .endpoint { background: #f4f4f4; padding: 10px; margin: 10px 0; border-left: 4px solid #007acc; }
            .success { color: #28a745; }
            .warning { color: #ffc107; }
            .error { color: #dc3545; }
        </style>
    </head>
    <body>
        <h1>🐍 OpenTelemetry Demo - Python</h1>
        <p>Flask application instrumented with OpenTelemetry.</p>
        
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
        
        <h2>Try It:</h2>
        <ul>
            <li><a href="/api/data">Call /api/data</a></li>
            <li><a href="/api/slow">Call /api/slow (slow)</a></li>
            <li><a href="/api/error">Call /api/error (error)</a></li>
            <li><a href="/health">Call /health</a></li>
        </ul>
    </body>
    </html>
    """

@app.route('/api/data')
def get_data():
    """Returns sample data with child span"""
    with tracer.start_as_current_span("process_data") as span:
        span.add_event("Fetching data")
        
        # Simulate data processing
        data = {
            'timestamp': time.time(),
            'items': [
                {'id': i, 'name': f'Item {i}', 'value': random.random() * 100}
                for i in range(1, 4)
            ],
            'trace': {
                'traceId': format(span.get_span_context().trace_id, '032x'),
                'spanId': format(span.get_span_context().span_id, '016x'),
            }
        }
        
        span.set_attribute("data.items", len(data['items']))
        logger.info(f"Data fetched successfully, itemCount={len(data['items'])}")
        
        return jsonify(data)

@app.route('/api/slow')
def slow_endpoint():
    """Simulates slow request"""
    span = trace.get_current_span()
    span.add_event("Simulating slow operation")
    logger.warning("Slow endpoint called, expectedDelay=2s")
    
    time.sleep(2)
    
    return jsonify({
        'message': 'This was a slow request',
        'duration': '2 seconds'
    })

@app.route('/api/error')
def error_endpoint():
    """Simulates error"""
    span = trace.get_current_span()
    span.add_event("Error occurred")
    logger.error("Error endpoint called")
    
    # Record exception in span
    try:
        raise ValueError("Simulated error")
    except ValueError as e:
        span.record_exception(e)
        span.set_status(Status(StatusCode.ERROR, "Simulated error"))
    
    return jsonify({
        'error': 'Internal Server Error',
        'message': 'This is a simulated error'
    }), 500

@app.route('/health')
def health():
    """Health check"""
    return jsonify({
        'status': 'healthy',
        'timestamp': time.time()
    })

# Middleware to record metrics
@app.before_request
def before_request():
    request.start_time = time.time()

@app.after_request
def after_request(response):
    duration = time.time() - request.start_time
    
    # Record metrics
    request_counter.add(1, {
        'method': request.method,
        'route': request.path,
        'status': response.status_code,
    })
    
    request_duration.record(duration, {
        'method': request.method,
        'route': request.path,
        'status': response.status_code,
    })
    
    return response

if __name__ == '__main__':
    logger.info("Server starting on port 8081")
    app.run(host='0.0.0.0', port=8081, debug=False)
