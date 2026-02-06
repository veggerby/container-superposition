#!/bin/bash
# Java setup script - Verify Java, Maven, and Gradle installation

set -e

echo "🔧 Setting up Java development environment..."

# Verify Java is installed
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1)
    echo "✓ Java found: $JAVA_VERSION"
else
    echo "⚠️ Java not found"
fi

# Verify Maven is installed
if command -v mvn &> /dev/null; then
    MVN_VERSION=$(mvn -version | head -n 1)
    echo "✓ Maven found: $MVN_VERSION"
else
    echo "⚠️ Maven not found"
fi

# Verify Gradle is installed
if command -v gradle &> /dev/null; then
    GRADLE_VERSION=$(gradle --version | grep "Gradle " | head -n 1)
    echo "✓ Gradle found: $GRADLE_VERSION"
else
    echo "⚠️ Gradle not found"
fi

# Install Maven/Gradle project dependencies if build files exist
if [ -f "pom.xml" ]; then
    echo "📦 Maven project detected, installing dependencies..."
    mvn dependency:resolve || echo "⚠️ Maven dependency installation failed or skipped"
elif [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then
    echo "📦 Gradle project detected, installing dependencies..."
    gradle dependencies || echo "⚠️ Gradle dependency installation failed or skipped"
fi

echo "✓ Java setup complete"
