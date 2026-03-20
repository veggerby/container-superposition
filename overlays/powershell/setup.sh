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

# Trust PSGallery non-interactively.
# PowerShell 7+ bundles the NuGet provider — Install-PackageProvider is not
# needed and will fail with "No match found" on PS7.  Call it only on PS5.
echo "🔧 Configuring PSGallery..."
timeout 120 pwsh -NoProfile -Command '
    $major = $PSVersionTable.PSVersion.Major
    if ($major -lt 7) {
        Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force -Scope CurrentUser | Out-Null
    }
    Set-PSRepository -Name PSGallery -InstallationPolicy Trusted
' || echo "⚠️ Failed to configure PSGallery (network may be unavailable)"

# Install common PowerShell modules
echo "📦 Installing PowerShell modules..."

# PSScriptAnalyzer (Linting and best practices)
pwsh -NoProfile -Command 'Install-Module -Name PSScriptAnalyzer -Force -Scope CurrentUser -AllowClobber -Repository PSGallery' || echo "⚠️ PSScriptAnalyzer installation failed"

# Pester (Testing framework)
pwsh -NoProfile -Command 'Install-Module -Name Pester -Force -Scope CurrentUser -AllowClobber -SkipPublisherCheck -Repository PSGallery' || echo "⚠️ Pester installation failed"

# PowerShellGet (Module management)
pwsh -NoProfile -Command 'Install-Module -Name PowerShellGet -Force -Scope CurrentUser -AllowClobber -Repository PSGallery' || echo "⚠️ PowerShellGet installation failed"

echo "✓ PowerShell setup complete"
