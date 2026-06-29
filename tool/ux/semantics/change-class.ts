import type { ChangeClass } from './types.js';

export function classifyChangeSet(input: {
    hasExistingOutput: boolean;
    created?: number;
    updated?: number;
    removed?: number;
    unchanged?: number;
}): ChangeClass {
    const created = input.created ?? 0;
    const updated = input.updated ?? 0;
    const removed = input.removed ?? 0;

    if (!input.hasExistingOutput && (created > 0 || updated > 0 || removed > 0)) {
        return 'First write';
    }

    if (created === 0 && updated === 0 && removed === 0) {
        return 'No material change';
    }

    if (removed > 0 && created === 0 && updated === 0) {
        return 'Cleanup stale generated files';
    }

    return 'Change intent and regenerate';
}
