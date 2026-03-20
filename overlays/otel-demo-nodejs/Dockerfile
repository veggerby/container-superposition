FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY ./package-otel-demo-nodejs.json package.json
COPY ./server-otel-demo-nodejs.js server.js
COPY ./tracing-otel-demo-nodejs.js tracing.js

# Install dependencies
RUN npm install --production

# Expose port
EXPOSE 8080

# Start with OpenTelemetry instrumentation
CMD ["node", "--require", "./tracing.js", "server.js"]
