#!/bin/bash
# Playwright setup script — Install Chromium browser + system dependencies

set -e

# Source shared setup utilities (provides load_nvm, acquire_apt_lock)
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"
load_nvm

echo "🎭 Setting up Playwright..."

# Install Chromium and its system dependencies.
# playwright install --with-deps calls apt-get internally; we must hold the
# shared apt lock so it does not race with other parallel setup scripts.
acquire_apt_lock
npx -y playwright install --with-deps chromium 2>&1 | grep -v 'npm notice'
rc=${PIPESTATUS[0]}
release_apt_lock

if [ "$rc" -ne 0 ]; then
    echo "❌ Playwright browser installation failed (exit $rc)"
    exit "$rc"
fi

echo "✓ Playwright setup complete"
echo "ℹ️  Run 'npx playwright test' to execute tests"
