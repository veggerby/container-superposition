#!/bin/bash
# Go setup script - Install Go tools and verify installation

set -e

echo "🔧 Setting up Go development environment..."

# Install common Go tools
echo "📦 Installing Go development tools..."

# gopls (Language Server)
go install golang.org/x/tools/gopls@latest || echo "⚠️ gopls installation failed"

# delve (Debugger)
go install github.com/go-delve/delve/cmd/dlv@latest || echo "⚠️ delve installation failed"

# golangci-lint (Linter)
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin || echo "⚠️ golangci-lint installation failed"

# gofumpt (Formatter)
go install mvdan.cc/gofumpt@latest || echo "⚠️ gofumpt installation failed"

# staticcheck (Static analyzer)
go install honnef.co/go/tools/cmd/staticcheck@latest || echo "⚠️ staticcheck installation failed"

# Install project dependencies if go.mod exists
if [ -f "go.mod" ]; then
    echo "📦 Go module detected, downloading dependencies..."
    go mod download || echo "⚠️ go mod download failed"
    go mod tidy || echo "⚠️ go mod tidy failed"
fi

echo "✓ Go setup complete"
