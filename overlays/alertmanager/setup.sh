#!/bin/bash
# Alertmanager setup script - Updates Prometheus configuration

set -e

echo "🔧 Setting up Alertmanager integration..."

# Determine workspace root dynamically to support both /workspaces/* and /workspace layouts
WORKSPACE_ROOT="${LOCAL_WORKSPACE_FOLDER:-$PWD}"

# If the current root does not contain a .devcontainer, try common devcontainer locations
if [ ! -d "$WORKSPACE_ROOT/.devcontainer" ]; then
    # Try to detect a workspace under /workspaces (compose templates)
    if [ -d "/workspaces" ]; then
        FIRST_WORKSPACE_DIR="$(find /workspaces -maxdepth 1 -mindepth 1 -type d 2>/dev/null | head -n 1)"
        if [ -n "$FIRST_WORKSPACE_DIR" ] && [ -d "$FIRST_WORKSPACE_DIR/.devcontainer" ]; then
            WORKSPACE_ROOT="$FIRST_WORKSPACE_DIR"
        fi
    fi
fi

# Fallback to /workspace if it exists and contains a .devcontainer (non-compose setups)
if [ ! -d "$WORKSPACE_ROOT/.devcontainer" ] && [ -d "/workspace/.devcontainer" ]; then
    WORKSPACE_ROOT="/workspace"
fi

PROMETHEUS_CONFIG="$WORKSPACE_ROOT/.devcontainer/prometheus-prometheus.yml"

# Check if Prometheus config exists
if [ -f "$PROMETHEUS_CONFIG" ]; then
    echo "📝 Updating Prometheus configuration for Alertmanager integration..."
    
    # Check if alerting section already exists
    if ! grep -q "alerting:" "$PROMETHEUS_CONFIG"; then
        # Add alerting configuration
        cat >> "$PROMETHEUS_CONFIG" << 'EOF'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
EOF
        echo "✓ Added Alertmanager configuration to Prometheus"
        echo "ℹ️  Note: Alert rules should be mounted separately in Prometheus docker-compose.yml"
    else
        echo "✓ Alertmanager configuration already present"
    fi
else
    echo "⚠️ Prometheus configuration not found. Make sure prometheus overlay is enabled."
fi

echo "✓ Alertmanager setup complete"
