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
    files.push(path.join(outputPath, '.env.example'));
    files.push(path.join(outputPath, 'README.md'));

    // Check for docker-compose
    for (const id of overlayIds) {
        const composePath = path.join(overlaysDir, id, 'docker-compose.yml');
        if (fs.existsSync(composePath)) {
            files.push(path.join(outputPath, 'docker-compose.yml'));
            break;
        }
    }

    // Overlay-specific files
    for (const id of overlayIds) {
        const overlayDir = path.join(overlaysDir, id);
        if (!fs.existsSync(overlayDir)) continue;

        const overlayFiles = fs.readdirSync(overlayDir);
        for (const file of overlayFiles) {
            // Setup and verify scripts
            if (file.startsWith('setup') && file.endsWith('.sh')) {
                files.push(path.join(outputPath, file));
            }
            if (file.startsWith('verify') && file.endsWith('.sh')) {
                files.push(path.join(outputPath, file));
            }
            // Global packages/tools files
            if (file.startsWith('global-')) {
                files.push(path.join(outputPath, file));
            }
        }
    }

    // Deduplicate
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
            console.log(chalk.dim('  Example: container-superposition plan --stack compose --overlays postgres,grafana'));
            process.exit(1);
        }

        if (!options.overlays) {
            console.error(chalk.red('✗ --overlays is required for plan command'));
            console.log(chalk.dim('  Example: container-superposition plan --stack compose --overlays postgres,grafana'));
            process.exit(1);
        }

        // Parse overlays
        const selectedOverlays = options.overlays.split(',').map((o) => o.trim());
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

        // Detect conflicts
        const conflicts = detectConflicts(resolved, overlaysConfig);

        // Get port mappings
        const portMappings = getPortMappings(resolved, overlaysConfig, portOffset);

        // Get files to create
        const files = getFilesToCreate(resolved, overlaysDir, '.devcontainer');

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
