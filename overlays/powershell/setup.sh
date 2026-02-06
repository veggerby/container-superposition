#!/bin/bash
# PowerShell setup script - Install common PowerShell modules

set -e

echo "🔧 Setting up PowerShell development environment..."

# Verify PowerShell is installed
if command -v pwsh &> /dev/null; then
    PWSH_VERSION=$(pwsh -NoProfile -Command '$PSVersionTable.PSVersion.ToString()')
    echo "✓ PowerShell found: v$PWSH_VERSION"
else
    echo "⚠️ PowerShell not found"
    exit 1
fi

# Install common PowerShell modules
echo "📦 Installing PowerShell modules..."

# PSScriptAnalyzer (Linting and best practices)
pwsh -NoProfile -Command 'Install-Module -Name PSScriptAnalyzer -Force -Scope CurrentUser -AllowClobber' || echo "⚠️ PSScriptAnalyzer installation failed"

# Pester (Testing framework)
pwsh -NoProfile -Command 'Install-Module -Name Pester -Force -Scope CurrentUser -AllowClobber -SkipPublisherCheck' || echo "⚠️ Pester installation failed"

# PowerShellGet (Module management)
pwsh -NoProfile -Command 'Install-Module -Name PowerShellGet -Force -Scope CurrentUser -AllowClobber' || echo "⚠️ PowerShellGet installation failed"

echo "✓ PowerShell setup complete"
