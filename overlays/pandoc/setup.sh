#!/bin/bash
# pandoc overlay setup — Markdown -> PDF pipeline

set -e

echo "📦 Refreshing font cache..."
sudo fc-cache -f

echo "📦 Installing Pandoc (latest release)..."
PANDOC_VERSION="3.6.4"

# Source shared setup utilities
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"
load_nvm

if command -v apt-get > /dev/null 2>&1; then
    # Debian/Ubuntu — install official .deb from GitHub releases
    ARCH=$(dpkg --print-architecture)
    PANDOC_DEB="pandoc-${PANDOC_VERSION}-1-${ARCH}.deb"
    curl -fsSL "https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/${PANDOC_DEB}" \
        -o "/tmp/${PANDOC_DEB}"
    with_apt_lock sudo dpkg -i "/tmp/${PANDOC_DEB}"
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
-- Replace emoji and flag glyphs that XeLaTeX commonly cannot render.
--
-- * BMP symbols (Miscellaneous Symbols U+2600-U+26FF, Dingbats U+2700-U+27BF)
--   are routed to the fallback font via \textfallback{} so they render as
--   real glyphs using Noto Sans Symbols 2 (declared by pandoc's fallbackfont
--   variable in pandoc.yaml).
--
-- * High-plane emoji (U+1F000-U+1FAFF: 🎉 🚀 etc.) are replaced with the
--   plain-text marker [emoji] because no common PDF font covers them fully.
--
-- * Flag sequences (pairs of regional-indicator letters: 🇺🇸 etc.) are
--   replaced with the two-letter country code in brackets, e.g. [US].
--
-- The filter is a no-op for all non-LaTeX output formats.

local REGIONAL_INDICATOR_A = 0x1F1E6
local REGIONAL_INDICATOR_Z = 0x1F1FF

local function is_regional_indicator(cp)
    return cp >= REGIONAL_INDICATOR_A and cp <= REGIONAL_INDICATOR_Z
end

-- High-plane emoji that no standard PDF font renders reliably.
local function is_high_plane_emoji(cp)
    return cp >= 0x1F000 and cp <= 0x1FAFF
end

-- BMP symbol blocks absent from Carlito (and most body fonts).
-- Characters in these ranges are routed to the \textfallback font instead.
local function is_bmp_symbol(cp)
    return (cp >= 0x2600 and cp <= 0x26FF)  -- Miscellaneous Symbols (⚠ ☀ ⛔ …)
        or (cp >= 0x2700 and cp <= 0x27BF)  -- Dingbats             (✅ ❌ ✓ …)
end

-- Parse text into a list of pandoc inline elements, applying substitutions.
-- Returns nil when no substitutions are needed.
local function text_to_inlines(text)
    if FORMAT ~= 'latex' then return nil end

    -- Quick scan: skip AST work when there is nothing to process.
    local needs_processing = false
    for _, cp in utf8.codes(text) do
        if is_regional_indicator(cp) or is_high_plane_emoji(cp) or is_bmp_symbol(cp)
                or cp == 0x200D or cp == 0x20E3 or cp == 0xFE0F then
            needs_processing = true
            break
        end
    end
    if not needs_processing then return nil end

    local codepoints = {}
    for _, cp in utf8.codes(text) do table.insert(codepoints, cp) end

    local inlines = {}
    local buf = {}

    local function flush_buf()
        if #buf > 0 then
            table.insert(inlines, pandoc.Str(table.concat(buf)))
            buf = {}
        end
    end

    local i = 1
    while i <= #codepoints do
        local cp = codepoints[i]

        -- Variation selectors / zero-width joiners / combining enclosing keycap
        if cp == 0x200D or cp == 0x20E3 or cp == 0xFE0F then
            i = i + 1

        -- Flag sequences: two consecutive regional-indicator letters → [XX]
        elseif is_regional_indicator(cp)
                and i < #codepoints
                and is_regional_indicator(codepoints[i + 1]) then
            flush_buf()
            local a = string.char((cp - REGIONAL_INDICATOR_A) + string.byte('A'))
            local b = string.char((codepoints[i + 1] - REGIONAL_INDICATOR_A) + string.byte('A'))
            table.insert(inlines, pandoc.Str('[' .. a .. b .. ']'))
            i = i + 2

        -- High-plane emoji → [emoji] text marker
        elseif is_high_plane_emoji(cp) then
            flush_buf()
            table.insert(inlines, pandoc.Str('[emoji]'))
            i = i + 1
            -- Collapse consecutive emoji into one marker
            while i <= #codepoints
                    and (is_high_plane_emoji(codepoints[i])
                         or codepoints[i] == 0xFE0F
                         or codepoints[i] == 0x200D) do
                i = i + 1
            end

        -- BMP symbols → \textfallback{char} (renders with Noto Sans Symbols 2)
        elseif is_bmp_symbol(cp) then
            flush_buf()
            table.insert(inlines, pandoc.RawInline('latex',
                '\\textfallback{' .. utf8.char(cp) .. '}'))
            i = i + 1
            -- Skip trailing variation selector-16 (e.g. U+FE0F after ⚠)
            if i <= #codepoints and codepoints[i] == 0xFE0F then i = i + 1 end

        else
            table.insert(buf, utf8.char(cp))
            i = i + 1
        end
    end
    flush_buf()

    -- If result is a single identical Str, nothing actually changed.
    if #inlines == 1 and inlines[1].t == 'Str' and inlines[1].text == text then
        return nil
    end

    return inlines
end

function Str(el)
    local inlines = text_to_inlines(el.text)
    if inlines == nil then return nil end
    return inlines
end

-- In code spans / code blocks we cannot use \textfallback (verbatim context),
-- so we simply drop the offending characters to prevent XeLaTeX warnings.
local function strip_unsupported(el)
    if FORMAT ~= 'latex' then return nil end
    local changed = false
    local out = {}
    for _, cp in utf8.codes(el.text) do
        if is_high_plane_emoji(cp) or is_bmp_symbol(cp)
                or cp == 0x200D or cp == 0x20E3 or cp == 0xFE0F then
            changed = true
        else
            table.insert(out, utf8.char(cp))
        end
    end
    if not changed then return nil end
    el.text = table.concat(out)
    return el
end

function Code(el)     return strip_unsupported(el) end
function CodeBlock(el) return strip_unsupported(el) end
EOF

echo "📦 Installing Mermaid CLI (requires Node.js)..."
if command -v npm &>/dev/null; then
    run_spinner "Mermaid CLI" npm install -g @mermaid-js/mermaid-cli
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
  - __PANDOC_FILTERS_DIR__/diagram.lua

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
      \ifdefined\IfFontExistsTF
      \IfFontExistsTF{Noto Sans Symbols 2}{%
      \newfontfamily\textfallbackfont{Noto Sans Symbols 2}%
      \newcommand{\textfallback}[1]{{\textfallbackfont #1}}%
      }{%
      \newcommand{\textfallback}[1]{#1}%
      }
      \else
      \newcommand{\textfallback}[1]{#1}%
      \fi
      \setlength{\tabcolsep}{3pt}
      \renewcommand{\arraystretch}{1.05}
      \AtBeginEnvironment{longtable}{\small}
      \AtBeginEnvironment{tabular}{\small}

# Uncomment to enable TOC and section numbering:
# toc: true
# toc-depth: 3
# number-sections: true
EOF
sed -i "s|__PANDOC_FILTERS_DIR__|${PANDOC_FILTERS_DIR}|g" "$HOME/.pandoc/pandoc.yaml"

echo ""
echo "✓ pandoc overlay setup complete"
echo "ℹ️  Build a PDF:           pandoc doc.md -o doc.pdf"
echo "ℹ️  With Mermaid diagrams: pandoc doc.md -o doc.pdf  (diagram.lua enabled by default)"
