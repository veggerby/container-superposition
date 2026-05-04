#!/bin/bash
# Verification script for Taskfile (task) overlay

set -e

echo "🔍 Verifying Taskfile overlay..."

if command -v task >/dev/null 2>&1; then
    task --version
    echo "✅ task is installed"
else
    echo "❌ task is not installed"
    exit 1
fi
