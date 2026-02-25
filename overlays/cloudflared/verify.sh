#!/bin/bash
# Verification script for Cloudflared overlay
# Confirms cloudflared is installed

echo "🔍 Verifying Cloudflared overlay..."
echo ""

# Check cloudflared
echo "1️⃣ Checking cloudflared..."
if command -v cloudflared &> /dev/null; then
    echo "   ✅ cloudflared found: $(cloudflared --version)"
else
    echo "   ❌ cloudflared not found"
    exit 1
fi

echo ""
echo "✅ Cloudflared overlay verification complete"
echo "   Quick start: cloudflared tunnel --url http://localhost:3000"
