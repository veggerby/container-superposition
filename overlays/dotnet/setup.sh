#!/bin/bash
# .NET setup script - Install global tools and configure environment

set -e

# Suppress the .NET SDK first-run welcome banner and telemetry noise
export DOTNET_NOLOGO=1
export DOTNET_CLI_TELEMETRY_OPTOUT=1
export DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1

# Extract overlay name from script filename (setup-<overlay>.sh -> <overlay>)
OVERLAY_NAME=$(basename "$0" | sed 's/setup-//;s/\.sh$//')

echo "🔧 Installing .NET global tools..."

# Read tools from configuration file if it exists
if [ -f ".devcontainer/global-tools-${OVERLAY_NAME}.txt" ]; then
    echo "📦 Installing tools from global-tools-${OVERLAY_NAME}.txt..."
    
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip comments and empty lines
        [[ "$line" =~ ^#.*$ ]] && continue
        [[ -z "$line" ]] && continue
        
        # Parse tool name and optional version (format: tool::version)
        if [[ "$line" =~ ^(.+)::(.+)$ ]]; then
            tool="${BASH_REMATCH[1]}"
            version="${BASH_REMATCH[2]}"
            echo "  Installing $tool version $version..."
            dotnet tool install --global "$tool" --version "$version" 2>&1 | grep -v 'Tools directory\|export PATH\|cat <<\|bash_profile\|current session\|You can invoke' || true
        else
            tool="$line"
            echo "  Installing $tool..."
            dotnet tool install --global "$tool" 2>&1 | grep -v 'Tools directory\|export PATH\|cat <<\|bash_profile\|current session\|You can invoke' || true
        fi
    done < ".devcontainer/global-tools-${OVERLAY_NAME}.txt"
else
    # Fallback to hardcoded list
    echo "📦 Installing default .NET global tools..."
    dotnet tool install --global dotnet-ef 2>&1 | grep -v 'Tools directory\|export PATH\|cat <<\|bash_profile\|current session\|You can invoke' || true
    dotnet tool install --global dotnet-format 2>&1 | grep -v 'Tools directory\|export PATH\|cat <<\|bash_profile\|current session\|You can invoke' || true
    dotnet tool install --global dotnet-outdated-tool 2>&1 | grep -v 'Tools directory\|export PATH\|cat <<\|bash_profile\|current session\|You can invoke' || true
fi

# Verify installations
echo "✓ .NET global tools installed:"
dotnet tool list --global

# Restore project dependencies if solution/project exists
if [ -f "*.sln" ] || [ -f "*.csproj" ] || [ -f "*.fsproj" ]; then
    echo "📦 Restoring .NET dependencies..."
    dotnet restore || true
    echo "✓ .NET dependencies restored"
fi

echo "✓ .NET setup complete"
