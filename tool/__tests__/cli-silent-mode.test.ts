import { afterEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { enableSilentOutput, isSilentOutput, restoreOutput } from '../cli/output.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');
const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');

function runCli(args: string[], cwd: string) {
    return spawnSync(
        process.execPath,
        [tsxCli, path.join(repoRoot, 'scripts', 'init.ts'), ...args],
        { cwd, env: { ...process.env, FORCE_COLOR: '0' }, encoding: 'utf8' }
    );
}

function makeWorkspace(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'cli-silent-mode-'));
}

function writeHandwrittenDevcontainer(workspace: string): void {
    const directory = path.join(workspace, '.devcontainer');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
        path.join(directory, 'devcontainer.json'),
        JSON.stringify({
            features: { 'ghcr.io/devcontainers/features/node:1': { version: 'lts' } },
        })
    );
}

afterEach(() => {
    restoreOutput();
    vi.restoreAllMocks();
});

describe('CLI silent mode', () => {
    it('advertises --silent for every executable command', () => {
        for (const command of [
            'init',
            'regen',
            'list',
            'defaults',
            'explain',
            'plan',
            'doctor',
            'adopt',
            'hash',
            'migrate',
        ]) {
            const result = runCli([command, '--help'], repoRoot);
            expect(result.status).toBe(0);
            expect(result.stdout).toContain('--silent');
        }
    }, 30_000);

    it('rejects every JSON command before command work, including hash writes', () => {
        const workspace = makeWorkspace();
        try {
            for (const command of ['list', 'defaults', 'explain', 'plan', 'doctor', 'adopt']) {
                const args = command === 'explain' ? [command, 'nodejs'] : [command];
                const result = runCli([...args, '--silent', '--json'], workspace);
                expect(result.status).not.toBe(0);
                expect(result.stderr).toContain('--silent cannot be used with --json');
            }
            const result = runCli(
                [
                    'hash',
                    '--stack',
                    'plain',
                    '--overlays',
                    'nodejs',
                    '--write',
                    '--output',
                    '.devcontainer',
                    '--silent',
                    '--json',
                ],
                workspace
            );
            expect(result.status).not.toBe(0);
            expect(result.stderr).toContain('--silent cannot be used with --json');
            expect(fs.existsSync(path.join(workspace, '.devcontainer', 'superposition.hash'))).toBe(
                false
            );

            const planDiffResult = runCli(
                [
                    'plan',
                    '--stack',
                    'plain',
                    '--overlays',
                    'nodejs',
                    '--diff',
                    '--diff-format',
                    'json',
                    '--silent',
                ],
                workspace
            );
            expect(planDiffResult.status).not.toBe(0);
            expect(planDiffResult.stderr).toContain('--silent cannot be used with --json');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    });

    it('preserves read-only, init, and regen operation while suppressing routine output', () => {
        const normalWorkspace = makeWorkspace();
        const silentWorkspace = makeWorkspace();
        try {
            const normalList = runCli(['list'], normalWorkspace);
            const silentList = runCli(['list', '--silent'], silentWorkspace);
            expect(silentList.status).toBe(normalList.status);
            expect(normalList.stdout).not.toBe('');
            expect(silentList.stdout).toBe('');
            expect(silentList.stderr).toBe('');

            const args = ['init', '--stack', 'plain', '--language', 'nodejs', '--no-interactive'];
            const normalInit = runCli(args, normalWorkspace);
            const silentInit = runCli([...args, '--silent'], silentWorkspace);
            expect(silentInit.status).toBe(normalInit.status);
            expect(silentInit.stdout).toBe('');
            expect(silentInit.stderr).toBe('');
            for (const workspace of [normalWorkspace, silentWorkspace]) {
                expect(fs.existsSync(path.join(workspace, '.superposition.yml'))).toBe(true);
                expect(
                    fs.existsSync(path.join(workspace, '.devcontainer', 'devcontainer.json'))
                ).toBe(true);
            }

            const silentRegen = runCli(['regen', '--silent'], silentWorkspace);
            expect(silentRegen.status).toBe(0);
            expect(silentRegen.stdout).toBe('');
            expect(silentRegen.stderr).toBe('');
            expect(
                fs.existsSync(path.join(silentWorkspace, '.devcontainer', 'devcontainer.json'))
            ).toBe(true);
        } finally {
            fs.rmSync(normalWorkspace, { recursive: true, force: true });
            fs.rmSync(silentWorkspace, { recursive: true, force: true });
        }
    }, 30_000);

    it('keeps a concise diagnostic visible for a failing silent doctor invocation', () => {
        const workspace = makeWorkspace();
        try {
            fs.writeFileSync(
                path.join(workspace, 'superposition.yml'),
                'stack: plain\noverlays:\n  - nodejs\noutputPath: .devcontainer\n'
            );
            fs.mkdirSync(path.join(workspace, '.devcontainer'));
            fs.writeFileSync(path.join(workspace, '.devcontainer', 'devcontainer.json'), '{}\n');
            const result = runCli(['doctor', '--silent'], workspace);
            expect(result.status).toBe(1);
            expect(result.stdout).toBe('');
            expect(result.stderr).toContain('Doctor found issues requiring attention');
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }, 30_000);

    it('preserves silent conversion writes for adopt and migrate', () => {
        const adoptWorkspace = makeWorkspace();
        const migrateWorkspace = makeWorkspace();
        try {
            writeHandwrittenDevcontainer(adoptWorkspace);
            const adopt = runCli(
                ['adopt', '--dir', '.devcontainer', '--dry-run', '--silent'],
                adoptWorkspace
            );
            expect(adopt.status).toBe(0);
            expect(adopt.stdout).toBe('');
            expect(adopt.stderr).toBe('');
            expect(fs.existsSync(path.join(adoptWorkspace, '.superposition.yml'))).toBe(false);

            fs.mkdirSync(path.join(migrateWorkspace, '.devcontainer'), { recursive: true });
            fs.writeFileSync(
                path.join(migrateWorkspace, '.devcontainer', 'superposition.json'),
                JSON.stringify({
                    manifestVersion: '1',
                    generatedBy: 'test',
                    generated: '2026-01-01T00:00:00.000Z',
                    baseTemplate: 'plain',
                    baseImage: 'bookworm',
                    overlays: ['nodejs'],
                })
            );
            const migrate = runCli(['migrate', '--silent'], migrateWorkspace);
            expect(migrate.status).toBe(0);
            expect(migrate.stdout).toBe('');
            expect(migrate.stderr).toBe('');
            expect(fs.existsSync(path.join(migrateWorkspace, '.superposition.yml'))).toBe(true);
        } finally {
            fs.rmSync(adoptWorkspace, { recursive: true, force: true });
            fs.rmSync(migrateWorkspace, { recursive: true, force: true });
        }
    }, 30_000);

    it('retains valid JSON output for every JSON-capable command', () => {
        const workspace = makeWorkspace();
        try {
            writeHandwrittenDevcontainer(workspace);
            expect(
                runCli(
                    ['init', '--stack', 'plain', '--language', 'nodejs', '--no-interactive'],
                    workspace
                ).status
            ).toBe(0);
            const commands = [
                ['list', '--json'],
                ['defaults', '--json'],
                ['explain', 'nodejs', '--json'],
                ['plan', '--stack', 'plain', '--overlays', 'nodejs', '--json'],
                ['doctor', '--from-project', '--json'],
                ['adopt', '--dir', '.devcontainer', '--dry-run', '--json'],
                ['hash', '--stack', 'plain', '--overlays', 'nodejs', '--json'],
            ];
            for (const args of commands) {
                const result = runCli(args, workspace);
                expect([0, 1], args.join(' ')).toContain(result.status);
                expect(() => JSON.parse(result.stdout), args.join(' ')).not.toThrow();
                expect(result.stderr, args.join(' ')).toBe('');
            }
        } finally {
            fs.rmSync(workspace, { recursive: true, force: true });
        }
    }, 60_000);

    it('suppresses ordinary warnings while preserving console.error', () => {
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

        enableSilentOutput();
        console.warn('ordinary non-fatal warning');
        console.error('failure diagnostic');

        expect(warning).not.toHaveBeenCalled();
        expect(error).toHaveBeenCalledWith('failure diagnostic');
    });

    it('restores console hooks after both asynchronous success and failure paths', async () => {
        const originalLog = console.log;
        const originalWarn = console.warn;

        enableSilentOutput();
        await Promise.resolve();
        restoreOutput();
        expect(console.log).toBe(originalLog);
        expect(console.warn).toBe(originalWarn);
        expect(isSilentOutput()).toBe(false);

        enableSilentOutput();
        try {
            await Promise.reject(new Error('expected asynchronous failure'));
        } catch (error) {
            expect(error).toBeInstanceOf(Error);
        } finally {
            restoreOutput();
        }
        expect(console.log).toBe(originalLog);
        expect(console.warn).toBe(originalWarn);
        expect(isSilentOutput()).toBe(false);
    });
});
