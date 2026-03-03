import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import {
    adoptCommand,
    analyseDevcontainer,
    resolveComposePaths,
    buildDetectionTables,
} from '../commands/adopt.js';
import { createBackup } from '../utils/backup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');

// ─── helpers ────────────────────────────────────────────────────────────────

function writeDevcontainerJson(dir: string, content: object): void {
    fs.writeFileSync(path.join(dir, 'devcontainer.json'), JSON.stringify(content, null, 2));
}

function writeDockerCompose(dir: string, content: string, filename = 'docker-compose.yml'): void {
    fs.writeFileSync(path.join(dir, filename), content);
}

// ─── tests ──────────────────────────────────────────────────────────────────

describe('adoptCommand', () => {
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
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adopt-test-'));
    });

    afterEach(() => {
        vi.restoreAllMocks();
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    // ── error handling ─────────────────────────────────────────────────────

    describe('error handling', () => {
        it('exits with error if directory does not exist', async () => {
            await expect(
                adoptCommand(overlaysConfig, OVERLAYS_DIR, {
                    dir: path.join(tmpDir, 'nonexistent'),
                })
            ).rejects.toThrow('process.exit(1)');
            expect(consoleErrorSpy.mock.calls.join('\n')).toContain('Directory not found');
        });

        it('exits with error if devcontainer.json is missing', async () => {
            await expect(
                adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir })
            ).rejects.toThrow('process.exit(1)');
            expect(consoleErrorSpy.mock.calls.join('\n')).toContain('No devcontainer.json found');
        });
    });

    // ── --dry-run ──────────────────────────────────────────────────────────

    describe('--dry-run mode', () => {
        it('prints analysis without writing files', async () => {
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/node:1': { version: 'lts' } },
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, dryRun: true });

            const output = consoleLogSpy.mock.calls.join('\n');
            // The `node` feature should map to `nodejs` (not `bun`)
            expect(output).toContain('nodejs');
            expect(output).toContain('exact');
            expect(output).toContain('Suggested command:');
            expect(output).toContain('--dry-run');
            expect(fs.existsSync(path.join(tmpDir, 'superposition.json'))).toBe(false);
        });

        it('shows unmatched items in dry-run output', async () => {
            writeDevcontainerJson(tmpDir, {
                features: {
                    'ghcr.io/devcontainers/features/node:1': {},
                    'ghcr.io/some-org/some-custom-feature:1': {},
                },
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, dryRun: true });

            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Items with no overlay equivalent');
            expect(output).toContain('some-custom-feature');
        });
    });

    // ── --json output ──────────────────────────────────────────────────────

    describe('--json output', () => {
        it('outputs valid JSON with all expected fields', async () => {
            writeDevcontainerJson(tmpDir, {
                features: {
                    'ghcr.io/devcontainers/features/node:1': {},
                    'ghcr.io/devcontainers/features/docker-outside-of-docker:1': {},
                },
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });

            expect(consoleLogSpy.mock.calls.length).toBe(1);
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);

            expect(parsed.dir).toBe(path.resolve(tmpDir));
            expect(Array.isArray(parsed.detections)).toBe(true);
            expect(Array.isArray(parsed.suggestedOverlays)).toBe(true);
            expect(typeof parsed.suggestedCommand).toBe('string');
            expect(typeof parsed.suggestedStack).toBe('string');
            expect(Array.isArray(parsed.unmatchedItems)).toBe(true);
            expect('customDevcontainerPatch' in parsed).toBe(true);
            expect('customComposePatch' in parsed).toBe(true);
        });

        it('includes unmatchedItems in JSON output', async () => {
            writeDevcontainerJson(tmpDir, {
                features: {
                    'ghcr.io/devcontainers/features/node:1': {},
                    'ghcr.io/corp/custom-tool:1': {},
                },
                customizations: {
                    vscode: { extensions: ['unknown.ext'] },
                },
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });

            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.unmatchedItems.length).toBeGreaterThan(0);
        });
    });

    // ── feature detection (uses dynamic tables built from overlay files) ───

    describe('feature detection', () => {
        it('detects Node.js feature as nodejs (exact), not bun', async () => {
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/node:1': {} },
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            const d = parsed.detections.find((x: any) => x.overlayId === 'nodejs');
            expect(d).toBeDefined();
            expect(d.confidence).toBe('exact');
            expect(d.sourceType).toBe('feature');
            // bun also includes the node feature but nodejs should win via scoring
            expect(parsed.detections.find((x: any) => x.overlayId === 'bun')).toBeUndefined();
        });

        it('puts unrecognised feature URIs into unmatchedItems', async () => {
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/some-org/some-tool:1': { option: true } },
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.unmatchedItems.some((u: any) => u.source.includes('some-tool'))).toBe(
                true
            );
        });

        it('puts unrecognised features into customDevcontainerPatch.features', async () => {
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/some-org/custom-tool:2': { flag: true } },
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.customDevcontainerPatch).not.toBeNull();
            expect(Object.keys(parsed.customDevcontainerPatch.features)).toContain(
                'ghcr.io/some-org/custom-tool:2'
            );
        });

        it('skips local feature paths', async () => {
            writeDevcontainerJson(tmpDir, {
                features: {
                    './features/cross-distro-packages': { apt: 'curl' },
                    'ghcr.io/devcontainers/features/node:1': {},
                },
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.detections.length).toBe(1);
            expect(parsed.suggestedOverlays).toContain('nodejs');
        });
    });

    // ── docker-compose detection ───────────────────────────────────────────

    describe('docker-compose detection', () => {
        it('detects postgres/redis services (exact) and suggests compose stack', async () => {
            writeDevcontainerJson(tmpDir, {});
            writeDockerCompose(
                tmpDir,
                'services:\n  postgres:\n    image: postgres:16-alpine\n  redis:\n    image: redis:7-alpine\n'
            );

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.suggestedStack).toBe('compose');
            expect(parsed.suggestedOverlays).toContain('postgres');
            expect(parsed.suggestedOverlays).toContain('redis');
        });

        it('puts unrecognised services into unmatchedItems and customComposePatch', async () => {
            writeDevcontainerJson(tmpDir, {});
            writeDockerCompose(
                tmpDir,
                'services:\n  myapp:\n    image: my-registry/myapp:latest\n'
            );

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.unmatchedItems.some((u: any) => u.source.includes('myapp'))).toBe(true);
            expect(parsed.customComposePatch).not.toBeNull();
            expect(Object.keys(parsed.customComposePatch.services)).toContain('myapp');
        });

        it('ignores services without an image field', async () => {
            writeDevcontainerJson(tmpDir, {});
            writeDockerCompose(
                tmpDir,
                'services:\n  app:\n    build:\n      context: .\n  postgres:\n    image: postgres:16-alpine\n'
            );

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            const appItem = parsed.unmatchedItems.find((u: any) =>
                u.source.includes(': app (image:')
            );
            expect(appItem).toBeUndefined();
            expect(parsed.suggestedOverlays).toContain('postgres');
        });
    });

    // ── dockerComposeFile path resolution ─────────────────────────────────

    describe('dockerComposeFile resolution', () => {
        it('resolves a compose file listed in dockerComposeFile (string)', async () => {
            const composeContent = 'services:\n  postgres:\n    image: postgres:16-alpine\n';
            fs.writeFileSync(path.join(tmpDir, 'docker-compose.yml'), composeContent);
            writeDevcontainerJson(tmpDir, {
                dockerComposeFile: './docker-compose.yml',
                service: 'app',
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.suggestedOverlays).toContain('postgres');
        });

        it('resolves a compose file via relative path pointing outside the dir', async () => {
            fs.writeFileSync(
                path.join(tmpDir, 'docker-compose.yml'),
                'services:\n  redis:\n    image: redis:7-alpine\n'
            );
            const devDir = path.join(tmpDir, '.devcontainer');
            fs.mkdirSync(devDir);
            writeDevcontainerJson(devDir, {
                dockerComposeFile: '../docker-compose.yml',
                service: 'app',
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: devDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.suggestedOverlays).toContain('redis');
        });

        it('resolves multiple compose files listed as an array', async () => {
            writeDockerCompose(
                tmpDir,
                'services:\n  postgres:\n    image: postgres:16-alpine\n',
                'docker-compose.base.yml'
            );
            writeDockerCompose(
                tmpDir,
                'services:\n  redis:\n    image: redis:7-alpine\n',
                'docker-compose.override.yml'
            );
            writeDevcontainerJson(tmpDir, {
                dockerComposeFile: ['docker-compose.base.yml', 'docker-compose.override.yml'],
                service: 'app',
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.suggestedOverlays).toContain('postgres');
            expect(parsed.suggestedOverlays).toContain('redis');
        });
    });

    // ── extension detection ────────────────────────────────────────────────

    describe('extension detection', () => {
        it('puts unrecognised extensions in unmatchedItems and customDevcontainerPatch', async () => {
            writeDevcontainerJson(tmpDir, {
                customizations: { vscode: { extensions: ['my-org.custom-ext'] } },
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(
                parsed.unmatchedItems.some((u: any) => u.source.includes('my-org.custom-ext'))
            ).toBe(true);
            expect(parsed.customDevcontainerPatch?.customizations?.vscode?.extensions).toContain(
                'my-org.custom-ext'
            );
        });

        it('deduplicates: keeps exact feature detection when same overlay also has extensions', async () => {
            // Both a feature AND extensions can point to the same overlay.
            // After dedup, each overlay should appear at most once, preferring 'exact'.
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/node:1': {} },
                customizations: {
                    vscode: { extensions: ['dbaeumer.vscode-eslint'] },
                },
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            // nodejs should appear exactly once
            const nodejsDetections = parsed.detections.filter((x: any) => x.overlayId === 'nodejs');
            expect(nodejsDetections.length).toBe(1);
            expect(nodejsDetections[0].confidence).toBe('exact');
        });
    });

    // ── custom/ patch content ──────────────────────────────────────────────

    describe('custom/ patch content', () => {
        it('includes mounts in customDevcontainerPatch', async () => {
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/node:1': {} },
                mounts: [
                    'source=${localWorkspaceFolder}/../shared,target=/workspace/shared,type=bind',
                ],
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.customDevcontainerPatch).not.toBeNull();
            expect(Array.isArray(parsed.customDevcontainerPatch.mounts)).toBe(true);
        });

        it('includes non-default remoteUser in customDevcontainerPatch', async () => {
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/node:1': {} },
                remoteUser: 'myuser',
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.customDevcontainerPatch?.remoteUser).toBe('myuser');
        });

        it('does not include remoteUser when it is the default "vscode"', async () => {
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/node:1': {} },
                remoteUser: 'vscode',
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.customDevcontainerPatch?.remoteUser).toBeUndefined();
        });

        it('returns null customDevcontainerPatch when nothing is unmatched', async () => {
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/node:1': {} },
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.customDevcontainerPatch).toBeNull();
        });

        it('returns null customComposePatch when all services are mapped', async () => {
            writeDevcontainerJson(tmpDir, {});
            writeDockerCompose(tmpDir, 'services:\n  postgres:\n    image: postgres:16-alpine\n');

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.customComposePatch).toBeNull();
        });
    });

    // ── no detections ──────────────────────────────────────────────────────

    describe('no detections', () => {
        it('handles config with no recognisable patterns gracefully', async () => {
            writeDevcontainerJson(tmpDir, {
                name: 'My Dev Container',
                image: 'my-custom-image:latest',
                customizations: {
                    vscode: { extensions: ['unknown.extension'] },
                },
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, dryRun: true });
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('No recognisable overlay patterns');
        });
    });

    // ── --force flag ───────────────────────────────────────────────────────

    describe('--force flag', () => {
        it('warns when superposition.json exists without --force', async () => {
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/node:1': {} },
            });
            fs.writeFileSync(
                path.join(tmpDir, 'superposition.json'),
                JSON.stringify({ existing: true })
            );

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir });

            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('already exist');
            expect(output).toContain('--force');

            const content = JSON.parse(
                fs.readFileSync(path.join(tmpDir, 'superposition.json'), 'utf8')
            );
            expect(content.existing).toBe(true);
        });
    });

    // ── suggested command ──────────────────────────────────────────────────

    describe('suggested command generation', () => {
        it('uses --stack plain when no docker-compose', async () => {
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/node:1': {} },
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.suggestedCommand).toContain('--stack plain');
        });

        it('uses --stack compose when docker-compose is present', async () => {
            writeDevcontainerJson(tmpDir, {});
            writeDockerCompose(tmpDir, 'services:\n  postgres:\n    image: postgres:16-alpine\n');

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.suggestedCommand).toContain('--stack compose');
        });

        it('uses overlay category from registry for CLI flag generation', async () => {
            // aws-cli is category=cloud → should produce --cloud-tools
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/aws-cli:1': {} },
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, { dir: tmpDir, json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.suggestedCommand).toContain('--cloud-tools');
            expect(parsed.suggestedCommand).toContain('aws-cli');
        });
    });

    // ── backup behaviour ───────────────────────────────────────────────────

    describe('backup behaviour (no-backup is explicit in these tests)', () => {
        it('does not create any backup files when --no-backup is set', async () => {
            writeDevcontainerJson(tmpDir, {
                features: { 'ghcr.io/devcontainers/features/node:1': {} },
            });

            await adoptCommand(overlaysConfig, OVERLAYS_DIR, {
                dir: tmpDir,
                backup: false,
                dryRun: true,
            });

            const parent = path.dirname(tmpDir);
            const baseName = path.basename(tmpDir);
            const backups = fs
                .readdirSync(parent)
                .filter((f) => f.startsWith(`${baseName}.backup-`));
            expect(backups).toHaveLength(0);
        });
    });
});

// ── createBackup unit tests ────────────────────────────────────────────────

describe('createBackup (adopt backup utility)', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adopt-backup-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns null when there is nothing to back up', async () => {
        const result = await createBackup(tmpDir);
        expect(result).toBeNull();
    });

    it('creates a backup directory containing devcontainer.json', async () => {
        fs.writeFileSync(path.join(tmpDir, 'devcontainer.json'), JSON.stringify({ name: 'test' }));

        const backupPath = await createBackup(tmpDir);
        expect(backupPath).not.toBeNull();
        expect(fs.existsSync(backupPath!)).toBe(true);
        expect(fs.existsSync(path.join(backupPath!, 'devcontainer.json'))).toBe(true);

        // Cleanup
        fs.rmSync(backupPath!, { recursive: true, force: true });
    });

    it('creates a backup in a custom directory when backupDir is given', async () => {
        const customBackupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adopt-backup-custom-'));
        fs.writeFileSync(path.join(tmpDir, 'devcontainer.json'), JSON.stringify({ name: 'test' }));

        const backupPath = await createBackup(tmpDir, customBackupDir);
        expect(backupPath).toBe(path.resolve(customBackupDir));
        expect(fs.existsSync(path.join(customBackupDir, 'devcontainer.json'))).toBe(true);

        fs.rmSync(customBackupDir, { recursive: true, force: true });
    });
});

// ── buildDetectionTables unit tests ───────────────────────────────────────

describe('buildDetectionTables', () => {
    let overlaysConfig: any;

    beforeEach(() => {
        overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
    });

    it('maps ghcr.io/devcontainers/features/node to nodejs (not bun)', () => {
        const tables = buildDetectionTables(OVERLAYS_DIR, overlaysConfig);
        const nodeUri = 'ghcr.io/devcontainers/features/node';
        expect(tables.featureToOverlay[nodeUri]).toBe('nodejs');
    });

    it('builds a non-empty featureToOverlay table from actual overlay files', () => {
        const tables = buildDetectionTables(OVERLAYS_DIR, overlaysConfig);
        expect(Object.keys(tables.featureToOverlay).length).toBeGreaterThan(0);
        const nodeEntry = Object.entries(tables.featureToOverlay).find(([, v]) => v === 'nodejs');
        expect(nodeEntry).toBeDefined();
    });

    it('builds a non-empty imagePrefixToOverlay table from actual overlay files', () => {
        const tables = buildDetectionTables(OVERLAYS_DIR, overlaysConfig);
        expect(tables.imagePrefixToOverlay.length).toBeGreaterThan(0);
        const pgEntry = tables.imagePrefixToOverlay.find((e) => e.overlayId === 'postgres');
        expect(pgEntry).toBeDefined();
        expect(pgEntry?.prefix).toBe('postgres');
    });

    it('builds a non-empty extensionToOverlay table from actual overlay files', () => {
        const tables = buildDetectionTables(OVERLAYS_DIR, overlaysConfig);
        expect(Object.keys(tables.extensionToOverlay).length).toBeGreaterThan(0);
    });

    it('does not include local feature paths in featureToOverlay', () => {
        const tables = buildDetectionTables(OVERLAYS_DIR, overlaysConfig);
        for (const key of Object.keys(tables.featureToOverlay)) {
            expect(key.startsWith('./')).toBe(false);
            expect(key.startsWith('../')).toBe(false);
        }
    });
});

// ── resolveComposePaths unit tests ─────────────────────────────────────────

describe('resolveComposePaths', () => {
    let tmpDir: string;

    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adopt-resolve-test-'));
    });

    afterEach(() => {
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns empty array when no compose file exists', () => {
        expect(resolveComposePaths({}, tmpDir)).toEqual([]);
    });

    it('returns conventional path when docker-compose.yml exists', () => {
        const f = path.join(tmpDir, 'docker-compose.yml');
        fs.writeFileSync(f, '');
        expect(resolveComposePaths({}, tmpDir)).toContain(f);
    });

    it('resolves dockerComposeFile string to absolute path', () => {
        const f = path.join(tmpDir, 'my-compose.yml');
        fs.writeFileSync(f, '');
        expect(resolveComposePaths({ dockerComposeFile: 'my-compose.yml' }, tmpDir)).toContain(f);
    });

    it('resolves dockerComposeFile array to multiple paths', () => {
        const f1 = path.join(tmpDir, 'a.yml');
        const f2 = path.join(tmpDir, 'b.yml');
        fs.writeFileSync(f1, '');
        fs.writeFileSync(f2, '');
        const result = resolveComposePaths({ dockerComposeFile: ['a.yml', 'b.yml'] }, tmpDir);
        expect(result).toContain(f1);
        expect(result).toContain(f2);
    });

    it('resolves relative path pointing outside the devcontainer dir', () => {
        const devDir = path.join(tmpDir, '.devcontainer');
        fs.mkdirSync(devDir);
        const f = path.join(tmpDir, 'docker-compose.yml');
        fs.writeFileSync(f, '');
        expect(
            resolveComposePaths({ dockerComposeFile: '../docker-compose.yml' }, devDir)
        ).toContain(f);
    });

    it('deduplicates when dockerComposeFile and conventional path point to the same file', () => {
        const f = path.join(tmpDir, 'docker-compose.yml');
        fs.writeFileSync(f, '');
        const result = resolveComposePaths({ dockerComposeFile: 'docker-compose.yml' }, tmpDir);
        expect(result.filter((p) => p === f).length).toBe(1);
    });
});
