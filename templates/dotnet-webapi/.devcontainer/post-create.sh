#!/bin/bash
set -e

echo "🚀 Running post-create setup for .NET Web API environment..."

# Install global tools
dotnet tool install -g dotnet-ef
dotnet tool install -g dotnet-outdated-tool
dotnet tool install -g dotnet-format

# Add tools to PATH
export PATH="$PATH:/home/vscode/.dotnet/tools"
echo 'export PATH="$PATH:/home/vscode/.dotnet/tools"' >> ~/.bashrc

# If .sln or .csproj exists, restore packages
if ls *.sln 1> /dev/null 2>&1; then
    echo "📦 Restoring NuGet packages from solution..."
    dotnet restore
elif ls *.csproj 1> /dev/null 2>&1; then
    echo "📦 Restoring NuGet packages from project..."
    dotnet restore
else
    echo "ℹ️  No .sln or .csproj found. Create a new project with:"
    echo "  dotnet new webapi -n MyApi"
    echo "  dotnet new sln -n MySolution"
fi

echo "✅ Post-create setup complete!"
echo ""
echo "🎯 Quick start commands:"
echo "  dotnet run                  - Run the application"
echo "  dotnet watch run            - Run with hot reload"
echo "  dotnet test                 - Run tests"
echo "  dotnet build                - Build the project"
echo "  dotnet ef migrations add    - Create EF migration"
