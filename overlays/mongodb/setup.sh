#!/bin/bash
# MongoDB setup script - Install mongosh client

set -e

echo "📦 Installing mongosh client..."

# Source shared setup utilities
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

if command -v apk >/dev/null 2>&1; then
    # Alpine Linux — `mongodb-tools` does not include mongosh on Alpine.
    # Install mongosh from the MongoDB community package (available on Alpine 3.17+).
    apk add --no-cache mongodb-mongosh 2>/dev/null || {
        echo "⚠️  mongosh package not found in Alpine repos; falling back to npm install"
        apk add --no-cache nodejs npm
        npm install -g mongosh
    }
elif command -v apt-get >/dev/null 2>&1; then
    # Debian/Ubuntu — install prerequisites first, then add the MongoDB repo.
    # MongoDB doesn't publish a trixie/sid repo yet; fall back to bookworm.
    CODENAME=$(. /etc/os-release && echo "${VERSION_CODENAME:-bookworm}")
    case "$CODENAME" in
        trixie | sid | testing) CODENAME="bookworm" ;;
    esac

    # Single lock acquisition: install prereqs, add repo, update, install mongosh.
    # curl and gnupg must be present before add_apt_repo runs them.
    acquire_apt_lock
    sudo DEBIAN_FRONTEND=noninteractive TERM=dumb apt-get update -qq
    sudo DEBIAN_FRONTEND=noninteractive TERM=dumb apt-get install -y -qq --no-install-recommends curl gnupg ca-certificates
    release_apt_lock

    add_apt_repo \
        "https://www.mongodb.org/static/pgp/server-8.0.asc" \
        "/usr/share/keyrings/mongodb-server.gpg" \
        "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server.gpg ] https://repo.mongodb.org/apt/debian ${CODENAME}/mongodb-org/8.0 main" \
        "/etc/apt/sources.list.d/mongodb-org.list"

    acquire_apt_lock
    sudo DEBIAN_FRONTEND=noninteractive TERM=dumb apt-get update -qq
    sudo DEBIAN_FRONTEND=noninteractive TERM=dumb apt-get install -y -qq --no-install-recommends mongodb-mongosh
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
