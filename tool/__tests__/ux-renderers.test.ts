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
import { doctorCommand, renderDoctorReportModel } from '../commands/doctor.js';
import { migrateCommand } from '../commands/migrate.js';
import { composeDevContainer } from '../questionnaire/composer.js';
import { classifyChangeSet } from '../ux/semantics/change-class.js';

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
        expect(output).toContain('Current setup');
        expect(output).toContain('What this helps you decide');
        expect(output.indexOf('Mode: Discovery')).toBeLessThan(
            output.indexOf('Source: CLI selection')
        );
        expect(output.indexOf('Source: CLI selection')).toBeLessThan(
            output.indexOf('Current setup')
        );
        expect(output.indexOf('Current setup')).toBeLessThan(
            output.indexOf('What this helps you decide')
        );
        expect(output).toContain('Recommended starts');
        expect(output).toContain('Common goals');
        expect(output).toContain('Browse all overlays');
        expect(output).toContain('How to inspect or preview next');
        expect(output).toContain('messaging');
        expect(output.indexOf('Mode: Discovery')).toBeLessThan(
            output.indexOf('Recommended starts')
        );
        expect(output.match(/Next step/g)?.length).toBe(1);
    });

    it('filtered list zero-result path shows recovery suggestions', async () => {
        await listCommand(overlaysConfig, { category: 'nonexistent' as any });
        const output = logSpy.mock.calls.join('\n');
        expect(output).toContain('Filter summary');
        expect(output).toContain('No matches');
        expect(output).toContain('How to widen or inspect next');
        expect(output).toContain('remove one filter and try again');
        expect(output).toContain('drop category filter to widen results');
        expect(output).toContain('inspect live categories with `cs list`');
    });

    it('explain shows fixed sections with explicit none states and next step footer', async () => {
        await explainCommand(overlaysConfig, OVERLAYS_DIR, 'nodejs', {});
        const output = logSpy.mock.calls.join('\n');
        expect(output).toContain('Mode: Inspection');
        expect(output).toContain('Current setup');
        expect(output).toContain('Best for');
        expect(output).toContain('Why pick this over nearby options');
        expect(output).toContain('What it adds');
        expect(output).toContain('What to watch out for');
        expect(output.indexOf('Best for')).toBeLessThan(
            output.indexOf('Why pick this over nearby options')
        );
        expect(output).toContain('Depends on');
        expect(output).toContain('Conflicts with');
        expect(output).toContain('none');
        expect(output).toContain('Preview this change');
        expect(output).toContain('Files, services, and ports');
        expect(output).toContain('Try this next');
        expect(output.match(/Next step/g)?.length).toBe(1);
    });

    it('explain reuses one normalized rich port token across sections and keeps flat mixed lists', async () => {
        await explainCommand(overlaysConfig, OVERLAYS_DIR, 'postgres', {});
        const output = logSpy.mock.calls.join('\n');
        const token = '5432/tcp — postgres — PostgreSQL database connection';
        expect(output).not.toContain('[object Object]');
        expect(output).toContain(`- port: ${token}`);
        expect(output).toContain(`- opens port: ${token}`);
        expect(output.match(new RegExp(token, 'g'))?.length).toBe(3);
        expect(output.indexOf('Best for')).toBeLessThan(
            output.indexOf('Why pick this over nearby options')
        );
        expect(output.indexOf('Why pick this over nearby options')).toBeLessThan(
            output.indexOf('What it adds')
        );
        expect(output.indexOf('What it adds')).toBeLessThan(
            output.indexOf('What to watch out for')
        );
        expect(output.indexOf('What to watch out for')).toBeLessThan(output.indexOf('Depends on'));
        expect(output.indexOf('Depends on')).toBeLessThan(output.indexOf('Conflicts with'));
        expect(output.indexOf('Conflicts with')).toBeLessThan(
            output.indexOf('Preview this change')
        );
        expect(output.indexOf('Preview this change')).toBeLessThan(
            output.indexOf('Files, services, and ports')
        );
        expect(output.indexOf('Files, services, and ports')).toBeLessThan(
            output.indexOf('Try this next')
        );
        expect(output).toContain('- file: .env.example');
        expect(output).toContain('- file: README.md');
        expect(output).toContain('- service: postgres');
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
            expect(output).toContain('Current setup');
            expect(output).toContain('Planned changes');
            expect(output).toContain('Watch-outs');
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

    it('plan can surface replay canonical intent when reconciling drift', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-plan-replay-'));
        const outputPath = path.join(tmpDir, '.devcontainer');
        try {
            fs.writeFileSync(
                path.join(tmpDir, '.superposition.yml'),
                'stack: plain\noverlays: [nodejs]\noutputPath: .devcontainer\n'
            );
            fs.mkdirSync(outputPath, { recursive: true });
            fs.writeFileSync(
                path.join(outputPath, 'superposition.json'),
                JSON.stringify({ baseTemplate: 'plain', overlays: ['nodejs'] })
            );
            fs.writeFileSync(
                path.join(outputPath, 'devcontainer.json'),
                JSON.stringify({ name: 'tampered' })
            );
            await planCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'plain',
                overlays: 'nodejs',
                diff: true,
                output: outputPath,
            });
            const output = logSpy.mock.calls.join('\n');
            expect(output).toContain('Replay canonical intent');
            expect(output).toContain('Current setup');
            expect(output).toContain('intent unchanged; replay would reconcile generated output');
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('change classification helper covers no-material-change and cleanup states', () => {
        expect(
            classifyChangeSet({
                hasExistingOutput: true,
                created: 0,
                updated: 0,
                removed: 0,
                unchanged: 3,
            })
        ).toBe('No material change');
        expect(
            classifyChangeSet({
                hasExistingOutput: true,
                created: 0,
                updated: 0,
                removed: 2,
                unchanged: 0,
            })
        ).toBe('Cleanup stale generated files');
    });

    it('read-only commands expose aligned JSON semantics', async () => {
        logSpy.mockClear();
        await listCommand(overlaysConfig, { json: true });
        const listJson = JSON.parse(logSpy.mock.calls.at(-1)?.[0]);
        expect(listJson.source.label).toBeDefined();
        expect(listJson.nextStep.command).toBeDefined();

        logSpy.mockClear();
        await explainCommand(overlaysConfig, OVERLAYS_DIR, 'nodejs', { json: true });
        const explainJson = JSON.parse(logSpy.mock.calls.at(-1)?.[0]);
        expect(explainJson.source.label).toBeDefined();
        expect(explainJson.overlay.id).toBe('nodejs');

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-plan-json-'));
        try {
            logSpy.mockClear();
            await planCommand(overlaysConfig, OVERLAYS_DIR, {
                stack: 'compose',
                overlays: 'postgres',
                diff: true,
                output: path.join(tmpDir, 'dc'),
                json: true,
            });
            const planJson = JSON.parse(logSpy.mock.calls.at(-1)?.[0]);
            expect(planJson.source.label).toBeDefined();
            expect(planJson.changeClass).toBeDefined();
            expect(planJson.nextStep.command).toBeDefined();
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
            expect(output).toContain('Comparison summary');
            expect(output).toContain('Fingerprint');
            expect(output.indexOf('Comparison summary')).toBeLessThan(
                output.indexOf('\nFingerprint\n')
            );
            expect(output).toContain('Computed from');
            expect(output).toContain('Normalized dependencies');
            expect(output).toContain('prometheus');
            expect(output).toContain('What equal values mean');
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
            expect(output).toContain('Mode: Project fix preview');
            expect(output).toContain('Verdict:');
            expect(output).toContain('Scope:');
            expect(output).toContain('Source inspected:');
            expect(output).toContain('What needs attention:');
            expect(output).toContain('Recommended next action:');
            expect(output).toContain('Counts');
            expect(output).toContain('blocking:');
            expect(output).toContain('fix now:');
            expect(output).toContain('manual:');
            expect(output).toContain('healthy:');
            expect(output).toContain('Do now');
            expect(output).toContain('Can fix now');
            expect(output).toContain('Fix plan');
            expect(output).toContain('Project fix preview — No files changed');

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
            expect(json.mode).toBe('Project fix preview');
            expect(json.disposition).toBeDefined();
            expect(json.counts).toBeDefined();
            expect(Array.isArray(json.fixPlan)).toBe(true);
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('doctor project diagnosis and safe-fix modes are labeled explicitly', async () => {
        const diagnosisOutput = renderDoctorReportModel({
            mode: 'Project diagnosis',
            outputPath: '.devcontainer',
            scope: 'selected overlays for current project (1)',
            findings: [],
        });
        const safeFixOutput = renderDoctorReportModel({
            mode: 'Project safe fixes',
            outputPath: '.devcontainer',
            scope: 'selected overlays for current project (1)',
            findings: [],
            executions: [],
        });
        expect(diagnosisOutput).toContain('Mode: Project diagnosis');
        expect(safeFixOutput).toContain('Mode: Project safe fixes');
    });

    it('doctor catalog validation mode is labeled explicitly', async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ux-doctor-catalog-'));
        try {
            fs.mkdirSync(path.join(tmpDir, '.devcontainer'), { recursive: true });
            try {
                await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                    projectRoot: tmpDir,
                    allOverlays: true,
                });
            } catch {}
            const output = logSpy.mock.calls.join('\n');
            expect(output).toContain('Mode: Catalog validation');
            expect(output).toContain('Scope: full overlay catalog');
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('CLI help text teaches discovery to preview workflow', async () => {
        const argsSource = fs.readFileSync(path.join(REPO_ROOT, 'tool', 'cli', 'args.ts'), 'utf8');
        expect(argsSource).toContain('Discover recommended starts');
        expect(argsSource).toContain('Preview current setup, planned changes, and watch-outs');
        expect(argsSource).toContain('Diagnose project health by default');
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
            expect(output).toContain('Mode: Migrate legacy manifest workflow');
            expect(output).toContain(
                'This path is for: legacy manifest-only repos moving to canonical shared project file'
            );
            expect(output.indexOf('Mode: Migrate legacy manifest workflow')).toBeLessThan(
                output.indexOf('This path is for')
            );
            expect(output.indexOf('This path is for')).toBeLessThan(
                output.indexOf('Source analyzed')
            );
            expect(output).toContain('Generated output: unchanged by this command');
            expect(output).toContain('Write review');
            expect(output).toContain(
                'compatibility note: generated output stays same until `cs regen`'
            );
            expect(output).toContain('Why migrate fits this repo');
            expect(output).toContain('What stays unchanged');
            expect(output).toContain('Written now');
            expect(output).toContain('Generated output status');
            expect(output).toContain('Next checklist');
            expect(output).toContain('Optional validation');
            expect(output).toContain('1. run cs regen');
            expect(output).toContain('unchanged by migrate');
        } finally {
            process.chdir(originalCwd);
            fs.rmSync(repoDir, { recursive: true, force: true });
        }
    });
});
