import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { composeDevContainer } from '../questionnaire/composer.js';
import type { QuestionnaireAnswers, SuperpositionManifest } from '../schema/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Regen with Minimal and Editor Flags', () => {
    const testOutputBasePath = path.join(__dirname, '..', '..', 'test-output-regen-flags');

    beforeEach(() => {
        // Clean up test output directory
        if (fs.existsSync(testOutputBasePath)) {
            fs.rmSync(testOutputBasePath, { recursive: true, force: true });
        }
        fs.mkdirSync(testOutputBasePath, { recursive: true });
    });

    afterEach(() => {
        // Clean up after tests
        if (fs.existsSync(testOutputBasePath)) {
            fs.rmSync(testOutputBasePath, { recursive: true, force: true });
        }
    });

    it('should regenerate from manifest with minimal flag to exclude optional overlays', async () => {
        const testOutputPath = path.join(testOutputBasePath, 'regen-minimal');

        // Step 1: Create initial config with optional overlays
        const initialAnswers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            needsDocker: false,
            language: ['nodejs'],
            devTools: ['modern-cli-tools', 'git-helpers', 'codex'],
            playwright: false,
            cloudTools: [],
            observability: [],
            outputPath: testOutputPath,
        };

        await composeDevContainer(initialAnswers);

        // Verify initial manifest has all overlays
        const manifestPath = path.join(testOutputPath, 'superposition.json');
        const initialManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as SuperpositionManifest;
        
        expect(initialManifest.overlays).toContain('nodejs');
        expect(initialManifest.overlays).toContain('modern-cli-tools');
        expect(initialManifest.overlays).toContain('git-helpers');
        expect(initialManifest.overlays).toContain('codex');

        // Step 2: Regenerate with minimal flag
        // Simulate what regen --minimal does: read manifest, apply minimal filter
        const regenAnswers: QuestionnaireAnswers = {
            stack: initialManifest.baseTemplate,
            baseImage: initialManifest.baseImage,
            needsDocker: initialManifest.baseTemplate === 'compose',
            language: ['nodejs'],
            devTools: ['modern-cli-tools', 'git-helpers', 'codex'],
            playwright: false,
            cloudTools: [],
            observability: [],
            outputPath: testOutputPath,
            minimal: true, // KEY: Apply minimal mode
        };

        await composeDevContainer(regenAnswers);

        // Verify regenerated manifest excludes minimal overlays
        const regenManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as SuperpositionManifest;
        
        expect(regenManifest.overlays).toContain('nodejs');
        expect(regenManifest.overlays).not.toContain('modern-cli-tools');
        expect(regenManifest.overlays).not.toContain('git-helpers');
        expect(regenManifest.overlays).not.toContain('codex');
    });

    it('should regenerate from manifest with editor flag to control customizations', async () => {
        const testOutputPath = path.join(testOutputBasePath, 'regen-editor');

        // Step 1: Create initial config with VS Code extensions
        const initialAnswers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            needsDocker: false,
            language: ['nodejs'],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath: testOutputPath,
            editor: 'vscode',
        };

        await composeDevContainer(initialAnswers);

        // Verify initial devcontainer has VS Code customizations
        const devcontainerPath = path.join(testOutputPath, 'devcontainer.json');
        const initialDevcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));
        
        expect(initialDevcontainer.customizations?.vscode).toBeDefined();
        expect(initialDevcontainer.customizations?.vscode?.extensions).toBeDefined();

        // Step 2: Regenerate with editor=none
        const regenAnswers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            needsDocker: false,
            language: ['nodejs'],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath: testOutputPath,
            editor: 'none', // KEY: Remove editor customizations
        };

        await composeDevContainer(regenAnswers);

        // Verify regenerated devcontainer has no VS Code customizations
        const regenDevcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));
        
        if (regenDevcontainer.customizations) {
            expect(regenDevcontainer.customizations.vscode).toBeUndefined();
        }
    });

    it('should regenerate from manifest combining both minimal and editor flags', async () => {
        const testOutputPath = path.join(testOutputBasePath, 'regen-combined');

        // Step 1: Create initial config with extras and VS Code
        const initialAnswers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            needsDocker: false,
            language: ['nodejs'],
            devTools: ['modern-cli-tools'],
            playwright: false,
            cloudTools: [],
            observability: [],
            outputPath: testOutputPath,
            editor: 'vscode',
        };

        await composeDevContainer(initialAnswers);

        // Step 2: Regenerate with both minimal and editor=none
        const regenAnswers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            needsDocker: false,
            language: ['nodejs'],
            devTools: ['modern-cli-tools'],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath: testOutputPath,
            minimal: true,
            editor: 'none',
        };

        await composeDevContainer(regenAnswers);

        // Verify both flags were applied
        const manifestPath = path.join(testOutputPath, 'superposition.json');
        const regenManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as SuperpositionManifest;
        
        expect(regenManifest.overlays).toContain('nodejs');
        expect(regenManifest.overlays).not.toContain('modern-cli-tools');

        const devcontainerPath = path.join(testOutputPath, 'devcontainer.json');
        const regenDevcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));
        
        if (regenDevcontainer.customizations) {
            expect(regenDevcontainer.customizations.vscode).toBeUndefined();
        }
    });
});
