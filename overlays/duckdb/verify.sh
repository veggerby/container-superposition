#!/bin/bash
# Verification script for DuckDB overlay
# Confirms DuckDB is installed

set -e

echo "🔍 Verifying DuckDB overlay..."
echo ""

# Check DuckDB CLI is installed
echo "1️⃣ Checking DuckDB CLI installation..."
if command -v duckdb &> /dev/null; then
    duckdb --version
    echo "   ✅ DuckDB CLI is installed"
else
    echo "   ❌ DuckDB CLI is not installed"
    exit 1
fi

# Test DuckDB with a simple query
echo ""
echo "2️⃣ Testing DuckDB with simple query..."
RESULT=$(echo "SELECT 'DuckDB is working!' as message;" | duckdb 2>&1 | grep -i "DuckDB is working" || true)
if [ -n "$RESULT" ]; then
    echo "   ✅ DuckDB query executed successfully"
else
    echo "   ❌ DuckDB query failed"
    exit 1
fi

echo ""
echo "✅ DuckDB overlay verification complete"
