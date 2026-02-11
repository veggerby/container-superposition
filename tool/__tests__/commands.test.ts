import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import { listCommand } from '../commands/list.js';
import { explainCommand } from '../commands/explain.js';
import { planCommand } from '../commands/plan.js';

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
});
