#!/bin/bash
set -euo pipefail

FUSEKI_HOST="${FUSEKI_HOST:-fuseki}"
FUSEKI_PORT="${FUSEKI_PORT:-3030}"
FUSEKI_URL="${FUSEKI_URL:-http://${FUSEKI_HOST}:${FUSEKI_PORT}}"
FUSEKI_DATASET="${FUSEKI_DATASET:-ds}"
FUSEKI_ADMIN_PASSWORD="${FUSEKI_ADMIN_PASSWORD:-admin}"
FUSEKI_SEED_FILE="${FUSEKI_SEED_FILE:-}"
FUSEKI_SEED_DIR="${FUSEKI_SEED_DIR:-}"
FUSEKI_SEED_MODE="${FUSEKI_SEED_MODE:-append}"
FUSEKI_SEED_GRAPH="${FUSEKI_SEED_GRAPH:-}"
FUSEKI_SEED_CONTENT_TYPE="${FUSEKI_SEED_CONTENT_TYPE:-auto}"

resolve_path() {
    case "$1" in
        /*) printf '%s\n' "$1" ;;
        *) printf '%s/%s\n' "$(pwd)" "$1" ;;
    esac
}

urlencode() {
    local string="$1"
    local length=${#string}
    local encoded=""
    local pos c o

    for ((pos = 0; pos < length; pos++)); do
        c=${string:$pos:1}
        case "$c" in
            [-_.~a-zA-Z0-9])
                encoded+="$c"
                ;;
            *)
                printf -v o '%%%02X' "'${c}"
                encoded+="$o"
                ;;
        esac
    done

    printf '%s\n' "$encoded"
}

content_type_for() {
    local file="$1"
    local extension="${file##*.}"
    extension="${extension,,}"

    if [ "$FUSEKI_SEED_CONTENT_TYPE" != "auto" ]; then
        printf '%s\n' "$FUSEKI_SEED_CONTENT_TYPE"
        return 0
    fi

    case "$extension" in
        ttl) printf '%s\n' 'text/turtle' ;;
        nt) printf '%s\n' 'application/n-triples' ;;
        nq) printf '%s\n' 'application/n-quads' ;;
        trig) printf '%s\n' 'application/trig' ;;
        rdf|xml|owl) printf '%s\n' 'application/rdf+xml' ;;
        jsonld) printf '%s\n' 'application/ld+json' ;;
        *)
            echo "Unsupported RDF seed file: $file" >&2
            echo "Set FUSEKI_SEED_CONTENT_TYPE to override auto-detection" >&2
            return 1
            ;;
    esac
}

wait_for_fuseki() {
    echo "Waiting for Fuseki readiness at ${FUSEKI_URL}/\$/ping..."
    for _ in $(seq 1 30); do
        if curl -fsS "${FUSEKI_URL}/\$/ping" >/dev/null 2>&1; then
            return 0
        fi
        sleep 2
    done

    echo "Fuseki did not become ready in time" >&2
    return 1
}

wait_for_dataset() {
    local http_status

    echo "Waiting for dataset '${FUSEKI_DATASET}'..."
    for _ in $(seq 1 30); do
        http_status=$(curl -s -o /dev/null -w '%{http_code}' \
            -u "admin:${FUSEKI_ADMIN_PASSWORD}" \
            "${FUSEKI_URL}/\$/datasets/${FUSEKI_DATASET}")
        if [ "$http_status" = "200" ]; then
            return 0
        fi
        sleep 2
    done

    echo "Dataset '${FUSEKI_DATASET}' did not become available in time" >&2
    return 1
}

clear_target_graph() {
    local update
    if [ -n "$FUSEKI_SEED_GRAPH" ]; then
        update="CLEAR SILENT GRAPH <${FUSEKI_SEED_GRAPH}>"
        echo "Clearing named graph ${FUSEKI_SEED_GRAPH} before reseed..."
    else
        update='CLEAR SILENT DEFAULT'
        echo 'Clearing default graph before reseed...'
    fi

    curl -fsS -X POST \
        -u "admin:${FUSEKI_ADMIN_PASSWORD}" \
        -H 'Content-Type: application/sparql-update' \
        --data "$update" \
        "${FUSEKI_URL}/${FUSEKI_DATASET}/update" >/dev/null
}

load_file() {
    local file="$1"
    local content_type target
    content_type=$(content_type_for "$file")
    target="${FUSEKI_URL}/${FUSEKI_DATASET}/data"

    if [ -n "$FUSEKI_SEED_GRAPH" ]; then
        target+="?graph=$(urlencode "$FUSEKI_SEED_GRAPH")"
    fi

    echo "Loading $(basename "$file") as ${content_type}..."
    curl -fsS -X POST \
        -u "admin:${FUSEKI_ADMIN_PASSWORD}" \
        -H "Content-Type: ${content_type}" \
        --data-binary "@${file}" \
        "$target" >/dev/null
}

collect_seed_files() {
    if [ -n "$FUSEKI_SEED_FILE" ] && [ -n "$FUSEKI_SEED_DIR" ]; then
        echo 'Set either FUSEKI_SEED_FILE or FUSEKI_SEED_DIR, not both' >&2
        return 1
    fi

    if [ -z "$FUSEKI_SEED_FILE" ] && [ -z "$FUSEKI_SEED_DIR" ]; then
        echo 'Fuseki seeding not configured; skipping' >&2
        return 0
    fi

    if [ -n "$FUSEKI_SEED_FILE" ]; then
        local file
        file=$(resolve_path "$FUSEKI_SEED_FILE")
        if [ ! -f "$file" ]; then
            echo "Fuseki seed file not found: $file" >&2
            return 1
        fi
        printf '%s\n' "$file"
        return 0
    fi

    local dir
    dir=$(resolve_path "$FUSEKI_SEED_DIR")
    if [ ! -d "$dir" ]; then
        echo "Fuseki seed directory not found: $dir" >&2
        return 1
    fi

    find "$dir" -maxdepth 1 -type f | sort
}

main() {
    mapfile -t seed_files < <(collect_seed_files)

    if [ ${#seed_files[@]} -eq 0 ]; then
        if [ -n "$FUSEKI_SEED_FILE" ] || [ -n "$FUSEKI_SEED_DIR" ]; then
            echo 'No RDF seed files found to load' >&2
            exit 1
        fi
        exit 0
    fi

    wait_for_fuseki
    wait_for_dataset

    case "$FUSEKI_SEED_MODE" in
        append) ;;
        replace) clear_target_graph ;;
        *)
            echo "Unsupported FUSEKI_SEED_MODE: $FUSEKI_SEED_MODE" >&2
            exit 1
            ;;
    esac

    for file in "${seed_files[@]}"; do
        load_file "$file"
    done

    echo "Loaded ${#seed_files[@]} RDF seed file(s) into dataset '${FUSEKI_DATASET}'"
}

main "$@"
