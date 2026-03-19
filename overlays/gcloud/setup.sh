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
    # add_apt_repo does not need the lock (only writes key/sources files)
    apt_install apt-transport-https ca-certificates gnupg curl

    # Google Cloud SDK uses its own flat distribution (cloud-sdk), not Debian codename-specific
    add_apt_repo \
        "https://packages.cloud.google.com/apt/doc/apt-key.gpg" \
        "/usr/share/keyrings/cloud.google.gpg" \
        "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" \
        "/etc/apt/sources.list.d/google-cloud-sdk.list"

    apt_install \
        google-cloud-cli \
        google-cloud-cli-gke-gcloud-auth-plugin

    sudo apt-get clean
    sudo rm -rf /var/lib/apt/lists/*
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
