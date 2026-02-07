#!/bin/bash
# Alertmanager setup script - Updates Prometheus configuration

set -e

echo "🔧 Setting up Alertmanager integration..."

PROMETHEUS_CONFIG="/workspace/.devcontainer/prometheus-prometheus.yml"
ALERT_RULES="/workspace/.devcontainer/alert-rules-alertmanager.yml"

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

# Alert rules
rule_files:
  - '/etc/prometheus/alert-rules.yml'
EOF
        echo "✓ Added Alertmanager configuration to Prometheus"
    else
        echo "✓ Alertmanager configuration already present"
    fi
else
    echo "⚠️ Prometheus configuration not found. Make sure prometheus overlay is enabled."
fi

echo "✓ Alertmanager setup complete"
