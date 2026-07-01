import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import type { Stack } from '../../schema/types.js';
import type { PlanInputMode, PlanOptions, ResolutionOrigin } from './types.js';

export interface ResolvedPlanInput {
    stack: Stack;
    selectedOverlays: string[];
    inputMode: PlanInputMode;
    selectionOrigin: ResolutionOrigin;
    portOffset: number;
    outputPath: string;
}

export function findManifest(manifestPath: string): string | null {
    const resolved = path.resolve(manifestPath);
    return fs.existsSync(resolved) ? resolved : null;
}

export function loadPlanManifest(manifestPath: string): {
    baseTemplate: Stack;
    overlays: string[];
} {
    let rawManifest: unknown;

    try {
        rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch (error) {
        console.error(
            chalk.red(
                `✗ Failed to read manifest: ${error instanceof Error ? error.message : String(error)}`
            )
        );
        process.exit(1);
    }

    if (typeof rawManifest !== 'object' || rawManifest === null) {
        console.error(chalk.red('✗ Invalid manifest: expected a JSON object'));
        process.exit(1);
    }

    const manifest = rawManifest as Record<string, unknown>;

    if (!manifest.baseTemplate || typeof manifest.baseTemplate !== 'string') {
        console.error(chalk.red('✗ Invalid manifest: missing or invalid "baseTemplate"'));
        process.exit(1);
    }

    const validStacks: Stack[] = ['plain', 'compose'];
    if (!validStacks.includes(manifest.baseTemplate as Stack)) {
        console.error(
            chalk.red(
                `✗ Invalid manifest: "baseTemplate" must be one of: ${validStacks.join(', ')}`
            )
        );
        process.exit(1);
    }

    if (!Array.isArray(manifest.overlays)) {
        console.error(chalk.red('✗ Invalid manifest: "overlays" must be an array'));
        process.exit(1);
    }

    if (!manifest.overlays.every((overlay) => typeof overlay === 'string')) {
        console.error(chalk.red('✗ Invalid manifest: "overlays" must be an array of strings'));
        process.exit(1);
    }

    return {
        baseTemplate: manifest.baseTemplate as Stack,
        overlays: manifest.overlays as string[],
    };
}

export function resolvePlanInput(options: PlanOptions): ResolvedPlanInput {
    const validStacks: Stack[] = ['plain', 'compose'];
    let stack: Stack;
    let selectedOverlays: string[];
    let inputMode: PlanInputMode;
    let selectionOrigin: ResolutionOrigin;

    if (options.fromManifest) {
        if (options.overlays) {
            console.error(chalk.red('✗ Use either --overlays or --from-manifest for plan command'));
            process.exit(1);
        }

        const manifestPath = findManifest(options.fromManifest);
        if (!manifestPath) {
            console.error(chalk.red(`✗ Could not find manifest file: ${options.fromManifest}`));
            process.exit(1);
        }

        const manifest = loadPlanManifest(manifestPath);

        if (options.stack && options.stack !== manifest.baseTemplate) {
            console.error(
                chalk.red(
                    `✗ --stack ${options.stack} does not match manifest baseTemplate ${manifest.baseTemplate}`
                )
            );
            process.exit(1);
        }

        stack = manifest.baseTemplate;
        inputMode = 'manifest';
        selectionOrigin = 'manifest';

        const seenOverlayIds = new Set<string>();
        selectedOverlays = manifest.overlays
            .map((id) => id.trim())
            .filter((id) => {
                if (!id || seenOverlayIds.has(id)) {
                    return false;
                }
                seenOverlayIds.add(id);
                return true;
            });
    } else {
        const resolvedStack = options.stack ?? 'compose';

        if (!validStacks.includes(resolvedStack)) {
            console.error(chalk.red(`✗ Invalid --stack value: ${resolvedStack}`));
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

        stack = resolvedStack;
        inputMode = 'overlay-list';
        selectionOrigin = 'command-line';

        const seenOverlayIds = new Set<string>();
        selectedOverlays = options.overlays
            .split(',')
            .map((overlay) => overlay.trim())
            .filter((id) => {
                if (!id || seenOverlayIds.has(id)) {
                    return false;
                }
                seenOverlayIds.add(id);
                return true;
            });
    }

    return {
        stack,
        selectedOverlays,
        inputMode,
        selectionOrigin,
        portOffset: options.portOffset || 0,
        outputPath: options.output || '.devcontainer',
    };
}
