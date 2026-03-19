#!/bin/bash
# Shared setup utilities for container-superposition overlay scripts.
# Sourced automatically: source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

# ---------------------------------------------------------------------------
# APT / DPKG helpers
# ---------------------------------------------------------------------------

# Advisory lock file used to serialize apt operations across all parallel
# postCreateCommand scripts. All scripts in the same container run as the
# same user, so /tmp is the right place.
_CS_APT_LOCK=/tmp/.cs-apt.lock

# Acquire an exclusive advisory lock for apt/dpkg operations.
# Blocks until the lock is available (up to 120 seconds).
#
# Crash safety: the kernel automatically releases flock locks when the process
# exits for any reason (error, signal, SIGKILL). The explicit trap below also
# closes fd 9 on EXIT so it is not inherited by background child processes
# spawned after this point, which would otherwise keep the lock alive.
acquire_apt_lock() {
    exec 9>"$_CS_APT_LOCK"
    # Prevent fd 9 from being inherited by child processes
    # (sets close-on-exec flag, bash-compatible syntax)
    { true 9>&-; } 2>/dev/null || true  # test if we can close; harmless if not
    echo "⏳ Acquiring apt lock..."
    flock -w 120 9 || echo "⚠️  apt lock timeout after 120s, proceeding..."
    # Explicitly close fd 9 on any exit (ERR, normal, or signal) so background
    # children started after this call don't inherit and extend the lock.
    # Uses a wrapper to avoid clobbering any existing EXIT trap.
    _cs_prev_exit_trap=$(trap -p EXIT 2>/dev/null)
    trap '_cs_apt_cleanup' EXIT
}

_cs_apt_cleanup() {
    release_apt_lock
    # Re-invoke the previous EXIT trap if there was one
    if [ -n "$_cs_prev_exit_trap" ]; then
        eval "$_cs_prev_exit_trap" 2>/dev/null || true
    fi
}

# Release the advisory apt lock acquired by acquire_apt_lock.
release_apt_lock() {
    flock -u 9 2>/dev/null || true
    exec 9>&- 2>/dev/null || true
}

# @deprecated: use acquire_apt_lock / release_apt_lock instead.
# Kept for backward compatibility — now uses the real flock mutex rather
# than the old poll-and-hope approach.
wait_for_apt_lock() {
    acquire_apt_lock
}

# Add a third-party apt repository with a GPG key.
# Does not require the apt lock — it only writes key/sources files.
# Usage: add_apt_repo <key-url> <keyring-path> <repo-line> <sources-list-file>
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
