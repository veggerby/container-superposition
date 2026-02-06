#!/bin/bash
# Verification script for MySQL overlay
# Confirms MySQL client and services are accessible

set -e

echo "🔍 Verifying MySQL overlay..."
echo ""

# Check mysql client is installed
echo "1️⃣ Checking mysql client..."
if command -v mysql &> /dev/null; then
    mysql --version
    echo "   ✅ mysql client found"
else
    echo "   ❌ mysql client not found"
    exit 1
fi

# Check if MySQL service is running
echo ""
echo "2️⃣ Checking MySQL service..."
MYSQL_READY=false
for i in {1..15}; do
    if mysql -h mysql -P 3306 -u root -prootpassword -e "SELECT 1" &> /dev/null; then
        echo "   ✅ MySQL service is ready"
        MYSQL_READY=true
        break
    fi
    sleep 1
done

if [ "$MYSQL_READY" = false ]; then
    echo "   ❌ MySQL service not ready after 15 seconds"
    exit 1
fi

# Check phpMyAdmin
echo ""
echo "3️⃣ Checking phpMyAdmin web UI..."
if curl -s -o /dev/null -w "%{http_code}" http://phpmyadmin:80 | grep -q "200"; then
    echo "   ✅ phpMyAdmin is accessible"
else
    echo "   ⚠️  phpMyAdmin may still be starting up"
fi

echo ""
echo "✅ MySQL overlay verification complete"
