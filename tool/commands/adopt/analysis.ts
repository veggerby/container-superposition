import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import type { OverlaysConfig } from '../../schema/types.js';
import {
    buildCustomComposePatch,
    buildCustomDevcontainerPatch,
    buildExpectedComposeConfig,
    buildExpectedDevcontainerConfig,
    inferBaseImageSelection,
} from './synthesis.js';
import { matchExtension, matchFeature, matchImage } from './detection.js';
import type {
    AnalysisResult,
    AnalyseLoadedDevcontainerInput,
    DetectionResult,
    DetectionTables,
} from './types.js';

export function resolveComposePaths(devcontainer: any, devcontainerDir: string): string[] {
    const field = devcontainer.dockerComposeFile;

    if (field) {
        const rawPaths: string[] = Array.isArray(field) ? field : [field];
        return [...new Set(rawPaths.map((raw) => path.resolve(devcontainerDir, raw)))].filter((p) =>
            fs.existsSync(p)
        );
    }

    const conventional = path.join(devcontainerDir, 'docker-compose.yml');
    return fs.existsSync(conventional) ? [conventional] : [];
}

export function analyseFeatures(
    devcontainer: any,
    tables: DetectionTables
): { detections: DetectionResult[]; unmatchedFeatures: Record<string, any> } {
    const detections: DetectionResult[] = [];
    const unmatchedFeatures: Record<string, any> = {};
    const features: Record<string, any> = devcontainer.features ?? {};

    for (const [featureId, featureConfig] of Object.entries(features)) {
        if (featureId.startsWith('./') || featureId.startsWith('../')) continue;
        const overlayId = matchFeature(featureId, tables);
        if (overlayId) {
            detections.push({
                source: featureId,
                overlayId,
                confidence: 'exact',
                sourceType: 'feature',
            });
        } else {
            unmatchedFeatures[featureId] = featureConfig;
        }
    }

    return { detections, unmatchedFeatures };
}

export function analyseExtensions(
    devcontainer: any,
    tables: DetectionTables
): { detections: DetectionResult[]; unmatchedExtensions: string[] } {
    const detections: DetectionResult[] = [];
    const unmatchedExtensions: string[] = [];
    const extensions: string[] = devcontainer.customizations?.vscode?.extensions ?? [];

    for (const extensionId of extensions) {
        const overlayId = matchExtension(extensionId, tables);
        if (overlayId) {
            detections.push({
                source: `extension: ${extensionId}`,
                overlayId,
                confidence: 'heuristic',
                sourceType: 'extension',
            });
        } else {
            unmatchedExtensions.push(extensionId);
        }
    }

    return { detections, unmatchedExtensions };
}

export function analyseDockerCompose(
    composePaths: string[],
    tables: DetectionTables
): { detections: DetectionResult[]; unmatchedServices: Record<string, any> } {
    const detections: DetectionResult[] = [];
    const unmatchedServices: Record<string, any> = {};

    for (const composePath of composePaths) {
        let parsed: any;
        try {
            parsed = yaml.load(fs.readFileSync(composePath, 'utf8'));
        } catch {
            continue;
        }

        for (const [serviceName, serviceDef] of Object.entries(
            parsed?.services ?? ({} as Record<string, any>)
        )) {
            const image: string = (serviceDef as any)?.image ?? '';
            const volumes = Array.isArray((serviceDef as any)?.volumes)
                ? ((serviceDef as any).volumes as unknown[])
                : [];

            if (
                volumes.some(
                    (volume) =>
                        typeof volume === 'string' &&
                        volume.includes('/var/run/docker.sock:/var/run/docker-host.sock')
                )
            ) {
                detections.push({
                    source: `service: ${serviceName} (docker socket mount)`,
                    overlayId: 'docker-sock',
                    confidence: 'heuristic',
                    sourceType: 'service',
                });
            }

            if (!image) continue;

            const overlayId = matchImage(image, tables);
            if (overlayId) {
                detections.push({
                    source: `service: ${serviceName} (image: ${image})`,
                    overlayId,
                    confidence: 'exact',
                    sourceType: 'service',
                });
            } else {
                unmatchedServices[serviceName] = serviceDef;
            }
        }
    }

    return { detections, unmatchedServices };
}

export function analyseRemoteEnv(devcontainer: any): {
    detections: DetectionResult[];
    unmatchedRemoteEnv: Record<string, string>;
} {
    const detections: DetectionResult[] = [];
    const unmatchedRemoteEnv: Record<string, string> = {};
    const env: Record<string, string> = devcontainer.remoteEnv ?? {};

    const envPatterns: Array<{ pattern: RegExp; overlayId: string }> = [
        { pattern: /^POSTGRES_/, overlayId: 'postgres' },
        { pattern: /^PG(HOST|PORT|USER|PASSWORD|DB)$/, overlayId: 'postgres' },
        { pattern: /^REDIS_/, overlayId: 'redis' },
        { pattern: /^MONGO(DB)?_/, overlayId: 'mongodb' },
        { pattern: /^MYSQL_/, overlayId: 'mysql' },
        { pattern: /^MSSQL_/, overlayId: 'sqlserver' },
        { pattern: /^AWS_/, overlayId: 'aws-cli' },
        { pattern: /^AZURE_/, overlayId: 'azure-cli' },
        { pattern: /^GOOGLE_CLOUD_/, overlayId: 'gcloud' },
    ];

    for (const [key, value] of Object.entries(env)) {
        let matched = false;
        for (const { pattern, overlayId } of envPatterns) {
            if (pattern.test(key)) {
                detections.push({
                    source: `remoteEnv: ${key}`,
                    overlayId,
                    confidence: 'heuristic',
                    sourceType: 'remoteenv',
                });
                matched = true;
                break;
            }
        }
        if (!matched) {
            unmatchedRemoteEnv[key] = value;
        }
    }

    return { detections, unmatchedRemoteEnv };
}

export function normalizeCommandMap(
    commands: unknown
): { entries: Record<string, string>; isString: boolean } | null {
    if (typeof commands === 'string') {
        return { entries: { default: commands }, isString: true };
    }

    if (!commands || typeof commands !== 'object' || Array.isArray(commands)) {
        return null;
    }

    const entries: Record<string, string> = {};
    for (const [key, value] of Object.entries(commands)) {
        if (typeof value === 'string') {
            entries[key] = value;
        }
    }

    return Object.keys(entries).length > 0 ? { entries, isString: false } : null;
}

export function findOverlayIdsInCommandMap(
    commands: unknown,
    overlaysConfig: OverlaysConfig
): DetectionResult[] {
    const normalized = normalizeCommandMap(commands);
    if (!normalized) {
        return [];
    }

    const knownOverlays = new Set(overlaysConfig.overlays.map((overlay) => overlay.id));
    const detections = new Map<string, DetectionResult>();

    for (const [key, value] of Object.entries(normalized.entries)) {
        const patterns = [
            key.match(/^(?:setup|verify)-([a-z0-9-]+)$/i),
            value.match(/(?:^|\/)(?:setup|verify)-([a-z0-9-]+)\.sh\b/i),
        ];

        for (const match of patterns) {
            const overlayId = match?.[1];
            if (!overlayId || !knownOverlays.has(overlayId) || detections.has(overlayId)) {
                continue;
            }

            detections.set(overlayId, {
                source: `command: ${key}`,
                overlayId,
                confidence: 'heuristic',
                sourceType: 'script',
            });
        }
    }

    return Array.from(detections.values());
}

export function analyseCommands(
    devcontainer: any,
    overlaysConfig: OverlaysConfig
): { detections: DetectionResult[] } {
    return {
        detections: [
            ...findOverlayIdsInCommandMap(devcontainer.postCreateCommand, overlaysConfig),
            ...findOverlayIdsInCommandMap(devcontainer.postStartCommand, overlaysConfig),
        ],
    };
}

export function deduplicateDetections(detections: DetectionResult[]): DetectionResult[] {
    const seen = new Map<string, DetectionResult>();
    for (const detection of detections) {
        const existing = seen.get(detection.overlayId);
        if (!existing) {
            seen.set(detection.overlayId, detection);
        } else if (detection.confidence === 'exact' && existing.confidence !== 'exact') {
            seen.set(detection.overlayId, detection);
        }
    }
    return Array.from(seen.values());
}

export function buildSuggestedCommand(
    overlayIds: string[],
    stack: 'plain' | 'compose',
    overlaysConfig: OverlaysConfig
): string {
    const language: string[] = [];
    const database: string[] = [];
    const observability: string[] = [];
    const cloudTools: string[] = [];
    const devTools: string[] = [];
    const other: string[] = [];

    for (const id of overlayIds) {
        const overlay = overlaysConfig.overlays.find((entry) => entry.id === id);
        if (!overlay) continue;

        switch (overlay.category) {
            case 'language':
                language.push(id);
                break;
            case 'database':
                database.push(id);
                break;
            case 'observability':
                observability.push(id);
                break;
            case 'cloud':
                cloudTools.push(id);
                break;
            case 'dev':
                devTools.push(id);
                break;
            default:
                other.push(id);
        }
    }

    const parts = ['container-superposition init', `--stack ${stack}`];
    if (language.length > 0) parts.push(`--language ${language.join(',')}`);
    if (database.length > 0) parts.push(`--database ${database.join(',')}`);
    if (observability.length > 0) parts.push(`--observability ${observability.join(',')}`);
    if (cloudTools.length > 0) parts.push(`--cloud-tools ${cloudTools.join(',')}`);
    if (devTools.length > 0) parts.push(`--dev-tools ${devTools.join(',')}`);
    if (other.length > 0) parts.push(`--overlays ${other.join(',')}`);

    return parts.join(' ');
}

function buildUnmatchedItems(analysis: {
    customDevcontainerPatch: Record<string, any> | null;
    customComposePatch: Record<string, any> | null;
}): AnalysisResult['unmatchedItems'] {
    const unmatchedItems: AnalysisResult['unmatchedItems'] = [];

    for (const featureId of Object.keys(analysis.customDevcontainerPatch?.features ?? {})) {
        unmatchedItems.push({
            source: featureId,
            reason: 'No overlay covers this feature — preserve in custom/devcontainer.patch.json',
        });
    }

    const preservedExtensions =
        analysis.customDevcontainerPatch?.customizations?.vscode?.extensions ?? [];
    for (const extensionId of preservedExtensions) {
        unmatchedItems.push({
            source: `extension: ${extensionId}`,
            reason: 'No overlay installs this extension — preserve in custom/devcontainer.patch.json',
        });
    }

    if (
        Array.isArray(analysis.customDevcontainerPatch?.mounts) &&
        analysis.customDevcontainerPatch.mounts.length > 0
    ) {
        unmatchedItems.push({
            source: `mounts (${analysis.customDevcontainerPatch.mounts.length} mount(s))`,
            reason: 'Custom mounts are not managed by overlays — preserve in custom/devcontainer.patch.json',
        });
    }

    if (analysis.customDevcontainerPatch?.remoteUser) {
        unmatchedItems.push({
            source: `remoteUser: ${analysis.customDevcontainerPatch.remoteUser}`,
            reason: 'Custom remote user — preserve in custom/devcontainer.patch.json',
        });
    }

    for (const [key] of Object.entries(analysis.customDevcontainerPatch?.remoteEnv ?? {})) {
        unmatchedItems.push({
            source: `remoteEnv: ${key}`,
            reason: 'Custom environment variable — preserve in custom/devcontainer.patch.json',
        });
    }

    for (const [key] of Object.entries(
        normalizeCommandMap(analysis.customDevcontainerPatch?.postCreateCommand)?.entries ?? {}
    )) {
        unmatchedItems.push({
            source: `postCreateCommand: ${key}`,
            reason: 'Custom lifecycle command — preserve in custom/devcontainer.patch.json',
        });
    }

    for (const [key] of Object.entries(
        normalizeCommandMap(analysis.customDevcontainerPatch?.postStartCommand)?.entries ?? {}
    )) {
        unmatchedItems.push({
            source: `postStartCommand: ${key}`,
            reason: 'Custom lifecycle command — preserve in custom/devcontainer.patch.json',
        });
    }

    for (const [serviceName, serviceDef] of Object.entries(
        analysis.customComposePatch?.services ?? {}
    )) {
        const image = (serviceDef as any)?.image ?? '(no image)';
        unmatchedItems.push({
            source: `service: ${serviceName} (image: ${image})`,
            reason: 'No overlay covers this service — preserve in custom/docker-compose.patch.yml',
        });
    }

    return unmatchedItems;
}

export function analyseLoadedDevcontainer({
    devcontainer,
    dir,
    overlaysConfig,
    tables,
    overlaysDir,
}: AnalyseLoadedDevcontainerInput): AnalysisResult {
    const composePaths = resolveComposePaths(devcontainer, dir);

    const featureResult = analyseFeatures(devcontainer, tables);
    const composeResult = analyseDockerCompose(composePaths, tables);
    const extensionResult = analyseExtensions(devcontainer, tables);
    const remoteEnvResult = analyseRemoteEnv(devcontainer);
    const commandResult = analyseCommands(devcontainer, overlaysConfig);

    const detections = deduplicateDetections([
        ...featureResult.detections,
        ...composeResult.detections,
        ...extensionResult.detections,
        ...remoteEnvResult.detections,
        ...commandResult.detections,
    ]);

    const hasDockerCompose = composePaths.length > 0;
    const hasServiceSignals = detections.some((detection) => detection.sourceType === 'service');
    const suggestedStack: 'plain' | 'compose' =
        hasDockerCompose || hasServiceSignals ? 'compose' : 'plain';

    const knownIds = new Set(overlaysConfig.overlays.map((overlay) => overlay.id));
    const suggestedOverlays = [
        ...new Set(detections.map((detection) => detection.overlayId)),
    ].filter((id) => knownIds.has(id));

    const suggestedCommand = buildSuggestedCommand(
        suggestedOverlays,
        suggestedStack,
        overlaysConfig
    );

    const baseImageSelection = inferBaseImageSelection(
        devcontainer,
        composePaths,
        overlaysConfig,
        suggestedStack
    );
    const expectedDevcontainerConfig = buildExpectedDevcontainerConfig(
        suggestedStack,
        suggestedOverlays,
        overlaysDir
    );
    const expectedComposeConfig =
        suggestedStack === 'compose'
            ? buildExpectedComposeConfig(
                  suggestedOverlays,
                  overlaysDir,
                  baseImageSelection,
                  overlaysConfig
              )
            : {};

    const customDevcontainerPatch = buildCustomDevcontainerPatch(
        devcontainer,
        expectedDevcontainerConfig
    );
    const customComposePatch = buildCustomComposePatch(
        composeResult.unmatchedServices,
        expectedComposeConfig
    );
    const unmatchedItems = buildUnmatchedItems({
        customDevcontainerPatch,
        customComposePatch,
    });

    return {
        detections,
        unmatchedItems,
        customDevcontainerPatch,
        customComposePatch,
        suggestedStack,
        suggestedOverlays,
        suggestedCommand,
        hasDockerCompose,
    };
}

export function analyseDevcontainer(
    dir: string,
    overlaysConfig: OverlaysConfig,
    tables: DetectionTables,
    overlaysDir: string
): AnalysisResult {
    const devcontainerPath = path.join(dir, 'devcontainer.json');

    let devcontainer: any = {};
    if (fs.existsSync(devcontainerPath)) {
        try {
            devcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf8'));
        } catch {
            devcontainer = {};
        }
    }

    return analyseLoadedDevcontainer({
        devcontainer,
        dir,
        overlaysConfig,
        tables,
        overlaysDir,
    });
}
