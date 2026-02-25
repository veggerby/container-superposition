#!/bin/bash
# Verification script for gRPC Tools overlay
# Confirms protoc, buf, and grpcurl are installed

echo "🔍 Verifying gRPC Tools overlay..."
echo ""

ALL_CHECKS_PASSED=true

# Check protoc
echo "1️⃣ Checking protoc (Protocol Buffers compiler)..."
if command -v protoc &> /dev/null; then
    echo "   ✅ protoc found: $(protoc --version)"
else
    echo "   ❌ protoc not found"
    ALL_CHECKS_PASSED=false
fi

# Check buf
echo ""
echo "2️⃣ Checking buf CLI..."
if command -v buf &> /dev/null; then
    echo "   ✅ buf found: $(buf --version)"
else
    echo "   ❌ buf not found"
    ALL_CHECKS_PASSED=false
fi

# Check grpcurl
echo ""
echo "3️⃣ Checking grpcurl..."
if command -v grpcurl &> /dev/null; then
    echo "   ✅ grpcurl found: $(grpcurl --version 2>&1 | head -1)"
else
    echo "   ❌ grpcurl not found"
    ALL_CHECKS_PASSED=false
fi

echo ""
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo "✅ gRPC Tools overlay verification complete"
else
    echo "❌ Some gRPC tools are missing"
    exit 1
fi
