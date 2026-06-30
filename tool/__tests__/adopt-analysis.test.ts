import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import { buildDetectionTables } from '../commands/adopt/detection.js';
import {
    analyseLoadedDevcontainer,
    deduplicateDetections,
    findOverlayIdsInCommandMap,
} from '../commands/adopt/analysis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');

describe('adopt analysis module', () => {
    let overlaysConfig: any;

    beforeEach(() => {
        overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
    });

    it('deduplicateDetections keeps exact matches over heuristic matches', () => {
        const result = deduplicateDetections([
            {
                source: 'extension: dbaeumer.vscode-eslint',
                overlayId: 'nodejs',
                confidence: 'heuristic',
                sourceType: 'extension',
            },
            {
                source: 'ghcr.io/devcontainers/features/node:1',
                overlayId: 'nodejs',
                confidence: 'exact',
                sourceType: 'feature',
            },
        ]);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            overlayId: 'nodejs',
            confidence: 'exact',
            sourceType: 'feature',
        });
    });

    it('findOverlayIdsInCommandMap detects known setup and verify scripts once per overlay', () => {
        const result = findOverlayIdsInCommandMap(
            {
                'setup-codex': 'bash .devcontainer/scripts/setup-codex.sh',
                duplicate: 'bash .devcontainer/scripts/setup-codex.sh',
                'verify-spec-kit': 'bash .devcontainer/scripts/verify-spec-kit.sh',
                unrelated: 'echo hello',
            },
            overlaysConfig
        );

        expect(result).toEqual([
            expect.objectContaining({ overlayId: 'codex', sourceType: 'script' }),
            expect.objectContaining({ overlayId: 'spec-kit', sourceType: 'script' }),
        ]);
    });

    it('analyseLoadedDevcontainer preserves unmatched remoteEnv while managing matched overlays', () => {
        const tables = buildDetectionTables(OVERLAYS_DIR, overlaysConfig);
        const analysis = analyseLoadedDevcontainer({
            devcontainer: {
                features: { 'ghcr.io/devcontainers/features/node:1': {} },
                remoteEnv: {
                    POSTGRES_HOST: 'postgres',
                    MY_CUSTOM_VAR: 'value',
                },
            },
            dir: path.join(REPO_ROOT, 'tool', '__tests__'),
            overlaysConfig,
            tables,
            overlaysDir: OVERLAYS_DIR,
        });

        expect(analysis.suggestedOverlays).toContain('nodejs');
        expect(analysis.suggestedOverlays).toContain('postgres');
        expect(analysis.customDevcontainerPatch?.remoteEnv).toMatchObject({
            MY_CUSTOM_VAR: 'value',
        });
        expect(analysis.customDevcontainerPatch?.remoteEnv?.POSTGRES_HOST).toBeUndefined();
    });
});
