import type { SourceDescriptor } from './types.js';

export function describeSource(input: {
    projectFilePath?: string;
    manifestPath?: string;
    hasCliSelection?: boolean;
    existingDevcontainerPath?: string;
}): SourceDescriptor {
    if (input.projectFilePath) {
        return {
            kind: 'project-file',
            label: 'shared project file',
            detail: input.projectFilePath,
            compatibilityOnly: false,
        };
    }

    if (input.manifestPath) {
        return {
            kind: 'manifest',
            label: 'compatibility manifest',
            detail: input.manifestPath,
            compatibilityOnly: true,
        };
    }

    if (input.hasCliSelection) {
        return {
            kind: 'cli',
            label: 'CLI selection',
            detail: 'flags resolved for this run',
            compatibilityOnly: false,
        };
    }

    if (input.existingDevcontainerPath) {
        return {
            kind: 'existing-devcontainer',
            label: 'existing generated output',
            detail: input.existingDevcontainerPath,
            compatibilityOnly: false,
        };
    }

    return {
        kind: 'none',
        label: 'no persisted source',
        detail: 'interactive answers required',
        compatibilityOnly: false,
    };
}
