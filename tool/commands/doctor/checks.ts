import * as fs from 'fs';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';
import * as yaml from 'js-yaml';
import type {
    OverlaysConfig,
    ProjectConfigSelection,
    SuperpositionManifest,
} from '../../schema/types.js';
import { loadOverlayManifest } from '../../schema/overlay-loader.js';
import {
    CURRENT_MANIFEST_VERSION,
    detectManifestVersion,
    isVersionSupported,
    migrateManifest,
    needsMigration,
} from '../../schema/manifest-migrations.js';
import {
    applyLocalConfigToAnswers,
    buildAnswersFromProjectConfig,
    getOverlayIdsFromProjectSelection,
    loadLocalProjectConfig,
    loadProjectConfig,
    materializeLocalCustomizationConfig,
} from '../../schema/project-config.js';
import { composeDevContainer } from '../../questionnaire/composer.js';
import { mergeAnswers } from '../../questionnaire/answers.js';
import { applyPresetSelections } from '../../questionnaire/presets.js';
import { loadOverlaysContextWrapper } from '../../questionnaire/questionnaire.js';
import { isPathIgnored, listTrackedFilesUnder } from '../../utils/git.js';
import { parseSimpleEnvFile } from '../../utils/env-file.js';
import { resolveComposeNetworkName } from '../../utils/compose-network.js';
import { MERGE_STRATEGY } from '../../utils/merge.js';
import {
    collectOverlayParameters,
    findUnresolvedTokens,
    resolveParameters,
} from '../../utils/parameters.js';
import { extractPorts } from '../../utils/port-utils.js';
import type { CheckResult, DoctorReport } from './types.js';

function composeEnvFilesEnabled(selection: ProjectConfigSelection): boolean {
    return selection.stack !== 'compose' || selection.composeEnvFiles === true;
}

function isVersionAtLeast(current: string, required: string): boolean {
    const parse = (version: string): [number, number, number] => {
        const parts = version.split('.');
        const major = parseInt(parts[0] ?? '0', 10) || 0;
        const minor = parseInt(parts[1] ?? '0', 10) || 0;
        const patch = parseInt(parts[2] ?? '0', 10) || 0;
        return [major, minor, patch];
    };

    const [currentMajor, currentMinor, currentPatch] = parse(current);
    const [requiredMajor, requiredMinor, requiredPatch] = parse(required);

    if (currentMajor !== requiredMajor) {
        return currentMajor > requiredMajor;
    }
    if (currentMinor !== requiredMinor) {
        return currentMinor > requiredMinor;
    }
    return currentPatch >= requiredPatch;
}

export function detectVersionManager(): 'nvm' | 'fnm' | 'volta' | null {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
    const nvmScript = path.join(home, '.nvm', 'nvm.sh');
    if (fs.existsSync(nvmScript)) {
        return 'nvm';
    }

    for (const command of ['fnm', 'volta'] as const) {
        try {
            execSync(`${command} --version`, { stdio: 'ignore', timeout: 3000 });
            return command;
        } catch {
            // ignore
        }
    }

    return null;
}

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

function checkDocker(): CheckResult {
    try {
        execSync('docker info', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore'],
            timeout: 5000,
        });
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

function checkDockerCompose(): CheckResult {
    try {
        const version = execSync('docker compose version', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore'],
            timeout: 5000,
        });
        const versionMatch = version.match(/v?(\d+\.\d+\.\d+)/);
        const currentVersion = versionMatch ? versionMatch[1] : '0.0.0';
        const [major] = currentVersion.split('.').map((value) => parseInt(value, 10));

        if (major >= 2) {
            return {
                name: 'Docker Compose',
                status: 'pass',
                message: `v${currentVersion} (v2 required)`,
                fixEligibility: 'not-applicable',
            };
        }

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
    } catch {
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

function getBaseTemplateFromManifest(
    outputPath: string,
    explicitManifestPath?: string
): SuperpositionManifest['baseTemplate'] | undefined {
    const manifestPath = explicitManifestPath ?? path.join(outputPath, 'superposition.json');
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

export function checkEnvironment(outputPath: string, explicitManifestPath?: string): CheckResult[] {
    const results: CheckResult[] = [checkNodeVersion(), checkDocker()];
    const baseTemplate = getBaseTemplateFromManifest(outputPath, explicitManifestPath);
    if (baseTemplate === 'compose') {
        results.push(checkDockerCompose());
    }
    return results;
}

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

    const requiredFiles = ['devcontainer.patch.json'];
    const missingFiles = requiredFiles.filter(
        (file) => !fs.existsSync(path.join(overlayDir, file))
    );

    const brokenSymlinks: string[] = [];
    for (const entry of fs.readdirSync(overlayDir, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) {
            const linkPath = path.join(overlayDir, entry.name);
            if (!fs.existsSync(linkPath)) {
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

    try {
        const patchPath = path.join(overlayDir, 'devcontainer.patch.json');
        JSON.parse(fs.readFileSync(patchPath, 'utf8'));
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

    if (manifest.imports && manifest.imports.length > 0) {
        const overlaysDir = path.dirname(overlayDir);
        const sharedBase = path.resolve(overlaysDir, '.shared');
        const traversalImports: string[] = [];
        const missingImports: string[] = [];
        const invalidImports: string[] = [];

        for (const importPath of manifest.imports) {
            if (!importPath.startsWith('.shared/')) {
                traversalImports.push(`${importPath} (must begin with '.shared/')`);
                continue;
            }
            const resolved = path.resolve(overlaysDir, importPath);
            if (!resolved.startsWith(sharedBase + path.sep) && resolved !== sharedBase) {
                traversalImports.push(`${importPath} (resolves outside '.shared/' directory)`);
                continue;
            }

            const fullImportPath = path.join(overlaysDir, importPath);
            if (!fs.existsSync(fullImportPath)) {
                missingImports.push(importPath);
                continue;
            }

            const ext = path.extname(importPath).toLowerCase();
            if (!['.json', '.yaml', '.yml', '.env'].includes(ext)) {
                invalidImports.push(`${importPath} (unsupported type: ${ext})`);
            }
        }

        if (traversalImports.length > 0 || missingImports.length > 0 || invalidImports.length > 0) {
            const details: string[] = [];
            if (traversalImports.length > 0) {
                details.push(`Path traversal rejected: ${traversalImports.join(', ')}`);
            }
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

    if (manifest.compose_imports && manifest.compose_imports.length > 0) {
        const overlaysDir = path.dirname(overlayDir);
        const sharedBase = path.resolve(overlaysDir, '.shared');
        const traversalImports: string[] = [];
        const missingImports: string[] = [];
        const invalidImports: string[] = [];

        for (const importPath of manifest.compose_imports) {
            if (!importPath.startsWith('.shared/')) {
                traversalImports.push(`${importPath} (must begin with '.shared/')`);
                continue;
            }
            const resolved = path.resolve(overlaysDir, importPath);
            if (!resolved.startsWith(sharedBase + path.sep) && resolved !== sharedBase) {
                traversalImports.push(`${importPath} (resolves outside '.shared/' directory)`);
                continue;
            }

            const fullImportPath = path.join(overlaysDir, importPath);
            if (!fs.existsSync(fullImportPath)) {
                missingImports.push(importPath);
                continue;
            }

            const ext = path.extname(importPath).toLowerCase();
            if (!['.yaml', '.yml'].includes(ext)) {
                invalidImports.push(`${importPath} (must be .yml or .yaml for compose_imports)`);
            }
        }

        if (traversalImports.length > 0 || missingImports.length > 0 || invalidImports.length > 0) {
            const details: string[] = [];
            if (traversalImports.length > 0) {
                details.push(`Path traversal rejected: ${traversalImports.join(', ')}`);
            }
            if (missingImports.length > 0) {
                details.push(`Missing compose_imports: ${missingImports.join(', ')}`);
            }
            if (invalidImports.length > 0) {
                details.push(`Invalid compose_imports: ${invalidImports.join(', ')}`);
            }
            return {
                name: `Overlay: ${overlayId}`,
                status: 'warn',
                message: 'compose_import validation issues',
                details,
            };
        }
    }

    return { name: `Overlay: ${overlayId}`, status: 'pass', message: 'Valid' };
}

export function checkOverlays(overlaysDir: string, overlayIds?: string[]): CheckResult[] {
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
    const requested = overlayIds ? new Set(overlayIds) : null;
    const overlayDirs = entries.filter(
        (entry) =>
            entry.isDirectory() &&
            !entry.name.startsWith('.') &&
            (!requested || requested.has(entry.name))
    );

    if (overlayDirs.length === 0) {
        return overlayIds && overlayIds.length > 0
            ? []
            : [{ name: 'Overlays', status: 'warn', message: 'No overlays found' }];
    }

    return overlayDirs.map((dir) =>
        validateOverlayManifest(path.join(overlaysDir, dir.name), dir.name)
    );
}

function isPortInUse(port: number): boolean {
    try {
        const server = net.createServer();
        let inUse = false;
        server.once('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE') {
                inUse = true;
            }
        });
        server.listen(port, '127.0.0.1');
        server.close();
        return inUse;
    } catch {
        return false;
    }
}

export function checkPorts(overlaysConfig: OverlaysConfig, manifestPath?: string): CheckResult[] {
    const results: CheckResult[] = [];
    const portsToCheck = new Map<number, string[]>();

    if (manifestPath && fs.existsSync(manifestPath)) {
        try {
            const manifest = JSON.parse(
                fs.readFileSync(manifestPath, 'utf8')
            ) as SuperpositionManifest;
            for (const overlayId of manifest.overlays || []) {
                const overlay = overlaysConfig.overlays.find((item) => item.id === overlayId);
                if (!overlay || !overlay.ports || overlay.ports.length === 0) {
                    continue;
                }
                for (const port of extractPorts([overlay])) {
                    const actualPort = port + (manifest.portOffset || 0);
                    if (!portsToCheck.has(actualPort)) {
                        portsToCheck.set(actualPort, []);
                    }
                    portsToCheck.get(actualPort)?.push(overlay.id);
                }
            }
        } catch {
            // ignore
        }
    }

    for (const [port, overlayIds] of portsToCheck.entries()) {
        if (isPortInUse(port)) {
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

export function checkManifest(outputPath: string, explicitManifestPath?: string): CheckResult[] {
    const manifestPath = explicitManifestPath ?? path.join(outputPath, 'superposition.json');

    if (!explicitManifestPath && !fs.existsSync(outputPath)) {
        return [
            {
                name: 'Devcontainer directory',
                status: 'warn',
                message: `Directory not found: ${outputPath}`,
                details: ['Run "container-superposition init" to create a devcontainer'],
            },
        ];
    }

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

    const results: CheckResult[] = [];
    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as SuperpositionManifest;
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

        if (!manifest.baseTemplate) {
            results.push({
                name: 'Manifest base template',
                status: 'fail',
                message: 'Missing baseTemplate field',
                fixEligibility: 'manual-only',
            });
        }

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
            try {
                JSON.parse(fs.readFileSync(devcontainerPath, 'utf8'));
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

export function checkMergeStrategy(outputPath: string): CheckResult[] {
    const results: CheckResult[] = [
        {
            name: 'Merge strategy version',
            status: 'pass',
            message: `v${MERGE_STRATEGY.version} (${MERGE_STRATEGY.description})`,
        },
    ];

    const devcontainerPath = path.join(outputPath, 'devcontainer.json');
    if (fs.existsSync(devcontainerPath)) {
        try {
            const devcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf8'));
            if (devcontainer.features) {
                const featureKeys = Object.keys(devcontainer.features);
                const duplicateFeatures = featureKeys.filter(
                    (key, index) => featureKeys.indexOf(key) !== index
                );
                results.push(
                    duplicateFeatures.length > 0
                        ? {
                              name: 'Feature merge conflicts',
                              status: 'warn',
                              message: `Duplicate feature keys detected: ${duplicateFeatures.join(', ')}`,
                              details: [
                                  'Features should have unique keys',
                                  'Duplicates may indicate incorrect merge behavior',
                              ],
                          }
                        : {
                              name: 'Feature merge',
                              status: 'pass',
                              message: `${featureKeys.length} features merged successfully`,
                          }
                );
            }

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

            if (devcontainer.forwardPorts && Array.isArray(devcontainer.forwardPorts)) {
                const uniquePorts = new Set(devcontainer.forwardPorts);
                results.push(
                    uniquePorts.size !== devcontainer.forwardPorts.length
                        ? {
                              name: 'Port forwarding merge',
                              status: 'warn',
                              message: 'Duplicate ports in forwardPorts array',
                              details: [
                                  'Port deduplication may have failed',
                                  'This could indicate a merge strategy issue',
                              ],
                          }
                        : {
                              name: 'Port forwarding merge',
                              status: 'pass',
                              message: `${uniquePorts.size} unique ports forwarded`,
                          }
                );
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

    const composePath = path.join(outputPath, 'docker-compose.yml');
    if (fs.existsSync(composePath)) {
        try {
            const compose = yaml.load(fs.readFileSync(composePath, 'utf8')) as any;
            if (compose.services) {
                const serviceNames = Object.keys(compose.services);
                results.push({
                    name: 'Compose service merge',
                    status: 'pass',
                    message: `${serviceNames.length} services merged successfully`,
                });
                const serviceNameSet = new Set(serviceNames);
                let hasInvalidDependencies = false;
                for (const service of Object.values<any>(compose.services)) {
                    if (!service.depends_on) continue;
                    const dependencies = Array.isArray(service.depends_on)
                        ? service.depends_on
                        : Object.keys(service.depends_on);
                    for (const dependency of dependencies) {
                        if (!serviceNameSet.has(dependency)) {
                            hasInvalidDependencies = true;
                            break;
                        }
                    }
                }
                results.push(
                    hasInvalidDependencies
                        ? {
                              name: 'Service dependencies',
                              status: 'warn',
                              message: 'Invalid service dependencies detected',
                              details: [
                                  'Some depends_on references point to non-existent services',
                                  'Dependencies should be filtered during merge',
                              ],
                          }
                        : {
                              name: 'Service dependencies',
                              status: 'pass',
                              message: 'All service dependencies are valid',
                          }
                );
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

export function checkProjectFileDrift(
    overlaysConfig: OverlaysConfig,
    workingDir: string,
    manifestPath: string
): CheckResult[] {
    let projectConfig;
    try {
        projectConfig = loadProjectConfig(overlaysConfig, workingDir);
    } catch {
        return [];
    }
    if (!projectConfig) {
        return [];
    }

    if (!fs.existsSync(manifestPath)) {
        return [
            {
                name: 'Project file drift',
                status: 'warn',
                message:
                    'Project file found but no generated manifest — run `cs regen` to generate',
                fixEligibility: 'not-applicable',
            },
        ];
    }

    let manifest: SuperpositionManifest;
    try {
        const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        manifest = needsMigration(raw) ? migrateManifest(raw) : (raw as SuperpositionManifest);
    } catch {
        return [];
    }

    const autoResolvedAdded = new Set<string>(manifest.autoResolved?.added ?? []);
    const projectOverlays = new Set<string>(
        getOverlayIdsFromProjectSelection(projectConfig.selection, overlaysConfig)
    );
    const manifestBaseOverlays = new Set<string>(
        (manifest.overlays ?? []).filter((overlay) => !autoResolvedAdded.has(overlay))
    );

    const inProjectNotManifest = [...projectOverlays].filter(
        (overlay) => !manifestBaseOverlays.has(overlay)
    );
    const inManifestNotProject = [...manifestBaseOverlays].filter(
        (overlay) => !projectOverlays.has(overlay)
    );

    if (inProjectNotManifest.length === 0 && inManifestNotProject.length === 0) {
        return [
            {
                name: 'Project file drift',
                status: 'pass',
                message: 'Project file and generated manifest are consistent',
                fixEligibility: 'not-applicable',
            },
        ];
    }

    const details: string[] = [];
    if (inProjectNotManifest.length > 0) {
        details.push(`In project file but not in manifest: ${inProjectNotManifest.join(', ')}`);
    }
    if (inManifestNotProject.length > 0) {
        details.push(`In manifest but not in project file: ${inManifestNotProject.join(', ')}`);
    }
    details.push('Run "cs regen" to regenerate with the current project file configuration');

    return [
        {
            name: 'Project file drift',
            status: 'warn',
            message: 'Project file and generated manifest have diverged',
            details,
            fixEligibility: 'manual-only',
        },
    ];
}

function checkCustomizations(selection: ProjectConfigSelection): CheckResult[] {
    const results: CheckResult[] = [];
    const customizations = selection.customizations;
    if (!customizations) {
        return results;
    }

    const hasEnv = Object.keys(selection.env ?? {}).length > 0;
    const hasMounts = (selection.mounts ?? []).length > 0;
    const hasPorts = (selection.ports ?? []).length > 0;

    const patchRemoteEnvCount = Object.keys(
        customizations.devcontainerPatch?.remoteEnv ?? {}
    ).length;
    const composeEnvCount = Object.keys(
        (customizations.dockerComposePatch as any)?.services?.devcontainer?.environment ?? {}
    ).length;
    if ((patchRemoteEnvCount > 0 || composeEnvCount > 0) && !hasEnv) {
        results.push({
            name: 'Prefer top-level env: over customizations',
            findingId: 'customizations-env-promote',
            status: 'warn',
            message:
                'customizations.devcontainerPatch.remoteEnv is set but top-level env: is absent.',
            details: [
                'Move these variables to the top-level env: field.',
                'env: routes automatically for plain and compose stacks and supports {{cs.KEY}} tokens.',
                'See docs/superposition-yml.md#env for migration guidance.',
            ],
            fixEligibility: 'manual-only',
            fixable: false,
        });
    }

    const patchMounts = customizations.devcontainerPatch?.mounts;
    if (Array.isArray(patchMounts) && patchMounts.length > 0 && !hasMounts) {
        results.push({
            name: 'Prefer top-level mounts: over customizations',
            findingId: 'customizations-mounts-promote',
            status: 'warn',
            message:
                'customizations.devcontainerPatch.mounts is set but top-level mounts: is absent.',
            details: [
                'Move mounts to the top-level mounts: field (spec 019).',
                'mounts: provides structured validation and routing for plain and compose stacks.',
            ],
            fixEligibility: 'manual-only',
            fixable: false,
        });
    }

    try {
        const composeServices = (customizations.dockerComposePatch as any)?.services ?? {};
        const hasComposePorts = Object.values(composeServices).some(
            (service: unknown) =>
                Array.isArray((service as any)?.ports) && (service as any).ports.length > 0
        );
        if (hasComposePorts && !hasPorts) {
            results.push({
                name: 'Prefer top-level ports: over customizations',
                findingId: 'customizations-ports-promote',
                status: 'warn',
                message:
                    'customizations.dockerComposePatch contains port bindings but top-level ports: is absent.',
                details: [
                    'Move port bindings to the top-level ports: field.',
                    'ports: supports validation and auto-forward. See spec 024.',
                ],
                fixEligibility: 'manual-only',
                fixable: false,
            });
        }
    } catch {
        // ignore malformed patches
    }

    return results;
}

export function checkParameters(
    overlaysConfig: OverlaysConfig,
    outputPath: string,
    workingDir: string
): CheckResult[] {
    const results: CheckResult[] = [];
    let projectConfig;
    try {
        projectConfig = loadProjectConfig(overlaysConfig, workingDir);
    } catch {
        return [];
    }
    if (!projectConfig) {
        return [];
    }

    const selectedOverlays = getOverlayIdsFromProjectSelection(
        projectConfig.selection,
        overlaysConfig
    );
    const suppliedParams = projectConfig.selection.parameters ?? {};
    const declared = collectOverlayParameters(selectedOverlays, overlaysConfig.overlays);
    const declaredCount = Object.keys(declared).length;

    const filesToScan: Array<[string, string]> = [
        ['devcontainer.json', path.join(outputPath, 'devcontainer.json')],
        ['docker-compose.yml', path.join(outputPath, 'docker-compose.yml')],
        ...(composeEnvFilesEnabled(projectConfig.selection)
            ? ([['.env.example', path.join(outputPath, '.env.example')]] as Array<[string, string]>)
            : []),
    ];

    const unresolvedByFile: string[] = [];
    for (const [label, filePath] of filesToScan) {
        if (!fs.existsSync(filePath)) continue;
        const tokens = findUnresolvedTokens(fs.readFileSync(filePath, 'utf8'));
        if (tokens.length > 0) {
            unresolvedByFile.push(`${label}: ${[...new Set(tokens)].join(', ')}`);
        }
    }
    if (unresolvedByFile.length > 0) {
        results.push({
            name: 'Unresolved parameter tokens',
            status: 'fail',
            message: 'Unsubstituted {{cs.*}} tokens found in generated files',
            details: [
                ...unresolvedByFile,
                'Run "cs regen" or add the missing parameters to your project file',
            ],
            fixEligibility: 'automatic',
            remediationKey: 'parameters-regen',
            fixable: true,
        });
    }

    const devcontainerPath = path.join(outputPath, 'devcontainer.json');
    if (fs.existsSync(devcontainerPath)) {
        try {
            const devcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf8'));
            const remoteEnv: Record<string, string> = devcontainer.remoteEnv ?? {};
            const leakedSecrets = Object.entries(remoteEnv)
                .filter(
                    ([key, value]) =>
                        declared[key]?.sensitive && value !== '' && !value.startsWith('${')
                )
                .map(([key]) => key);
            if (leakedSecrets.length > 0) {
                results.push({
                    name: 'Sensitive parameters in devcontainer',
                    status: 'warn',
                    message: `Secret parameter(s) appear as plain text in devcontainer.json remoteEnv: ${leakedSecrets.join(', ')}`,
                    details: [
                        'Sensitive values should be stored in .env and referenced as ${VAR:-default}',
                        'Run "cs regen" to regenerate with proper secret handling',
                    ],
                    fixEligibility: 'automatic',
                    remediationKey: 'parameters-regen',
                    fixable: true,
                });
            }
        } catch {
            // ignore
        }
    }

    const manifest = (() => {
        const manifestPath = path.join(outputPath, 'superposition.json');
        if (!fs.existsSync(manifestPath)) return null;
        try {
            return JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { baseTemplate?: string };
        } catch {
            return null;
        }
    })();

    if (
        manifest?.baseTemplate === 'compose' &&
        declaredCount > 0 &&
        composeEnvFilesEnabled(projectConfig.selection)
    ) {
        const envExamplePath = path.join(outputPath, '.env.example');
        if (!fs.existsSync(envExamplePath)) {
            results.push({
                name: 'Missing .env.example',
                status: 'warn',
                message: `Compose stack with ${declaredCount} parameter(s) has no .env.example`,
                details: ['Run "cs regen" to generate the .env.example file'],
                fixEligibility: 'automatic',
                remediationKey: 'parameters-regen',
                fixable: true,
            });
        }
    }

    const unknownKeys = Object.keys(suppliedParams).filter((key) => !(key in declared));
    if (unknownKeys.length > 0) {
        results.push({
            name: 'Project-only parameters (not declared by any selected overlay)',
            findingId: 'project-only-parameters',
            status: 'warn',
            message: `parameters: contains ${unknownKeys.length} key(s) not declared by any selected overlay: ${unknownKeys.join(', ')}`,
            details: [
                'These parameters are resolved and available for {{cs.KEY}} substitution',
                'If a key was added by mistake or is left over from a removed overlay, remove it from parameters:',
                `If intentional (e.g. ${unknownKeys.slice(0, 2).join(', ')}), no action needed`,
            ],
            fixEligibility: 'manual-only',
        });
    }

    const { missingRequired } = resolveParameters(declared, suppliedParams);
    if (missingRequired.length > 0) {
        const declaringOverlays = missingRequired
            .map((key) => `${key} (${declared[key]?.overlayId ?? 'unknown'})`)
            .join(', ');
        results.push({
            name: 'Missing required parameters',
            status: 'fail',
            message: `${missingRequired.length} required parameter(s) have no value and no default: ${declaringOverlays}`,
            details: [
                'Add these to the parameters: section in your project file',
                'Run "cs regen" (or doctor --fix) to apply defaults and regenerate',
            ],
            fixEligibility: 'automatic',
            remediationKey: 'parameters-regen',
            fixable: true,
        });
    }

    const sensitiveHardcoded = Object.entries(suppliedParams)
        .filter(([key, value]) => {
            if (!declared[key]?.sensitive) return false;
            if (value.startsWith('${')) return false;
            if (declared[key].default !== undefined && value === declared[key].default)
                return false;
            return true;
        })
        .map(([key]) => key);
    if (sensitiveHardcoded.length > 0) {
        const detailLines = sensitiveHardcoded.map(
            (key) => `${key} — declared sensitive by overlay '${declared[key].overlayId}'`
        );
        detailLines.push(
            'Use ${VAR} or ${VAR:-default} to reference a value from root .env instead.'
        );
        detailLines.push('Add the real value to root .env (which should be gitignored).');
        results.push({
            name: 'Sensitive parameters in project file',
            findingId: 'sensitive-params-project-file',
            status: 'warn',
            message: `Sensitive parameter(s) hardcoded in plain text in superposition.yml parameters: ${sensitiveHardcoded.join(', ')}`,
            details: detailLines,
            fixEligibility: 'manual-only',
            fixable: false,
        });
    }

    const devcontainerEnvPath = path.join(outputPath, '.env');
    if (fs.existsSync(devcontainerEnvPath)) {
        const composeEnvParsed = parseSimpleEnvFile(fs.readFileSync(devcontainerEnvPath, 'utf8'));
        const sensitiveInComposeEnv = Object.entries(composeEnvParsed)
            .filter(([key, value]) => {
                if (!declared[key]?.sensitive) return false;
                if (value.startsWith('${')) return false;
                if (declared[key].default !== undefined && value === declared[key].default)
                    return false;
                return true;
            })
            .map(([key]) => key);
        if (sensitiveInComposeEnv.length > 0) {
            results.push({
                name: 'Sensitive parameters in .devcontainer/.env',
                findingId: 'sensitive-params-devcontainer-env',
                status: 'warn',
                message: `Sensitive parameter(s) written as plain text to .devcontainer/.env: ${sensitiveInComposeEnv.join(', ')}`,
                details: [
                    'If .devcontainer/ is committed to source control, this exposes the secret.',
                    'In superposition.yml parameters:, set ${VAR} instead of a literal value.',
                    'Store the real value in root .env (gitignored).',
                ],
                fixEligibility: 'manual-only',
                fixable: false,
            });
        }
    }

    results.push(...checkCustomizations(projectConfig.selection));

    if (results.length === 0 && declaredCount > 0) {
        const { values } = resolveParameters(declared, suppliedParams);
        results.push({
            name: 'Parameter resolution',
            status: 'pass',
            message: `${Object.keys(values).length} parameter(s) resolved for ${selectedOverlays.length} overlay(s)`,
            fixEligibility: 'not-applicable',
        });
    }

    return results;
}

export function checkDependencies(
    overlaysConfig: OverlaysConfig,
    workingDir: string
): CheckResult[] {
    const overlayMap = new Map(overlaysConfig.overlays.map((overlay) => [overlay.id, overlay]));
    let rawSelectedOverlays: string[] = [];

    try {
        const projectConfig = loadProjectConfig(overlaysConfig, workingDir);
        if (!projectConfig) return [];
        rawSelectedOverlays = getOverlayIdsFromProjectSelection(
            projectConfig.selection,
            overlaysConfig
        );
    } catch {
        for (const fileName of ['.superposition.yml', 'superposition.yml']) {
            const filePath = path.join(workingDir, fileName);
            if (!fs.existsSync(filePath)) continue;
            try {
                const raw = yaml.load(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
                if (Array.isArray(raw?.overlays)) {
                    rawSelectedOverlays = (raw.overlays as unknown[])
                        .filter((value) => typeof value === 'string')
                        .map((value) => value as string);
                }
                break;
            } catch {
                return [];
            }
        }
        if (rawSelectedOverlays.length === 0) return [];
    }

    if (rawSelectedOverlays.length === 0) {
        return [
            {
                name: 'Overlay dependencies',
                status: 'pass',
                message: 'No overlays selected',
                fixEligibility: 'not-applicable',
            },
        ];
    }

    const results: CheckResult[] = [];
    const projectFileSet = new Set<string>(rawSelectedOverlays);

    for (const id of rawSelectedOverlays) {
        if (!overlayMap.has(id)) {
            results.push({
                name: `Unknown overlay: ${id}`,
                status: 'fail',
                message: `Overlay "${id}" not found in registry — it may have been removed or misspelled`,
                details: ['Edit .superposition.yml to correct the overlay ID'],
                fixEligibility: 'manual-only',
            });
            continue;
        }

        const definition = overlayMap.get(id)!;
        for (const requiredOverlay of (definition.requires as string[]) ?? []) {
            if (!projectFileSet.has(requiredOverlay)) {
                results.push({
                    name: `Missing required overlay: ${requiredOverlay}`,
                    status: 'fail',
                    message: `Overlay "${id}" requires "${requiredOverlay}" which is not in your project file`,
                    details: [
                        `Add "${requiredOverlay}" to the overlays: list in .superposition.yml`,
                        'Fixable with --fix flag',
                    ],
                    fixEligibility: 'automatic',
                    remediationKey: 'dependency-fix',
                    fixable: true,
                });
            }
        }

        for (const suggestedOverlay of (definition.suggests as string[]) ?? []) {
            if (!projectFileSet.has(suggestedOverlay)) {
                results.push({
                    name: `Suggested overlay: ${suggestedOverlay}`,
                    status: 'warn',
                    message: `Overlay "${id}" suggests "${suggestedOverlay}" — consider adding it`,
                    details: [
                        `Add "${suggestedOverlay}" to the overlays: list in .superposition.yml for better functionality`,
                    ],
                    fixEligibility: 'not-applicable',
                });
            }
        }
    }

    if (results.length === 0) {
        results.push({
            name: 'Overlay dependencies',
            status: 'pass',
            message: `${rawSelectedOverlays.length} overlay(s) selected; all dependencies satisfied`,
            fixEligibility: 'not-applicable',
        });
    }

    return results;
}

function parseContainerPort(entry: string | number | { target?: number }): number | null {
    if (typeof entry === 'number') return entry > 0 ? entry : null;
    if (typeof entry === 'object' && entry !== null) {
        return typeof entry.target === 'number' && entry.target > 0 ? entry.target : null;
    }
    if (typeof entry !== 'string') return null;
    const withoutProtocol = entry.replace(/\/[a-z]+$/i, '');
    const parts = withoutProtocol.split(':');
    const port = parseInt(parts[parts.length - 1] ?? '', 10);
    return Number.isFinite(port) && port > 0 ? port : null;
}

export function checkPortCrossValidation(outputPath: string): CheckResult[] {
    const composePath = path.join(outputPath, 'docker-compose.yml');
    if (!fs.existsSync(composePath)) {
        return [
            {
                name: 'Port cross-validation',
                status: 'pass',
                message: 'No compose stack — port cross-validation skipped',
                fixEligibility: 'not-applicable',
            },
        ];
    }

    const devcontainerPath = path.join(outputPath, 'devcontainer.json');
    const forwardedPorts = new Set<number>();
    if (fs.existsSync(devcontainerPath)) {
        try {
            const devcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf8'));
            for (const entry of devcontainer.forwardPorts ?? []) {
                const port = parseContainerPort(entry);
                if (port !== null) forwardedPorts.add(port);
            }
        } catch {
            // ignore
        }
    }

    const boundPorts = new Set<number>();
    const exposedPorts = new Set<number>();
    try {
        const document = yaml.load(fs.readFileSync(composePath, 'utf8')) as Record<string, unknown>;
        const services = (document?.services as Record<string, unknown>) ?? {};
        for (const serviceValue of Object.values(services)) {
            const service = serviceValue as Record<string, unknown>;
            for (const entry of (service.ports as unknown[]) ?? []) {
                const port = parseContainerPort(entry as string | number | { target?: number });
                if (port !== null) boundPorts.add(port);
            }
            for (const entry of (service.expose as unknown[]) ?? []) {
                const port = parseContainerPort(entry as string | number | { target?: number });
                if (port !== null) exposedPorts.add(port);
            }
        }
    } catch {
        return [
            {
                name: 'Port cross-validation',
                status: 'fail',
                message:
                    'Could not parse docker-compose.yml for port cross-validation — file may be malformed',
                fixEligibility: 'manual-only',
            },
        ];
    }

    const allComposePorts = new Set([...boundPorts, ...exposedPorts]);
    const results: CheckResult[] = [];

    for (const port of forwardedPorts) {
        if (!allComposePorts.has(port)) {
            results.push({
                name: `Port ${port} not exposed by any service`,
                status: 'fail',
                message: `Port ${port} is listed in forwardPorts but is not exposed by any compose service`,
                details: [`Remove port ${port} from forwardPorts or add it to a compose service`],
                fixEligibility: 'manual-only',
            });
        }
    }

    for (const port of boundPorts) {
        if (!forwardedPorts.has(port)) {
            results.push({
                name: `Port ${port} not forwarded`,
                status: 'warn',
                message: `Port ${port} is bound by a compose service but is not in forwardPorts — it may be inaccessible from the host`,
                details: [
                    `Add ${port} to forwardPorts in your overlay's devcontainer.patch.json, then run cs regen`,
                ],
                fixEligibility: 'manual-only',
            });
        }
    }

    if (results.length === 0) {
        results.push({
            name: 'Port cross-validation',
            status: 'pass',
            message: `${forwardedPorts.size} forwarded port(s) all match compose service declarations`,
            fixEligibility: 'not-applicable',
        });
    }

    return results;
}

export function checkEnvExampleDrift(
    overlaysConfig: OverlaysConfig,
    outputPath: string,
    workingDir: string
): CheckResult[] {
    let projectConfig;
    try {
        projectConfig = loadProjectConfig(overlaysConfig, workingDir);
    } catch {
        return [];
    }
    if (!projectConfig) return [];

    if (!composeEnvFilesEnabled(projectConfig.selection)) {
        return [
            {
                name: '.env.example drift',
                status: 'pass',
                message: 'composeEnvFiles disabled — skipping .env.example drift check',
                fixEligibility: 'not-applicable',
            },
        ];
    }

    const envExamplePath = path.join(outputPath, '.env.example');
    if (!fs.existsSync(envExamplePath)) {
        return [
            {
                name: '.env.example drift',
                status: 'pass',
                message: 'No .env.example present — skipping drift check',
                fixEligibility: 'not-applicable',
            },
        ];
    }

    const selectedOverlays = getOverlayIdsFromProjectSelection(
        projectConfig.selection,
        overlaysConfig
    );
    const declared = collectOverlayParameters(selectedOverlays, overlaysConfig.overlays);
    const declaredKeys = new Set(Object.keys(declared));
    const exampleKeys = new Set<string>();
    for (const line of fs.readFileSync(envExamplePath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const key = trimmed.split('=')[0]?.trim();
        if (key) exampleKeys.add(key);
    }

    const results: CheckResult[] = [];
    for (const [key, declaration] of Object.entries(declared)) {
        if (!exampleKeys.has(key)) {
            results.push({
                name: `Missing .env.example key: ${key}`,
                status: 'fail',
                message: `Parameter "${key}" declared by overlay "${declaration.overlayId}" is missing from .env.example`,
                details: [
                    'Run cs regen or use --fix to regenerate .env.example',
                    'Fixable with --fix flag',
                ],
                fixEligibility: 'automatic',
                remediationKey: 'env-example-regen',
                fixable: true,
            });
        }
    }

    for (const key of exampleKeys) {
        if (!declaredKeys.has(key)) {
            results.push({
                name: `Stale .env.example key: ${key}`,
                status: 'warn',
                message: `Key "${key}" in .env.example is not declared by any selected overlay — it may be stale`,
                details: [
                    `Remove "${key}" from .env.example or run --fix to regenerate`,
                    'Fixable with --fix flag',
                ],
                fixEligibility: 'automatic',
                remediationKey: 'env-example-regen',
                fixable: true,
            });
        }
    }

    if (results.length === 0) {
        results.push({
            name: '.env.example drift',
            status: 'pass',
            message: `.env.example is in sync with ${declaredKeys.size} declared parameter(s)`,
            fixEligibility: 'not-applicable',
        });
    }

    return results;
}

export async function checkReproducibility(
    overlaysConfig: OverlaysConfig,
    outputPath: string,
    overlaysDir: string,
    workingDir: string
): Promise<CheckResult[]> {
    let projectConfig;
    try {
        projectConfig = loadProjectConfig(overlaysConfig, workingDir);
    } catch {
        return [];
    }
    if (!projectConfig) return [];
    if (!fs.existsSync(outputPath) || !fs.existsSync(path.join(outputPath, 'devcontainer.json'))) {
        return [];
    }

    let tmpDir: string | undefined;
    try {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-doctor-repro-'));

        let answers;
        let mergedAnswers;
        try {
            const baseAnswers = buildAnswersFromProjectConfig(
                projectConfig.selection,
                overlaysConfig
            );
            const overlaysContext = loadOverlaysContextWrapper(workingDir);
            const withPreset = await applyPresetSelections(
                baseAnswers,
                overlaysConfig,
                overlaysContext.presetsDir
            );
            const localProjectConfig = loadLocalProjectConfig(workingDir);
            mergedAnswers = mergeAnswers(withPreset, {
                outputPath: tmpDir,
                resolvedCatalogs: overlaysContext.catalogs,
            });
            if (localProjectConfig) {
                answers = applyLocalConfigToAnswers(mergedAnswers, localProjectConfig.selection);
                answers.customizations = materializeLocalCustomizationConfig(
                    localProjectConfig.selection.customizations
                );
            } else {
                answers = mergedAnswers;
            }
            if (answers.stack === 'compose' && !answers.composeNetworkName) {
                answers.composeNetworkName = resolveComposeNetworkName(workingDir, undefined);
            }
        } catch (error) {
            return [
                {
                    name: 'Reproducibility',
                    status: 'fail',
                    message: `Failed to build answers for dry compose: ${error instanceof Error ? error.message : String(error)}`,
                    fixEligibility: 'manual-only',
                },
            ];
        }

        const originalLog = console.log;
        console.log = () => {};
        try {
            const sourceCustom = path.join(outputPath, 'custom');
            if (fs.existsSync(sourceCustom)) {
                fs.cpSync(sourceCustom, path.join(tmpDir, 'custom'), { recursive: true });
            }
            await composeDevContainer(answers, overlaysDir, {
                isRegen: false,
                manifestAnswers: mergedAnswers,
            });
        } catch (error) {
            return [
                {
                    name: 'Reproducibility',
                    status: 'fail',
                    message: `Dry compose failed: ${error instanceof Error ? error.message : String(error)}`,
                    fixEligibility: 'automatic',
                    remediationKey: 'reproducibility-regen',
                    fixable: true,
                },
            ];
        } finally {
            console.log = originalLog;
        }

        const generationHeaders = [
            '# Generated by container-superposition',
            '// Generated by container-superposition',
        ];
        const isGeneratedFile = (filePath: string) => {
            try {
                const firstLine = fs.readFileSync(filePath, 'utf8').split('\n')[0] ?? '';
                return generationHeaders.some((header) => firstLine.startsWith(header));
            } catch {
                return false;
            }
        };
        const listFiles = (dir: string): string[] => {
            const result: string[] = [];
            if (!fs.existsSync(dir)) return result;
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                const full = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    result.push(...listFiles(full).map((file) => path.join(entry.name, file)));
                } else {
                    result.push(entry.name);
                }
            }
            return result;
        };
        const normalise = (content: string, relativePath: string) => {
            const normalized = content.replace(/\r\n/g, '\n');
            if (relativePath === 'superposition.json') {
                try {
                    const object = JSON.parse(normalized) as Record<string, unknown>;
                    delete object.generated;
                    if (object.customizations && typeof object.customizations === 'object') {
                        delete (object.customizations as Record<string, unknown>).location;
                    }
                    return JSON.stringify(object, null, 4);
                } catch {
                    return normalized;
                }
            }
            return normalized;
        };

        const tmpFiles = new Set(listFiles(tmpDir));
        const results: CheckResult[] = [];
        for (const relativePath of tmpFiles) {
            const actualPath = path.join(outputPath, relativePath);
            const expectedPath = path.join(tmpDir, relativePath);
            if (!fs.existsSync(actualPath)) {
                results.push({
                    name: `Missing generated file: ${relativePath}`,
                    status: 'fail',
                    message: `File "${relativePath}" would be created by cs regen but does not exist`,
                    details: ['Run cs regen or use --fix to synchronise'],
                    fixEligibility: 'automatic',
                    remediationKey: 'reproducibility-regen',
                    fixable: true,
                });
            } else if (
                normalise(fs.readFileSync(actualPath, 'utf8'), relativePath) !==
                normalise(fs.readFileSync(expectedPath, 'utf8'), relativePath)
            ) {
                results.push({
                    name: `Out-of-date generated file: ${relativePath}`,
                    status: 'fail',
                    message: `File "${relativePath}" differs from what cs regen would produce — it may have been manually edited or is out of date`,
                    details: ['Run cs regen or use --fix to synchronise'],
                    fixEligibility: 'automatic',
                    remediationKey: 'reproducibility-regen',
                    fixable: true,
                });
            }
        }

        for (const relativePath of listFiles(outputPath)) {
            if (tmpFiles.has(relativePath)) continue;
            const actualPath = path.join(outputPath, relativePath);
            if (isGeneratedFile(actualPath)) {
                results.push({
                    name: `Stale generated file: ${relativePath}`,
                    status: 'warn',
                    message: `File "${relativePath}" exists but cs regen would not produce it — it may be stale`,
                    fixEligibility: 'manual-only',
                });
            }
        }

        if (results.length === 0) {
            results.push({
                name: 'Reproducibility',
                status: 'pass',
                message: 'Generated output matches current project configuration',
                fixEligibility: 'not-applicable',
            });
        }

        return results;
    } finally {
        if (tmpDir) {
            try {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            } catch {
                // ignore cleanup failures
            }
        }
    }
}

function renderGitSafetyPath(projectRoot: string, targetPath: string): string {
    const absolute = path.isAbsolute(targetPath) ? targetPath : path.join(projectRoot, targetPath);
    const relative = path.relative(projectRoot, absolute);
    if (relative === '') return '.';
    if (!relative.startsWith('..') && !path.isAbsolute(relative)) return relative;
    return absolute;
}

export function checkGitTrackingSafety(
    overlaysConfig: OverlaysConfig,
    outputPath: string,
    workingDir: string,
    allOverlays = false
): CheckResult[] {
    if (allOverlays) return [];

    let projectConfig;
    try {
        projectConfig = loadProjectConfig(overlaysConfig, workingDir);
    } catch {
        return [];
    }
    if (!projectConfig) return [];

    const results: CheckResult[] = [];
    const displayOutputPath = renderGitSafetyPath(workingDir, outputPath);

    if (projectConfig.selection.devcontainerGitignore === true) {
        const trackedOutput = listTrackedFilesUnder(workingDir, outputPath);
        if (trackedOutput.ok && (trackedOutput.value?.length ?? 0) > 0) {
            results.push({
                name: 'Generated output tracked by Git',
                findingId: 'tracked-generated-output',
                status: 'warn',
                message: `Generated output under "${displayOutputPath}" is still tracked by Git even though devcontainerGitignore is enabled. Run git rm -r --cached -- ${displayOutputPath}`,
                details: [
                    'Ignore rules protect new files only; already-tracked files stay tracked.',
                    `Run: git rm -r --cached -- ${displayOutputPath}`,
                ],
                fixEligibility: 'manual-only',
                remediationKey: 'tracked-generated-output-manual',
            });
        }
    }

    const localConfigPath = path.join(workingDir, 'superposition.local.yml');
    if (!fs.existsSync(localConfigPath)) {
        return results;
    }

    const localIgnored = isPathIgnored(workingDir, 'superposition.local.yml');
    if (localIgnored.ok && localIgnored.value === false) {
        results.push({
            name: 'Local config not ignored by Git',
            findingId: 'local-config-gitignore-missing',
            status: 'warn',
            message: 'superposition.local.yml exists but is not ignored by Git',
            details: [
                'Local-only config should stay untracked in shared repositories.',
                'Run doctor --fix to append superposition.local.yml to root .gitignore.',
            ],
            fixEligibility: 'automatic',
            remediationKey: 'local-config-gitignore',
            fixable: true,
        });
    }

    const trackedLocalConfig = listTrackedFilesUnder(workingDir, 'superposition.local.yml');
    if (trackedLocalConfig.ok && (trackedLocalConfig.value?.length ?? 0) > 0) {
        results.push({
            name: 'Local-only config tracked by Git',
            findingId: 'tracked-local-config',
            status: 'warn',
            message:
                'superposition.local.yml is tracked by Git. Run git rm --cached -- superposition.local.yml',
            details: [
                'Local-only config should not stay committed to shared history.',
                'Run: git rm --cached -- superposition.local.yml',
            ],
            fixEligibility: 'manual-only',
            remediationKey: 'tracked-local-config-manual',
        });
    }

    return results;
}

export function generateReport(
    environmentChecks: CheckResult[],
    overlayChecks: CheckResult[],
    manifestChecks: CheckResult[],
    mergeChecks: CheckResult[],
    portChecks: CheckResult[],
    driftChecks: CheckResult[] = [],
    parametersChecks: CheckResult[] = [],
    dependenciesChecks: CheckResult[] = [],
    portCrossValidationChecks: CheckResult[] = [],
    envExampleDriftChecks: CheckResult[] = [],
    reproducibilityChecks: CheckResult[] = [],
    gitTrackingSafetyChecks: CheckResult[] = []
): DoctorReport {
    const allChecks = [
        ...environmentChecks,
        ...overlayChecks,
        ...manifestChecks,
        ...mergeChecks,
        ...portChecks,
        ...driftChecks,
        ...parametersChecks,
        ...dependenciesChecks,
        ...portCrossValidationChecks,
        ...envExampleDriftChecks,
        ...reproducibilityChecks,
        ...gitTrackingSafetyChecks,
    ];

    return {
        environment: environmentChecks,
        overlays: overlayChecks,
        manifest: manifestChecks,
        merge: mergeChecks,
        ports: portChecks,
        drift: driftChecks,
        parameters: parametersChecks,
        dependencies: dependenciesChecks,
        portCrossValidation: portCrossValidationChecks,
        envExampleDrift: envExampleDriftChecks,
        reproducibility: reproducibilityChecks,
        gitTrackingSafety: gitTrackingSafetyChecks,
        summary: {
            passed: allChecks.filter((check) => check.status === 'pass').length,
            warnings: allChecks.filter((check) => check.status === 'warn').length,
            errors: allChecks.filter((check) => check.status === 'fail').length,
            fixable: allChecks.filter((check) => check.fixable).length,
        },
    };
}
