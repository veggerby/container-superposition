#!/bin/bash
# pandoc overlay setup — Markdown -> PDF pipeline

set -e

echo "📦 Refreshing font cache..."
sudo fc-cache -fv

echo "📦 Installing Pandoc (latest release)..."
PANDOC_VERSION="3.6.4"

if command -v apt-get > /dev/null 2>&1; then
    # Debian/Ubuntu — install official .deb from GitHub releases
    ARCH=$(dpkg --print-architecture)
    PANDOC_DEB="pandoc-${PANDOC_VERSION}-1-${ARCH}.deb"
    curl -fsSL "https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/${PANDOC_DEB}" \
        -o "/tmp/${PANDOC_DEB}"
    sudo dpkg -i "/tmp/${PANDOC_DEB}"
    rm "/tmp/${PANDOC_DEB}"
elif command -v apk > /dev/null 2>&1; then
    # Alpine Linux — install via apk (version may differ from pinned release)
    echo "⚠  Alpine detected: installing pandoc via apk (version may differ from ${PANDOC_VERSION})"
    apk add --no-cache pandoc
else
    echo "❌ Unsupported distro: neither apt-get nor apk found. Cannot install Pandoc."
    exit 1
fi

echo "✓ pandoc $(pandoc --version | head -1)"

echo "📦 Installing diagram.lua Lua filter..."
mkdir -p "$HOME/.pandoc/filters"
curl -fsSL \
    "https://raw.githubusercontent.com/pandoc-ext/diagram/main/_extensions/diagram/diagram.lua" \
    -o "$HOME/.pandoc/filters/diagram.lua"

echo "📦 Installing Mermaid CLI (requires Node.js)..."
if command -v npm &>/dev/null; then
    npm install -g @mermaid-js/mermaid-cli
    # Create a chromium wrapper that always passes --no-sandbox (required in containers).
    # This is more robust than configuring mmdc/puppeteer individually — any tool
    # that launches chromium via PUPPETEER_EXECUTABLE_PATH gets the sandbox flags.
    sudo tee /usr/local/bin/chromium-no-sandbox > /dev/null <<'WRAPPER'
#!/bin/sh
exec /usr/bin/chromium --no-sandbox --disable-setuid-sandbox "$@"
WRAPPER
    sudo chmod +x /usr/local/bin/chromium-no-sandbox
    echo "✓ chromium-no-sandbox wrapper installed"
    if command -v mmdc >/dev/null 2>&1; then
        echo "✓ Mermaid CLI installed: $(command -v mmdc)"
    else
        echo "⚠  Mermaid CLI install completed but mmdc is not on PATH yet"
    fi
else
    echo "⚠  Node.js not found — Mermaid CLI skipped. Add the nodejs overlay for diagram support."
fi

echo "📦 Writing default pandoc.yaml..."
mkdir -p "$HOME/.pandoc"
cat > "$HOME/.pandoc/pandoc.yaml" <<'EOF'
pdf-engine: xelatex

variables:
  mainfont: "Carlito"
  monofont: "JetBrains Mono"
  fallbackfont: "Noto Sans Symbols 2"
  fontsize: 11pt
  linestretch: 1.15
  geometry:
    - top=16mm
    - bottom=16mm
    - left=14mm
    - right=14mm
  header-includes:
    - |
      \usepackage{etoolbox}
      \setlength{\tabcolsep}{3pt}
      \renewcommand{\arraystretch}{1.05}
      \AtBeginEnvironment{longtable}{\small}
      \AtBeginEnvironment{tabular}{\small}

# Uncomment to enable TOC and section numbering:
# toc: true
# toc-depth: 3
# number-sections: true

# Uncomment to enable Mermaid/diagram rendering (requires nodejs overlay):
# lua-filter:
#   - ~/.pandoc/filters/diagram.lua
EOF

echo ""
echo "✓ pandoc overlay setup complete"
echo "ℹ️  Build a PDF:  pandoc -d ~/.pandoc/pandoc.yaml doc.md -o doc.pdf"
echo "ℹ️  With Mermaid: pandoc -d ~/.pandoc/pandoc.yaml --lua-filter ~/.pandoc/filters/diagram.lua doc.md -o doc.pdf"
