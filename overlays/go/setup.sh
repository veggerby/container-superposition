#!/bin/bash
# Go setup script - Install Go tools and verify installation

set -e

echo "🔧 Setting up Go development environment..."

# Install common Go tools
echo "📦 Installing Go development tools..."

# Redirect go: downloading lines — they are noisy and uninformative in logs
exec 3>&2 2>/dev/null

# gopls (Language Server)
go install golang.org/x/tools/gopls@latest 2>&3 || echo "⚠️ gopls installation failed"

# delve (Debugger)
go install github.com/go-delve/delve/cmd/dlv@latest 2>&3 || echo "⚠️ delve installation failed"

# golangci-lint (Linter) — use official installer to avoid gold linker issues on arm64
if ! command -v golangci-lint &>/dev/null; then
    curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh \
        | sh -s -- -b "$(go env GOPATH)/bin" || echo "⚠️ golangci-lint installation failed"
else
    echo "ℹ️ golangci-lint already installed: $(golangci-lint version --short 2>/dev/null || true)"
fi

# gofumpt (Formatter)
go install mvdan.cc/gofumpt@latest 2>&3 || echo "⚠️ gofumpt installation failed"

# staticcheck (Static analyzer)
go install honnef.co/go/tools/cmd/staticcheck@latest 2>&3 || echo "⚠️ staticcheck installation failed"

exec 2>&3 3>&-  # restore stderr

# Install project dependencies if go.mod exists
if [ -f "go.mod" ]; then
    echo "📦 Go module detected, downloading dependencies..."
    go mod download || echo "⚠️ go mod download failed"
    go mod tidy || echo "⚠️ go mod tidy failed"
fi

echo "✓ Go setup complete"
