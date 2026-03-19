#!/bin/bash
# MongoDB setup script - Install mongosh client

set -e

echo "📦 Installing mongosh client..."

# Source shared setup utilities
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

if command -v apk >/dev/null 2>&1; then
    # Alpine Linux
    apk add --no-cache mongodb-tools
elif command -v apt-get >/dev/null 2>&1; then
    # Debian/Ubuntu — install from MongoDB's official apt repository
    # MongoDB doesn't publish a trixie/sid repo yet; fall back to bookworm
    CODENAME=$(. /etc/os-release && echo "${VERSION_CODENAME:-bookworm}")
    case "$CODENAME" in
        trixie | sid | testing) CODENAME="bookworm" ;;
    esac

    add_apt_repo \
        "https://www.mongodb.org/static/pgp/server-8.0.asc" \
        "/usr/share/keyrings/mongodb-server.gpg" \
        "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server.gpg ] https://repo.mongodb.org/apt/debian ${CODENAME}/mongodb-org/8.0 main" \
        "/etc/apt/sources.list.d/mongodb-org.list"

    # Single lock acquisition: install prereqs, then mongosh without a second apt-get update
    acquire_apt_lock
    sudo apt-get update -qq
    sudo apt-get install -y --no-install-recommends gnupg curl ca-certificates
    sudo apt-get install -y --no-install-recommends mongodb-mongosh
    sudo apt-get clean
    sudo rm -rf /var/lib/apt/lists/*
    release_apt_lock
else
    echo "⚠️  Unsupported package manager, skipping mongosh installation"
    exit 0
fi

if command -v mongosh >/dev/null 2>&1; then
    echo "✓ mongosh installed: $(mongosh --version)"
else
    echo "✗ mongosh installation failed"
    exit 1
fi

echo "✓ mongodb setup complete"
