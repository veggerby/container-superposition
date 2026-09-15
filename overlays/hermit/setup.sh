#!/bin/bash
# Setup script for HermIT ontology reasoner

set -euo pipefail

if [ -z "${HERMIT_VERSION+x}" ]; then
    HERMIT_VERSION="{{cs.HERMIT_VERSION}}"
fi
HERMIT_DEFAULT_INSTALL_ROOT="/usr/local/share/hermit"
HERMIT_HOME_INSTALL_ROOT="${HOME}/.local/share/hermit"
HERMIT_DEFAULT_LAUNCHER="/usr/local/bin/hermit"
HERMIT_HOME_LAUNCHER="${HOME}/.local/bin/hermit"
HERMIT_INSTALL_ROOT="${HERMIT_INSTALL_ROOT:-${HERMIT_DEFAULT_INSTALL_ROOT}}"
HERMIT_LAUNCHER="${HERMIT_LAUNCHER:-${HERMIT_DEFAULT_LAUNCHER}}"

validate_hermit_version() {
    case "$1" in
        *..* | */* | *\\*)
            return 1
            ;;
    esac

    [ ${#1} -le 128 ] && printf '%s' "$1" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9._-]*$'
}

validate_install_paths() {
    case "$1" in
        "${HERMIT_DEFAULT_INSTALL_ROOT}" | "${HERMIT_DEFAULT_INSTALL_ROOT}"/* | "${HERMIT_HOME_INSTALL_ROOT}" | "${HERMIT_HOME_INSTALL_ROOT}"/*)
            ;;
        '' | /)
            return 1
            ;;
        *)
            return 1
            ;;
    esac

    case "${2}/" in
        "${1%/}/"*)
            ;;
        *)
            return 1
            ;;
    esac
}

launcher_targets_hermit_lib_dir() {
    [ -f "$1" ] \
        && grep -F -- "${HERMIT_LIB_DIR}/*" "$1" >/dev/null 2>&1 \
        && grep -F -- 'org.semanticweb.HermiT.cli.CommandLine' "$1" >/dev/null 2>&1
}

validate_launcher_path() {
    case "$1" in
        "${HERMIT_DEFAULT_LAUNCHER}" | "${HERMIT_HOME_LAUNCHER}")
            ;;
        *)
            return 1
            ;;
    esac
}

if ! validate_hermit_version "${HERMIT_VERSION}"; then
    echo "❌ Invalid HERMIT_VERSION: ${HERMIT_VERSION}" >&2
    echo "   Use a Maven version containing only letters, numbers, dots, underscores, or hyphens; path separators and '..' are not allowed." >&2
    exit 1
fi

HERMIT_COORDINATE="net.sourceforge.owlapi:org.semanticweb.hermit:${HERMIT_VERSION}"
HERMIT_INSTALL_DIR="${HERMIT_INSTALL_ROOT}/${HERMIT_VERSION}"
HERMIT_LIB_DIR="${HERMIT_INSTALL_DIR}/lib"

if ! validate_install_paths "${HERMIT_INSTALL_ROOT}" "${HERMIT_INSTALL_DIR}"; then
    echo "❌ Unsafe HERMIT_INSTALL_ROOT or HERMIT_INSTALL_DIR: ${HERMIT_INSTALL_ROOT} -> ${HERMIT_INSTALL_DIR}" >&2
    exit 1
fi

if ! validate_launcher_path "${HERMIT_LAUNCHER}"; then
    echo "❌ Unsafe HERMIT_LAUNCHER path: ${HERMIT_LAUNCHER}" >&2
    exit 1
fi

export MAVEN_OPTS="${MAVEN_OPTS:-}"

cleanup() {
    if [ -n "${HERMIT_TMP_DIR:-}" ] && [ -d "${HERMIT_TMP_DIR}" ]; then
        rm -rf "${HERMIT_TMP_DIR}"
    fi
}
trap cleanup EXIT

echo "🦉 Setting up HermIT ontology reasoner ${HERMIT_VERSION}..."

if ! command -v java >/dev/null 2>&1; then
    echo "❌ java is not available on PATH. Select the required java overlay with hermit." >&2
    exit 1
fi

if ! command -v mvn >/dev/null 2>&1; then
    echo "❌ mvn is not available on PATH. The hermit overlay requires the java overlay's Maven installation." >&2
    exit 1
fi

if [ -d "${HERMIT_LIB_DIR}" ] && [ -f "${HERMIT_LAUNCHER}" ]; then
    if launcher_targets_hermit_lib_dir "${HERMIT_LAUNCHER}"; then
        if "${HERMIT_LAUNCHER}" --help >/dev/null 2>&1; then
            echo "✓ HermIT ${HERMIT_VERSION} is already installed at ${HERMIT_INSTALL_DIR}"
            exit 0
        fi
        echo "⚠️  Existing HermIT installation did not verify; reinstalling..."
    else
        echo "⚠️  Existing HermIT launcher does not target ${HERMIT_LIB_DIR}; reinstalling..."
    fi
fi

HERMIT_TMP_DIR="$(mktemp -d)"
cat > "${HERMIT_TMP_DIR}/pom.xml" <<POM
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>dev.container-superposition</groupId>
  <artifactId>hermit-installer</artifactId>
  <version>1.0.0</version>
  <dependencies>
    <dependency>
      <groupId>net.sourceforge.owlapi</groupId>
      <artifactId>org.semanticweb.hermit</artifactId>
      <version>${HERMIT_VERSION}</version>
    </dependency>
  </dependencies>
</project>
POM

mkdir -p "${HERMIT_TMP_DIR}/lib"
echo "📦 Resolving Maven artifact ${HERMIT_COORDINATE} and runtime dependencies..."
mvn -q -f "${HERMIT_TMP_DIR}/pom.xml" \
    org.apache.maven.plugins:maven-dependency-plugin:3.6.1:copy-dependencies \
    -DincludeScope=runtime \
    -DoutputDirectory="${HERMIT_TMP_DIR}/lib"

if ! ls "${HERMIT_TMP_DIR}/lib"/org.semanticweb.hermit-"${HERMIT_VERSION}"*.jar >/dev/null 2>&1; then
    echo "❌ Maven completed but HermIT ${HERMIT_VERSION} was not resolved into ${HERMIT_TMP_DIR}/lib." >&2
    exit 1
fi

sudo install -d -m 0755 "${HERMIT_INSTALL_ROOT}"
sudo rm -rf "${HERMIT_INSTALL_DIR}"
sudo install -d -m 0755 "${HERMIT_LIB_DIR}"
sudo install -d -m 0755 "$(dirname "${HERMIT_LAUNCHER}")"
sudo cp "${HERMIT_TMP_DIR}/lib"/*.jar "${HERMIT_LIB_DIR}/"
sudo chmod 0644 "${HERMIT_LIB_DIR}"/*.jar

cat > "${HERMIT_TMP_DIR}/hermit" <<LAUNCHER
#!/bin/sh
exec java -cp '${HERMIT_LIB_DIR}/*' org.semanticweb.HermiT.cli.CommandLine "\$@"
LAUNCHER
sudo install -m 0755 "${HERMIT_TMP_DIR}/hermit" "${HERMIT_LAUNCHER}"

if ! launcher_targets_hermit_lib_dir "${HERMIT_LAUNCHER}"; then
    echo "❌ HermIT launcher does not target ${HERMIT_LIB_DIR}" >&2
    exit 1
fi

echo "🔍 Verifying HermIT launcher..."
"${HERMIT_LAUNCHER}" --help >/dev/null

echo "✅ HermIT setup complete"
echo "  HermIT version: ${HERMIT_VERSION}"
echo "  Maven coordinate: ${HERMIT_COORDINATE}"
echo "  Install directory: ${HERMIT_INSTALL_DIR}"
echo "  Launcher: ${HERMIT_LAUNCHER}"
