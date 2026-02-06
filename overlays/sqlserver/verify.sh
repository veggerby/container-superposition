#!/bin/bash
# Verification script for SQL Server overlay
# Confirms SQL Server service is accessible

set -e

echo "🔍 Verifying SQL Server overlay..."
echo ""

# Check if SQL Server service is running
echo "1️⃣ Checking SQL Server service..."
SQLSERVER_READY=false
for i in {1..30}; do
    # Try to connect using docker exec (sqlcmd is in the container, not necessarily in dev container)
    if docker exec $(docker ps -qf "name=sqlserver") /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'YourStrong@Passw0rd' -Q "SELECT 1" &> /dev/null; then
        echo "   ✅ SQL Server service is ready"
        SQLSERVER_READY=true
        break
    fi
    sleep 2
done

if [ "$SQLSERVER_READY" = false ]; then
    echo "   ❌ SQL Server service not ready after 60 seconds"
    echo "   ⚠️  SQL Server can take 30-60 seconds to start"
    exit 1
fi

echo ""
echo "✅ SQL Server overlay verification complete"
