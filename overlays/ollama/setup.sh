#!/bin/bash
# Ollama CLI setup script
# Installs the Ollama CLI in the devcontainer so developers can manage models
# and run inference from the terminal, targeting the ollama sidecar service.

set -e

source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

detect_arch

if command_exists ollama; then
    echo "✓ Ollama CLI already installed: $(ollama --version)"
    echo "ℹ️  OLLAMA_HOST is set to ${OLLAMA_HOST:-http://ollama:11434} — all commands target the sidecar."
    exit 0
fi

echo "📦 Installing Ollama CLI..."
# Install the CLI payload directly from the Linux release archive instead of
# invoking the full install.sh flow, which expects host-level dependencies such
# as zstd/systemd handling that are irrelevant inside the devcontainer.
run_spinner "Downloading and installing Ollama CLI..." \
    bash -c 'curl -fsSL "$1" | sudo tar -xzf - -C /usr/local' _ \
    "https://ollama.com/download/ollama-linux-${CS_ARCH}.tgz"

export PATH="/usr/local/bin:/usr/bin:/bin:${PATH}"

if ! command_exists ollama; then
    echo "❌ Ollama CLI install completed but the binary is still not on PATH"
    exit 1
fi

echo "✓ Ollama CLI installed: $(ollama --version)"
echo "ℹ️  OLLAMA_HOST is set to ${OLLAMA_HOST:-http://ollama:11434} — all commands target the sidecar."

