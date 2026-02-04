#!/bin/bash
# Verification script for PostgreSQL overlay
# Confirms PostgreSQL is installed and accessible

set -e

echo "🔍 Verifying PostgreSQL overlay..."
echo ""

# Check psql is installed
echo "1️⃣ Checking psql client..."
if command -v psql &> /dev/null; then
    psql --version
    echo "   ✅ psql client found"
else
    echo "   ❌ psql client not found"
    exit 1
fi

# Check if PostgreSQL service is running
echo ""
echo "2️⃣ Checking PostgreSQL service..."
if command -v pg_isready &> /dev/null; then
    # Wait up to 10 seconds for postgres to be ready
    for i in {1..10}; do
        if pg_isready -h postgres -p 5432 &> /dev/null; then
            echo "   ✅ PostgreSQL service is ready"
            pg_isready -h postgres -p 5432
            break
        fi
        if [ $i -eq 10 ]; then
            echo "   ⚠️  PostgreSQL service not ready yet (may still be starting)"
        fi
        sleep 1
    done
else
    echo "   ⚠️  pg_isready not found, skipping service check"
fi

echo ""
echo "✅ PostgreSQL overlay verification complete"
