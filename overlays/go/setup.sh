#!/bin/bash
# Go setup script - Install Go tools and verify installation

set -e

# Source shared setup utilities
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

echo "🔧 Setting up Go development environment..."
echo "📦 Installing Go development tools..."

run_spinner "gopls (language server)"   go install golang.org/x/tools/gopls@latest
run_spinner "delve (debugger)"          go install github.com/go-delve/delve/cmd/dlv@latest

# golangci-lint — use official installer to avoid gold linker issues on arm64
if ! command -v golangci-lint &>/dev/null; then
    run_spinner "golangci-lint" \
        bash -c 'curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b "$(go env GOPATH)/bin"'
else
    echo "  ℹ️  golangci-lint already installed: $(golangci-lint version --short 2>/dev/null || true)"
fi

run_spinner "gofumpt (formatter)"      go install mvdan.cc/gofumpt@latest
run_spinner "staticcheck (analyzer)"   go install honnef.co/go/tools/cmd/staticcheck@latest

# Install project dependencies if go.mod exists
if [ -f "go.mod" ]; then
    echo "📦 Go module detected, downloading dependencies..."
    go mod download || echo "⚠️ go mod download failed"
    go mod tidy || echo "⚠️ go mod tidy failed"
fi

echo "✓ Go setup complete"
