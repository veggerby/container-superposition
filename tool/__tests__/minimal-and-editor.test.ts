import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { composeDevContainer } from '../questionnaire/composer.js';
import { writeProjectConfigCustomizations } from '../schema/project-config.js';
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
            // Should have JetBrains customizations
            expect(devcontainer.customizations?.jetbrains).toBeDefined();
            expect(devcontainer.customizations?.jetbrains?.backend).toBe('WebStorm');
        });

        it('should generate .idea/ artifacts for editor=jetbrains', async () => {
            const testOutputPath = path.join(testOutputBasePath, 'editor-jetbrains-idea');
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

            // .idea/ lives in the project root (parent of outputPath)
            const projectRoot = path.dirname(testOutputPath);
            const ideaDir = path.join(projectRoot, '.idea');
            expect(fs.existsSync(ideaDir)).toBe(true);
            expect(fs.existsSync(path.join(ideaDir, '.gitignore'))).toBe(true);

            const runConfigsDir = path.join(ideaDir, 'runConfigurations');
            expect(fs.existsSync(runConfigsDir)).toBe(true);
            expect(fs.existsSync(path.join(runConfigsDir, 'npm_dev.xml'))).toBe(true);

            // Clean up .idea/ so it doesn't interfere with other tests
            fs.rmSync(ideaDir, { recursive: true, force: true });
        });

        it('should use correct JetBrains backend per language overlay', async () => {
            const backendMap: Array<{ lang: string; expectedBackend: string }> = [
                { lang: 'nodejs', expectedBackend: 'WebStorm' },
                { lang: 'python', expectedBackend: 'PyCharm' },
                { lang: 'dotnet', expectedBackend: 'Rider' },
            ];

            for (const { lang, expectedBackend } of backendMap) {
                const testOutputPath = path.join(testOutputBasePath, `editor-jetbrains-${lang}`);
                const answers: QuestionnaireAnswers = {
                    stack: 'plain',
                    baseImage: 'bookworm',
                    needsDocker: false,
                    language: [lang as any],
                    playwright: false,
                    cloudTools: [],
                    devTools: [],
                    observability: [],
                    outputPath: testOutputPath,
                    editor: 'jetbrains',
                };

                await composeDevContainer(answers);

                const devcontainer = JSON.parse(
                    fs.readFileSync(path.join(testOutputPath, 'devcontainer.json'), 'utf-8')
                );
                expect(devcontainer.customizations?.jetbrains?.backend).toBe(expectedBackend);

                // Clean up .idea/
                const projectRoot = path.dirname(testOutputPath);
                const ideaDir = path.join(projectRoot, '.idea');
                if (fs.existsSync(ideaDir)) {
                    fs.rmSync(ideaDir, { recursive: true, force: true });
                }
            }
        });

        it('should use IntelliJIdea as fallback when no language overlay selected', async () => {
            const testOutputPath = path.join(testOutputBasePath, 'editor-jetbrains-no-lang');
            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                needsDocker: false,
                language: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath: testOutputPath,
                editor: 'jetbrains',
            };

            await composeDevContainer(answers);

            const devcontainer = JSON.parse(
                fs.readFileSync(path.join(testOutputPath, 'devcontainer.json'), 'utf-8')
            );
            expect(devcontainer.customizations?.jetbrains?.backend).toBe('IntelliJIdea');

            // Clean up .idea/
            const projectRoot = path.dirname(testOutputPath);
            const ideaDir = path.join(projectRoot, '.idea');
            if (fs.existsSync(ideaDir)) {
                fs.rmSync(ideaDir, { recursive: true, force: true });
            }
        });

        it('should persist editor=jetbrains in manifest', async () => {
            const testOutputPath = path.join(testOutputBasePath, 'editor-jetbrains-manifest');
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

            const manifest = JSON.parse(
                fs.readFileSync(path.join(testOutputPath, 'superposition.json'), 'utf-8')
            );
            expect(manifest.editor).toBe('jetbrains');

            // Clean up .idea/
            const projectRoot = path.dirname(testOutputPath);
            const ideaDir = path.join(projectRoot, '.idea');
            if (fs.existsSync(ideaDir)) {
                fs.rmSync(ideaDir, { recursive: true, force: true });
            }
        });

        it('should not overwrite existing .idea/ files on re-generation', async () => {
            const testOutputPath = path.join(testOutputBasePath, 'editor-jetbrains-no-overwrite');
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

            // First run
            await composeDevContainer(answers);

            const projectRoot = path.dirname(testOutputPath);
            const ideaDir = path.join(projectRoot, '.idea');
            const gitignorePath = path.join(ideaDir, '.gitignore');
            const originalContent = fs.readFileSync(gitignorePath, 'utf-8');

            // Modify the file to simulate user customisation
            const customContent = originalContent + '\n# custom user entry\n';
            fs.writeFileSync(gitignorePath, customContent);

            // Second run
            await composeDevContainer(answers);

            // The customised file must NOT have been overwritten
            const afterContent = fs.readFileSync(gitignorePath, 'utf-8');
            expect(afterContent).toBe(customContent);

            // Clean up
            fs.rmSync(ideaDir, { recursive: true, force: true });
        });

        it('should not persist editor in manifest when editor=vscode (default)', async () => {
            const testOutputPath = path.join(testOutputBasePath, 'editor-vscode-manifest');
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

            const manifest = JSON.parse(
                fs.readFileSync(path.join(testOutputPath, 'superposition.json'), 'utf-8')
            );
            // vscode is the default so it should not be persisted
            expect(manifest.editor).toBeUndefined();
        });

        it('should merge project-config environment and additional feature customizations', async () => {
            const testOutputPath = path.join(testOutputBasePath, 'project-config-customizations');

            writeProjectConfigCustomizations(testOutputPath, {
                environment: {
                    EXTRA_PROJECT_FLAG: 'enabled',
                },
                devcontainerPatch: {
                    features: {
                        'ghcr.io/devcontainers-extra/features/apt-get-packages:1': {
                            packages: 'jq',
                        },
                    },
                },
            });

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

            const envExample = fs.readFileSync(path.join(testOutputPath, '.env.example'), 'utf-8');
            expect(envExample).toContain('EXTRA_PROJECT_FLAG=enabled');

            const devcontainer = JSON.parse(
                fs.readFileSync(path.join(testOutputPath, 'devcontainer.json'), 'utf-8')
            );
            expect(devcontainer.features).toHaveProperty(
                'ghcr.io/devcontainers-extra/features/apt-get-packages:1'
            );
        });
    });
});
