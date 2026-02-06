#!/bin/bash
# Verification script for Rust overlay

set -e

echo "🔍 Verifying Rust overlay..."
echo ""

# Check Rust is installed
echo "1️⃣ Checking Rust..."
if command -v rustc &> /dev/null; then
    rustc --version
    echo "   ✅ Rust found"
else
    echo "   ❌ Rust not found"
    exit 1
fi

# Check Cargo is installed
echo ""
echo "2️⃣ Checking Cargo..."
if command -v cargo &> /dev/null; then
    cargo --version
    echo "   ✅ Cargo found"
else
    echo "   ❌ Cargo not found"
    exit 1
fi

# Check rustfmt
echo ""
echo "3️⃣ Checking rustfmt..."
if command -v rustfmt &> /dev/null; then
    rustfmt --version
    echo "   ✅ rustfmt found"
else
    echo "   ⚠️ rustfmt not found"
fi

# Check clippy
echo ""
echo "4️⃣ Checking clippy..."
if command -v cargo-clippy &> /dev/null; then
    cargo clippy --version
    echo "   ✅ clippy found"
else
    echo "   ⚠️ clippy not found"
fi

echo ""
echo "✅ Rust overlay verification complete"
