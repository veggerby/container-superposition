#!/bin/bash
# Verification script for PowerShell overlay

set -e

echo "🔍 Verifying PowerShell overlay..."
echo ""

# Check PowerShell is installed
echo "1️⃣ Checking PowerShell..."
if command -v pwsh &> /dev/null; then
    pwsh -NoProfile -Command '$PSVersionTable.PSVersion'
    echo "   ✅ PowerShell found"
else
    echo "   ❌ PowerShell not found"
    exit 1
fi

# Check PSScriptAnalyzer module
echo ""
echo "2️⃣ Checking PSScriptAnalyzer..."
if pwsh -NoProfile -Command 'Get-Module -ListAvailable -Name PSScriptAnalyzer' | grep -q "PSScriptAnalyzer"; then
    echo "   ✅ PSScriptAnalyzer installed"
else
    echo "   ⚠️ PSScriptAnalyzer not found"
fi

# Check Pester module
echo ""
echo "3️⃣ Checking Pester..."
if pwsh -NoProfile -Command 'Get-Module -ListAvailable -Name Pester' | grep -q "Pester"; then
    echo "   ✅ Pester installed"
else
    echo "   ⚠️ Pester not found"
fi

echo ""
echo "✅ PowerShell overlay verification complete"
