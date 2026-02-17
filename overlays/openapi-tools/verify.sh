#!/bin/bash
# Verification script for OpenAPI Tools overlay
# Confirms OpenAPI tools are installed

set -e

echo "🔍 Verifying OpenAPI Tools overlay..."
echo ""

ALL_CHECKS_PASSED=true

# Check swagger-cli
echo "1️⃣ Checking swagger-cli..."
if command -v swagger-cli &> /dev/null; then
    swagger-cli --version
    echo "   ✅ swagger-cli is installed"
else
    echo "   ❌ swagger-cli is not installed"
    ALL_CHECKS_PASSED=false
fi

# Check spectral
echo ""
echo "2️⃣ Checking spectral..."
if command -v spectral &> /dev/null; then
    spectral --version
    echo "   ✅ spectral is installed"
else
    echo "   ❌ spectral is not installed"
    ALL_CHECKS_PASSED=false
fi

# Check redocly
echo ""
echo "3️⃣ Checking redocly..."
if command -v redocly &> /dev/null; then
    redocly --version
    echo "   ✅ redocly is installed"
else
    echo "   ❌ redocly is not installed"
    ALL_CHECKS_PASSED=false
fi

echo ""
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo "✅ OpenAPI Tools overlay verification complete"
    exit 0
else
    echo "⚠️ Some OpenAPI tools are missing"
    exit 1
fi
