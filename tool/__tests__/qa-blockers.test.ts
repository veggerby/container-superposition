import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

vi.mock('@inquirer/prompts', () => ({
    select: vi.fn().mockResolvedValue('Cancel'),
}));

import { buildInitEntryChoices, buildShortcutOverlayChoices } from '../cli/run.js';
import { renderDoctorReportModel, doctorCommand } from '../commands/doctor.js';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import { select } from '@inquirer/prompts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');
const TSX_CLI = path.join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

function runCli(args: string[], cwd: string): { stdout: string; stderr: string; status: number } {
    const result = spawnSync(
        process.execPath,
        [TSX_CLI, path.join(REPO_ROOT, 'scripts', 'init.ts'), ...args],
        {
            cwd,
            env: { ...process.env, FORCE_COLOR: '0' },
            encoding: 'utf8',
        }
    );
    return {
        stdout: result.stdout,
        stderr: result.stderr,
        status: result.status ?? 1,
    };
}

function countOccurrences(text: string, token: string): number {
    return text.split(token).length - 1;
}

describe('QA blocker regressions', () => {
    let logSpy: any;
    let exitSpy: any;
    const originalStdinTTY = process.stdin.isTTY;
    const originalStdoutTTY = process.stdout.isTTY;

    beforeEach(() => {
        logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: any) => {
            throw new Error(`process.exit(${code})`);
        });
        Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
        Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        Object.defineProperty(process.stdin, 'isTTY', {
            value: originalStdinTTY,
            configurable: true,
        });
        Object.defineProperty(process.stdout, 'isTTY', {
            value: originalStdoutTTY,
            configurable: true,
        });
    });

    it('shortcut add-capability choices are stack-aware and grouped', () => {
        const overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
        const plainChoices = buildShortcutOverlayChoices({
            stack: 'plain',
            overlays: overlaysConfig.overlays,
            selectedOverlayIds: ['nodejs'],
        });
        const plainNames = plainChoices
            .filter((choice: any) => choice.name)
            .map((choice: any) => choice.name);
        expect(plainNames).not.toContain('PostgreSQL');

        const composeChoices = buildShortcutOverlayChoices({
            stack: 'compose',
            overlays: overlaysConfig.overlays,
            selectedOverlayIds: ['nodejs'],
        });
        const composeNames = composeChoices
            .filter((choice: any) => choice.name)
            .map((choice: any) => choice.name);
        expect(composeNames).toContain('PostgreSQL');
        expect(
            composeChoices.some((choice: any) => choice.separator?.includes('Data services'))
        ).toBe(true);
    });

    it('init entry choices expose lane chooser, current-setup review, and preview/write exit', () => {
        expect(buildInitEntryChoices(false).map((choice) => choice.name)).toEqual([
            'Fast start',
            'Custom build',
        ]);
        expect(buildInitEntryChoices(true).map((choice) => choice.name)).toEqual([
            'Add capability',
            'Remove capability',
            'Change runtime or editor',
            'Adjust parameters',
            'Review current setup',
            'Edit full setup',
            'Preview and write',
        ]);
    });

    it('healthy doctor report omits empty action buckets', () => {
        const output = renderDoctorReportModel({
            mode: 'Diagnosis only',
            outputPath: '.devcontainer',
            findings: [
                {
                    id: 'ok',
                    category: 'environment',
                    name: 'Node.js version',
                    status: 'pass',
                    message: 'ok',
                    fixEligibility: 'not-applicable',
                    recheckScope: 'environment',
                },
            ],
        });
        expect(output).not.toContain('Blocking issues');
        expect(output).not.toContain('Safe auto-fixes available');
        expect(output).not.toContain('Manual follow-up');
        expect(output).toContain('Passed checks');
    });

    it('doctor defaults to selected overlays only unless --all-overlays is used', async () => {
        const overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-selected-overlays-'));
        try {
            fs.writeFileSync(
                path.join(tmpDir, '.superposition.yml'),
                'stack: plain\noverlays: [nodejs]\n'
            );
            fs.mkdirSync(path.join(tmpDir, '.devcontainer'), { recursive: true });
            fs.writeFileSync(
                path.join(tmpDir, '.devcontainer', 'superposition.json'),
                JSON.stringify({
                    baseTemplate: 'plain',
                    baseImage: 'bookworm',
                    overlays: ['nodejs'],
                })
            );
            fs.writeFileSync(path.join(tmpDir, '.devcontainer', 'devcontainer.json'), '{}\n');

            try {
                await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                    projectRoot: tmpDir,
                    fromProject: true,
                });
            } catch {}

            const defaultOutput = logSpy.mock.calls.flat().join('\n');
            expect(defaultOutput).toContain('Overlay: nodejs');
            expect(defaultOutput).not.toContain('Overlay: postgres');

            logSpy.mockClear();

            try {
                await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                    projectRoot: tmpDir,
                    fromProject: true,
                    allOverlays: true,
                });
            } catch {}

            const catalogOutput = logSpy.mock.calls.flat().join('\n');
            expect(catalogOutput).toContain('Overlay: postgres');
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('interactive doctor --fix asks Apply fixes or Cancel after fix plan', async () => {
        const overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-confirm-'));
        try {
            fs.writeFileSync(
                path.join(tmpDir, '.superposition.yml'),
                'stack: compose\noverlays: [grafana]\n'
            );
            fs.mkdirSync(path.join(tmpDir, '.devcontainer'), { recursive: true });

            try {
                await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                    projectRoot: tmpDir,
                    fromProject: true,
                    fix: true,
                });
            } catch {}

            expect(vi.mocked(select)).toHaveBeenCalled();
            const prompt = vi.mocked(select).mock.calls.at(-1)?.[0] as any;
            expect(prompt.choices.map((choice: any) => choice.name)).toEqual([
                'Apply fixes',
                'Cancel',
            ]);
            expect(prompt.default).toBe('Cancel');
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('update mode uses compact header and avoids immediate duplicate setup summary', () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'init-update-summary-'));
        try {
            fs.writeFileSync(
                path.join(tmpDir, '.superposition.yml'),
                'stack: plain\noverlays: [nodejs, postgres]\neditor: jetbrains\n'
            );
            fs.writeFileSync(
                path.join(tmpDir, 'superposition.local.yml'),
                'mounts:\n  - source: ${HOME}/.codex\n    destination: /home/vscode/.codex\n'
            );
            const result = runCli(['init', '--stack', 'plain', '--language', 'nodejs'], tmpDir);
            const output = `${result.stdout}\n${result.stderr}`;
            expect(result.status).toBe(0);
            expect(output).toContain('Update shared setup');
            expect(output).toContain('Project file: .superposition.yml');
            expect(output).toContain('Local config: Applied safely');
            expect(output).toContain('Current shared setup');
            expect(countOccurrences(output, 'Current shared setup')).toBe(1);
            expect(output).toContain('stack: plain');
            expect(output).toContain('language: nodejs');
            expect(output).toContain('data services: postgres');
            expect(output).toContain('editor: jetbrains');
            expect(output).not.toContain('Recommended next action: No next step suggested');
            expect(output).not.toContain('Source: shared project file');
            expect(output).not.toContain('Local-only config trust');
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('interactive init no longer offers write-now/go-back/abort chooser', () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'init-no-confirm-'));
        try {
            const result = runCli(['init', '--stack', 'plain', '--language', 'nodejs'], tmpDir);
            const output = `${result.stdout}\n${result.stderr}`;
            expect(result.status).toBe(0);
            expect(output).not.toContain('Write now');
            expect(output).not.toContain('Go back');
            expect(output).not.toContain('Abort');
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });

    it('local trust contract stays single-placement across init and regen output', () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'local-trust-regression-'));
        try {
            fs.writeFileSync(
                path.join(tmpDir, 'superposition.local.yml'),
                'mounts:\n  - source: ${HOME}/.codex\n    destination: /home/vscode/.codex\n'
            );

            const initResult = runCli(['init', '--stack', 'plain', '--language', 'nodejs'], tmpDir);
            const initOutput = `${initResult.stdout}\n${initResult.stderr}`;
            expect(initResult.status).toBe(0);
            expect(countOccurrences(initOutput, 'Local-only config trust')).toBe(1);
            expect(initOutput).not.toContain('Local config detected: superposition.local.yml');

            const regenResult = runCli(['regen'], tmpDir);
            const regenOutput = `${regenResult.stdout}\n${regenResult.stderr}`;
            expect(regenResult.status).toBe(0);
            expect(countOccurrences(regenOutput, 'Local-only config trust')).toBe(1);
            expect(regenOutput).not.toContain('Local config detected: superposition.local.yml');
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    });
});
