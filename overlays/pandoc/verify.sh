#!/bin/bash
set -e
command -v pandoc  || { echo "✗ pandoc not found"; exit 1; }
command -v xelatex || { echo "✗ xelatex not found"; exit 1; }
[ -f "$HOME/.pandoc/filters/diagram.lua" ] || { echo "✗ diagram.lua not found"; exit 1; }
[ -f "$HOME/.pandoc/filters/emoji-fallback.lua" ] || { echo "✗ emoji-fallback.lua not found"; exit 1; }
[ -f "$HOME/.pandoc/pandoc.yaml" ] || { echo "✗ pandoc.yaml not found"; exit 1; }

# Smoke test: render a PDF that includes generic emoji and flag sequences
# which XeLaTeX can reject without the fallback filter.
printf '%s\n' \
    '# Unicode Smoke Test' \
    '' \
    'Status icons: ✅ ⚠️ ❌' \
    'Activity emoji: 🎉 🚀 🧪' \
    'Flag emoji: 🇺🇸 🇯🇵 🇧🇷' \
    'Mixed sample: Unicode check 😀' |
    pandoc -o /tmp/pandoc-verify-test.pdf &&
    echo "✓ pandoc Unicode PDF smoke test passed" || {
    echo "✗ pandoc Unicode PDF render failed"
    exit 1
}

rm -f /tmp/pandoc-verify-test.pdf
echo "✓ pandoc overlay: OK"
