#!/bin/bash
# Rust setup script - Install Rust components and tools

set -e

echo "🔧 Setting up Rust development environment..."

# Install common Rust components and tools
echo "📦 Installing Rust components..."

# rustfmt (Code formatter)
rustup component add rustfmt || echo "⚠️ rustfmt already installed"

# clippy (Linter)
rustup component add clippy || echo "⚠️ clippy already installed"

# rust-src (Source code for standard library)
rustup component add rust-src || echo "⚠️ rust-src already installed"

# Install common cargo tools
echo "📦 Installing cargo tools..."

# cargo-watch (Auto-rebuild on file changes)
cargo install cargo-watch || echo "⚠️ cargo-watch already installed"

# cargo-edit (Manage dependencies from CLI)
cargo install cargo-edit || echo "⚠️ cargo-edit already installed"

# Install project dependencies if Cargo.toml exists
if [ -f "Cargo.toml" ]; then
    echo "📦 Rust project detected, building dependencies..."
    cargo fetch || echo "⚠️ cargo fetch failed"
    cargo build || echo "⚠️ cargo build failed or skipped"
fi

echo "✓ Rust setup complete"
