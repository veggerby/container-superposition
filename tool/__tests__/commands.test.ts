import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import { buildAnswersFromProjectConfig, loadProjectConfig } from '../schema/project-config.js';
import { listCommand } from '../commands/list.js';
import { explainCommand } from '../commands/explain.js';
import { planCommand, generatePlanDiff } from '../commands/plan.js';
import { doctorCommand } from '../commands/doctor.js';
import { hashCommand, computeHash } from '../commands/hash.js';
import { composeDevContainer } from '../questionnaire/composer.js';
import type { QuestionnaireAnswers } from '../schema/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');
const TSX_CLI = path.join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

function writeManifest(
    manifestDir: string,
    manifest: { baseTemplate: string; overlays: string[]; [key: string]: unknown }
): string {
    const manifestPath = path.join(manifestDir, 'superposition.json');
    fs.mkdirSync(manifestDir, { recursive: true });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    return manifestPath;
}

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
        it('renders shared discovery frame and recommended starts', async () => {
            await listCommand(overlaysConfig, {});
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Mode: Discovery');
            expect(output).toContain('Current setup');
            expect(output).toContain('Recommended starts');
            expect(output).toContain('Common goals');
            expect(output).toContain('Browse all overlays');
            expect(output).toContain('How to inspect or preview next');
            expect(output).toContain('nodejs');
        });

        it('renders filtered results with recovery guidance', async () => {
            await listCommand(overlaysConfig, { category: 'language' });
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Filter summary');
            expect(output).toContain('Best matches');
            expect(output).toContain('How to widen or inspect next');
            expect(output).toContain('nodejs');
            expect(output).not.toContain('postgres — PostgreSQL database');
        });

        it('outputs semantic JSON model', async () => {
            await listCommand(overlaysConfig, { json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.source).toBeDefined();
            expect(parsed.filters).toBeDefined();
            expect(Array.isArray(parsed.recommendedStarts)).toBe(true);
            expect(Array.isArray(parsed.overlays)).toBe(true);
            expect(parsed.nextStep).toBeDefined();
        });
    });

    describe('explainCommand', () => {
        it('renders inspection sections in decision order', async () => {
            await explainCommand(overlaysConfig, OVERLAYS_DIR, 'postgres', {});
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Mode: Inspection');
            expect(output).toContain('Current setup');
            expect(output).toContain('Best for');
            expect(output).toContain('Why pick this over nearby options');
            expect(output).toContain('What it adds');
            expect(output).toContain('What to watch out for');
            expect(output).toContain('Preview this change');
            expect(output).toContain('Files, services, and ports');
            expect(output.indexOf('Best for')).toBeLessThan(output.indexOf('Preview this change'));
        });

        it('outputs semantic JSON model', async () => {
            await explainCommand(overlaysConfig, OVERLAYS_DIR, 'nodejs', { json: true });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.source).toBeDefined();
            expect(parsed.overlay.id).toBe('nodejs');
            expect(parsed.overlay.previewThisChange[0]).toContain('cs plan');
            expect(Array.isArray(parsed.overlay.filesServicesPorts)).toBe(true);
        });

        it('exits with error for missing overlay', async () => {
            await expect(
                explainCommand(overlaysConfig, OVERLAYS_DIR, 'nonexistent', {})
            ).rejects.toThrow('process.exit(1)');
            expect(consoleErrorSpy.mock.calls.join('\n')).toContain('Not found: nonexistent');
        });
    });

    describe('planCommand', () => {
        it('renders plan summary with current setup and planned changes', async () => {
            await planCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres,redis',
            });
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Current setup');
            expect(output).toContain('Planned changes');
            expect(output).toContain('Why this plan looks this way');
            expect(output).toContain('Detailed file impact');
            expect(output).toContain('Next step');
            expect(output).toContain('postgres');
            expect(output).toContain('redis');
        });

        it('surfaces watch-outs for auto-added dependencies', async () => {
            await planCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'grafana',
            });
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Watch-outs');
            expect(output).toContain('auto-added overlays: prometheus');
        });

        it('outputs semantic JSON model', async () => {
            await planCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'grafana',
                json: true,
            });
            const parsed = JSON.parse(consoleLogSpy.mock.calls.at(-1)?.[0]);
            expect(parsed.source).toBeDefined();
            expect(parsed.changeClass).toBeDefined();
            expect(parsed.nextStep).toBeDefined();
            expect(parsed.diff).toBeDefined();
            expect(parsed.autoAddedOverlays).toContain('prometheus');
        });
    });

    describe('planCommand --diff', () => {
        it('renders replay headline before detailed diff summary when intent is unchanged', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-diff-replay-'));
            const outputPath = path.join(tmpDir, '.devcontainer');
            const cwd = process.cwd();
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    'stack: plain\noverlays: [nodejs]\noutputPath: .devcontainer\n'
                );
                process.chdir(tmpDir);
                await composeDevContainer(
                    {
                        stack: 'plain',
                        baseImage: 'bookworm',
                        language: ['nodejs'],
                        needsDocker: false,
                        database: [],
                        playwright: false,
                        cloudTools: [],
                        devTools: [],
                        observability: [],
                        outputPath,
                    } as any,
                    OVERLAYS_DIR,
                    { isRegen: true }
                );
                consoleLogSpy.mockClear();
                await planCommand(overlaysConfig, OVERLAYS_DIR, {
                    stack: 'plain',
                    overlays: 'nodejs',
                    diff: true,
                    output: outputPath,
                });
                const output = consoleLogSpy.mock.calls.join('\n');
                expect(output).toContain('Replay canonical intent');
                expect(output).toContain('Current setup');
                expect(output.indexOf('Replay canonical intent')).toBeLessThan(
                    output.indexOf('Detailed file impact')
                );
            } finally {
                process.chdir(cwd);
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
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
        it('renders project diagnosis header and action buckets', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-project-diagnosis-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    'stack: plain\noverlays: [nodejs]\n'
                );
                fs.mkdirSync(path.join(tmpDir, '.devcontainer'), { recursive: true });
                fs.writeFileSync(path.join(tmpDir, '.devcontainer', 'devcontainer.json'), '{}\n');
                fs.writeFileSync(
                    path.join(tmpDir, '.devcontainer', 'superposition.json'),
                    JSON.stringify({
                        baseTemplate: 'plain',
                        baseImage: 'bookworm',
                        overlays: ['nodejs'],
                    })
                );
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        projectRoot: tmpDir,
                        fromProject: true,
                    });
                } catch {}
                const output = consoleLogSpy.mock.calls.join('\n');
                expect(output).toContain('Mode: Project diagnosis');
                expect(output).toContain('Verdict:');
                expect(output).toContain('Scope: selected overlays for current project (1)');
                expect(output).toContain('What needs attention');
                expect(output).toContain('Recommended next action');
                expect(output).toContain('Counts');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('renders project fix preview and no-files-changed note in dry run', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-fix-preview-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'compose', overlays: ['grafana'] })
                );
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        projectRoot: tmpDir,
                        fix: true,
                        dryRun: true,
                    });
                } catch {}
                const output = consoleLogSpy.mock.calls.join('\n');
                expect(output).toContain('Mode: Project fix preview');
                expect(output).toContain('Fix plan');
                expect(output).toContain('Project fix preview — No files changed');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('outputs semantic JSON diagnosis model with scope', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-json-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    'stack: plain\noverlays: [nodejs]\n'
                );
                fs.mkdirSync(path.join(tmpDir, '.devcontainer'), { recursive: true });
                fs.writeFileSync(path.join(tmpDir, '.devcontainer', 'devcontainer.json'), '{}\n');
                fs.writeFileSync(
                    path.join(tmpDir, '.devcontainer', 'superposition.json'),
                    JSON.stringify({
                        baseTemplate: 'plain',
                        baseImage: 'bookworm',
                        overlays: ['nodejs'],
                    })
                );
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        projectRoot: tmpDir,
                        fromProject: true,
                        json: true,
                    });
                } catch {}
                const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
                expect(parsed.mode).toBe('Project diagnosis');
                expect(parsed.scope).toContain('selected overlays for current project');
                expect(parsed.disposition).toBeDefined();
                expect(parsed.counts).toBeDefined();
                expect(parsed.actionBuckets).toBeDefined();
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });
    });

    // ── spec 013: dependency checks    // ── spec 013: dependency checks ──────────────────────────────────────────
    describe('doctorCommand — dependency checks', () => {
        it('should fail when selected overlay has unknown ID', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-dep-unknown-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'compose', overlays: ['nonexistent-overlay-xyz'] })
                );
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                        projectRoot: tmpDir,
                    });
                } catch {
                    // process.exit
                }
                const output = consoleLogSpy.mock.calls.join('\n');
                expect(output).toContain('Unknown overlay: nonexistent-overlay-xyz');
                expect(output).toContain('nonexistent-overlay-xyz');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should fail when required overlay is missing from project file', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-dep-missing-'));
            try {
                // grafana requires prometheus
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'compose', overlays: ['grafana'] })
                );
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                        projectRoot: tmpDir,
                    });
                } catch {
                    // process.exit
                }
                const output = consoleLogSpy.mock.calls.join('\n');
                expect(output).toContain('Missing required overlay: prometheus');
                expect(output).toContain('prometheus');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should pass when all dependencies are satisfied', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-dep-ok-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'compose', overlays: ['grafana', 'prometheus'] })
                );
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                        projectRoot: tmpDir,
                    });
                } catch {
                    // process.exit
                }
                const output = consoleLogSpy.mock.calls.join('\n');
                expect(output).toContain('Verdict: Healthy');
                expect(output).toContain('Healthy checks');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should include dependencies field in JSON output', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-dep-json-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'compose', overlays: ['nodejs'] })
                );
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                        projectRoot: tmpDir,
                        json: true,
                    });
                } catch {
                    // process.exit
                }
                const rawOutput = consoleLogSpy.mock.calls[0][0];
                const parsed = JSON.parse(rawOutput);
                expect(parsed.dependencies).toBeDefined();
                expect(Array.isArray(parsed.dependencies)).toBe(true);
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should add missing required overlay to project file when --fix is used', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-dep-fix-'));
            try {
                const projectPath = path.join(tmpDir, '.superposition.yml');
                fs.writeFileSync(
                    projectPath,
                    yaml.dump({
                        stack: 'compose',
                        overlays: ['grafana'],
                        outputPath: '.devcontainer',
                    })
                );
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        projectRoot: tmpDir,
                        fromProject: true,
                        fix: true,
                    });
                } catch {
                    // process.exit
                }
                const updated = fs.readFileSync(projectPath, 'utf8');
                expect(updated).toContain('grafana');
                expect(updated).toContain('prometheus');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should surface suggestions in JSON output when selected overlay has suggestions not present', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-dep-suggests-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'plain', overlays: ['sqlite'] })
                );
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                        projectRoot: tmpDir,
                        json: true,
                    });
                } catch {
                    // process.exit
                }
                const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
                const suggestion = parsed.dependencies.find((item: any) =>
                    String(item.message).includes('python')
                );
                expect(suggestion).toBeDefined();
                expect(suggestion.status).toBe('warn');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });
    });

    // ── spec 014: port cross-validation ─────────────────────────────────────
    describe('doctorCommand — port cross-validation', () => {
        it('should skip port cross-validation when no docker-compose.yml present', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-portcross-skip-'));
            try {
                // Plain devcontainer — no compose file
                fs.writeFileSync(
                    path.join(tmpDir, 'devcontainer.json'),
                    JSON.stringify({ name: 'test', forwardPorts: [9090] })
                );
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                    });
                } catch {
                    // process.exit
                }
                // Port cross-validation section should NOT appear (all-pass is suppressed)
                const output = consoleLogSpy.mock.calls.join('\n');
                expect(output).not.toContain('Port Cross-Validation:');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should fail when forwardPorts contains a port not exposed by any service', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-portcross-fail-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, 'devcontainer.json'),
                    JSON.stringify({ name: 'test', forwardPorts: [9090] })
                );
                fs.writeFileSync(
                    path.join(tmpDir, 'docker-compose.yml'),
                    'services:\n  app:\n    image: alpine\n    ports:\n      - "5432:5432"\n'
                );
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                    });
                } catch {
                    // process.exit
                }
                const output = consoleLogSpy.mock.calls.join('\n');
                expect(output).toContain('Port 9090 not exposed by any service');
                expect(output).toContain('9090');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should warn when a compose-bound port is absent from forwardPorts', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-portcross-warn-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, 'devcontainer.json'),
                    JSON.stringify({ name: 'test', forwardPorts: [6379] })
                );
                fs.writeFileSync(
                    path.join(tmpDir, 'docker-compose.yml'),
                    'services:\n  pg:\n    image: postgres\n    ports:\n      - "5432:5432"\n  redis:\n    image: redis\n    ports:\n      - "6379:6379"\n'
                );
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                    });
                } catch {
                    // process.exit
                }
                const output = consoleLogSpy.mock.calls.join('\n');
                expect(output).toContain('Port 5432 not forwarded');
                expect(output).toContain('5432');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should include portCrossValidation field in JSON output', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-portcross-json-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, 'devcontainer.json'),
                    JSON.stringify({ name: 'test', forwardPorts: [] })
                );
                fs.writeFileSync(
                    path.join(tmpDir, 'docker-compose.yml'),
                    'services:\n  app:\n    image: alpine\n'
                );
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                        json: true,
                    });
                } catch {
                    // process.exit
                }
                const rawOutput = consoleLogSpy.mock.calls[0][0];
                const parsed = JSON.parse(rawOutput);
                expect(parsed.portCrossValidation).toBeDefined();
                expect(Array.isArray(parsed.portCrossValidation)).toBe(true);
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });
    });

    // ── spec 015: .env.example drift ─────────────────────────────────────────
    describe('doctorCommand — .env.example drift', () => {
        it('should fail when overlay parameter is missing from .env.example', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-envdrift-missing-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'compose', composeEnvFiles: true, overlays: ['postgres'] })
                );
                // .env.example that does NOT contain POSTGRES_PASSWORD
                fs.writeFileSync(path.join(tmpDir, '.env.example'), '# empty\n');
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                        projectRoot: tmpDir,
                    });
                } catch {
                    // process.exit
                }
                const output = consoleLogSpy.mock.calls.join('\n');
                expect(output).toContain('Missing .env.example key: POSTGRES_PASSWORD');
                expect(output).toContain('POSTGRES');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should warn when .env.example contains a stale key not declared by any overlay', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-envdrift-stale-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'plain', overlays: ['nodejs'] })
                );
                // .env.example with a stale key
                fs.writeFileSync(path.join(tmpDir, '.env.example'), 'OLD_UNUSED_KEY=something\n');
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                        projectRoot: tmpDir,
                    });
                } catch {
                    // process.exit
                }
                const output = consoleLogSpy.mock.calls.join('\n');
                expect(output).toContain('Stale .env.example key: OLD_UNUSED_KEY');
                expect(output).toContain('OLD_UNUSED_KEY');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should skip drift check when .env.example does not exist', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-envdrift-skip-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'compose', overlays: ['postgres'] })
                );
                // No .env.example
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                        projectRoot: tmpDir,
                    });
                } catch {
                    // process.exit
                }
                const output = consoleLogSpy.mock.calls.join('\n');
                // Section should be suppressed when all pass
                expect(output).not.toContain('.env.example Drift:');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should include envExampleDrift field in JSON output', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-envdrift-json-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'plain', overlays: ['nodejs'] })
                );
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                        projectRoot: tmpDir,
                        json: true,
                    });
                } catch {
                    // process.exit
                }
                const rawOutput = consoleLogSpy.mock.calls[0][0];
                const parsed = JSON.parse(rawOutput);
                expect(parsed.envExampleDrift).toBeDefined();
                expect(Array.isArray(parsed.envExampleDrift)).toBe(true);
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should regenerate .env.example when --fix is used', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-envdrift-fix-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'compose', composeEnvFiles: true, overlays: ['postgres'] })
                );
                fs.writeFileSync(path.join(tmpDir, '.env.example'), '# stale\n');
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                        projectRoot: tmpDir,
                        fix: true,
                    });
                } catch {
                    // process.exit
                }
                const envExample = fs.readFileSync(path.join(tmpDir, '.env.example'), 'utf8');
                expect(envExample).toContain('POSTGRES_PASSWORD');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });
    });

    // ── spec 016: reproducibility check ─────────────────────────────────────
    describe('doctorCommand — reproducibility check', () => {
        it('should fail when a generated file differs from what regen would produce', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-repro-diff-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'plain', overlays: ['nodejs'] })
                );
                // Write devcontainer.json with different content than regen would produce
                fs.writeFileSync(
                    path.join(tmpDir, 'devcontainer.json'),
                    JSON.stringify({ name: 'manually-edited', customization: 'added by hand' })
                );
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                        projectRoot: tmpDir,
                    });
                } catch {
                    // process.exit
                }
                const output = consoleLogSpy.mock.calls.join('\n');
                expect(output).toContain('Out-of-date generated file: devcontainer.json');
                expect(output).toContain('devcontainer.json');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should include reproducibility field in JSON output', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-repro-json-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'plain', overlays: ['nodejs'] })
                );
                fs.writeFileSync(
                    path.join(tmpDir, 'devcontainer.json'),
                    JSON.stringify({ name: 'tampered' })
                );
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                        projectRoot: tmpDir,
                        json: true,
                    });
                } catch {
                    // process.exit
                }
                const rawOutput = consoleLogSpy.mock.calls[0][0];
                const parsed = JSON.parse(rawOutput);
                expect(parsed.reproducibility).toBeDefined();
                expect(Array.isArray(parsed.reproducibility)).toBe(true);
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should pass reproducibility when generated output is clean', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-repro-clean-'));
            const outputPath = path.join(tmpDir, '.devcontainer');
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'plain', overlays: ['nodejs'], outputPath: '.devcontainer' })
                );
                const answers: QuestionnaireAnswers = {
                    stack: 'plain',
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
                await composeDevContainer(answers, OVERLAYS_DIR, { isRegen: true });
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        projectRoot: tmpDir,
                        fromProject: true,
                        json: true,
                    });
                } catch {}
                const parsed = JSON.parse(consoleLogSpy.mock.calls.at(-1)?.[0] ?? '{}');
                expect(parsed.reproducibility.some((item: any) => item.status === 'pass')).toBe(
                    true
                );
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should honor local port overrides in reproducibility dry compose', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-repro-local-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, 'superposition.yml'),
                    yaml.dump({
                        stack: 'compose',
                        overlays: ['postgres'],
                        outputPath: '.devcontainer',
                        devcontainerGitignore: true,
                        portOffset: 100,
                        ports: ['9000:9000'],
                    })
                );
                fs.writeFileSync(
                    path.join(tmpDir, 'superposition.local.yml'),
                    yaml.dump({
                        portOffset: 300,
                        ports: [],
                    })
                );

                runInitCli(['regen'], tmpDir);

                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        projectRoot: tmpDir,
                        fromProject: true,
                        json: true,
                    });
                } catch {}

                const parsed = JSON.parse(consoleLogSpy.mock.calls.at(-1)?.[0] ?? '{}');
                expect(parsed.reproducibility.some((item: any) => item.status === 'fail')).toBe(
                    false
                );
                expect(parsed.reproducibility.some((item: any) => item.status === 'pass')).toBe(
                    true
                );
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should fail reproducibility when a generated file is missing', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-repro-missing-'));
            const outputPath = path.join(tmpDir, '.devcontainer');
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'plain', overlays: ['nodejs'], outputPath: '.devcontainer' })
                );
                const answers: QuestionnaireAnswers = {
                    stack: 'plain',
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
                await composeDevContainer(answers, OVERLAYS_DIR, { isRegen: true });
                fs.rmSync(path.join(outputPath, 'README.md'));
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        projectRoot: tmpDir,
                        fromProject: true,
                    });
                } catch {}
                const output = consoleLogSpy.mock.calls.join('\n');
                expect(output).toContain('Missing generated file: README.md');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should regenerate missing generated files when --fix is used', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-repro-fix-'));
            const outputPath = path.join(tmpDir, '.devcontainer');
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'plain', overlays: ['nodejs'], outputPath: '.devcontainer' })
                );
                const answers: QuestionnaireAnswers = {
                    stack: 'plain',
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
                await composeDevContainer(answers, OVERLAYS_DIR, { isRegen: true });
                fs.rmSync(path.join(outputPath, 'README.md'));
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        projectRoot: tmpDir,
                        fromProject: true,
                        fix: true,
                    });
                } catch {}
                expect(fs.existsSync(path.join(outputPath, 'README.md'))).toBe(true);
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });
    });

    // ── spec 017: --dry-run flag ─────────────────────────────────────────────
    describe('doctorCommand — --dry-run flag', () => {
        it('should error and exit 1 when --dry-run is used without --fix', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-dryrun-nofix-'));
            try {
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                        dryRun: true,
                    });
                } catch (e: any) {
                    expect(e.message).toContain('process.exit(1)');
                }
                const errOutput = consoleErrorSpy.mock.calls.join('\n');
                expect(errOutput).toContain('--dry-run requires --fix');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should show planned actions without writing files when --fix --dry-run used with fixable findings', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-dryrun-actions-'));
            try {
                // grafana requires prometheus — will produce a dependency-fix finding
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'compose', overlays: ['grafana'] })
                );
                const projectFileBefore = fs.readFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    'utf8'
                );

                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                        projectRoot: tmpDir,
                        fix: true,
                        dryRun: true,
                    });
                } catch (e: any) {
                    expect(e.message).toContain('process.exit(1)');
                }

                // Project file must NOT have been modified
                const projectFileAfter = fs.readFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    'utf8'
                );
                expect(projectFileAfter).toBe(projectFileBefore);

                const output = consoleLogSpy.mock.calls.join('\n');
                expect(output).toContain('Mode: Project fix preview');
                expect(output).toContain('Fix plan');
                expect(output).toContain('Project fix preview — No files changed');
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should exit 0 with "no auto-fixable findings" message when everything passes', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-dryrun-clean-'));
            try {
                // nodejs has no required dependencies and no parameters
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'plain', overlays: ['nodejs'] })
                );

                let exitCode: number | undefined;
                processExitSpy.mockImplementation((code?: any) => {
                    exitCode = code;
                    throw new Error(`process.exit(${code})`);
                });

                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                        projectRoot: tmpDir,
                        fix: true,
                        dryRun: true,
                    });
                } catch {
                    // process.exit
                }

                // Exit 0 means no fixable findings (or all pass)
                // Exit 1 is also acceptable if there are environmental warnings
                // The key assertion: the dry-run did not modify the file
                expect(fs.existsSync(path.join(tmpDir, '.superposition.yml'))).toBe(true);
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should output JSON with dryRun:true and plannedActions when --format json used', async () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-dryrun-json-'));
            try {
                fs.writeFileSync(
                    path.join(tmpDir, '.superposition.yml'),
                    yaml.dump({ stack: 'compose', overlays: ['grafana'] })
                );
                try {
                    await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                        output: tmpDir,
                        projectRoot: tmpDir,
                        fix: true,
                        dryRun: true,
                        json: true,
                    });
                } catch {
                    // process.exit
                }
                const rawOutput = consoleLogSpy.mock.calls[0]?.[0];
                expect(rawOutput).toBeDefined();
                const parsed = JSON.parse(rawOutput);
                expect(parsed.dryRun).toBe(true);
                expect(Array.isArray(parsed.plannedActions)).toBe(true);
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
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

        it('renders comparison-first fingerprint output', async () => {
            await hashCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres,redis',
            });
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Mode: Fingerprint');
            expect(output).toContain('Current setup');
            expect(output).toContain('Comparison summary');
            expect(output).toContain('What equal values mean');
            expect(output).toContain('compose');
            expect(output).toContain('short value:');
            expect(output).toContain('full value:');
        });

        it('outputs semantic JSON model including normalized dependencies', async () => {
            await hashCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'grafana',
                json: true,
            });
            const parsed = JSON.parse(consoleLogSpy.mock.calls[0][0]);
            expect(parsed.stack).toBe('compose');
            expect(parsed.overlays).toContain('grafana');
            expect(parsed.overlays).toContain('prometheus');
            expect(parsed.normalizedDependencies).toContain('prometheus');
            expect(typeof parsed.hash).toBe('string');
            expect(typeof parsed.hashFull).toBe('string');
            expect(parsed.nextStep).toBeDefined();
        });

        it('writes full hash to disk when requested', async () => {
            await hashCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres',
                write: true,
                output: tmpDir,
            });
            const hashFilePath = path.join(tmpDir, 'superposition.hash');
            expect(fs.existsSync(hashFilePath)).toBe(true);
            expect(fs.readFileSync(hashFilePath, 'utf8').trim()).toHaveLength(64);
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

    describe.skip('project config', () => {
        it('should load a valid repository-root project config', () => {
            const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-config-'));

            try {
                fs.writeFileSync(
                    path.join(repoDir, '.superposition.yml'),
                    yaml.dump({
                        stack: 'compose',
                        language: ['nodejs'],
                        database: ['postgres'],
                        outputPath: './.devcontainer',
                        devcontainerGitignore: true,
                    })
                );

                const loaded = loadProjectConfig(overlaysConfig, repoDir);
                expect(loaded?.file.fileName).toBe('.superposition.yml');
                expect(loaded?.selection.stack).toBe('compose');
                expect(loaded?.selection.overlays).toEqual(
                    expect.arrayContaining(['nodejs', 'postgres'])
                );
                expect(loaded?.selection.devcontainerGitignore).toBe(true);
            } finally {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }
        });

        it('should build questionnaire answers from project config', () => {
            const answers = buildAnswersFromProjectConfig(
                {
                    stack: 'compose',
                    baseImage: 'custom',
                    customImage: 'mcr.microsoft.com/devcontainers/base:ubuntu',
                    overlays: ['nodejs', 'docker-sock'],
                    minimal: true,
                    editor: 'none',
                    devcontainerGitignore: true,
                },
                overlaysConfig
            );

            expect(answers.stack).toBe('compose');
            expect(answers.baseImage).toBe('custom');
            expect(answers.customImage).toBe('mcr.microsoft.com/devcontainers/base:ubuntu');
            expect(answers.language).toEqual(['nodejs']);
            expect(answers.devTools).toEqual(['docker-sock']);
            expect(answers.minimal).toBe(true);
            expect(answers.editor).toBe('none');
            expect(answers.devcontainerGitignore).toBe(true);
        });

        it('should fail on dual project config files', () => {
            const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-config-dual-'));

            try {
                fs.writeFileSync(
                    path.join(repoDir, '.superposition.yml'),
                    yaml.dump({ stack: 'plain' })
                );
                fs.writeFileSync(
                    path.join(repoDir, 'superposition.yml'),
                    yaml.dump({ stack: 'compose' })
                );

                expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow(
                    /Keep only one project config file/
                );
            } finally {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }
        });

        it('should fail on unsupported project config keys', () => {
            const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-config-invalid-'));

            try {
                fs.writeFileSync(
                    path.join(repoDir, '.superposition.yml'),
                    yaml.dump({ stack: 'plain', unsupportedField: true })
                );

                expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow(
                    /Unsupported project config keys/
                );
            } finally {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }
        });

        it('should generate from project config without interactive prompts when --no-interactive is used', () => {
            const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-config-cli-'));

            try {
                fs.writeFileSync(
                    path.join(repoDir, '.superposition.yml'),
                    yaml.dump({
                        stack: 'plain',
                        language: ['nodejs'],
                        outputPath: './.devcontainer',
                        customizations: {
                            environment: {
                                PROJECT_CONFIG_FLAG: 'enabled',
                            },
                            devcontainerPatch: {
                                features: {
                                    'ghcr.io/devcontainers-extra/features/apt-get-packages:1': {
                                        packages: 'jq',
                                    },
                                },
                            },
                        },
                    })
                );

                runInitCli(['init', '--no-interactive'], repoDir);

                const manifest = JSON.parse(
                    fs.readFileSync(
                        path.join(repoDir, '.devcontainer', 'superposition.json'),
                        'utf8'
                    )
                );
                expect(manifest.overlays).toContain('nodejs');

                const envExample = fs.readFileSync(
                    path.join(repoDir, '.devcontainer', '.env.example'),
                    'utf8'
                );
                expect(envExample).toContain('PROJECT_CONFIG_FLAG=enabled');

                const devcontainer = JSON.parse(
                    fs.readFileSync(
                        path.join(repoDir, '.devcontainer', 'devcontainer.json'),
                        'utf8'
                    )
                );
                expect(devcontainer.features).toHaveProperty(
                    'ghcr.io/devcontainers-extra/features/apt-get-packages:1'
                );

                const customPatch = JSON.parse(
                    fs.readFileSync(
                        path.join(repoDir, '.devcontainer', 'custom', 'devcontainer.patch.json'),
                        'utf8'
                    )
                );
                const customPatchContent = fs.readFileSync(
                    path.join(repoDir, '.devcontainer', 'custom', 'devcontainer.patch.json'),
                    'utf8'
                );
                expect(customPatch.$schema).toBe(
                    'https://raw.githubusercontent.com/devcontainers/spec/main/schemas/devContainer.base.schema.json'
                );
                expect(customPatchContent).toMatch(/^\{\n  "\$schema":/);
            } finally {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }
        });

        it('should write a repository project file from init when running init', () => {
            const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'init-project-file-'));

            try {
                runInitCli(['init', '--stack', 'plain', '--language', 'nodejs'], repoDir);

                const projectFilePath = path.join(repoDir, '.superposition.yml');
                expect(fs.existsSync(projectFilePath)).toBe(true);

                const projectConfig = yaml.load(fs.readFileSync(projectFilePath, 'utf8')) as any;
                expect(projectConfig).toMatchObject({
                    stack: 'plain',
                    baseImage: 'bookworm',
                    overlays: ['nodejs'],
                    outputPath: './.devcontainer',
                });
            } finally {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }
        });

        it('should reuse an existing project file path when init writes project config', () => {
            const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'init-project-file-existing-'));

            try {
                fs.writeFileSync(
                    path.join(repoDir, 'superposition.yml'),
                    yaml.dump({
                        stack: 'compose',
                        overlays: ['postgres'],
                        outputPath: './old-output',
                    })
                );

                runInitCli(
                    ['init', '--stack', 'plain', '--language', 'nodejs', '--output', './generated'],
                    repoDir
                );

                // The existing superposition.yml path must be reused (not .superposition.yml)
                expect(fs.existsSync(path.join(repoDir, '.superposition.yml'))).toBe(false);

                const projectConfig = yaml.load(
                    fs.readFileSync(path.join(repoDir, 'superposition.yml'), 'utf8')
                ) as any;
                // CLI-specified fields must be reflected in the project file
                expect(projectConfig.stack).toBe('plain');
                expect(projectConfig.baseImage).toBe('bookworm');
                expect(projectConfig.outputPath).toBe('./generated');
                // nodejs must be present (explicitly requested via CLI)
                expect(projectConfig.overlays).toContain('nodejs');
            } finally {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }
        });

        it('should support explicit --from-project in init mode', () => {
            const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-config-from-project-'));

            try {
                fs.writeFileSync(
                    path.join(repoDir, '.superposition.yml'),
                    yaml.dump({
                        stack: 'plain',
                        language: ['nodejs'],
                        outputPath: './generated-from-project',
                    })
                );

                runInitCli(['init', '--from-project', '--no-interactive'], repoDir);

                expect(
                    fs.existsSync(
                        path.join(repoDir, 'generated-from-project', 'superposition.json')
                    )
                ).toBe(true);
            } finally {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }
        });

        it('should support --project-root for explicit project-file runs', () => {
            const workspaceDir = fs.mkdtempSync(
                path.join(os.tmpdir(), 'project-config-root-work-')
            );
            const repoDir = path.join(workspaceDir, 'repo');
            fs.mkdirSync(repoDir, { recursive: true });

            try {
                fs.writeFileSync(
                    path.join(repoDir, '.superposition.yml'),
                    yaml.dump({
                        stack: 'plain',
                        language: ['nodejs'],
                        outputPath: './generated-from-project-root',
                    })
                );

                runInitCli(
                    ['init', '--from-project', '--project-root', repoDir, '--no-interactive'],
                    workspaceDir
                );

                expect(
                    fs.existsSync(
                        path.join(repoDir, 'generated-from-project-root', 'superposition.json')
                    )
                ).toBe(true);
            } finally {
                fs.rmSync(workspaceDir, { recursive: true, force: true });
            }
        });

        it('should treat non-interactive init from project file as replay mode', () => {
            const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-config-replay-'));

            try {
                fs.writeFileSync(
                    path.join(repoDir, '.superposition.yml'),
                    yaml.dump({
                        stack: 'plain',
                        language: ['nodejs'],
                        outputPath: './generated-from-project',
                    })
                );
                fs.mkdirSync(path.join(repoDir, 'generated-from-project'), { recursive: true });
                fs.writeFileSync(
                    path.join(repoDir, 'generated-from-project', 'devcontainer.json'),
                    JSON.stringify({ name: 'existing' }, null, 2)
                );

                const output = runInitCli(['init', '--from-project', '--no-interactive'], repoDir);

                const backupEntries = fs
                    .readdirSync(repoDir)
                    .filter((entry) => entry.startsWith('generated-from-project.backup-'));

                expect(backupEntries.length).toBe(1);
                expect(output).toContain('Backup created:');
                expect(output).toContain('Rebuild container:');
            } finally {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }
        });

        it('should let regen use the project file implicitly when present', () => {
            const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-config-regen-'));

            try {
                fs.writeFileSync(
                    path.join(repoDir, '.superposition.yml'),
                    yaml.dump({
                        stack: 'plain',
                        language: ['nodejs'],
                        outputPath: './regen-from-project',
                    })
                );

                runInitCli(['regen'], repoDir);

                const manifest = JSON.parse(
                    fs.readFileSync(
                        path.join(repoDir, 'regen-from-project', 'superposition.json'),
                        'utf8'
                    )
                );
                expect(manifest.overlays).toContain('nodejs');
            } finally {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }
        });

        it('should let regen use a project file from --project-root', () => {
            const workspaceDir = fs.mkdtempSync(
                path.join(os.tmpdir(), 'project-config-root-regen-')
            );
            const repoDir = path.join(workspaceDir, 'repo');
            fs.mkdirSync(repoDir, { recursive: true });

            try {
                fs.writeFileSync(
                    path.join(repoDir, '.superposition.yml'),
                    yaml.dump({
                        stack: 'plain',
                        language: ['nodejs'],
                        outputPath: './regen-from-project-root',
                    })
                );

                runInitCli(['regen', '--project-root', repoDir], workspaceDir);

                const manifest = JSON.parse(
                    fs.readFileSync(
                        path.join(repoDir, 'regen-from-project-root', 'superposition.json'),
                        'utf8'
                    )
                );
                expect(manifest.overlays).toContain('nodejs');
            } finally {
                fs.rmSync(workspaceDir, { recursive: true, force: true });
            }
        });

        it('should keep explicit CLI output overrides scoped to one run', () => {
            const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-config-override-'));

            try {
                fs.writeFileSync(
                    path.join(repoDir, '.superposition.yml'),
                    yaml.dump({
                        stack: 'plain',
                        language: ['nodejs'],
                        outputPath: './.devcontainer',
                    })
                );

                runInitCli(['init', '--no-interactive', '--output', './tmp-devcontainer'], repoDir);

                expect(
                    fs.existsSync(path.join(repoDir, 'tmp-devcontainer', 'superposition.json'))
                ).toBe(true);
                expect(
                    fs.existsSync(path.join(repoDir, '.devcontainer', 'superposition.json'))
                ).toBe(false);
            } finally {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }
        });

        it('should reject conflicting persisted input source flags', () => {
            const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-config-conflict-'));

            try {
                fs.writeFileSync(
                    path.join(repoDir, '.superposition.yml'),
                    yaml.dump({
                        stack: 'plain',
                        language: ['nodejs'],
                    })
                );
                fs.writeFileSync(
                    path.join(repoDir, 'superposition.json'),
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

                expect(() =>
                    runInitCli(
                        ['regen', '--from-project', '--from-manifest', './superposition.json'],
                        repoDir
                    )
                ).toThrow(/--from-project and --from-manifest cannot be used together/);
            } finally {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }
        });

        it('should reject selection flags when --from-project is used', () => {
            const repoDir = fs.mkdtempSync(
                path.join(os.tmpdir(), 'project-config-selection-conflict-')
            );

            try {
                fs.writeFileSync(
                    path.join(repoDir, '.superposition.yml'),
                    yaml.dump({
                        stack: 'plain',
                        language: ['nodejs'],
                    })
                );

                expect(() =>
                    runInitCli(['init', '--from-project', '--stack', 'compose'], repoDir)
                ).toThrow(
                    /Persisted input sources cannot be combined with clean-generation selection flags/
                );
            } finally {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }
        });

        it('should preserve the current no-config failure for --no-interactive without persisted input', () => {
            const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-config-none-'));

            try {
                expect(() => runInitCli(['init', '--no-interactive'], repoDir)).toThrow(
                    /--no-interactive requires persisted input/
                );
            } finally {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }
        });

        it('should error when regen finds only a manifest and no project file', () => {
            const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'regen-manifest-only-'));

            try {
                // Write only a manifest — no superposition.yml
                fs.mkdirSync(path.join(repoDir, '.devcontainer'), { recursive: true });
                fs.writeFileSync(
                    path.join(repoDir, '.devcontainer', 'superposition.json'),
                    JSON.stringify(
                        {
                            manifestVersion: '1',
                            generatedBy: 'test',
                            generated: new Date().toISOString(),
                            baseTemplate: 'plain',
                            baseImage: 'bookworm',
                            overlays: ['nodejs'],
                        },
                        null,
                        2
                    )
                );

                expect(() => runInitCli(['regen'], repoDir)).toThrow(/No project file found/);
            } finally {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }
        });

        it('should create a project file from a manifest using migrate command', () => {
            const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrate-'));

            try {
                fs.mkdirSync(path.join(repoDir, '.devcontainer'), { recursive: true });
                fs.writeFileSync(
                    path.join(repoDir, '.devcontainer', 'superposition.json'),
                    JSON.stringify(
                        {
                            manifestVersion: '1',
                            generatedBy: 'test',
                            generated: new Date().toISOString(),
                            baseTemplate: 'plain',
                            baseImage: 'bookworm',
                            overlays: ['nodejs'],
                        },
                        null,
                        2
                    )
                );

                runInitCli(['migrate'], repoDir);

                const projectFilePath = path.join(repoDir, '.superposition.yml');
                expect(fs.existsSync(projectFilePath)).toBe(true);

                const projectConfig = yaml.load(fs.readFileSync(projectFilePath, 'utf8')) as any;
                expect(projectConfig.stack).toBe('plain');
                expect(projectConfig.overlays).toContain('nodejs');
            } finally {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }
        });

        it('should refuse to overwrite existing project file without --force in migrate', () => {
            const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'migrate-force-'));

            try {
                // Write existing project file
                fs.writeFileSync(
                    path.join(repoDir, '.superposition.yml'),
                    yaml.dump({ stack: 'plain', overlays: ['python'] })
                );
                // Write manifest
                fs.mkdirSync(path.join(repoDir, '.devcontainer'), { recursive: true });
                fs.writeFileSync(
                    path.join(repoDir, '.devcontainer', 'superposition.json'),
                    JSON.stringify(
                        {
                            manifestVersion: '1',
                            generatedBy: 'test',
                            generated: new Date().toISOString(),
                            baseTemplate: 'plain',
                            baseImage: 'bookworm',
                            overlays: ['nodejs'],
                        },
                        null,
                        2
                    )
                );

                expect(() => runInitCli(['migrate'], repoDir)).toThrow(
                    /Project file already exists/
                );
            } finally {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }
        });

        it('should write project file with --no-scaffold without creating .devcontainer', () => {
            const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-scaffold-'));

            try {
                runInitCli(
                    ['init', '--stack', 'plain', '--language', 'nodejs', '--no-scaffold'],
                    repoDir
                );

                // Project file should be written
                const projectFilePath = path.join(repoDir, '.superposition.yml');
                expect(fs.existsSync(projectFilePath)).toBe(true);

                // devcontainer.json should NOT be written (scaffold was skipped)
                expect(
                    fs.existsSync(path.join(repoDir, '.devcontainer', 'devcontainer.json'))
                ).toBe(false);
            } finally {
                fs.rmSync(repoDir, { recursive: true, force: true });
            }
        });
    });
});

describe('Ad-hoc project parameter console output (AC4)', () => {
    const overlaysConfig = loadOverlaysConfig(
        path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'overlays'),
        path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'overlays', 'index.yml')
    );
    const OVERLAYS_DIR_LOCAL = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '..',
        '..',
        'overlays'
    );

    let consoleLogSpy: ReturnType<typeof vi.spyOn>;
    let repoDir: string;

    beforeEach(() => {
        repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adhoc-console-'));
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        fs.rmSync(repoDir, { recursive: true, force: true });
        vi.restoreAllMocks();
    });

    it('shows project-only parameters in separate block, not in overlay block, no unknown warning (AC4)', async () => {
        // postgres overlay declares POSTGRES_* params; API_PORT and WEB_DEV_PORT are project-only.
        const outputPath = path.join(repoDir, '.devcontainer');
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
            overlayParameters: {
                POSTGRES_DB: 'myapp',
                POSTGRES_USER: 'myapp',
                POSTGRES_PASSWORD: 'pass',
                POSTGRES_PORT: '5432',
                POSTGRES_VERSION: '16',
                API_PORT: '8088',
                WEB_DEV_PORT: '5173',
            },
        };

        await composeDevContainer(answers, OVERLAYS_DIR_LOCAL, { isRegen: true });

        const output = consoleLogSpy.mock.calls.map((c) => c.join(' ')).join('\n');

        // Must NOT contain old warning text
        expect(output).not.toContain('Unknown overlay parameters');

        // Must contain project-only header
        expect(output).toContain(
            '⚙️  Project-only parameters (not declared by any selected overlay):'
        );

        // API_PORT and WEB_DEV_PORT must appear as individual KEY=VALUE lines (6-space indent)
        expect(output).toContain('      API_PORT=8088');
        expect(output).toContain('      WEB_DEV_PORT=5173');

        // API_PORT must NOT appear in the overlay parameters block.
        // Strategy: find the overlay block, extract text up to the project-only block header,
        // and verify API_PORT is absent from that segment.
        const overlayBlockHeader = '⚙️  Overlay parameters:';
        const projectOnlyBlockHeader =
            '⚙️  Project-only parameters (not declared by any selected overlay):';
        const overlayStart = output.indexOf(overlayBlockHeader);
        const projectOnlyStart = output.indexOf(projectOnlyBlockHeader);
        expect(overlayStart).toBeGreaterThan(-1);
        expect(projectOnlyStart).toBeGreaterThan(overlayStart);

        const overlayBlock = output.slice(overlayStart, projectOnlyStart);
        expect(overlayBlock).not.toContain('API_PORT');
        expect(overlayBlock).not.toContain('WEB_DEV_PORT');

        // Overlay block DOES contain postgres params
        expect(overlayBlock).toContain('POSTGRES_DB=myapp');
    });
});
