#!/bin/bash
# Alertmanager setup script - Updates Prometheus configuration

set -e

echo "🔧 Setting up Alertmanager integration..."

# Resolve the .devcontainer directory relative to this script.
# Scripts live at .devcontainer/scripts/, so .. is always .devcontainer/.
DEVCONTAINER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && cd .. && pwd)"

PROMETHEUS_CONFIG="$DEVCONTAINER_DIR/prometheus-prometheus.yml"

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
