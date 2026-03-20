#!/bin/bash
# Rust setup script - Install Rust components and tools

set -e

# Source shared setup utilities
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

echo "🔧 Setting up Rust development environment..."

# Install common Rust components and tools
run_spinner "rustfmt component"    rustup component add rustfmt
run_spinner "clippy component"     rustup component add clippy
run_spinner "rust-src component"   rustup component add rust-src

# Install common cargo tools
echo "📦 Installing cargo tools..."
run_spinner "cargo-watch" cargo install --quiet cargo-watch
run_spinner "cargo-edit"  cargo install --quiet cargo-edit

# Install project dependencies if Cargo.toml exists
if [ -f "Cargo.toml" ]; then
    echo "📦 Rust project detected, building dependencies..."
    run_spinner "cargo fetch" cargo fetch
fi

echo "✓ Rust setup complete"
