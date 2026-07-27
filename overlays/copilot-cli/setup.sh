#!/bin/bash
# copilot-cli setup script - Install GitHub Copilot CLI

set -e

# Source shared setup utilities (provides load_nvm)
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"
load_nvm

COPILOT_CLI_VERSION=${COPILOT_CLI_VERSION:-latest}
COPILOT_PACKAGE="@github/copilot@${COPILOT_CLI_VERSION}"

echo "📦 Installing GitHub Copilot CLI (${COPILOT_CLI_VERSION})..."

npm install -g "${COPILOT_PACKAGE}"
mkdir -p "$HOME/.copilot"

if command -v copilot &>/dev/null; then
    echo "✓ GitHub Copilot CLI installed successfully: $(copilot --version 2>/dev/null || echo 'installed')"
else
    echo "✗ GitHub Copilot CLI installation failed"
    exit 1
fi

echo "✓ copilot-cli setup complete"
echo "ℹ️  GitHub Copilot CLI: https://github.com/github/copilot-cli"
echo "ℹ️  Run 'copilot login' or set COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN to authenticate"
