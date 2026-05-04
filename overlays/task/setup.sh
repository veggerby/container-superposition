#!/bin/bash
# Setup script for Taskfile (task)

set -e

echo "🔧 Setting up Taskfile (task)..."

# Source shared setup utilities
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

detect_arch

TASK_VERSION="${TASK_VERSION:-v3.45.4}"
echo "📦 Installing task ${TASK_VERSION}..."

install_binary_from_tar \
    "https://github.com/go-task/task/releases/download/${TASK_VERSION}/task_linux_${CS_ARCH}.tar.gz" \
    "task"

if command -v task >/dev/null 2>&1; then
    echo "✅ task installed successfully"
    task --version
else
    echo "❌ task installation failed"
    exit 1
fi

echo "✅ Taskfile setup complete"
