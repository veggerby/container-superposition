import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { composeDevContainer } from '../questionnaire/composer.js';
import type { QuestionnaireAnswers, SuperpositionManifest } from '../schema/types.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.join(__dirname, '..', '..');
const TEST_OUTPUT_DIR = path.join(REPO_ROOT, 'tmp', 'test-manifest-regeneration');

describe('Manifest Regeneration', () => {
    beforeEach(() => {
        // Clean up before each test
        if (fs.existsSync(TEST_OUTPUT_DIR)) {
            fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
        }
    });

    afterEach(() => {
        // Clean up after each test
        if (fs.existsSync(TEST_OUTPUT_DIR)) {
            fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
        }
    });

    it('should include containerName in manifest', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'test-manifest-fields');

        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
        };

        await composeDevContainer(answers);

        // Verify manifest includes containerName
        const manifestPath = path.join(outputPath, 'superposition.json');
        expect(fs.existsSync(manifestPath)).toBe(true);

        const manifest = JSON.parse(
            fs.readFileSync(manifestPath, 'utf-8')
        ) as SuperpositionManifest;
        expect(manifest.containerName).toBeDefined();
        expect(manifest.overlays).toContain('nodejs');
    });

    it('should include portOffset in manifest when provided', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'test-port-offset');

        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: [],
            needsDocker: false,
            database: ['postgres'],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
            portOffset: 100,
        };

        await composeDevContainer(answers);

        const manifestPath = path.join(outputPath, 'superposition.json');
        const manifest = JSON.parse(
            fs.readFileSync(manifestPath, 'utf-8')
        ) as SuperpositionManifest;

        expect(manifest.portOffset).toBe(100);
        expect(manifest.overlays).toContain('postgres');
    });

    it('should validate manifest structure', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'test-manifest-structure');

        const answers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'alpine',
            language: ['python'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: ['aws-cli'],
            devTools: [],
            observability: [],
            outputPath,
        };

        await composeDevContainer(answers);

        const manifestPath = path.join(outputPath, 'superposition.json');
        const manifest = JSON.parse(
            fs.readFileSync(manifestPath, 'utf-8')
        ) as SuperpositionManifest;

        // Validate required fields
        expect(manifest.version).toBe('0.1.0');
        expect(manifest.generated).toBeDefined();
        expect(new Date(manifest.generated).getTime()).toBeLessThanOrEqual(Date.now());
        expect(manifest.baseTemplate).toBe('plain');
        expect(manifest.baseImage).toBe('alpine');
        expect(Array.isArray(manifest.overlays)).toBe(true);
        expect(manifest.overlays).toContain('python');
        expect(manifest.overlays).toContain('aws-cli');
    });

    it('should handle preset information in manifest', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'test-preset-manifest');

        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: ['postgres'],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
            preset: 'web-api',
            presetChoices: { language: 'nodejs' },
        };

        await composeDevContainer(answers);

        const manifestPath = path.join(outputPath, 'superposition.json');
        const manifest = JSON.parse(
            fs.readFileSync(manifestPath, 'utf-8')
        ) as SuperpositionManifest;

        expect(manifest.preset).toBe('web-api');
        expect(manifest.presetChoices).toBeDefined();
        expect(manifest.presetChoices?.language).toBe('nodejs');
    });

    it('should remove stale scripts/setup-*.sh when an overlay with setup.sh is removed on regen', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'test-stale-scripts');

        const baseAnswers: Omit<QuestionnaireAnswers, 'devTools'> = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: [],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            observability: [],
            outputPath,
        };

        // Step 1: generate with both nodejs and bun (both have setup.sh)
        await composeDevContainer({ ...baseAnswers, language: ['nodejs', 'bun'] });

        const setupNodejs = path.join(outputPath, 'scripts', 'setup-nodejs.sh');
        const setupBun = path.join(outputPath, 'scripts', 'setup-bun.sh');
        expect(fs.existsSync(setupNodejs)).toBe(true);
        expect(fs.existsSync(setupBun)).toBe(true);

        // Step 2: regen with bun removed — setup-bun.sh must be cleaned up
        await composeDevContainer({ ...baseAnswers, language: ['nodejs'] });

        expect(fs.existsSync(setupNodejs)).toBe(true);
        expect(fs.existsSync(setupBun)).toBe(false);
    });

    it('should remove scripts/ directory entirely when all script-bearing overlays are removed on regen', async () => {
        const outputPath = path.join(TEST_OUTPUT_DIR, 'test-stale-scripts-dir');

        const baseAnswers: Omit<QuestionnaireAnswers, 'devTools'> = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: [],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            observability: [],
            outputPath,
        };

        // Step 1: generate with nodejs (has setup.sh)
        await composeDevContainer({ ...baseAnswers, language: ['nodejs'] });

        const scriptsDir = path.join(outputPath, 'scripts');
        expect(fs.existsSync(path.join(scriptsDir, 'setup-nodejs.sh'))).toBe(true);

        // Step 2: regen with no script-bearing overlays — scripts/ dir must be removed
        await composeDevContainer({ ...baseAnswers, language: [] });

        expect(fs.existsSync(scriptsDir)).toBe(false);
    });
});
