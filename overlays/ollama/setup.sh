#!/bin/bash
# Ollama CLI setup script
# Installs the Ollama CLI in the devcontainer so developers can manage models
# and run inference from the terminal, targeting the ollama sidecar service.

set -e

source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

echo "📦 Installing Ollama CLI..."
# Install Ollama binary only — do NOT start the system service.
# The daemon runs in the ollama compose sidecar; we only need the client here.
run_spinner "Downloading and installing Ollama CLI..." \
    bash -c 'curl -fsSL https://ollama.com/install.sh | OLLAMA_SKIP_SERVICE_INSTALL=1 sh'

echo "✓ Ollama CLI installed: $(ollama --version)"
echo "ℹ️  OLLAMA_HOST is set to ${OLLAMA_HOST:-http://ollama:11434} — all commands target the sidecar."
