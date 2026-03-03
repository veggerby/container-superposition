/**
 * Upgrade command - Analyse an existing .devcontainer/ and suggest overlay-based configuration
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

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Static detection tables
// ---------------------------------------------------------------------------

/**
 * Maps devcontainer feature URIs (prefix match) to overlay IDs.
 * Key: feature URI prefix (without version tag)
 * Value: overlay ID
 */
const FEATURE_TO_OVERLAY: Record<string, string> = {
    'ghcr.io/devcontainers/features/node': 'nodejs',
    'ghcr.io/devcontainers/features/python': 'python',
    'ghcr.io/devcontainers/features/dotnet': 'dotnet',
    'ghcr.io/devcontainers/features/go': 'go',
    'ghcr.io/devcontainers/features/java': 'java',
    'ghcr.io/devcontainers/features/rust': 'rust',
    'ghcr.io/devcontainers/features/powershell': 'powershell',
    'ghcr.io/devcontainers/features/aws-cli': 'aws-cli',
    'ghcr.io/devcontainers/features/azure-cli': 'azure-cli',
    'ghcr.io/devcontainers/features/google-cloud-cli': 'gcloud',
    'ghcr.io/devcontainers/features/kubectl-helm-minikube': 'kubectl-helm',
    'ghcr.io/devcontainers/features/terraform': 'terraform',
    'ghcr.io/devcontainers/features/pulumi': 'pulumi',
    'ghcr.io/devcontainers/features/docker-in-docker': 'docker-in-docker',
    'ghcr.io/devcontainers/features/docker-outside-of-docker': 'docker-sock',
    'ghcr.io/devcontainers/features/git': 'git-helpers',
    'ghcr.io/devcontainers/features/git-lfs': 'git-helpers',
    'ghcr.io/devcontainers/features/github-cli': 'git-helpers',
    'ghcr.io/devcontainers-extra/features/mkdocs': 'mkdocs',
    'ghcr.io/robbert229/devcontainer-features/postgresql-client': 'postgres',
};

/**
 * Maps docker image name patterns (regex) to overlay IDs.
 */
const IMAGE_PATTERN_TO_OVERLAY: Array<{ pattern: RegExp; overlayId: string }> = [
    { pattern: /^postgres(ql)?[:\-]/, overlayId: 'postgres' },
    { pattern: /^redis[:\-]/, overlayId: 'redis' },
    { pattern: /^mongo(db)?[:\-]/, overlayId: 'mongodb' },
    { pattern: /^mysql[:\-]/, overlayId: 'mysql' },
    { pattern: /^prom\/prometheus[:\-]/, overlayId: 'prometheus' },
    { pattern: /^grafana\/grafana[:\-]/, overlayId: 'grafana' },
    { pattern: /^grafana\/loki[:\-]/, overlayId: 'loki' },
    { pattern: /^grafana\/tempo[:\-]/, overlayId: 'tempo' },
    { pattern: /^grafana\/promtail[:\-]/, overlayId: 'promtail' },
    { pattern: /^jaegertracing\/all-in-one[:\-]/, overlayId: 'jaeger' },
    { pattern: /^otel\/opentelemetry-collector/, overlayId: 'otel-collector' },
    { pattern: /^rabbitmq[:\-]/, overlayId: 'rabbitmq' },
    { pattern: /^minio\/minio[:\-]/, overlayId: 'minio' },
    { pattern: /^mcr\.microsoft\.com\/mssql\/server/, overlayId: 'sqlserver' },
    { pattern: /^localstack\/localstack[:\-]/, overlayId: 'localstack' },
    { pattern: /^nats[:\-]/, overlayId: 'nats' },
    { pattern: /^jupyter\//, overlayId: 'jupyter' },
    { pattern: /^quay\.io\/keycloak\/keycloak[:\-]/, overlayId: 'keycloak' },
    { pattern: /^axllent\/mailpit[:\-]/, overlayId: 'mailpit' },
    { pattern: /^docker\.redpanda\.com\/redpandadata\/redpanda[:\-]/, overlayId: 'redpanda' },
    { pattern: /^docker\.redpanda\.com\/redpandadata\/console[:\-]/, overlayId: 'redpanda' },
    { pattern: /^prom\/alertmanager[:\-]/, overlayId: 'alertmanager' },
    { pattern: /^minio\/mc[:\-]/, overlayId: 'minio' },
    { pattern: /^mongo-express[:\-]/, overlayId: 'mongodb' },
    { pattern: /^phpmyadmin[:\-]/, overlayId: 'mysql' },
];

/**
 * Maps VS Code extension IDs to overlay IDs.
 */
const EXTENSION_TO_OVERLAY: Record<string, string> = {
    'ms-python.python': 'python',
    'ms-python.vscode-pylance': 'python',
    'ms-python.black-formatter': 'python',
    'golang.go': 'go',
    'rust-lang.rust-analyzer': 'rust',
    'ms-dotnettools.csdevkit': 'dotnet',
    'ms-dotnettools.csharp': 'dotnet',
    'vscjava.vscode-java-pack': 'java',
    'vscjava.vscode-gradle': 'java',
    'vscjava.vscode-maven': 'java',
    'dbaeumer.vscode-eslint': 'nodejs',
    'christian-kohler.npm-intellisense': 'nodejs',
    'oven.bun-vscode': 'bun',
    'ms-vscode.powershell': 'powershell',
    'hashicorp.terraform': 'terraform',
    'pulumi.pulumi-lsp-client': 'pulumi',
    'googlecloudtools.cloudcode': 'gcloud',
    'amazonwebservices.aws-toolkit-vscode': 'aws-cli',
    'eamodio.gitlens': 'git-helpers',
    'github.vscode-pull-request-github': 'git-helpers',
    'mhutchie.git-graph': 'git-helpers',
    'mongodb.mongodb-vscode': 'mongodb',
    'cweijan.vscode-mysql-client2': 'mysql',
    'ms-mssql.mssql': 'sqlserver',
    'qwtel.sqlite-viewer': 'sqlite',
    'alexcvzz.vscode-sqlite': 'sqlite',
    'yzhang.markdown-all-in-one': 'mkdocs',
    'davidanson.vscode-markdownlint': 'mkdocs',
    'zxh404.vscode-proto3': 'grpc-tools',
    'bufbuild.vscode-buf': 'grpc-tools',
};

/**
 * Overlay IDs that fall into known category buckets for CLI flag generation.
 * Overlays not listed here are treated as generic --overlays items.
 */
const LANGUAGE_OVERLAYS = new Set([
    'nodejs',
    'python',
    'dotnet',
    'go',
    'java',
    'rust',
    'bun',
    'powershell',
    'mkdocs',
]);
const DATABASE_OVERLAYS = new Set([
    'postgres',
    'redis',
    'mongodb',
    'mysql',
    'sqlserver',
    'sqlite',
    'minio',
    'rabbitmq',
    'redpanda',
    'nats',
]);
const OBSERVABILITY_OVERLAYS = new Set([
    'otel-collector',
    'jaeger',
    'prometheus',
    'grafana',
    'loki',
    'tempo',
    'promtail',
    'alertmanager',
]);
const CLOUD_OVERLAYS = new Set([
    'aws-cli',
    'azure-cli',
    'gcloud',
    'kubectl-helm',
    'terraform',
    'pulumi',
]);
const DEV_OVERLAYS = new Set([
    'docker-in-docker',
    'docker-sock',
    'codex',
    'playwright',
    'git-helpers',
    'pre-commit',
    'commitlint',
    'just',
    'direnv',
    'modern-cli-tools',
    'ngrok',
]);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DetectionConfidence = 'exact' | 'heuristic';
type DetectionSourceType = 'feature' | 'service' | 'extension' | 'remoteenv';

interface DetectionResult {
    /** What was detected in the existing config */
    source: string;
    /** Suggested overlay ID */
    overlayId: string;
    /** Confidence level */
    confidence: DetectionConfidence;
    /** Kind of signal that triggered detection */
    sourceType: DetectionSourceType;
}

interface UpgradeOptions {
    dir?: string;
    dryRun?: boolean;
    force?: boolean;
    json?: boolean;
}

interface AnalysisResult {
    detections: DetectionResult[];
    suggestedStack: 'plain' | 'compose';
    suggestedOverlays: string[];
    suggestedCommand: string;
    hasDockerCompose: boolean;
}

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

/**
 * Strip version suffix from a feature URI.
 * e.g. "ghcr.io/devcontainers/features/node:1" → "ghcr.io/devcontainers/features/node"
 */
function stripFeatureVersion(featureId: string): string {
    return featureId.replace(/:\d+$/, '').replace(/@[^@]+$/, '');
}

/**
 * Match a feature URI against the known table (prefix match on stripped URI).
 */
function matchFeature(featureId: string): string | null {
    const stripped = stripFeatureVersion(featureId);

    // Exact match first
    if (FEATURE_TO_OVERLAY[stripped]) {
        return FEATURE_TO_OVERLAY[stripped];
    }

    // Prefix match
    for (const [prefix, overlayId] of Object.entries(FEATURE_TO_OVERLAY)) {
        if (stripped.startsWith(prefix)) {
            return overlayId;
        }
    }

    return null;
}

/**
 * Match a docker image name against known patterns.
 *
 * Variable substitutions like `${POSTGRES_VERSION:-16}` are stripped so that
 * a service defined as `postgres:${POSTGRES_VERSION:-16}-alpine` normalises to
 * `postgres:-alpine`, which still satisfies the `^postgres[:\-]` prefix test.
 * The `.replace(/^-/, '')` only removes a leading hyphen at the very start of
 * the string (e.g. if the entire image name were a substitution that resolves
 * to empty, leaving a stray `-alpine`).
 */
function matchImage(image: string): string | null {
    const normalized = image.replace(/\$\{[^}]+\}/g, '').replace(/^-/, '');

    for (const { pattern, overlayId } of IMAGE_PATTERN_TO_OVERLAY) {
        if (pattern.test(normalized)) {
            return overlayId;
        }
    }

    return null;
}

/**
 * Match an extension ID against known table (case-insensitive).
 */
function matchExtension(extensionId: string): string | null {
    return EXTENSION_TO_OVERLAY[extensionId.toLowerCase()] ?? null;
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

/**
 * Analyse devcontainer.json features section.
 */
function analyseFeatures(devcontainer: any): DetectionResult[] {
    const results: DetectionResult[] = [];
    const features = devcontainer.features ?? {};

    for (const featureId of Object.keys(features)) {
        // Skip local features (e.g. "./features/cross-distro-packages")
        if (featureId.startsWith('./') || featureId.startsWith('../')) {
            continue;
        }

        const overlayId = matchFeature(featureId);
        if (overlayId) {
            results.push({
                source: featureId,
                overlayId,
                confidence: 'exact',
                sourceType: 'feature',
            });
        }
    }

    return results;
}

/**
 * Analyse VS Code extensions section.
 */
function analyseExtensions(devcontainer: any): DetectionResult[] {
    const results: DetectionResult[] = [];
    const extensions: string[] = devcontainer.customizations?.vscode?.extensions ?? [];

    for (const extId of extensions) {
        const overlayId = matchExtension(extId);
        if (overlayId) {
            results.push({
                source: `extension: ${extId}`,
                overlayId,
                confidence: 'heuristic',
                sourceType: 'extension',
            });
        }
    }

    return results;
}

/**
 * Analyse docker-compose.yml services.
 */
function analyseDockerCompose(composePath: string): DetectionResult[] {
    if (!fs.existsSync(composePath)) return [];

    const results: DetectionResult[] = [];

    let parsed: any;
    try {
        const content = fs.readFileSync(composePath, 'utf8');
        parsed = yaml.load(content);
    } catch {
        return [];
    }

    const services = parsed?.services ?? {};

    for (const [serviceName, serviceDef] of Object.entries(services as Record<string, any>)) {
        const image: string = serviceDef?.image ?? '';
        if (!image) continue;

        const overlayId = matchImage(image);
        if (overlayId) {
            results.push({
                source: `service: ${serviceName} (image: ${image})`,
                overlayId,
                confidence: 'exact',
                sourceType: 'service',
            });
        }
    }

    return results;
}

/**
 * Analyse remoteEnv for well-known variable patterns.
 */
function analyseRemoteEnv(devcontainer: any): DetectionResult[] {
    const results: DetectionResult[] = [];
    const env: Record<string, string> = devcontainer.remoteEnv ?? {};

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
                break; // One match per key is enough
            }
        }
    }

    return results;
}

/**
 * Deduplicate detections: keep one entry per overlayId, preferring higher
 * confidence. When both detections share the same confidence level the one
 * encountered first is kept (detection order is: features → services →
 * extensions → remoteEnv, so more specific signals win naturally).
 */
function deduplicateDetections(detections: DetectionResult[]): DetectionResult[] {
    const seen = new Map<string, DetectionResult>();

    for (const d of detections) {
        const existing = seen.get(d.overlayId);
        if (!existing) {
            seen.set(d.overlayId, d);
        } else if (d.confidence === 'exact' && existing.confidence !== 'exact') {
            // Upgrade to exact confidence, keeping the more specific signal
            seen.set(d.overlayId, d);
        }
    }

    return Array.from(seen.values());
}

/**
 * Build the suggested `init` command from detected overlay IDs.
 */
function buildSuggestedCommand(
    overlayIds: string[],
    stack: 'plain' | 'compose',
    overlaysConfig: OverlaysConfig
): string {
    const knownIds = new Set(overlaysConfig.overlays.map((o) => o.id));

    const language: string[] = [];
    const database: string[] = [];
    const observability: string[] = [];
    const cloudTools: string[] = [];
    const devTools: string[] = [];
    const other: string[] = [];

    for (const id of overlayIds) {
        if (!knownIds.has(id)) continue; // Skip unknown overlay IDs

        if (LANGUAGE_OVERLAYS.has(id)) language.push(id);
        else if (DATABASE_OVERLAYS.has(id)) database.push(id);
        else if (OBSERVABILITY_OVERLAYS.has(id)) observability.push(id);
        else if (CLOUD_OVERLAYS.has(id)) cloudTools.push(id);
        else if (DEV_OVERLAYS.has(id)) devTools.push(id);
        else other.push(id);
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

/**
 * Run the full analysis on a .devcontainer directory.
 */
function analyseDevcontainer(dir: string, overlaysConfig: OverlaysConfig): AnalysisResult {
    const devcontainerPath = path.join(dir, 'devcontainer.json');
    const composePath = path.join(dir, 'docker-compose.yml');

    let devcontainer: any = {};
    if (fs.existsSync(devcontainerPath)) {
        try {
            devcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf8'));
        } catch {
            devcontainer = {};
        }
    }

    const allDetections: DetectionResult[] = [
        ...analyseFeatures(devcontainer),
        ...analyseDockerCompose(composePath),
        ...analyseExtensions(devcontainer),
        ...analyseRemoteEnv(devcontainer),
    ];

    const detections = deduplicateDetections(allDetections);
    const hasDockerCompose = fs.existsSync(composePath);

    // Determine stack: if any service detections or docker-compose exists → compose
    const hasServiceDetections = detections.some((d) => d.sourceType === 'service');
    const suggestedStack: 'plain' | 'compose' =
        hasDockerCompose || hasServiceDetections ? 'compose' : 'plain';

    // Filter to only overlay IDs that exist in the registry
    const knownIds = new Set(overlaysConfig.overlays.map((o) => o.id));
    const suggestedOverlays = [...new Set(detections.map((d) => d.overlayId))].filter((id) =>
        knownIds.has(id)
    );

    const suggestedCommand = buildSuggestedCommand(
        suggestedOverlays,
        suggestedStack,
        overlaysConfig
    );

    return {
        detections,
        suggestedStack,
        suggestedOverlays,
        suggestedCommand,
        hasDockerCompose,
    };
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function formatConfidence(confidence: DetectionConfidence): string {
    return confidence === 'exact' ? chalk.green('exact') : chalk.yellow('heuristic');
}

function formatAnalysisTable(detections: DetectionResult[], knownIds: Set<string>): string {
    if (detections.length === 0) {
        return chalk.dim('  (no recognisable patterns found)');
    }

    const lines: string[] = [];
    const sourceCol = 58;
    const arrowCol = 4;
    const overlayCol = 22;

    lines.push(
        chalk.bold(
            'Source'.padEnd(sourceCol) +
                '→'.padEnd(arrowCol) +
                'Overlay'.padEnd(overlayCol) +
                'Confidence'
        )
    );
    lines.push('─'.repeat(sourceCol + arrowCol + overlayCol + 12));

    for (const d of detections) {
        const sourceText = d.source.slice(0, sourceCol - 2).padEnd(sourceCol);
        const arrow = chalk.dim('→'.padEnd(arrowCol));
        const overlayText = knownIds.has(d.overlayId)
            ? chalk.cyan(d.overlayId.padEnd(overlayCol))
            : chalk.dim(`${d.overlayId} (unknown)`.padEnd(overlayCol));
        const conf = formatConfidence(d.confidence);

        lines.push(`${sourceText}${arrow}${overlayText}${conf}`);
    }

    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

export async function upgradeCommand(overlaysConfig: OverlaysConfig, options: UpgradeOptions) {
    const dir = options.dir ?? './.devcontainer';
    const absoluteDir = path.resolve(dir);

    // ── Validate target directory ──────────────────────────────────────────
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
    const composePath = path.join(absoluteDir, 'docker-compose.yml');

    if (!fs.existsSync(devcontainerJsonPath)) {
        console.error(chalk.red(`✗ No devcontainer.json found in ${absoluteDir}`));
        process.exit(1);
    }

    // ── Analyse ────────────────────────────────────────────────────────────
    const analysis = analyseDevcontainer(absoluteDir, overlaysConfig);

    // ── JSON output ────────────────────────────────────────────────────────
    if (options.json) {
        const output = {
            dir: absoluteDir,
            detections: analysis.detections,
            suggestedStack: analysis.suggestedStack,
            suggestedOverlays: analysis.suggestedOverlays,
            suggestedCommand: analysis.suggestedCommand,
        };
        console.log(JSON.stringify(output, null, 2));
        return;
    }

    // ── Header ─────────────────────────────────────────────────────────────
    console.log(
        '\n' +
            boxen(chalk.bold('🔍 Upgrade Analysis'), {
                padding: 0.5,
                borderColor: 'cyan',
                borderStyle: 'round',
            })
    );

    console.log(chalk.dim(`\nAnalysing ${path.relative(process.cwd(), devcontainerJsonPath)}...`));
    if (fs.existsSync(composePath)) {
        console.log(chalk.dim(`Analysing ${path.relative(process.cwd(), composePath)}...`));
    }

    // ── Detection table ────────────────────────────────────────────────────
    const knownIds = new Set(overlaysConfig.overlays.map((o) => o.id));

    console.log('\n' + chalk.bold('Detected features / services → suggested overlays'));
    console.log(chalk.dim('─'.repeat(80)));
    console.log(formatAnalysisTable(analysis.detections, knownIds));

    // ── Suggested command ──────────────────────────────────────────────────
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

    console.log('\n' + chalk.bold('Suggested command:'));
    console.log('  ' + chalk.cyan(analysis.suggestedCommand));

    if (options.dryRun) {
        console.log(chalk.dim('\n(--dry-run: no files written)\n'));
        return;
    }

    // ── Prompt for manifest generation ─────────────────────────────────────
    const manifestPath = path.join(absoluteDir, 'superposition.json');
    const manifestExists = fs.existsSync(manifestPath);

    if (manifestExists && !options.force) {
        console.log(
            '\n' +
                chalk.yellow(
                    `⚠  ${path.relative(process.cwd(), manifestPath)} already exists.\n` +
                        '   Use --force to overwrite it.'
                )
        );
        return;
    }

    let confirmed: boolean;
    try {
        confirmed = await confirm({
            message: `Generate superposition.json from these suggestions?`,
            default: true,
        });
    } catch (err: any) {
        // Inquirer throws an AbortPromptError (name: 'AbortPromptError') when the
        // user presses Ctrl+C, or an ExitPromptError in non-interactive environments.
        // Treat all prompt errors as a "no" so the command exits cleanly.
        confirmed = false;
    }

    if (!confirmed) {
        console.log(chalk.dim('\nAborted. No files written.\n'));
        return;
    }

    // ── Write superposition.json ───────────────────────────────────────────
    const manifest: SuperpositionManifest = {
        manifestVersion: CURRENT_MANIFEST_VERSION,
        generatedBy: `container-superposition@${getToolVersion()} upgrade`,
        generated: new Date().toISOString(),
        baseTemplate: analysis.suggestedStack,
        baseImage: 'bookworm',
        overlays: analysis.suggestedOverlays,
    };

    try {
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

        console.log('\n' + chalk.green(`✓ Written ${path.relative(process.cwd(), manifestPath)}`));
        console.log(
            chalk.dim(
                '\n💡 Next steps:\n' +
                    '   1. Review and adjust superposition.json as needed\n' +
                    '   2. Run the suggested command above to regenerate .devcontainer/\n' +
                    '      or use: container-superposition regen\n'
            )
        );
    } catch (err) {
        console.error(chalk.red('✗ Failed to write superposition.json:'), err);
        process.exit(1);
    }
}
