import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { doctorCommand } from '../commands/doctor.js';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const TSX_CLI = path.join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');

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

function combinedOutput(result: { stdout: string; stderr: string }): string {
    return `${result.stdout}\n${result.stderr}`;
}

describe('doctor git-tracking safety', () => {
    const overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
    let repoDir: string;

    beforeEach(() => {
        repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-git-safety-'));
        execFileSync('git', ['init'], { cwd: repoDir, stdio: 'ignore' });
        execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoDir });
        execFileSync('git', ['config', 'user.name', 'Test'], { cwd: repoDir });
    });

    afterEach(() => {
        fs.rmSync(repoDir, { recursive: true, force: true });
    });

    it('doctor warns when ignored generated output is still tracked', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({ stack: 'plain', overlays: ['nodejs'], devcontainerGitignore: true })
        );
        fs.mkdirSync(path.join(repoDir, '.devcontainer'), { recursive: true });
        fs.writeFileSync(path.join(repoDir, '.devcontainer', 'devcontainer.json'), '{}\n');
        execFileSync('git', ['add', 'superposition.yml', '.devcontainer/devcontainer.json'], {
            cwd: repoDir,
        });

        const result = runCli(['doctor'], repoDir);
        const output = combinedOutput(result);

        expect(output).toContain('Generated output tracked by Git');
        expect(output).toContain('git rm -r --cached -- .devcontainer');
    });

    it('doctor --fix --dry-run previews root gitignore append for local config', async () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({ stack: 'plain', overlays: ['nodejs'] })
        );
        fs.writeFileSync(path.join(repoDir, 'superposition.local.yml'), 'env:\n  DEBUG: "true"\n');

        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: any) => {
            throw new Error(`process.exit(${code})`);
        });

        try {
            await doctorCommand(overlaysConfig, OVERLAYS_DIR, {
                output: path.join(repoDir, '.devcontainer'),
                projectRoot: repoDir,
                fix: true,
                dryRun: true,
            });
        } catch (err: any) {
            expect(err.message).toContain('process.exit(');
        }

        const output = consoleLogSpy.mock.calls.join('\n');
        consoleLogSpy.mockRestore();
        processExitSpy.mockRestore();

        expect(output).toContain('Local config not ignored by Git');
        expect(output).toContain('Append superposition.local.yml to root .gitignore');
        expect(output).toContain('Project fix preview — No files changed');
        expect(fs.existsSync(path.join(repoDir, '.gitignore'))).toBe(false);
    });

    it('doctor --fix writes root gitignore but leaves tracked local config as manual follow-up', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({ stack: 'plain', overlays: ['nodejs'] })
        );
        fs.writeFileSync(path.join(repoDir, 'superposition.local.yml'), 'env:\n  DEBUG: "true"\n');
        execFileSync('git', ['add', 'superposition.yml', 'superposition.local.yml'], {
            cwd: repoDir,
        });

        const result = runCli(['doctor', '--fix'], repoDir);
        const output = combinedOutput(result);

        expect(fs.readFileSync(path.join(repoDir, '.gitignore'), 'utf8')).toContain(
            'superposition.local.yml'
        );
        expect(output).toContain('Local-only config tracked by Git');
        expect(output).toContain('git rm --cached -- superposition.local.yml');
    });
});
