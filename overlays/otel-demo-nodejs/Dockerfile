FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY ./otel-demo-nodejs-package.json package.json
COPY ./otel-demo-nodejs-server.js server.js
COPY ./otel-demo-nodejs-tracing.js tracing.js

# Install dependencies
RUN npm install --production

# Expose port
EXPOSE 8080

# Start with OpenTelemetry instrumentation
CMD ["node", "--require", "./tracing.js", "server.js"]
