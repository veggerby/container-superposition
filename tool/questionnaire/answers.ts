import type { CompositionInput, QuestionnaireAnswers } from '../schema/types.js';

/**
 * Build partial answers from CLI arguments.
 */
export function buildAnswersFromCliArgs(
    config: Partial<QuestionnaireAnswers>
): Partial<QuestionnaireAnswers> {
    const answers: Partial<QuestionnaireAnswers> = {};

    if (config.stack) {
        answers.stack = config.stack;
        answers.needsDocker = config.stack === 'compose';
    }
    if (config.baseImage) answers.baseImage = config.baseImage;
    if (config.containerName) answers.containerName = config.containerName;
    if (config.language) answers.language = config.language;
    if (config.database) answers.database = config.database;
    if (config.playwright !== undefined) answers.playwright = config.playwright;
    if (config.observability) answers.observability = config.observability;
    if (config.cloudTools) answers.cloudTools = config.cloudTools;
    if (config.devTools) answers.devTools = config.devTools;
    if (config.portOffset !== undefined) answers.portOffset = config.portOffset;
    if (config.outputPath) answers.outputPath = config.outputPath;
    if (config.preset) answers.preset = config.preset;
    if (config.presetChoices) answers.presetChoices = config.presetChoices;
    if (config.target) answers.target = config.target;
    if (config.minimal !== undefined) answers.minimal = config.minimal;
    if (config.editor) answers.editor = config.editor;
    if (config.overlayParameters) answers.overlayParameters = config.overlayParameters;

    return answers;
}

/**
 * Ensure a QuestionnaireAnswers object satisfies CompositionInput by filling in
 * empty arrays for the two optional array fields (language, database).
 */
export function resolveAnswers(answers: QuestionnaireAnswers): CompositionInput {
    return {
        ...answers,
        language: answers.language ?? [],
        database: answers.database ?? [],
    };
}

/**
 * Merge multiple partial answers with precedence: cli > interactive > manifest > defaults.
 * Returns CompositionInput: all array fields are guaranteed non-undefined.
 */
export function mergeAnswers(
    ...partials: Array<Partial<QuestionnaireAnswers> | undefined>
): CompositionInput {
    const merged: any = {
        language: [],
        database: [],
        cloudTools: [],
        devTools: [],
        observability: [],
        playwright: false,
        outputPath: './.devcontainer',
    };

    // Merge in order (later overrides earlier)
    for (const partial of partials) {
        if (!partial) continue;

        Object.keys(partial).forEach((key) => {
            const value = (partial as any)[key];
            if (value !== undefined && value !== null) {
                // For arrays, prefer non-empty values
                if (Array.isArray(value)) {
                    if (value.length > 0) {
                        merged[key] = value;
                    }
                } else if (key === 'overlayParameters' && typeof value === 'object') {
                    // Merge overlay parameter objects (later keys override earlier ones)
                    merged[key] = { ...(merged[key] ?? {}), ...value };
                } else {
                    merged[key] = value;
                }
            }
        });
    }

    // Ensure required fields have defaults
    if (!merged.stack) merged.stack = 'plain';
    if (!merged.baseImage) merged.baseImage = 'bookworm';
    if (!merged.needsDocker && merged.stack) {
        merged.needsDocker = merged.stack === 'compose';
    }

    return merged as CompositionInput;
}
