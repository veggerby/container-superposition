#!/bin/bash
# PowerShell setup script - Install common PowerShell modules

set -e

echo "🔧 Setting up PowerShell development environment..."

# Verify PowerShell is installed and responds within 10 s.
# If pwsh doesn't respond quickly (e.g. shared library issue, slow startup),
# there is no point proceeding — all subsequent pwsh calls would also hang.
if ! command -v pwsh &>/dev/null; then
    echo "⚠️ PowerShell not found"
    exit 1
fi

# --kill-after ensures pwsh child processes are SIGKILL-ed after grace period.
PWSH_VERSION=$(timeout --kill-after=5s 10s \
    pwsh -NoProfile -NonInteractive -Command '$PSVersionTable.PSVersion.ToString()' \
    2>/dev/null) || true

if [ -z "$PWSH_VERSION" ]; then
    echo "⚠️ pwsh did not respond within 10 s — skipping module installation"
    echo "✓ PowerShell setup complete (modules skipped)"
    exit 0
fi

echo "✓ PowerShell found: v$PWSH_VERSION"

# Trust PSGallery non-interactively.
# PowerShell 7+ bundles the NuGet provider — Install-PackageProvider is not
# needed and will fail with "No match found" on PS7.  Call it only on PS5.
echo "🔧 Configuring PSGallery..."
timeout --kill-after=5s 60s \
    pwsh -NoProfile -NonInteractive -Command '
        $major = $PSVersionTable.PSVersion.Major
        if ($major -lt 7) {
            Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force -Scope CurrentUser | Out-Null
        }
        Set-PSRepository -Name PSGallery -InstallationPolicy Trusted
    ' || echo "⚠️ Failed to configure PSGallery (network may be unavailable) — skipping modules"

# Install common PowerShell modules.
# Each module runs in its own pwsh call with a per-module timeout so a slow
# PSGallery download doesn't block the remaining modules.
echo "📦 Installing PowerShell modules..."

_install_psmodule() {
    local name="$1"; shift   # remaining args passed as extra Install-Module params
    local extra="$*"
    timeout --kill-after=5s 90s \
        pwsh -NoProfile -NonInteractive -Command "
            try {
                Install-Module -Name '$name' -Force -Scope CurrentUser -AllowClobber -Repository PSGallery $extra -ErrorAction Stop
                Write-Host '  ✓  $name'
            } catch {
                Write-Host '  ⚠️  $name failed: ' + \$_
            }
        " 2>/dev/null || echo "  ⚠️  $name timed out"
}

_install_psmodule PSScriptAnalyzer
_install_psmodule Pester           -SkipPublisherCheck
_install_psmodule PowerShellGet

echo "✓ PowerShell setup complete"
