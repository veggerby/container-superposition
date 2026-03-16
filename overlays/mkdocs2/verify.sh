#!/bin/bash
# mkdocs2 overlay verification script

echo "🔍 Verifying MkDocs 2.x overlay setup..."

ALL_CHECKS_PASSED=true

# mkdocs may be installed inside .venv (Python overlay) or on the system PATH
MKDOCS_BIN="mkdocs"
if [ -f "${PWD}/.venv/bin/mkdocs" ]; then
    MKDOCS_BIN="${PWD}/.venv/bin/mkdocs"
fi

# Check mkdocs is available
if ! command -v "${MKDOCS_BIN}" &>/dev/null && [ ! -x "${MKDOCS_BIN}" ]; then
    echo "✗ mkdocs not found"
    ALL_CHECKS_PASSED=false
else
    VERSION=$("${MKDOCS_BIN}" --version 2>/dev/null)
    echo "✓ mkdocs is installed: ${VERSION}"

    # Verify it is MkDocs 2.x
    if echo "${VERSION}" | grep -qE "mkdocs, version [2-9]"; then
        echo "✓ MkDocs 2.x confirmed"
    else
        echo "✗ Expected MkDocs 2.x, got: ${VERSION}"
        ALL_CHECKS_PASSED=false
    fi
fi

if [ "${ALL_CHECKS_PASSED}" = true ]; then
    echo ""
    echo "✅ MkDocs 2.x overlay verification complete!"
    echo ""
    echo "💡 Tips:"
    echo "  - Start dev server:    mkdocs serve"
    echo "  - Build static site:   mkdocs build"
    echo "  - New project:         mkdocs new ."
else
    echo ""
    echo "✗ MkDocs 2.x overlay verification failed"
    exit 1
fi
