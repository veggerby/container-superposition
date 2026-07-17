import * as fs from 'fs';
import * as os from 'os';
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
    OverlayId,
    OverlayMetadata,
    ObservabilityTool,
    OverlaysConfig,
    ProjectEnvTarget,
    ProjectMount,
    ProjectMountTarget,
    ProjectShellConfig,
    ProjectConfigCustomizationsInput,
    ProjectConfigFileEntry,
    ProjectPort,
    ProjectPortAutoForwardAction,
    ProjectConfigSelection,
    ProjectOverlayEntry,
    NamedOverlaySelectionEntry,
    NormalizedOverlaySelection,
    QuestionnaireAnswers,
    Stack,
    SuperpositionManifest,
} from './types.js';
import {
    assertComposeNetworkNameSupported,
    validateComposeNetworkName,
} from '../utils/compose-network.js';

export const PROJECT_CONFIG_FILENAMES = ['.superposition.yml', 'superposition.yml'] as const;
export const LOCAL_PROJECT_CONFIG_FILENAME = 'superposition.local.yml' as const;
export const IGNORED_LOCAL_PROJECT_CONFIG_FILENAME = '.superposition.local.yml' as const;
export const GLOBAL_DEFAULTS_FILENAMES = [
    '.container-superposition.yml',
    '.superposition.yml',
] as const;
export const GLOBAL_DEFAULTS_FILENAME = GLOBAL_DEFAULTS_FILENAMES[0];
const DEVCONTAINER_SCHEMA_URL =
    'https://raw.githubusercontent.com/devcontainers/spec/main/schemas/devContainer.base.schema.json';
export const SUPERPOSITION_SCHEMA_URL =
    'https://raw.githubusercontent.com/veggerby/container-superposition/main/tool/schema/superposition.schema.json';
export const SUPERPOSITION_LOCAL_SCHEMA_URL =
    'https://raw.githubusercontent.com/veggerby/container-superposition/main/tool/schema/superposition.local.schema.json';
export const SUPERPOSITION_GLOBAL_SCHEMA_URL =
    'https://raw.githubusercontent.com/veggerby/container-superposition/main/tool/schema/superposition.global.schema.json';

type ProjectConfigFileName = (typeof PROJECT_CONFIG_FILENAMES)[number];

export interface LocalProjectConfigSelection {
    $schema?: string;
    env?: ProjectConfigSelection['env'];
    mounts?: ProjectConfigSelection['mounts'];
    shell?: ProjectConfigSelection['shell'];
    customizations?: ProjectConfigSelection['customizations'];
    portOffset?: number;
    ports?: ProjectConfigSelection['ports'];
}

export interface LoadedLocalProjectConfig {
    file: ProjectConfigFileEntry;
    selection: LocalProjectConfigSelection;
}

export interface GlobalInitDefaultsSelection {
    stack?: ProjectConfigSelection['stack'];
    baseImage?: ProjectConfigSelection['baseImage'];
    customImage?: ProjectConfigSelection['customImage'];
    editor?: ProjectConfigSelection['editor'];
    target?: ProjectConfigSelection['target'];
    outputPath?: ProjectConfigSelection['outputPath'];
    minimal?: ProjectConfigSelection['minimal'];
    composeEnvFiles?: ProjectConfigSelection['composeEnvFiles'];
    devcontainerGitignore?: ProjectConfigSelection['devcontainerGitignore'];
    overlays?: OverlayId[];
}

export interface StackAwareLocalProjectConfigTemplateSelection {
    common?: LocalProjectConfigSelection;
    plain?: LocalProjectConfigSelection;
    compose?: LocalProjectConfigSelection;
}

export type GlobalLocalConfigTemplateSelection =
    | LocalProjectConfigSelection
    | StackAwareLocalProjectConfigTemplateSelection;

export interface GlobalDefaultsSelection {
    $schema?: string;
    initDefaults?: GlobalInitDefaultsSelection;
    localConfigTemplate?: GlobalLocalConfigTemplateSelection;
}

export interface LoadedGlobalDefaults {
    path: string;
    ignoredPath?: string;
    selection: GlobalDefaultsSelection;
}

export interface ResolvedGlobalDefaultsPath {
    path: string;
    ignoredPath?: string;
}

export const STACK_VALUES: Stack[] = ['plain', 'compose'];
export const BASE_IMAGE_VALUES: BaseImage[] = ['bookworm', 'trixie', 'alpine', 'ubuntu', 'custom'];
export const TARGET_VALUES: DeploymentTarget[] = ['local', 'codespaces', 'gitpod', 'devpod'];
export const EDITOR_VALUES: EditorProfile[] = ['vscode', 'jetbrains', 'none'];
export const PROJECT_ENV_TARGET_VALUES: ProjectEnvTarget[] = ['auto', 'remoteEnv', 'composeEnv'];
export const PROJECT_PORT_AUTO_FORWARD_VALUES: ProjectPortAutoForwardAction[] = [
    'notify',
    'openBrowser',
    'openPreview',
    'silent',
    'ignore',
];
export const PROJECT_MOUNT_TARGET_VALUES: ProjectMountTarget[] = [
    'auto',
    'devcontainerMount',
    'composeVolume',
];

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
        overlayById,
        language: (value: string) => overlayById.get(value)?.category === 'language',
        database: (value: string) => {
            const cat = overlayById.get(value)?.category;
            return cat === 'database' || cat === 'messaging';
        },
        observability: (value: string) => overlayById.get(value)?.category === 'observability',
        cloudTools: (value: string) => overlayById.get(value)?.category === 'cloud',
        devTools: (value: string) => overlayById.get(value)?.category === 'dev',
        isKnownOverlay: (value: string) =>
            overlayById.has(value) && overlayById.get(value)?.category !== 'preset',
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

const NAMED_OVERLAY_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function hasReservedCsKey(key: string): boolean {
    return key === 'CS_' || key.startsWith('CS_');
}

function parseNamedOverlaySelectionEntry(
    entry: unknown,
    fieldName: string,
    lookup: ReturnType<typeof buildCategoryLookup>
): NamedOverlaySelectionEntry {
    const record = expectPlainObject(entry, fieldName);
    const supportedKeys = new Set(['overlay', 'name', 'parameters']);
    const unsupportedKeys = Object.keys(record).filter((key) => !supportedKeys.has(key));
    if (unsupportedKeys.length > 0) {
        throw new ProjectConfigError(
            `${fieldName} contains unsupported keys: ${unsupportedKeys.join(', ')}`
        );
    }

    const overlayId = expectString(record.overlay, `${fieldName}.overlay`);
    if (!lookup.isKnownOverlay(overlayId)) {
        throw new ProjectConfigError(
            `${fieldName}.overlay contains unsupported entry: ${overlayId}`
        );
    }

    const name = expectString(record.name, `${fieldName}.name`);
    if (!NAMED_OVERLAY_NAME_PATTERN.test(name)) {
        throw new ProjectConfigError(
            `${fieldName}.name must match ${NAMED_OVERLAY_NAME_PATTERN.source}`
        );
    }

    const parameters =
        record.parameters === undefined ? undefined : parseParameters(record.parameters);
    if (parameters) {
        for (const key of Object.keys(parameters)) {
            if (hasReservedCsKey(key)) {
                throw new ProjectConfigError(
                    `${fieldName}.parameters.${key} is reserved. Keys equal to or prefixed with CS_ are not allowed.`
                );
            }
        }
    }

    return {
        overlay: overlayId as OverlayId,
        name,
        parameters,
    };
}

function parseProjectOverlayEntries(
    value: unknown,
    lookup: ReturnType<typeof buildCategoryLookup>
): ProjectOverlayEntry[] | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (!Array.isArray(value)) {
        throw new ProjectConfigError('overlays must be an array');
    }

    const parsed = value.map((entry, index): ProjectOverlayEntry => {
        if (typeof entry === 'string') {
            const overlayId = expectString(entry, `overlays[${index}]`);
            if (!lookup.isKnownOverlay(overlayId)) {
                throw new ProjectConfigError(`overlays contains unsupported entries: ${overlayId}`);
            }
            return overlayId as OverlayId;
        }

        return parseNamedOverlaySelectionEntry(entry, `overlays[${index}]`, lookup);
    });

    return parsed.length > 0 ? parsed : undefined;
}

function normalizeProjectOverlaySelections(
    overlays: ProjectOverlayEntry[] | undefined,
    document: Record<string, any>,
    lookup: ReturnType<typeof buildCategoryLookup>
): NormalizedOverlaySelection[] | undefined {
    const selections: NormalizedOverlaySelection[] = [];
    const flat = overlays ?? [];
    const hasNamedEntries = flat.some((entry) => typeof entry !== 'string');

    for (const entry of flat) {
        if (typeof entry === 'string') {
            selections.push({ kind: 'singleton', overlayId: entry, source: 'overlays' });
        } else {
            selections.push({
                kind: 'named',
                overlayId: entry.overlay,
                instanceName: entry.name,
                parameters: entry.parameters,
                source: 'overlays',
            });
        }
    }

    const categoryEntries: Array<{ field: string; values: OverlayId[] | undefined }> = [
        {
            field: 'language',
            values: expectOverlayArray<string>(document.language, 'language', lookup.language) as
                | OverlayId[]
                | undefined,
        },
        {
            field: 'database',
            values: expectOverlayArray<string>(document.database, 'database', lookup.database) as
                | OverlayId[]
                | undefined,
        },
        {
            field: 'observability',
            values: expectOverlayArray<string>(
                document.observability,
                'observability',
                lookup.observability
            ) as OverlayId[] | undefined,
        },
        {
            field: 'cloudTools',
            values: expectOverlayArray<string>(
                document.cloudTools,
                'cloudTools',
                lookup.cloudTools
            ) as OverlayId[] | undefined,
        },
        {
            field: 'devTools',
            values: expectOverlayArray<string>(document.devTools, 'devTools', lookup.devTools) as
                | OverlayId[]
                | undefined,
        },
    ];

    const playwright = expectOptionalBoolean(document.playwright, 'playwright');
    if (playwright) {
        categoryEntries.push({ field: 'playwright', values: ['playwright' as OverlayId] });
    }

    const hasCategorySelections = categoryEntries.some((entry) => (entry.values?.length ?? 0) > 0);
    if (hasNamedEntries && hasCategorySelections) {
        throw new ProjectConfigError(
            'Named overlay entries require the unified overlays: surface only. Remove category fields such as language, database, cloudTools, devTools, observability, or playwright.'
        );
    }

    for (const { values } of categoryEntries) {
        for (const overlayId of values ?? []) {
            selections.push({ kind: 'singleton', overlayId, source: 'category' });
        }
    }

    if (selections.length === 0) {
        return undefined;
    }

    const seenSingletons = new Set<string>();
    const namedByFamily = new Map<string, Set<string>>();
    const hasStringFamily = new Set<string>();
    const hasNamedFamily = new Set<string>();

    for (const selection of selections) {
        if (selection.kind === 'singleton') {
            if (selection.source === 'overlays') {
                if (seenSingletons.has(selection.overlayId)) {
                    throw new ProjectConfigError(
                        `Overlay '${selection.overlayId}' is selected more than once via legacy string entries. Use a named object entry on a repeatable overlay instead.`
                    );
                }
                seenSingletons.add(selection.overlayId);
                hasStringFamily.add(selection.overlayId);
            }
            continue;
        }

        hasNamedFamily.add(selection.overlayId);
        const names = namedByFamily.get(selection.overlayId) ?? new Set<string>();
        if (names.has(selection.instanceName)) {
            throw new ProjectConfigError(
                `Overlay '${selection.overlayId}' repeats the named instance '${selection.instanceName}'. Instance names must be unique within an overlay family.`
            );
        }
        names.add(selection.instanceName);
        namedByFamily.set(selection.overlayId, names);
    }

    const mixedFamilies = [...hasNamedFamily].filter((overlayId) => hasStringFamily.has(overlayId));
    if (mixedFamilies.length > 0) {
        throw new ProjectConfigError(
            `Overlay families cannot mix legacy string and named object selection in the same project: ${mixedFamilies.join(', ')}`
        );
    }

    return selections;
}

function projectOverlayEntriesFromSelections(
    selections: NormalizedOverlaySelection[] | undefined,
    options: { includeCategorySelections?: boolean } = {}
): ProjectOverlayEntry[] | undefined {
    if (!selections?.length) {
        return undefined;
    }

    const entries = selections.flatMap((selection): ProjectOverlayEntry[] => {
        if (selection.source === 'category' && options.includeCategorySelections !== true) {
            return [];
        }
        if (selection.kind === 'singleton') {
            return [selection.overlayId];
        }
        return [
            {
                overlay: selection.overlayId,
                name: selection.instanceName,
                parameters: selection.parameters,
            },
        ];
    });

    return entries.length > 0 ? entries : undefined;
}

function explicitOverlayIdsFromSelections(
    selections: NormalizedOverlaySelection[] | undefined
): OverlayId[] | undefined {
    if (!selections?.length) {
        return undefined;
    }

    return [...new Set(selections.map((selection) => selection.overlayId))] as OverlayId[];
}

export function getOverlayIdsFromProjectSelection(
    selection: ProjectConfigSelection,
    overlaysConfig: OverlaysConfig
): OverlayId[] {
    const lookup = buildCategoryLookup(overlaysConfig);
    return (
        explicitOverlayIdsFromSelections(
            normalizeProjectOverlaySelections(selection.overlays, {}, lookup)
        ) ?? []
    );
}

export function hasNamedProjectOverlaySelections(selection: ProjectConfigSelection): boolean {
    return (selection.overlays ?? []).some((entry) => typeof entry !== 'string');
}

/**
 * Distribute a flat overlay list into the category arrays expected by
 * QuestionnaireAnswers. This is the only place where category knowledge matters.
 */
function distributeOverlaysToAnswers(
    overlays: OverlayId[] | undefined,
    overlaysConfig: OverlaysConfig
): Pick<
    Partial<QuestionnaireAnswers>,
    'language' | 'database' | 'observability' | 'cloudTools' | 'devTools' | 'playwright'
> {
    if (!overlays?.length) return {};

    const overlayById = new Map<string, OverlayMetadata>(
        overlaysConfig.overlays.map((o) => [o.id, o])
    );

    const language: LanguageOverlay[] = [];
    const database: DatabaseOverlay[] = [];
    const observability: ObservabilityTool[] = [];
    const cloudTools: CloudTool[] = [];
    const devTools: DevTool[] = [];
    let playwright = false;

    for (const id of overlays) {
        if (id === 'playwright') {
            playwright = true;
            continue;
        }
        const meta = overlayById.get(id);
        if (!meta) continue;
        switch (meta.category) {
            case 'language':
                language.push(id as LanguageOverlay);
                break;
            case 'database':
            case 'messaging':
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

    return {
        language: language.length > 0 ? language : undefined,
        database: database.length > 0 ? database : undefined,
        observability: observability.length > 0 ? observability : undefined,
        cloudTools: cloudTools.length > 0 ? cloudTools : undefined,
        devTools: devTools.length > 0 ? devTools : undefined,
        playwright,
    };
}

function validateNormalizedOverlaySelections(
    selections: NormalizedOverlaySelection[] | undefined,
    selection: Pick<ProjectConfigSelection, 'stack' | 'parameters'>,
    lookup: ReturnType<typeof buildCategoryLookup>
): void {
    if (!selections?.length) {
        return;
    }

    for (const key of Object.keys(selection.parameters ?? {})) {
        if (hasReservedCsKey(key)) {
            throw new ProjectConfigError(
                `parameters.${key} is reserved. Keys equal to or prefixed with CS_ are not allowed.`
            );
        }
    }

    for (const overlaySelection of selections) {
        if (overlaySelection.kind !== 'named') {
            continue;
        }

        if (selection.stack === 'plain') {
            throw new ProjectConfigError(
                `Named overlay entries are supported only on stack 'compose' in this slice. Overlay '${overlaySelection.overlayId}' instance '${overlaySelection.instanceName}' is not allowed on stack 'plain'.`
            );
        }

        const overlay = lookup.overlayById.get(overlaySelection.overlayId);
        if (!overlay) {
            throw new ProjectConfigError(`Unknown overlay '${overlaySelection.overlayId}'.`);
        }
        if (!overlay.supports?.includes('compose')) {
            throw new ProjectConfigError(
                `Overlay '${overlaySelection.overlayId}' does not support compose and cannot be selected as a named instance.`
            );
        }
        if (overlay.repeatable !== true) {
            throw new ProjectConfigError(
                `Overlay '${overlaySelection.overlayId}' is not repeatable. Use the legacy string form unless the overlay is explicitly marked repeatable.`
            );
        }

        const declaredParameters = new Set(Object.keys(overlay.parameters ?? {}));
        for (const key of Object.keys(overlaySelection.parameters ?? {})) {
            if (!declaredParameters.has(key)) {
                throw new ProjectConfigError(
                    `overlays[] named entry '${overlaySelection.overlayId}:${overlaySelection.instanceName}' uses undeclared parameter '${key}'. Instance-local parameters must be declared by that overlay.`
                );
            }
        }
    }
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

function parseEnvTemplate(value: unknown, fieldName: string): Record<string, string> | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    const record = expectPlainObject(value, fieldName);
    const parsed: Record<string, string> = {};
    for (const [key, entry] of Object.entries(record)) {
        parsed[key] = expectString(entry, `${fieldName}.${key}`);
    }

    return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function parseParameters(value: unknown): Record<string, string> | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    const record = expectPlainObject(value, 'parameters');
    const parsed: Record<string, string> = {};
    for (const [key, entry] of Object.entries(record)) {
        // Coerce to string to accept numbers in YAML (e.g. POSTGRES_PORT: 5432)
        if (entry === null || entry === undefined) {
            throw new ProjectConfigError(`parameters.${key} must be a non-empty string`);
        }
        const coerced = String(entry);
        const normalized = coerced.trim();
        if (normalized.length === 0) {
            throw new ProjectConfigError(`parameters.${key} must be a non-empty string`);
        }
        parsed[key] = normalized;
    }

    return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function parseProjectEnv(value: unknown): ProjectConfigSelection['env'] | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    const record = expectPlainObject(value, 'env');
    const parsed: NonNullable<ProjectConfigSelection['env']> = {};

    for (const [key, entry] of Object.entries(record)) {
        if (typeof entry === 'string') {
            parsed[key] = { value: expectString(entry, `env.${key}`) };
            continue;
        }

        const envRecord = expectPlainObject(entry, `env.${key}`);
        parsed[key] = {
            value: expectString(envRecord.value, `env.${key}.value`),
            target: expectOptionalEnum(
                envRecord.target,
                `env.${key}.target`,
                PROJECT_ENV_TARGET_VALUES
            ),
        };
    }

    return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function parseProjectPorts(
    value: unknown,
    options: { preserveEmptyArray?: boolean } = {}
): ProjectPort[] | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    if (!Array.isArray(value)) {
        throw new ProjectConfigError(
            `ports: must be an array of port expressions (plain) or port bindings (compose).`
        );
    }

    if (value.length === 0) {
        return options.preserveEmptyArray ? [] : undefined;
    }

    const parsed = value.map((entry, index): ProjectPort => {
        if (typeof entry === 'string') {
            return { value: expectString(entry, `ports[${index}]`) };
        }

        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            throw new ProjectConfigError(
                `ports[${index}]: each entry must be a string or an object with a 'value' key.`
            );
        }

        const record = expectPlainObject(entry, `ports[${index}]`);
        return {
            value: expectString(record.value, `ports[${index}].value`),
            label: expectOptionalString(record.label, `ports[${index}].label`),
            onAutoForward: expectOptionalEnum(
                record.onAutoForward,
                `ports[${index}].onAutoForward`,
                PROJECT_PORT_AUTO_FORWARD_VALUES
            ),
        };
    });

    return parsed.length > 0 ? parsed : undefined;
}

/**
 * Normalize the raw `mounts` YAML value into an array of `ProjectMount` objects.
 *
 * Accepts three input forms:
 * - **String shorthand**: `"source=...,target=...,type=bind"` — stored as `{ value: string }`
 * - **Object with `value`**: `{ value: "...", target?: ProjectMountTarget }` — stored as-is;
 *   must not also include `source` or `destination` (use one form or the other)
 * - **Structured object**: `{ source: "...", destination: "...", type?, consistency?,
 *   cached?, readOnly?, target? }` — stored with individual fields; `source` and `destination`
 *   are both required when this form is used
 * - **Named map**: each key becomes the `name` on the resulting `ProjectMount` object (used
 *   internally for identification; `name` is not persisted when the selection is serialized
 *   back to `superposition.yml`); values must be structured objects (string shorthands are
 *   not supported in map form)
 *
 * @param value - Raw YAML value of the `mounts` field
 * @returns Normalized mount array, or `undefined` if the input is empty/absent
 * @throws {ProjectConfigError} When an entry is empty, invalid, or mixes `value` with
 *   `source`/`destination` fields
 */
function parseMounts(value: unknown): ProjectMount[] | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    const parseMountRecord = (
        record: Record<string, unknown>,
        fieldBase: string,
        name?: string
    ): ProjectMount => {
        const target = expectOptionalEnum(
            record.target,
            `${fieldBase}.target`,
            PROJECT_MOUNT_TARGET_VALUES
        );
        const value = expectOptionalString(record.value, `${fieldBase}.value`);

        if (value !== undefined) {
            const valueFormHasSource = record.source !== undefined;
            const valueFormHasDestination = record.destination !== undefined;
            if (valueFormHasSource || valueFormHasDestination) {
                throw new ProjectConfigError(
                    `${fieldBase} must not combine "value" with "source" or "destination" — use one form or the other`
                );
            }
            return { value, target, name };
        }

        const source = expectOptionalString(record.source, `${fieldBase}.source`);
        const destination = expectOptionalString(record.destination, `${fieldBase}.destination`);
        const type = expectOptionalEnum(record.type, `${fieldBase}.type`, [
            'bind',
            'volume',
            'tmpfs',
        ]);
        const consistency = expectOptionalEnum(record.consistency, `${fieldBase}.consistency`, [
            'consistent',
            'cached',
            'delegated',
        ]);
        const cached = expectOptionalBoolean(record.cached, `${fieldBase}.cached`);
        const readOnly = expectOptionalBoolean(record.readOnly, `${fieldBase}.readOnly`);

        if (!source || !destination) {
            throw new ProjectConfigError(
                `${fieldBase} must define either "value" or both "source" and "destination"`
            );
        }

        return { source, destination, type, consistency, cached, readOnly, target, name };
    };

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return undefined;
        }
        return value.map((entry, index) => {
            if (typeof entry === 'string') {
                const str = entry.trim();
                if (str.length === 0) {
                    throw new ProjectConfigError(`mounts[${index}] must be a non-empty string`);
                }
                return { value: str };
            }

            if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                throw new ProjectConfigError(
                    `mounts[${index}] must be a non-empty string or an object mount definition`
                );
            }

            return parseMountRecord(entry as Record<string, unknown>, `mounts[${index}]`);
        });
    }

    const mapRecord = expectPlainObject(value, 'mounts');
    const entries = Object.entries(mapRecord);
    if (entries.length === 0) {
        return undefined;
    }

    return entries.map(([name, entry]) => {
        const fieldBase = `mounts.${name}`;
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            throw new ProjectConfigError(`${fieldBase} must be an object mount definition`);
        }
        return parseMountRecord(entry as Record<string, unknown>, fieldBase, name);
    });
}

function parseCustomizations(value: unknown): ProjectConfigCustomizationsInput | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }

    const record = expectPlainObject(value, 'customizations');
    if (record.environment !== undefined) {
        console.warn(
            'Deprecated project config field: customizations.environment. Use customizations.envTemplate instead.'
        );
    }
    const envTemplate = {
        ...(parseEnvTemplate(record.environment, 'customizations.environment') ?? {}),
        ...(parseEnvTemplate(record.envTemplate, 'customizations.envTemplate') ?? {}),
    };

    const customizations: ProjectConfigCustomizationsInput = {
        devcontainerPatch:
            record.devcontainerPatch !== undefined
                ? expectPlainObject(record.devcontainerPatch, 'customizations.devcontainerPatch')
                : undefined,
        dockerComposePatch:
            record.dockerComposePatch !== undefined
                ? expectPlainObject(record.dockerComposePatch, 'customizations.dockerComposePatch')
                : undefined,
        envTemplate: Object.keys(envTemplate).length > 0 ? envTemplate : undefined,
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

function parseProjectShell(value: unknown): ProjectShellConfig | undefined {
    if (value === undefined || value === null) {
        return undefined;
    }
    const record = expectPlainObject(value, 'shell');
    let aliases: Record<string, string> | undefined;
    let snippets: string[] | undefined;

    if (record.aliases !== undefined) {
        const aliasObj = expectPlainObject(record.aliases, 'shell.aliases');
        aliases = {};
        for (const [name, cmd] of Object.entries(aliasObj)) {
            if (!/^[A-Za-z_][A-Za-z0-9_-]*$/.test(name)) {
                throw new ProjectConfigError(`shell.aliases.${name} has an invalid alias name`);
            }
            aliases[name] = expectString(cmd, `shell.aliases.${name}`);
        }
        if (Object.keys(aliases).length === 0) {
            aliases = undefined;
        }
    }

    if (record.snippets !== undefined) {
        if (!Array.isArray(record.snippets)) {
            throw new ProjectConfigError('shell.snippets must be an array of shell snippets');
        }
        snippets = record.snippets.map((entry, i) => expectString(entry, `shell.snippets[${i}]`));
        if (snippets.length === 0) {
            snippets = undefined;
        }
    }

    if (!aliases && !snippets) {
        return undefined;
    }
    return { aliases, snippets };
}

function parseLocalProjectConfigDocument(
    document: Record<string, any>,
    sourceLabel: string,
    options: { allowSchema?: boolean } = {}
): LocalProjectConfigSelection {
    const supportedKeys = new Set([
        ...(options.allowSchema === false ? [] : ['$schema']),
        'env',
        'mounts',
        'shell',
        'customizations',
        'portOffset',
        'ports',
    ]);
    const unsupportedKeys = Object.keys(document).filter((key) => !supportedKeys.has(key));
    if (unsupportedKeys.length > 0) {
        throw new ProjectConfigError(
            `Unsupported local config keys in ${sourceLabel}: ${unsupportedKeys.join(', ')}\nAllowed top-level keys: ${[...supportedKeys].join(', ')}.`
        );
    }

    return {
        $schema:
            options.allowSchema === false
                ? undefined
                : expectOptionalString(document.$schema, '$schema'),
        env: parseProjectEnv(document.env),
        mounts: parseMounts(document.mounts),
        shell: parseProjectShell(document.shell),
        customizations: parseCustomizations(document.customizations),
        portOffset: expectOptionalNonNegativeInteger(document.portOffset, 'portOffset'),
        ports: parseProjectPorts(document.ports, { preserveEmptyArray: true }),
    };
}

export function hasMeaningfulLocalProjectConfig(
    selection: LocalProjectConfigSelection | undefined
): boolean {
    return (
        Boolean(selection) &&
        Object.entries(selection as LocalProjectConfigSelection).some(
            ([key, value]) => key !== '$schema' && value !== undefined
        )
    );
}

export function findProjectConfig(repoRoot: string = process.cwd()): ProjectConfigFileEntry[] {
    return PROJECT_CONFIG_FILENAMES.map((fileName) => ({
        fileName,
        path: path.join(repoRoot, fileName),
    })).filter((entry) => fs.existsSync(entry.path));
}

export function findLocalProjectConfig(
    repoRoot: string = process.cwd()
): ProjectConfigFileEntry | null {
    const file = {
        fileName: LOCAL_PROJECT_CONFIG_FILENAME,
        path: path.join(repoRoot, LOCAL_PROJECT_CONFIG_FILENAME),
    } satisfies ProjectConfigFileEntry;
    return fs.existsSync(file.path) ? file : null;
}

export function findIgnoredLocalProjectConfig(
    repoRoot: string = process.cwd()
): ProjectConfigFileEntry | null {
    const file = {
        fileName: IGNORED_LOCAL_PROJECT_CONFIG_FILENAME,
        path: path.join(repoRoot, IGNORED_LOCAL_PROJECT_CONFIG_FILENAME),
    } satisfies ProjectConfigFileEntry;
    return fs.existsSync(file.path) ? file : null;
}

export function loadLocalProjectConfig(
    repoRoot: string = process.cwd()
): LoadedLocalProjectConfig | null {
    const file = findLocalProjectConfig(repoRoot);
    if (!file) {
        return null;
    }

    let parsed: unknown;
    try {
        parsed = yaml.load(fs.readFileSync(file.path, 'utf8')) ?? {};
    } catch (error) {
        throw new ProjectConfigError(
            `Failed to parse ${LOCAL_PROJECT_CONFIG_FILENAME}: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    const document = expectPlainObject(parsed, LOCAL_PROJECT_CONFIG_FILENAME);

    return {
        file,
        selection: parseLocalProjectConfigDocument(document, LOCAL_PROJECT_CONFIG_FILENAME),
    };
}

export function resolveGlobalDefaultsPath(homeDir?: string): ResolvedGlobalDefaultsPath | null {
    const resolvedHomeDir =
        homeDir ??
        (() => {
            try {
                return os.homedir();
            } catch {
                return '';
            }
        })();

    if (!resolvedHomeDir || resolvedHomeDir.trim() === '') {
        return null;
    }

    const candidatePaths = GLOBAL_DEFAULTS_FILENAMES.map((fileName) =>
        path.join(resolvedHomeDir, fileName)
    );
    const firstExistingIndex = candidatePaths.findIndex((candidatePath) =>
        fs.existsSync(candidatePath)
    );
    if (firstExistingIndex === -1) {
        return null;
    }

    return {
        path: candidatePaths[firstExistingIndex],
        ignoredPath: candidatePaths
            .slice(firstExistingIndex + 1)
            .find((candidatePath) => fs.existsSync(candidatePath)),
    };
}

function parseGlobalLocalConfigTemplate(
    document: Record<string, any>,
    sourceLabel: string
): GlobalLocalConfigTemplateSelection {
    const branchKeys = ['common', 'plain', 'compose'] as const;
    const presentBranchKeys = branchKeys.filter((key) => key in document);

    if (presentBranchKeys.length === 0) {
        return parseLocalProjectConfigDocument(document, sourceLabel, { allowSchema: false });
    }

    const supportedKeys = new Set(branchKeys);
    const unsupportedKeys = Object.keys(document).filter((key) => !supportedKeys.has(key as any));
    if (unsupportedKeys.length > 0) {
        throw new ProjectConfigError(
            `Unsupported local config template keys in ${sourceLabel}: ${unsupportedKeys.join(', ')}\nWhen using stack-aware localConfigTemplate, allowed keys are: common, plain, compose.`
        );
    }

    return {
        common:
            document.common === undefined
                ? undefined
                : parseLocalProjectConfigDocument(
                      expectPlainObject(document.common, `${sourceLabel}.common`),
                      `${sourceLabel}.common`,
                      { allowSchema: false }
                  ),
        plain:
            document.plain === undefined
                ? undefined
                : parseLocalProjectConfigDocument(
                      expectPlainObject(document.plain, `${sourceLabel}.plain`),
                      `${sourceLabel}.plain`,
                      { allowSchema: false }
                  ),
        compose:
            document.compose === undefined
                ? undefined
                : parseLocalProjectConfigDocument(
                      expectPlainObject(document.compose, `${sourceLabel}.compose`),
                      `${sourceLabel}.compose`,
                      { allowSchema: false }
                  ),
    };
}

export function loadGlobalDefaults(
    overlaysConfig: OverlaysConfig,
    homeDir?: string
): LoadedGlobalDefaults | null {
    const resolvedGlobalDefaultsPath = resolveGlobalDefaultsPath(homeDir);
    if (!resolvedGlobalDefaultsPath) {
        return null;
    }

    const globalDefaultsPath = resolvedGlobalDefaultsPath.path;

    let parsed: unknown;
    try {
        parsed = yaml.load(fs.readFileSync(globalDefaultsPath, 'utf8')) ?? {};
    } catch (error) {
        throw new ProjectConfigError(
            `Failed to parse global defaults file ${globalDefaultsPath}: ${error instanceof Error ? error.message : String(error)}`
        );
    }

    try {
        const document = expectPlainObject(parsed, globalDefaultsPath);
        const supportedKeys = new Set(['$schema', 'initDefaults', 'localConfigTemplate']);
        const unsupportedKeys = Object.keys(document).filter((key) => !supportedKeys.has(key));
        if (unsupportedKeys.length > 0) {
            throw new ProjectConfigError(
                `Unsupported global defaults keys in ${globalDefaultsPath}: ${unsupportedKeys.join(', ')}\nAllowed top-level keys: $schema, initDefaults, localConfigTemplate.`
            );
        }

        const lookup = buildCategoryLookup(overlaysConfig);
        const initDefaultsDocument =
            document.initDefaults === undefined
                ? undefined
                : expectPlainObject(document.initDefaults, 'initDefaults');
        const initDefaultsSupportedKeys = new Set([
            'stack',
            'baseImage',
            'customImage',
            'editor',
            'target',
            'outputPath',
            'minimal',
            'composeEnvFiles',
            'devcontainerGitignore',
            'overlays',
        ]);
        const unsupportedInitDefaultKeys = Object.keys(initDefaultsDocument ?? {}).filter(
            (key) => !initDefaultsSupportedKeys.has(key)
        );
        if (unsupportedInitDefaultKeys.length > 0) {
            throw new ProjectConfigError(
                `Unsupported initDefaults keys in ${globalDefaultsPath}: ${unsupportedInitDefaultKeys.join(', ')}\nAllowed initDefaults keys: ${[...initDefaultsSupportedKeys].join(', ')}.`
            );
        }

        const selection: GlobalDefaultsSelection = {
            $schema: expectOptionalString(document.$schema, '$schema'),
            initDefaults: initDefaultsDocument
                ? {
                      stack: expectOptionalEnum(
                          initDefaultsDocument.stack,
                          'initDefaults.stack',
                          STACK_VALUES
                      ),
                      baseImage: expectOptionalEnum(
                          initDefaultsDocument.baseImage,
                          'initDefaults.baseImage',
                          BASE_IMAGE_VALUES
                      ),
                      customImage: expectOptionalString(
                          initDefaultsDocument.customImage,
                          'initDefaults.customImage'
                      ),
                      editor: expectOptionalEnum(
                          initDefaultsDocument.editor,
                          'initDefaults.editor',
                          EDITOR_VALUES
                      ),
                      target: expectOptionalEnum(
                          initDefaultsDocument.target,
                          'initDefaults.target',
                          TARGET_VALUES
                      ),
                      outputPath: expectOptionalString(
                          initDefaultsDocument.outputPath,
                          'initDefaults.outputPath'
                      ),
                      minimal: expectOptionalBoolean(
                          initDefaultsDocument.minimal,
                          'initDefaults.minimal'
                      ),
                      composeEnvFiles: expectOptionalBoolean(
                          initDefaultsDocument.composeEnvFiles,
                          'initDefaults.composeEnvFiles'
                      ),
                      devcontainerGitignore: expectOptionalBoolean(
                          initDefaultsDocument.devcontainerGitignore,
                          'initDefaults.devcontainerGitignore'
                      ),
                      overlays: expectOverlayArray<OverlayId>(
                          initDefaultsDocument.overlays,
                          'initDefaults.overlays',
                          lookup.isKnownOverlay
                      ),
                  }
                : undefined,
            localConfigTemplate:
                document.localConfigTemplate === undefined
                    ? undefined
                    : parseGlobalLocalConfigTemplate(
                          expectPlainObject(document.localConfigTemplate, 'localConfigTemplate'),
                          'localConfigTemplate'
                      ),
        };

        return {
            path: globalDefaultsPath,
            ignoredPath: resolvedGlobalDefaultsPath.ignoredPath,
            selection,
        };
    } catch (error) {
        if (error instanceof ProjectConfigError) {
            throw new ProjectConfigError(
                `Invalid global defaults file ${globalDefaultsPath}: ${error.message}`
            );
        }
        throw error;
    }
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
        '$schema',
        'stack',
        'baseImage',
        'customImage',
        'containerName',
        'composeNetworkName',
        'preset',
        'presetChoices',
        'overlays',
        'language',
        'database',
        'observability',
        'cloudTools',
        'devTools',
        'playwright',
        'outputPath',
        'portOffset',
        'composeEnvFiles',
        'target',
        'minimal',
        'editor',
        'devcontainerGitignore',
        'env',
        'ports',
        'mounts',
        'shell',
        'customizations',
        'parameters',
    ]);

    const unsupportedKeys = Object.keys(document).filter((key) => !supportedKeys.has(key));
    if (unsupportedKeys.length > 0) {
        throw new ProjectConfigError(
            `Unsupported project config keys: ${unsupportedKeys.join(', ')}`
        );
    }

    const lookup = buildCategoryLookup(overlaysConfig);

    const overlays = parseProjectOverlayEntries(document.overlays, lookup);
    const normalizedOverlaySelections = normalizeProjectOverlaySelections(
        overlays,
        document,
        lookup
    );

    const selection: ProjectConfigSelection = {
        $schema: expectOptionalString(document.$schema, '$schema'),
        stack: expectOptionalEnum(document.stack, 'stack', STACK_VALUES),
        baseImage: expectOptionalEnum(document.baseImage, 'baseImage', BASE_IMAGE_VALUES),
        customImage: expectOptionalString(document.customImage, 'customImage'),
        containerName: expectOptionalString(document.containerName, 'containerName'),
        composeNetworkName:
            document.composeNetworkName !== undefined && document.composeNetworkName !== null
                ? (() => {
                      try {
                          return validateComposeNetworkName(
                              expectString(document.composeNetworkName, 'composeNetworkName')
                          );
                      } catch (error) {
                          throw new ProjectConfigError(
                              error instanceof Error ? error.message : String(error)
                          );
                      }
                  })()
                : undefined,
        preset: expectOptionalString(document.preset, 'preset'),
        presetChoices: parsePresetChoices(document.presetChoices),
        overlays: projectOverlayEntriesFromSelections(normalizedOverlaySelections, {
            includeCategorySelections: true,
        }),
        outputPath: expectOptionalString(document.outputPath, 'outputPath'),
        portOffset: expectOptionalNonNegativeInteger(document.portOffset, 'portOffset'),
        composeEnvFiles: expectOptionalBoolean(document.composeEnvFiles, 'composeEnvFiles'),
        target: expectOptionalEnum(document.target, 'target', TARGET_VALUES),
        minimal: expectOptionalBoolean(document.minimal, 'minimal'),
        editor: expectOptionalEnum(document.editor, 'editor', EDITOR_VALUES),
        devcontainerGitignore: expectOptionalBoolean(
            document.devcontainerGitignore,
            'devcontainerGitignore'
        ),
        env: parseProjectEnv(document.env),
        ports: parseProjectPorts(document.ports),
        mounts: parseMounts(document.mounts),
        shell: parseProjectShell(document.shell),
        customizations: parseCustomizations(document.customizations),
        parameters: parseParameters(document.parameters),
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

    try {
        assertComposeNetworkNameSupported(selection.stack, selection.composeNetworkName);
        validateNormalizedOverlaySelections(normalizedOverlaySelections, selection, lookup);
    } catch (error) {
        throw new ProjectConfigError(error instanceof Error ? error.message : String(error));
    }

    return { file, selection };
}

function mergePlainObjects<T extends Record<string, any>>(
    base: T | undefined,
    local: T | undefined
): T | undefined {
    if (!base && !local) return undefined;
    const output: Record<string, any> = { ...(base ?? {}) };
    for (const [key, value] of Object.entries(local ?? {})) {
        const existing = output[key];
        if (
            existing &&
            value &&
            typeof existing === 'object' &&
            typeof value === 'object' &&
            !Array.isArray(existing) &&
            !Array.isArray(value)
        ) {
            output[key] = mergePlainObjects(existing, value);
        } else {
            output[key] = value;
        }
    }
    return output as T;
}

function mergeCustomizationConfig(
    base: CustomizationConfig | undefined,
    local: CustomizationConfig | undefined
): CustomizationConfig | undefined {
    if (!base && !local) return undefined;
    return {
        devcontainerPatch: mergePlainObjects(base?.devcontainerPatch, local?.devcontainerPatch),
        dockerComposePatch: mergePlainObjects(base?.dockerComposePatch, local?.dockerComposePatch),
        environmentVars: mergePlainObjects(base?.environmentVars, local?.environmentVars),
        scripts:
            base?.scripts || local?.scripts
                ? {
                      postCreate: [
                          ...(base?.scripts?.postCreate ?? []),
                          ...(local?.scripts?.postCreate ?? []),
                      ],
                      postStart: [
                          ...(base?.scripts?.postStart ?? []),
                          ...(local?.scripts?.postStart ?? []),
                      ],
                  }
                : undefined,
        files: [...(base?.files ?? []), ...(local?.files ?? [])],
    };
}

export function materializeLocalCustomizationConfig(
    input: ProjectConfigCustomizationsInput | undefined
): CustomizationConfig | undefined {
    return input ? materializeCustomizationConfig(input) : undefined;
}

export function applyLocalConfigToAnswers<T extends QuestionnaireAnswers>(
    answers: T,
    local: LocalProjectConfigSelection | undefined
): T {
    if (!local) {
        return answers;
    }

    const localCustomizations = materializeLocalCustomizationConfig(local.customizations);
    return {
        ...answers,
        portOffset: local.portOffset ?? answers.portOffset,
        projectEnv: mergePlainObjects(answers.projectEnv, local.env),
        projectPorts: local.ports !== undefined ? [...local.ports] : answers.projectPorts,
        projectMounts: [...(answers.projectMounts ?? []), ...(local.mounts ?? [])],
        projectShell:
            answers.projectShell || local.shell
                ? {
                      aliases: mergePlainObjects(
                          answers.projectShell?.aliases,
                          local.shell?.aliases
                      ),
                      snippets: [
                          ...(answers.projectShell?.snippets ?? []),
                          ...(local.shell?.snippets ?? []),
                      ],
                  }
                : undefined,
        customizations: mergeCustomizationConfig(answers.customizations, localCustomizations),
    } as T;
}

export function buildAnswersFromGlobalInitDefaults(
    defaults: GlobalInitDefaultsSelection | undefined,
    overlaysConfig: OverlaysConfig
): Partial<QuestionnaireAnswers> | undefined {
    if (!defaults) {
        return undefined;
    }

    const distributed = distributeOverlaysToAnswers(defaults.overlays, overlaysConfig);
    const answers: Partial<QuestionnaireAnswers> = {};

    if (defaults.stack !== undefined) {
        answers.stack = defaults.stack;
        answers.needsDocker = defaults.stack === 'compose';
    }
    if (defaults.baseImage !== undefined) answers.baseImage = defaults.baseImage;
    if (defaults.customImage !== undefined) answers.customImage = defaults.customImage;
    if (distributed.language !== undefined) answers.language = distributed.language;
    if (distributed.database !== undefined) answers.database = distributed.database;
    if (distributed.observability !== undefined) answers.observability = distributed.observability;
    if (distributed.cloudTools !== undefined) answers.cloudTools = distributed.cloudTools;
    if (distributed.devTools !== undefined) answers.devTools = distributed.devTools;
    if (distributed.playwright === true) answers.playwright = true;
    if (defaults.outputPath !== undefined) answers.outputPath = defaults.outputPath;
    if (defaults.target !== undefined) answers.target = defaults.target;
    if (defaults.minimal !== undefined) answers.minimal = defaults.minimal;
    if (defaults.composeEnvFiles !== undefined) answers.composeEnvFiles = defaults.composeEnvFiles;
    if (defaults.editor !== undefined) answers.editor = defaults.editor;
    if (defaults.devcontainerGitignore !== undefined) {
        answers.devcontainerGitignore = defaults.devcontainerGitignore;
    }

    return Object.keys(answers).length > 0 ? answers : undefined;
}

export function mergeInitDefaultsWithCliInputs(
    seeded: Partial<QuestionnaireAnswers>,
    cli: Partial<QuestionnaireAnswers>
): Partial<QuestionnaireAnswers> {
    const mergeUnique = <T>(left?: T[], right?: T[]): T[] | undefined => {
        const merged = [...(left ?? []), ...(right ?? [])];
        return merged.length > 0 ? [...new Set(merged)] : undefined;
    };

    return {
        ...seeded,
        ...cli,
        language: mergeUnique(seeded.language, cli.language),
        database: mergeUnique(seeded.database, cli.database),
        observability: mergeUnique(seeded.observability, cli.observability),
        cloudTools: mergeUnique(seeded.cloudTools, cli.cloudTools),
        devTools: mergeUnique(seeded.devTools, cli.devTools),
        playwright: cli.playwright ?? seeded.playwright,
        overlayParameters: {
            ...(seeded.overlayParameters ?? {}),
            ...(cli.overlayParameters ?? {}),
        },
    };
}

export function buildAnswersFromProjectConfig(
    selection: ProjectConfigSelection,
    overlaysConfig: OverlaysConfig
): Partial<QuestionnaireAnswers> {
    const lookup = buildCategoryLookup(overlaysConfig);
    const overlaySelections = normalizeProjectOverlaySelections(selection.overlays, {}, lookup);
    return {
        stack: selection.stack,
        baseImage: selection.baseImage,
        customImage: selection.customImage,
        containerName: selection.containerName,
        composeNetworkName: selection.composeNetworkName,
        preset: selection.preset,
        presetChoices: selection.presetChoices,
        ...distributeOverlaysToAnswers(
            explicitOverlayIdsFromSelections(overlaySelections),
            overlaysConfig
        ),
        outputPath: selection.outputPath,
        portOffset: selection.portOffset,
        composeEnvFiles: selection.composeEnvFiles,
        target: selection.target,
        minimal: selection.minimal,
        editor: selection.editor,
        devcontainerGitignore: selection.devcontainerGitignore,
        projectEnv: selection.env,
        projectPorts: selection.ports,
        projectMounts: selection.mounts,
        projectShell: selection.shell,
        customizations: selection.customizations
            ? materializeCustomizationConfig(selection.customizations)
            : undefined,
        overlayParameters: selection.parameters,
        overlaySelections,
    };
}

function buildProjectConfigCustomizationsFromAnswers(
    customizations?: CustomizationConfig
): ProjectConfigCustomizationsInput | undefined {
    if (!customizations) {
        return undefined;
    }

    const files = customizations.files?.map((entry) => {
        // Prefer already-available content (e.g. when materialized from an existing project config)
        // to avoid re-reading from disk via a path that may not exist on the current filesystem.
        const content =
            entry.content !== undefined ? entry.content : fs.readFileSync(entry.source, 'utf8');

        return {
            path: entry.destination,
            content,
        };
    });

    const input: ProjectConfigCustomizationsInput = {
        devcontainerPatch: customizations.devcontainerPatch,
        dockerComposePatch: customizations.dockerComposePatch,
        envTemplate: customizations.environmentVars,
        scripts: customizations.scripts,
        files,
    };

    const hasValues = Object.values(input).some(
        (entry) =>
            entry !== undefined &&
            (!Array.isArray(entry) || entry.length > 0) &&
            (!(typeof entry === 'object' && !Array.isArray(entry)) || Object.keys(entry).length > 0)
    );

    return hasValues ? input : undefined;
}

function normalizeProjectConfigSelectionForPersistence(
    selection: ProjectConfigSelection
): ProjectConfigSelection {
    return {
        ...selection,
        customImage: selection.baseImage === 'custom' ? selection.customImage : undefined,
        composeEnvFiles: selection.stack === 'compose' ? selection.composeEnvFiles : undefined,
    };
}

export function buildProjectConfigSelectionFromAnswers(
    answers: QuestionnaireAnswers
): ProjectConfigSelection {
    const overlays = [
        ...(answers.language ?? []),
        ...(answers.database ?? []),
        ...(answers.observability ?? []),
        ...(answers.cloudTools ?? []),
        ...(answers.devTools ?? []),
    ] as OverlayId[];

    if (answers.playwright && !overlays.includes('playwright')) {
        overlays.push('playwright');
    }

    return normalizeProjectConfigSelectionForPersistence({
        stack: answers.stack,
        baseImage: answers.baseImage,
        customImage: answers.customImage,
        containerName: answers.containerName,
        composeNetworkName: answers.composeNetworkName,
        preset: answers.preset,
        presetChoices: answers.presetChoices,
        overlays:
            projectOverlayEntriesFromSelections(answers.overlaySelections) ??
            (overlays.length > 0 ? [...new Set(overlays)] : undefined),
        outputPath: answers.outputPath,
        portOffset: answers.portOffset,
        composeEnvFiles: answers.composeEnvFiles,
        target: answers.target,
        minimal: answers.minimal,
        editor: answers.editor,
        devcontainerGitignore: answers.devcontainerGitignore,
        env: answers.projectEnv,
        ports: answers.projectPorts?.length ? answers.projectPorts : undefined,
        mounts: answers.projectMounts?.length ? answers.projectMounts : undefined,
        shell: answers.projectShell,
        customizations: buildProjectConfigCustomizationsFromAnswers(answers.customizations),
        parameters:
            answers.overlayParameters && Object.keys(answers.overlayParameters).length > 0
                ? answers.overlayParameters
                : undefined,
    });
}

function materializeCustomizationConfig(
    input: ProjectConfigCustomizationsInput
): CustomizationConfig {
    return {
        devcontainerPatch: input.devcontainerPatch,
        dockerComposePatch: input.dockerComposePatch,
        environmentVars: input.envTemplate,
        scripts: input.scripts,
        files: input.files?.map((entry) => ({
            source: entry.path,
            destination: entry.path,
            content: entry.content,
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

function hasKeys(value: Record<string, any> | undefined): boolean {
    return Boolean(value) && Object.keys(value as Record<string, any>).length > 0;
}

function buildLocalProjectConfigDocument(
    selection: LocalProjectConfigSelection
): Record<string, any> {
    const document: Record<string, any> = {
        $schema: selection.$schema ?? SUPERPOSITION_LOCAL_SCHEMA_URL,
    };

    if (selection.env && Object.keys(selection.env).length > 0) {
        document.env = Object.fromEntries(
            Object.entries(selection.env).map(([key, entry]) => [
                key,
                entry.target && entry.target !== 'auto'
                    ? { value: entry.value, target: entry.target }
                    : entry.value,
            ])
        );
    }

    if (selection.mounts && selection.mounts.length > 0) {
        document.mounts = selection.mounts.map((entry) => {
            if (entry.value && (!entry.target || entry.target === 'auto')) {
                return entry.value;
            }
            if (entry.value) {
                return { value: entry.value, target: entry.target };
            }
            const structured: Record<string, unknown> = {
                source: entry.source,
                destination: entry.destination,
            };
            if (entry.type) structured.type = entry.type;
            if (entry.consistency) structured.consistency = entry.consistency;
            if (entry.cached !== undefined) structured.cached = entry.cached;
            if (entry.readOnly !== undefined) structured.readOnly = entry.readOnly;
            if (entry.target && entry.target !== 'auto') structured.target = entry.target;
            return structured;
        });
    }

    if (selection.shell) {
        const shell: Record<string, unknown> = {};
        if (selection.shell.aliases && Object.keys(selection.shell.aliases).length > 0) {
            shell.aliases = selection.shell.aliases;
        }
        if (selection.shell.snippets && selection.shell.snippets.length > 0) {
            shell.snippets = selection.shell.snippets;
        }
        if (Object.keys(shell).length > 0) {
            document.shell = shell;
        }
    }

    if (selection.customizations) {
        const customizations: Record<string, any> = {};

        if (selection.customizations.devcontainerPatch) {
            customizations.devcontainerPatch = withSchemaFirst(
                selection.customizations.devcontainerPatch
            );
        }

        if (hasKeys(selection.customizations.dockerComposePatch)) {
            customizations.dockerComposePatch = selection.customizations.dockerComposePatch;
        }

        if (hasKeys(selection.customizations.envTemplate)) {
            customizations.envTemplate = selection.customizations.envTemplate;
        }

        if (selection.customizations.scripts?.postCreate?.length) {
            customizations.scripts = {
                ...(customizations.scripts ?? {}),
                postCreate: selection.customizations.scripts.postCreate,
            };
        }

        if (selection.customizations.scripts?.postStart?.length) {
            customizations.scripts = {
                ...(customizations.scripts ?? {}),
                postStart: selection.customizations.scripts.postStart,
            };
        }

        if (selection.customizations.files?.length) {
            customizations.files = selection.customizations.files;
        }

        if (Object.keys(customizations).length > 0) {
            document.customizations = customizations;
        }
    }

    if (selection.portOffset !== undefined) document.portOffset = selection.portOffset;

    if (selection.ports !== undefined) {
        document.ports = selection.ports.map((entry) => {
            if (!entry.label && !entry.onAutoForward) {
                return entry.value;
            }
            const detailed: Record<string, unknown> = { value: entry.value };
            if (entry.label) {
                detailed.label = entry.label;
            }
            if (entry.onAutoForward) {
                detailed.onAutoForward = entry.onAutoForward;
            }
            return detailed;
        });
    }

    return document;
}

function buildProjectConfigDocument(selection: ProjectConfigSelection): Record<string, any> {
    const document: Record<string, any> = {
        $schema: selection.$schema ?? SUPERPOSITION_SCHEMA_URL,
    };

    if (selection.stack) document.stack = selection.stack;
    if (selection.baseImage) document.baseImage = selection.baseImage;
    if (selection.customImage) document.customImage = selection.customImage;
    if (selection.containerName) document.containerName = selection.containerName;
    if (selection.composeNetworkName) document.composeNetworkName = selection.composeNetworkName;
    if (selection.preset) document.preset = selection.preset;
    if (hasKeys(selection.presetChoices)) document.presetChoices = selection.presetChoices;
    if (selection.overlays?.length) {
        document.overlays = selection.overlays.map((entry) => {
            if (typeof entry === 'string') {
                return entry;
            }

            return {
                overlay: entry.overlay,
                name: entry.name,
                ...(entry.parameters && Object.keys(entry.parameters).length > 0
                    ? { parameters: entry.parameters }
                    : {}),
            };
        });
    }
    if (selection.outputPath) document.outputPath = selection.outputPath;
    if (selection.portOffset !== undefined) document.portOffset = selection.portOffset;
    if (selection.composeEnvFiles === true) document.composeEnvFiles = true;
    if (selection.target) document.target = selection.target;
    if (selection.minimal !== undefined) document.minimal = selection.minimal;
    if (selection.editor) document.editor = selection.editor;
    if (selection.devcontainerGitignore !== undefined) {
        document.devcontainerGitignore = selection.devcontainerGitignore;
    }
    if (selection.env && Object.keys(selection.env).length > 0) {
        document.env = Object.fromEntries(
            Object.entries(selection.env).map(([key, entry]) => [
                key,
                entry.target && entry.target !== 'auto'
                    ? { value: entry.value, target: entry.target }
                    : entry.value,
            ])
        );
    }

    if (selection.ports && selection.ports.length > 0) {
        document.ports = selection.ports.map((entry) => {
            if (!entry.label && !entry.onAutoForward) {
                return entry.value;
            }
            const detailed: Record<string, unknown> = { value: entry.value };
            if (entry.label) {
                detailed.label = entry.label;
            }
            if (entry.onAutoForward) {
                detailed.onAutoForward = entry.onAutoForward;
            }
            return detailed;
        });
    }

    if (selection.mounts && selection.mounts.length > 0) {
        document.mounts = selection.mounts.map((entry) => {
            if (entry.value && (!entry.target || entry.target === 'auto')) {
                return entry.value;
            }
            if (entry.value) {
                return { value: entry.value, target: entry.target };
            }
            const structured: Record<string, unknown> = {
                source: entry.source,
                destination: entry.destination,
            };
            if (entry.type) structured.type = entry.type;
            if (entry.consistency) structured.consistency = entry.consistency;
            if (entry.cached !== undefined) structured.cached = entry.cached;
            if (entry.readOnly !== undefined) structured.readOnly = entry.readOnly;
            if (entry.target && entry.target !== 'auto') structured.target = entry.target;
            return structured;
        });
    }

    if (selection.shell) {
        const shell: Record<string, unknown> = {};
        if (selection.shell.aliases && Object.keys(selection.shell.aliases).length > 0) {
            shell.aliases = selection.shell.aliases;
        }
        if (selection.shell.snippets && selection.shell.snippets.length > 0) {
            shell.snippets = selection.shell.snippets;
        }
        if (Object.keys(shell).length > 0) {
            document.shell = shell;
        }
    }

    if (selection.customizations) {
        const customizations: Record<string, any> = {};

        if (selection.customizations.devcontainerPatch) {
            customizations.devcontainerPatch = withSchemaFirst(
                selection.customizations.devcontainerPatch
            );
        }

        if (hasKeys(selection.customizations.dockerComposePatch)) {
            customizations.dockerComposePatch = selection.customizations.dockerComposePatch;
        }

        if (hasKeys(selection.customizations.envTemplate)) {
            customizations.envTemplate = selection.customizations.envTemplate;
        }

        if (selection.customizations.scripts?.postCreate?.length) {
            customizations.scripts = {
                ...(customizations.scripts ?? {}),
                postCreate: selection.customizations.scripts.postCreate,
            };
        }

        if (selection.customizations.scripts?.postStart?.length) {
            customizations.scripts = {
                ...(customizations.scripts ?? {}),
                postStart: selection.customizations.scripts.postStart,
            };
        }

        if (selection.customizations.files?.length) {
            customizations.files = selection.customizations.files;
        }

        if (Object.keys(customizations).length > 0) {
            document.customizations = customizations;
        }
    }

    if (hasKeys(selection.parameters)) {
        document.parameters = selection.parameters;
    }

    return document;
}

export function serializeProjectConfig(selection: ProjectConfigSelection): string {
    return (
        yaml.dump(buildProjectConfigDocument(selection), {
            lineWidth: 120,
            noRefs: true,
            sortKeys: false,
        }) + '\n'
    );
}

export function serializeLocalProjectConfig(selection: LocalProjectConfigSelection): string {
    return (
        yaml.dump(buildLocalProjectConfigDocument(selection), {
            lineWidth: 120,
            noRefs: true,
            sortKeys: false,
        }) + '\n'
    );
}

export function writeProjectConfig(filePath: string, selection: ProjectConfigSelection): void {
    ensureDirectory(path.dirname(filePath));
    fs.writeFileSync(filePath, serializeProjectConfig(selection), 'utf8');
}

export function writeLocalProjectConfig(
    filePath: string,
    selection: LocalProjectConfigSelection
): void {
    ensureDirectory(path.dirname(filePath));
    fs.writeFileSync(filePath, serializeLocalProjectConfig(selection), 'utf8');
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

    if (customizations.envTemplate && Object.keys(customizations.envTemplate).length > 0) {
        const content =
            Object.entries(customizations.envTemplate)
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

/**
 * Search for manifest file in multiple locations.
 */
export function findManifestFile(manifestPath?: string): string | null {
    const searchPaths: string[] = [];

    if (manifestPath) {
        searchPaths.push(manifestPath);
    } else {
        searchPaths.push(
            'superposition.json',
            '.devcontainer/superposition.json',
            '../superposition.json',
            path.join(process.cwd(), 'superposition.json'),
            path.join(process.cwd(), '.devcontainer', 'superposition.json')
        );
    }

    for (const searchPath of searchPaths) {
        const resolvedPath = path.resolve(searchPath);
        if (fs.existsSync(resolvedPath)) {
            return resolvedPath;
        }
    }

    return null;
}

export function findDefaultRegenManifest(outputPath: string = './.devcontainer'): string | null {
    const manifestSearchPaths = ['superposition.json', path.join(outputPath, 'superposition.json')];

    for (const searchPath of manifestSearchPaths) {
        const resolvedPath = path.resolve(searchPath);
        if (fs.existsSync(resolvedPath)) {
            return resolvedPath;
        }
    }

    return null;
}

function normalizeManifestOverlaySelections(
    manifest: SuperpositionManifest
): NormalizedOverlaySelection[] | undefined {
    if (manifest.overlaySelections && manifest.overlaySelections.length > 0) {
        return manifest.overlaySelections.map((entry) =>
            typeof entry === 'string'
                ? { kind: 'singleton', overlayId: entry as OverlayId, source: 'manifest' }
                : {
                      kind: 'named',
                      overlayId: entry.overlay,
                      instanceName: entry.name,
                      parameters: entry.parameters,
                      source: 'manifest',
                  }
        );
    }

    if (manifest.overlays.length === 0) {
        return undefined;
    }

    return manifest.overlays.map((overlayId) => ({
        kind: 'singleton',
        overlayId: overlayId as OverlayId,
        source: 'manifest',
    }));
}

/**
 * Build partial answers from a superposition.json manifest.
 * Note: Categories are only used for UI/questionnaire grouping.
 * The composer works with overlay IDs regardless of category.
 */
export function buildAnswersFromManifest(
    manifest: SuperpositionManifest,
    overlaysConfig: OverlaysConfig,
    manifestDir?: string
): Partial<QuestionnaireAnswers> {
    // Handle baseImage - check if it's a known ID or a custom image string
    const knownBaseImageIds: BaseImage[] = ['bookworm', 'trixie', 'alpine', 'ubuntu', 'custom'];
    const isKnownBaseImage = knownBaseImageIds.includes(manifest.baseImage as BaseImage);

    // Output path is always the directory containing the manifest
    const outputPath = manifestDir || './.devcontainer';

    const overlaySelections = normalizeManifestOverlaySelections(manifest);
    const overlayIds = explicitOverlayIdsFromSelections(overlaySelections) ?? [];
    const distributed = distributeOverlaysToAnswers(overlayIds, overlaysConfig);

    return {
        stack: manifest.baseTemplate as Stack,
        baseImage: isKnownBaseImage ? (manifest.baseImage as BaseImage) : 'custom',
        customImage: isKnownBaseImage ? undefined : manifest.baseImage,
        containerName: manifest.containerName,
        preset: manifest.preset,
        presetChoices: manifest.presetChoices,
        ...distributed,
        needsDocker: manifest.baseTemplate === 'compose',
        playwright: distributed.devTools?.includes('playwright' as DevTool) ?? false,
        outputPath,
        portOffset: manifest.portOffset,
        overlaySelections,
    };
}

export { ProjectConfigError };
