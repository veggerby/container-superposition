#!/bin/bash
# Verification script for gcloud overlay
# Confirms Google Cloud SDK is installed

set -e

echo "🔍 Verifying gcloud overlay..."
echo ""

# Check gcloud is installed
echo "1️⃣ Checking gcloud CLI..."
if command -v gcloud &> /dev/null; then
    gcloud version | head -1
    echo "   ✅ gcloud CLI found"
else
    echo "   ❌ gcloud CLI not found"
    exit 1
fi

# Check gsutil is installed
echo ""
echo "2️⃣ Checking gsutil..."
if command -v gsutil &> /dev/null; then
    gsutil version -l | head -1
    echo "   ✅ gsutil found"
else
    echo "   ❌ gsutil not found"
    exit 1
fi

# Check bq is installed
echo ""
echo "3️⃣ Checking bq (BigQuery CLI)..."
if command -v bq &> /dev/null; then
    bq version | head -1
    echo "   ✅ bq found"
else
    echo "   ❌ bq not found"
    exit 1
fi

# Check GKE auth plugin
echo ""
echo "4️⃣ Checking GKE gcloud auth plugin..."
if command -v gke-gcloud-auth-plugin &> /dev/null; then
    echo "   ✅ GKE auth plugin found"
else
    echo "   ⚠️  GKE auth plugin not found (may not be required for all use cases)"
fi

echo ""
echo "✅ gcloud overlay verification complete"
