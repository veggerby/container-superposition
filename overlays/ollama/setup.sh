#!/bin/bash
# Ollama CLI setup script
# Installs the Ollama CLI in the devcontainer so developers can manage models
# and run inference from the terminal, targeting the ollama sidecar service.

set -e

source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

detect_arch

if command_exists ollama; then
    echo "✓ Ollama CLI already installed: $(ollama --version)"
    echo "ℹ️  OLLAMA_HOST is set to ${OLLAMA_HOST:-http://ollama:11434} — all commands target the sidecar."
    exit 0
fi

echo "📦 Installing Ollama CLI..."
# Prefer copying the CLI binary from the already-present Ollama sidecar image.
# Compose-based templates include docker-outside-of-docker, so this avoids
# re-downloading the multi-GB upstream Linux release archive in normal use.
OLLAMA_IMAGE="ollama/ollama:${OLLAMA_VERSION:-latest}"
if command_exists docker && docker info >/dev/null 2>&1; then
    tmpdir=$(mktemp -d)
    docker_container_id=""
    trap '[ -n "${docker_container_id}" ] && docker rm -f "${docker_container_id}" >/dev/null 2>&1 || true; rm -rf "${tmpdir}"' EXIT

    # Guard Docker command substitutions with || fallback so failures here are
    # non-fatal and the archive fallback below can still run.
    container_id="$(docker ps -q --filter "ancestor=${OLLAMA_IMAGE}" 2>/dev/null | head -n 1)" || container_id=""

    if [ -z "${container_id}" ] && docker image inspect "${OLLAMA_IMAGE}" >/dev/null 2>&1; then
        container_id="$(docker create "${OLLAMA_IMAGE}" 2>/dev/null)" || container_id=""
        [ -n "${container_id}" ] && docker_container_id="${container_id}"
    fi

    if [ -n "${container_id}" ] && docker cp "${container_id}:/usr/bin/ollama" "${tmpdir}/ollama" >/dev/null 2>&1; then
        echo "📦 Installing Ollama CLI from local Docker image..."
        sudo install -m 0755 "${tmpdir}/ollama" /usr/local/bin/ollama
    fi

    [ -n "${docker_container_id}" ] && docker rm -f "${docker_container_id}" >/dev/null 2>&1 || true
    docker_container_id=""
    rm -rf "${tmpdir}"
    trap - EXIT
fi

if ! command_exists ollama; then
    # Fallback to official release archives without invoking the full
    # install.sh flow, which configures a local daemon/service that the
    # devcontainer does not need because the sidecar already provides the API.
    OLLAMA_DOWNLOAD_BASE="https://ollama.com/download/ollama-linux-${CS_ARCH}"

    if curl -fsSLI "${OLLAMA_DOWNLOAD_BASE}.tar.zst" >/dev/null 2>&1; then
        if ! command_exists zstd; then
            echo "📦 Installing zstd for Ollama archive extraction..."
            apt_install zstd
        fi

        archive_size_bytes="$(
            curl -fsSLI "${OLLAMA_DOWNLOAD_BASE}.tar.zst" |
                awk 'BEGIN { IGNORECASE = 1 } /^content-length:/ { print $2 }' |
                tr -d '\r' |
                tail -n 1
        )"

        if [ -n "${archive_size_bytes}" ]; then
            archive_size_gib="$(awk "BEGIN { printf \"%.1f\", ${archive_size_bytes} / 1024 / 1024 / 1024 }")"
            echo "⬇️ Downloading official Ollama archive (~${archive_size_gib} GiB)..."
        else
            echo "⬇️ Downloading official Ollama archive..."
        fi

        tmpdir=$(mktemp -d)
        trap 'rm -rf "${tmpdir}"' EXIT

        curl --fail --location --progress-bar "${OLLAMA_DOWNLOAD_BASE}.tar.zst" -o "${tmpdir}/ollama.tar.zst"

        # Match the official Linux package layout so the CLI keeps working even
        # when upstream ships supporting files under lib/ollama alongside the
        # top-level ollama binary.
        echo "📦 Extracting Ollama CLI from archive..."
        sudo rm -rf /usr/local/lib/ollama
        zstd -d -c "${tmpdir}/ollama.tar.zst" | sudo tar -xf - -C /usr/local
        sudo install -d /usr/local/bin
        sudo ln -sf /usr/local/ollama /usr/local/bin/ollama

        rm -rf "${tmpdir}"
        trap - EXIT
    else
        install_binary_from_tar \
            "${OLLAMA_DOWNLOAD_BASE}.tgz" \
            "bin/ollama" \
            "ollama"
    fi
fi

export PATH="/usr/local/bin:/usr/bin:/bin:${PATH}"

if ! command_exists ollama; then
    echo "❌ Ollama CLI install completed but the binary is still not on PATH"
    exit 1
fi

echo "✓ Ollama CLI installed: $(ollama --version)"
echo "ℹ️  OLLAMA_HOST is set to ${OLLAMA_HOST:-http://ollama:11434} — all commands target the sidecar."
