#!/bin/bash
# OpenTelemetry Collector setup script - Configure trace backend

set -e

echo "🔧 Configuring OpenTelemetry Collector trace backend..."

# Determine workspace root dynamically
WORKSPACE_ROOT="${LOCAL_WORKSPACE_FOLDER:-$PWD}"

if [ ! -d "$WORKSPACE_ROOT/.devcontainer" ]; then
    if [ -d "/workspaces" ]; then
        FIRST_WORKSPACE_DIR="$(find /workspaces -maxdepth 1 -mindepth 1 -type d 2>/dev/null | head -n 1)"
        if [ -n "$FIRST_WORKSPACE_DIR" ] && [ -d "$FIRST_WORKSPACE_DIR/.devcontainer" ]; then
            WORKSPACE_ROOT="$FIRST_WORKSPACE_DIR"
        fi
    fi
fi

if [ ! -d "$WORKSPACE_ROOT/.devcontainer" ] && [ -d "/workspace/.devcontainer" ]; then
    WORKSPACE_ROOT="/workspace"
fi

OTEL_CONFIG="$WORKSPACE_ROOT/.devcontainer/otel-collector-config-otel-collector.yaml"

if [ ! -f "$OTEL_CONFIG" ]; then
    echo "⚠️ OTel Collector config not found"
    exit 0
fi

# Check which tracing backend is configured
JAEGER_RUNNING=$(docker ps --filter "name=jaeger" --format "{{.Names}}" 2>/dev/null || echo "")
TEMPO_RUNNING=$(docker ps --filter "name=tempo" --format "{{.Names}}" 2>/dev/null || echo "")

if [ -n "$TEMPO_RUNNING" ] && [ -z "$JAEGER_RUNNING" ]; then
    echo "📝 Configuring for Tempo backend..."
    # Update config to use Tempo
    sed -i 's/exporters: \[otlp\/jaeger, debug\]/exporters: [otlp\/tempo, debug]/' "$OTEL_CONFIG"
    echo "✓ Configured to export traces to Tempo"
elif [ -n "$JAEGER_RUNNING" ] && [ -z "$TEMPO_RUNNING" ]; then
    echo "📝 Configuring for Jaeger backend..."
    # Update config to use Jaeger (default)
    sed -i 's/exporters: \[otlp\/tempo, debug\]/exporters: [otlp\/jaeger, debug]/' "$OTEL_CONFIG"
    echo "✓ Configured to export traces to Jaeger"
else
    echo "ℹ️  Using default configuration (Jaeger)"
fi

echo "✓ OpenTelemetry Collector setup complete"
