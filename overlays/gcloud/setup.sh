#!/bin/bash
# Google Cloud CLI setup script

set -e

echo "☁️  Setting up Google Cloud CLI..."

if command -v apk >/dev/null 2>&1; then
    # Alpine Linux — no official gcloud apt repo; install via pip or tarball
    apk add --no-cache python3 curl
    curl -sSL https://sdk.cloud.google.com | CLOUDSDK_CORE_DISABLE_PROMPTS=1 bash -s -- --disable-prompts --install-dir=/usr/local
    ln -sf /usr/local/google-cloud-sdk/bin/gcloud /usr/local/bin/gcloud
    ln -sf /usr/local/google-cloud-sdk/bin/gsutil /usr/local/bin/gsutil
elif command -v apt-get >/dev/null 2>&1; then
    # Debian/Ubuntu — add Google Cloud apt repo using modern signed-by method
    apt-get update -y -qq
    apt-get install -y --no-install-recommends apt-transport-https ca-certificates gnupg curl

    # Add Google Cloud GPG key (modern method, no apt-key)
    curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg \
        | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg

    # Google Cloud SDK uses its own flat distribution (cloud-sdk), not Debian codename-specific
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" \
        >/etc/apt/sources.list.d/google-cloud-sdk.list

    apt-get update -y -qq
    apt-get install -y --no-install-recommends \
        google-cloud-cli \
        google-cloud-cli-gke-gcloud-auth-plugin

    apt-get clean
    rm -rf /var/lib/apt/lists/*
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
