#!/bin/bash
# .NET setup script - Install common global tools

set -e

echo "🔧 Installing .NET global tools..."

# Install common .NET global tools
dotnet tool install --global dotnet-ef || echo "dotnet-ef already installed"
dotnet tool install --global dotnet-format || echo "dotnet-format already installed"
dotnet tool install --global dotnet-outdated-tool || echo "dotnet-outdated-tool already installed"

# Verify installations
echo "✓ .NET global tools installed:"
dotnet tool list --global

echo "✓ .NET setup complete"
