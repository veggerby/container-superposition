FROM python:3.12-slim

WORKDIR /app

# Copy requirements and app files
COPY ./otel-demo-python-requirements.txt requirements.txt
COPY ./otel-demo-python-app.py app.py

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 8081

# Run with auto-instrumentation
CMD ["opentelemetry-instrument", "python", "app.py"]
