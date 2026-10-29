import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
    inventoryOverlayEffects,
    OVERLAY_MANIFEST_FIELDS,
    SYNTHESIZED_MANIFEST_FIELDS,
} from '../questionnaire/overlay-effects.js';
import type { OverlayMetadata } from '../schema/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const overlaysDir = path.join(__dirname, '..', '..', 'overlays');

function fixture(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cs-effects-'));
    fs.mkdirSync(path.join(root, '.shared', 'patches'), { recursive: true });
    fs.mkdirSync(path.join(root, 'external', 'features', 'demo'), { recursive: true });
    fs.writeFileSync(
        path.join(root, 'external', 'overlay.yml'),
        'id: external\nname: External\ndescription: fixture\ncategory: dev\nimports:\n  - .shared/patches/imported.json\n'
    );
    fs.writeFileSync(
        path.join(root, '.shared', 'patches', 'imported.json'),
        JSON.stringify({
            features: { './features/demo': {} },
            build: { dockerfile: './Dockerfile', context: '../context' },
            dockerComposeFile: ['./compose.yml'],
        })
    );
    return root;
}

describe('overlay semantic effect resolver', () => {
    it('includes both declared import families from the effective catalog root', () => {
        const [ollama, nodejs] = inventoryOverlayEffects(overlaysDir, ['ollama', 'nodejs']);

        expect(ollama.composeImports).toEqual(['.shared/compose/nvidia-gpu-devcontainer.yml']);
        expect(ollama.composePath).toBe(path.join(overlaysDir, 'ollama', 'docker-compose.yml'));
        expect(nodejs.imports).toContain('.shared/vscode/js-ts-settings.json');
        expect(ollama.nodes.some((node) => node.kind === 'compose-import')).toBe(true);
    });

    it('uses a closed authored-field registry that matches the manifest schema', () => {
        const schema = JSON.parse(
            fs.readFileSync(
                path.join(__dirname, '..', 'schema', 'overlay-manifest.schema.json'),
                'utf8'
            )
        ) as { properties: Record<string, unknown> };
        expect(Object.keys(OVERLAY_MANIFEST_FIELDS).sort()).toEqual(
            Object.keys(schema.properties).sort()
        );
        expect(SYNTHESIZED_MANIFEST_FIELDS).toEqual(['origin']);
        const expected: Array<keyof Omit<OverlayMetadata, 'origin'>> = [
            'id',
            'name',
            'description',
            'category',
            'supports',
            'requires',
            'suggests',
            'conflicts',
            'tags',
            'ports',
            'order',
            'serviceOrder',
            'imports',
            'compose_imports',
            'minimal',
            'hidden',
            'repeatable',
            'parameters',
        ];
        expect(Object.keys(OVERLAY_MANIFEST_FIELDS).sort()).toEqual(expected.sort());
    });

    it('discovers references inside imported patches with source and pointer provenance', () => {
        const root = fixture();
        try {
            const [effect] = inventoryOverlayEffects(root, ['external']);
            const imported = effect.nodes.find((node) => node.kind === 'imported-patch');
            expect(imported?.declaredPath).toBe('.shared/patches/imported.json');
            if (!imported || imported.kind !== 'imported-patch') throw new Error('missing import');
            expect(imported.references).toMatchObject([
                { kind: 'feature', classification: 'local-relative', value: './features/demo' },
                { kind: 'build-dockerfile', pointer: '/build/dockerfile' },
                { kind: 'build-context', pointer: '/build/context' },
                { kind: 'docker-compose-file', pointer: '/dockerComposeFile/0' },
            ]);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });
});
