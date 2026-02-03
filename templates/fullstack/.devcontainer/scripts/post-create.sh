#!/bin/bash
set -e

echo "🚀 Running post-create setup for Full Stack Development environment..."

# Install global package managers (optional)
echo "📦 Installing global package managers..."
npm install -g pnpm 2>/dev/null || echo "  pnpm already installed or skipped"
npm install -g yarn 2>/dev/null || echo "  yarn already installed or skipped"

# Check for existing Node.js project
if [ -f "package.json" ]; then
    echo "✅ Found package.json"
    if [ -d "node_modules" ]; then
        echo "ℹ️  Node.js dependencies already installed"
    else
        echo "ℹ️  Run 'npm install' or 'pnpm install' to install dependencies"
    fi
else
    echo "ℹ️  No package.json found"
fi

# Check for existing Python project
if [ -f "requirements.txt" ]; then
    echo "✅ Found requirements.txt"
    echo "ℹ️  Run 'pip install -r requirements.txt' to install Python dependencies"
elif [ -f "pyproject.toml" ]; then
    echo "✅ Found pyproject.toml"
    echo "ℹ️  Run 'pip install -e .' or 'poetry install' to install Python dependencies"
else
    echo "ℹ️  No Python project files found"
fi

# Test database connection
echo ""
echo "🔍 Testing service connections..."

# Wait a bit for services to be ready
sleep 2

# Test PostgreSQL
if pg_isready -h postgres -p 5432 -U ${POSTGRES_USER:-appuser} >/dev/null 2>&1; then
    echo "✅ PostgreSQL is ready"
else
    echo "⚠️  PostgreSQL connection not ready yet (this is normal on first start)"
fi

# Test Redis
if redis-cli -h redis ping >/dev/null 2>&1; then
    echo "✅ Redis is ready"
else
    echo "⚠️  Redis connection not ready yet (this is normal on first start)"
fi

echo ""
echo "✅ Post-create setup complete!"
echo ""
echo "📊 Observability Stack:"
echo "  Jaeger UI:     http://localhost:16686  (distributed tracing)"
echo "  Grafana:       http://localhost:3100   (dashboards - admin/admin)"
echo "  Prometheus:    http://localhost:9090   (metrics)"
echo "  Loki:          http://localhost:3101   (logs)"
echo ""
echo "💾 Data Stores:"
echo "  PostgreSQL:    localhost:5432 (user: ${POSTGRES_USER:-appuser}, db: ${POSTGRES_DB:-appdb})"
echo "  Redis:         localhost:6379"
echo ""
echo "🎯 Quick start commands:"
echo "  npm install           - Install Node.js dependencies"
echo "  pip install -r req... - Install Python dependencies"
echo "  psql -h postgres...   - Connect to PostgreSQL"
echo "  redis-cli -h redis    - Connect to Redis"
echo ""
echo "📝 To instrument your application with OpenTelemetry, see README.md"
