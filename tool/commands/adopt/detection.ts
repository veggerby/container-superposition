import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';
import type { OverlaysConfig } from '../../schema/types.js';
import type { DetectionTables } from './types.js';

const SCORE_EXACT = 100;
const SCORE_ID_STARTS_WITH_SEGMENT = 80;
const SCORE_SEGMENT_STARTS_WITH_ID = 60;
const SCORE_SEGMENT_CONTAINS_ID = 40;
const SCORE_ID_CONTAINS_SEGMENT = 20;
const SCORE_NO_MATCH = 0;

/**
 * Strip the version suffix from a devcontainer feature URI so that prefix
 * matching works regardless of pinned version.
 * e.g. "ghcr.io/devcontainers/features/node:1" → "ghcr.io/devcontainers/features/node"
 */
export function stripFeatureVersion(featureId: string): string {
    return featureId.replace(/:\d+$/, '').replace(/@[^@]+$/, '');
}

/**
 * Extract the image name prefix (registry + repo, without tag) from a docker
 * image string that may contain variable substitutions.
 * e.g. "postgres:${POSTGRES_VERSION:-16}-alpine" → "postgres"
 * e.g. "grafana/grafana:${VERSION:-latest}" → "grafana/grafana"
 */
export function extractImagePrefix(image: string): string {
    return image
        .replace(/\$\{[^}]+\}/g, '')
        .split(':')[0]
        .replace(/-$/, '')
        .trim();
}

export function featureMatchScore(overlayId: string, strippedFeatureUri: string): number {
    const segment = strippedFeatureUri.split('/').pop() ?? '';
    if (overlayId === segment) return SCORE_EXACT;
    if (overlayId.startsWith(segment)) return SCORE_ID_STARTS_WITH_SEGMENT;
    if (segment.startsWith(overlayId)) return SCORE_SEGMENT_STARTS_WITH_ID;
    if (segment.includes(overlayId)) return SCORE_SEGMENT_CONTAINS_ID;
    if (overlayId.includes(segment)) return SCORE_ID_CONTAINS_SEGMENT;
    return SCORE_NO_MATCH;
}

export function extensionMatchScore(overlayId: string, extensionId: string): number {
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

        const patchPath = path.join(overlayDir, 'devcontainer.patch.json');
        if (fs.existsSync(patchPath)) {
            try {
                const patch = JSON.parse(fs.readFileSync(patchPath, 'utf8'));

                for (const featureId of Object.keys(patch.features ?? {})) {
                    if (featureId.startsWith('./') || featureId.startsWith('../')) continue;
                    const stripped = stripFeatureVersion(featureId);
                    const score = featureMatchScore(overlay.id, stripped);
                    const existing = featureToOverlayScored[stripped];
                    if (!existing || score > existing.score) {
                        featureToOverlayScored[stripped] = { overlayId: overlay.id, score };
                    }
                }

                for (const extId of (patch.customizations?.vscode?.extensions ?? []) as string[]) {
                    const lowerCaseId = extId.toLowerCase();
                    const score = extensionMatchScore(overlay.id, lowerCaseId);
                    const existing = extensionToOverlayScored[lowerCaseId];

                    if (score === SCORE_NO_MATCH) {
                        if (!existing) {
                            extensionToOverlayScored[lowerCaseId] = {
                                overlayId: overlay.id,
                                score,
                            };
                        } else if (
                            existing.score === SCORE_NO_MATCH &&
                            existing.overlayId !== overlay.id
                        ) {
                            delete extensionToOverlayScored[lowerCaseId];
                        }
                        continue;
                    }

                    if (!existing || score > existing.score) {
                        extensionToOverlayScored[lowerCaseId] = {
                            overlayId: overlay.id,
                            score,
                        };
                    }
                }
            } catch {
                // Skip malformed patch files
            }
        }

        const composePath = path.join(overlayDir, 'docker-compose.yml');
        if (fs.existsSync(composePath)) {
            try {
                const compose = yaml.load(fs.readFileSync(composePath, 'utf8')) as any;
                for (const serviceDef of Object.values(compose?.services ?? {})) {
                    const image: string = (serviceDef as any)?.image ?? '';
                    if (!image) continue;
                    const prefix = extractImagePrefix(image);
                    if (prefix && !imagePrefixToOverlay.find((entry) => entry.prefix === prefix)) {
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
            Object.entries(featureToOverlayScored).map(([key, value]) => [key, value.overlayId])
        ),
        imagePrefixToOverlay,
        extensionToOverlay: Object.fromEntries(
            Object.entries(extensionToOverlayScored).map(([key, value]) => [key, value.overlayId])
        ),
    };
}

export function matchFeature(featureId: string, tables: DetectionTables): string | null {
    const stripped = stripFeatureVersion(featureId);
    if (tables.featureToOverlay[stripped]) return tables.featureToOverlay[stripped];

    for (const [uri, overlayId] of Object.entries(tables.featureToOverlay)) {
        if (stripped.startsWith(uri)) return overlayId;
    }

    return null;
}

export function matchImage(image: string, tables: DetectionTables): string | null {
    const prefix = extractImagePrefix(image);
    const entry = tables.imagePrefixToOverlay.find(
        (candidate) => prefix === candidate.prefix || prefix.startsWith(candidate.prefix)
    );
    return entry?.overlayId ?? null;
}

export function matchExtension(extensionId: string, tables: DetectionTables): string | null {
    return tables.extensionToOverlay[extensionId.toLowerCase()] ?? null;
}
