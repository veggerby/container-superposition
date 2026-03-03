/**
 * Adopt command - Analyse an existing .devcontainer/ and suggest overlay-based configuration.
 *
 * Detection tables (feature URIs, VS Code extensions, docker image prefixes) are built
 * dynamically from the overlay registry — no hardcoded overlay IDs here.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import boxen from 'boxen';
import yaml from 'js-yaml';
import { confirm } from '@inquirer/prompts';
import type { OverlaysConfig, SuperpositionManifest } from '../schema/types.js';
import { CURRENT_MANIFEST_VERSION } from '../schema/manifest-migrations.js';
import { getToolVersion } from '../utils/version.js';
import { isInsideGitRepo, createBackup, ensureBackupPatternsInGitignore } from '../utils/backup.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Dynamic detection table building
// ---------------------------------------------------------------------------

interface DetectionTables {
    /** Stripped feature URI → overlay ID */
    featureToOverlay: Record<string, string>;
    /** Image name prefix → overlay ID (first prefix wins on match) */
    imagePrefixToOverlay: Array<{ prefix: string; overlayId: string }>;
    /** Lowercase extension ID → overlay ID */
    extensionToOverlay: Record<string, string>;
}

/**
 * Strip the version suffix from a devcontainer feature URI so that prefix
 * matching works regardless of pinned version.
 * e.g. "ghcr.io/devcontainers/features/node:1" → "ghcr.io/devcontainers/features/node"
 */
function stripFeatureVersion(featureId: string): string {
    return featureId.replace(/:\d+$/, '').replace(/@[^@]+$/, '');
}

/**
 * Extract the image name prefix (registry + repo, without tag) from a docker
 * image string that may contain variable substitutions.
 * e.g. "postgres:${POSTGRES_VERSION:-16}-alpine" → "postgres"
 * e.g. "grafana/grafana:${VERSION:-latest}"       → "grafana/grafana"
 */
function extractImagePrefix(image: string): string {
    // Strip all ${...} variable substitutions, then split on the first colon
    return image
        .replace(/\$\{[^}]+\}/g, '')
        .split(':')[0]
        .replace(/-$/, '')
        .trim();
}

/**
 * Build detection tables by scanning every overlay's devcontainer.patch.json
 * and docker-compose.yml.  This means adopt automatically supports any overlay
 * that exists in the registry — no hardcoded lists.
 */
/**
 * Scoring weights for feature/extension match quality.
 * Higher = better match. Used so that the overlay whose identity most closely
 * matches a feature name wins when multiple overlays share the same feature.
 */
const SCORE_EXACT = 100; // overlay ID === feature segment exactly
const SCORE_ID_STARTS_WITH_SEGMENT = 80; // e.g. "nodejs" starts with segment "node"
const SCORE_SEGMENT_STARTS_WITH_ID = 60; // segment starts with overlay ID
const SCORE_SEGMENT_CONTAINS_ID = 40; // segment contains overlay ID
const SCORE_ID_CONTAINS_SEGMENT = 20; // overlay ID contains segment
const SCORE_NO_MATCH = 0; // no textual relationship

/**
 * Score how well an overlay ID matches a feature URI.
 * Higher score = better match. Used to resolve conflicts when multiple overlays
 * share the same devcontainer feature (e.g. `nodejs` and `bun` both include the
 * `node` feature; `nodejs` should win because its ID starts with the feature's
 * last path segment `node`).
 */
function featureMatchScore(overlayId: string, strippedFeatureUri: string): number {
    // Take the last path segment of the feature URI (the feature name itself)
    const segment = strippedFeatureUri.split('/').pop() ?? '';
    if (overlayId === segment) return SCORE_EXACT;
    if (overlayId.startsWith(segment)) return SCORE_ID_STARTS_WITH_SEGMENT;
    if (segment.startsWith(overlayId)) return SCORE_SEGMENT_STARTS_WITH_ID;
    if (segment.includes(overlayId)) return SCORE_SEGMENT_CONTAINS_ID;
    if (overlayId.includes(segment)) return SCORE_ID_CONTAINS_SEGMENT;
    return SCORE_NO_MATCH;
}

/**
 * Score how well an overlay ID matches a VS Code extension ID.
 * Prevents, e.g., the `bun` overlay's eslint extension from claiming eslint
 * over the `nodejs` overlay which owns it more naturally.
 */
function extensionMatchScore(overlayId: string, extensionId: string): number {
    // Publisher.name → just use the name part for comparison
    const name = extensionId.split('.').pop() ?? extensionId;
    if (name.includes(overlayId)) return SCORE_ID_STARTS_WITH_SEGMENT;
    if (overlayId.includes(name)) return SCORE_SEGMENT_STARTS_WITH_ID;
    return SCORE_NO_MATCH;
}

export function buildDetectionTables(
    overlaysDir: string,
    overlaysConfig: OverlaysConfig
): DetectionTables {
    const featureToOverlayScored: Record<string, { overlayId: string; score: number }> = {};
    const imagePrefixToOverlay: Array<{ prefix: string; overlayId: string }> = [];
    const extensionToOverlayScored: Record<string, { overlayId: string; score: number }> = {};

    for (const overlay of overlaysConfig.overlays) {
        const overlayDir = path.join(overlaysDir, overlay.id);

        // ── devcontainer.patch.json ──────────────────────────────────────
        const patchPath = path.join(overlayDir, 'devcontainer.patch.json');
        if (fs.existsSync(patchPath)) {
            try {
                const patch = JSON.parse(fs.readFileSync(patchPath, 'utf8'));

                // Features (skip local paths like ./features/...)
                for (const featureId of Object.keys(patch.features ?? {})) {
                    if (featureId.startsWith('./') || featureId.startsWith('../')) continue;
                    const stripped = stripFeatureVersion(featureId);
                    const score = featureMatchScore(overlay.id, stripped);
                    const existing = featureToOverlayScored[stripped];
                    if (!existing || score > existing.score) {
                        featureToOverlayScored[stripped] = { overlayId: overlay.id, score };
                    }
                }

                // VS Code extensions — also scored so the most specific overlay wins
                for (const extId of (patch.customizations?.vscode?.extensions ?? []) as string[]) {
                    const lc = extId.toLowerCase();
                    const score = extensionMatchScore(overlay.id, lc);
                    const existing = extensionToOverlayScored[lc];
                    if (!existing || score > existing.score) {
                        extensionToOverlayScored[lc] = { overlayId: overlay.id, score };
                    }
                }
            } catch {
                // Skip malformed patch files
            }
        }

        // ── docker-compose.yml ───────────────────────────────────────────
        const composePath = path.join(overlayDir, 'docker-compose.yml');
        if (fs.existsSync(composePath)) {
            try {
                const compose = yaml.load(fs.readFileSync(composePath, 'utf8')) as any;
                for (const serviceDef of Object.values(compose?.services ?? {})) {
                    const image: string = (serviceDef as any)?.image ?? '';
                    if (!image) continue;
                    const prefix = extractImagePrefix(image);
                    if (prefix && !imagePrefixToOverlay.find((p) => p.prefix === prefix)) {
                        imagePrefixToOverlay.push({ prefix, overlayId: overlay.id });
                    }
                }
            } catch {
                // Skip malformed compose files
            }
        }
    }

    return {
        featureToOverlay: Object.fromEntries(
            Object.entries(featureToOverlayScored).map(([k, v]) => [k, v.overlayId])
        ),
        imagePrefixToOverlay,
        extensionToOverlay: Object.fromEntries(
            Object.entries(extensionToOverlayScored).map(([k, v]) => [k, v.overlayId])
        ),
    };
}

// ---------------------------------------------------------------------------
// Matching helpers (use dynamic tables)
// ---------------------------------------------------------------------------

function matchFeature(featureId: string, tables: DetectionTables): string | null {
    const stripped = stripFeatureVersion(featureId);
    // Exact match first
    if (tables.featureToOverlay[stripped]) return tables.featureToOverlay[stripped];
    // Prefix match (handles minor version variation within the same feature family)
    for (const [uri, overlayId] of Object.entries(tables.featureToOverlay)) {
        if (stripped.startsWith(uri)) return overlayId;
    }
    return null;
}

function matchImage(image: string, tables: DetectionTables): string | null {
    const prefix = extractImagePrefix(image);
    const entry = tables.imagePrefixToOverlay.find(
        (p) => prefix === p.prefix || prefix.startsWith(p.prefix)
    );
    return entry?.overlayId ?? null;
}

function matchExtension(extensionId: string, tables: DetectionTables): string | null {
    return tables.extensionToOverlay[extensionId.toLowerCase()] ?? null;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DetectionConfidence = 'exact' | 'heuristic';
type DetectionSourceType = 'feature' | 'service' | 'extension' | 'remoteenv';

interface DetectionResult {
    source: string;
    overlayId: string;
    confidence: DetectionConfidence;
    sourceType: DetectionSourceType;
}

interface UnmatchedItem {
    source: string;
    reason: string;
}

export interface AdoptOptions {
    dir?: string;
    dryRun?: boolean;
    force?: boolean;
    /** true = --backup, false = --no-backup, undefined = auto (skip in git repos) */
    backup?: boolean;
    backupDir?: string;
    json?: boolean;
}

export interface AnalysisResult {
    detections: DetectionResult[];
    unmatchedItems: UnmatchedItem[];
    customDevcontainerPatch: Record<string, any> | null;
    customComposePatch: Record<string, any> | null;
    suggestedStack: 'plain' | 'compose';
    suggestedOverlays: string[];
    suggestedCommand: string;
    hasDockerCompose: boolean;
}

// ---------------------------------------------------------------------------
// Docker Compose path resolution
// ---------------------------------------------------------------------------

/**
 * Resolve all docker-compose file paths referenced by a devcontainer.json.
 *
 * `dockerComposeFile` may be a string or an array of strings; each path is
 * resolved relative to the devcontainer directory.  Falls back to the
 * conventional `docker-compose.yml` in the same directory.
 */
export function resolveComposePaths(devcontainer: any, devcontainerDir: string): string[] {
    const field = devcontainer.dockerComposeFile;
    const candidates: string[] = [];

    if (field) {
        const rawPaths: string[] = Array.isArray(field) ? field : [field];
        for (const raw of rawPaths) {
            candidates.push(path.resolve(devcontainerDir, raw));
        }
    }

    // Always include the conventional location
    const conventional = path.join(devcontainerDir, 'docker-compose.yml');
    if (!candidates.includes(conventional)) {
        candidates.push(conventional);
    }

    return candidates.filter((p) => fs.existsSync(p));
}

// ---------------------------------------------------------------------------
// Analysis helpers
// ---------------------------------------------------------------------------

function analyseFeatures(
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

function analyseExtensions(
    devcontainer: any,
    tables: DetectionTables
): { detections: DetectionResult[]; unmatchedExtensions: string[] } {
    const detections: DetectionResult[] = [];
    const unmatchedExtensions: string[] = [];
    const extensions: string[] = devcontainer.customizations?.vscode?.extensions ?? [];

    for (const extId of extensions) {
        const overlayId = matchExtension(extId, tables);
        if (overlayId) {
            detections.push({
                source: `extension: ${extId}`,
                overlayId,
                confidence: 'heuristic',
                sourceType: 'extension',
            });
        } else {
            unmatchedExtensions.push(extId);
        }
    }

    return { detections, unmatchedExtensions };
}

function analyseDockerCompose(
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

function analyseRemoteEnv(devcontainer: any, tables: DetectionTables): DetectionResult[] {
    const results: DetectionResult[] = [];
    const env: Record<string, string> = devcontainer.remoteEnv ?? {};

    // Build env-var prefix patterns from overlay IDs that exist in the registry
    // Supplement with a small set of well-known patterns that aren't derivable from overlay files
    const ENV_PATTERNS: Array<{ pattern: RegExp; overlayId: string }> = [
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

    for (const key of Object.keys(env)) {
        for (const { pattern, overlayId } of ENV_PATTERNS) {
            if (pattern.test(key)) {
                results.push({
                    source: `remoteEnv: ${key}`,
                    overlayId,
                    confidence: 'heuristic',
                    sourceType: 'remoteenv',
                });
                break;
            }
        }
    }

    return results;
}

/**
 * Deduplicate: keep one entry per overlayId, preferring `exact` over `heuristic`.
 */
function deduplicateDetections(detections: DetectionResult[]): DetectionResult[] {
    const seen = new Map<string, DetectionResult>();
    for (const d of detections) {
        const existing = seen.get(d.overlayId);
        if (!existing) {
            seen.set(d.overlayId, d);
        } else if (d.confidence === 'exact' && existing.confidence !== 'exact') {
            seen.set(d.overlayId, d);
        }
    }
    return Array.from(seen.values());
}

/**
 * Build the suggested `init` command using overlay categories from the registry.
 */
function buildSuggestedCommand(
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
        const overlay = overlaysConfig.overlays.find((o) => o.id === id);
        if (!overlay) continue; // Skip overlay IDs not in the registry
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

function buildCustomDevcontainerPatch(
    devcontainer: any,
    unmatchedFeatures: Record<string, any>,
    unmatchedExtensions: string[]
): Record<string, any> | null {
    const patch: Record<string, any> = {};

    if (Object.keys(unmatchedFeatures).length > 0) {
        patch.features = unmatchedFeatures;
    }
    if (unmatchedExtensions.length > 0) {
        patch.customizations = { vscode: { extensions: unmatchedExtensions } };
    }
    if (Array.isArray(devcontainer.mounts) && devcontainer.mounts.length > 0) {
        patch.mounts = devcontainer.mounts;
    }
    if (devcontainer.remoteUser && devcontainer.remoteUser !== 'vscode') {
        patch.remoteUser = devcontainer.remoteUser;
    }
    // Lifecycle commands — included as-is; the user should review the custom/
    // patch and remove anything that is already handled by overlay setup scripts.
    if (devcontainer.postCreateCommand) {
        patch.postCreateCommand = devcontainer.postCreateCommand;
    }
    if (devcontainer.postStartCommand) {
        patch.postStartCommand = devcontainer.postStartCommand;
    }

    return Object.keys(patch).length > 0 ? patch : null;
}

function buildCustomComposePatch(
    unmatchedServices: Record<string, any>
): Record<string, any> | null {
    if (Object.keys(unmatchedServices).length === 0) return null;
    return { services: unmatchedServices };
}

// ---------------------------------------------------------------------------
// Full analysis
// ---------------------------------------------------------------------------

export function analyseDevcontainer(
    dir: string,
    overlaysConfig: OverlaysConfig,
    tables: DetectionTables
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

    const composePaths = resolveComposePaths(devcontainer, dir);

    const featureResult = analyseFeatures(devcontainer, tables);
    const composeResult = analyseDockerCompose(composePaths, tables);
    const extensionResult = analyseExtensions(devcontainer, tables);
    const remoteEnvResults = analyseRemoteEnv(devcontainer, tables);

    const detections = deduplicateDetections([
        ...featureResult.detections,
        ...composeResult.detections,
        ...extensionResult.detections,
        ...remoteEnvResults,
    ]);

    const hasDockerCompose = composePaths.length > 0;
    const hasServiceSignals = detections.some((d) => d.sourceType === 'service');
    const suggestedStack: 'plain' | 'compose' =
        hasDockerCompose || hasServiceSignals ? 'compose' : 'plain';

    const knownIds = new Set(overlaysConfig.overlays.map((o) => o.id));
    const suggestedOverlays = [...new Set(detections.map((d) => d.overlayId))].filter((id) =>
        knownIds.has(id)
    );

    const suggestedCommand = buildSuggestedCommand(
        suggestedOverlays,
        suggestedStack,
        overlaysConfig
    );

    // Unmatched item descriptions for display / JSON
    const unmatchedItems: UnmatchedItem[] = [];
    for (const fid of Object.keys(featureResult.unmatchedFeatures)) {
        unmatchedItems.push({
            source: fid,
            reason: 'No overlay covers this feature — preserve in custom/devcontainer.patch.json',
        });
    }
    for (const [name, def] of Object.entries(composeResult.unmatchedServices)) {
        const image = (def as any)?.image ?? '(no image)';
        unmatchedItems.push({
            source: `service: ${name} (image: ${image})`,
            reason: 'No overlay covers this service — preserve in custom/docker-compose.patch.yml',
        });
    }
    for (const extId of extensionResult.unmatchedExtensions) {
        unmatchedItems.push({
            source: `extension: ${extId}`,
            reason: 'No overlay installs this extension — preserve in custom/devcontainer.patch.json',
        });
    }
    if (Array.isArray(devcontainer.mounts) && devcontainer.mounts.length > 0) {
        unmatchedItems.push({
            source: `mounts (${devcontainer.mounts.length} mount(s))`,
            reason: 'Custom mounts are not managed by overlays — preserve in custom/devcontainer.patch.json',
        });
    }
    if (devcontainer.remoteUser && devcontainer.remoteUser !== 'vscode') {
        unmatchedItems.push({
            source: `remoteUser: ${devcontainer.remoteUser}`,
            reason: 'Custom remote user — preserve in custom/devcontainer.patch.json',
        });
    }

    const customDevcontainerPatch = buildCustomDevcontainerPatch(
        devcontainer,
        featureResult.unmatchedFeatures,
        extensionResult.unmatchedExtensions
    );
    const customComposePatch = buildCustomComposePatch(composeResult.unmatchedServices);

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

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function formatConfidence(c: DetectionConfidence): string {
    return c === 'exact' ? chalk.green('exact') : chalk.yellow('heuristic');
}

function formatAnalysisTable(detections: DetectionResult[], knownIds: Set<string>): string {
    if (detections.length === 0) return chalk.dim('  (no recognisable patterns found)');

    const sourceColWidth = 58;
    const arrowColWidth = 4;
    const overlayColWidth = 22;
    const lines = [
        chalk.bold(
            'Source'.padEnd(sourceColWidth) +
                '→'.padEnd(arrowColWidth) +
                'Overlay'.padEnd(overlayColWidth) +
                'Confidence'
        ),
        '─'.repeat(sourceColWidth + arrowColWidth + overlayColWidth + 12),
    ];
    for (const d of detections) {
        const src = d.source.slice(0, sourceColWidth - 2).padEnd(sourceColWidth);
        const overlay = knownIds.has(d.overlayId)
            ? chalk.cyan(d.overlayId.padEnd(overlayColWidth))
            : chalk.dim(`${d.overlayId} (unknown)`.padEnd(overlayColWidth));
        lines.push(
            `${src}${chalk.dim('→'.padEnd(arrowColWidth))}${overlay}${formatConfidence(d.confidence)}`
        );
    }
    return lines.join('\n');
}

function formatUnmatchedTable(items: UnmatchedItem[]): string {
    const s = 60;
    const lines = [chalk.bold('Source'.padEnd(s) + 'Action'), '─'.repeat(s + 52)];
    for (const item of items) {
        lines.push(`${item.source.slice(0, s - 2).padEnd(s)}${chalk.dim(item.reason)}`);
    }
    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

export async function adoptCommand(
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    options: AdoptOptions
) {
    const dir = options.dir ?? './.devcontainer';
    const absoluteDir = path.resolve(dir);

    if (!fs.existsSync(absoluteDir)) {
        console.error(chalk.red(`✗ Directory not found: ${absoluteDir}`));
        console.log(
            chalk.dim(
                `\n💡 Specify a different path with --dir, e.g. --dir path/to/.devcontainer\n`
            )
        );
        process.exit(1);
    }

    const devcontainerJsonPath = path.join(absoluteDir, 'devcontainer.json');
    if (!fs.existsSync(devcontainerJsonPath)) {
        console.error(chalk.red(`✗ No devcontainer.json found in ${absoluteDir}`));
        process.exit(1);
    }

    // Build detection tables dynamically from the overlay registry
    const tables = buildDetectionTables(overlaysDir, overlaysConfig);

    // ── Analyse ────────────────────────────────────────────────────────────
    const analysis = analyseDevcontainer(absoluteDir, overlaysConfig, tables);

    // ── JSON output (no decoration) ────────────────────────────────────────
    if (options.json) {
        console.log(
            JSON.stringify(
                {
                    dir: absoluteDir,
                    detections: analysis.detections,
                    unmatchedItems: analysis.unmatchedItems,
                    customDevcontainerPatch: analysis.customDevcontainerPatch,
                    customComposePatch: analysis.customComposePatch,
                    suggestedStack: analysis.suggestedStack,
                    suggestedOverlays: analysis.suggestedOverlays,
                    suggestedCommand: analysis.suggestedCommand,
                },
                null,
                2
            )
        );
        return;
    }

    // ── Header ─────────────────────────────────────────────────────────────
    console.log(
        '\n' +
            boxen(chalk.bold('🔍 Adopt Analysis'), {
                padding: 0.5,
                borderColor: 'cyan',
                borderStyle: 'round',
            })
    );

    console.log(chalk.dim(`\nAnalysing ${path.relative(process.cwd(), devcontainerJsonPath)}...`));
    const devcontainer = JSON.parse(fs.readFileSync(devcontainerJsonPath, 'utf8'));
    for (const cp of resolveComposePaths(devcontainer, absoluteDir)) {
        console.log(chalk.dim(`Analysing ${path.relative(process.cwd(), cp)}...`));
    }

    // ── Matched detections table ───────────────────────────────────────────
    const knownIds = new Set(overlaysConfig.overlays.map((o) => o.id));
    console.log('\n' + chalk.bold('Detected features / services → suggested overlays'));
    console.log(chalk.dim('─'.repeat(80)));
    console.log(formatAnalysisTable(analysis.detections, knownIds));

    // ── Unmatched items table ──────────────────────────────────────────────
    if (analysis.unmatchedItems.length > 0) {
        console.log('\n' + chalk.bold('Items with no overlay equivalent → custom/'));
        console.log(chalk.dim('─'.repeat(80)));
        console.log(formatUnmatchedTable(analysis.unmatchedItems));
    }

    // ── No overlays found ──────────────────────────────────────────────────
    if (analysis.suggestedOverlays.length === 0) {
        console.log(
            '\n' +
                chalk.yellow(
                    '⚠  No recognisable overlay patterns detected.\n' +
                        '   Your devcontainer may use entirely custom configuration\n' +
                        '   that does not map to any available overlays.'
                )
        );
        console.log(
            chalk.dim(
                '\n💡 You can still run:\n   container-superposition init\n   to create a new configuration interactively.\n'
            )
        );
        return;
    }

    // ── Suggested command ──────────────────────────────────────────────────
    console.log('\n' + chalk.bold('Suggested command:'));
    console.log('  ' + chalk.cyan(analysis.suggestedCommand));

    if (analysis.customDevcontainerPatch || analysis.customComposePatch) {
        console.log(
            chalk.dim(
                '\n💡 Custom patches will be written to .devcontainer/custom/ to preserve\n' +
                    '   any configuration that has no overlay equivalent.'
            )
        );
    }

    if (options.dryRun) {
        console.log(chalk.dim('\n(--dry-run: no files written)\n'));
        return;
    }

    // ── Guard: existing files ──────────────────────────────────────────────
    const manifestPath = path.join(absoluteDir, 'superposition.json');
    const customDir = path.join(absoluteDir, 'custom');
    const customPatchPath = path.join(customDir, 'devcontainer.patch.json');
    const customComposePath = path.join(customDir, 'docker-compose.patch.yml');

    const existingFiles: string[] = [];
    if (fs.existsSync(manifestPath)) existingFiles.push(path.relative(process.cwd(), manifestPath));
    if (analysis.customDevcontainerPatch && fs.existsSync(customPatchPath))
        existingFiles.push(path.relative(process.cwd(), customPatchPath));
    if (analysis.customComposePatch && fs.existsSync(customComposePath))
        existingFiles.push(path.relative(process.cwd(), customComposePath));

    if (existingFiles.length > 0 && !options.force) {
        console.log(
            '\n' +
                chalk.yellow(
                    '⚠  The following file(s) already exist:\n' +
                        existingFiles.map((f) => `   • ${f}`).join('\n') +
                        '\n   Use --force to overwrite them.'
                )
        );
        return;
    }

    // ── Prompt ────────────────────────────────────────────────────────────
    const hasCustomFiles = analysis.customDevcontainerPatch || analysis.customComposePatch;
    let confirmed: boolean;
    try {
        confirmed = await confirm({
            message: `Generate superposition.json${hasCustomFiles ? ' and custom/ patch files' : ''} from these suggestions?`,
            default: true,
        });
    } catch {
        // AbortPromptError (Ctrl+C) or ExitPromptError (non-interactive) — treat as "no"
        confirmed = false;
    }

    if (!confirmed) {
        console.log(chalk.dim('\nAborted. No files written.\n'));
        return;
    }

    // ── Backup (same logic as regen) ───────────────────────────────────────
    // Backup happens AFTER confirmation and BEFORE writes so we only create
    // backups when we're actually about to change things.
    //
    // --backup   → force backup
    // --no-backup → skip backup
    // (neither)  → skip when inside a git repo (git already tracks history)
    const inGitRepo = isInsideGitRepo(absoluteDir);
    let shouldBackup: boolean;
    if (options.backup === true) {
        shouldBackup = true;
    } else if (options.backup === false) {
        shouldBackup = false;
    } else {
        shouldBackup = !inGitRepo;
        if (!shouldBackup) {
            console.log(
                chalk.dim('\nℹ  Skipping backup — git repo detected (use --backup to force one)')
            );
        }
    }

    if (shouldBackup) {
        const backupPath = await createBackup(absoluteDir, options.backupDir);
        if (backupPath) {
            console.log(
                chalk.dim(`\n💾 Backup created at ${path.relative(process.cwd(), backupPath)}`)
            );
            ensureBackupPatternsInGitignore(absoluteDir);
        }
    }

    // ── Write superposition.json ───────────────────────────────────────────
    const manifest: SuperpositionManifest = {
        manifestVersion: CURRENT_MANIFEST_VERSION,
        generatedBy: `container-superposition@${getToolVersion()} adopt`,
        generated: new Date().toISOString(),
        baseTemplate: analysis.suggestedStack,
        baseImage: 'bookworm',
        overlays: analysis.suggestedOverlays,
    };

    try {
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
        console.log('\n' + chalk.green(`✓ Written ${path.relative(process.cwd(), manifestPath)}`));
    } catch (err) {
        console.error(chalk.red('✗ Failed to write superposition.json:'), err);
        process.exit(1);
    }

    // ── Write custom patches ───────────────────────────────────────────────
    if (hasCustomFiles) {
        try {
            fs.mkdirSync(customDir, { recursive: true });
        } catch (err) {
            console.error(chalk.red('✗ Failed to create custom/ directory:'), err);
            process.exit(1);
        }
    }

    if (analysis.customDevcontainerPatch) {
        try {
            fs.writeFileSync(
                customPatchPath,
                JSON.stringify(analysis.customDevcontainerPatch, null, 4) + '\n',
                'utf8'
            );
            console.log(chalk.green(`✓ Written ${path.relative(process.cwd(), customPatchPath)}`));
        } catch (err) {
            console.error(chalk.red('✗ Failed to write custom/devcontainer.patch.json:'), err);
            process.exit(1);
        }
    }

    if (analysis.customComposePatch) {
        try {
            const header =
                '# Custom Docker Compose services preserved from original configuration.\n' +
                '# These services have no equivalent overlay and will be merged into\n' +
                '# docker-compose.yml during regeneration.\n';
            fs.writeFileSync(
                customComposePath,
                header + (yaml.dump(analysis.customComposePatch) as string),
                'utf8'
            );
            console.log(
                chalk.green(`✓ Written ${path.relative(process.cwd(), customComposePath)}`)
            );
        } catch (err) {
            console.error(chalk.red('✗ Failed to write custom/docker-compose.patch.yml:'), err);
            process.exit(1);
        }
    }

    console.log(
        chalk.dim(
            '\n💡 Next steps:\n' +
                '   1. Review and adjust superposition.json as needed\n' +
                '   2. Run: container-superposition regen\n' +
                (hasCustomFiles
                    ? '   3. Review custom/ patches — they will be merged automatically on every regen\n'
                    : '')
        )
    );
}
