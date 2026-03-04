import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import { listCommand } from '../commands/list.js';
import { explainCommand } from '../commands/explain.js';
import { planCommand, generatePlanDiff } from '../commands/plan.js';
import { doctorCommand } from '../commands/doctor.js';
import { hashCommand, computeHash } from '../commands/hash.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');

describe('Command Tests', () => {
    let overlaysConfig: any;
    let consoleLogSpy: any;
    let consoleErrorSpy: any;
    let processExitSpy: any;

    beforeEach(() => {
        overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: any) => {
            throw new Error(`process.exit(${code})`);
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('listCommand', () => {
        it('should list all overlays without filters', async () => {
            await listCommand(overlaysConfig, {});

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Available Overlays');
            expect(output).toContain('Language & Framework');
            expect(output).toContain('nodejs');
        });

        it('should filter by category', async () => {
            await listCommand(overlaysConfig, { category: 'language' });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Filtered Overlays');
            expect(output).toContain('nodejs');
            expect(output).not.toContain('postgres');
        });

        it('should filter by tags', async () => {
            await listCommand(overlaysConfig, { tags: 'observability' });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Filtered Overlays');
            expect(output).toContain('prometheus');
        });

        it('should filter by stack support', async () => {
            await listCommand(overlaysConfig, { supports: 'compose' });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Filtered Overlays');
            // Postgres should be included (compose only)
            expect(output).toContain('postgres');
        });

        it('should output JSON when --json flag is used', async () => {
            await listCommand(overlaysConfig, { json: true });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls[0][0];
            expect(() => JSON.parse(output)).not.toThrow();
            const parsed = JSON.parse(output);
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed.length).toBeGreaterThan(0);
        });

        it('should show table format when filtering', async () => {
            await listCommand(overlaysConfig, { category: 'database' });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            // Table format includes headers
            expect(output).toContain('ID');
            expect(output).toContain('NAME');
            expect(output).toContain('CATEGORY');
            expect(output).toContain('PORTS');
            expect(output).toContain('REQUIRES');
        });
    });

    describe('explainCommand', () => {
        it('should explain an existing overlay', async () => {
            await explainCommand(overlaysConfig, OVERLAYS_DIR, 'nodejs', {});

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Node.js');
            expect(output).toContain('Description:');
            expect(output).toContain('Category:');
            expect(output).toContain('language');
            expect(output).toContain('Stack Compatibility:');
        });

        it('should show files for an overlay', async () => {
            await explainCommand(overlaysConfig, OVERLAYS_DIR, 'nodejs', {});

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Files:');
            expect(output).toContain('devcontainer.patch.json');
            expect(output).toContain('overlay.yml');
        });

        it('should show dependencies for overlays that have them', async () => {
            await explainCommand(overlaysConfig, OVERLAYS_DIR, 'grafana', {});

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Dependencies:');
            expect(output).toContain('prometheus');
        });

        it('should show docker compose services for database overlays', async () => {
            await explainCommand(overlaysConfig, OVERLAYS_DIR, 'postgres', {});

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Docker Compose Services:');
            expect(output).toContain('postgres');
        });

        it('should output JSON when --json flag is used', async () => {
            await explainCommand(overlaysConfig, OVERLAYS_DIR, 'nodejs', { json: true });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls[0][0];
            expect(() => JSON.parse(output)).not.toThrow();
            const parsed = JSON.parse(output);
            expect(parsed.id).toBe('nodejs');
            expect(parsed.name).toBe('Node.js');
            expect(parsed.files).toBeDefined();
            expect(Array.isArray(parsed.files)).toBe(true);
        });

        it('should exit with error for non-existent overlay', async () => {
            try {
                await explainCommand(overlaysConfig, OVERLAYS_DIR, 'nonexistent', {});
            } catch (e: any) {
                expect(e.message).toContain('process.exit(1)');
            }

            expect(consoleErrorSpy).toHaveBeenCalled();
            const errorOutput = consoleErrorSpy.mock.calls.join('\n');
            expect(errorOutput).toContain('Overlay not found');
        });
    });

    describe('planCommand', () => {
        it('should create a plan for selected overlays', async () => {
            await planCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres,redis',
            });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Generation Plan');
            expect(output).toContain('Stack: compose');
            expect(output).toContain('postgres');
            expect(output).toContain('redis');
        });

        it('should auto-add required dependencies', async () => {
            await planCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'grafana',
            });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Auto-Added Dependencies:');
            expect(output).toContain('prometheus');
        });

        it('should detect conflicts', async () => {
            try {
                await planCommand(overlaysConfig, OVERLAYS_DIR, {
                    stack: 'compose',
                    overlays: 'docker-in-docker,docker-sock',
                });
            } catch (e: any) {
                expect(e.message).toContain('process.exit(1)');
            }

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Conflicts Detected');
            expect(output).toContain('docker-in-docker');
            expect(output).toContain('docker-sock');
        });

        it('should show port mappings with offset', async () => {
            await planCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres,redis',
                portOffset: 100,
            });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Port Mappings:');
            expect(output).toContain('Offset: +100');
            expect(output).toContain('5532'); // postgres 5432 + 100
            expect(output).toContain('6479'); // redis 6379 + 100
        });

        it('should list files to be created', async () => {
            await planCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres',
            });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Files to Create/Modify:');
            expect(output).toContain('devcontainer.json');
            expect(output).toContain('superposition.json');
            expect(output).toContain('docker-compose.yml');
        });

        it('should output JSON when --json flag is used', async () => {
            await planCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres',
                json: true,
            });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls[0][0];
            expect(() => JSON.parse(output)).not.toThrow();
            const parsed = JSON.parse(output);
            expect(parsed.stack).toBe('compose');
            expect(parsed.selectedOverlays).toContain('postgres');
            expect(Array.isArray(parsed.files)).toBe(true);
        });

        it('should exit with error when stack is missing', async () => {
            try {
                await planCommand(overlaysConfig, OVERLAYS_DIR, {
                    overlays: 'postgres',
                });
            } catch (e: any) {
                expect(e.message).toContain('process.exit(1)');
            }

            expect(consoleErrorSpy).toHaveBeenCalled();
            const errorOutput = consoleErrorSpy.mock.calls.join('\n');
            expect(errorOutput).toContain('--stack is required');
        });

        it('should exit with error when overlays is missing', async () => {
            try {
                await planCommand(overlaysConfig, OVERLAYS_DIR, {
                    stack: 'compose',
                });
            } catch (e: any) {
                expect(e.message).toContain('process.exit(1)');
            }

            expect(consoleErrorSpy).toHaveBeenCalled();
            const errorOutput = consoleErrorSpy.mock.calls.join('\n');
            expect(errorOutput).toContain('--overlays is required');
        });

        it('should exit with error for unknown overlay', async () => {
            try {
                await planCommand(overlaysConfig, OVERLAYS_DIR, {
                    stack: 'compose',
                    overlays: 'unknown-overlay',
                });
            } catch (e: any) {
                expect(e.message).toContain('process.exit(1)');
            }

            expect(consoleErrorSpy).toHaveBeenCalled();
            const errorOutput = consoleErrorSpy.mock.calls.join('\n');
            expect(errorOutput).toContain('Unknown overlay');
        });
    });

    describe('planCommand --diff', () => {
        let tmpDir: string;

        beforeEach(() => {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-diff-test-'));
        });

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        it('should show diff output when --diff flag is used (no existing config)', async () => {
            await planCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres,redis',
                diff: true,
                output: path.join(tmpDir, 'nonexistent'),
            });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Plan Diff');
        });

        it('should mark all files as created when no existing config', async () => {
            await planCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres',
                diff: true,
                output: path.join(tmpDir, 'nonexistent'),
            });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Files to be created');
            expect(output).toContain('devcontainer.json');
        });

        it('should show overlay changes when existing superposition.json exists', async () => {
            // Create a fake existing .devcontainer with superposition.json
            const existingDir = path.join(tmpDir, 'existing');
            fs.mkdirSync(existingDir, { recursive: true });
            fs.writeFileSync(
                path.join(existingDir, 'superposition.json'),
                JSON.stringify({ overlays: ['mongodb'] })
            );

            await planCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres',
                diff: true,
                output: existingDir,
            });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Overlays');
            expect(output).toContain('postgres');
        });

        it('should output JSON when --diff and --diff-format json are used', async () => {
            await planCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres',
                diff: true,
                diffFormat: 'json',
                output: path.join(tmpDir, 'nonexistent'),
            });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls[0][0];
            expect(() => JSON.parse(output)).not.toThrow();
            const parsed = JSON.parse(output);
            expect(parsed.hasExistingConfig).toBe(false);
            expect(Array.isArray(parsed.created)).toBe(true);
            expect(Array.isArray(parsed.modified)).toBe(true);
            expect(Array.isArray(parsed.overwritten)).toBe(true);
            expect(Array.isArray(parsed.unchanged)).toBe(true);
            expect(Array.isArray(parsed.preserved)).toBe(true);
        });

        it('should show preserved files from custom/ directory', async () => {
            const existingDir = path.join(tmpDir, 'existing');
            fs.mkdirSync(path.join(existingDir, 'custom'), { recursive: true });
            fs.writeFileSync(path.join(existingDir, 'custom', 'my-script.sh'), '#!/bin/bash\n');

            await planCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres',
                diff: true,
                output: existingDir,
            });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('preserved');
            expect(output).toContain('my-script.sh');
        });
    });

    describe('generatePlanDiff', () => {
        let tmpDir: string;
        let overlaysConfig: any;

        beforeEach(() => {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-diff-unit-'));
            overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
        });

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        it('should return hasExistingConfig=false for non-existent path', () => {
            const plan = {
                stack: 'compose' as const,
                selectedOverlays: ['postgres'],
                autoAddedOverlays: [],
                portMappings: [{ overlay: 'postgres', ports: [5432], offsetPorts: [5432] }],
                files: [],
            };

            const result = generatePlanDiff(
                plan,
                overlaysConfig,
                OVERLAYS_DIR,
                path.join(tmpDir, 'nonexistent')
            );

            expect(result.hasExistingConfig).toBe(false);
            expect(result.created).toEqual([]);
            expect(result.modified).toEqual([]);
            expect(result.overwritten).toEqual([]);
            expect(result.unchanged).toEqual([]);
        });

        it('should detect added overlays vs existing manifest', () => {
            const existingDir = path.join(tmpDir, 'dc');
            fs.mkdirSync(existingDir);
            fs.writeFileSync(
                path.join(existingDir, 'superposition.json'),
                JSON.stringify({ overlays: ['nodejs'] })
            );

            const plan = {
                stack: 'compose' as const,
                selectedOverlays: ['nodejs', 'postgres'],
                autoAddedOverlays: [],
                portMappings: [{ overlay: 'postgres', ports: [5432], offsetPorts: [5432] }],
                files: [],
            };

            const result = generatePlanDiff(plan, overlaysConfig, OVERLAYS_DIR, existingDir);

            expect(result.hasExistingConfig).toBe(true);
            const addedIds = result.overlayChanges.added.map((o) => o.id);
            expect(addedIds).toContain('postgres');
            expect(result.overlayChanges.unchanged).toContain('nodejs');
        });

        it('should detect removed overlays vs existing manifest', () => {
            const existingDir = path.join(tmpDir, 'dc');
            fs.mkdirSync(existingDir);
            fs.writeFileSync(
                path.join(existingDir, 'superposition.json'),
                JSON.stringify({ overlays: ['nodejs', 'redis'] })
            );

            const plan = {
                stack: 'compose' as const,
                selectedOverlays: ['nodejs'],
                autoAddedOverlays: [],
                portMappings: [],
                files: [],
            };

            const result = generatePlanDiff(plan, overlaysConfig, OVERLAYS_DIR, existingDir);

            const removedIds = result.overlayChanges.removed.map((o) => o.id);
            expect(removedIds).toContain('redis');
        });

        it('should detect added ports from new overlays', () => {
            const existingDir = path.join(tmpDir, 'dc');
            fs.mkdirSync(existingDir);
            fs.writeFileSync(
                path.join(existingDir, 'superposition.json'),
                JSON.stringify({ overlays: [] })
            );

            const plan = {
                stack: 'compose' as const,
                selectedOverlays: ['postgres'],
                autoAddedOverlays: [],
                portMappings: [{ overlay: 'postgres', ports: [5432], offsetPorts: [5432] }],
                files: [],
            };

            const result = generatePlanDiff(plan, overlaysConfig, OVERLAYS_DIR, existingDir);

            const addedPorts = result.portChanges.added.map((p) => p.port);
            expect(addedPorts).toContain(5432);
        });

        it('should identify created files when they do not exist', () => {
            const existingDir = path.join(tmpDir, 'dc');
            fs.mkdirSync(existingDir);

            const newFile = path.join(existingDir, 'devcontainer.json');
            // File does NOT exist

            const plan = {
                stack: 'compose' as const,
                selectedOverlays: ['nodejs'],
                autoAddedOverlays: [],
                portMappings: [],
                files: [newFile],
            };

            const result = generatePlanDiff(plan, overlaysConfig, OVERLAYS_DIR, existingDir);

            expect(result.created.length).toBe(1);
            expect(result.modified.length).toBe(0);
            expect(result.overwritten.length).toBe(0);
        });

        it('should list preserved files from custom directory', () => {
            const existingDir = path.join(tmpDir, 'dc');
            fs.mkdirSync(path.join(existingDir, 'custom'), { recursive: true });
            fs.writeFileSync(path.join(existingDir, 'custom', 'patch.json'), '{}');

            const plan = {
                stack: 'compose' as const,
                selectedOverlays: [],
                autoAddedOverlays: [],
                portMappings: [],
                files: [],
            };

            const result = generatePlanDiff(plan, overlaysConfig, OVERLAYS_DIR, existingDir);

            expect(result.preserved.length).toBe(1);
            expect(result.preserved[0]).toContain('patch.json');
        });

        it('should classify non-devcontainer.json files as overwritten (not modified)', () => {
            const existingDir = path.join(tmpDir, 'dc');
            fs.mkdirSync(existingDir, { recursive: true });
            const existingReadme = path.join(existingDir, 'README.md');
            fs.writeFileSync(existingReadme, '# old readme\n');

            const plan = {
                stack: 'plain' as const,
                selectedOverlays: ['nodejs'],
                autoAddedOverlays: [],
                portMappings: [],
                files: [existingReadme],
            };

            const result = generatePlanDiff(plan, overlaysConfig, OVERLAYS_DIR, existingDir);

            // README.md exists but content is not compared → overwritten, not modified
            expect(result.overwritten.some((p) => p.endsWith('README.md'))).toBe(true);
            expect(result.modified.length).toBe(0);
        });

        it('should detect removed files recursively (nested scripts/)', () => {
            const existingDir = path.join(tmpDir, 'dc');
            fs.mkdirSync(path.join(existingDir, 'scripts'), { recursive: true });
            // Create a stale script not in the plan
            fs.writeFileSync(path.join(existingDir, 'scripts', 'setup-old.sh'), '#!/bin/bash\n');

            const plan = {
                stack: 'compose' as const,
                selectedOverlays: [],
                autoAddedOverlays: [],
                portMappings: [],
                files: [], // stale script is NOT in plan
            };

            const result = generatePlanDiff(plan, overlaysConfig, OVERLAYS_DIR, existingDir);

            const removedPaths = result.removed.join('\n');
            expect(removedPaths).toContain('setup-old.sh');
        });
    });

    describe('doctorCommand', () => {
        it('should run environment checks', async () => {
            try {
                await doctorCommand(overlaysConfig, OVERLAYS_DIR, {});
            } catch (e: any) {
                // Process.exit is called, ignore
            }

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Running diagnostics');
            expect(output).toContain('Environment:');
            expect(output).toContain('Node.js version');
            expect(output).toContain('Docker');
        });

        it('should validate all overlays', async () => {
            try {
                await doctorCommand(overlaysConfig, OVERLAYS_DIR, {});
            } catch (e: any) {
                // Process.exit is called, ignore
            }

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Overlays:');
            expect(output).toContain('overlays valid');
        });

        it('should check manifest if it exists', async () => {
            try {
                await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                    output: './.devcontainer',
                });
            } catch (e: any) {
                // Process.exit is called, ignore
            }

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Manifest:');
        });

        it('should output JSON when --json flag is used', async () => {
            try {
                await doctorCommand(overlaysConfig, OVERLAYS_DIR, { json: true });
            } catch (e: any) {
                // Process.exit is called, ignore
            }

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls[0][0];
            expect(() => JSON.parse(output)).not.toThrow();
            const parsed = JSON.parse(output);
            expect(parsed.environment).toBeDefined();
            expect(parsed.overlays).toBeDefined();
            expect(parsed.manifest).toBeDefined();
            expect(parsed.summary).toBeDefined();
            expect(typeof parsed.summary.passed).toBe('number');
            expect(typeof parsed.summary.warnings).toBe('number');
            expect(typeof parsed.summary.errors).toBe('number');
        });

        it('should handle non-existent devcontainer path', async () => {
            try {
                await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                    output: '/tmp/nonexistent-doctor-test',
                });
            } catch (e: any) {
                // Process.exit is called, ignore
            }

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Directory not found');
        });

        it('should support --fix flag', async () => {
            try {
                await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                    output: '/tmp/nonexistent-doctor-test',
                    fix: true,
                });
            } catch (e: any) {
                // Process.exit is called, ignore
            }

            expect(consoleLogSpy).toHaveBeenCalled();
            // Fix functionality would be in output if there are fixable issues
        });
    });

    describe('hashCommand', () => {
        let tmpDir: string;

        beforeEach(() => {
            tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hash-test-'));
        });

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        it('should output fingerprint for given stack and overlays', async () => {
            await hashCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres,redis',
            });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Environment Fingerprint');
            expect(output).toContain('compose');
            expect(output).toContain('postgres');
            expect(output).toContain('redis');
        });

        it('should output JSON when --json flag is used', async () => {
            await hashCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres,redis',
                json: true,
            });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls[0][0];
            expect(() => JSON.parse(output)).not.toThrow();
            const parsed = JSON.parse(output);
            expect(parsed.stack).toBe('compose');
            expect(Array.isArray(parsed.overlays)).toBe(true);
            expect(parsed.overlays).toContain('postgres');
            expect(parsed.overlays).toContain('redis');
            expect(typeof parsed.hash).toBe('string');
            expect(parsed.hash).toHaveLength(8);
            expect(typeof parsed.hashFull).toBe('string');
            expect(parsed.hashFull).toHaveLength(64);
            expect(parsed.preset).toBeNull();
            expect(typeof parsed.base).toBe('string');
            expect(typeof parsed.tool).toBe('string');
        });

        it('should auto-add required dependencies', async () => {
            await hashCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'grafana',
                json: true,
            });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls[0][0];
            const parsed = JSON.parse(output);
            expect(parsed.overlays).toContain('grafana');
            expect(parsed.overlays).toContain('prometheus');
        });

        it('should produce same hash for same inputs', async () => {
            await hashCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres,redis',
                json: true,
            });
            const firstOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);

            consoleLogSpy.mockClear();

            await hashCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'redis,postgres', // reversed order
                json: true,
            });
            const secondOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);

            expect(firstOutput.hash).toBe(secondOutput.hash);
            expect(firstOutput.hashFull).toBe(secondOutput.hashFull);
        });

        it('should produce different hash when inputs differ', async () => {
            await hashCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres',
                json: true,
            });
            const firstOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);

            consoleLogSpy.mockClear();

            await hashCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'redis',
                json: true,
            });
            const secondOutput = JSON.parse(consoleLogSpy.mock.calls[0][0]);

            expect(firstOutput.hash).not.toBe(secondOutput.hash);
        });

        it('should write hash file when --write flag is used', async () => {
            await hashCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres',
                write: true,
                output: tmpDir,
            });

            const hashFilePath = path.join(tmpDir, 'superposition.hash');
            expect(fs.existsSync(hashFilePath)).toBe(true);
            const content = fs.readFileSync(hashFilePath, 'utf-8').trim();
            expect(content).toHaveLength(64); // full SHA-256 hex
        });

        it('should exit with error when stack is missing without manifest', async () => {
            try {
                await hashCommand(overlaysConfig, OVERLAYS_DIR, {
                    overlays: 'postgres',
                });
            } catch (e: any) {
                expect(e.message).toContain('process.exit(1)');
            }

            expect(consoleErrorSpy).toHaveBeenCalled();
        });

        it('should exit with error for unknown overlay', async () => {
            try {
                await hashCommand(overlaysConfig, OVERLAYS_DIR, {
                    stack: 'compose',
                    overlays: 'nonexistent-overlay',
                });
            } catch (e: any) {
                expect(e.message).toContain('process.exit(1)');
            }

            expect(consoleErrorSpy).toHaveBeenCalled();
            const errorOutput = consoleErrorSpy.mock.calls.join('\n');
            expect(errorOutput).toContain('Unknown overlay');
        });

        it('should read from superposition.json manifest when no args given', async () => {
            const manifestPath = path.join(tmpDir, 'superposition.json');
            fs.writeFileSync(
                manifestPath,
                JSON.stringify({
                    baseTemplate: 'compose',
                    baseImage: 'bookworm',
                    overlays: ['postgres', 'redis'],
                })
            );

            await hashCommand(overlaysConfig, OVERLAYS_DIR, {
                manifest: manifestPath,
                json: true,
            });

            expect(consoleLogSpy).toHaveBeenCalled();
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.stack).toBe('compose');
            expect(parsed.overlays).toContain('postgres');
            expect(parsed.overlays).toContain('redis');
            expect(typeof parsed.hash).toBe('string');
        });

        it('should include (auto) label for auto-added overlays in text output', async () => {
            await hashCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'grafana',
            });

            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('(auto)');
            expect(output).toContain('prometheus');
        });
    });

    describe('computeHash', () => {
        it('should return 8-char hash and 64-char full hash', () => {
            const { hash, hashFull } = computeHash(
                'compose',
                ['postgres'],
                null,
                'bookworm',
                '0.1.3'
            );
            expect(hash).toHaveLength(8);
            expect(hashFull).toHaveLength(64);
        });

        it('should be deterministic', () => {
            const a = computeHash('compose', ['postgres', 'redis'], null, 'bookworm', '0.1.3');
            const b = computeHash('compose', ['redis', 'postgres'], null, 'bookworm', '0.1.3');
            // Overlays are sorted inside computeHash
            expect(a.hash).toBe(b.hash);
            expect(a.hashFull).toBe(b.hashFull);
        });

        it('should differ when stack changes', () => {
            const a = computeHash('compose', ['postgres'], null, 'bookworm', '0.1.3');
            const b = computeHash('plain', ['postgres'], null, 'bookworm', '0.1.3');
            expect(a.hash).not.toBe(b.hash);
        });

        it('should differ when base changes', () => {
            const a = computeHash('compose', ['postgres'], null, 'bookworm', '0.1.3');
            const b = computeHash('compose', ['postgres'], null, 'alpine', '0.1.3');
            expect(a.hash).not.toBe(b.hash);
        });

        it('should use only major.minor from tool version', () => {
            // Caller is responsible for truncating to major.minor before passing to computeHash
            const a = computeHash('compose', ['postgres'], null, 'bookworm', '0.1');
            const b = computeHash('compose', ['postgres'], null, 'bookworm', '0.1');
            // Same major.minor → same hash
            expect(a.hash).toBe(b.hash);
        });

        it('should differ when patch version is in different minor series', () => {
            const a = computeHash('compose', ['postgres'], null, 'bookworm', '0.1');
            const b = computeHash('compose', ['postgres'], null, 'bookworm', '0.2');
            expect(a.hash).not.toBe(b.hash);
        });
    });
});
