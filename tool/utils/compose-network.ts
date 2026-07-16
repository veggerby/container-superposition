import * as path from 'path';
import type { Stack } from '../schema/types.js';

const COMPOSE_NETWORK_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const DEFAULT_COMPOSE_NETWORK_FALLBACK = 'project';

function sanitizeComposeNetworkNameSegment(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_.-]+/g, '-')
        .replace(/^[^a-z0-9]+/, '')
        .replace(/[^a-z0-9]+$/, '');
}

export function validateComposeNetworkName(
    value: string,
    fieldName = 'composeNetworkName'
): string {
    const normalized = value.trim();
    if (normalized.length === 0) {
        throw new Error(`${fieldName} must be a non-empty string`);
    }
    if (!COMPOSE_NETWORK_NAME_PATTERN.test(normalized)) {
        throw new Error(
            `${fieldName} must start with a letter or number and contain only letters, numbers, dots, underscores, or hyphens`
        );
    }
    return normalized;
}

export function assertComposeNetworkNameSupported(
    stack: Stack | undefined,
    composeNetworkName: string | undefined
): void {
    if (composeNetworkName && stack !== 'compose') {
        throw new Error(
            'composeNetworkName requires stack: compose because plain stacks do not generate docker-compose.yml'
        );
    }
}

export function deriveDefaultComposeNetworkName(projectRoot: string): string {
    const basename = path.basename(path.resolve(projectRoot));
    const sanitized = sanitizeComposeNetworkNameSegment(basename);
    return `${sanitized || DEFAULT_COMPOSE_NETWORK_FALLBACK}-devnet`;
}

export function resolveComposeNetworkName(
    projectRoot: string,
    composeNetworkName: string | undefined
): string {
    if (composeNetworkName) {
        return validateComposeNetworkName(composeNetworkName);
    }
    return deriveDefaultComposeNetworkName(projectRoot);
}
