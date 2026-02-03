#!/usr/bin/env bash
set -e

echo "🚀 Running post-create setup for .NET environment..."

# Bash completion
if [ -x "$(command -v dotnet)" ]; then
    echo "
function _dotnet_bash_complete()
{
    local cur=\"\${COMP_WORDS[COMP_CWORD]}\" IFS=\$'\n'
    local candidates
    read -d '' -ra candidates < <(dotnet complete --position \"\${COMP_POINT}\" \"\${COMP_LINE}\" 2>/dev/null)
    read -d '' -ra COMPREPLY < <(compgen -W \"\${candidates[*]:-}\" -- \"\$cur\")
}

complete -f -F _dotnet_bash_complete dotnet
" >> ~/.bashrc
fi



# Install tools

if [ -x "$(command -v dotnet)" ]; then
    echo "📦 Installing global .NET tools..."
    dotnet tool install -g dotnet-ef 2>/dev/null || echo "  dotnet-ef already installed"
    dotnet tool install -g dotnet-outdated-tool 2>/dev/null || echo "  dotnet-outdated-tool already installed"
    dotnet tool install -g dotnet-format 2>/dev/null || echo "  dotnet-format already installed"

    dotnet dev-certs https --trust
fi
