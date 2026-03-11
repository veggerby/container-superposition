import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import { generateManifestOnly } from '../questionnaire/composer.js';
import type { QuestionnaireAnswers } from '../schema/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const TSX_CLI = path.join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

function runInitCli(args: string[], cwd: string): string {
    return execFileSync(
        process.execPath,
        [TSX_CLI, path.join(REPO_ROOT, 'scripts', 'init.ts'), ...args],
        {
            cwd,
            env: { ...process.env, FORCE_COLOR: '0' },
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }
    );
}

describe('Manifest-Only Generation', () => {
    let tempDir: string;

    beforeEach(() => {
        // Create a temporary directory for each test
        tempDir = fs.mkdtempSync(path.join('/tmp', 'manifest-only-test-'));
    });

    afterEach(() => {
        // Clean up temporary directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('should generate only superposition.json without .devcontainer files', async () => {
        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            database: ['postgres'],
            observability: [],
            cloudTools: [],
            devTools: [],
            playwright: false,
            outputPath: tempDir,
        };

        await generateManifestOnly(answers);

        // Verify manifest was created
        const manifestPath = path.join(tempDir, 'superposition.json');
        expect(fs.existsSync(manifestPath)).toBe(true);

        // Verify .devcontainer files were NOT created
        expect(fs.existsSync(path.join(tempDir, 'devcontainer.json'))).toBe(false);
        expect(fs.existsSync(path.join(tempDir, 'docker-compose.yml'))).toBe(false);
        expect(fs.existsSync(path.join(tempDir, '.env.example'))).toBe(false);
        expect(fs.existsSync(path.join(tempDir, 'README.md'))).toBe(false);

        // Verify manifest contents
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        expect(manifest.baseTemplate).toBe('compose');
        expect(manifest.baseImage).toBe('bookworm');
        expect(manifest.overlays).toContain('nodejs');
        expect(manifest.overlays).toContain('postgres');
        expect(manifest.manifestVersion).toBe('1');
    });

    it('should generate manifest with auto-resolved dependencies', async () => {
        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['mkdocs'], // MkDocs requires Python
            database: [],
            observability: [],
            cloudTools: [],
            devTools: [],
            playwright: false,
            outputPath: tempDir,
        };

        await generateManifestOnly(answers);

        const manifestPath = path.join(tempDir, 'superposition.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

        // Verify mkdocs is included
        expect(manifest.overlays).toContain('mkdocs');
        // Verify Python was auto-resolved as a dependency
        expect(manifest.overlays).toContain('python');
    });

    it('should apply minimal flag when generating manifest', async () => {
        const answers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            language: ['nodejs'],
            database: [],
            observability: [],
            cloudTools: [],
            devTools: ['modern-cli-tools'], // This is marked as minimal
            playwright: false,
            outputPath: tempDir,
            minimal: true,
        };

        await generateManifestOnly(answers);

        const manifestPath = path.join(tempDir, 'superposition.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

        // modern-cli-tools should be excluded in minimal mode
        expect(manifest.overlays).not.toContain('modern-cli-tools');
        expect(manifest.overlays).toContain('nodejs');
    });

    it('should include port offset in manifest', async () => {
        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            database: ['postgres'],
            observability: [],
            cloudTools: [],
            devTools: [],
            playwright: false,
            outputPath: tempDir,
            portOffset: 100,
        };

        await generateManifestOnly(answers);

        const manifestPath = path.join(tempDir, 'superposition.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

        expect(manifest.portOffset).toBe(100);
    });

    it('should filter incompatible overlays', async () => {
        const answers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'bookworm',
            language: ['nodejs'],
            database: ['postgres'], // postgres requires compose
            observability: [],
            cloudTools: [],
            devTools: [],
            playwright: false,
            outputPath: tempDir,
        };

        await generateManifestOnly(answers);

        const manifestPath = path.join(tempDir, 'superposition.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

        // postgres should be filtered out (requires compose)
        expect(manifest.overlays).not.toContain('postgres');
        expect(manifest.overlays).toContain('nodejs');
    });

    it('should handle custom images in manifest', async () => {
        const answers: QuestionnaireAnswers = {
            stack: 'plain',
            baseImage: 'custom',
            customImage: 'ubuntu:24.04',
            language: ['nodejs'],
            database: [],
            observability: [],
            cloudTools: [],
            devTools: [],
            playwright: false,
            outputPath: tempDir,
        };

        await generateManifestOnly(answers);

        const manifestPath = path.join(tempDir, 'superposition.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

        expect(manifest.baseImage).toBe('ubuntu:24.04');
    });

    it('should include preset information in manifest', async () => {
        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            database: ['postgres'],
            observability: [],
            cloudTools: [],
            devTools: [],
            playwright: false,
            outputPath: tempDir,
            preset: 'web-api',
            presetChoices: { database: 'postgres' },
        };

        await generateManifestOnly(answers);

        const manifestPath = path.join(tempDir, 'superposition.json');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

        expect(manifest.preset).toBe('web-api');
        expect(manifest.presetChoices).toEqual({ database: 'postgres' });
    });

    it('should keep explicit manifest regeneration isolated from project-config defaults', () => {
        const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-config-manifest-'));

        try {
            fs.writeFileSync(
                path.join(repoDir, '.superposition.yml'),
                yaml.dump({
                    stack: 'plain',
                    language: ['nodejs'],
                    outputPath: './generated-from-config',
                })
            );

            const manifestDir = path.join(repoDir, 'manifest-source');
            fs.mkdirSync(manifestDir, { recursive: true });
            fs.writeFileSync(
                path.join(manifestDir, 'superposition.json'),
                JSON.stringify(
                    {
                        manifestVersion: '1',
                        generatedBy: 'test',
                        generated: new Date().toISOString(),
                        baseTemplate: 'plain',
                        baseImage: 'bookworm',
                        overlays: ['python'],
                    },
                    null,
                    2
                )
            );

            runInitCli(
                [
                    'init',
                    '--from-manifest',
                    path.join(manifestDir, 'superposition.json'),
                    '--no-interactive',
                ],
                repoDir
            );

            const generatedManifest = JSON.parse(
                fs.readFileSync(path.join(manifestDir, 'superposition.json'), 'utf8')
            );
            expect(generatedManifest.overlays).toContain('python');
            expect(generatedManifest.overlays).not.toContain('nodejs');
            expect(fs.existsSync(path.join(repoDir, 'generated-from-config'))).toBe(false);
        } finally {
            fs.rmSync(repoDir, { recursive: true, force: true });
        }
    });
});
