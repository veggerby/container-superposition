import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import type { DevContainer, OverlaysConfig, ProjectConfigSelection } from '../../schema/types.js';
import { applyOverlay } from '../../questionnaire/composer.js';
import { deepMerge } from '../../utils/merge.js';
import type { BaseImageSelection, BuildProjectConfigSelectionInput } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT_CANDIDATES = [
    path.join(__dirname, '..', '..', '..'),
    path.join(__dirname, '..', '..', '..', '..'),
];
const REPO_ROOT =
    REPO_ROOT_CANDIDATES.find(
        (candidate) =>
            fs.existsSync(path.join(candidate, 'templates')) &&
            fs.existsSync(path.join(candidate, 'overlays'))
    ) ?? REPO_ROOT_CANDIDATES[0];
const TEMPLATES_DIR = path.join(REPO_ROOT, 'templates');

export function withSchemaFirst(document: Record<string, any>): Record<string, any> {
    const { $schema, ...rest } = document;
    return typeof $schema === 'string' && $schema.trim() !== '' ? { $schema, ...rest } : rest;
}

export function loadJsonFile<T>(filePath: string, fallback: T): T {
    if (!fs.existsSync(filePath)) {
        return fallback;
    }

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
    } catch {
        return fallback;
    }
}

export function loadYamlFile<T>(filePath: string, fallback: T): T {
    if (!fs.existsSync(filePath)) {
        return fallback;
    }

    try {
        return (yaml.load(fs.readFileSync(filePath, 'utf8')) as T) ?? fallback;
    } catch {
        return fallback;
    }
}

export function inferBaseImageSelection(
    devcontainer: any,
    composePaths: string[],
    overlaysConfig: OverlaysConfig,
    stack: 'plain' | 'compose'
): BaseImageSelection {
    let image: string | undefined;

    if (stack === 'compose') {
        for (const composePath of composePaths) {
            const compose = loadYamlFile<any>(composePath, {});
            const composeImage = compose?.services?.devcontainer?.image;
            if (typeof composeImage === 'string' && composeImage.trim() !== '') {
                image = composeImage.trim();
                break;
            }
        }
    } else if (typeof devcontainer?.image === 'string' && devcontainer.image.trim() !== '') {
        image = devcontainer.image.trim();
    }

    if (!image) {
        return { baseImage: 'bookworm' };
    }

    const matchedBaseImage = overlaysConfig.base_images.find((entry) => entry.image === image);
    if (matchedBaseImage && matchedBaseImage.id !== 'custom') {
        return { baseImage: matchedBaseImage.id as ProjectConfigSelection['baseImage'] };
    }

    return { baseImage: 'custom', customImage: image };
}

export function addGeneratedOverlayCommands(
    config: DevContainer,
    overlayIds: string[],
    overlaysDir: string
): DevContainer {
    const nextConfig: DevContainer = { ...config };

    const setupOverlays = overlayIds.filter((overlayId) =>
        fs.existsSync(path.join(overlaysDir, overlayId, 'setup.sh'))
    );
    const verifyOverlays = overlayIds.filter((overlayId) =>
        fs.existsSync(path.join(overlaysDir, overlayId, 'verify.sh'))
    );

    if (setupOverlays.length > 0) {
        const postCreate =
            nextConfig.postCreateCommand &&
            typeof nextConfig.postCreateCommand === 'object' &&
            !Array.isArray(nextConfig.postCreateCommand)
                ? { ...nextConfig.postCreateCommand }
                : {};

        for (const overlayId of setupOverlays) {
            postCreate[`setup-${overlayId}`] = `bash .devcontainer/scripts/setup-${overlayId}.sh`;
        }

        nextConfig.postCreateCommand = postCreate;
    }

    if (verifyOverlays.length > 0) {
        const postStart =
            nextConfig.postStartCommand &&
            typeof nextConfig.postStartCommand === 'object' &&
            !Array.isArray(nextConfig.postStartCommand)
                ? { ...nextConfig.postStartCommand }
                : {};

        for (const overlayId of verifyOverlays) {
            postStart[`verify-${overlayId}`] = `bash .devcontainer/scripts/verify-${overlayId}.sh`;
        }

        nextConfig.postStartCommand = postStart;
    }

    return nextConfig;
}

function buildSingletonOverlayTokenMap(overlayId: string): Record<string, string> {
    return {
        CS_OVERLAY: overlayId,
        CS_INSTANCE: overlayId,
        CS_INSTANCE_SUFFIX: '',
        CS_INSTANCE_ENV_SUFFIX: '',
    };
}

export function buildExpectedDevcontainerConfig(
    stack: 'plain' | 'compose',
    overlayIds: string[],
    overlaysDir: string
): DevContainer {
    const templatePath = path.join(TEMPLATES_DIR, stack, '.devcontainer', 'devcontainer.json');
    let config = loadJsonFile<DevContainer>(templatePath, {});

    for (const overlayId of overlayIds) {
        config = applyOverlay(config, overlayId, overlaysDir, {
            silent: true,
            tokenMap: buildSingletonOverlayTokenMap(overlayId),
        });
    }

    return addGeneratedOverlayCommands(config, overlayIds, overlaysDir);
}

export function buildExpectedComposeConfig(
    overlayIds: string[],
    overlaysDir: string,
    baseImageSelection: BaseImageSelection,
    overlaysConfig: OverlaysConfig
): Record<string, any> {
    const templatePath = path.join(TEMPLATES_DIR, 'compose', '.devcontainer', 'docker-compose.yml');
    let composeConfig = loadYamlFile<Record<string, any>>(templatePath, {});

    for (const overlayId of overlayIds) {
        const overlayComposePath = path.join(overlaysDir, overlayId, 'docker-compose.yml');
        if (!fs.existsSync(overlayComposePath)) {
            continue;
        }

        composeConfig = deepMerge(
            composeConfig,
            loadYamlFile<Record<string, any>>(overlayComposePath, {})
        );
    }

    const image =
        baseImageSelection.baseImage === 'custom'
            ? baseImageSelection.customImage
            : overlaysConfig.base_images.find((entry) => entry.id === baseImageSelection.baseImage)
                  ?.image;

    if (image) {
        composeConfig = {
            ...composeConfig,
            services: {
                ...(composeConfig.services ?? {}),
                devcontainer: {
                    ...(composeConfig.services?.devcontainer ?? {}),
                    image,
                },
            },
        };
    }

    return composeConfig;
}

export function isPlainObject(value: unknown): value is Record<string, any> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

export function subtractDefaults(actual: unknown, expected: unknown): unknown {
    if (actual === undefined) {
        return undefined;
    }

    if (expected === undefined) {
        return deepClone(actual);
    }

    if (Array.isArray(actual)) {
        if (!Array.isArray(expected)) {
            return deepClone(actual);
        }

        const filtered = actual.filter(
            (item) =>
                !expected.some(
                    (expectedItem: unknown) => JSON.stringify(expectedItem) === JSON.stringify(item)
                )
        );
        return filtered.length > 0 ? filtered : undefined;
    }

    if (isPlainObject(actual)) {
        if (!isPlainObject(expected)) {
            return deepClone(actual);
        }

        const result: Record<string, any> = {};
        for (const [key, value] of Object.entries(actual)) {
            const diff = subtractDefaults(value, expected[key]);
            if (
                diff !== undefined &&
                (!isPlainObject(diff) ||
                    Object.keys(diff).length > 0 ||
                    expected[key] === undefined) &&
                (!Array.isArray(diff) || diff.length > 0)
            ) {
                result[key] = diff;
            }
        }

        return Object.keys(result).length > 0 ? result : undefined;
    }

    return actual === expected ? undefined : actual;
}

export function toProjectRelativePath(targetPath: string, projectRoot: string): string {
    const relativePath = path.relative(projectRoot, targetPath).split(path.sep).join('/');
    if (relativePath === '' || relativePath === '.') {
        return './';
    }
    if (relativePath.startsWith('./') || relativePath.startsWith('../')) {
        return relativePath;
    }
    return `./${relativePath}`;
}

export function buildProjectConfigSelection({
    analysis,
    baseImageSelection,
    projectRoot,
    absoluteDir,
    devcontainer,
}: BuildProjectConfigSelectionInput): ProjectConfigSelection {
    const selection: ProjectConfigSelection = {
        stack: analysis.suggestedStack,
        baseImage: baseImageSelection.baseImage,
        customImage: baseImageSelection.customImage,
        outputPath: toProjectRelativePath(absoluteDir, projectRoot),
        containerName:
            typeof devcontainer?.name === 'string' && devcontainer.name.trim() !== ''
                ? devcontainer.name.trim()
                : undefined,
        overlays: analysis.suggestedOverlays as any,
    };

    if (analysis.customDevcontainerPatch || analysis.customComposePatch) {
        selection.customizations = {
            devcontainerPatch: analysis.customDevcontainerPatch ?? undefined,
            dockerComposePatch: analysis.customComposePatch ?? undefined,
        };
    }

    return selection;
}

export function buildCustomDevcontainerPatch(
    devcontainer: any,
    expectedConfig: DevContainer
): Record<string, any> | null {
    const candidatePatch: Record<string, any> = {};

    if (devcontainer.features) {
        candidatePatch.features = devcontainer.features;
    }
    if (devcontainer.customizations) {
        candidatePatch.customizations = devcontainer.customizations;
    }
    if (Array.isArray(devcontainer.mounts) && devcontainer.mounts.length > 0) {
        candidatePatch.mounts = devcontainer.mounts;
    }
    if (devcontainer.remoteUser) {
        candidatePatch.remoteUser = devcontainer.remoteUser;
    }
    if (devcontainer.postCreateCommand) {
        candidatePatch.postCreateCommand = devcontainer.postCreateCommand;
    }
    if (devcontainer.postStartCommand) {
        candidatePatch.postStartCommand = devcontainer.postStartCommand;
    }
    if (devcontainer.remoteEnv) {
        candidatePatch.remoteEnv = devcontainer.remoteEnv;
    }

    const expectedPatch: Record<string, any> = {};
    if (expectedConfig.features) {
        expectedPatch.features = expectedConfig.features;
    }
    if (expectedConfig.customizations) {
        expectedPatch.customizations = expectedConfig.customizations;
    }
    if (expectedConfig.mounts) {
        expectedPatch.mounts = expectedConfig.mounts;
    }
    if (expectedConfig.remoteUser) {
        expectedPatch.remoteUser = expectedConfig.remoteUser;
    }
    if (expectedConfig.postCreateCommand) {
        expectedPatch.postCreateCommand = expectedConfig.postCreateCommand;
    }
    if (expectedConfig.postStartCommand) {
        expectedPatch.postStartCommand = expectedConfig.postStartCommand;
    }
    if (expectedConfig.remoteEnv) {
        expectedPatch.remoteEnv = expectedConfig.remoteEnv;
    }

    const patch = subtractDefaults(candidatePatch, expectedPatch) as
        | Record<string, any>
        | undefined;
    return patch && Object.keys(patch).length > 0 ? patch : null;
}

export function buildCustomComposePatch(
    unmatchedServices: Record<string, any>,
    expectedCompose: Record<string, any>
): Record<string, any> | null {
    if (Object.keys(unmatchedServices).length === 0) {
        return null;
    }

    const candidatePatch = { services: unmatchedServices };
    const expectedPatch = { services: expectedCompose.services ?? {} };
    const patch = subtractDefaults(candidatePatch, expectedPatch) as
        | Record<string, any>
        | undefined;

    return patch?.services && Object.keys(patch.services).length > 0 ? patch : null;
}
