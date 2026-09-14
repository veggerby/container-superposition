#!/bin/bash
# Verify HermIT ontology reasoner installation

set -euo pipefail

if [ -z "${HERMIT_VERSION+x}" ]; then
    HERMIT_VERSION="{{cs.HERMIT_VERSION}}"
fi
HERMIT_INSTALL_ROOT="${HERMIT_INSTALL_ROOT:-/usr/local/share/hermit}"
HERMIT_INSTALL_DIR="${HERMIT_INSTALL_ROOT}/${HERMIT_VERSION}"
HERMIT_LIB_DIR="${HERMIT_INSTALL_DIR}/lib"

launcher_targets_hermit_lib_dir() {
    [ -f "$1" ] \
        && grep -F -- "${HERMIT_LIB_DIR}/*" "$1" >/dev/null 2>&1 \
        && grep -F -- 'org.semanticweb.HermiT.cli.CommandLine' "$1" >/dev/null 2>&1
}

if ! command -v java >/dev/null 2>&1; then
    echo "❌ java is not available on PATH" >&2
    exit 1
fi

if ! command -v mvn >/dev/null 2>&1; then
    echo "❌ mvn is not available on PATH" >&2
    exit 1
fi

HERMIT_LAUNCHER_PATH="$(command -v hermit || true)"
if [ -z "${HERMIT_LAUNCHER_PATH}" ]; then
    echo "❌ hermit launcher is not available on PATH" >&2
    exit 1
fi

if ! launcher_targets_hermit_lib_dir "${HERMIT_LAUNCHER_PATH}"; then
    echo "❌ hermit launcher does not target selected HermIT library directory: ${HERMIT_LIB_DIR}" >&2
    echo "   Re-run the HermIT setup script to reinstall the launcher for HERMIT_VERSION=${HERMIT_VERSION}." >&2
    exit 1
fi

if [ ! -d "${HERMIT_LIB_DIR}" ]; then
    echo "❌ HermIT library directory is missing: ${HERMIT_LIB_DIR}" >&2
    exit 1
fi

if ! ls "${HERMIT_LIB_DIR}"/org.semanticweb.hermit-"${HERMIT_VERSION}"*.jar >/dev/null 2>&1; then
    echo "❌ HermIT ${HERMIT_VERSION} JAR is missing from ${HERMIT_LIB_DIR}" >&2
    exit 1
fi

echo "🔍 HermIT version:"
hermit --version

echo "✅ HermIT ontology reasoner is available"
