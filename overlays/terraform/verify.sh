#!/bin/bash
# Verification script for Terraform overlay
# Confirms Terraform and tflint are installed

set -e

# Cleanup on exit
cleanup() {
  if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
    rm -rf "$TEMP_DIR"
  fi
}
trap cleanup EXIT

echo "🔍 Verifying Terraform overlay..."
echo ""

# Check terraform is installed
echo "1️⃣ Checking Terraform CLI..."
if command -v terraform &> /dev/null; then
    terraform version | head -1
    echo "   ✅ Terraform CLI found"
else
    echo "   ❌ Terraform CLI not found"
    exit 1
fi

# Check tflint is installed
echo ""
echo "2️⃣ Checking tflint..."
if command -v tflint &> /dev/null; then
    tflint --version
    echo "   ✅ tflint found"
else
    echo "   ❌ tflint not found"
    exit 1
fi

# Test basic terraform functionality
echo ""
echo "3️⃣ Testing Terraform functionality..."
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

cat > main.tf << 'EOF'
terraform {
  required_version = ">= 1.0"
}

output "test" {
  value = "Terraform working"
}
EOF

if terraform init > /dev/null 2>&1 && terraform validate > /dev/null 2>&1; then
    echo "   ✅ Terraform init and validate successful"
else
    echo "   ❌ Terraform init/validate failed"
    exit 1
fi

echo ""
echo "✅ Terraform overlay verification complete"
