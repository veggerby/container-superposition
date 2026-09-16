#!/usr/bin/env bash
set -euo pipefail

before_sha=${1:-}
after_sha=${2:-}
sha_pattern='^[0-9a-fA-F]{40}$'
zero_sha='0000000000000000000000000000000000000000'

if [[ $# -ne 2 || ! $before_sha =~ $sha_pattern || ! $after_sha =~ $sha_pattern ]]; then
    echo 'Usage: classify-publish-worthy.sh <before-40-hex-sha> <after-40-hex-sha>' >&2
    exit 2
fi

if ! git cat-file -e "${after_sha}^{commit}" 2>/dev/null; then
    echo "Cannot resolve pushed commit $after_sha; refusing to classify changes." >&2
    exit 1
fi

is_publish_worthy_path() {
    local changed_path=$1

    case "$changed_path" in
        package.json | package-lock.json | .npmignore | tsconfig.json | README.md | LICENSE)
            return 0
            ;;
        scripts/* | templates/* | features/* | overlays/*)
            return 0
            ;;
        docs/*)
            [[ $changed_path == *.md ]]
            return
            ;;
        tool/*)
            [[ $changed_path != */__tests__/* && $changed_path != *.test.ts && $changed_path != *.test.js && $changed_path != *.spec.ts && $changed_path != *.spec.js ]]
            return
            ;;
        *)
            return 1
            ;;
    esac
}

if [[ $before_sha == "$zero_sha" ]]; then
    changed_paths_command=(git ls-tree -r -z --name-only "$after_sha")
elif git cat-file -e "${before_sha}^{commit}" 2>/dev/null; then
    changed_paths_command=(git diff --name-only -z --no-renames "$before_sha" "$after_sha")
else
    echo "Cannot resolve previous commit $before_sha; refusing to classify changes." >&2
    exit 1
fi

while IFS= read -r -d '' changed_path; do
    if is_publish_worthy_path "$changed_path"; then
        printf 'true\n'
        exit 0
    fi
done < <("${changed_paths_command[@]}")

printf 'false\n'
