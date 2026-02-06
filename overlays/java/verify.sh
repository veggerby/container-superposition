#!/bin/bash
# Verification script for Java overlay

set -e

echo "🔍 Verifying Java overlay..."
echo ""

# Check Java is installed
echo "1️⃣ Checking Java..."
if command -v java &> /dev/null; then
    java -version
    echo "   ✅ Java found"
else
    echo "   ❌ Java not found"
    exit 1
fi

# Check Maven is installed
echo ""
echo "2️⃣ Checking Maven..."
if command -v mvn &> /dev/null; then
    mvn --version | head -n 1
    echo "   ✅ Maven found"
else
    echo "   ❌ Maven not found"
    exit 1
fi

# Check Gradle is installed
echo ""
echo "3️⃣ Checking Gradle..."
if command -v gradle &> /dev/null; then
    gradle --version | grep "Gradle " | head -n 1
    echo "   ✅ Gradle found"
else
    echo "   ❌ Gradle not found"
    exit 1
fi

echo ""
echo "✅ Java overlay verification complete"
