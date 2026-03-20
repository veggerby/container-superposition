#!/bin/bash
# Dev Container CLI setup script - Install @devcontainers/cli globally

set -e

# Ensure Node/npm are available when using the NVM-based Node feature
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SETUP_UTILS="${SCRIPT_DIR}/setup-utils.sh"

if [ -f "${SETUP_UTILS}" ]; then
    # shellcheck source=/dev/null
    . "${SETUP_UTILS}"
    if type load_nvm >/dev/null 2>&1; then
        load_nvm
    fi
fi

echo "📦 Installing @devcontainers/cli..."
npm install -g @devcontainers/cli

echo "✓ devcontainer CLI installed: $(devcontainer --version)"
