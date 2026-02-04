#!/bin/bash

# Simple smoke test for the init tool
# Run this to verify the tool works after npm install

set -e

echo "🧪 Running container-superposition smoke tests..."
echo ""

# Test 1: Check dependencies
echo "1️⃣  Checking Node.js version..."
node --version
echo "   ✅ Node.js found"

# Test 2: Check TypeScript files exist
echo ""
echo "2️⃣  Checking TypeScript source files..."
if [ ! -f "scripts/init.ts" ]; then
  echo "   ❌ scripts/init.ts not found"
  exit 1
fi
if [ ! -f "tool/questionnaire/composer.ts" ]; then
  echo "   ❌ tool/questionnaire/composer.ts not found"
  exit 1
fi
echo "   ✅ Source files found"

# Test 3: Check overlays exist
echo ""
echo "3️⃣  Checking overlay configurations..."
for overlay in postgres redis playwright azure-cli kubectl-helm; do
  if [ ! -f "tool/overlays/$overlay/devcontainer.patch.json" ]; then
    echo "   ❌ Overlay $overlay not found"
    exit 1
  fi
done
echo "   ✅ All overlays present"

# Test 4: Check templates exist
echo ""
echo "4️⃣  Checking base templates..."
for template in plain compose; do
  if [ ! -f "templates/$template/.devcontainer/devcontainer.json" ]; then
    echo "   ❌ Template $template not found"
    exit 1
  fi
done
echo "   ✅ All templates present"

# Test 5: Try building (if node_modules exists)
if [ -d "node_modules" ]; then
  echo ""
  echo "5️⃣  Testing TypeScript compilation..."
  npm run build > /dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "   ✅ Build successful"
  else
    echo "   ❌ Build failed"
    exit 1
  fi
else
  echo ""
  echo "5️⃣  Skipping build test (run 'npm install' first)"
fi

echo ""
echo "✅ All smoke tests passed!"
echo ""
echo "Try running the tool:"
echo "  npm run init -- --help"
echo "  npm run init -- --stack compose --language dotnet --db postgres"
echo ""
