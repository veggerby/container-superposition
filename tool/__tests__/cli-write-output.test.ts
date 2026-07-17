import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
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

function outputOf(result: { stdout: string; stderr: string }): string {
    return `${result.stdout}\n${result.stderr}`;
}

describe('init/regen output relevance', () => {
    let repoDir: string;

    beforeEach(() => {
        repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-write-output-'));
    });

    afterEach(() => {
        fs.rmSync(repoDir, { recursive: true, force: true });
    });

    it('clean first-run init omits next-step and manual-review filler', () => {
        const result = runCli(['init', '--stack', 'plain', '--language', 'nodejs'], repoDir);
        const output = outputOf(result);

        expect(result.status).toBe(0);
        expect(output).not.toContain('Recommended next action');
        expect(output).not.toContain('Next step');
        expect(output).not.toContain('Manual review');
        expect(output).not.toContain('No next step suggested');
        expect(output).not.toContain('cs doctor');
        expect(output).not.toContain('Reopen in Container');
    });

    it('clean changed regen prefers reviewing generated diff', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({ stack: 'plain', overlays: ['nodejs'], outputPath: './.devcontainer' })
        );
        expect(runCli(['regen'], repoDir).status).toBe(0);

        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'plain',
                overlays: ['nodejs', 'git-helpers'],
                outputPath: './.devcontainer',
            })
        );

        const result = runCli(['regen'], repoDir);
        const output = outputOf(result);

        expect(result.status).toBe(0);
        expect(output).toContain('Next step\nreview generated diff');
        expect(output).toContain('confirm regenerated files match the intended setup change');
        expect(output).not.toContain('cs doctor');
        expect(output).not.toContain('No next step suggested');
    });

    it('clean no-op regen omits next-step guidance and duplicate intro boxes', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({ stack: 'plain', overlays: ['nodejs'], outputPath: './.devcontainer' })
        );
        expect(runCli(['regen'], repoDir).status).toBe(0);

        const result = runCli(['regen'], repoDir);
        const output = outputOf(result);

        expect(result.status).toBe(0);
        expect(output).not.toContain('Recommended next action');
        expect(output).not.toContain('Next step');
        expect(output).not.toContain('Manual review');
        expect(output).not.toContain('No next step suggested');
        expect(output).not.toContain('Regenerating from Project File (No Interactive)');
        expect(output).not.toContain('Running from Project Config');
        expect(output).not.toContain('Running in CLI mode');
    });

    it('shows doctor only when generation warnings justify it', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'plain',
                overlays: ['nodejs', 'docker-sock'],
                outputPath: './.devcontainer',
            })
        );

        const result = runCli(['regen'], repoDir);
        const output = outputOf(result);

        expect(result.status).toBe(0);
        expect(output).toContain('Next step\ncs doctor');
        expect(output).toContain('follow up on generation warnings');
    });
});
