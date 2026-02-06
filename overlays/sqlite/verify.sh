#!/bin/bash
# Verification script for SQLite overlay
# Confirms SQLite and tools are installed

set -e

echo "🔍 Verifying SQLite overlay..."
echo ""

# Check sqlite3 is installed
echo "1️⃣ Checking sqlite3..."
if command -v sqlite3 &> /dev/null; then
    sqlite3 --version
    echo "   ✅ sqlite3 found"
else
    echo "   ❌ sqlite3 not found"
    exit 1
fi

# Check litecli (optional)
echo ""
echo "2️⃣ Checking litecli (optional enhanced CLI)..."
if command -v litecli &> /dev/null; then
    litecli --version
    echo "   ✅ litecli found"
else
    echo "   ⚠️  litecli not found (optional - install Python overlay for litecli)"
fi

# Test SQLite functionality
echo ""
echo "3️⃣ Testing SQLite functionality..."
TEST_DB="/tmp/test_sqlite.db"
if sqlite3 "$TEST_DB" "CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT); INSERT INTO test (value) VALUES ('hello'); SELECT * FROM test;" &> /dev/null; then
    echo "   ✅ SQLite is functional"
    rm -f "$TEST_DB"
else
    echo "   ❌ SQLite functionality test failed"
    exit 1
fi

echo ""
echo "✅ SQLite overlay verification complete"
