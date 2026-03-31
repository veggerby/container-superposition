import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import yaml from 'js-yaml';
import type {
    LanguageOverlay,
    DatabaseOverlay,
    CloudTool,
    DevTool,
    ObservabilityTool,
    OverlaysConfig,
    PresetParameter,
    PresetGlueConfig,
    QuestionnaireAnswers,
} from '../schema/types.js';

export interface PresetDefinition {
    id: string;
    name: string;
    description: string;
    type: 'meta';
    category: 'preset';
    supports?: string[];
    tags?: string[];
    selects: {
        required: string[];
        userChoice?: Record<
            string,
            {
                id: string;
                prompt: string;
                options: string[];
                defaultOption?: string;
            }
        >;
    };
    parameters?: Record<string, PresetParameter>;
    glueConfig?: PresetGlueConfig;
}

/**
 * A callback that resolves a user choice for a preset option.
 * For interactive mode, this shows an Inquirer prompt.
 * For non-interactive mode, this validates and returns the provided value or throws.
 */
export type ChoiceResolver = (
    key: string,
    prompt: string,
    options: string[],
    defaultOption?: string
) => Promise<string>;

/**
 * Load preset definition from YAML file.
 */
export function loadPresetDefinition(
    presetId: string,
    presetsDir: string
): PresetDefinition | null {
    const presetPath = path.join(presetsDir, `${presetId}.yml`);
    if (!fs.existsSync(presetPath)) {
        console.warn(chalk.yellow(`⚠️  Preset definition not found: ${presetPath}`));
        return null;
    }
    const content = fs.readFileSync(presetPath, 'utf8');
    return yaml.load(content) as PresetDefinition;
}

/**
 * Expand a preset into a list of overlay IDs with user choices resolved.
 *
 * The `resolveChoice` callback handles how choices are obtained:
 * - Interactive mode: uses select() from Inquirer
 * - Non-interactive mode: validates provided choices and throws on missing/invalid
 */
export async function expandPreset(
    presetId: string,
    stack: string,
    presetsDir: string,
    providedChoices: Record<string, string>,
    resolveChoice: ChoiceResolver
): Promise<{
    overlays: string[];
    choices: Record<string, string>;
    glueConfig?: PresetDefinition['glueConfig'];
}> {
    const preset = loadPresetDefinition(presetId, presetsDir);
    if (!preset) {
        return { overlays: [], choices: {} };
    }

    // Validate that the preset supports the requested stack, if constraints are defined.
    if (preset.supports && preset.supports.length > 0 && !preset.supports.includes(stack)) {
        console.warn(
            chalk.yellow(
                `⚠️  Preset '${preset.id}' does not support stack '${stack}'. ` +
                    `Supported stacks: ${preset.supports.join(', ')}`
            )
        );
        return { overlays: [], choices: {} };
    }

    const overlays: string[] = [...preset.selects.required];
    const choices: Record<string, string> = {};

    // Handle user choices (single overlay per option)
    if (preset.selects.userChoice) {
        for (const [key, choice] of Object.entries(preset.selects.userChoice)) {
            const preProvidedValue = providedChoices[key];

            if (preProvidedValue !== undefined) {
                if (!choice.options.includes(preProvidedValue)) {
                    const valid = choice.options.join(', ');
                    throw new Error(
                        `Invalid value '${preProvidedValue}' for preset choice '${key}'. Valid options: ${valid}`
                    );
                }
                overlays.push(preProvidedValue);
                choices[key] = preProvidedValue;
            } else {
                const selectedOption = await resolveChoice(
                    key,
                    choice.prompt,
                    choice.options,
                    choice.defaultOption
                );
                overlays.push(selectedOption);
                choices[key] = selectedOption;
            }
        }
    }

    // Handle parameterized slots (multiple overlays per option)
    if (preset.parameters) {
        for (const [key, param] of Object.entries(preset.parameters)) {
            const preProvidedValue = providedChoices[key];
            let selectedId: string;

            if (preProvidedValue !== undefined) {
                const validOption = param.options.find((o) => o.id === preProvidedValue);
                if (!validOption) {
                    const valid = param.options.map((o) => o.id).join(', ');
                    throw new Error(
                        `Invalid value '${preProvidedValue}' for preset parameter '${key}'. Valid options: ${valid}`
                    );
                }
                selectedId = preProvidedValue;
            } else {
                const description = param.description || `Select ${key}`;
                const paramOptions = param.options.map((o) => o.id);
                selectedId = await resolveChoice(key, description, paramOptions, param.default);
            }

            const selectedOption = param.options.find((o) => o.id === selectedId);
            if (selectedOption) {
                overlays.push(...selectedOption.overlays);
            }
            choices[key] = selectedId;
        }
    }

    // Deduplicate overlays
    const uniqueOverlays = [...new Set(overlays)];

    // Apply template substitution to glueConfig.environment values
    let resolvedGlueConfig = preset.glueConfig;
    if (resolvedGlueConfig?.environment) {
        const resolvedEnv: Record<string, string> = {};
        for (const [envKey, envValue] of Object.entries(resolvedGlueConfig.environment)) {
            resolvedEnv[envKey] = envValue.replace(
                /\{\{parameters\.(\w+)\.id\}\}/g,
                (_match: string, paramKey: string) => choices[paramKey] ?? _match
            );
        }
        resolvedGlueConfig = { ...resolvedGlueConfig, environment: resolvedEnv };
    }

    return { overlays: uniqueOverlays, choices, glueConfig: resolvedGlueConfig };
}

/**
 * Categorize overlay IDs into typed category arrays.
 */
export function categorizeOverlayIds(overlayIds: string[], config: OverlaysConfig) {
    const language: LanguageOverlay[] = [];
    const database: DatabaseOverlay[] = [];
    const observability: ObservabilityTool[] = [];
    const cloudTools: CloudTool[] = [];
    const devTools: DevTool[] = [];

    const overlayMap = new Map(config.overlays.map((o) => [o.id, o]));

    for (const id of overlayIds) {
        const overlay = overlayMap.get(id);
        if (!overlay) continue;

        switch (overlay.category) {
            case 'language':
                language.push(id as LanguageOverlay);
                break;
            case 'database':
                database.push(id as DatabaseOverlay);
                break;
            case 'observability':
                observability.push(id as ObservabilityTool);
                break;
            case 'cloud':
                cloudTools.push(id as CloudTool);
                break;
            case 'dev':
                devTools.push(id as DevTool);
                break;
        }
    }

    return { language, database, observability, cloudTools, devTools };
}

export function mergeUnique<T>(left?: T[], right?: T[]): T[] | undefined {
    const merged = [...(left ?? []), ...(right ?? [])];
    return merged.length > 0 ? [...new Set(merged)] : undefined;
}

/**
 * Apply preset selections to a partial answers object (non-interactive).
 * Expands the preset using provided choices (or defaults), throwing on missing required choices.
 */
export async function applyPresetSelections(
    answers: Partial<QuestionnaireAnswers>,
    overlaysConfig: OverlaysConfig,
    presetsDir: string
): Promise<Partial<QuestionnaireAnswers>> {
    if (!answers.preset) {
        return answers;
    }

    // Non-interactive resolver: use provided choice or default, throw if neither available
    const nonInteractiveResolver: ChoiceResolver = async (key, _prompt, options, defaultOption) => {
        const provided = answers.presetChoices?.[key];
        const selected = provided ?? defaultOption;
        if (!selected || !options.includes(selected)) {
            const valid = options.join(', ');
            throw new Error(`Preset choice '${key}' must be one of: ${valid}`);
        }
        return selected;
    };

    const expansion = await expandPreset(
        answers.preset,
        answers.stack ?? 'plain',
        presetsDir,
        answers.presetChoices ?? {},
        nonInteractiveResolver
    );

    const categories = categorizeOverlayIds(expansion.overlays, overlaysConfig);

    return {
        ...answers,
        language: mergeUnique(categories.language, answers.language),
        database: mergeUnique(categories.database, answers.database),
        observability: mergeUnique(categories.observability, answers.observability),
        cloudTools: mergeUnique(categories.cloudTools, answers.cloudTools),
        devTools: mergeUnique(categories.devTools, answers.devTools),
        playwright: answers.playwright ?? expansion.overlays.includes('playwright'),
        presetChoices: Object.keys(expansion.choices).length > 0 ? expansion.choices : undefined,
        presetGlueConfig: expansion.glueConfig,
    };
}
