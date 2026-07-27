#!/bin/bash
# Verification script for SQL Server overlay
# Confirms SQL Server service is accessible

set -e

echo "🔍 Verifying SQL Server overlay..."
echo ""

# Check if SQL Server service is running
echo "1️⃣ Checking SQL Server service..."
SQLSERVER_READY=false
MSSQL_SA_PASSWORD="${MSSQL_SA_PASSWORD:-{{cs.MSSQL_SA_PASSWORD}}}"
MSSQL_HOST="${MSSQL_HOST:-sqlserver{{cs.CS_INSTANCE_SUFFIX}}}"
MSSQL_PORT="${MSSQL_PORT:-{{cs.MSSQL_PORT}}}"

for i in {1..60}; do
    if command -v docker &>/dev/null; then
        CONTAINER=$(docker ps -qf "name=${MSSQL_HOST}" 2>/dev/null | head -1)
        if [ -n "$CONTAINER" ] && \
           docker exec "$CONTAINER" /opt/mssql-tools18/bin/sqlcmd \
               -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -Q "SELECT 1" -No &>/dev/null 2>&1; then
            echo "   ✅ SQL Server service is ready"
            SQLSERVER_READY=true
            break
        fi
    fi
    if bash -c "echo > /dev/tcp/${MSSQL_HOST}/${MSSQL_PORT}" 2>/dev/null; then
        sleep 15
        echo "   ✅ SQL Server port ${MSSQL_PORT} is accepting connections"
        SQLSERVER_READY=true
        break
    fi
    sleep 2
done

if [ "$SQLSERVER_READY" = false ]; then
    echo "   ❌ SQL Server service not ready after 120 seconds"
    echo "   ⚠️  SQL Server can take 30-60 seconds to start"
    exit 1
fi

echo ""
echo "✅ SQL Server overlay verification complete"
