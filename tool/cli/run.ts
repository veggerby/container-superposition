import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import { checkbox, input, password, select } from '@inquirer/prompts';
import type {
    OverlayMetadata,
    ProjectEnvVar,
    QuestionnaireAnswers,
    Stack,
    SuperpositionManifest,
} from '../schema/types.js';
import {
    composeDevContainer,
    generateManifestOnly,
    resolveDependencies,
} from '../questionnaire/composer.js';
import { loadManifest } from '../schema/manifest-migrations.js';
import { printSummary } from '../utils/summary.js';
import { classifyChangeSet } from '../ux/semantics/change-class.js';
import { resolveNextStep } from '../ux/semantics/next-step.js';
import { describeSource } from '../ux/semantics/source.js';
import { resolveLocalConfigTrust } from '../ux/semantics/local-config.js';
import {
    renderFrame,
    renderSection,
    renderList,
    renderLocalConfigTrust,
} from '../ux/renderers/common.js';
import {
    applyLocalConfigToAnswers,
    buildAnswersFromGlobalInitDefaults,
    buildAnswersFromManifest,
    buildAnswersFromProjectConfig,
    buildProjectConfigSelectionFromAnswers,
    findDefaultRegenManifest,
    findIgnoredLocalProjectConfig,
    findLocalProjectConfig,
    findManifestFile,
    getOverlayIdsFromProjectSelection,
    hasMeaningfulLocalProjectConfig,
    hasNamedProjectOverlaySelections,
    findProjectConfig,
    loadGlobalDefaults,
    loadLocalProjectConfig,
    loadProjectConfig,
    materializeLocalCustomizationConfig,
    mergeInitDefaultsWithCliInputs,
    writeLocalProjectConfig,
    writeProjectConfig,
    writeProjectConfigCustomizations,
    type GlobalLocalConfigTemplateSelection,
    type LoadedGlobalDefaults,
    type LocalProjectConfigSelection,
    type StackAwareLocalProjectConfigTemplateSelection,
} from '../schema/project-config.js';
import { isInsideGitRepo, createBackup, ensureBackupPatternsInGitignore } from '../utils/backup.js';
import { buildAnswersFromCliArgs, mergeAnswers } from '../questionnaire/answers.js';
import { applyPresetSelections } from '../questionnaire/presets.js';
import {
    runQuestionnaire,
    loadOverlaysConfigWrapper,
    PRESETS_DIR,
} from '../questionnaire/questionnaire.js';
import { parseCliArgs } from './args.js';
import { appendGitignoreSection } from '../utils/gitignore.js';
import { collectOverlayParameters } from '../utils/parameters.js';
import { deepMerge } from '../utils/merge.js';
import { assertComposeNetworkNameSupported } from '../utils/compose-network.js';

function isStackAwareLocalConfigTemplate(
    template: GlobalLocalConfigTemplateSelection | undefined
): template is StackAwareLocalProjectConfigTemplateSelection {
    return Boolean(
        template &&
        typeof template === 'object' &&
        !Array.isArray(template) &&
        ('common' in template || 'plain' in template || 'compose' in template)
    );
}

function compactLocalConfigSelection(
    selection: LocalProjectConfigSelection
): LocalProjectConfigSelection {
    const env = selection.env && Object.keys(selection.env).length > 0 ? selection.env : undefined;
    const mounts = selection.mounts && selection.mounts.length > 0 ? selection.mounts : undefined;
    const shellAliases =
        selection.shell?.aliases && Object.keys(selection.shell.aliases).length > 0
            ? selection.shell.aliases
            : undefined;
    const shellSnippets =
        selection.shell?.snippets && selection.shell.snippets.length > 0
            ? selection.shell.snippets
            : undefined;
    const shell =
        shellAliases || shellSnippets
            ? { aliases: shellAliases, snippets: shellSnippets }
            : undefined;
    const customizations =
        selection.customizations && Object.keys(selection.customizations).length > 0
            ? selection.customizations
            : undefined;

    return {
        env,
        mounts,
        shell,
        customizations,
        portOffset: selection.portOffset,
        ports: selection.ports,
    };
}

function mergeLocalConfigSelections(
    common: LocalProjectConfigSelection | undefined,
    branch: LocalProjectConfigSelection | undefined
): LocalProjectConfigSelection {
    return compactLocalConfigSelection({
        env: { ...(common?.env ?? {}), ...(branch?.env ?? {}) },
        mounts: [...(common?.mounts ?? []), ...(branch?.mounts ?? [])],
        shell:
            common?.shell || branch?.shell
                ? {
                      aliases: {
                          ...(common?.shell?.aliases ?? {}),
                          ...(branch?.shell?.aliases ?? {}),
                      },
                      snippets: [
                          ...(common?.shell?.snippets ?? []),
                          ...(branch?.shell?.snippets ?? []),
                      ],
                  }
                : undefined,
        customizations:
            common?.customizations || branch?.customizations
                ? deepMerge(common?.customizations ?? {}, branch?.customizations ?? {})
                : undefined,
        portOffset: branch?.portOffset ?? common?.portOffset,
        ports: branch?.ports !== undefined ? [...branch.ports] : common?.ports,
    });
}

function materializeGlobalLocalConfigTemplate(
    template: GlobalLocalConfigTemplateSelection | undefined,
    stack: Stack
): LocalProjectConfigSelection | undefined {
    if (!template) {
        return undefined;
    }

    if (!isStackAwareLocalConfigTemplate(template)) {
        return template;
    }

    return mergeLocalConfigSelections(
        template.common,
        stack === 'compose' ? template.compose : template.plain
    );
}

function validateMaterializedLocalConfigTemplate(
    selection: LocalProjectConfigSelection | undefined,
    stack: Stack
): void {
    if (!selection) {
        return;
    }

    for (const entry of Object.values(selection.env ?? {})) {
        const structuredEntry =
            typeof entry === 'string' ? ({ value: entry } satisfies ProjectEnvVar) : entry;
        if (structuredEntry.target === 'composeEnv' && stack !== 'compose') {
            throw new Error(
                'Project env target "composeEnv" requires stack: compose because no docker-compose.yml is generated for plain stacks'
            );
        }
    }

    for (const mount of selection.mounts ?? []) {
        if (mount.target === 'composeVolume' && stack !== 'compose') {
            throw new Error(
                'Project mount target "composeVolume" requires stack: compose because no docker-compose.yml is generated for plain stacks'
            );
        }
    }

    if (stack === 'compose') {
        for (const [index, port] of (selection.ports ?? []).entries()) {
            if (!port.value.includes(':')) {
                throw new Error(
                    `ports[${index}]: stack 'compose' expects a HOST:CONTAINER port binding (with colon), got "${port.value}". Use a bare port expression only on stack 'plain'.`
                );
            }
        }
    }
}

function printGlobalDefaultsPrecedenceNotice(globalDefaults: LoadedGlobalDefaults): void {
    if (!globalDefaults.ignoredPath) {
        return;
    }

    console.log(
        chalk.dim(
            'ℹ Global defaults: using ~/.container-superposition.yml and ignoring ~/.superposition.yml for this init run'
        )
    );
}

function renderRunFraming(input: {
    mode: string;
    source: string;
    sharedProjectFile: string;
    generatedOutput: string;
    localConfig: string;
    nextAction?: string | null;
}): string {
    return renderFrame([
        { label: 'Mode', value: input.mode },
        { label: 'Source', value: input.source },
        { label: 'Shared project file', value: input.sharedProjectFile },
        { label: 'Generated output', value: input.generatedOutput },
        { label: 'Local-only config', value: input.localConfig },
        ...(input.nextAction
            ? [{ label: 'Recommended next action', value: input.nextAction }]
            : []),
    ]);
}

function renderUpdateHeader(input: {
    sharedProjectFile: string;
    generatedOutput: string;
    localConfig: string;
}): string {
    return boxen(
        [
            chalk.bold('Update shared setup'),
            `Project file: ${input.sharedProjectFile}`,
            `Output: ${input.generatedOutput}`,
            `Local config: ${input.localConfig}`,
        ].join('\n'),
        { padding: 1, borderStyle: 'round', borderColor: 'cyan' }
    );
}

function renderPreflight(input: {
    source: string;
    intent: string[];
    willWrite: string[];
    willPreserve: string[];
    manualFollowUp: string[];
    backupPlan: string;
}): string {
    return [
        renderSection('Source', input.source),
        '',
        renderSection('Intent', renderList(input.intent, 'none')),
        '',
        renderSection('Will write', renderList(input.willWrite, 'No material changes')),
        '',
        renderSection('Will preserve', renderList(input.willPreserve, 'none')),
        '',
        renderSection('Manual follow-up', renderList(input.manualFollowUp, 'none')),
        '',
        renderSection('Backup plan', input.backupPlan),
    ].join('\n');
}

function renderRunSuccess(input: {
    changed: string[];
    preserved: string[];
    nextStep?: string | null;
    manualReview: string[];
}): string {
    return [
        renderSection('Changed', renderList(input.changed, 'No material changes')),
        '',
        renderSection('Preserved', renderList(input.preserved, 'none')),
        ...(input.nextStep ? ['', renderSection('Next step', input.nextStep)] : []),
        ...(input.manualReview.length > 0
            ? ['', renderSection('Manual review', renderList(input.manualReview, 'none'))]
            : []),
    ].join('\n');
}

function assertNoGlobalDefaultOverlayConflicts(
    answers: QuestionnaireAnswers,
    globalDefaults: LoadedGlobalDefaults,
    overlays: OverlayMetadata[]
): void {
    const globalOverlayIds = globalDefaults.selection.initDefaults?.overlays ?? [];
    if (globalOverlayIds.length === 0) {
        return;
    }

    const requestedOverlays = getOverlayIdsFromProjectSelection(
        buildProjectConfigSelectionFromAnswers(answers),
        { overlays, base_images: [], base_templates: [] }
    );
    const { conflicts } = resolveDependencies(requestedOverlays, overlays, {
        warnOnConflicts: false,
    });
    const globalOverlaySet = new Set<string>(globalOverlayIds);
    const relevantConflicts = conflicts.filter(
        ({ overlayId, conflictId }) =>
            globalOverlaySet.has(overlayId) || globalOverlaySet.has(conflictId)
    );

    if (relevantConflicts.length === 0) {
        return;
    }

    const uniqueConflicts = [
        ...new Set(
            relevantConflicts.map(({ overlayId, conflictId }) =>
                [overlayId, conflictId].sort().join(' ↔ ')
            )
        ),
    ];

    throw new Error(
        [
            `Conflicting overlays detected from global defaults file ${globalDefaults.path}.`,
            ...uniqueConflicts.map((conflict) => `  • ${conflict}`),
            `Update ${globalDefaults.path} or rerun init with --ignore-global-defaults.`,
        ].join('\n')
    );
}

function summarizeCurrentSetup(answers: Partial<QuestionnaireAnswers>): string[] {
    const summary = [`stack: ${answers.stack ?? 'unknown'}`];

    if ((answers.language ?? []).length > 0) {
        summary.push(`language: ${answers.language?.join(', ')}`);
    }
    if (answers.preset) {
        summary.push(`preset: ${answers.preset}`);
    }
    if ((answers.database ?? []).length > 0) {
        summary.push(`data services: ${answers.database?.join(', ')}`);
    }
    if ((answers.observability ?? []).length > 0) {
        summary.push(`observability: ${answers.observability?.join(', ')}`);
    }
    if ((answers.cloudTools ?? []).length > 0) {
        summary.push(`cloud tools: ${answers.cloudTools?.join(', ')}`);
    }
    if ((answers.devTools ?? []).length > 0) {
        summary.push(`dev tools: ${answers.devTools?.join(', ')}`);
    }
    if (answers.playwright) {
        summary.push('playwright: enabled');
    }
    summary.push(`editor: ${answers.editor ?? 'vscode'}`);

    return summary;
}

function hashPathState(targetPath: string): string | null {
    if (!fs.existsSync(targetPath)) {
        return null;
    }

    const hash = crypto.createHash('sha256');

    const visit = (currentPath: string, relativePath: string): void => {
        const stat = fs.statSync(currentPath);
        if (stat.isDirectory()) {
            hash.update(`dir:${relativePath}\n`);
            for (const entry of fs.readdirSync(currentPath).sort()) {
                visit(path.join(currentPath, entry), path.join(relativePath, entry));
            }
            return;
        }

        if (relativePath === 'superposition.json') {
            return;
        }

        hash.update(`file:${relativePath}\n`);
        hash.update(fs.readFileSync(currentPath));
        hash.update('\n');
    };

    visit(targetPath, '.');
    return hash.digest('hex');
}

export function buildShortcutOverlayChoices(flow: {
    stack: QuestionnaireAnswers['stack'];
    overlays: OverlayMetadata[];
    selectedOverlayIds: string[];
}): any[] {
    const CATEGORY_LABELS: Record<string, string> = {
        language: 'Languages',
        database: 'Data services',
        messaging: 'Data services',
        observability: 'Observability',
        cloud: 'Cloud tools',
        dev: 'Dev tools',
    };

    const grouped = new Map<string, OverlayMetadata[]>();
    for (const overlay of flow.overlays) {
        const supportsCurrentStack =
            !overlay.supports ||
            overlay.supports.length === 0 ||
            overlay.supports.includes(flow.stack ?? 'plain');
        if (
            overlay.hidden ||
            flow.selectedOverlayIds.includes(overlay.id) ||
            !supportsCurrentStack
        ) {
            continue;
        }
        const group = CATEGORY_LABELS[overlay.category] ?? 'Other';
        const existing = grouped.get(group) ?? [];
        existing.push(overlay);
        grouped.set(group, existing);
    }

    const orderedGroups = [
        'Languages',
        'Data services',
        'Observability',
        'Cloud tools',
        'Dev tools',
        'Other',
    ];
    const choices: any[] = [];
    for (const group of orderedGroups) {
        const overlays = grouped.get(group);
        if (!overlays || overlays.length === 0) continue;
        choices.push({
            type: 'separator',
            separator: chalk.cyan(`──── ${group} ────`),
        });
        for (const overlay of overlays.sort((a, b) => a.name.localeCompare(b.name))) {
            choices.push({
                name: overlay.name,
                value: overlay.id,
                description: overlay.description,
            });
        }
    }
    return choices;
}

function printIgnoredLocalConfigWarning(projectRoot: string): void {
    if (!findIgnoredLocalProjectConfig(projectRoot)) {
        return;
    }
    console.warn(
        chalk.yellow(
            '⚠ Ignoring .superposition.local.yml.\n  Rename it to superposition.local.yml in repository root to use local config.'
        )
    );
}

function ensureLocalConfigIgnored(projectRoot: string): void {
    try {
        const added = appendGitignoreSection(
            path.join(projectRoot, '.gitignore'),
            'container-superposition local config',
            ['superposition.local.yml']
        );
        if (added) {
            console.log('Added superposition.local.yml to root .gitignore.');
        }
    } catch {
        console.warn(
            chalk.yellow(
                '⚠ superposition.local.yml is not ignored by Git.\n  Add this line to root .gitignore: superposition.local.yml'
            )
        );
    }
}

export function buildInitEntryChoices(existingProjectFileDetected: boolean): Array<{
    name: string;
    value: string;
    description: string;
}> {
    if (existingProjectFileDetected) {
        return [
            {
                name: 'Add capability',
                value: 'add-capability',
                description: 'Update shared project file and generated output with new overlays',
            },
            {
                name: 'Remove capability',
                value: 'remove-capability',
                description: 'Drop selected overlays and replay only impacted changes',
            },
            {
                name: 'Change runtime or editor',
                value: 'change-runtime-or-editor',
                description: 'Adjust stack, base image, or editor profile without broad review',
            },
            {
                name: 'Adjust parameters',
                value: 'adjust-parameters',
                description: 'Edit overlay parameter values only',
            },
            {
                name: 'Review current setup',
                value: 'review-current-setup',
                description: 'See current shared setup summary before choosing next change',
            },
            {
                name: 'Edit full setup',
                value: 'edit-full-setup',
                description: 'Open full guided review of shared setup',
            },
            {
                name: 'Preview and write',
                value: 'preview-and-write',
                description: 'Finish shortcut edits and continue to preflight + write',
            },
        ];
    }

    return [
        {
            name: 'Fast start',
            value: 'fast-start',
            description: 'Recommended preset-led path, ~3 decisions',
        },
        {
            name: 'Custom build',
            value: 'custom-build',
            description: 'Direct overlay composition, ~5-7 decisions',
        },
    ];
}

function setAnswersFromOverlayIds(
    base: Partial<QuestionnaireAnswers>,
    selectedOverlayIds: string[],
    overlays: OverlayMetadata[]
): Partial<QuestionnaireAnswers> {
    const overlayMap = new Map(overlays.map((overlay) => [overlay.id, overlay]));
    const language = selectedOverlayIds.filter(
        (id) => overlayMap.get(id)?.category === 'language'
    ) as QuestionnaireAnswers['language'];
    const database = selectedOverlayIds.filter(
        (id) =>
            overlayMap.get(id)?.category === 'database' ||
            overlayMap.get(id)?.category === 'messaging'
    ) as QuestionnaireAnswers['database'];
    const observability = selectedOverlayIds.filter(
        (id) => overlayMap.get(id)?.category === 'observability'
    ) as QuestionnaireAnswers['observability'];
    const cloudTools = selectedOverlayIds.filter(
        (id) => overlayMap.get(id)?.category === 'cloud'
    ) as QuestionnaireAnswers['cloudTools'];
    const devTools = selectedOverlayIds.filter(
        (id) => overlayMap.get(id)?.category === 'dev' && id !== 'playwright'
    ) as QuestionnaireAnswers['devTools'];

    return {
        ...base,
        language,
        database,
        observability,
        cloudTools,
        devTools,
        playwright: selectedOverlayIds.includes('playwright'),
    };
}

async function runInitShortcutFlow(flow: {
    projectConfigAnswers: Partial<QuestionnaireAnswers>;
    overlays: OverlayMetadata[];
    suppressInitialSummary?: boolean;
}): Promise<{
    mode: 'preview-and-write' | 'edit-full-setup';
    answers: Partial<QuestionnaireAnswers>;
}> {
    let currentAnswers = flow.projectConfigAnswers;
    let showSummary = !flow.suppressInitialSummary;

    while (true) {
        if (showSummary) {
            console.log(
                '\n' +
                    renderSection(
                        'Current shared setup',
                        renderList(summarizeCurrentSetup(currentAnswers))
                    )
            );
        }
        showSummary = true;

        const shortcut = (await select({
            message: 'Edit current setup',
            choices: buildInitEntryChoices(true),
            default: 'add-capability',
        })) as string;

        if (shortcut === 'review-current-setup') {
            continue;
        }

        if (shortcut === 'edit-full-setup') {
            return { mode: 'edit-full-setup', answers: currentAnswers };
        }

        if (shortcut === 'preview-and-write') {
            return { mode: 'preview-and-write', answers: currentAnswers };
        }

        const selectedOverlayIds = [
            ...(currentAnswers.language ?? []),
            ...(currentAnswers.database ?? []),
            ...(currentAnswers.observability ?? []),
            ...(currentAnswers.cloudTools ?? []),
            ...(currentAnswers.devTools ?? []),
            ...(currentAnswers.playwright ? ['playwright'] : []),
        ];
        const overlayMap = new Map(flow.overlays.map((overlay) => [overlay.id, overlay]));

        if (shortcut === 'add-capability') {
            const choices = buildShortcutOverlayChoices({
                stack: currentAnswers.stack ?? 'plain',
                overlays: flow.overlays,
                selectedOverlayIds,
            });
            if (choices.length === 0) {
                console.log(
                    chalk.dim(
                        `No additional capabilities available for stack ${currentAnswers.stack ?? 'plain'}.`
                    )
                );
                continue;
            }
            const additions = (await checkbox({
                message: `Add capability (${currentAnswers.stack ?? 'plain'} stack)`,
                choices,
                pageSize: 18,
                loop: false,
            })) as string[];
            currentAnswers = setAnswersFromOverlayIds(
                currentAnswers,
                [...selectedOverlayIds, ...additions],
                flow.overlays
            );
            continue;
        }

        if (shortcut === 'remove-capability') {
            const choices = selectedOverlayIds.map((overlayId) => ({
                name: overlayMap.get(overlayId)?.name ?? overlayId,
                value: overlayId,
                description: overlayMap.get(overlayId)?.description ?? '',
            }));
            const removals = (await checkbox({
                message: 'Remove capability',
                choices,
                pageSize: 15,
                loop: false,
            })) as string[];
            currentAnswers = setAnswersFromOverlayIds(
                currentAnswers,
                selectedOverlayIds.filter((overlayId) => !removals.includes(overlayId)),
                flow.overlays
            );
            continue;
        }

        if (shortcut === 'change-runtime-or-editor') {
            const changeTarget = (await select({
                message: 'Change runtime or editor',
                choices: [
                    { name: 'Stack', value: 'stack' },
                    { name: 'Base image', value: 'baseImage' },
                    { name: 'Editor profile', value: 'editor' },
                ],
                default: 'stack',
            })) as 'stack' | 'baseImage' | 'editor';

            if (changeTarget === 'stack') {
                const stack = (await select({
                    message: 'Select stack',
                    choices: [
                        { name: 'plain', value: 'plain' },
                        { name: 'compose', value: 'compose' },
                    ],
                    default: currentAnswers.stack ?? 'compose',
                })) as QuestionnaireAnswers['stack'];
                currentAnswers = {
                    ...currentAnswers,
                    stack,
                    needsDocker: stack === 'compose',
                };
                continue;
            }

            if (changeTarget === 'baseImage') {
                const baseImage = (await select({
                    message: 'Select base image',
                    choices: [
                        { name: 'bookworm', value: 'bookworm' },
                        { name: 'trixie', value: 'trixie' },
                        { name: 'alpine', value: 'alpine' },
                        { name: 'ubuntu', value: 'ubuntu' },
                        { name: 'custom', value: 'custom' },
                    ],
                    default: currentAnswers.baseImage ?? 'bookworm',
                })) as QuestionnaireAnswers['baseImage'];
                const customImage =
                    baseImage === 'custom'
                        ? await input({
                              message: 'Enter custom Docker image',
                              default: currentAnswers.customImage ?? '',
                          })
                        : undefined;
                currentAnswers = { ...currentAnswers, baseImage, customImage };
                continue;
            }

            const editor = (await select({
                message: 'Select editor profile',
                choices: [
                    { name: 'vscode', value: 'vscode' },
                    { name: 'jetbrains', value: 'jetbrains' },
                    { name: 'none', value: 'none' },
                ],
                default: currentAnswers.editor ?? 'vscode',
            })) as QuestionnaireAnswers['editor'];
            currentAnswers = { ...currentAnswers, editor };
            continue;
        }

        const declaredParameters = collectOverlayParameters(selectedOverlayIds, flow.overlays);
        const parameterKeys = Object.keys(declaredParameters);
        if (parameterKeys.length === 0) {
            console.log(chalk.dim('No overlay parameters declared for current setup.'));
            continue;
        }

        const parameterKey = (await select({
            message: 'Adjust parameters',
            choices: parameterKeys.map((key) => ({
                name: key,
                value: key,
                description: declaredParameters[key]?.description ?? '',
            })),
            default: parameterKeys[0],
        })) as string;
        const definition = declaredParameters[parameterKey];
        const existingValue = currentAnswers.overlayParameters?.[parameterKey] ?? '';
        const nextValue = definition?.sensitive
            ? await password({
                  message: `Enter value for ${parameterKey}${existingValue || definition?.default ? ' (leave blank to keep current value)' : ''}`,
                  mask: '*',
              })
            : await input({
                  message: `Enter value for ${parameterKey}`,
                  default: existingValue || definition?.default || '',
              });

        currentAnswers = {
            ...currentAnswers,
            overlayParameters: {
                ...(currentAnswers.overlayParameters ?? {}),
                [parameterKey]: nextValue || existingValue || definition?.default || '',
            },
        };
    }
}

export async function main(): Promise<void> {
    try {
        const cliArgs = await parseCliArgs();
        const initialCwd = process.cwd();

        if (cliArgs?.projectRoot) {
            const resolvedProjectRoot = path.resolve(initialCwd, cliArgs.projectRoot);

            if (!fs.existsSync(resolvedProjectRoot)) {
                console.error(chalk.red(`✗ Project root not found: ${resolvedProjectRoot}`));
                process.exit(1);
            }

            if (!fs.statSync(resolvedProjectRoot).isDirectory()) {
                console.error(
                    chalk.red(`✗ Project root is not a directory: ${resolvedProjectRoot}`)
                );
                process.exit(1);
            }

            process.chdir(resolvedProjectRoot);
        }

        let projectFileOutputPath: string | undefined;
        let existingProjectFileDetected = false;
        if (cliArgs?.commandName === 'init' || cliArgs?.commandName === undefined) {
            const discoveredProjectFiles = findProjectConfig(process.cwd());
            if (discoveredProjectFiles.length > 1) {
                console.error(
                    chalk.red(
                        '✗ Found both .superposition.yml and superposition.yml in the repository root. Keep only one.'
                    )
                );
                console.error(
                    chalk.gray(
                        '  Recommended: keep .superposition.yml (dotfile) to keep the root tidy; delete superposition.yml.'
                    )
                );
                process.exit(1);
            }
            if (discoveredProjectFiles.length === 1) {
                existingProjectFileDetected = true;
            }
            projectFileOutputPath =
                discoveredProjectFiles[0]?.path ?? path.join(process.cwd(), '.superposition.yml');
        }

        let projectConfig = undefined;
        let projectConfigAnswers: Partial<QuestionnaireAnswers> | undefined;
        let localProjectConfig = undefined;
        let globalDefaults = undefined;
        let globalInitDefaultsAnswers: Partial<QuestionnaireAnswers> | undefined;
        const projectRoot = process.cwd();
        const mainOverlaysConfig = loadOverlaysConfigWrapper();

        printIgnoredLocalConfigWarning(projectRoot);

        if (!cliArgs?.manifestPath) {
            projectConfig = loadProjectConfig(mainOverlaysConfig, projectRoot) ?? undefined;

            const isEligibleGlobalDefaultsInit =
                cliArgs?.commandName === 'init' &&
                !cliArgs.ignoreGlobalDefaults &&
                !cliArgs.fromProject &&
                !cliArgs.manifestPath &&
                !existingProjectFileDetected;

            if (isEligibleGlobalDefaultsInit) {
                globalDefaults = loadGlobalDefaults(mainOverlaysConfig) ?? undefined;
                if (globalDefaults) {
                    printGlobalDefaultsPrecedenceNotice(globalDefaults);
                }
                globalInitDefaultsAnswers = buildAnswersFromGlobalInitDefaults(
                    globalDefaults?.selection.initDefaults,
                    mainOverlaysConfig
                );
            }

            localProjectConfig = loadLocalProjectConfig(projectRoot) ?? undefined;
            if (localProjectConfig) {
                ensureLocalConfigIgnored(projectRoot);
            }
            if (projectConfig) {
                projectConfigAnswers = await applyPresetSelections(
                    buildAnswersFromProjectConfig(projectConfig.selection, mainOverlaysConfig),
                    mainOverlaysConfig,
                    PRESETS_DIR
                );
            }
        }

        if (
            cliArgs?.commandName === 'regen' &&
            cliArgs.config.composeEnvFiles === true &&
            projectConfig?.file.path
        ) {
            projectFileOutputPath = projectConfig.file.path;
            existingProjectFileDetected = true;
        }

        let manifest: SuperpositionManifest | undefined;
        let manifestDir: string | undefined;
        let backupDir: string | undefined;
        let useManifestOnly = false;
        let useProjectOnly = false;

        if (cliArgs?.commandName === 'regen' && !cliArgs.manifestPath && !cliArgs.fromProject) {
            if (projectConfigAnswers) {
                useProjectOnly = true;
            } else {
                const discoveredManifestPath = findDefaultRegenManifest(
                    cliArgs?.config?.outputPath || './.devcontainer'
                );
                if (discoveredManifestPath) {
                    console.error(chalk.red('✗ Error: No project file found'));
                    console.error(
                        chalk.cyan(
                            '  Found superposition.json but no superposition.yml project file.'
                        )
                    );
                    console.error(
                        chalk.gray(
                            '  Run `cs migrate` to create a project file from your existing manifest, then run `regen` again.'
                        )
                    );
                } else {
                    console.error(chalk.red('✗ Error: No project file found'));
                    console.error(
                        chalk.gray(
                            '  Create .superposition.yml or superposition.yml in your repository root.'
                        )
                    );
                    console.error(
                        chalk.dim('  Or run `cs init` to create a new configuration interactively.')
                    );
                }
                process.exit(1);
            }
        }

        if (cliArgs?.commandName === 'regen' && cliArgs?.manifestPath) {
            console.warn(
                chalk.yellow(
                    '⚠️  --from-manifest is deprecated for regen. Run `cs migrate` to create a project file, then use `regen` without this flag.'
                )
            );
        }

        if (cliArgs?.manifestPath) {
            const manifestPath = findManifestFile(cliArgs.manifestPath);

            if (!manifestPath) {
                console.error(chalk.red('✗ Could not find manifest file'));
                console.error(chalk.red(`  Searched for: ${cliArgs.manifestPath}`));
                process.exit(1);
            }

            manifestDir = path.dirname(manifestPath);
            const loadedManifest = loadManifest(manifestPath);
            if (!loadedManifest) {
                process.exit(1);
            }
            manifest = loadedManifest;

            if (cliArgs.backupDir) {
                backupDir = cliArgs.backupDir;
            }
            if (cliArgs.noInteractive) {
                useManifestOnly = true;
            }
        }

        if (cliArgs?.fromProject) {
            if (!projectConfigAnswers || !projectConfig) {
                console.error(chalk.red('✗ Could not find project file'));
                console.error(chalk.red('  Searched for: .superposition.yml, superposition.yml'));
                process.exit(1);
            }
            useProjectOnly = cliArgs.noInteractive || cliArgs.commandName === 'regen';
        }

        const hasCliOverrides =
            cliArgs &&
            Object.keys(cliArgs.config).some(
                (key) =>
                    key !== 'outputPath' &&
                    key !== 'preset' &&
                    key !== 'presetChoices' &&
                    !(key === 'target' && cliArgs.config.target === 'local') &&
                    !(key === 'editor' && cliArgs.config.editor === 'vscode') &&
                    cliArgs.config[key as keyof typeof cliArgs.config] !== undefined
            );
        const hasAnyCliConfig =
            cliArgs &&
            Object.entries(cliArgs.config).some(
                ([key, value]) =>
                    value !== undefined &&
                    !(key === 'target' && value === 'local') &&
                    !(key === 'editor' && value === 'vscode')
            );

        if (
            cliArgs?.noInteractive &&
            !cliArgs?.manifestPath &&
            !projectConfigAnswers &&
            !globalInitDefaultsAnswers &&
            !hasAnyCliConfig
        ) {
            console.error(chalk.red('✗ Error: --no-interactive requires persisted input'));
            console.error(
                chalk.dim(
                    '  Use --from-project, provide explicit CLI selections, define ~/.container-superposition.yml, or run from a repository with .superposition.yml or superposition.yml'
                )
            );
            process.exit(1);
        }

        const sourceDescriptor = describeSource({
            projectFilePath: useProjectOnly || projectConfig ? projectConfig?.file.path : undefined,
            manifestPath: manifest ? (cliArgs?.manifestPath ?? manifestDir) : undefined,
            hasCliSelection: Boolean(cliArgs && Object.keys(cliArgs.config).length > 0),
        });
        const runPosture =
            cliArgs?.commandName === 'regen'
                ? sourceDescriptor.kind === 'manifest'
                    ? 'Legacy compatibility replay'
                    : 'Replay shared setup'
                : existingProjectFileDetected
                  ? 'Update shared setup'
                  : 'New setup';
        const localTrustPreview = resolveLocalConfigTrust({
            path: localProjectConfig ? 'superposition.local.yml' : null,
            appliedFields: localProjectConfig
                ? Object.keys(localProjectConfig.selection).filter((key) => key !== '$schema')
                : [],
            unsupportedFields: [],
            gitIgnoreSafe: true,
            trackedCleanupManual: false,
            ignored: !localProjectConfig,
        });
        const localConfigSummary = localProjectConfig
            ? `${localTrustPreview.disposition} — ${localTrustPreview.appliedFields.join(', ') || 'no local fields'}`
            : localTrustPreview.disposition;
        if (runPosture === 'Update shared setup' && projectConfigAnswers) {
            console.log(
                '\n' +
                    renderUpdateHeader({
                        sharedProjectFile: projectConfig?.file.fileName ?? '.superposition.yml',
                        generatedOutput:
                            cliArgs?.config?.outputPath ||
                            projectConfigAnswers?.outputPath ||
                            globalInitDefaultsAnswers?.outputPath ||
                            './.devcontainer',
                        localConfig: localConfigSummary,
                    })
            );
            console.log(
                '\n' +
                    renderSection(
                        'Current shared setup',
                        renderList(summarizeCurrentSetup(projectConfigAnswers))
                    )
            );
        } else {
            console.log(
                '\n' +
                    renderRunFraming({
                        mode: runPosture,
                        source: `${sourceDescriptor.label} — ${sourceDescriptor.detail}`,
                        sharedProjectFile:
                            projectConfig?.file.fileName ??
                            (existingProjectFileDetected
                                ? '.superposition.yml'
                                : 'will create on write'),
                        generatedOutput:
                            cliArgs?.config?.outputPath ||
                            projectConfigAnswers?.outputPath ||
                            globalInitDefaultsAnswers?.outputPath ||
                            './.devcontainer',
                        localConfig: localTrustPreview.disposition,
                    })
            );
            if (localProjectConfig) {
                console.log(
                    '\n' +
                        renderSection(
                            'Local-only config trust',
                            renderLocalConfigTrust(localTrustPreview)
                        )
                );
            }
        }

        const resolvedOutputPath =
            cliArgs?.config?.outputPath ||
            projectConfigAnswers?.outputPath ||
            globalInitDefaultsAnswers?.outputPath ||
            manifestDir ||
            './.devcontainer';
        const backupCheckPath = path.resolve(resolvedOutputPath);
        const inGitRepo = isInsideGitRepo(backupCheckPath);
        let shouldBackup: boolean;
        if (cliArgs?.backupOverride === true) {
            shouldBackup = true;
        } else if (cliArgs?.backupOverride === false) {
            shouldBackup = false;
        } else {
            shouldBackup = !inGitRepo;
            if (!shouldBackup) {
                console.log(
                    chalk.dim(
                        'ℹ  Skipping backup — git repo detected (use --backup to force one)\n'
                    )
                );
            }
        }

        const isReplayMode = cliArgs?.commandName === 'regen' || useManifestOnly || useProjectOnly;

        let actualBackupPath: string | undefined;

        let answers: ReturnType<typeof mergeAnswers>;

        if (useManifestOnly && manifest && !hasCliOverrides) {
            const manifestAnswers = buildAnswersFromManifest(
                manifest,
                mainOverlaysConfig,
                manifestDir
            );
            answers = mergeAnswers(manifestAnswers);
        } else if (useProjectOnly && projectConfigAnswers && !hasCliOverrides) {
            answers = mergeAnswers(projectConfigAnswers, {
                outputPath:
                    cliArgs?.config?.outputPath ||
                    projectConfigAnswers.outputPath ||
                    './.devcontainer',
                minimal: cliArgs?.config?.minimal,
                editor: cliArgs?.config?.editor,
            });
        } else if (
            (cliArgs && (cliArgs.config.stack || hasCliOverrides)) ||
            (projectConfigAnswers && (cliArgs?.noInteractive || hasAnyCliConfig)) ||
            (globalInitDefaultsAnswers && cliArgs?.noInteractive)
        ) {
            const cliAnswers = buildAnswersFromCliArgs(cliArgs.config);
            const seededCliAnswers = mergeInitDefaultsWithCliInputs(
                globalInitDefaultsAnswers ?? {},
                cliAnswers
            );
            const manifestAnswers = manifest
                ? buildAnswersFromManifest(manifest, mainOverlaysConfig, manifestDir)
                : undefined;
            answers = mergeAnswers(projectConfigAnswers, manifestAnswers, seededCliAnswers, {
                outputPath:
                    seededCliAnswers.outputPath ||
                    projectConfigAnswers?.outputPath ||
                    './.devcontainer',
            });

            if ((useManifestOnly || useProjectOnly) && hasCliOverrides) {
                const overrides: string[] = [];
                if (cliAnswers.minimal) overrides.push('minimal mode');
                if (cliAnswers.editor) overrides.push(`editor: ${cliAnswers.editor}`);
                if (overrides.length > 0) {
                    console.log(chalk.dim(`   Overrides: ${overrides.join(', ')}`));
                }
            }
        } else {
            const entryMode =
                cliArgs?.commandName === 'init'
                    ? existingProjectFileDetected
                        ? 'existing'
                        : 'new'
                    : 'other';

            if (
                entryMode === 'existing' &&
                projectConfigAnswers &&
                projectConfig &&
                hasNamedProjectOverlaySelections(projectConfig.selection)
            ) {
                console.log(
                    chalk.yellow(
                        '\n⚠️  Named multi-instance overlay selections are present in your project file.\n' +
                            '   Interactive init editing cannot safely round-trip overlays[] object entries yet.\n' +
                            '   No files were changed. Edit superposition.yml manually for named multi-instance overlay changes.\n'
                    )
                );
                return;
            }

            if (entryMode === 'existing' && projectConfigAnswers) {
                const shortcutResult = await runInitShortcutFlow({
                    projectConfigAnswers,
                    overlays: mainOverlaysConfig.overlays,
                    suppressInitialSummary: true,
                });
                if (shortcutResult.mode === 'preview-and-write') {
                    answers = mergeAnswers(projectConfigAnswers, shortcutResult.answers);
                } else {
                    const interactiveAnswers = await runQuestionnaire(
                        manifest,
                        manifestDir,
                        cliArgs?.config.preset || shortcutResult.answers.preset,
                        cliArgs?.config.presetChoices || shortcutResult.answers.presetChoices,
                        shortcutResult.answers
                    );
                    answers = mergeAnswers(shortcutResult.answers, interactiveAnswers);
                }
            } else if (entryMode === 'new') {
                const lane = (await select({
                    message: 'Choose setup path',
                    choices: buildInitEntryChoices(false),
                    default: 'fast-start',
                })) as string;
                const interactiveAnswers = await runQuestionnaire(
                    manifest,
                    manifestDir,
                    lane === 'custom-build' ? undefined : cliArgs?.config.preset,
                    cliArgs?.config.presetChoices,
                    globalInitDefaultsAnswers
                );
                answers = mergeAnswers(
                    globalInitDefaultsAnswers,
                    projectConfigAnswers,
                    interactiveAnswers
                );
            } else {
                const interactiveAnswers = await runQuestionnaire(
                    manifest,
                    manifestDir,
                    cliArgs?.config.preset || projectConfigAnswers?.preset,
                    cliArgs?.config.presetChoices || projectConfigAnswers?.presetChoices,
                    projectConfigAnswers
                );
                answers = mergeAnswers(projectConfigAnswers, interactiveAnswers);
            }
        }

        if (cliArgs?.commandName === 'init' && globalDefaults) {
            assertNoGlobalDefaultOverlayConflicts(
                answers as QuestionnaireAnswers,
                globalDefaults,
                mainOverlaysConfig.overlays
            );
        }

        const isManifestOnly = cliArgs?.writeManifestOnly === true || cliArgs?.noScaffold === true;
        const globalLocalConfigTemplate = globalDefaults?.selection.localConfigTemplate;
        const localTemplatePath = path.join(projectRoot, 'superposition.local.yml');
        const shouldScaffoldGlobalLocalTemplate =
            cliArgs?.commandName === 'init' &&
            !isManifestOnly &&
            !findLocalProjectConfig(projectRoot) &&
            !fs.existsSync(localTemplatePath);
        const materializedGlobalLocalConfigTemplate = shouldScaffoldGlobalLocalTemplate
            ? materializeGlobalLocalConfigTemplate(globalLocalConfigTemplate, answers.stack)
            : undefined;
        if (shouldScaffoldGlobalLocalTemplate) {
            validateMaterializedLocalConfigTemplate(
                materializedGlobalLocalConfigTemplate,
                answers.stack
            );
        }

        const sharedAnswersForProjectFile = answers;
        assertComposeNetworkNameSupported(
            sharedAnswersForProjectFile.stack,
            sharedAnswersForProjectFile.composeNetworkName
        );

        if (!manifest && projectConfig?.selection.customizations) {
            const materializedOutputPath = path.resolve(answers.outputPath);
            if (!fs.existsSync(materializedOutputPath)) {
                fs.mkdirSync(materializedOutputPath, { recursive: true });
            }
            writeProjectConfigCustomizations(
                materializedOutputPath,
                projectConfig.selection.customizations
            );
        }

        if (!manifest && !isManifestOnly && localProjectConfig) {
            answers = applyLocalConfigToAnswers(answers, localProjectConfig.selection);
            answers.customizations = materializeLocalCustomizationConfig(
                localProjectConfig.selection.customizations
            );
        } else {
            answers = { ...answers, customizations: undefined };
        }

        const intentSummary = [
            `stack: ${answers.stack}`,
            `languages: ${answers.language?.join(', ') || 'none'}`,
            `databases: ${answers.database?.join(', ') || 'none'}`,
            `observability: ${answers.observability?.join(', ') || 'none'}`,
            `cloud tools: ${answers.cloudTools?.join(', ') || 'none'}`,
            `playwright: ${answers.playwright ? 'yes' : 'no'}`,
        ];
        const willWrite = [
            projectFileOutputPath
                ? `shared project file: ${path.relative(process.cwd(), projectFileOutputPath)}`
                : 'shared project file: unchanged',
            isManifestOnly
                ? 'generated output: compatibility manifest only'
                : `generated output: ${answers.outputPath}`,
        ];
        const willPreserve = [
            'custom/ patches when present',
            localProjectConfig ? 'local-only config enrichments' : 'untouched workspace files',
        ];
        const manualFollowUp = localProjectConfig
            ? ['tracked-file cleanup remains manual when generated files are already committed']
            : [];
        console.log(
            '\n' +
                renderPreflight({
                    source: `${sourceDescriptor.label} — ${sourceDescriptor.detail}`,
                    intent: intentSummary,
                    willWrite,
                    willPreserve,
                    manualFollowUp,
                    backupPlan: `${shouldBackup ? 'create' : 'skip'} — ${shouldBackup ? 'replay path may overwrite generated output' : 'git repo detected or backup disabled'}`,
                })
        );

        if (shouldBackup && isReplayMode) {
            const outputPath = resolvedOutputPath;
            const backupPath = await createBackup(outputPath, backupDir);
            if (backupPath) {
                actualBackupPath = backupPath;
                console.log(chalk.green(`✓ Backup created: ${backupPath}\n`));
                ensureBackupPatternsInGitignore(outputPath);
            }
        }

        if (projectFileOutputPath) {
            try {
                const projectSelection = buildProjectConfigSelectionFromAnswers(
                    sharedAnswersForProjectFile
                );
                writeProjectConfig(projectFileOutputPath, projectSelection);
                console.log(
                    chalk.green(
                        `✓ Project config written: ${path.relative(process.cwd(), projectFileOutputPath)}`
                    )
                );
            } catch (projectFileError) {
                console.error(
                    chalk.yellow(
                        `⚠ Failed to write project config: ${projectFileError instanceof Error ? projectFileError.message : String(projectFileError)}`
                    )
                );
            }
        }

        const beforeGeneratedOutputHash = isManifestOnly
            ? null
            : hashPathState(path.resolve(answers.outputPath));
        const spinner = ora({
            text: isManifestOnly
                ? chalk.cyan('Generating manifest file...')
                : chalk.cyan('Generating devcontainer configuration...'),
            color: 'cyan',
        }).start();

        try {
            let summary;
            if (isManifestOnly) {
                summary = await generateManifestOnly(answers, undefined, {
                    isRegen: isReplayMode,
                });
                spinner.succeed(chalk.green('Manifest created successfully!'));
            } else {
                summary = await composeDevContainer(answers, undefined, {
                    isRegen: isReplayMode,
                    manifestAnswers: sharedAnswersForProjectFile,
                });
                spinner.succeed(chalk.green('DevContainer created successfully!'));
            }

            if (actualBackupPath) {
                summary.backupPath = actualBackupPath;
            }

            let createdLocalTemplate = false;
            if (
                shouldScaffoldGlobalLocalTemplate &&
                hasMeaningfulLocalProjectConfig(materializedGlobalLocalConfigTemplate)
            ) {
                writeLocalProjectConfig(localTemplatePath, materializedGlobalLocalConfigTemplate!);
                ensureLocalConfigIgnored(projectRoot);
                createdLocalTemplate = true;
                console.log(chalk.green('✓ Local config created: superposition.local.yml'));
            }

            printSummary(summary, true);
            const afterGeneratedOutputHash = isManifestOnly
                ? null
                : hashPathState(path.resolve(answers.outputPath));
            const generatedOutputChanged = beforeGeneratedOutputHash !== afterGeneratedOutputHash;
            const changed = [
                ...(projectFileOutputPath
                    ? [
                          existingProjectFileDetected
                              ? 'shared project file updated'
                              : 'shared project file created',
                      ]
                    : []),
                ...(isManifestOnly
                    ? ['compatibility manifest written']
                    : generatedOutputChanged
                      ? ['generated output written']
                      : []),
                ...(createdLocalTemplate ? ['local-only config template created'] : []),
                ...(actualBackupPath ? [`backup created: ${actualBackupPath}`] : []),
            ];
            const preserved = [
                'custom/ patches when present',
                localProjectConfig
                    ? 'local-only config file unchanged'
                    : createdLocalTemplate
                      ? 'local-only config now lives in repository root'
                      : 'local-only config not used',
            ];
            const nextStepModel = resolveNextStep({
                command: cliArgs?.commandName === 'regen' ? 'regen' : 'init',
                changeClass: generatedOutputChanged
                    ? 'Change intent and regenerate'
                    : 'No material change',
                hasWarnings: summary.warnings.length > 0,
            });
            const nextStep = nextStepModel.command
                ? `${nextStepModel.command}\n${nextStepModel.reason}`
                : null;
            const manualReview = localProjectConfig
                ? ['review generated diff for local-only settings before commit']
                : [];
            console.log('\n' + renderRunSuccess({ changed, preserved, nextStep, manualReview }));
        } catch (error) {
            spinner.fail(
                chalk.red(
                    isManifestOnly ? 'Failed to create manifest' : 'Failed to create devcontainer'
                )
            );
            throw error;
        }
    } catch (error) {
        console.error(
            '\n' +
                boxen(
                    chalk.bold.red('Error\n\n') +
                        chalk.white(error instanceof Error ? error.message : String(error)),
                    { padding: 1, borderColor: 'red', borderStyle: 'round' }
                )
        );
        process.exit(1);
    }
}
