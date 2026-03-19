#!/bin/bash
# Shared setup utilities for container-superposition overlay scripts.
# Sourced automatically: source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

# ---------------------------------------------------------------------------
# APT / DPKG helpers
# ---------------------------------------------------------------------------

# Wait for apt and dpkg locks to become available.
# Needed when multiple setup scripts run in parallel via postCreateCommand.
wait_for_apt_lock() {
    local retries=15
    while [ $retries -gt 0 ]; do
        if ! sudo flock -n /var/lib/dpkg/lock-frontend true 2>/dev/null || \
           ! sudo flock -n /var/lib/apt/lists/lock true 2>/dev/null; then
            echo "⏳ Waiting for apt/dpkg lock..."
            sleep 4
            retries=$((retries - 1))
        else
            return 0
        fi
    done
    echo "⚠️  apt lock wait timed out, proceeding anyway..."
}

# Add a third-party apt repository with a GPG key.
# Usage: add_apt_repo <key-url> <keyring-path> <repo-line> <sources-list-file>
# Example:
#   add_apt_repo \
#     "https://example.com/repo.gpg" \
#     "/usr/share/keyrings/example.gpg" \
#     "deb [signed-by=/usr/share/keyrings/example.gpg] https://repo.example.com stable main" \
#     "/etc/apt/sources.list.d/example.list"
add_apt_repo() {
    local key_url="$1"
    local keyring_path="$2"
    local repo_line="$3"
    local sources_file="$4"

    curl -fsSL "$key_url" | sudo gpg --dearmor -o "$keyring_path"
    echo "$repo_line" | sudo tee "$sources_file" >/dev/null
}

# ---------------------------------------------------------------------------
# Architecture detection
# ---------------------------------------------------------------------------

# Sets ARCH_AMD64_ARM64 to "amd64" or "arm64" based on uname -m.
# Exits with an error for unsupported architectures unless a fallback is given.
# Usage:
#   detect_arch             # exits on unknown arch
#   detect_arch amd64       # falls back to amd64 on unknown arch
detect_arch() {
    local fallback="${1:-}"
    local raw
    raw=$(uname -m)
    case "$raw" in
        x86_64)          ARCH_AMD64_ARM64="amd64" ;;
        aarch64|arm64)   ARCH_AMD64_ARM64="arm64" ;;
        *)
            if [ -n "$fallback" ]; then
                echo "⚠️  Unsupported architecture: $raw, falling back to $fallback"
                ARCH_AMD64_ARM64="$fallback"
            else
                echo "❌ Unsupported architecture: $raw"
                exit 1
            fi
            ;;
    esac
    export ARCH_AMD64_ARM64
}

# ---------------------------------------------------------------------------
# Binary installation helpers
# ---------------------------------------------------------------------------

# Download a single binary from a URL, install it to /usr/local/bin, and clean up.
# Usage: install_binary <url> <binary-name> [mode]
#   mode defaults to 0755
install_binary() {
    local url="$1"
    local name="$2"
    local mode="${3:-0755}"
    local tmp
    tmp=$(mktemp)
    curl -fsSL "$url" -o "$tmp"
    sudo install -m "$mode" "$tmp" "/usr/local/bin/$name"
    rm -f "$tmp"
}

# Download a .tar.gz, extract a single named binary, install to /usr/local/bin.
# Usage: install_binary_from_tar <url> <binary-name-in-archive> [dest-name] [mode]
install_binary_from_tar() {
    local url="$1"
    local bin_in_archive="$2"
    local dest_name="${3:-$bin_in_archive}"
    local mode="${4:-0755}"
    local tmpdir
    tmpdir=$(mktemp -d)
    curl -fsSL "$url" -o "${tmpdir}/archive.tar.gz"
    tar -xzf "${tmpdir}/archive.tar.gz" -C "$tmpdir" "$bin_in_archive"
    sudo install -m "$mode" "${tmpdir}/${bin_in_archive}" "/usr/local/bin/${dest_name}"
    rm -rf "$tmpdir"
}
