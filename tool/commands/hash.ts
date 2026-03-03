/**
 * Hash command - deterministic environment fingerprint
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import boxen from 'boxen';
import type { OverlaysConfig, Stack } from '../schema/types.js';
import { getToolVersion } from '../utils/version.js';

interface HashOptions {
    stack?: Stack;
    overlays?: string;
    preset?: string;
    base?: string;
    manifest?: string;
    json?: boolean;
    write?: boolean;
    output?: string;
}

export interface HashResult {
    stack: string;
    overlays: string[];
    preset: string | null;
    base: string;
    tool: string;
    hash: string;
    hashFull: string;
}

/**
 * Resolve overlay dependencies recursively (same logic as plan command)
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
                processDeps(reqId);
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
 * Find superposition.json manifest in common locations
 */
function findManifest(manifestPath?: string): string | null {
    const candidates = manifestPath
        ? [manifestPath]
        : [
              'superposition.json',
              '.devcontainer/superposition.json',
              '../superposition.json',
              path.join(process.cwd(), 'superposition.json'),
              path.join(process.cwd(), '.devcontainer', 'superposition.json'),
          ];

    for (const p of candidates) {
        const resolved = path.resolve(p);
        if (fs.existsSync(resolved)) {
            return resolved;
        }
    }
    return null;
}

/**
 * Compute the canonical hash for a given configuration
 */
export function computeHash(
    stack: string,
    overlays: string[],
    preset: string | null,
    base: string,
    toolVersion: string
): { hash: string; hashFull: string } {
    // Major+minor only (e.g. "0.1" from "0.1.4")
    const toolMajorMinor = toolVersion.split('.').slice(0, 2).join('.');

    // Canonical object – keys alphabetically sorted, overlays sorted
    const canonical = {
        base,
        overlays: [...overlays].sort(),
        preset: preset ?? null,
        stack,
        tool: toolMajorMinor,
    };

    const json = JSON.stringify(canonical);
    const hashFull = crypto.createHash('sha256').update(json).digest('hex');
    const hash = hashFull.slice(0, 8);
    return { hash, hashFull };
}

/**
 * Execute the hash command
 */
export async function hashCommand(
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    options: HashOptions
): Promise<void> {
    try {
        let stack: string;
        let selectedOverlays: string[];
        let preset: string | null = null;
        let base: string;

        // Try loading from manifest if no explicit overlays/stack provided
        if (!options.stack && !options.overlays) {
            const manifestPath = findManifest(options.manifest);
            if (!manifestPath) {
                console.error(chalk.red('✗ No manifest found and no --stack/--overlays provided.'));
                console.log(
                    chalk.dim(
                        '  Provide --stack and --overlays, or run from a directory with superposition.json'
                    )
                );
                process.exit(1);
            }

            let rawManifest: unknown;
            try {
                rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            } catch (err) {
                console.error(
                    chalk.red(
                        `✗ Failed to read manifest: ${err instanceof Error ? err.message : String(err)}`
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

            if (!Array.isArray(manifest.overlays)) {
                console.error(chalk.red('✗ Invalid manifest: "overlays" must be an array'));
                process.exit(1);
            }

            stack = manifest.baseTemplate;
            selectedOverlays = (manifest.overlays as unknown[])
                .filter((o): o is string => typeof o === 'string');
            preset = typeof manifest.preset === 'string' ? manifest.preset : null;
            base = options.base ?? (typeof manifest.baseImage === 'string' ? manifest.baseImage : 'bookworm');
        } else {
            // Explicit CLI options
            if (!options.stack) {
                console.error(chalk.red('✗ --stack is required when not reading from manifest'));
                console.log(
                    chalk.dim(
                        '  Example: container-superposition hash --stack compose --overlays postgres,redis'
                    )
                );
                process.exit(1);
            }

            const validStacks: Stack[] = ['plain', 'compose'];
            if (!validStacks.includes(options.stack)) {
                console.error(chalk.red(`✗ Invalid --stack value: ${options.stack}`));
                console.log(chalk.dim(`  Valid values are: ${validStacks.join(', ')}`));
                process.exit(1);
            }

            if (!options.overlays) {
                console.error(chalk.red('✗ --overlays is required when not reading from manifest'));
                console.log(
                    chalk.dim(
                        '  Example: container-superposition hash --stack compose --overlays postgres,redis'
                    )
                );
                process.exit(1);
            }

            stack = options.stack;
            selectedOverlays = options.overlays
                .split(',')
                .map((o) => o.trim())
                .filter(Boolean);
            preset = options.preset ?? null;
            base = options.base ?? 'bookworm';
        }

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

        // Sort resolved overlays alphabetically for canonical representation
        const sortedOverlays = [...resolved].sort();

        const toolVersion = getToolVersion();
        const { hash, hashFull } = computeHash(stack, sortedOverlays, preset, base, toolVersion);

        const result: HashResult = {
            stack,
            overlays: sortedOverlays,
            preset,
            base,
            tool: toolVersion,
            hash,
            hashFull,
        };

        if (options.json) {
            console.log(JSON.stringify(result, null, 2));
        } else {
            // Human-readable output
            const overlayDisplay = sortedOverlays
                .map((id) => (autoAdded.includes(id) ? `${id} (auto)` : id))
                .join(', ');

            const lines = [
                `stack        ${chalk.cyan(stack)}`,
                `overlays     ${chalk.cyan(overlayDisplay || '(none)')}`,
                `preset       ${chalk.cyan(preset ?? '(none)')}`,
                `base         ${chalk.cyan(base)}`,
                `tool         ${chalk.cyan(toolVersion)}`,
                '',
                `hash         ${chalk.green.bold(hash)}`,
            ];

            const box = boxen(lines.join('\n'), {
                title: 'Environment Fingerprint',
                padding: 1,
                borderStyle: 'round',
                borderColor: 'cyan',
            });

            console.log('\n' + box + '\n');
        }

        // --write flag: write hash to .devcontainer/superposition.hash
        if (options.write) {
            const outputDir = options.output
                ? path.resolve(options.output)
                : path.join(process.cwd(), '.devcontainer');

            fs.mkdirSync(outputDir, { recursive: true });
            const hashFilePath = path.join(outputDir, 'superposition.hash');
            fs.writeFileSync(hashFilePath, hashFull + '\n', 'utf-8');

            if (!options.json) {
                console.log(chalk.green(`✓ Hash written to ${hashFilePath}`));
            }
        }
    } catch (error) {
        console.error(chalk.red('✗ Error computing hash:'), error);
        process.exit(1);
    }
}
