import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { composeDevContainer } from '../questionnaire/composer.js';
import type { QuestionnaireAnswers } from '../schema/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Minimal Flag and Editor Profiles', () => {
    const testOutputBasePath = path.join(__dirname, '..', '..', 'test-output-features');

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

    describe('Minimal Flag', () => {
        it('should include optional overlays in normal mode', async () => {
            const testOutputPath = path.join(testOutputBasePath, 'normal-mode');
            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                needsDocker: false,
                language: ['nodejs'],
                devTools: ['modern-cli-tools', 'git-helpers', 'codex'],
                playwright: false,
                cloudTools: [],
                observability: [],
                outputPath: testOutputPath,
                minimal: false,
            };

            await composeDevContainer(answers);

            const manifestPath = path.join(testOutputPath, 'superposition.json');
            expect(fs.existsSync(manifestPath)).toBe(true);

            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            // Should include all overlays including minimal-flagged ones
            expect(manifest.overlays).toContain('modern-cli-tools');
            expect(manifest.overlays).toContain('git-helpers');
            expect(manifest.overlays).toContain('codex');
        });

        it('should exclude optional overlays in minimal mode', async () => {
            const testOutputPath = path.join(testOutputBasePath, 'minimal-mode');
            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                needsDocker: false,
                language: ['nodejs'],
                devTools: ['modern-cli-tools', 'git-helpers', 'codex'],
                playwright: false,
                cloudTools: [],
                observability: [],
                outputPath: testOutputPath,
                minimal: true,
            };

            await composeDevContainer(answers);

            const manifestPath = path.join(testOutputPath, 'superposition.json');
            expect(fs.existsSync(manifestPath)).toBe(true);

            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
            // Should NOT include minimal-flagged overlays
            expect(manifest.overlays).not.toContain('modern-cli-tools');
            expect(manifest.overlays).not.toContain('git-helpers');
            expect(manifest.overlays).not.toContain('codex');
            // Should still include essential language overlay
            expect(manifest.overlays).toContain('nodejs');
        });
    });

    describe('Editor Profiles', () => {
        it('should include VS Code customizations by default', async () => {
            const testOutputPath = path.join(testOutputBasePath, 'editor-default');
            const answers: QuestionnaireAnswers = {
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

            await composeDevContainer(answers);

            const devcontainerPath = path.join(testOutputPath, 'devcontainer.json');
            expect(fs.existsSync(devcontainerPath)).toBe(true);

            const devcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));
            expect(devcontainer.customizations?.vscode).toBeDefined();
            expect(devcontainer.customizations?.vscode?.extensions).toBeDefined();
            expect(Array.isArray(devcontainer.customizations?.vscode?.extensions)).toBe(true);
        });

        it('should remove VS Code customizations with editor=none', async () => {
            const testOutputPath = path.join(testOutputBasePath, 'editor-none');
            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                needsDocker: false,
                language: ['nodejs'],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath: testOutputPath,
                editor: 'none',
            };

            await composeDevContainer(answers);

            const devcontainerPath = path.join(testOutputPath, 'devcontainer.json');
            expect(fs.existsSync(devcontainerPath)).toBe(true);

            const devcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));
            // Should not have customizations or should not have vscode within it
            if (devcontainer.customizations) {
                expect(devcontainer.customizations.vscode).toBeUndefined();
            }
        });

        it('should remove VS Code customizations with editor=jetbrains', async () => {
            const testOutputPath = path.join(testOutputBasePath, 'editor-jetbrains');
            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                needsDocker: false,
                language: ['nodejs'],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath: testOutputPath,
                editor: 'jetbrains',
            };

            await composeDevContainer(answers);

            const devcontainerPath = path.join(testOutputPath, 'devcontainer.json');
            expect(fs.existsSync(devcontainerPath)).toBe(true);

            const devcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));
            // Should not have VS Code customizations
            if (devcontainer.customizations) {
                expect(devcontainer.customizations.vscode).toBeUndefined();
            }
        });
    });
});
