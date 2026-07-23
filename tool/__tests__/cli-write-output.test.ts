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

    it('keeps read-only JSON commands parseable when stdout is piped', () => {
        fs.writeFileSync(path.join(repoDir, 'README.md'), 'discovery workspace\n');

        const listResult = runCli(['list', '--json'], repoDir);
        expect(listResult.status).toBe(0);
        expect(() => JSON.parse(listResult.stdout)).not.toThrow();

        const explainResult = runCli(['explain', 'postgres', '--json'], repoDir);
        expect(explainResult.status).toBe(0);
        const explainJson = JSON.parse(explainResult.stdout);
        expect(explainJson.overlay.dockerComposeServices).toContain('postgres');

        fs.mkdirSync(path.join(repoDir, '.devcontainer'), { recursive: true });
        fs.writeFileSync(
            path.join(repoDir, '.devcontainer', 'devcontainer.json'),
            JSON.stringify(
                {
                    $schema:
                        'https://raw.githubusercontent.com/devcontainers/spec/main/schemas/devContainer.base.schema.json',
                    image: 'mcr.microsoft.com/devcontainers/javascript-node:1-20-bookworm',
                    features: {
                        'ghcr.io/devcontainers/features/node:1': {
                            version: 'lts',
                        },
                    },
                },
                null,
                2
            )
        );

        const adoptResult = runCli(['adopt', '--dir', '.devcontainer', '--json'], repoDir);
        expect(adoptResult.status).toBe(0);
        expect(() => JSON.parse(adoptResult.stdout)).not.toThrow();
    });

    it('keeps plan --from-manifest instance-aware for named overlay selections', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                overlays: [
                    'nodejs',
                    { overlay: 'postgres', name: 'app', parameters: { POSTGRES_DB: 'app' } },
                    {
                        overlay: 'postgres',
                        name: 'analytics',
                        parameters: { POSTGRES_DB: 'analytics', POSTGRES_PORT: '5433' },
                    },
                ],
                outputPath: './.devcontainer',
            })
        );

        expect(runCli(['regen'], repoDir).status).toBe(0);

        const jsonResult = runCli(
            ['plan', '--from-manifest', '.devcontainer/superposition.json', '--json'],
            repoDir
        );
        expect(jsonResult.status).toBe(0);
        const jsonStart = jsonResult.stdout.indexOf('{');
        expect(jsonStart).toBeGreaterThanOrEqual(0);
        const planJson = JSON.parse(jsonResult.stdout.slice(jsonStart));
        expect(planJson.selectedOverlays).toEqual(['nodejs', 'postgres']);
        expect(planJson.selectedOverlayLabels).toEqual([
            'nodejs',
            'postgres:app',
            'postgres:analytics',
        ]);

        const textResult = runCli(
            ['plan', '--from-manifest', '.devcontainer/superposition.json'],
            repoDir
        );
        expect(textResult.status).toBe(0);
        const output = outputOf(textResult);
        expect(output).toContain('resolved overlays: nodejs, postgres:app, postgres:analytics');
    });
});
