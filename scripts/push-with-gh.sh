#!/usr/bin/env bash
set -euo pipefail

if ! gh auth status --hostname github.com >/dev/null 2>&1; then
    echo 'GitHub CLI is not authenticated in this container. Run: gh auth login --hostname github.com' >&2
    exit 1
fi

branch=$(git symbolic-ref --quiet --short HEAD) || {
    echo 'Cannot push: check out a branch first.' >&2
    exit 1
}

# Reset inherited credential helpers for this invocation only; gh supplies the token.
git -c credential.helper= \
    -c credential.helper='!gh auth git-credential' \
    push -u origin "$branch"
