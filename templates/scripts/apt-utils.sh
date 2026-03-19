#!/bin/bash
# Shared APT utilities for container-superposition setup scripts
# Sourced automatically by setup scripts that need apt/dpkg operations.

# Wait for apt and dpkg locks to become available.
# Needed when multiple setup scripts run in parallel via postCreateCommand.
wait_for_apt_lock() {
    local retries=15
    while [ $retries -gt 0 ]; do
        if ! sudo flock -n /var/lib/dpkg/lock-frontend true 2>/dev/null || \
           ! sudo flock -n /var/lib/apt/lists/lock true 2>/dev/null; then
            echo "⏳ Waiting for apt/dpkg lock..."
            sleep 4
            retries=$((retries - 1))
        else
            return 0
        fi
    done
    echo "⚠️  apt lock wait timed out, proceeding anyway..."
}
