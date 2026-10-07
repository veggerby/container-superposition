#!/bin/bash
# Install the selected npm release of Container Superposition for in-container replay.

set -euo pipefail

# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"
load_nvm

if ! command -v npm >/dev/null 2>&1; then
    echo "❌ npm is unavailable after loading the Node.js feature"
    exit 1
fi

CS_PACKAGE_SELECTION='{{CS_PACKAGE_SELECTION}}'
CS_EXPECTED_VERSION='{{CS_EXPECTED_VERSION}}'
echo "📦 Installing container-superposition@${CS_PACKAGE_SELECTION}..."
npm install --global "container-superposition@${CS_PACKAGE_SELECTION}"

if ! command -v cs >/dev/null 2>&1; then
    echo "❌ container-superposition installed but cs is not on PATH"
    exit 1
fi

INSTALLED_VERSION="$(cs --version)"
if [ -z "${INSTALLED_VERSION}" ] || { [ -n "${CS_EXPECTED_VERSION}" ] && [ "${INSTALLED_VERSION}" != "${CS_EXPECTED_VERSION}" ]; }; then
    echo "❌ Expected cs ${CS_EXPECTED_VERSION:-from ${CS_PACKAGE_SELECTION}}, found ${INSTALLED_VERSION:-none}"
    exit 1
fi

echo "✓ cs ${INSTALLED_VERSION} installed from ${CS_PACKAGE_SELECTION}"
