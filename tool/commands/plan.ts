/**
 * Plan command - Preview what will happen before generation
 */

import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import boxen from 'boxen';
import type { OverlayMetadata, OverlaysConfig, Stack } from '../schema/types.js';

interface PlanOptions {
    stack?: Stack;
    overlays?: string;
    portOffset?: number;
    json?: boolean;
}

/**
 * Resolve dependencies recursively
 */
function resolveDependencies(
    selectedIds: string[],
    overlaysConfig: OverlaysConfig
): {
    resolved: string[];
    autoAdded: string[];
} {
    const overlayMap = new Map(overlaysConfig.overlays.map((o) => [o.id, o]));
    const resolved = new Set<string>(selectedIds);
    const autoAdded: string[] = [];

    const processDeps = (id: string) => {
        const overlay = overlayMap.get(id);
        if (!overlay || !overlay.requires) return;

        for (const reqId of overlay.requires) {
            if (!resolved.has(reqId)) {
                resolved.add(reqId);
                autoAdded.push(reqId);
                processDeps(reqId); // Recursive
            }
        }
    };

    for (const id of selectedIds) {
        processDeps(id);
    }

    return {
        resolved: Array.from(resolved),
        autoAdded,
    };
}

/**
 * Detect conflicts in selected overlays
 */
function detectConflicts(
    overlayIds: string[],
    overlaysConfig: OverlaysConfig
): Array<{ overlay: string; conflictsWith: string[] }> {
    const overlayMap = new Map(overlaysConfig.overlays.map((o) => [o.id, o]));
    const conflicts: Array<{ overlay: string; conflictsWith: string[] }> = [];

    for (const id of overlayIds) {
        const overlay = overlayMap.get(id);
        if (!overlay || !overlay.conflicts || overlay.conflicts.length === 0) continue;

        const conflicting = overlay.conflicts.filter((c) => overlayIds.includes(c));
        if (conflicting.length > 0) {
            conflicts.push({
                overlay: id,
                conflictsWith: conflicting,
            });
        }
    }

    return conflicts;
}

/**
 * Get all files that will be created/modified
 */
function getFilesToCreate(overlayIds: string[], overlaysDir: string, outputPath: string): string[] {
    const files: string[] = [];

    // Base devcontainer files
    files.push(path.join(outputPath, 'devcontainer.json'));
    files.push(path.join(outputPath, 'superposition.json'));
    files.push(path.join(outputPath, 'README.md'));

    // Check if any overlay has .env.example
    let hasEnvExample = false;
    for (const id of overlayIds) {
        const envPath = path.join(overlaysDir, id, '.env.example');
        if (fs.existsSync(envPath)) {
            hasEnvExample = true;
            break;
        }
    }
    if (hasEnvExample) {
        files.push(path.join(outputPath, '.env.example'));
    }

    // Check for docker-compose
    for (const id of overlayIds) {
        const composePath = path.join(overlaysDir, id, 'docker-compose.yml');
        if (fs.existsSync(composePath)) {
            files.push(path.join(outputPath, 'docker-compose.yml'));
            break;
        }
    }

    // Check if we need scripts directory
    const hasScripts = overlayIds.some(
        (id) =>
            fs.existsSync(path.join(overlaysDir, id, 'setup.sh')) ||
            fs.existsSync(path.join(overlaysDir, id, 'verify.sh'))
    );

    // Overlay-specific files (mirroring composer behavior)
    for (const id of overlayIds) {
        const overlayDir = path.join(overlaysDir, id);
        if (!fs.existsSync(overlayDir)) continue;

        const overlayEntries = fs.readdirSync(overlayDir, { withFileTypes: true });
        for (const entry of overlayEntries) {
            const name = entry.name;

            // Setup and verify scripts are copied into .devcontainer/scripts with overlay suffix
            if (entry.isFile() && name.startsWith('setup') && name.endsWith('.sh')) {
                files.push(path.join(outputPath, 'scripts', `setup-${id}.sh`));
            }
            if (entry.isFile() && name.startsWith('verify') && name.endsWith('.sh')) {
                files.push(path.join(outputPath, 'scripts', `verify-${id}.sh`));
            }

            // Global packages/tools files and directories get an <overlay> suffix
            if (name.startsWith('global-')) {
                if (entry.isFile()) {
                    const ext = path.extname(name);
                    const base = ext.length > 0 ? name.slice(0, -ext.length) : name;
                    const targetName = `${base}-${id}${ext}`;
                    files.push(path.join(outputPath, targetName));
                } else if (entry.isDirectory()) {
                    const targetName = `${name}-${id}`;
                    files.push(path.join(outputPath, targetName));
                }
            }
        }
    }

    // Deduplicate and sort
    return Array.from(new Set(files)).sort();
}

/**
 * Get port mappings with offset applied
 */
function getPortMappings(
    overlayIds: string[],
    overlaysConfig: OverlaysConfig,
    portOffset: number
): Array<{ overlay: string; ports: number[]; offsetPorts: number[] }> {
    const overlayMap = new Map(overlaysConfig.overlays.map((o) => [o.id, o]));
    const mappings: Array<{ overlay: string; ports: number[]; offsetPorts: number[] }> = [];

    for (const id of overlayIds) {
        const overlay = overlayMap.get(id);
        if (!overlay || !overlay.ports || overlay.ports.length === 0) continue;

        mappings.push({
            overlay: id,
            ports: overlay.ports,
            offsetPorts: overlay.ports.map((p) => p + portOffset),
        });
    }

    return mappings;
}

/**
 * Format plan as text
 */
function formatAsText(
    plan: {
        stack: Stack;
        selectedOverlays: string[];
        autoAddedOverlays: string[];
        conflicts: Array<{ overlay: string; conflictsWith: string[] }>;
        portMappings: Array<{ overlay: string; ports: number[]; offsetPorts: number[] }>;
        files: string[];
        portOffset: number;
    },
    overlaysConfig: OverlaysConfig
): string {
    const lines: string[] = [];
    const overlayMap = new Map(overlaysConfig.overlays.map((o) => [o.id, o]));

    lines.push(
        boxen(chalk.bold('Generation Plan'), {
            padding: 0.5,
            borderColor: 'cyan',
            borderStyle: 'round',
        })
    );

    // Stack
    lines.push('');
    lines.push(chalk.bold('Stack:') + ` ${plan.stack}`);

    // Overlays
    lines.push('');
    lines.push(chalk.bold('Overlays Selected:'));
    for (const id of plan.selectedOverlays) {
        const overlay = overlayMap.get(id);
        const name = overlay ? ` (${overlay.name})` : '';
        lines.push(`  ✓ ${chalk.cyan(id)}${chalk.gray(name)}`);
    }

    // Auto-added dependencies
    if (plan.autoAddedOverlays.length > 0) {
        lines.push('');
        lines.push(chalk.bold('Auto-Added Dependencies:'));
        for (const id of plan.autoAddedOverlays) {
            const overlay = overlayMap.get(id);
            const name = overlay ? ` (${overlay.name})` : '';
            lines.push(`  ${chalk.yellow('+')} ${chalk.cyan(id)}${chalk.gray(name)}`);
        }
    }

    // Conflicts
    if (plan.conflicts.length > 0) {
        lines.push('');
        lines.push(chalk.bold.red('⚠ Conflicts Detected:'));
        for (const conflict of plan.conflicts) {
            lines.push(
                `  ${chalk.red('✗')} ${chalk.cyan(conflict.overlay)} conflicts with: ${conflict.conflictsWith.join(', ')}`
            );
        }
        lines.push('');
        lines.push(chalk.yellow('  These conflicts must be resolved before generation.'));
    }

    // Port mappings
    if (plan.portMappings.length > 0) {
        lines.push('');
        lines.push(chalk.bold('Port Mappings:'));
        if (plan.portOffset > 0) {
            lines.push(chalk.dim(`  (Offset: +${plan.portOffset})`));
        }
        for (const mapping of plan.portMappings) {
            for (let i = 0; i < mapping.ports.length; i++) {
                const original = mapping.ports[i];
                const offset = mapping.offsetPorts[i];
                const arrow = plan.portOffset > 0 ? ` → ${offset}` : '';
                lines.push(`  ${chalk.cyan(mapping.overlay)}: ${original}${arrow}`);
            }
        }
    }

    // Files
    lines.push('');
    lines.push(chalk.bold('Files to Create/Modify:'));
    const grouped = new Map<string, string[]>();
    for (const file of plan.files) {
        const dir = path.dirname(file);
        if (!grouped.has(dir)) {
            grouped.set(dir, []);
        }
        grouped.get(dir)!.push(path.basename(file));
    }

    for (const [dir, files] of grouped) {
        lines.push(`  ${chalk.dim(dir)}/`);
        for (const file of files) {
            lines.push(`    📄 ${file}`);
        }
    }

    return lines.join('\n');
}

/**
 * Execute plan command
 */
export async function planCommand(
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    options: PlanOptions
) {
    try {
        // Validate required options
        if (!options.stack) {
            console.error(chalk.red('✗ --stack is required for plan command'));
            console.log(
                chalk.dim(
                    '  Example: container-superposition plan --stack compose --overlays postgres,grafana'
                )
            );
            process.exit(1);
        }

        // Validate stack value
        const validStacks: Stack[] = ['plain', 'compose'];
        if (!validStacks.includes(options.stack)) {
            console.error(chalk.red(`✗ Invalid --stack value: ${options.stack}`));
            console.log(
                chalk.dim(
                    `  Valid values are: ${validStacks.join(', ')}\n` +
                        '  Example: container-superposition plan --stack compose --overlays postgres,grafana'
                )
            );
            process.exit(1);
        }

        if (!options.overlays) {
            console.error(chalk.red('✗ --overlays is required for plan command'));
            console.log(
                chalk.dim(
                    '  Example: container-superposition plan --stack compose --overlays postgres,grafana'
                )
            );
            process.exit(1);
        }

        // Parse overlays - filter empty entries and deduplicate
        const seenOverlayIds = new Set<string>();
        const selectedOverlays = options.overlays
            .split(',')
            .map((o) => o.trim())
            .filter((id) => {
                if (!id) {
                    return false;
                }
                if (seenOverlayIds.has(id)) {
                    return false;
                }
                seenOverlayIds.add(id);
                return true;
            });
        const portOffset = options.portOffset || 0;

        // Validate overlays exist
        const overlayMap = new Map(overlaysConfig.overlays.map((o) => [o.id, o]));
        for (const id of selectedOverlays) {
            if (!overlayMap.has(id)) {
                console.error(chalk.red(`✗ Unknown overlay: ${id}`));
                console.log(
                    chalk.dim('\n💡 Use "container-superposition list" to see available overlays\n')
                );
                process.exit(1);
            }
        }

        // Resolve dependencies
        const { resolved, autoAdded } = resolveDependencies(selectedOverlays, overlaysConfig);

        // Apply stack compatibility filtering (match composeDevContainer behavior)
        let compatibleResolved = resolved;
        const incompatible: string[] = [];
        compatibleResolved = resolved.filter((id) => {
            const overlay = overlayMap.get(id);
            if (!overlay) {
                return false;
            }

            // Check if overlay supports this stack
            if (overlay.supports && overlay.supports.length > 0) {
                const isCompatible = overlay.supports.includes(options.stack!);
                if (!isCompatible) {
                    incompatible.push(id);
                }
                return isCompatible;
            }

            // Empty supports array means supports all stacks
            return true;
        });

        // Warn about incompatible overlays
        for (const id of incompatible) {
            console.warn(
                chalk.yellow(
                    `⚠ Overlay "${id}" does not support stack "${options.stack}" and will be skipped.`
                )
            );
        }

        // Detect conflicts
        const conflicts = detectConflicts(compatibleResolved, overlaysConfig);

        // Get port mappings
        const portMappings = getPortMappings(compatibleResolved, overlaysConfig, portOffset);

        // Get files to create
        const files = getFilesToCreate(compatibleResolved, overlaysDir, '.devcontainer');

        const plan = {
            stack: options.stack,
            selectedOverlays,
            autoAddedOverlays: autoAdded,
            conflicts,
            portMappings,
            files,
            portOffset,
        };

        // Output as JSON
        if (options.json) {
            console.log(JSON.stringify(plan, null, 2));
            return;
        }

        // Output as formatted text
        console.log('\n' + formatAsText(plan, overlaysConfig) + '\n');

        // Summary
        if (conflicts.length > 0) {
            console.log(
                chalk.yellow(
                    '⚠ Cannot proceed with generation due to conflicts. Remove conflicting overlays.\n'
                )
            );
            process.exit(1);
        } else {
            console.log(
                chalk.green('✓ No conflicts detected. Ready to generate!\n') +
                    chalk.dim(
                        `  Run: container-superposition init --stack ${options.stack} --overlays ${options.overlays}${portOffset > 0 ? ` --port-offset ${portOffset}` : ''}\n`
                    )
            );
        }
    } catch (error) {
        console.error(chalk.red('✗ Error creating plan:'), error);
        process.exit(1);
    }
}
