/**
 * Doctor command - Environment validation and diagnostics
 */

import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { execSync } from 'child_process';
import chalk from 'chalk';
import boxen from 'boxen';
import type {
    OverlaysConfig,
    SuperpositionManifest,
    QuestionnaireAnswers,
    BaseImage,
    LanguageOverlay,
    DatabaseOverlay,
    ObservabilityTool,
    CloudTool,
    DevTool,
    DiagnosticCategory,
    FixEligibility,
    RecheckScope,
    DiagnosticFinding,
    RemediationAction,
    FixExecution,
    FixOutcome,
    FixOutcomeSummary,
    FixRun,
    ExitDisposition,
} from '../schema/types.js';
import { loadOverlayManifest } from '../schema/overlay-loader.js';
import {
    detectManifestVersion,
    isVersionSupported,
    needsMigration,
    migrateManifest,
    CURRENT_MANIFEST_VERSION,
} from '../schema/manifest-migrations.js';
import { MERGE_STRATEGY } from '../utils/merge.js';
import { extractPorts } from '../utils/port-utils.js';
import { composeDevContainer } from '../questionnaire/composer.js';

interface DoctorOptions {
    output?: string;
    fix?: boolean;
    json?: boolean;
}

/** Internal check result — extended with fix metadata */
interface CheckResult {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    details?: string[];
    /** Legacy field kept for backward-compatible JSON output */
    fixable?: boolean;
    /** Structured fix eligibility used by --fix flow */
    fixEligibility?: FixEligibility;
    remediationKey?: string;
}

interface DoctorReport {
    environment: CheckResult[];
    overlays: CheckResult[];
    manifest: CheckResult[];
    merge: CheckResult[];
    ports: CheckResult[];
    summary: {
        passed: number;
        warnings: number;
        errors: number;
        fixable: number;
    };
}

// ─── Remediation registry ─────────────────────────────────────────────────

const REMEDIATION_REGISTRY = new Map<string, RemediationAction>([
    [
        'manifest-migration',
        {
            key: 'manifest-migration',
            findingId: 'manifest-version',
            safetyClass: 'safe-unattended',
            executionKind: 'manifest-migration',
            preconditions: ['superposition.json must exist and be parseable'],
            plannedChanges: [
                'Migrate superposition.json to current schema version',
                'Create timestamped backup of the original manifest',
            ],
            manualFallback: [
                'Run "container-superposition regen" to regenerate with the current schema',
            ],
        },
    ],
    [
        'devcontainer-regeneration',
        {
            key: 'devcontainer-regeneration',
            findingId: 'devcontainer-config',
            safetyClass: 'safe-unattended',
            executionKind: 'regeneration',
            preconditions: ['Valid superposition.json manifest must be present'],
            plannedChanges: [
                'Regenerate devcontainer.json from superposition.json',
                'Create backup of existing .devcontainer/ files',
            ],
            manualFallback: ['Run "container-superposition regen --output <path>" to regenerate'],
        },
    ],
    [
        'node-version-fix',
        {
            key: 'node-version-fix',
            findingId: 'nodejs-version',
            safetyClass: 'safe-unattended',
            executionKind: 'shell-command',
            preconditions: ['nvm, fnm, or volta must be installed'],
            plannedChanges: ['Use version manager to install and activate Node.js >= 20'],
            manualFallback: [
                'Install Node.js >= 20 from https://nodejs.org/',
                'Or with nvm:   nvm install 20 && nvm use 20',
                'Or with fnm:   fnm install 20 && fnm use 20',
                'Or with volta: volta install node@20',
            ],
        },
    ],
    [
        'docker-repair',
        {
            key: 'docker-repair',
            findingId: 'docker-daemon',
            safetyClass: 'requires-manual-action',
            executionKind: 'no-op',
            preconditions: [],
            plannedChanges: [],
            manualFallback: [
                'Linux:   sudo systemctl start docker',
                'macOS:   open -a Docker',
                'Windows: Start Docker Desktop from the Start menu',
            ],
        },
    ],
]);

/**
 * Semantic version comparison helper
 */
function isVersionAtLeast(current: string, required: string): boolean {
    const parse = (v: string): [number, number, number] => {
        const parts = v.split('.');
        const major = parseInt(parts[0] ?? '0', 10) || 0;
        const minor = parseInt(parts[1] ?? '0', 10) || 0;
        const patch = parseInt(parts[2] ?? '0', 10) || 0;
        return [major, minor, patch];
    };

    const [cMajor, cMinor, cPatch] = parse(current);
    const [rMajor, rMinor, rPatch] = parse(required);

    if (cMajor !== rMajor) {
        return cMajor > rMajor;
    }
    if (cMinor !== rMinor) {
        return cMinor > rMinor;
    }
    return cPatch >= rPatch;
}

/**
 * Check Node.js version compatibility
 */
function checkNodeVersion(): CheckResult {
    const nodeVersion = process.version;
    const requiredVersion = '20.0.0';
    const versionMatch = nodeVersion.match(/^v(\d+\.\d+\.\d+)/);
    const currentVersion = versionMatch ? versionMatch[1] : '0.0.0';
    const ok = isVersionAtLeast(currentVersion, requiredVersion);

    if (ok) {
        return {
            name: 'Node.js version',
            status: 'pass',
            message: `${nodeVersion} (>= ${requiredVersion} required)`,
            fixEligibility: 'not-applicable',
        };
    }

    // Determine if a version manager is available for auto-fix
    const hasVersionManager = detectVersionManager() !== null;

    return {
        name: 'Node.js version',
        status: 'fail',
        message: `${nodeVersion} - requires >= ${requiredVersion}`,
        details: [
            'Update Node.js to version 20 or later',
            'Visit https://nodejs.org/ to download the latest version',
        ],
        fixEligibility: hasVersionManager ? 'automatic' : 'manual-only',
        remediationKey: hasVersionManager ? 'node-version-fix' : undefined,
        fixable: hasVersionManager,
    };
}

/**
 * Detect which Node.js version manager is available.
 * Returns the manager name or null if none found.
 */
function detectVersionManager(): 'nvm' | 'fnm' | 'volta' | null {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
    // nvm installs a shell function, not a binary — check the script file
    const nvmScript = path.join(home, '.nvm', 'nvm.sh');
    if (fs.existsSync(nvmScript)) {
        return 'nvm';
    }
    for (const cmd of ['fnm', 'volta'] as const) {
        try {
            execSync(`${cmd} --version`, {
                stdio: 'ignore',
                timeout: 3000,
            });
            return cmd;
        } catch {
            // not available
        }
    }
    return null;
}

/**
 * Check if Docker daemon is accessible
 */
function checkDocker(): CheckResult {
    try {
        // Use 'docker info' to verify daemon connectivity, not just CLI presence
        execSync('docker info', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore'],
            timeout: 5000,
        });
        // Get version for display
        const version = execSync('docker --version', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore'],
            timeout: 5000,
        });
        return {
            name: 'Docker daemon',
            status: 'pass',
            message: version.trim(),
            fixEligibility: 'not-applicable',
        };
    } catch {
        return {
            name: 'Docker daemon',
            status: 'warn',
            message: 'Not accessible',
            details: [
                'Docker daemon is not running or not accessible',
                'Install Docker Desktop or Docker Engine',
                'Ensure Docker daemon is running',
            ],
            fixEligibility: 'manual-only',
            remediationKey: 'docker-repair',
        };
    }
}

/**
 * Check if Docker Compose v2 is available
 */
function checkDockerCompose(): CheckResult {
    try {
        // Try docker compose (v2 syntax) first
        const version = execSync('docker compose version', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore'],
            timeout: 5000,
        });
        const versionMatch = version.match(/v?(\d+\.\d+\.\d+)/);
        const currentVersion = versionMatch ? versionMatch[1] : '0.0.0';
        const [major] = currentVersion.split('.').map((n) => parseInt(n, 10));

        if (major >= 2) {
            return {
                name: 'Docker Compose',
                status: 'pass',
                message: `v${currentVersion} (v2 required)`,
                fixEligibility: 'not-applicable',
            };
        } else {
            return {
                name: 'Docker Compose',
                status: 'warn',
                message: `v${currentVersion} - v2 recommended`,
                details: [
                    'Docker Compose v2 is recommended for compose-based templates',
                    'Update Docker Desktop or install docker-compose-plugin',
                ],
                fixEligibility: 'manual-only',
            };
        }
    } catch {
        // Try docker-compose (v1 syntax)
        try {
            const version = execSync('docker-compose --version', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore'],
                timeout: 5000,
            });
            return {
                name: 'Docker Compose',
                status: 'warn',
                message: `${version.trim()} - v2 recommended`,
                details: [
                    'Docker Compose v1 detected',
                    'Consider upgrading to v2: docker compose (not docker-compose)',
                ],
                fixEligibility: 'manual-only',
            };
        } catch {
            return {
                name: 'Docker Compose',
                status: 'warn',
                message: 'Not found',
                details: [
                    'Docker Compose is required for compose-based templates',
                    'Install Docker Desktop (includes Compose v2)',
                    'Or install docker-compose-plugin',
                ],
                fixEligibility: 'manual-only',
            };
        }
    }
}

/**
 * Run environment checks
 */
function checkEnvironment(outputPath: string): CheckResult[] {
    const results: CheckResult[] = [checkNodeVersion(), checkDocker()];

    // Only check Docker Compose if using compose stack
    const baseTemplate = getBaseTemplateFromManifest(outputPath);
    if (baseTemplate === 'compose') {
        results.push(checkDockerCompose());
    }

    return results;
}

/**
 * Get base template from manifest if it exists
 */
function getBaseTemplateFromManifest(
    outputPath: string
): SuperpositionManifest['baseTemplate'] | undefined {
    const manifestPath = path.join(outputPath, 'superposition.json');

    if (!fs.existsSync(manifestPath)) {
        return undefined;
    }

    try {
        const content = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(content) as SuperpositionManifest;
        return manifest.baseTemplate;
    } catch {
        return undefined;
    }
}

/**
 * Validate overlay.yml against schema
 */
function validateOverlayManifest(overlayDir: string, overlayId: string): CheckResult {
    const manifestPath = path.join(overlayDir, 'overlay.yml');

    if (!fs.existsSync(manifestPath)) {
        return {
            name: `Overlay: ${overlayId}`,
            status: 'fail',
            message: 'Missing overlay.yml manifest',
            details: [`Create overlay.yml in ${overlayDir}`],
        };
    }

    const manifest = loadOverlayManifest(overlayDir);
    if (!manifest) {
        return {
            name: `Overlay: ${overlayId}`,
            status: 'fail',
            message: 'Invalid overlay.yml manifest',
            details: [
                'Manifest must include: id, name, description, category',
                'Check YAML syntax and required fields',
            ],
        };
    }

    // Validate required files
    const requiredFiles = ['devcontainer.patch.json'];
    const missingFiles: string[] = [];

    for (const file of requiredFiles) {
        const filePath = path.join(overlayDir, file);
        if (!fs.existsSync(filePath)) {
            missingFiles.push(file);
        }
    }

    // Check for broken symlinks
    const entries = fs.readdirSync(overlayDir, { withFileTypes: true });
    const brokenSymlinks: string[] = [];

    for (const entry of entries) {
        if (entry.isSymbolicLink()) {
            const linkPath = path.join(overlayDir, entry.name);
            const targetExists = fs.existsSync(linkPath);
            if (!targetExists) {
                brokenSymlinks.push(entry.name);
            }
        }
    }

    if (missingFiles.length > 0 || brokenSymlinks.length > 0) {
        const details: string[] = [];
        if (missingFiles.length > 0) {
            details.push(`Missing required files: ${missingFiles.join(', ')}`);
        }
        if (brokenSymlinks.length > 0) {
            details.push(`Broken symlinks: ${brokenSymlinks.join(', ')}`);
        }

        return {
            name: `Overlay: ${overlayId}`,
            status: 'fail',
            message: 'Missing files or broken symlinks',
            details,
        };
    }

    // Check devcontainer.patch.json is valid JSON
    try {
        const patchPath = path.join(overlayDir, 'devcontainer.patch.json');
        const content = fs.readFileSync(patchPath, 'utf8');
        JSON.parse(content);
    } catch (error) {
        return {
            name: `Overlay: ${overlayId}`,
            status: 'fail',
            message: 'Invalid devcontainer.patch.json',
            details: [
                `JSON syntax error: ${error instanceof Error ? error.message : String(error)}`,
            ],
        };
    }

    // Validate imports if present
    if (manifest.imports && manifest.imports.length > 0) {
        const overlaysDir = path.dirname(overlayDir);
        const missingImports: string[] = [];
        const invalidImports: string[] = [];

        for (const importPath of manifest.imports) {
            const fullImportPath = path.join(overlaysDir, importPath);

            if (!fs.existsSync(fullImportPath)) {
                missingImports.push(importPath);
                continue;
            }

            // Validate import file type
            const ext = path.extname(importPath).toLowerCase();
            if (!['.json', '.yaml', '.yml', '.env'].includes(ext)) {
                invalidImports.push(`${importPath} (unsupported type: ${ext})`);
            }
        }

        if (missingImports.length > 0 || invalidImports.length > 0) {
            const details: string[] = [];
            if (missingImports.length > 0) {
                details.push(`Missing imports: ${missingImports.join(', ')}`);
            }
            if (invalidImports.length > 0) {
                details.push(`Invalid imports: ${invalidImports.join(', ')}`);
            }

            return {
                name: `Overlay: ${overlayId}`,
                status: 'warn',
                message: 'Import validation issues',
                details,
            };
        }
    }

    return {
        name: `Overlay: ${overlayId}`,
        status: 'pass',
        message: 'Valid',
    };
}

/**
 * Validate all overlays
 */
function checkOverlays(overlaysDir: string): CheckResult[] {
    const results: CheckResult[] = [];

    if (!fs.existsSync(overlaysDir)) {
        return [
            {
                name: 'Overlays directory',
                status: 'fail',
                message: `Directory not found: ${overlaysDir}`,
            },
        ];
    }

    const entries = fs.readdirSync(overlaysDir, { withFileTypes: true });
    const overlayDirs = entries.filter(
        (entry) => entry.isDirectory() && !entry.name.startsWith('.')
    );

    if (overlayDirs.length === 0) {
        return [
            {
                name: 'Overlays',
                status: 'warn',
                message: 'No overlays found',
            },
        ];
    }

    for (const dir of overlayDirs) {
        const overlayDir = path.join(overlaysDir, dir.name);
        const result = validateOverlayManifest(overlayDir, dir.name);
        results.push(result);
    }

    return results;
}

/**
 * Check if a port is in use (cross-platform using Node.js net module)
 */
function isPortInUse(port: number): boolean {
    try {
        const server = net.createServer();
        let inUse = false;

        // Try to listen on the port
        server.once('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
                inUse = true;
            }
        });

        server.listen(port, '127.0.0.1');
        server.close();

        return inUse;
    } catch {
        // If we can't check, assume it's not in use
        return false;
    }
}

/**
 * Check port availability for overlays
 */
function checkPorts(overlaysConfig: OverlaysConfig, manifestPath?: string): CheckResult[] {
    const results: CheckResult[] = [];
    const portsToCheck = new Map<number, string[]>();

    // If manifest exists, check ports from manifest
    if (manifestPath && fs.existsSync(manifestPath)) {
        try {
            const manifestContent = fs.readFileSync(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestContent) as SuperpositionManifest;

            // Collect ports from selected overlays
            const selectedOverlays = manifest.overlays || [];

            for (const overlayId of selectedOverlays) {
                const overlay = overlaysConfig.overlays.find((o) => o.id === overlayId);
                if (overlay && overlay.ports && overlay.ports.length > 0) {
                    // Extract numeric ports from overlay
                    const ports = extractPorts([overlay]);
                    for (const port of ports) {
                        const actualPort = port + (manifest.portOffset || 0);
                        if (!portsToCheck.has(actualPort)) {
                            portsToCheck.set(actualPort, []);
                        }
                        portsToCheck.get(actualPort)!.push(overlay.id);
                    }
                }
            }
        } catch (error) {
            // Ignore manifest parse errors - will be caught in manifest checks
        }
    }

    if (portsToCheck.size === 0) {
        return [];
    }

    // Check each port
    for (const [port, overlayIds] of portsToCheck.entries()) {
        const inUse = isPortInUse(port);
        if (inUse) {
            results.push({
                name: `Port ${port}`,
                status: 'warn',
                message: `Port already in use (used by: ${overlayIds.join(', ')})`,
                details: [
                    'Use --port-offset flag to shift ports',
                    'Or free the port by stopping the conflicting service',
                ],
            });
        }
    }

    return results;
}

/**
 * Check manifest compatibility
 */
function checkManifest(outputPath: string): CheckResult[] {
    const results: CheckResult[] = [];
    const manifestPath = path.join(outputPath, 'superposition.json');

    // Check if output path exists
    if (!fs.existsSync(outputPath)) {
        return [
            {
                name: 'Devcontainer directory',
                status: 'warn',
                message: `Directory not found: ${outputPath}`,
                details: ['Run "container-superposition init" to create a devcontainer'],
            },
        ];
    }

    // Check if manifest exists
    if (!fs.existsSync(manifestPath)) {
        return [
            {
                name: 'Manifest file',
                status: 'warn',
                message: 'superposition.json not found',
                details: [
                    'This may be a manually created devcontainer',
                    'Or created with an older version of container-superposition',
                ],
            },
        ];
    }

    // Validate manifest JSON
    try {
        const content = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(content) as SuperpositionManifest;

        // Check manifest version compatibility
        const manifestVersion = detectManifestVersion(manifest);
        const supported = isVersionSupported(manifestVersion);
        const needsUpdate = needsMigration(manifest);

        let versionStatus: 'pass' | 'warn' | 'fail' = 'pass';
        let versionDetails: string[] | undefined;

        if (!supported) {
            versionStatus = 'fail';
            versionDetails = [
                `Manifest version ${manifestVersion} is not supported`,
                'Please upgrade your tool or regenerate the manifest',
            ];
        } else if (needsUpdate) {
            versionStatus = 'warn';
            versionDetails = [
                `Manifest is using ${manifest.manifestVersion ? 'version ' + manifest.manifestVersion : 'legacy format'}`,
                `Current manifest version: ${CURRENT_MANIFEST_VERSION}`,
                'Manifest will be automatically migrated on next regeneration',
            ];
        }

        results.push({
            name: 'Manifest version',
            status: versionStatus,
            message: manifest.manifestVersion
                ? `Schema version ${manifest.manifestVersion} (tool ${manifest.generatedBy || 'unknown'})`
                : `Legacy format (tool ${manifest.version || 'unknown'})`,
            details: versionDetails,
            fixEligibility: needsUpdate && supported ? 'automatic' : 'not-applicable',
            remediationKey: needsUpdate && supported ? 'manifest-migration' : undefined,
            fixable: needsUpdate && supported,
        });

        // Check for required fields
        if (!manifest.baseTemplate) {
            results.push({
                name: 'Manifest base template',
                status: 'fail',
                message: 'Missing baseTemplate field',
                fixEligibility: 'manual-only',
            });
        }

        // Check devcontainer.json exists
        const devcontainerPath = path.join(outputPath, 'devcontainer.json');
        if (!fs.existsSync(devcontainerPath)) {
            results.push({
                name: 'DevContainer config',
                status: 'fail',
                message: 'devcontainer.json not found',
                details: ['Devcontainer configuration file is missing or corrupted'],
                fixEligibility: 'automatic',
                remediationKey: 'devcontainer-regeneration',
                fixable: true,
            });
        } else {
            // Validate devcontainer.json is valid JSON
            try {
                const devcontainerContent = fs.readFileSync(devcontainerPath, 'utf8');
                JSON.parse(devcontainerContent);
                results.push({
                    name: 'DevContainer config',
                    status: 'pass',
                    message: 'devcontainer.json valid',
                    fixEligibility: 'not-applicable',
                });
            } catch {
                results.push({
                    name: 'DevContainer config',
                    status: 'fail',
                    message: 'devcontainer.json has invalid JSON',
                    fixEligibility: 'automatic',
                    remediationKey: 'devcontainer-regeneration',
                    fixable: true,
                });
            }
        }
    } catch (error) {
        results.push({
            name: 'Manifest file',
            status: 'fail',
            message: 'Invalid JSON in superposition.json',
            details: [`Parse error: ${error instanceof Error ? error.message : String(error)}`],
            fixEligibility: 'manual-only',
        });
    }

    return results;
}

/**
 * Check merge strategy configuration and validation
 */
function checkMergeStrategy(outputPath: string): CheckResult[] {
    const results: CheckResult[] = [];

    // Check 1: Merge strategy version info
    results.push({
        name: 'Merge strategy version',
        status: 'pass',
        message: `v${MERGE_STRATEGY.version} (${MERGE_STRATEGY.description})`,
    });

    // Check 2: Validate devcontainer.json structure
    const devcontainerPath = path.join(outputPath, 'devcontainer.json');
    if (fs.existsSync(devcontainerPath)) {
        try {
            const content = fs.readFileSync(devcontainerPath, 'utf8');
            const devcontainer = JSON.parse(content);

            // Check for potential merge conflicts in features
            if (devcontainer.features) {
                const featureKeys = Object.keys(devcontainer.features);
                const duplicateFeatures = featureKeys.filter(
                    (key, index) => featureKeys.indexOf(key) !== index
                );

                if (duplicateFeatures.length > 0) {
                    results.push({
                        name: 'Feature merge conflicts',
                        status: 'warn',
                        message: `Duplicate feature keys detected: ${duplicateFeatures.join(', ')}`,
                        details: [
                            'Features should have unique keys',
                            'Duplicates may indicate incorrect merge behavior',
                        ],
                    });
                } else {
                    results.push({
                        name: 'Feature merge',
                        status: 'pass',
                        message: `${featureKeys.length} features merged successfully`,
                    });
                }
            }

            // Check for environment variable conflicts in remoteEnv
            if (devcontainer.remoteEnv) {
                const envKeys = Object.keys(devcontainer.remoteEnv);
                const pathVar = devcontainer.remoteEnv.PATH;

                if (pathVar && pathVar.includes('${containerEnv:PATH}')) {
                    results.push({
                        name: 'PATH variable merge',
                        status: 'pass',
                        message: 'PATH correctly includes ${containerEnv:PATH}',
                    });
                } else if (pathVar) {
                    results.push({
                        name: 'PATH variable merge',
                        status: 'warn',
                        message: 'PATH does not include ${containerEnv:PATH}',
                        details: [
                            'PATH should end with ${containerEnv:PATH} to preserve system paths',
                            'This may cause unexpected behavior',
                        ],
                    });
                }

                results.push({
                    name: 'Environment variables',
                    status: 'pass',
                    message: `${envKeys.length} environment variables configured`,
                });
            }

            // Check for array field integrity
            if (devcontainer.forwardPorts && Array.isArray(devcontainer.forwardPorts)) {
                const uniquePorts = new Set(devcontainer.forwardPorts);
                if (uniquePorts.size !== devcontainer.forwardPorts.length) {
                    results.push({
                        name: 'Port forwarding merge',
                        status: 'warn',
                        message: 'Duplicate ports in forwardPorts array',
                        details: [
                            'Port deduplication may have failed',
                            'This could indicate a merge strategy issue',
                        ],
                    });
                } else {
                    results.push({
                        name: 'Port forwarding merge',
                        status: 'pass',
                        message: `${uniquePorts.size} unique ports forwarded`,
                    });
                }
            }
        } catch (error) {
            results.push({
                name: 'DevContainer merge validation',
                status: 'fail',
                message: 'Unable to validate merge strategy',
                details: [`Error: ${error instanceof Error ? error.message : String(error)}`],
            });
        }
    }

    // Check 3: Validate docker-compose.yml if it exists
    const composePath = path.join(outputPath, 'docker-compose.yml');
    if (fs.existsSync(composePath)) {
        try {
            const content = fs.readFileSync(composePath, 'utf8');
            // Basic validation: check if it's parseable YAML
            const yaml = require('js-yaml');
            const compose = yaml.load(content) as any;

            if (compose.services) {
                const serviceNames = Object.keys(compose.services);
                results.push({
                    name: 'Compose service merge',
                    status: 'pass',
                    message: `${serviceNames.length} services merged successfully`,
                });

                // Check depends_on references
                let hasInvalidDependencies = false;
                const serviceNameSet = new Set(serviceNames);

                for (const [serviceName, service] of Object.entries<any>(compose.services)) {
                    if (service.depends_on) {
                        const deps = Array.isArray(service.depends_on)
                            ? service.depends_on
                            : Object.keys(service.depends_on);

                        for (const dep of deps) {
                            if (!serviceNameSet.has(dep)) {
                                hasInvalidDependencies = true;
                                break;
                            }
                        }
                    }
                }

                if (hasInvalidDependencies) {
                    results.push({
                        name: 'Service dependencies',
                        status: 'warn',
                        message: 'Invalid service dependencies detected',
                        details: [
                            'Some depends_on references point to non-existent services',
                            'Dependencies should be filtered during merge',
                        ],
                    });
                } else {
                    results.push({
                        name: 'Service dependencies',
                        status: 'pass',
                        message: 'All service dependencies are valid',
                    });
                }
            }
        } catch (error) {
            results.push({
                name: 'Compose merge validation',
                status: 'warn',
                message: 'Unable to validate docker-compose merge',
                details: [`Error: ${error instanceof Error ? error.message : String(error)}`],
            });
        }
    }

    return results;
}

/**
 * Generate doctor report
 */
function generateReport(
    environmentChecks: CheckResult[],
    overlayChecks: CheckResult[],
    manifestChecks: CheckResult[],
    mergeChecks: CheckResult[],
    portChecks: CheckResult[]
): DoctorReport {
    const allChecks = [
        ...environmentChecks,
        ...overlayChecks,
        ...manifestChecks,
        ...mergeChecks,
        ...portChecks,
    ];

    const passed = allChecks.filter((c) => c.status === 'pass').length;
    const warnings = allChecks.filter((c) => c.status === 'warn').length;
    const errors = allChecks.filter((c) => c.status === 'fail').length;
    const fixable = allChecks.filter((c) => c.fixable).length;

    return {
        environment: environmentChecks,
        overlays: overlayChecks,
        manifest: manifestChecks,
        merge: mergeChecks,
        ports: portChecks,
        summary: {
            passed,
            warnings,
            errors,
            fixable,
        },
    };
}

/**
 * Format check result for display
 */
function formatCheckResult(check: CheckResult): string {
    const icon =
        check.status === 'pass'
            ? chalk.green('✓')
            : check.status === 'warn'
              ? chalk.yellow('⚠')
              : chalk.red('✗');

    const lines = [`  ${icon} ${chalk.white(check.name)}: ${chalk.gray(check.message)}`];

    if (check.details && check.details.length > 0) {
        for (const detail of check.details) {
            lines.push(`    ${chalk.dim('→')} ${chalk.dim(detail)}`);
        }
    }

    if (check.fixable) {
        lines.push(`    ${chalk.dim('→')} ${chalk.cyan('Fixable with --fix flag')}`);
    }

    return lines.join('\n');
}

/**
 * Format doctor report as text
 */
function formatAsText(report: DoctorReport): string {
    const lines: string[] = [];

    // Environment section
    if (report.environment.length > 0) {
        lines.push(chalk.bold('\nEnvironment:'));
        for (const check of report.environment) {
            lines.push(formatCheckResult(check));
        }
    }

    // Overlays section
    if (report.overlays.length > 0) {
        const failedOverlays = report.overlays.filter((c) => c.status !== 'pass');
        if (failedOverlays.length > 0) {
            lines.push(chalk.bold('\nOverlays:'));
            lines.push(`  ${chalk.gray(`Checked ${report.overlays.length} overlays`)}`);
            for (const check of failedOverlays) {
                lines.push(formatCheckResult(check));
            }
        } else {
            lines.push(chalk.bold('\nOverlays:'));
            lines.push(
                `  ${chalk.green('✓')} ${chalk.white(`All ${report.overlays.length} overlays valid`)}`
            );
        }
    }

    // Manifest section
    if (report.manifest.length > 0) {
        lines.push(chalk.bold('\nManifest:'));
        for (const check of report.manifest) {
            lines.push(formatCheckResult(check));
        }
    }

    // Merge strategy section
    if (report.merge.length > 0) {
        lines.push(chalk.bold('\nMerge Strategy:'));
        for (const check of report.merge) {
            lines.push(formatCheckResult(check));
        }
    }

    // Ports section
    if (report.ports.length > 0) {
        lines.push(chalk.bold('\nPort Availability:'));
        for (const check of report.ports) {
            lines.push(formatCheckResult(check));
        }
    }

    // Summary
    lines.push(chalk.bold('\nSummary:'));
    lines.push(`  ${chalk.green('✓')} ${report.summary.passed} passed`);
    if (report.summary.warnings > 0) {
        lines.push(`  ${chalk.yellow('⚠')} ${report.summary.warnings} warnings`);
    }
    if (report.summary.errors > 0) {
        lines.push(`  ${chalk.red('✗')} ${report.summary.errors} errors`);
    }
    if (report.summary.fixable > 0) {
        lines.push(`  ${chalk.cyan('ℹ')} ${report.summary.fixable} fixable issues`);
        lines.push(`\n  ${chalk.dim('Run with --fix to apply automatic fixes where possible.')}`);
    }

    return lines.join('\n');
}

/**
 * Convert a report section + category into DiagnosticFinding objects.
 */
function checksToFindings(
    checks: CheckResult[],
    category: DiagnosticCategory,
    recheckScope: RecheckScope
): DiagnosticFinding[] {
    return checks.map((c) => {
        const id = c.name
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        return {
            id,
            category,
            name: c.name,
            status: c.status,
            message: c.message,
            details: c.details,
            fixEligibility: c.fixEligibility ?? 'not-applicable',
            remediationKey: c.remediationKey,
            recheckScope,
        };
    });
}

/**
 * Convert a full DoctorReport into a flat DiagnosticFinding array.
 */
function reportToFindings(report: DoctorReport): DiagnosticFinding[] {
    return [
        ...checksToFindings(report.environment, 'environment', 'environment'),
        ...checksToFindings(report.overlays, 'overlay', 'full'),
        ...checksToFindings(report.manifest, 'manifest', 'manifest'),
        ...checksToFindings(report.merge, 'merge', 'devcontainer'),
        ...checksToFindings(report.ports, 'ports', 'environment'),
    ];
}

/**
 * Order findings for remediation: manifest migration must come before regeneration.
 */
function orderFindingsForRemediation(findings: DiagnosticFinding[]): DiagnosticFinding[] {
    const PRIORITY: Record<string, number> = {
        'manifest-migration': 1,
        'devcontainer-regeneration': 2,
        'node-version-fix': 3,
        'docker-repair': 4,
    };
    return [...findings].sort((a, b) => {
        const pa = PRIORITY[a.remediationKey ?? ''] ?? 99;
        const pb = PRIORITY[b.remediationKey ?? ''] ?? 99;
        return pa - pb;
    });
}

/**
 * Atomically write a JSON file (write to .tmp then rename).
 */
function atomicWriteJson(filePath: string, data: object): void {
    const tmpPath = filePath + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    fs.renameSync(tmpPath, filePath);
}

/**
 * Create a timestamped backup of a file and return the backup path.
 */
function backupFile(filePath: string): string {
    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '-')
        .replace('Z', '');
    const backupPath = `${filePath}.backup-${timestamp}`;
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
}

/**
 * Build QuestionnaireAnswers from a SuperpositionManifest using overlaysConfig
 * for category resolution.  Used by the devcontainer-regeneration fix.
 */
function buildAnswersFromManifest(
    manifest: SuperpositionManifest,
    manifestDir: string,
    overlaysConfig: OverlaysConfig
): QuestionnaireAnswers {
    const knownBaseImageIds = ['bookworm', 'trixie', 'alpine', 'ubuntu', 'custom'];
    const isKnownBaseImage = knownBaseImageIds.includes(manifest.baseImage);

    const language: LanguageOverlay[] = [];
    const database: DatabaseOverlay[] = [];
    const observability: ObservabilityTool[] = [];
    const cloudTools: CloudTool[] = [];
    const devTools: DevTool[] = [];

    const overlayMap = new Map(overlaysConfig.overlays.map((o) => [o.id, o]));

    for (const id of manifest.overlays) {
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

    return {
        stack: manifest.baseTemplate,
        baseImage: isKnownBaseImage ? (manifest.baseImage as BaseImage) : 'custom',
        customImage: isKnownBaseImage ? undefined : manifest.baseImage,
        containerName: manifest.containerName,
        preset: manifest.preset,
        presetChoices: manifest.presetChoices,
        language,
        database,
        observability,
        cloudTools,
        devTools,
        needsDocker: manifest.baseTemplate === 'compose',
        playwright: devTools.includes('playwright' as DevTool),
        outputPath: manifestDir,
        portOffset: manifest.portOffset,
    };
}

/**
 * Execute manifest migration fix (Class 1).
 */
function executeManifestMigration(outputPath: string): FixExecution {
    const manifestPath = path.join(outputPath, 'superposition.json');

    if (!fs.existsSync(manifestPath)) {
        return {
            findingId: 'manifest-version',
            remediationKey: 'manifest-migration',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: 'superposition.json not found — cannot migrate',
            rechecked: false,
        };
    }

    let manifest: any;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (err) {
        return {
            findingId: 'manifest-version',
            remediationKey: 'manifest-migration',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: `Cannot parse superposition.json: ${err instanceof Error ? err.message : String(err)}`,
            rechecked: false,
        };
    }

    if (!needsMigration(manifest)) {
        return {
            findingId: 'manifest-version',
            remediationKey: 'manifest-migration',
            attempted: false,
            outcome: 'already-compliant',
            reason: 'Manifest is already at the current schema version',
            rechecked: true,
        };
    }

    let backupPath: string;
    try {
        backupPath = backupFile(manifestPath);
    } catch (err) {
        return {
            findingId: 'manifest-version',
            remediationKey: 'manifest-migration',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: `Failed to create backup: ${err instanceof Error ? err.message : String(err)}`,
            rechecked: false,
        };
    }

    try {
        const migrated = migrateManifest(manifest);
        atomicWriteJson(manifestPath, migrated);
    } catch (err) {
        // Restore backup on failure
        try {
            fs.copyFileSync(backupPath, manifestPath);
        } catch {
            // best effort
        }
        return {
            findingId: 'manifest-version',
            remediationKey: 'manifest-migration',
            attempted: true,
            outcome: 'requires-manual-action',
            reason: `Migration failed: ${err instanceof Error ? err.message : String(err)}`,
            backupPath,
            rechecked: false,
        };
    }

    // Re-check
    try {
        const updated = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const stillNeeds = needsMigration(updated);
        return {
            findingId: 'manifest-version',
            remediationKey: 'manifest-migration',
            attempted: true,
            outcome: stillNeeds ? 'requires-manual-action' : 'fixed',
            reason: stillNeeds
                ? 'Migration wrote file but schema still reports outdated'
                : 'Manifest migrated to current schema version',
            changedFiles: [manifestPath],
            backupPath,
            rechecked: true,
        };
    } catch {
        return {
            findingId: 'manifest-version',
            remediationKey: 'manifest-migration',
            attempted: true,
            outcome: 'fixed',
            reason: 'Manifest migrated (re-check skipped — parse error after write)',
            changedFiles: [manifestPath],
            backupPath,
            rechecked: false,
        };
    }
}

/**
 * Execute devcontainer regeneration fix (Class 2).
 */
async function executeRegeneration(
    outputPath: string,
    overlaysConfig: OverlaysConfig,
    overlaysDir: string
): Promise<FixExecution> {
    const manifestPath = path.join(outputPath, 'superposition.json');

    if (!fs.existsSync(manifestPath)) {
        return {
            findingId: 'devcontainer-config',
            remediationKey: 'devcontainer-regeneration',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: 'No superposition.json found — run "container-superposition init" first',
            rechecked: false,
        };
    }

    let manifest: SuperpositionManifest;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as SuperpositionManifest;
    } catch (err) {
        return {
            findingId: 'devcontainer-config',
            remediationKey: 'devcontainer-regeneration',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: `Cannot parse superposition.json: ${err instanceof Error ? err.message : String(err)}`,
            rechecked: false,
        };
    }

    if (!manifest.baseTemplate) {
        return {
            findingId: 'devcontainer-config',
            remediationKey: 'devcontainer-regeneration',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: 'Manifest is missing required baseTemplate field — cannot regenerate',
            rechecked: false,
        };
    }

    const answers = buildAnswersFromManifest(manifest, outputPath, overlaysConfig);

    try {
        await composeDevContainer(answers, overlaysDir, { isRegen: true });
    } catch (err) {
        return {
            findingId: 'devcontainer-config',
            remediationKey: 'devcontainer-regeneration',
            attempted: true,
            outcome: 'requires-manual-action',
            reason: `Regeneration failed: ${err instanceof Error ? err.message : String(err)}`,
            rechecked: false,
        };
    }

    // Re-check
    const devcontainerPath = path.join(outputPath, 'devcontainer.json');
    const exists = fs.existsSync(devcontainerPath);
    let validJson = false;
    if (exists) {
        try {
            JSON.parse(fs.readFileSync(devcontainerPath, 'utf8'));
            validJson = true;
        } catch {
            // invalid JSON
        }
    }

    return {
        findingId: 'devcontainer-config',
        remediationKey: 'devcontainer-regeneration',
        attempted: true,
        outcome: exists && validJson ? 'fixed' : 'requires-manual-action',
        reason:
            exists && validJson
                ? 'devcontainer.json regenerated from superposition.json'
                : 'Regeneration ran but devcontainer.json is still missing or invalid',
        changedFiles: exists ? [devcontainerPath] : [],
        rechecked: true,
    };
}

/**
 * Execute Node.js version fix (Class 3).
 */
function executeNodeVersionFix(): FixExecution {
    const manager = detectVersionManager();

    if (!manager) {
        return {
            findingId: 'nodejs-version',
            remediationKey: 'node-version-fix',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: 'No version manager (nvm, fnm, or volta) found',
            rechecked: false,
        };
    }

    let fixCmd: string;
    switch (manager) {
        case 'nvm': {
            const nvmScript = path.join(
                process.env.HOME ?? process.env.USERPROFILE ?? '',
                '.nvm',
                'nvm.sh'
            );
            fixCmd = `source "${nvmScript}" && nvm install 20 && nvm use 20`;
            break;
        }
        case 'fnm':
            fixCmd = 'fnm install 20 && fnm use 20';
            break;
        case 'volta':
            fixCmd = 'volta install node@20';
            break;
    }

    try {
        execSync(`bash -c '${fixCmd}'`, { stdio: 'pipe', timeout: 60_000 });
    } catch (err) {
        return {
            findingId: 'nodejs-version',
            remediationKey: 'node-version-fix',
            attempted: true,
            outcome: 'requires-manual-action',
            reason: `Fix command failed: ${err instanceof Error ? err.message : String(err)}`,
            commands: [fixCmd],
            rechecked: false,
        };
    }

    // Re-check in a fresh shell subprocess
    try {
        const version = execSync("bash -c 'node --version'", {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 10_000,
        });
        const match = version.trim().match(/^v(\d+)/);
        const major = match ? parseInt(match[1], 10) : 0;
        if (major >= 20) {
            return {
                findingId: 'nodejs-version',
                remediationKey: 'node-version-fix',
                attempted: true,
                outcome: 'fixed',
                reason: `Node.js ${version.trim()} activated via ${manager}`,
                commands: [fixCmd],
                rechecked: true,
            };
        }
    } catch {
        // fall through
    }

    return {
        findingId: 'nodejs-version',
        remediationKey: 'node-version-fix',
        attempted: true,
        outcome: 'requires-manual-action',
        reason: `Version manager command ran but node --version still reports < 20. Open a new shell and run: ${fixCmd}`,
        commands: [fixCmd],
        rechecked: true,
    };
}

/**
 * Execute a single remediation action and return its execution record.
 */
async function executeSingleFix(
    finding: DiagnosticFinding,
    outputPath: string,
    overlaysConfig: OverlaysConfig,
    overlaysDir: string
): Promise<FixExecution> {
    switch (finding.remediationKey) {
        case 'manifest-migration':
            return executeManifestMigration(outputPath);
        case 'devcontainer-regeneration':
            return executeRegeneration(outputPath, overlaysConfig, overlaysDir);
        case 'node-version-fix':
            return executeNodeVersionFix();
        case 'docker-repair': {
            const action = REMEDIATION_REGISTRY.get('docker-repair')!;
            return {
                findingId: finding.id,
                remediationKey: 'docker-repair',
                attempted: false,
                outcome: 'requires-manual-action',
                reason: 'Docker daemon repair requires manual intervention',
                rechecked: false,
            };
        }
        default:
            return {
                findingId: finding.id,
                remediationKey: finding.remediationKey ?? 'unknown',
                attempted: false,
                outcome: 'requires-manual-action',
                reason: `No remediation handler registered for key "${finding.remediationKey}"`,
                rechecked: false,
            };
    }
}

/**
 * Build the FixOutcomeSummary from a list of executions.
 */
function buildOutcomeSummary(executions: FixExecution[]): FixOutcomeSummary {
    const counts = {
        fixed: 0,
        alreadyCompliant: 0,
        skipped: 0,
        requiresManualAction: 0,
    };
    for (const ex of executions) {
        switch (ex.outcome) {
            case 'fixed':
                counts.fixed++;
                break;
            case 'already-compliant':
                counts.alreadyCompliant++;
                break;
            case 'skipped':
                counts.skipped++;
                break;
            case 'requires-manual-action':
                counts.requiresManualAction++;
                break;
        }
    }
    return { ...counts, total: executions.length };
}

/**
 * Determine the exit disposition from summary and final findings.
 */
function determineExitDisposition(
    summary: FixOutcomeSummary,
    finalFindings: DiagnosticFinding[]
): ExitDisposition {
    const unresolvedFailures = finalFindings.filter(
        (f) => f.status === 'fail' && f.fixEligibility !== 'not-applicable'
    );
    if (unresolvedFailures.length > 0) {
        return 'unresolved-failures';
    }
    if (summary.requiresManualAction > 0 || summary.skipped > 0) {
        return 'repaired-with-warnings';
    }
    return 'success';
}

/**
 * Run the full fix flow: diagnose → narrate → remediate → re-check → summarise.
 */
async function executeFixRun(
    report: DoctorReport,
    outputPath: string,
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    requestedJson: boolean
): Promise<FixRun> {
    const initialFindings = reportToFindings(report);

    // Separate automatic and manual-only fixable findings
    const autoFixable = initialFindings.filter(
        (f) => f.fixEligibility === 'automatic' && f.status !== 'pass'
    );
    const manualOnly = initialFindings.filter(
        (f) => f.fixEligibility === 'manual-only' && f.status !== 'pass'
    );

    // Order automatic fixes: prerequisites before dependents
    const orderedAuto = orderFindingsForRemediation(autoFixable);

    const executions: FixExecution[] = [];
    let manifestMigrationFailed = false;

    for (const finding of orderedAuto) {
        // Dependency ordering: skip regeneration if manifest migration failed
        if (finding.remediationKey === 'devcontainer-regeneration' && manifestMigrationFailed) {
            executions.push({
                findingId: finding.id,
                remediationKey: 'devcontainer-regeneration',
                attempted: false,
                outcome: 'skipped',
                reason: 'Skipped because manifest migration did not succeed',
                rechecked: false,
            });
            continue;
        }

        // Narrate planned change (text mode)
        if (!requestedJson) {
            const action = REMEDIATION_REGISTRY.get(finding.remediationKey ?? '');
            console.log(`\n  ${chalk.cyan('→')} Planning fix for: ${chalk.white(finding.name)}`);
            if (action) {
                for (const change of action.plannedChanges) {
                    console.log(`    ${chalk.dim('·')} ${chalk.dim(change)}`);
                }
            }
        }

        const execution = await executeSingleFix(finding, outputPath, overlaysConfig, overlaysDir);
        executions.push(execution);

        if (
            finding.remediationKey === 'manifest-migration' &&
            execution.outcome !== 'fixed' &&
            execution.outcome !== 'already-compliant'
        ) {
            manifestMigrationFailed = true;
        }
    }

    // Add manual-only findings as requires-manual-action
    for (const finding of manualOnly) {
        const action = REMEDIATION_REGISTRY.get(finding.remediationKey ?? '');
        executions.push({
            findingId: finding.id,
            remediationKey: finding.remediationKey ?? 'manual',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: action
                ? action.manualFallback.join(' | ')
                : 'No automatic fix available for this issue',
            rechecked: false,
        });
    }

    // Re-run checks to get final state
    const envChecks = checkEnvironment(outputPath);
    const manifestChecks = checkManifest(outputPath);
    const mergeChecks = checkMergeStrategy(outputPath);
    const finalFindings = [
        ...checksToFindings(envChecks, 'environment', 'environment'),
        ...checksToFindings(manifestChecks, 'manifest', 'manifest'),
        ...checksToFindings(mergeChecks, 'merge', 'devcontainer'),
    ];

    const summary = buildOutcomeSummary(executions);
    const exitDisposition = determineExitDisposition(summary, finalFindings);

    return {
        outputPath,
        requestedJson,
        initialFindings,
        executions,
        finalFindings,
        summary,
        exitDisposition,
    };
}

/**
 * Format the fix run result as user-readable text.
 */
function formatFixRunText(fixRun: FixRun): string {
    const lines: string[] = [];

    if (fixRun.executions.length === 0) {
        lines.push(
            chalk.green('\n✓ No remediation needed — all checked items are already compliant.')
        );
        return lines.join('\n');
    }

    lines.push(chalk.bold('\nRemediation Summary:'));

    for (const ex of fixRun.executions) {
        const finding = fixRun.initialFindings.find((f) => f.id === ex.findingId);
        const name = finding?.name ?? ex.findingId;

        let icon: string;
        let outcomeLabel: string;
        switch (ex.outcome) {
            case 'fixed':
                icon = chalk.green('✓');
                outcomeLabel = chalk.green('fixed');
                break;
            case 'already-compliant':
                icon = chalk.green('✓');
                outcomeLabel = chalk.green('already compliant');
                break;
            case 'skipped':
                icon = chalk.yellow('→');
                outcomeLabel = chalk.yellow('skipped');
                break;
            default:
                icon = chalk.red('✗');
                outcomeLabel = chalk.red('requires manual action');
        }

        lines.push(`  ${icon} ${chalk.white(name)}: ${outcomeLabel}`);
        lines.push(`    ${chalk.dim('Reason:')} ${chalk.dim(ex.reason)}`);

        if (ex.changedFiles && ex.changedFiles.length > 0) {
            lines.push(`    ${chalk.dim('Changed:')} ${chalk.dim(ex.changedFiles.join(', '))}`);
        }
        if (ex.backupPath) {
            lines.push(`    ${chalk.dim('Backup:')}  ${chalk.dim(ex.backupPath)}`);
        }

        // Show manual fallback for requires-manual-action
        if (ex.outcome === 'requires-manual-action') {
            const action = REMEDIATION_REGISTRY.get(ex.remediationKey);
            if (action && action.manualFallback.length > 0) {
                lines.push(`    ${chalk.dim('Manual steps:')}`);
                for (const step of action.manualFallback) {
                    lines.push(`      ${chalk.dim('·')} ${chalk.dim(step)}`);
                }
            }
        }
    }

    // Overall disposition
    lines.push('');
    const { summary, exitDisposition } = fixRun;
    lines.push(chalk.bold('Fix Run Result:'));
    if (summary.fixed > 0) {
        lines.push(`  ${chalk.green('✓')} ${summary.fixed} fixed`);
    }
    if (summary.alreadyCompliant > 0) {
        lines.push(`  ${chalk.green('✓')} ${summary.alreadyCompliant} already compliant`);
    }
    if (summary.skipped > 0) {
        lines.push(`  ${chalk.yellow('→')} ${summary.skipped} skipped`);
    }
    if (summary.requiresManualAction > 0) {
        lines.push(`  ${chalk.red('✗')} ${summary.requiresManualAction} require manual action`);
    }

    const dispositionColour =
        exitDisposition === 'success'
            ? chalk.green
            : exitDisposition === 'repaired-with-warnings'
              ? chalk.yellow
              : chalk.red;
    lines.push(`\n  ${dispositionColour('Exit status:')} ${dispositionColour(exitDisposition)}`);

    return lines.join('\n');
}

/**
 * Doctor command implementation
 */
export async function doctorCommand(
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    options: DoctorOptions
): Promise<void> {
    const outputPath = options.output || './.devcontainer';

    if (!options.json) {
        console.log(
            '\n' +
                boxen(chalk.bold('🔍 Running diagnostics...'), {
                    padding: 0.5,
                    borderColor: 'cyan',
                    borderStyle: 'round',
                })
        );
    }

    // Run all checks
    const environmentChecks = checkEnvironment(outputPath);
    const overlayChecks = checkOverlays(overlaysDir);
    const manifestChecks = checkManifest(outputPath);
    const mergeChecks = checkMergeStrategy(outputPath);
    const manifestPath = path.join(outputPath, 'superposition.json');
    const portChecks = checkPorts(overlaysConfig, manifestPath);

    // Generate report
    const report = generateReport(
        environmentChecks,
        overlayChecks,
        manifestChecks,
        mergeChecks,
        portChecks
    );

    if (options.fix) {
        // ── Fix flow ──────────────────────────────────────────────────────────
        if (!options.json) {
            // Print diagnostic findings first (as normal)
            console.log(formatAsText(report));
        }

        const fixRun = await executeFixRun(
            report,
            outputPath,
            overlaysConfig,
            overlaysDir,
            options.json ?? false
        );

        if (options.json) {
            console.log(JSON.stringify(fixRun, null, 2));
        } else {
            console.log(formatFixRunText(fixRun));
            console.log('');
        }

        if (fixRun.exitDisposition === 'unresolved-failures') {
            process.exit(1);
        } else {
            process.exit(0);
        }
    } else {
        // ── Normal diagnostic output (unchanged) ─────────────────────────────
        if (options.json) {
            console.log(JSON.stringify(report, null, 2));
        } else {
            console.log(formatAsText(report));
        }

        // Exit with appropriate code
        const hasErrors = report.summary.errors > 0;

        if (!options.json) {
            console.log(''); // Empty line at end
        }

        if (hasErrors) {
            process.exit(1);
        } else {
            process.exit(0);
        }
    }
}
