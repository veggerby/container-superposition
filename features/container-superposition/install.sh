#!/usr/bin/env bash
# Installs the published Container Superposition CLI. Feature installation deliberately
# does not inspect the workspace or run regen/amend/devcontainer lifecycle commands.
set -euo pipefail

PACKAGE_SELECTION="${VERSION:-latest}"

is_exact_version() {
    [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]
}

is_dist_tag() {
    [[ "$1" =~ ^[A-Za-z][A-Za-z0-9._-]*$ ]]
}

if ! is_exact_version "$PACKAGE_SELECTION" && ! is_dist_tag "$PACKAGE_SELECTION"; then
    echo "Container Superposition Feature: version must be an exact semver or simple npm dist-tag." >&2
    exit 1
fi

echo "Installing container-superposition@${PACKAGE_SELECTION}..."
npm install --global --no-audit --no-fund "container-superposition@${PACKAGE_SELECTION}"

if ! command -v cs >/dev/null 2>&1; then
    echo "Container Superposition Feature: cs was not found on PATH after installation." >&2
    exit 1
fi

cs --version
