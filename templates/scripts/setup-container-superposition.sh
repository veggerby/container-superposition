#!/bin/bash
# Install the generator-matched Container Superposition command for in-container replay.

set -euo pipefail

# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"
load_nvm

if ! command -v npm >/dev/null 2>&1; then
    echo "❌ npm is unavailable after loading the Node.js feature"
    exit 1
fi

CS_VERSION='{{CS_VERSION}}'
echo "📦 Installing container-superposition@${CS_VERSION}..."
npm install --global "container-superposition@${CS_VERSION}"

if ! command -v cs >/dev/null 2>&1; then
    echo "❌ container-superposition installed but cs is not on PATH"
    exit 1
fi

INSTALLED_VERSION="$(cs --version)"
if [ "${INSTALLED_VERSION}" != "${CS_VERSION}" ]; then
    echo "❌ Expected cs ${CS_VERSION}, found ${INSTALLED_VERSION}"
    exit 1
fi

echo "✓ cs ${INSTALLED_VERSION} installed"
