#!/bin/bash
# Dev Container CLI setup script - Install @devcontainers/cli globally

set -e

echo "📦 Installing @devcontainers/cli..."
npm install -g @devcontainers/cli

echo "✓ devcontainer CLI installed: $(devcontainer --version)"
