import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { OverlaysConfig, Stack } from '../schema/types.js';
import { findProjectConfig } from '../schema/project-config.js';
import { getToolVersion } from '../utils/version.js';
import { describeSource } from '../ux/semantics/source.js';
import type { NextStep } from '../ux/semantics/types.js';
import { renderFrame, renderList, renderNextStep, renderSection } from '../ux/renderers/common.js';

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

function resolveDependencies(
    selectedIds: string[],
    overlaysConfig: OverlaysConfig
): { resolved: string[]; autoAdded: string[] } {
    const overlayMap = new Map(overlaysConfig.overlays.map((overlay) => [overlay.id, overlay]));
    const resolved = new Set<string>(selectedIds);
    const autoAdded: string[] = [];
    const visit = (id: string) => {
        const overlay = overlayMap.get(id);
        for (const required of overlay?.requires ?? []) {
            if (resolved.has(required)) continue;
            resolved.add(required);
            autoAdded.push(required);
            visit(required);
        }
    };
    selectedIds.forEach(visit);
    return { resolved: [...resolved], autoAdded };
}

function findManifest(manifestPath?: string): string | null {
    const candidates = manifestPath
        ? [manifestPath]
        : [
              'superposition.json',
              '.devcontainer/superposition.json',
              path.join(process.cwd(), '.devcontainer', 'superposition.json'),
          ];
    for (const candidate of candidates) {
        const resolved = path.resolve(candidate);
        if (fs.existsSync(resolved)) return resolved;
    }
    return null;
}

function buildHashNextStep(input: {
    manifestPath?: string;
    stack: string;
    overlays: string[];
    preset: string | null;
    base: string;
}): NextStep {
    if (input.manifestPath) {
        return {
            command: `cs plan --from-manifest ${input.manifestPath}`,
            reason: 'preview the normalized intent you want to compare against',
        };
    }

    if (input.preset || input.base !== 'bookworm') {
        return { command: null, reason: 'no equivalent concrete preview command for this input' };
    }

    return {
        command: `cs plan --stack ${input.stack} --overlays ${input.overlays.join(',')}`,
        reason: 'preview the normalized intent you want to compare against',
    };
}

export function computeHash(
    stack: string,
    overlays: string[],
    preset: string | null,
    base: string,
    toolVersion: string
): { hash: string; hashFull: string } {
    const canonical = {
        base,
        overlays: [...overlays].sort(),
        preset: preset ?? null,
        stack,
        tool: toolVersion,
    };
    const hashFull = crypto.createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
    return { hash: hashFull.slice(0, 8), hashFull };
}

export async function hashCommand(
    overlaysConfig: OverlaysConfig,
    _overlaysDir: string,
    options: HashOptions
): Promise<void> {
    try {
        let stack: string;
        let selectedOverlays: string[];
        let preset: string | null = null;
        let base: string;
        let manifestPath: string | undefined;

        if (!options.stack && !options.overlays) {
            manifestPath = findManifest(options.manifest) ?? undefined;
            if (!manifestPath) {
                console.error(
                    'Missing input: provide --stack and --overlays, or run from repo with superposition.json.'
                );
                process.exit(1);
            }
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<
                string,
                unknown
            >;
            stack = String(manifest.baseTemplate ?? 'compose');
            selectedOverlays = Array.isArray(manifest.overlays)
                ? manifest.overlays.map(String)
                : [];
            preset = typeof manifest.preset === 'string' ? manifest.preset : null;
            base =
                typeof manifest.baseImage === 'string'
                    ? manifest.baseImage
                    : (options.base ?? 'bookworm');
        } else {
            if (!options.stack || !options.overlays) {
                console.error('Missing input: --stack and --overlays must be provided together.');
                process.exit(1);
            }
            stack = options.stack;
            selectedOverlays = options.overlays
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean);
            preset = options.preset ?? null;
            base = options.base ?? 'bookworm';
        }

        const overlayMap = new Map(overlaysConfig.overlays.map((overlay) => [overlay.id, overlay]));
        for (const overlayId of selectedOverlays) {
            if (!overlayMap.has(overlayId)) {
                console.error(`Unknown overlay: ${overlayId}`);
                process.exit(1);
            }
        }

        const { resolved, autoAdded } = resolveDependencies(selectedOverlays, overlaysConfig);
        const compatibleResolved = resolved.filter((overlayId) => {
            const overlay = overlayMap.get(overlayId);
            return (
                !overlay?.supports ||
                overlay.supports.length === 0 ||
                overlay.supports.includes(stack as Stack)
            );
        });
        const sortedOverlays = [...compatibleResolved].sort();
        const tool = getToolVersion().split('.').slice(0, 2).join('.');
        const { hash, hashFull } = computeHash(stack, sortedOverlays, preset, base, tool);
        const source = describeSource({ manifestPath, hasCliSelection: !manifestPath });
        const nextStepModel = buildHashNextStep({
            manifestPath,
            stack,
            overlays: sortedOverlays,
            preset,
            base,
        });

        const writeLocation = options.write
            ? path.join(
                  options.output
                      ? path.resolve(options.output)
                      : path.join(process.cwd(), '.devcontainer'),
                  'superposition.hash'
              )
            : null;

        let writeChanged: boolean | null = null;
        if (writeLocation) {
            fs.mkdirSync(path.dirname(writeLocation), { recursive: true });
            const prior = fs.existsSync(writeLocation)
                ? fs.readFileSync(writeLocation, 'utf8')
                : null;
            const nextValue = `${hashFull}\n`;
            writeChanged = prior !== nextValue;
            fs.writeFileSync(writeLocation, nextValue, 'utf8');
        }

        const model = {
            source,
            stack,
            overlays: sortedOverlays,
            normalizedDependencies: autoAdded.filter((overlayId) =>
                sortedOverlays.includes(overlayId)
            ),
            preset,
            base,
            tool,
            hash,
            hashFull,
            writeLocation,
            writeChanged,
            nextStep: nextStepModel,
        };

        if (options.json) {
            console.log(JSON.stringify(model, null, 2));
            return;
        }

        const currentSetup = manifestPath
            ? 'compatibility manifest present'
            : findProjectConfig(process.cwd()).length > 0
              ? 'shared project file present'
              : 'CLI selection only';
        const frame = renderFrame([
            { label: 'Mode', value: 'Fingerprint' },
            { label: 'Source', value: `${source.label} — ${source.detail}` },
            { label: 'Current setup', value: currentSetup },
            {
                label: 'What this helps you decide',
                value: 'whether two resolved intents are semantically same',
            },
        ]);
        const sections = [
            renderSection('Comparison summary', [
                'use this to compare normalized intent across runs, repos, or CI checks',
                'equal values mean same resolved overlays, stack, preset, base image, and tool line',
            ]),
            '',
            renderSection('Fingerprint', [`short value: ${hash}`, `full value: ${hashFull}`]),
            '',
            renderSection('Computed from', [
                `source: ${source.label}`,
                `stack: ${stack}`,
                `base image: ${base}`,
                `tool major.minor: ${tool}`,
            ]),
            '',
            renderSection(
                'Normalized dependencies',
                renderList(model.normalizedDependencies, 'none')
            ),
            '',
            renderSection('What equal values mean', [
                'same value = same normalized intent after dependency expansion',
                'different value = stack, base, preset, or overlays differ semantically',
            ]),
            '',
            renderSection('How to compare', [
                'compare two hash outputs directly in CI, audit logs, or review notes',
                'write hash file when you want stable replay/equivalence checks on disk',
            ]),
        ];
        if (writeLocation) {
            sections.push(
                '',
                renderSection('Write location', [
                    `path: ${writeLocation}`,
                    `state: ${writeChanged ? 'changed file contents' : 'confirmed same fingerprint'}`,
                ])
            );
        }
        if (nextStepModel.command) {
            sections.push('', renderNextStep(nextStepModel));
        }
        console.log([frame, '', ...sections].join('\n'));
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
