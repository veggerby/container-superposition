import * as path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import boxen from 'boxen';
import { select, checkbox, input, password } from '@inquirer/prompts';
import type {
    QuestionnaireAnswers,
    Stack,
    BaseImage,
    LanguageOverlay,
    DatabaseOverlay,
    CloudTool,
    DevTool,
    ObservabilityTool,
    SuperpositionManifest,
    OverlaysConfig,
    OverlayMetadata,
    DeploymentTarget,
    EditorProfile,
} from '../schema/types.js';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import { getIncompatibleOverlays, DEPLOYMENT_TARGETS } from '../schema/deployment-targets.js';
import { collectOverlayParameters } from '../utils/parameters.js';
import { resolveRepoPath } from '../utils/paths.js';
import { type PresetDefinition, type ChoiceResolver, expandPreset } from './presets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Anchor two levels up: tool/questionnaire/ → tool/ → repo root (source)
// or dist/tool/questionnaire/ → dist/tool/ → ... (compiled).
// resolveRepoPath walks up additional levels so overlays/ is found in both layouts.
const REPO_ANCHOR = path.join(__dirname, '../..');

const OVERLAYS_DIR = resolveRepoPath('overlays', REPO_ANCHOR);
const OVERLAYS_CONFIG_PATH = resolveRepoPath(path.join('overlays', 'index.yml'), REPO_ANCHOR);
const PRESETS_DIR = resolveRepoPath(path.join('overlays', '.presets'), REPO_ANCHOR);

export function loadOverlaysConfigWrapper(): OverlaysConfig {
    return loadOverlaysConfig(OVERLAYS_DIR, OVERLAYS_CONFIG_PATH);
}

export { OVERLAYS_DIR, PRESETS_DIR };

/**
 * Build checkbox choices for overlay selection with optional pre-selection
 */
function buildOverlayChoices(
    config: OverlaysConfig,
    stack: Stack,
    categoryList: Array<{ name: string; overlays: OverlayMetadata[] }>,
    preselected: string[]
): any[] {
    const choices: any[] = [];

    categoryList.forEach((category) => {
        const filtered = category.overlays.filter(
            (o: any) =>
                !o.hidden && (!o.supports || o.supports.length === 0 || o.supports.includes(stack))
        );

        if (filtered.length > 0) {
            choices.push({
                type: 'separator',
                separator: chalk.cyan(`──── ${category.name} ────`),
            });

            filtered.forEach((overlay: any) => {
                choices.push({
                    name: overlay.name,
                    value: overlay.id,
                    description: overlay.description,
                    checked: preselected.includes(overlay.id),
                });
            });
        }
    });

    return choices;
}

// ─── Questionnaire section helpers ───────────────────────────────────────────

async function askPresetSection(
    config: OverlaysConfig,
    cliPresetId: string | undefined,
    manifest: SuperpositionManifest | undefined,
    cliPresetChoices: Record<string, string>
): Promise<{
    usePreset: boolean;
    selectedPresetId: string | undefined;
    presetChoices: Record<string, string>;
}> {
    let usePreset = false;
    let selectedPresetId: string | undefined = cliPresetId || manifest?.preset;
    let presetChoices: Record<string, string> = {
        ...(manifest?.presetChoices || {}),
        ...cliPresetChoices,
    };

    const presetOverlaysFiltered = config.overlays.filter((o) => o.category === 'preset');

    if (presetOverlaysFiltered.length > 0) {
        if (selectedPresetId) {
            usePreset = true;
            console.log(chalk.cyan(`\n📦 Using preset: ${selectedPresetId}\n`));
        } else {
            const presetChoice = (await select({
                message: 'Start from a preset or build custom?',
                choices: [
                    {
                        name: 'Custom (select overlays manually)',
                        value: 'custom',
                        description: 'Choose individual overlays yourself',
                    },
                    ...presetOverlaysFiltered.map((p) => ({
                        name: p.name,
                        value: p.id,
                        description: p.description,
                    })),
                ],
                default: 'custom',
            })) as string;

            if (presetChoice !== 'custom') {
                usePreset = true;
                selectedPresetId = presetChoice;
            } else {
                presetChoices = {};
                selectedPresetId = undefined;
            }
        }
    }

    return { usePreset, selectedPresetId, presetChoices };
}

async function askStackSection(
    config: OverlaysConfig,
    manifest: SuperpositionManifest | undefined,
    defaultAnswers: Partial<QuestionnaireAnswers> | undefined
): Promise<Stack> {
    return (await select({
        message: 'Select base template:',
        choices: config.base_templates.map((t) => ({
            name: t.name,
            value: t.id,
            description: t.description,
        })),
        default: manifest?.baseTemplate || defaultAnswers?.stack,
    })) as Stack;
}

async function expandPresetSection(
    usePreset: boolean,
    selectedPresetId: string | undefined,
    stack: Stack,
    presetChoices: Record<string, string>
): Promise<{
    usePreset: boolean;
    selectedPresetId: string | undefined;
    presetOverlays: string[];
    presetChoices: Record<string, string>;
    presetGlueConfig: PresetDefinition['glueConfig'] | undefined;
}> {
    if (!usePreset || !selectedPresetId) {
        return {
            usePreset,
            selectedPresetId,
            presetOverlays: [],
            presetChoices,
            presetGlueConfig: undefined,
        };
    }

    console.log(chalk.cyan(`\n📦 Expanding preset: ${selectedPresetId}\n`));

    const interactiveResolver: ChoiceResolver = async (_key, prompt, options, defaultOption) => {
        return (await select({
            message: prompt,
            choices: options.map((opt) => ({ name: opt, value: opt })),
            default: defaultOption,
        })) as string;
    };

    const expansion = await expandPreset(
        selectedPresetId,
        stack,
        PRESETS_DIR,
        presetChoices,
        interactiveResolver
    );

    if (!expansion.overlays || expansion.overlays.length === 0) {
        console.log(
            chalk.yellow(
                `\n⚠️  Preset "${selectedPresetId}" could not be applied. Falling back to custom overlay selection.\n`
            )
        );
        return {
            usePreset: false,
            selectedPresetId: undefined,
            presetOverlays: [],
            presetChoices: {},
            presetGlueConfig: undefined,
        };
    }

    return {
        usePreset: true,
        selectedPresetId,
        presetOverlays: expansion.overlays,
        presetChoices: expansion.choices,
        presetGlueConfig: expansion.glueConfig,
    };
}

async function askBaseImageSection(
    config: OverlaysConfig,
    manifest: SuperpositionManifest | undefined,
    defaultAnswers: Partial<QuestionnaireAnswers> | undefined
): Promise<{ baseImage: BaseImage; customImage: string | undefined }> {
    const knownBaseImageIds = config.base_images.map((img) => img.id);
    const manifestBaseImageIsKnown =
        manifest?.baseImage && knownBaseImageIds.includes(manifest.baseImage);
    const manifestDefaultBaseImage = manifestBaseImageIsKnown
        ? manifest.baseImage
        : manifest?.baseImage
          ? 'custom'
          : undefined;
    const defaultBaseImage =
        manifestDefaultBaseImage ||
        (defaultAnswers?.baseImage === 'custom' && defaultAnswers.customImage
            ? 'custom'
            : defaultAnswers?.baseImage);

    const baseImage = (await select({
        message: 'Select base image:',
        choices: config.base_images.map((img) => ({
            name: img.name,
            value: img.id,
            description: img.description,
        })),
        default: defaultBaseImage,
    })) as BaseImage;

    let customImage: string | undefined;
    if (baseImage === 'custom') {
        const manifestCustomImage =
            !manifestBaseImageIsKnown && manifest?.baseImage ? manifest.baseImage : undefined;
        const defaultCustomImage = manifestCustomImage || defaultAnswers?.customImage;

        customImage = await input({
            message: 'Enter custom Docker image (e.g., ubuntu:22.04):',
            default: defaultCustomImage,
            validate: (value) => {
                if (!value || value.trim() === '') return 'Image name is required';
                return true;
            },
        });

        console.log(chalk.yellow('\n⚠️  Warning: Custom images may conflict with overlays.'));
        console.log(chalk.dim('   Test thoroughly and adjust configurations as needed.\n'));
    }

    return { baseImage, customImage };
}

async function askOverlaySection(
    config: OverlaysConfig,
    stack: Stack,
    manifest: SuperpositionManifest | undefined,
    defaultAnswers: Partial<QuestionnaireAnswers> | undefined,
    usePreset: boolean,
    presetOverlays: string[]
): Promise<string[]> {
    const categoryList = [
        { name: 'Language', overlays: config.overlays.filter((o) => o.category === 'language') },
        { name: 'Database', overlays: config.overlays.filter((o) => o.category === 'database') },
        { name: 'Messaging', overlays: config.overlays.filter((o) => o.category === 'messaging') },
        {
            name: 'Observability',
            overlays: config.overlays.filter((o) => o.category === 'observability'),
        },
        { name: 'Cloud', overlays: config.overlays.filter((o) => o.category === 'cloud') },
        { name: 'DevTool', overlays: config.overlays.filter((o) => o.category === 'dev') },
    ];

    const allOverlaysMap = new Map(config.overlays.map((o) => [o.id, o]));
    let userSelection: readonly string[];

    if (usePreset && presetOverlays.length > 0) {
        console.log(
            chalk.cyan(`\n✓ Preset includes these overlays: ${presetOverlays.join(', ')}\n`)
        );

        const customizePreset = (await select({
            message: 'Do you want to customize the overlay selection?',
            choices: [
                {
                    name: 'Use preset as-is',
                    value: 'no',
                    description: 'Keep the preset overlay selection',
                },
                {
                    name: 'Customize selection',
                    value: 'yes',
                    description: 'Add or remove overlays from the preset',
                },
            ],
        })) as string;

        if (customizePreset === 'yes') {
            console.log(
                chalk.dim(
                    '\n💡 Select overlays: Space to toggle, ↑/↓ to navigate, Enter to confirm'
                )
            );
            console.log(chalk.dim('   Preset overlays are pre-selected\n'));
            userSelection = await checkbox({
                message: 'Select overlays to include:',
                choices: buildOverlayChoices(config, stack, categoryList, presetOverlays),
                pageSize: 15,
                loop: false,
            });
        } else {
            userSelection = presetOverlays;
        }
    } else if (manifest) {
        console.log(
            chalk.cyan(`\n✓ Manifest includes these overlays: ${manifest.overlays.join(', ')}\n`)
        );

        const customizeManifest = (await select({
            message: 'Do you want to customize the overlay selection?',
            choices: [
                {
                    name: 'Use manifest as-is',
                    value: 'no',
                    description: 'Keep the manifest overlay selection',
                },
                {
                    name: 'Customize selection',
                    value: 'yes',
                    description: 'Add or remove overlays from the manifest',
                },
            ],
        })) as string;

        const existingOverlays = manifest.overlays.filter((id) => allOverlaysMap.has(id));
        const missingOverlays = manifest.overlays.filter((id) => !allOverlaysMap.has(id));

        if (customizeManifest === 'yes') {
            if (missingOverlays.length > 0) {
                console.log(
                    chalk.yellow(
                        `⚠️  Warning: Some overlays from manifest no longer exist: ${missingOverlays.join(', ')}\n`
                    )
                );
            }
            console.log(
                chalk.dim(
                    '\n💡 Select overlays: Space to toggle, ↑/↓ to navigate, Enter to confirm'
                )
            );
            console.log(chalk.dim('   Manifest overlays are pre-selected\n'));
            userSelection = await checkbox({
                message: 'Select overlays to include:',
                choices: buildOverlayChoices(config, stack, categoryList, existingOverlays),
                pageSize: 15,
                loop: false,
            });
        } else {
            if (missingOverlays.length > 0) {
                console.log(
                    chalk.yellow(
                        `⚠️  Warning: Some overlays from manifest no longer exist and will be skipped: ${missingOverlays.join(', ')}\n`
                    )
                );
            }
            userSelection = existingOverlays;
        }
    } else {
        console.log(
            chalk.dim('\n💡 Select overlays: Space to toggle, ↑/↓ to navigate, Enter to confirm\n')
        );

        const preselectedDefaults = [
            ...(defaultAnswers?.language ?? []),
            ...(defaultAnswers?.database ?? []),
            ...(defaultAnswers?.observability ?? []),
            ...(defaultAnswers?.cloudTools ?? []),
            ...(defaultAnswers?.devTools ?? []),
            ...(defaultAnswers?.playwright ? ['playwright'] : []),
        ];

        userSelection = await checkbox({
            message: 'Select overlays to include:',
            choices: buildOverlayChoices(config, stack, categoryList, preselectedDefaults),
            pageSize: 15,
            loop: false,
        });
    }

    // Resolve dependencies
    const withDependencies = new Set<string>(userSelection as string[]);
    const toProcess = [...userSelection] as string[];
    while (toProcess.length > 0) {
        const current = toProcess.pop()!;
        const overlay = allOverlaysMap.get(current);
        if (overlay?.requires) {
            overlay.requires.forEach((req) => {
                if (!withDependencies.has(req)) {
                    withDependencies.add(req);
                    toProcess.push(req);
                }
            });
        }
    }

    let selectedOverlays = Array.from(withDependencies);

    // Resolve conflicts
    let hasConflicts = true;
    while (hasConflicts) {
        const conflicts = new Map<string, string[]>();
        selectedOverlays.forEach((selectedId) => {
            const overlay = allOverlaysMap.get(selectedId);
            if (overlay?.conflicts) {
                overlay.conflicts.forEach((conflictId) => {
                    if (selectedOverlays.includes(conflictId)) {
                        if (!conflicts.has(selectedId)) conflicts.set(selectedId, []);
                        conflicts.get(selectedId)!.push(conflictId);
                    }
                });
            }
        });

        if (conflicts.size === 0) {
            hasConflicts = false;
        } else {
            console.log(chalk.yellow('\n⚠️  Conflicts detected in selection:\n'));

            const conflictChoices: any[] = [];
            conflicts.forEach((conflictingWith, overlayId) => {
                const overlay = allOverlaysMap.get(overlayId)!;
                const conflictNames = conflictingWith
                    .map((id) => allOverlaysMap.get(id)?.name)
                    .join(', ');
                conflictChoices.push({
                    name: `Remove ${overlay.name}`,
                    value: overlayId,
                    description: `Conflicts with: ${conflictNames}`,
                });
            });

            const toRemove = await checkbox({
                message: 'Select overlays to remove to resolve conflicts:',
                choices: conflictChoices,
                pageSize: 15,
                loop: false,
            });

            if ((toRemove as string[]).length === 0) {
                console.log(chalk.red('\n❌ You must remove at least one conflicting overlay'));
                continue;
            }

            selectedOverlays = selectedOverlays.filter(
                (id) => !(toRemove as string[]).includes(id)
            );
        }
    }

    return selectedOverlays;
}

async function askOutputSection(
    manifest: SuperpositionManifest | undefined,
    manifestDir: string | undefined,
    defaultAnswers: Partial<QuestionnaireAnswers> | undefined
): Promise<{
    containerName: string | undefined;
    outputPath: string;
    portOffset: number | undefined;
}> {
    const containerName = await input({
        message: 'Container/project name (optional):',
        default: manifest?.containerName || defaultAnswers?.containerName || '',
    });

    const defaultOutput = manifestDir || defaultAnswers?.outputPath || './.devcontainer';
    const outputPath = await input({
        message: 'Output path:',
        default: defaultOutput,
    });

    const portOffsetInput = await input({
        message: 'Port offset (leave empty for default ports, e.g., 100 to avoid conflicts):',
        default:
            manifest?.portOffset !== undefined
                ? String(manifest.portOffset)
                : defaultAnswers?.portOffset !== undefined
                  ? String(defaultAnswers.portOffset)
                  : '',
    });
    const portOffset = portOffsetInput ? parseInt(portOffsetInput, 10) : undefined;

    return { containerName: containerName || undefined, outputPath, portOffset };
}

async function askEditorSection(
    manifest: SuperpositionManifest | undefined,
    defaultAnswers: Partial<QuestionnaireAnswers> | undefined
): Promise<EditorProfile> {
    const defaultEditor: EditorProfile = manifest?.editor || defaultAnswers?.editor || 'vscode';
    return (await select({
        message: 'Editor profile:',
        choices: [
            {
                name: 'VS Code (default)',
                value: 'vscode',
                description: 'Include VS Code extensions and settings',
            },
            {
                name: 'JetBrains (IntelliJ IDEA, GoLand, PyCharm, Rider…)',
                value: 'jetbrains',
                description:
                    'Generate .idea/ project settings and run configurations, skip VS Code customizations',
            },
            {
                name: 'None (editor-agnostic)',
                value: 'none',
                description: 'Remove all editor-specific customizations',
            },
        ],
        default: defaultEditor,
    })) as EditorProfile;
}

async function askDeploymentTargetSection(
    selectedOverlays: string[],
    allOverlaysMap: Map<string, OverlayMetadata>
): Promise<DeploymentTarget | undefined> {
    const incompatibleOverlays = getIncompatibleOverlays(selectedOverlays, undefined);
    if (incompatibleOverlays.length === 0) return undefined;

    console.log(chalk.yellow('\n⚠️  Deployment Target Compatibility Check:\n'));
    console.log(chalk.gray('Some selected overlays may not work in all environments.'));
    console.log();

    for (const { overlay, alternatives } of incompatibleOverlays) {
        const overlayMeta = allOverlaysMap.get(overlay);
        console.log(chalk.yellow(`   • ${overlayMeta?.name || overlay}`));
        console.log(
            chalk.gray(
                `     Not compatible with: ${DEPLOYMENT_TARGETS.codespaces.name}, ${DEPLOYMENT_TARGETS.gitpod.name}`
            )
        );
        if (alternatives.length > 0) {
            const altNames = alternatives
                .map((id) => allOverlaysMap.get(id)?.name || id)
                .join(', ');
            console.log(chalk.cyan(`     Alternatives: ${altNames}`));
        }
        console.log();
    }

    const target = (await select({
        message: 'Which environment are you targeting?',
        choices: [
            {
                name: '🖥️  Local Development (Docker Desktop)',
                value: 'local',
                description: 'Running on your local machine - supports all overlays',
            },
            {
                name: '☁️  GitHub Codespaces',
                value: 'codespaces',
                description: 'Cloud development - may require docker-in-docker',
            },
            {
                name: '🌐 Gitpod',
                value: 'gitpod',
                description: 'Cloud development - may require docker-in-docker',
            },
            {
                name: '📦 DevPod',
                value: 'devpod',
                description: 'Client-only dev environments',
            },
        ],
        default: 'local',
    })) as DeploymentTarget;

    if (target !== 'local') {
        const targetIncompatible = getIncompatibleOverlays(selectedOverlays, target);
        if (targetIncompatible.length > 0) {
            console.log(
                chalk.yellow(
                    `\n⚠️  Warning: Some overlays won't work in ${DEPLOYMENT_TARGETS[target].name}:\n`
                )
            );
            for (const { overlay, alternatives } of targetIncompatible) {
                const overlayMeta = allOverlaysMap.get(overlay);
                console.log(chalk.red(`   ✗ ${overlayMeta?.name || overlay}`));
                if (alternatives.length > 0) {
                    const altNames = alternatives
                        .map((id) => allOverlaysMap.get(id)?.name || id)
                        .join(', ');
                    console.log(chalk.cyan(`     → Recommended: ${altNames}`));
                }
            }
            console.log();
        }
    }

    return target;
}

async function askOverlayParametersSection(
    allSelectedOverlays: string[],
    config: OverlaysConfig,
    defaultAnswers: Partial<QuestionnaireAnswers> | undefined
): Promise<Record<string, string>> {
    const declaredParams = collectOverlayParameters(allSelectedOverlays, config.overlays);
    const overlayParameters: Record<string, string> = {
        ...(defaultAnswers?.overlayParameters ?? {}),
    };

    if (Object.keys(declaredParams).length === 0) return overlayParameters;

    console.log(chalk.cyan('\n⚙️  Configure overlay parameters:\n'));

    for (const [key, def] of Object.entries(declaredParams)) {
        const preFilledValue = overlayParameters[key];
        const defaultValue = preFilledValue ?? def.default ?? '';

        let value: string;
        if (def.sensitive) {
            value = await password({
                message: `${key} — ${def.description}${defaultValue ? ` (default: hidden)` : ' (required)'}`,
                mask: '*',
            });
            if (!value && def.default !== undefined) {
                value = def.default;
            }
        } else {
            value = await input({
                message: `${key} — ${def.description}`,
                default: defaultValue || undefined,
            });
        }

        if (!value && def.default === undefined) {
            delete overlayParameters[key];
            continue;
        }
        overlayParameters[key] = value;
    }

    return overlayParameters;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Interactive questionnaire — thin orchestrator over the section helpers above.
 */
export async function runQuestionnaire(
    manifest?: SuperpositionManifest,
    manifestDir?: string,
    cliPresetId?: string,
    cliPresetChoices?: Record<string, string>,
    defaultAnswers?: Partial<QuestionnaireAnswers>
): Promise<QuestionnaireAnswers> {
    const config = loadOverlaysConfigWrapper();

    // Banner
    console.log(
        '\n' +
            boxen(
                chalk.bold.cyan('Container Superposition') +
                    '\n' +
                    chalk.gray(manifest ? 'DevContainer Regenerator' : 'DevContainer Initializer'),
                {
                    padding: 1,
                    margin: 1,
                    borderStyle: 'round',
                    borderColor: 'cyan',
                    textAlignment: 'center',
                }
            )
    );

    if (manifest) {
        console.log(chalk.cyan('📋 Loaded from manifest:'));
        console.log(chalk.dim(`   Template: ${manifest.baseTemplate}`));
        console.log(chalk.dim(`   Overlays: ${manifest.overlays.join(', ')}`));
        if (manifest.preset) console.log(chalk.dim(`   Preset: ${manifest.preset}`));
        if (manifest.portOffset) console.log(chalk.dim(`   Port offset: ${manifest.portOffset}`));
        console.log();
    }

    console.log(chalk.dim('Compose your ideal devcontainer from modular overlays.'));
    console.log(
        chalk.dim('Use ') +
            chalk.cyan('space') +
            chalk.dim(' to select, ') +
            chalk.cyan('enter') +
            chalk.dim(' to confirm.\n')
    );

    try {
        // 0. Preset selection
        const presetResult = await askPresetSection(
            config,
            cliPresetId,
            manifest,
            cliPresetChoices ?? {}
        );

        // 1. Stack selection
        const stack = await askStackSection(config, manifest, defaultAnswers);

        // 1a. Expand preset (requires stack to be known first)
        const { usePreset, selectedPresetId, presetOverlays, presetChoices, presetGlueConfig } =
            await expandPresetSection(
                presetResult.usePreset,
                presetResult.selectedPresetId,
                stack,
                presetResult.presetChoices
            );

        // 2. Base image
        const { baseImage, customImage } = await askBaseImageSection(
            config,
            manifest,
            defaultAnswers
        );

        // 3. Overlay selection, dependency resolution, conflict resolution
        const selectedOverlays = await askOverlaySection(
            config,
            stack,
            manifest,
            defaultAnswers,
            usePreset,
            presetOverlays
        );

        // 4. Container name, output path, port offset
        const { containerName, outputPath, portOffset } = await askOutputSection(
            manifest,
            manifestDir,
            defaultAnswers
        );

        // 5. Editor profile
        const editorChoice = await askEditorSection(manifest, defaultAnswers);

        // Categorise selected overlays
        const overlayMap = new Map(config.overlays.map((o) => [o.id, o]));
        const language = selectedOverlays.filter(
            (o) => overlayMap.get(o)?.category === 'language'
        ) as LanguageOverlay[];
        const database = selectedOverlays.filter(
            (o) =>
                overlayMap.get(o)?.category === 'database' ||
                overlayMap.get(o)?.category === 'messaging'
        ) as DatabaseOverlay[];
        const observability = selectedOverlays.filter(
            (o) => overlayMap.get(o)?.category === 'observability'
        ) as ObservabilityTool[];
        const cloudTools = selectedOverlays.filter(
            (o) => overlayMap.get(o)?.category === 'cloud'
        ) as CloudTool[];
        const devTools = selectedOverlays.filter(
            (o) => overlayMap.get(o)?.category === 'dev'
        ) as DevTool[];
        const playwright = selectedOverlays.includes('playwright');

        // 6. Deployment target (only prompted when incompatibilities exist)
        const allOverlaysMap = new Map(config.overlays.map((o) => [o.id, o]));
        const target = await askDeploymentTargetSection(selectedOverlays, allOverlaysMap);

        // 7. Overlay parameters (use the final selectedOverlays as source of truth)
        const allSelectedOverlays = [...selectedOverlays];
        const overlayParameters = await askOverlayParametersSection(
            allSelectedOverlays,
            config,
            defaultAnswers
        );

        return {
            stack,
            baseImage,
            customImage,
            containerName,
            preset: selectedPresetId,
            presetChoices: Object.keys(presetChoices).length > 0 ? presetChoices : undefined,
            presetGlueConfig,
            language,
            needsDocker: stack === 'compose',
            database,
            playwright,
            cloudTools,
            devTools,
            observability,
            outputPath,
            portOffset,
            target: target ?? defaultAnswers?.target,
            minimal: defaultAnswers?.minimal,
            editor: editorChoice,
            customizations: defaultAnswers?.customizations,
            overlayParameters:
                Object.keys(overlayParameters).length > 0 ? overlayParameters : undefined,
        };
    } catch (error) {
        if ((error as any).name === 'ExitPromptError') {
            console.log('\n' + chalk.yellow('Cancelled by user'));
            process.exit(0);
        }
        throw error;
    }
}
