#!/bin/bash
# pandoc overlay setup — Markdown -> PDF pipeline

set -e

echo "📦 Refreshing font cache..."
sudo fc-cache -fv

echo "📦 Installing Pandoc (latest release)..."
PANDOC_VERSION="3.6.4"
ARCH=$(dpkg --print-architecture)
PANDOC_DEB="pandoc-${PANDOC_VERSION}-1-${ARCH}.deb"
curl -fsSL "https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/${PANDOC_DEB}" \
    -o "/tmp/${PANDOC_DEB}"
sudo dpkg -i "/tmp/${PANDOC_DEB}"
rm "/tmp/${PANDOC_DEB}"

echo "✓ pandoc $(pandoc --version | head -1)"

echo "📦 Installing diagram.lua Lua filter..."
mkdir -p "$HOME/.pandoc/filters"
curl -fsSL \
    "https://raw.githubusercontent.com/pandoc-ext/diagram/main/_extensions/diagram/diagram.lua" \
    -o "$HOME/.pandoc/filters/diagram.lua"

echo "📦 Installing Mermaid CLI (requires Node.js)..."
if command -v npm &>/dev/null; then
    npm install -g @mermaid-js/mermaid-cli
    # Point mmdc at the system Chromium (avoids Puppeteer downloading its own)
    mkdir -p "$HOME/.config/mermaid"
    cat > "$HOME/.config/mermaid/puppeteer-config.json" <<'EOF'
{
  "executablePath": "/usr/bin/chromium",
  "args": ["--no-sandbox", "--disable-setuid-sandbox"]
}
EOF
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
