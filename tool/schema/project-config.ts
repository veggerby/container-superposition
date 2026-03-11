import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import type {
    BaseImage,
    CloudTool,
    CustomizationConfig,
    DatabaseOverlay,
    DeploymentTarget,
    DevTool,
    EditorProfile,
    LanguageOverlay,
    OverlayMetadata,
    ObservabilityTool,
    OverlaysConfig,
    ProjectConfigCustomizationsInput,
    ProjectConfigFileEntry,
    ProjectConfigSelection,
    QuestionnaireAnswers,
    Stack,
} from './types.js';

export const PROJECT_CONFIG_FILENAMES = ['.superposition.yml', 'superposition.yml'] as const;
const DEVCONTAINER_SCHEMA_URL =
    'https://raw.githubusercontent.com/devcontainers/spec/main/schemas/devContainer.base.schema.json';

type ProjectConfigFileName = (typeof PROJECT_CONFIG_FILENAMES)[number];

const STACK_VALUES: Stack[] = ['plain', 'compose'];
const BASE_IMAGE_VALUES: BaseImage[] = ['bookworm', 'trixie', 'alpine', 'ubuntu', 'custom'];
const TARGET_VALUES: DeploymentTarget[] = ['local', 'codespaces', 'gitpod', 'devpod'];
const EDITOR_VALUES: EditorProfile[] = ['vscode', 'jetbrains', 'none'];

class ProjectConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ProjectConfigError';
    }
}

export interface LoadedProjectConfig {
    file: ProjectConfigFileEntry;
    selection: ProjectConfigSelection;
}

function expectPlainObject(value: unknown, fieldName: string): Record<string, any> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new ProjectConfigError(`${fieldName} must be a YAML object`);
    }

    return value as Record<string, any>;
}

function expectString(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim() === '') {
        throw new ProjectConfigError(`${fieldName} must be a non-empty string`);
    }

    return value;
}

function expectOptionalString(value: unknown, fieldName: string): string | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    return expectString(value, fieldName);
}

function expectBoolean(value: unknown, fieldName: string): boolean {
    if (typeof value !== 'boolean') {
        throw new ProjectConfigError(`${fieldName} must be a boolean`);
    }

    return value;
}

function expectOptionalBoolean(value: unknown, fieldName: string): boolean | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    return expectBoolean(value, fieldName);
}

function expectOptionalNumber(value: unknown, fieldName: string): number | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new ProjectConfigError(`${fieldName} must be a number`);
    }

    return value;
}

function expectOptionalNonNegativeInteger(value: unknown, fieldName: string): number | undefined {
    const num = expectOptionalNumber(value, fieldName);
    if (num === undefined) {
        return undefined;
    }

    if (!Number.isInteger(num) || num < 0) {
        throw new ProjectConfigError(`${fieldName} must be a non-negative integer`);
    }

    return num;
}

function expectEnum<T extends string>(value: unknown, fieldName: string, allowed: readonly T[]): T {
    if (typeof value !== 'string' || !allowed.includes(value as T)) {
        throw new ProjectConfigError(`${fieldName} must be one of: ${allowed.join(', ')}`);
    }

    return value as T;
}

function expectOptionalEnum<T extends string>(
    value: unknown,
    fieldName: string,
    allowed: readonly T[]
): T | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    return expectEnum(value, fieldName, allowed);
}

function buildCategoryLookup(overlaysConfig: OverlaysConfig) {
    const overlayById = new Map<string, OverlayMetadata>(
        overlaysConfig.overlays.map((o) => [o.id, o])
    );

    return {
        language: (value: string) => overlayById.get(value)?.category === 'language',
        database: (value: string) => overlayById.get(value)?.category === 'database',
        observability: (value: string) => overlayById.get(value)?.category === 'observability',
        cloudTools: (value: string) => overlayById.get(value)?.category === 'cloud',
        devTools: (value: string) => overlayById.get(value)?.category === 'dev',
    };
}

function expectOverlayArray<T extends string>(
    value: unknown,
    fieldName: string,
    isValid: (entry: string) => boolean
): T[] | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (!Array.isArray(value)) {
        throw new ProjectConfigError(`${fieldName} must be an array`);
    }

    const parsed = value.map((entry, index) => expectString(entry, `${fieldName}[${index}]`));
    const invalid = parsed.filter((entry) => !isValid(entry));
    if (invalid.length > 0) {
        throw new ProjectConfigError(
            `${fieldName} contains unsupported entries: ${invalid.join(', ')}`
        );
    }

    return parsed as T[];
}

function parsePresetChoices(value: unknown): Record<string, string> | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    const record = expectPlainObject(value, 'presetChoices');
    const parsed: Record<string, string> = {};

    for (const [key, entry] of Object.entries(record)) {
        parsed[key] = expectString(entry, `presetChoices.${key}`);
    }

    return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function parseScripts(value: unknown): ProjectConfigCustomizationsInput['scripts'] | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    const record = expectPlainObject(value, 'customizations.scripts');
    const parseArray = (entry: unknown, fieldName: string) => {
        if (entry === undefined || entry === null) {
            return undefined;
        }

        if (!Array.isArray(entry)) {
            throw new ProjectConfigError(`${fieldName} must be an array of shell commands`);
        }

        return entry.map((line, index) => expectString(line, `${fieldName}[${index}]`));
    };

    const postCreate = parseArray(record.postCreate, 'customizations.scripts.postCreate');
    const postStart = parseArray(record.postStart, 'customizations.scripts.postStart');

    const hasPostCreate = Array.isArray(postCreate) && postCreate.length > 0;
    const hasPostStart = Array.isArray(postStart) && postStart.length > 0;

    if (!hasPostCreate && !hasPostStart) {
        return undefined;
    }

    return {
        postCreate: hasPostCreate ? postCreate : undefined,
        postStart: hasPostStart ? postStart : undefined,
    };
}

function parseFiles(value: unknown): ProjectConfigCustomizationsInput['files'] | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (!Array.isArray(value)) {
        throw new ProjectConfigError('customizations.files must be an array');
    }

    return value.map((entry, index) => {
        const record = expectPlainObject(entry, `customizations.files[${index}]`);
        return {
            path: expectString(record.path, `customizations.files[${index}].path`),
            content: expectString(record.content, `customizations.files[${index}].content`),
        };
    });
}

function parseEnvironment(value: unknown): Record<string, string> | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    const record = expectPlainObject(value, 'customizations.environment');
    const parsed: Record<string, string> = {};
    for (const [key, entry] of Object.entries(record)) {
        parsed[key] = expectString(entry, `customizations.environment.${key}`);
    }

    return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function parseCustomizations(value: unknown): ProjectConfigCustomizationsInput | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    const record = expectPlainObject(value, 'customizations');

    const customizations: ProjectConfigCustomizationsInput = {
        devcontainerPatch:
            record.devcontainerPatch !== undefined
                ? expectPlainObject(record.devcontainerPatch, 'customizations.devcontainerPatch')
                : undefined,
        dockerComposePatch:
            record.dockerComposePatch !== undefined
                ? expectPlainObject(record.dockerComposePatch, 'customizations.dockerComposePatch')
                : undefined,
        environment: parseEnvironment(record.environment),
        scripts: parseScripts(record.scripts),
        files: parseFiles(record.files),
    };

    const hasValues = Object.values(customizations).some(
        (entry) =>
            entry !== undefined &&
            (!Array.isArray(entry) || entry.length > 0) &&
            (!(typeof entry === 'object' && !Array.isArray(entry)) || Object.keys(entry).length > 0)
    );

    return hasValues ? customizations : undefined;
}

export function findProjectConfig(repoRoot: string = process.cwd()): ProjectConfigFileEntry[] {
    return PROJECT_CONFIG_FILENAMES.map((fileName) => ({
        fileName,
        path: path.join(repoRoot, fileName),
    })).filter((entry) => fs.existsSync(entry.path));
}

export function loadProjectConfig(
    overlaysConfig: OverlaysConfig,
    repoRoot: string = process.cwd()
): LoadedProjectConfig | null {
    const discovered = findProjectConfig(repoRoot);

    if (discovered.length === 0) {
        return null;
    }

    if (discovered.length > 1) {
        throw new ProjectConfigError(
            `Found both ${PROJECT_CONFIG_FILENAMES.join(' and ')} in ${repoRoot}. Keep only one project config file.`
        );
    }

    const [file] = discovered;
    let parsed: unknown;
    try {
        parsed = yaml.load(fs.readFileSync(file.path, 'utf8'));
    } catch (error) {
        throw new ProjectConfigError(
            `Failed to parse ${file.fileName}: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    const document = expectPlainObject(parsed, file.fileName);
    const supportedKeys = new Set([
        'stack',
        'baseImage',
        'customImage',
        'containerName',
        'preset',
        'presetChoices',
        'language',
        'database',
        'observability',
        'cloudTools',
        'devTools',
        'playwright',
        'outputPath',
        'portOffset',
        'target',
        'minimal',
        'editor',
        'customizations',
    ]);

    const unsupportedKeys = Object.keys(document).filter((key) => !supportedKeys.has(key));
    if (unsupportedKeys.length > 0) {
        throw new ProjectConfigError(
            `Unsupported project config keys: ${unsupportedKeys.join(', ')}`
        );
    }

    const lookup = buildCategoryLookup(overlaysConfig);
    const selection: ProjectConfigSelection = {
        stack: expectOptionalEnum(document.stack, 'stack', STACK_VALUES),
        baseImage: expectOptionalEnum(document.baseImage, 'baseImage', BASE_IMAGE_VALUES),
        customImage: expectOptionalString(document.customImage, 'customImage'),
        containerName: expectOptionalString(document.containerName, 'containerName'),
        preset: expectOptionalString(document.preset, 'preset'),
        presetChoices: parsePresetChoices(document.presetChoices),
        language: expectOverlayArray<LanguageOverlay>(
            document.language,
            'language',
            lookup.language
        ),
        database: expectOverlayArray<DatabaseOverlay>(
            document.database,
            'database',
            lookup.database
        ),
        observability: expectOverlayArray<ObservabilityTool>(
            document.observability,
            'observability',
            lookup.observability
        ),
        cloudTools: expectOverlayArray<CloudTool>(
            document.cloudTools,
            'cloudTools',
            lookup.cloudTools
        ),
        devTools: expectOverlayArray<DevTool>(document.devTools, 'devTools', lookup.devTools),
        playwright: expectOptionalBoolean(document.playwright, 'playwright'),
        outputPath: expectOptionalString(document.outputPath, 'outputPath'),
        portOffset: expectOptionalNonNegativeInteger(document.portOffset, 'portOffset'),
        target: expectOptionalEnum(document.target, 'target', TARGET_VALUES),
        minimal: expectOptionalBoolean(document.minimal, 'minimal'),
        editor: expectOptionalEnum(document.editor, 'editor', EDITOR_VALUES),
        customizations: parseCustomizations(document.customizations),
    };

    if (selection.baseImage === 'custom' && !selection.customImage) {
        throw new ProjectConfigError('customImage is required when baseImage is set to custom');
    }

    if (selection.customImage && selection.baseImage && selection.baseImage !== 'custom') {
        throw new ProjectConfigError(
            'customImage may only be used when baseImage is set to custom'
        );
    }

    if (selection.presetChoices && !selection.preset) {
        throw new ProjectConfigError('presetChoices requires preset to be set');
    }

    return { file, selection };
}

export function buildAnswersFromProjectConfig(
    selection: ProjectConfigSelection
): Partial<QuestionnaireAnswers> {
    return {
        stack: selection.stack,
        baseImage: selection.baseImage,
        customImage: selection.customImage,
        containerName: selection.containerName,
        preset: selection.preset,
        presetChoices: selection.presetChoices,
        language: selection.language,
        database: selection.database,
        observability: selection.observability,
        cloudTools: selection.cloudTools,
        devTools: selection.devTools,
        playwright: selection.playwright,
        outputPath: selection.outputPath,
        portOffset: selection.portOffset,
        target: selection.target,
        minimal: selection.minimal,
        editor: selection.editor,
        customizations: selection.customizations
            ? materializeCustomizationConfig(selection.customizations)
            : undefined,
    };
}

function materializeCustomizationConfig(
    input: ProjectConfigCustomizationsInput
): CustomizationConfig {
    return {
        devcontainerPatch: input.devcontainerPatch,
        dockerComposePatch: input.dockerComposePatch,
        environmentVars: input.environment,
        scripts: input.scripts,
        files: input.files?.map((entry) => ({
            source: entry.path,
            destination: entry.path,
        })),
    };
}

function ensureDirectory(targetPath: string): void {
    fs.mkdirSync(targetPath, { recursive: true });
}

function withSchemaFirst(
    document: Record<string, any>,
    fallbackSchema?: string
): Record<string, any> {
    const { $schema, ...rest } = document;
    if (typeof $schema === 'string' && $schema.trim() !== '') {
        return { $schema, ...rest };
    }
    if (fallbackSchema) {
        return { $schema: fallbackSchema, ...rest };
    }
    return rest;
}

export function writeProjectConfigCustomizations(
    outputPath: string,
    customizations?: ProjectConfigCustomizationsInput
): void {
    if (!customizations) {
        return;
    }

    const customDir = path.join(outputPath, 'custom');
    ensureDirectory(customDir);

    if (customizations.devcontainerPatch) {
        const devcontainerPatch = withSchemaFirst(
            customizations.devcontainerPatch,
            DEVCONTAINER_SCHEMA_URL
        );
        fs.writeFileSync(
            path.join(customDir, 'devcontainer.patch.json'),
            JSON.stringify(devcontainerPatch, null, 2) + '\n'
        );
    }

    if (customizations.dockerComposePatch) {
        fs.writeFileSync(
            path.join(customDir, 'docker-compose.patch.yml'),
            yaml.dump(customizations.dockerComposePatch)
        );
    }

    if (customizations.environment && Object.keys(customizations.environment).length > 0) {
        const content =
            Object.entries(customizations.environment)
                .map(([key, value]) => `${key}=${value}`)
                .join('\n') + '\n';
        fs.writeFileSync(path.join(customDir, 'environment.env'), content);
    }

    if (customizations.scripts?.postCreate?.length || customizations.scripts?.postStart?.length) {
        const scriptsDir = path.join(customDir, 'scripts');
        ensureDirectory(scriptsDir);

        if (customizations.scripts.postCreate?.length) {
            fs.writeFileSync(
                path.join(scriptsDir, 'post-create.sh'),
                '#!/usr/bin/env bash\nset -e\n' +
                    customizations.scripts.postCreate.join('\n') +
                    '\n'
            );
        }

        if (customizations.scripts.postStart?.length) {
            fs.writeFileSync(
                path.join(scriptsDir, 'post-start.sh'),
                '#!/usr/bin/env bash\nset -e\n' + customizations.scripts.postStart.join('\n') + '\n'
            );
        }
    }

    if (customizations.files?.length) {
        const filesDir = path.join(customDir, 'files');
        ensureDirectory(filesDir);

        for (const entry of customizations.files) {
            const resolvedPath = path.resolve(filesDir, entry.path);
            const relative = path.relative(filesDir, resolvedPath);
            if (relative.startsWith('..') || path.isAbsolute(relative)) {
                throw new ProjectConfigError(
                    `Invalid custom file path "${entry.path}". Paths must be within the "custom/files" directory.`
                );
            }
            ensureDirectory(path.dirname(resolvedPath));
            fs.writeFileSync(resolvedPath, entry.content);
        }
    }
}

export { ProjectConfigError };
