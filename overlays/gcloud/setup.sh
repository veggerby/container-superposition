#!/bin/bash
# Google Cloud CLI setup script

set -e

echo "☁️  Setting up Google Cloud CLI..."

# Source shared setup utilities
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

if command -v apk >/dev/null 2>&1; then
    # Alpine Linux — no official gcloud apt repo; install via tarball
    apk add --no-cache python3 curl
    curl -sSL https://sdk.cloud.google.com | CLOUDSDK_CORE_DISABLE_PROMPTS=1 bash -s -- --disable-prompts --install-dir=/usr/local
    ln -sf /usr/local/google-cloud-sdk/bin/gcloud /usr/local/bin/gcloud
    ln -sf /usr/local/google-cloud-sdk/bin/gsutil /usr/local/bin/gsutil
elif command -v apt-get >/dev/null 2>&1; then
    # Debian/Ubuntu — add Google Cloud apt repo using modern signed-by method
    # The Google Cloud key is already in binary (non-armored) format — write directly.
    sudo mkdir -p /usr/share/keyrings /etc/apt/sources.list.d
    curl -fsSL "https://packages.cloud.google.com/apt/doc/apt-key.gpg" \
        | sudo tee /usr/share/keyrings/cloud.google.gpg >/dev/null
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" \
        | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list >/dev/null

    # Single lock acquisition: install prereqs + add repo + install gcloud in one pass
    acquire_apt_lock
    # Pass env vars explicitly — sudo strips them by default.
    sudo DEBIAN_FRONTEND=noninteractive TERM=dumb apt-get update -qq
    sudo DEBIAN_FRONTEND=noninteractive TERM=dumb apt-get install -y -qq --no-install-recommends apt-transport-https ca-certificates gnupg curl
    # apt index already fresh — install gcloud packages without a second apt-get update
    sudo DEBIAN_FRONTEND=noninteractive TERM=dumb apt-get install -y -qq --no-install-recommends \
        google-cloud-cli \
        google-cloud-cli-gke-gcloud-auth-plugin
    sudo apt-get clean
    sudo rm -rf /var/lib/apt/lists/*
    release_apt_lock
else
    echo "⚠️  Unsupported package manager, skipping gcloud installation"
    exit 0
fi

if command -v gcloud >/dev/null 2>&1; then
    echo "✓ gcloud installed: $(gcloud --version | head -1)"
else
    echo "✗ gcloud installation failed"
    exit 1
fi

echo "✓ gcloud setup complete"
