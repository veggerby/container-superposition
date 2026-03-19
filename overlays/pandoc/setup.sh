#!/bin/bash
# pandoc overlay setup — Markdown -> PDF pipeline

set -e

echo "📦 Refreshing font cache..."
sudo fc-cache -fv

echo "📦 Installing Pandoc (latest release)..."
PANDOC_VERSION="3.6.4"

# Source shared apt utilities
# shellcheck source=apt-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/apt-utils.sh"

if command -v apt-get > /dev/null 2>&1; then
    wait_for_apt_lock
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

if [ -x /usr/bin/pandoc ]; then
    PANDOC_REAL_BIN="/usr/bin/pandoc"
elif [ -x /usr/local/bin/pandoc ] && [ ! -L /usr/local/bin/pandoc ]; then
    PANDOC_REAL_BIN="/usr/local/bin/pandoc"
else
    PANDOC_REAL_BIN="$(type -P pandoc || true)"
fi

if [ -z "$PANDOC_REAL_BIN" ] || [ ! -x "$PANDOC_REAL_BIN" ]; then
    echo "❌ Could not resolve the real pandoc binary."
    exit 1
fi

if [ "$PANDOC_REAL_BIN" = "/usr/local/bin/pandoc" ] && [ -f /usr/local/bin/pandoc ]; then
    if grep -q 'DEFAULTS_FILE="\${HOME}/.pandoc/pandoc.yaml"' /usr/local/bin/pandoc 2>/dev/null; then
        echo "❌ Refusing to wrap /usr/local/bin/pandoc because it is already the pandoc wrapper."
        exit 1
    fi
fi

echo "✓ pandoc $("$PANDOC_REAL_BIN" --version | head -1)"

echo "📦 Installing pandoc wrapper with default PDF settings..."
sudo tee /usr/local/bin/pandoc > /dev/null <<EOF
#!/bin/sh
REAL_PANDOC="${PANDOC_REAL_BIN}"
DEFAULTS_FILE="\${HOME}/.pandoc/pandoc.yaml"

for arg in "\$@"; do
    case "\$arg" in
        -d|--defaults|--defaults=*)
            exec "\${REAL_PANDOC}" "\$@"
            ;;
    esac
done

if [ -f "\${DEFAULTS_FILE}" ]; then
    exec "\${REAL_PANDOC}" --defaults "\${DEFAULTS_FILE}" "\$@"
fi

exec "\${REAL_PANDOC}" "\$@"
EOF
sudo chmod +x /usr/local/bin/pandoc
echo "✓ pandoc wrapper installed: /usr/local/bin/pandoc -> ${PANDOC_REAL_BIN}"

echo "📦 Installing diagram.lua Lua filter..."
mkdir -p "$HOME/.pandoc/filters"
curl -fsSL \
    "https://raw.githubusercontent.com/pandoc-ext/diagram/main/_extensions/diagram/diagram.lua" \
    -o "$HOME/.pandoc/filters/diagram.lua"

echo "📦 Writing emoji fallback Lua filter..."
cat > "$HOME/.pandoc/filters/emoji-fallback.lua" <<'EOF'
-- Replace emoji and flag glyphs that XeLaTeX commonly cannot render with
-- readable plain-text placeholders before Pandoc emits LaTeX.

local REGIONAL_INDICATOR_A = 0x1F1E6
local REGIONAL_INDICATOR_Z = 0x1F1FF

local function is_regional_indicator(codepoint)
    return codepoint >= REGIONAL_INDICATOR_A and codepoint <= REGIONAL_INDICATOR_Z
end

local function is_emoji_codepoint(codepoint)
    return codepoint >= 0x1F000 and codepoint <= 0x1FAFF
end

local function sanitize_text(text)
    local codepoints = {}
    for _, codepoint in utf8.codes(text) do
        table.insert(codepoints, codepoint)
    end

    local out = {}
    local i = 1
    local last_was_emoji = false

    while i <= #codepoints do
        local codepoint = codepoints[i]

        if is_regional_indicator(codepoint)
            and i < #codepoints
            and is_regional_indicator(codepoints[i + 1]) then
            local first = string.char((codepoint - REGIONAL_INDICATOR_A) + string.byte('A'))
            local second =
                string.char((codepoints[i + 1] - REGIONAL_INDICATOR_A) + string.byte('A'))
            table.insert(out, '[' .. first .. second .. ']')
            last_was_emoji = false
            i = i + 2
        elseif codepoint == 0x200D or codepoint == 0x20E3 or codepoint == 0xFE0F then
            i = i + 1
        elseif is_emoji_codepoint(codepoint) then
            if not last_was_emoji then
                table.insert(out, '[emoji]')
                last_was_emoji = true
            end
            i = i + 1
        else
            table.insert(out, utf8.char(codepoint))
            last_was_emoji = false
            i = i + 1
        end
    end

    return table.concat(out)
end

local function sanitize_element_text(el)
    if FORMAT ~= 'latex' then
        return nil
    end

    local sanitized = sanitize_text(el.text)
    if sanitized == el.text then
        return nil
    end

    el.text = sanitized
    return el
end

function Str(el)
    return sanitize_element_text(el)
end

function Code(el)
    return sanitize_element_text(el)
end

function CodeBlock(el)
    return sanitize_element_text(el)
end
EOF

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
PANDOC_FILTERS_DIR="$HOME/.pandoc/filters"
cat > "$HOME/.pandoc/pandoc.yaml" <<'EOF'
pdf-engine: xelatex
filters:
  - __PANDOC_FILTERS_DIR__/emoji-fallback.lua

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
# filters:
#   - __PANDOC_FILTERS_DIR__/emoji-fallback.lua
#   - __PANDOC_FILTERS_DIR__/diagram.lua
EOF
sed -i "s|__PANDOC_FILTERS_DIR__|${PANDOC_FILTERS_DIR}|g" "$HOME/.pandoc/pandoc.yaml"

echo ""
echo "✓ pandoc overlay setup complete"
echo "ℹ️  Build a PDF:  pandoc doc.md -o doc.pdf"
echo "ℹ️  With Mermaid: pandoc --lua-filter ~/.pandoc/filters/diagram.lua doc.md -o doc.pdf"
