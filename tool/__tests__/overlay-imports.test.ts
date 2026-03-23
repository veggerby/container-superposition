import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { applyOverlay, composeDevContainer } from '../questionnaire/composer.js';
import type { QuestionnaireAnswers } from '../schema/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const REAL_OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');

/**
 * Create a minimal temporary overlays directory for testing imports.
 * Returns the path to the temp dir.
 */
function createTempRoot(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'cs-imports-test-'));
}

/**
 * Create the shared directory structure inside a temp overlays dir.
 */
function createSharedDir(overlaysDir: string): string {
    const sharedDir = path.join(overlaysDir, '.shared');
    fs.mkdirSync(sharedDir, { recursive: true });
    return sharedDir;
}

/**
 * Create a test overlay with optional imports in a temp overlays dir.
 */
function createTestOverlay(
    overlaysDir: string,
    overlayId: string,
    imports: string[],
    patchContent: Record<string, unknown> = {}
): void {
    const overlayDir = path.join(overlaysDir, overlayId);
    fs.mkdirSync(overlayDir, { recursive: true });

    const overlayYml = [
        `id: ${overlayId}`,
        `name: ${overlayId}`,
        `description: Test overlay`,
        `category: dev`,
        `supports: []`,
        `requires: []`,
        `suggests: []`,
        `conflicts: []`,
        `tags: [dev]`,
        `ports: []`,
        ...(imports.length > 0 ? ['imports:', ...imports.map((i) => `    - ${i}`)] : []),
    ].join('\n');

    fs.writeFileSync(path.join(overlayDir, 'overlay.yml'), overlayYml);
    fs.writeFileSync(
        path.join(overlayDir, 'devcontainer.patch.json'),
        JSON.stringify(
            {
                $schema:
                    'https://raw.githubusercontent.com/devcontainers/spec/main/schemas/devContainer.base.schema.json',
                ...patchContent,
            },
            null,
            4
        )
    );
}

describe('Overlay Imports', () => {
    let tempDir: string;
    let overlaysDir: string;
    let testOutputPath: string;

    beforeEach(() => {
        tempDir = createTempRoot();
        overlaysDir = path.join(tempDir, 'overlays');
        testOutputPath = path.join(tempDir, 'output');
        fs.mkdirSync(overlaysDir, { recursive: true });
        fs.mkdirSync(testOutputPath, { recursive: true });
        createSharedDir(overlaysDir);
    });

    afterEach(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    // -------------------------------------------------------------------------
    // FR-003 / FR-004: Valid JSON import -> merged into devcontainer config
    // -------------------------------------------------------------------------
    describe('JSON import merging', () => {
        it('should merge a JSON shared fragment into devcontainer config', () => {
            const sharedFragment = {
                customizations: {
                    vscode: {
                        extensions: ['shared.extension-one'],
                        settings: { 'editor.fontSize': 14 },
                    },
                },
            };
            const fragDir = path.join(overlaysDir, '.shared', 'vscode');
            fs.mkdirSync(fragDir, { recursive: true });
            fs.writeFileSync(
                path.join(fragDir, 'fragment.json'),
                JSON.stringify(sharedFragment, null, 2)
            );

            createTestOverlay(overlaysDir, 'test-overlay', ['.shared/vscode/fragment.json'], {
                customizations: {
                    vscode: { extensions: ['overlay.extension-two'] },
                },
            });

            const result = applyOverlay({}, 'test-overlay', overlaysDir);

            const extensions = result.customizations?.vscode?.extensions as string[];
            expect(extensions).toContain('shared.extension-one');
            expect(extensions).toContain('overlay.extension-two');
            expect(result.customizations?.vscode?.settings).toEqual({ 'editor.fontSize': 14 });
        });

        it('should apply multiple JSON imports in declaration order', () => {
            const sharedDir = path.join(overlaysDir, '.shared', 'test');
            fs.mkdirSync(sharedDir, { recursive: true });

            fs.writeFileSync(
                path.join(sharedDir, 'first.json'),
                JSON.stringify({ remoteEnv: { FIRST_VAR: 'first', SHARED_VAR: 'from-first' } })
            );
            fs.writeFileSync(
                path.join(sharedDir, 'second.json'),
                JSON.stringify({ remoteEnv: { SECOND_VAR: 'second', SHARED_VAR: 'from-second' } })
            );

            createTestOverlay(
                overlaysDir,
                'test-overlay',
                ['.shared/test/first.json', '.shared/test/second.json'],
                {}
            );

            const result = applyOverlay({}, 'test-overlay', overlaysDir);

            expect(result.remoteEnv?.['FIRST_VAR']).toBe('first');
            expect(result.remoteEnv?.['SECOND_VAR']).toBe('second');
            // Second fragment wins on key conflict (FR-004 ordering)
            expect(result.remoteEnv?.['SHARED_VAR']).toBe('from-second');
        });

        it('overlay own patch wins over all shared fragments on key conflict', () => {
            const sharedDir = path.join(overlaysDir, '.shared', 'test');
            fs.mkdirSync(sharedDir, { recursive: true });

            fs.writeFileSync(
                path.join(sharedDir, 'base.json'),
                JSON.stringify({ remoteEnv: { MY_VAR: 'from-shared' } })
            );

            createTestOverlay(overlaysDir, 'test-overlay', ['.shared/test/base.json'], {
                remoteEnv: { MY_VAR: 'from-overlay' },
            });

            const result = applyOverlay({}, 'test-overlay', overlaysDir);

            // Overlay's own patch is applied last and should win
            expect(result.remoteEnv?.['MY_VAR']).toBe('from-overlay');
        });
    });

    // -------------------------------------------------------------------------
    // FR-003 / FR-004: Valid YAML import -> merged into devcontainer config
    // -------------------------------------------------------------------------
    describe('YAML import merging', () => {
        it('should merge a YAML (.yaml) shared fragment into devcontainer config', () => {
            const sharedDir = path.join(overlaysDir, '.shared', 'test');
            fs.mkdirSync(sharedDir, { recursive: true });

            const yamlContent =
                'remoteEnv:\n  OTEL_SERVICE_NAME: my-service\n  OTEL_ENDPOINT: http://otel-collector:4317\n';
            fs.writeFileSync(path.join(sharedDir, 'otel.yaml'), yamlContent);

            createTestOverlay(overlaysDir, 'test-overlay', ['.shared/test/otel.yaml'], {});

            const result = applyOverlay({}, 'test-overlay', overlaysDir);

            expect(result.remoteEnv?.['OTEL_SERVICE_NAME']).toBe('my-service');
            expect(result.remoteEnv?.['OTEL_ENDPOINT']).toBe('http://otel-collector:4317');
        });

        it('should merge a YAML (.yml) shared fragment into devcontainer config', () => {
            const sharedDir = path.join(overlaysDir, '.shared', 'test');
            fs.mkdirSync(sharedDir, { recursive: true });

            fs.writeFileSync(
                path.join(sharedDir, 'config.yml'),
                'remoteEnv:\n  YML_VAR: yml-value\n'
            );

            createTestOverlay(overlaysDir, 'test-overlay', ['.shared/test/config.yml'], {});

            const result = applyOverlay({}, 'test-overlay', overlaysDir);

            expect(result.remoteEnv?.['YML_VAR']).toBe('yml-value');
        });
    });

    // -------------------------------------------------------------------------
    // FR-011: .env import merged into .env.example with source comment
    // -------------------------------------------------------------------------
    describe('.env import merging (via composeDevContainer)', () => {
        it('should include .env shared fragment in .env.example with source comment', async () => {
            const sharedEnvPath = path.join(
                REAL_OVERLAYS_DIR,
                '.shared',
                'otel',
                'instrumentation.env'
            );
            expect(fs.existsSync(sharedEnvPath)).toBe(true);

            const outputSubdir = path.join(testOutputPath, 'env-test');
            fs.mkdirSync(outputSubdir, { recursive: true });

            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                needsDocker: false,
                language: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: ['otel-collector'],
                outputPath: outputSubdir,
            };

            await composeDevContainer(answers);

            const envExamplePath = path.join(outputSubdir, '.env.example');
            expect(fs.existsSync(envExamplePath)).toBe(true);

            const content = fs.readFileSync(envExamplePath, 'utf-8');
            expect(content).toMatch(/# from \.shared\/otel\/instrumentation\.env/);
            expect(content).toContain('OTEL_SERVICE_NAME=my-service');
        });
    });

    // -------------------------------------------------------------------------
    // FR-007: Missing import -> fails with identifying message
    // -------------------------------------------------------------------------
    describe('error handling — missing imports', () => {
        it('should throw an error for missing import, naming both overlay and path', () => {
            createTestOverlay(
                overlaysDir,
                'test-overlay',
                ['.shared/nonexistent/missing.json'],
                {}
            );

            expect(() => applyOverlay({}, 'test-overlay', overlaysDir)).toThrow(/test-overlay/);
            expect(() => applyOverlay({}, 'test-overlay', overlaysDir)).toThrow(
                /\.shared\/nonexistent\/missing\.json/
            );
        });

        it('should include the overlay name in the error message', () => {
            createTestOverlay(overlaysDir, 'my-named-overlay', ['.shared/missing.json'], {});

            expect(() => applyOverlay({}, 'my-named-overlay', overlaysDir)).toThrow(
                /my-named-overlay/
            );
        });

        it('should throw an error for unsupported file type (.txt)', () => {
            const sharedDir = path.join(overlaysDir, '.shared', 'test');
            fs.mkdirSync(sharedDir, { recursive: true });
            fs.writeFileSync(path.join(sharedDir, 'invalid.txt'), 'some content');

            createTestOverlay(overlaysDir, 'test-overlay', ['.shared/test/invalid.txt'], {});

            expect(() => applyOverlay({}, 'test-overlay', overlaysDir)).toThrow(
                /unsupported.*type/i
            );
            expect(() => applyOverlay({}, 'test-overlay', overlaysDir)).toThrow(/\.txt/);
        });

        it('should throw an error for unsupported file type (.sh)', () => {
            const sharedDir = path.join(overlaysDir, '.shared', 'test');
            fs.mkdirSync(sharedDir, { recursive: true });
            fs.writeFileSync(path.join(sharedDir, 'script.sh'), '#!/bin/bash\necho hello');

            createTestOverlay(overlaysDir, 'test-overlay', ['.shared/test/script.sh'], {});

            expect(() => applyOverlay({}, 'test-overlay', overlaysDir)).toThrow(
                /unsupported.*type/i
            );
        });
    });

    // -------------------------------------------------------------------------
    // FR-006: Path traversal rejected
    // -------------------------------------------------------------------------
    describe('path traversal rejection', () => {
        it('should reject import paths that do not start with .shared/', () => {
            const outsideDir = path.join(overlaysDir, 'other-overlay');
            fs.mkdirSync(outsideDir, { recursive: true });
            fs.writeFileSync(path.join(outsideDir, 'secret.json'), JSON.stringify({ evil: true }));

            createTestOverlay(overlaysDir, 'test-overlay', ['other-overlay/secret.json'], {});

            expect(() => applyOverlay({}, 'test-overlay', overlaysDir)).toThrow(/path traversal/i);
        });

        it('should reject ../ sequences that escape .shared/', () => {
            createTestOverlay(overlaysDir, 'test-overlay', ['.shared/../../../etc/passwd'], {});

            expect(() => applyOverlay({}, 'test-overlay', overlaysDir)).toThrow(/path traversal/i);
        });

        it('should reject absolute paths', () => {
            createTestOverlay(overlaysDir, 'test-overlay', ['/etc/passwd'], {});

            expect(() => applyOverlay({}, 'test-overlay', overlaysDir)).toThrow(/path traversal/i);
        });
    });

    // -------------------------------------------------------------------------
    // FR-010: No imports -> overlay generation unchanged
    // -------------------------------------------------------------------------
    describe('overlay without imports (FR-010)', () => {
        it('should generate correctly for overlays without imports', async () => {
            const outputSubdir = path.join(testOutputPath, 'no-imports-test');
            fs.mkdirSync(outputSubdir, { recursive: true });

            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                needsDocker: false,
                language: ['nodejs'],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath: outputSubdir,
            };

            await composeDevContainer(answers);

            const devcontainerPath = path.join(outputSubdir, 'devcontainer.json');
            expect(fs.existsSync(devcontainerPath)).toBe(true);

            const devcontainer = JSON.parse(fs.readFileSync(devcontainerPath, 'utf-8'));
            expect(devcontainer).toBeDefined();
            expect(devcontainer.name).toBeDefined();
        });

        it('should apply overlay without imports using applyOverlay directly', () => {
            createTestOverlay(overlaysDir, 'no-imports-overlay', [], {
                remoteEnv: { MY_VAR: 'my-value' },
            });

            const result = applyOverlay({}, 'no-imports-overlay', overlaysDir);

            expect(result.remoteEnv?.['MY_VAR']).toBe('my-value');
        });
    });

    // -------------------------------------------------------------------------
    // SC-001 / SC-002: Real overlay conversions - otel-collector, prometheus, jaeger
    // -------------------------------------------------------------------------
    describe('converted overlay imports (SC-001)', () => {
        it('otel-collector overlay has imports defined referencing instrumentation.env', () => {
            const overlayYml = fs.readFileSync(
                path.join(REAL_OVERLAYS_DIR, 'otel-collector', 'overlay.yml'),
                'utf-8'
            );
            expect(overlayYml).toContain('imports:');
            expect(overlayYml).toContain('.shared/otel/instrumentation.env');
        });

        it('prometheus overlay has imports defined referencing instrumentation.env', () => {
            const overlayYml = fs.readFileSync(
                path.join(REAL_OVERLAYS_DIR, 'prometheus', 'overlay.yml'),
                'utf-8'
            );
            expect(overlayYml).toContain('imports:');
            expect(overlayYml).toContain('.shared/otel/instrumentation.env');
        });

        it('jaeger overlay has imports defined referencing instrumentation.env', () => {
            const overlayYml = fs.readFileSync(
                path.join(REAL_OVERLAYS_DIR, 'jaeger', 'overlay.yml'),
                'utf-8'
            );
            expect(overlayYml).toContain('imports:');
            expect(overlayYml).toContain('.shared/otel/instrumentation.env');
        });

        it('instrumentation.env shared fragment exists and is non-empty', () => {
            const sharedEnvPath = path.join(
                REAL_OVERLAYS_DIR,
                '.shared',
                'otel',
                'instrumentation.env'
            );
            expect(fs.existsSync(sharedEnvPath)).toBe(true);
            const content = fs.readFileSync(sharedEnvPath, 'utf-8');
            expect(content.trim().length).toBeGreaterThan(0);
            expect(content).toContain('OTEL_');
        });

        it('all three converted overlays compose without errors', () => {
            for (const overlayId of ['otel-collector', 'prometheus', 'jaeger']) {
                expect(() => applyOverlay({}, overlayId, REAL_OVERLAYS_DIR)).not.toThrow();
            }
        });

        it('prometheus compose generation includes OTEL env vars in .env.example', async () => {
            const outputSubdir = path.join(testOutputPath, 'prometheus-env-test');
            fs.mkdirSync(outputSubdir, { recursive: true });

            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                needsDocker: false,
                language: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: ['prometheus'],
                outputPath: outputSubdir,
            };

            await composeDevContainer(answers);

            const envExamplePath = path.join(outputSubdir, '.env.example');
            expect(fs.existsSync(envExamplePath)).toBe(true);

            const content = fs.readFileSync(envExamplePath, 'utf-8');
            expect(content).toContain('OTEL_SERVICE_NAME');
            expect(content).toMatch(/# from \.shared\/otel\/instrumentation\.env/);
        });
    });

    // -------------------------------------------------------------------------
    // Multi-overlay composition
    // -------------------------------------------------------------------------
    describe('multi-overlay composition', () => {
        it('two overlays each importing different shared fragments produce independent correct outputs', () => {
            const sharedA = path.join(overlaysDir, '.shared', 'a');
            const sharedB = path.join(overlaysDir, '.shared', 'b');
            fs.mkdirSync(sharedA, { recursive: true });
            fs.mkdirSync(sharedB, { recursive: true });

            fs.writeFileSync(
                path.join(sharedA, 'frag.json'),
                JSON.stringify({ remoteEnv: { VAR_A: 'value-a' } })
            );
            fs.writeFileSync(
                path.join(sharedB, 'frag.json'),
                JSON.stringify({ remoteEnv: { VAR_B: 'value-b' } })
            );

            createTestOverlay(overlaysDir, 'overlay-a', ['.shared/a/frag.json'], {});
            createTestOverlay(overlaysDir, 'overlay-b', ['.shared/b/frag.json'], {});

            const resultA = applyOverlay({}, 'overlay-a', overlaysDir);
            const resultB = applyOverlay({}, 'overlay-b', overlaysDir);

            expect(resultA.remoteEnv?.['VAR_A']).toBe('value-a');
            expect(resultA.remoteEnv?.['VAR_B']).toBeUndefined();

            expect(resultB.remoteEnv?.['VAR_B']).toBe('value-b');
            expect(resultB.remoteEnv?.['VAR_A']).toBeUndefined();
        });
    });

    // -------------------------------------------------------------------------
    // Shared fragment format validation
    // -------------------------------------------------------------------------
    describe('shared fragment format', () => {
        it('recommended-extensions.json should be a valid devcontainer patch with extensions array', () => {
            const fragPath = path.join(
                REAL_OVERLAYS_DIR,
                '.shared',
                'vscode',
                'recommended-extensions.json'
            );
            expect(fs.existsSync(fragPath)).toBe(true);

            const content = JSON.parse(fs.readFileSync(fragPath, 'utf-8'));
            expect(content.customizations).toBeDefined();
            expect(content.customizations.vscode).toBeDefined();
            expect(Array.isArray(content.customizations.vscode.extensions)).toBe(true);
            expect(content.customizations.vscode.extensions.length).toBeGreaterThan(0);
        });

        it('an overlay can import recommended-extensions.json and get its extensions merged', () => {
            // Create a local .shared/vscode pointing to the real recommended-extensions.json
            const localSharedVscode = path.join(overlaysDir, '.shared', 'vscode');
            fs.mkdirSync(localSharedVscode, { recursive: true });
            const realExtPath = path.join(
                REAL_OVERLAYS_DIR,
                '.shared',
                'vscode',
                'recommended-extensions.json'
            );
            fs.copyFileSync(
                realExtPath,
                path.join(localSharedVscode, 'recommended-extensions.json')
            );

            createTestOverlay(
                overlaysDir,
                'ext-overlay',
                ['.shared/vscode/recommended-extensions.json'],
                {}
            );

            const result = applyOverlay({}, 'ext-overlay', overlaysDir);
            const extensions = result.customizations?.vscode?.extensions as string[];
            expect(Array.isArray(extensions)).toBe(true);
            expect(extensions.length).toBeGreaterThan(0);
            expect(extensions).toContain('eamodio.gitlens');
        });
    });
});
