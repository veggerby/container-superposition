import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import { listCommand } from '../commands/list.js';
import { explainCommand } from '../commands/explain.js';
import { planCommand } from '../commands/plan.js';
import { hashCommand } from '../commands/hash.js';
import { doctorCommand } from '../commands/doctor.js';
import { migrateCommand } from '../commands/migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');

describe('UX contracts', () => {
    let overlaysConfig: any;
    let logSpy: any;
    let errorSpy: any;
    let exitSpy: any;

    beforeEach(() => {
        overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
        logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: any) => {
            throw new Error(`process.exit(${code})`);
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('list shows frame, recommended starts, browse block, messaging category, single next step', async () => {
        await listCommand(overlaysConfig, {});
        const output = logSpy.mock.calls.join('\n');
        expect(output).toContain('Mode: Discovery');
        expect(output).toContain('Source: CLI selection');
        expect(output).toContain('What this helps you decide');
        expect(output).toContain('Recommended starts');
        expect(output).toContain('Browse all overlays');
        expect(output).toContain('messaging');
        expect(output.match(/Next step/g)?.length).toBe(1);
    });

    it('explain shows fixed sections with explicit none states and next step footer', async () => {
        await explainCommand(overlaysConfig, OVERLAYS_DIR, 'nodejs', {});
        const output = logSpy.mock.calls.join('\n');
        expect(output).toContain('Mode: Inspection');
        expect(output).toContain('Best for');
        expect(output).toContain('Adds');
        expect(output).toContain('Depends on');
        expect(output).toContain('Conflicts with');
        expect(output).toContain('none');
        expect(output).toContain('Preview notes');
        expect(output).toContain('Files, services, and ports');
        expect(output).toContain('Try this next');
        expect(output.match(/Next step/g)?.length).toBe(1);
    });

    it('plan shows summary-first text and diff headline before unified diff', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-plan-'));
        try {
            await planCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres',
                diff: true,
                output: path.join(tmpDir, 'dc'),
            });
            const output = logSpy.mock.calls.join('\n');
            expect(output).toContain('Mode: Preview only');
            expect(output).toContain('Resolved intent');
            expect(output).toContain('What changes here');
            expect(output).toContain('Why this plan looks this way');
            expect(output).toContain('Detailed file impact');
            expect(output).toContain('First write');
            expect(output.indexOf('First write')).toBeLessThan(
                output.indexOf('Unified diff') === -1
                    ? output.length
                    : output.indexOf('Unified diff')
            );
            expect(output.match(/Next step/g)?.length).toBe(1);
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('hash explains fingerprint meaning and write location state', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-hash-'));
        try {
            await hashCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'grafana',
                write: true,
                output: tmpDir,
            });
            const output = logSpy.mock.calls.join('\n');
            expect(output).toContain('Mode: Fingerprint');
            expect(output).toContain('Fingerprint');
            expect(output).toContain('Computed from');
            expect(output).toContain('Normalized dependencies');
            expect(output).toContain('prometheus');
            expect(output).toContain('How to compare');
            expect(output).toContain('Write location');
            expect(output).toContain('changed file contents');
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('doctor dry-run shows triage header, fix plan, preview-only note, JSON parity fields', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-doctor-'));
        try {
            fs.writeFileSync(
                path.join(tmpDir, '.superposition.yml'),
                'stack: compose\noverlays: [grafana]\n'
            );
            fs.mkdirSync(path.join(tmpDir, '.devcontainer'), { recursive: true });
            logSpy.mockClear();
            try {
                await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                    projectRoot: tmpDir,
                    fromProject: true,
                    fix: true,
                    dryRun: true,
                });
            } catch {}
            const output = logSpy.mock.calls.join('\n');
            expect(output).toContain('Mode: Preview fix plan only');
            expect(output).toContain('Disposition:');
            expect(output).toContain('Counts:');
            expect(output).toContain('Blocking issues');
            expect(output).toContain('Safe auto-fixes available');
            expect(output).toContain('Fix plan');
            expect(output).toContain('Preview fix plan only — no files changed');

            logSpy.mockClear();
            try {
                await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                    projectRoot: tmpDir,
                    fromProject: true,
                    fix: true,
                    dryRun: true,
                    json: true,
                });
            } catch {}
            const json = JSON.parse(logSpy.mock.calls[0][0]);
            expect(json.mode).toBe('Preview fix plan only');
            expect(json.disposition).toBeDefined();
            expect(json.counts).toBeDefined();
            expect(Array.isArray(json.fixPlan)).toBe(true);
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('migrate prints bridge framing and generated-output-unchanged success', async () => {
        const repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-migrate-'));
        const manifestPath = path.join(repoDir, 'superposition.json');
        fs.writeFileSync(
            manifestPath,
            JSON.stringify({
                manifestVersion: '1',
                generatedBy: 'test',
                generated: new Date().toISOString(),
                baseTemplate: 'plain',
                baseImage: 'bookworm',
                overlays: ['nodejs'],
            })
        );
        const originalCwd = process.cwd();
        process.chdir(repoDir);
        try {
            await migrateCommand({});
            const output = logSpy.mock.calls.join('\n');
            expect(output).toContain('Mode: Legacy bridge');
            expect(output).toContain('Generated output: unchanged by this command');
            expect(output).toContain('Write review');
            expect(output).toContain(
                'compatibility note: generated output stays same until `cs regen`'
            );
            expect(output).toContain('Bridge success');
            expect(output).toContain('generated output unchanged');
        } finally {
            process.chdir(originalCwd);
            fs.rmSync(repoDir, { recursive: true, force: true });
        }
    });
});
