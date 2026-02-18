/**
 * Doctor command - Environment validation and diagnostics
 */

import * as fs from 'fs';
import * as path from 'path';
import * as net from 'net';
import { execSync } from 'child_process';
import chalk from 'chalk';
import boxen from 'boxen';
import type { OverlaysConfig, SuperpositionManifest } from '../schema/types.js';
import { loadOverlayManifest } from '../schema/overlay-loader.js';
import {
    detectManifestVersion,
    isVersionSupported,
    needsMigration,
    CURRENT_MANIFEST_VERSION,
} from '../schema/manifest-migrations.js';
import { MERGE_STRATEGY } from '../utils/merge.js';
import { extractPorts } from '../utils/port-utils.js';

interface DoctorOptions {
    output?: string;
    fix?: boolean;
    json?: boolean;
}

interface CheckResult {
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    details?: string[];
    fixable?: boolean;
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

    return {
        name: 'Node.js version',
        status: ok ? 'pass' : 'fail',
        message: ok
            ? `${nodeVersion} (>= ${requiredVersion} required)`
            : `${nodeVersion} - requires >= ${requiredVersion}`,
        details: ok
            ? undefined
            : [
                  'Update Node.js to version 20 or later',
                  'Visit https://nodejs.org/ to download the latest version',
              ],
    };
}

/**
 * Check if Docker daemon is accessible
 */
function checkDocker(): CheckResult {
    try {
        // Use 'docker info' to verify daemon connectivity, not just CLI presence
        execSync('docker info', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
        // Get version for display
        const version = execSync('docker --version', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'ignore'],
        });
        return {
            name: 'Docker daemon',
            status: 'pass',
            message: version.trim(),
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
        });
        const versionMatch = version.match(/v?(\d+\.\d+\.\d+)/);
        const currentVersion = versionMatch ? versionMatch[1] : '0.0.0';
        const [major] = currentVersion.split('.').map((n) => parseInt(n, 10));

        if (major >= 2) {
            return {
                name: 'Docker Compose',
                status: 'pass',
                message: `v${currentVersion} (v2 required)`,
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
            };
        }
    } catch {
        // Try docker-compose (v1 syntax)
        try {
            const version = execSync('docker-compose --version', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore'],
            });
            return {
                name: 'Docker Compose',
                status: 'warn',
                message: `${version.trim()} - v2 recommended`,
                details: [
                    'Docker Compose v1 detected',
                    'Consider upgrading to v2: docker compose (not docker-compose)',
                ],
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
        });

        // Check for required fields
        if (!manifest.baseTemplate) {
            results.push({
                name: 'Manifest base template',
                status: 'fail',
                message: 'Missing baseTemplate field',
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
                });
            } catch {
                results.push({
                    name: 'DevContainer config',
                    status: 'fail',
                    message: 'devcontainer.json has invalid JSON',
                });
            }
        }
    } catch (error) {
        results.push({
            name: 'Manifest file',
            status: 'fail',
            message: 'Invalid JSON in superposition.json',
            details: [`Parse error: ${error instanceof Error ? error.message : String(error)}`],
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
 * Apply automatic fixes
 */
async function applyFixes(report: DoctorReport, outputPath: string): Promise<void> {
    console.log(chalk.bold('\nApplying fixes...\n'));

    const fixableChecks = [
        ...report.environment,
        ...report.overlays,
        ...report.manifest,
        ...report.merge,
        ...report.ports,
    ].filter((c) => c.fixable);

    if (fixableChecks.length === 0) {
        console.log(chalk.yellow('No automatic fixes available.'));
        return;
    }

    for (const check of fixableChecks) {
        console.log(`  ${chalk.cyan('→')} Fixing: ${check.name}...`);

        // Currently, we don't have any auto-fixable issues
        // This is a placeholder for future fix implementations
        console.log(`    ${chalk.dim('Manual intervention required')}`);
    }
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

    // Output results
    if (options.json) {
        console.log(JSON.stringify(report, null, 2));
    } else {
        console.log(formatAsText(report));
    }

    // Apply fixes if requested
    if (options.fix && !options.json) {
        await applyFixes(report, outputPath);
    }

    // Exit with appropriate code
    const hasErrors = report.summary.errors > 0;
    const hasWarnings = report.summary.warnings > 0;

    if (!options.json) {
        console.log(''); // Empty line at end
    }

    // Exit with error if there are critical failures
    if (hasErrors) {
        process.exit(1);
    } else if (hasWarnings && !options.json) {
        process.exit(0); // Warnings don't fail the command
    } else {
        process.exit(0);
    }
}
