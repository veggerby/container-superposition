#!/bin/bash
# Dev Container CLI setup script - Install @devcontainers/cli globally

set -e

# Source shared setup utilities (provides load_nvm)
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"
load_nvm

echo "📦 Installing @devcontainers/cli..."
npm install -g @devcontainers/cli

echo "✓ devcontainer CLI installed: $(devcontainer --version)"
