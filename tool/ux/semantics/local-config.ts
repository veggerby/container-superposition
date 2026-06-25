import type { LocalConfigTrust } from './types.js';

export function resolveLocalConfigTrust(input: {
    path?: string | null;
    appliedFields?: string[];
    unsupportedFields?: string[];
    gitIgnoreSafe?: boolean;
    trackedCleanupManual?: boolean;
    ignored?: boolean;
}): LocalConfigTrust {
    const appliedFields = input.appliedFields ?? [];
    const unsupportedFields = input.unsupportedFields ?? [];
    const gitIgnoreSafe = input.gitIgnoreSafe ?? false;
    const trackedCleanupManual = input.trackedCleanupManual ?? false;
    const ignored = input.ignored ?? false;
    const blocked = unsupportedFields.length > 0;

    let disposition: LocalConfigTrust['disposition'];
    if (ignored || !input.path) {
        disposition = 'Ignored by this run';
    } else if (blocked) {
        disposition = 'Blocked';
    } else if (trackedCleanupManual || !gitIgnoreSafe) {
        disposition = 'Applied with manual follow-up';
    } else {
        disposition = 'Applied safely';
    }

    return {
        path: input.path ?? null,
        appliedFields,
        unsupportedFields,
        gitIgnoreSafe,
        trackedCleanupManual,
        blocked,
        disposition,
    };
}
