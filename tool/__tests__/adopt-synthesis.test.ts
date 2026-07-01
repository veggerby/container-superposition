import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import {
    buildProjectConfigSelection,
    inferBaseImageSelection,
    subtractDefaults,
} from '../commands/adopt/synthesis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');

describe('adopt synthesis module', () => {
    let overlaysConfig: any;

    beforeEach(() => {
        overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
    });

    it('subtractDefaults removes nested defaults while preserving custom values', () => {
        const result = subtractDefaults(
            {
                extensions: ['known.one', 'custom.two'],
                settings: { 'editor.fontSize': 14, 'editor.tabSize': 2 },
                remoteUser: 'vscode',
            },
            {
                extensions: ['known.one'],
                settings: { 'editor.tabSize': 2 },
                remoteUser: 'vscode',
            }
        );

        expect(result).toEqual({
            extensions: ['custom.two'],
            settings: { 'editor.fontSize': 14 },
        });
    });

    it('inferBaseImageSelection reads compose devcontainer image for compose stacks', () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adopt-synthesis-'));
        const composePath = path.join(tmpDir, 'docker-compose.yml');
        fs.writeFileSync(
            composePath,
            [
                'services:',
                '  devcontainer:',
                '    image: mcr.microsoft.com/devcontainers/base:trixie',
            ].join('\n')
        );

        try {
            expect(inferBaseImageSelection({}, [composePath], overlaysConfig, 'compose')).toEqual({
                baseImage: 'trixie',
            });
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('buildProjectConfigSelection keeps project-relative output path and custom patches', () => {
        const selection = buildProjectConfigSelection({
            analysis: {
                detections: [],
                unmatchedItems: [],
                customDevcontainerPatch: { remoteEnv: { MY_CUSTOM_VAR: 'value' } },
                customComposePatch: { services: { app: { image: 'example/app:latest' } } },
                suggestedStack: 'compose',
                suggestedOverlays: ['nodejs'],
                suggestedCommand: 'container-superposition init --stack compose --language nodejs',
                hasDockerCompose: true,
            },
            baseImageSelection: { baseImage: 'bookworm' },
            projectRoot: '/repo',
            absoluteDir: '/repo/.devcontainer',
            devcontainer: { name: 'Workspace' },
        });

        expect(selection.outputPath).toBe('./.devcontainer');
        expect(selection.containerName).toBe('Workspace');
        expect(selection.overlays).toEqual(['nodejs']);
        expect(selection.customizations).toMatchObject({
            devcontainerPatch: { remoteEnv: { MY_CUSTOM_VAR: 'value' } },
            dockerComposePatch: { services: { app: { image: 'example/app:latest' } } },
        });
    });
});
