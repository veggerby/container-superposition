import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import { upgradeCommand } from '../commands/upgrade.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');

// ─── helpers ────────────────────────────────────────────────────────────────

function writeDevcontainerJson(dir: string, content: object): void {
    fs.writeFileSync(path.join(dir, 'devcontainer.json'), JSON.stringify(content, null, 2));
}

function writeDockerCompose(dir: string, content: string): void {
    fs.writeFileSync(path.join(dir, 'docker-compose.yml'), content);
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('upgradeCommand', () => {
    let overlaysConfig: any;
    let consoleLogSpy: any;
    let consoleErrorSpy: any;
    let processExitSpy: any;
    let tmpDir: string;

    beforeEach(() => {
        overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: any) => {
            throw new Error(`process.exit(${code})`);
        });
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upgrade-test-'));
    });

    afterEach(() => {
        vi.restoreAllMocks();
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    describe('error handling', () => {
        it('should exit with error if directory does not exist', async () => {
            await expect(
                upgradeCommand(overlaysConfig, { dir: path.join(tmpDir, 'nonexistent') })
            ).rejects.toThrow('process.exit(1)');

            expect(consoleErrorSpy).toHaveBeenCalled();
            const errOutput = consoleErrorSpy.mock.calls.join('\n');
            expect(errOutput).toContain('Directory not found');
        });

        it('should exit with error if devcontainer.json is missing', async () => {
            // Dir exists but no devcontainer.json
            await expect(upgradeCommand(overlaysConfig, { dir: tmpDir })).rejects.toThrow(
                'process.exit(1)'
            );

            const errOutput = consoleErrorSpy.mock.calls.join('\n');
            expect(errOutput).toContain('No devcontainer.json found');
        });
    });

    describe('--dry-run mode', () => {
        it('should print analysis without writing any files', async () => {
            writeDevcontainerJson(tmpDir, {
                features: {
                    'ghcr.io/devcontainers/features/node:1': { version: 'lts' },
                },
            });

            await upgradeCommand(overlaysConfig, { dir: tmpDir, dryRun: true });

            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('nodejs');
            expect(output).toContain('exact');
            expect(output).toContain('Suggested command:');
            expect(output).toContain('--dry-run');

            // No superposition.json should be written
            expect(fs.existsSync(path.join(tmpDir, 'superposition.json'))).toBe(false);
        });

        it('should detect docker-compose services in dry-run', async () => {
            writeDevcontainerJson(tmpDir, {});
            writeDockerCompose(
                tmpDir,
                `
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
  redis:
    image: redis:7-alpine
`
            );

            await upgradeCommand(overlaysConfig, { dir: tmpDir, dryRun: true });

            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('postgres');
            expect(output).toContain('redis');
            expect(output).toContain('compose'); // suggested stack
        });
    });

    describe('--json output', () => {
        it('should output valid JSON with expected fields', async () => {
            writeDevcontainerJson(tmpDir, {
                features: {
                    'ghcr.io/devcontainers/features/node:1': {},
                    'ghcr.io/devcontainers/features/docker-outside-of-docker:1': {},
                },
            });

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            expect(consoleLogSpy).toHaveBeenCalled();
            const rawOutput = consoleLogSpy.mock.calls[0][0];
            const parsed = JSON.parse(rawOutput);

            expect(parsed.dir).toBe(path.resolve(tmpDir));
            expect(Array.isArray(parsed.detections)).toBe(true);
            expect(Array.isArray(parsed.suggestedOverlays)).toBe(true);
            expect(typeof parsed.suggestedCommand).toBe('string');
            expect(typeof parsed.suggestedStack).toBe('string');
        });

        it('should not print extra text before JSON when --json is set', async () => {
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/node:1': {} },
            });

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            // Only one console.log call - the JSON itself
            expect(consoleLogSpy.mock.calls.length).toBe(1);
        });
    });

    describe('feature detection', () => {
        it('should detect Node.js feature as nodejs overlay (exact)', async () => {
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/node:1': {} },
            });

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            const nodeDetection = parsed.detections.find((d: any) => d.overlayId === 'nodejs');

            expect(nodeDetection).toBeDefined();
            expect(nodeDetection.confidence).toBe('exact');
            expect(nodeDetection.sourceType).toBe('feature');
            expect(parsed.suggestedOverlays).toContain('nodejs');
        });

        it('should detect docker-outside-of-docker as docker-sock (exact)', async () => {
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/docker-outside-of-docker:1': {} },
            });

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            const d = parsed.detections.find((x: any) => x.overlayId === 'docker-sock');
            expect(d).toBeDefined();
            expect(d.confidence).toBe('exact');
        });

        it('should detect docker-in-docker feature', async () => {
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/docker-in-docker:2': {} },
            });

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.suggestedOverlays).toContain('docker-in-docker');
        });

        it('should detect multiple features', async () => {
            writeDevcontainerJson(tmpDir, {
                features: {
                    'ghcr.io/devcontainers/features/node:1': {},
                    'ghcr.io/devcontainers/features/python:1': {},
                    'ghcr.io/devcontainers/features/terraform:1': {},
                },
            });

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.suggestedOverlays).toContain('nodejs');
            expect(parsed.suggestedOverlays).toContain('python');
            expect(parsed.suggestedOverlays).toContain('terraform');
        });

        it('should skip local feature paths (e.g. ./features/cross-distro-packages)', async () => {
            writeDevcontainerJson(tmpDir, {
                features: {
                    './features/cross-distro-packages': { apt: 'curl' },
                    'ghcr.io/devcontainers/features/node:1': {},
                },
            });

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            // Only nodejs should be detected, not the local feature
            expect(parsed.detections.length).toBe(1);
            expect(parsed.suggestedOverlays).toContain('nodejs');
        });
    });

    describe('service detection from docker-compose', () => {
        it('should detect postgres service and suggest compose stack', async () => {
            writeDevcontainerJson(tmpDir, {});
            writeDockerCompose(
                tmpDir,
                `
services:
  postgres:
    image: postgres:16-alpine
`
            );

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.suggestedStack).toBe('compose');
            expect(parsed.suggestedOverlays).toContain('postgres');

            const d = parsed.detections.find((x: any) => x.overlayId === 'postgres');
            expect(d.confidence).toBe('exact');
            expect(d.sourceType).toBe('service');
        });

        it('should detect redis service', async () => {
            writeDevcontainerJson(tmpDir, {});
            writeDockerCompose(
                tmpDir,
                `
services:
  redis:
    image: redis:7-alpine
`
            );

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.suggestedOverlays).toContain('redis');
        });

        it('should detect multiple services', async () => {
            writeDevcontainerJson(tmpDir, {});
            writeDockerCompose(
                tmpDir,
                `
services:
  postgres:
    image: postgres:16-alpine
  redis:
    image: redis:7-alpine
  grafana:
    image: grafana/grafana:latest
`
            );

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.suggestedOverlays).toContain('postgres');
            expect(parsed.suggestedOverlays).toContain('redis');
            expect(parsed.suggestedOverlays).toContain('grafana');
            expect(parsed.suggestedStack).toBe('compose');
        });

        it('should handle docker-compose with no image (build-only services)', async () => {
            writeDevcontainerJson(tmpDir, {});
            writeDockerCompose(
                tmpDir,
                `
services:
  app:
    build:
      context: .
  postgres:
    image: postgres:16-alpine
`
            );

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            // Only postgres should be detected (app has no image)
            const postgresD = parsed.detections.find((x: any) => x.overlayId === 'postgres');
            expect(postgresD).toBeDefined();
        });
    });

    describe('extension detection', () => {
        it('should detect python extension as python overlay (heuristic)', async () => {
            writeDevcontainerJson(tmpDir, {
                customizations: {
                    vscode: {
                        extensions: ['ms-python.python'],
                    },
                },
            });

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            const d = parsed.detections.find((x: any) => x.overlayId === 'python');
            expect(d).toBeDefined();
            expect(d.confidence).toBe('heuristic');
            expect(d.sourceType).toBe('extension');
        });

        it('should prefer exact feature detection over heuristic extension', async () => {
            // Both feature AND extension for python
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/python:1': {} },
                customizations: {
                    vscode: {
                        extensions: ['ms-python.python'],
                    },
                },
            });

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            // Only one detection for python, and it should be exact
            const pythonDetections = parsed.detections.filter((x: any) => x.overlayId === 'python');
            expect(pythonDetections.length).toBe(1);
            expect(pythonDetections[0].confidence).toBe('exact');
        });
    });

    describe('remoteEnv detection', () => {
        it('should detect POSTGRES_ env vars as postgres (heuristic)', async () => {
            writeDevcontainerJson(tmpDir, {
                remoteEnv: {
                    POSTGRES_HOST: 'postgres',
                    POSTGRES_PORT: '5432',
                },
            });

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            const d = parsed.detections.find((x: any) => x.overlayId === 'postgres');
            expect(d).toBeDefined();
            expect(d.confidence).toBe('heuristic');
            expect(d.sourceType).toBe('remoteenv');
        });

        it('should prefer service detection over remoteEnv for same overlay', async () => {
            writeDevcontainerJson(tmpDir, {
                remoteEnv: { POSTGRES_HOST: 'postgres' },
            });
            writeDockerCompose(
                tmpDir,
                `
services:
  postgres:
    image: postgres:16-alpine
`
            );

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            const postgresDetections = parsed.detections.filter(
                (x: any) => x.overlayId === 'postgres'
            );
            expect(postgresDetections.length).toBe(1);
            expect(postgresDetections[0].confidence).toBe('exact');
            expect(postgresDetections[0].sourceType).toBe('service');
        });
    });

    describe('no detections', () => {
        it('should handle config with no recognisable patterns gracefully', async () => {
            writeDevcontainerJson(tmpDir, {
                name: 'My Dev Container',
                image: 'my-custom-image:latest',
                customizations: {
                    vscode: {
                        extensions: ['some.unknown-extension'],
                    },
                },
            });

            await upgradeCommand(overlaysConfig, { dir: tmpDir, dryRun: true });

            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('No recognisable overlay patterns');
        });
    });

    describe('--force flag', () => {
        it('should warn when superposition.json exists without --force', async () => {
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/node:1': {} },
            });
            fs.writeFileSync(
                path.join(tmpDir, 'superposition.json'),
                JSON.stringify({ existing: true })
            );

            await upgradeCommand(overlaysConfig, { dir: tmpDir });

            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('already exists');
            expect(output).toContain('--force');

            // Existing file should not be overwritten
            const content = JSON.parse(
                fs.readFileSync(path.join(tmpDir, 'superposition.json'), 'utf8')
            );
            expect(content.existing).toBe(true);
        });
    });

    describe('suggested command generation', () => {
        it('should generate correct --language flag for language overlays', async () => {
            writeDevcontainerJson(tmpDir, {
                features: {
                    'ghcr.io/devcontainers/features/node:1': {},
                    'ghcr.io/devcontainers/features/python:1': {},
                },
            });

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.suggestedCommand).toContain('--language');
            expect(parsed.suggestedCommand).toContain('nodejs');
            expect(parsed.suggestedCommand).toContain('python');
        });

        it('should generate --database flag for database overlays', async () => {
            writeDevcontainerJson(tmpDir, {});
            writeDockerCompose(
                tmpDir,
                `
services:
  postgres:
    image: postgres:16-alpine
  redis:
    image: redis:7-alpine
`
            );

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.suggestedCommand).toContain('--database');
            expect(parsed.suggestedCommand).toContain('postgres');
            expect(parsed.suggestedCommand).toContain('redis');
        });

        it('should use --stack compose when docker-compose is present', async () => {
            writeDevcontainerJson(tmpDir, {});
            writeDockerCompose(tmpDir, `\nservices:\n  postgres:\n    image: postgres:16-alpine\n`);

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.suggestedCommand).toContain('--stack compose');
        });

        it('should use --stack plain when no docker-compose', async () => {
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/node:1': {} },
            });

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.suggestedCommand).toContain('--stack plain');
        });

        it('should generate --cloud-tools flag for cloud overlays', async () => {
            writeDevcontainerJson(tmpDir, {
                features: {
                    'ghcr.io/devcontainers/features/aws-cli:1': {},
                    'ghcr.io/devcontainers/features/terraform:1': {},
                },
            });

            await upgradeCommand(overlaysConfig, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.suggestedCommand).toContain('--cloud-tools');
            expect(parsed.suggestedCommand).toContain('aws-cli');
            expect(parsed.suggestedCommand).toContain('terraform');
        });
    });
});
