#!/bin/bash
set -e
command -v pandoc  || { echo "✗ pandoc not found"; exit 1; }
command -v xelatex || { echo "✗ xelatex not found"; exit 1; }
[ -f "$HOME/.pandoc/filters/diagram.lua" ] || { echo "✗ diagram.lua not found"; exit 1; }
[ -f "$HOME/.pandoc/pandoc.yaml" ]         || { echo "✗ pandoc.yaml not found"; exit 1; }

# Smoke test: render a trivial PDF
echo "# Test" | pandoc --pdf-engine=xelatex -o /tmp/pandoc-verify-test.pdf && \
    echo "✓ pandoc PDF smoke test passed" || { echo "✗ pandoc PDF render failed"; exit 1; }

rm -f /tmp/pandoc-verify-test.pdf
echo "✓ pandoc overlay: OK"
