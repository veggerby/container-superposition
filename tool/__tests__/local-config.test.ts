import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { composeDevContainer } from '../questionnaire/composer.js';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import {
    applyLocalConfigToAnswers,
    findIgnoredLocalProjectConfig,
    loadLocalProjectConfig,
} from '../schema/project-config.js';
import { listTrackedFilesUnder } from '../utils/git.js';
import type { QuestionnaireAnswers } from '../schema/types.js';

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

function combinedOutput(result: { stdout: string; stderr: string }): string {
    return `${result.stdout}\n${result.stderr}`;
}

function countOccurrences(text: string, token: string): number {
    return text.split(token).length - 1;
}

describe('Local superposition config', () => {
    const overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
    let repoDir: string;

    beforeEach(() => {
        repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'local-config-'));
    });

    afterEach(() => {
        fs.rmSync(repoDir, { recursive: true, force: true });
    });

    it('loads allowed fields and treats empty local config as valid', () => {
        fs.writeFileSync(path.join(repoDir, 'superposition.local.yml'), '');
        expect(loadLocalProjectConfig(repoDir)?.selection).toEqual({});

        fs.writeFileSync(
            path.join(repoDir, 'superposition.local.yml'),
            yaml.dump({
                env: { DEBUG: { value: 'true', target: 'remoteEnv' } },
                mounts: [{ source: '${HOME}/.codex', destination: '/home/vscode/.codex' }],
                shell: { aliases: { cx: 'codex' } },
                customizations: {
                    devcontainerPatch: { customizations: { vscode: { settings: { foo: 'bar' } } } },
                },
                portOffset: 300,
                ports: [],
            })
        );

        const loaded = loadLocalProjectConfig(repoDir);
        expect(loaded?.selection.env?.DEBUG.value).toBe('true');
        expect(loaded?.selection.mounts).toHaveLength(1);
        expect(loaded?.selection.shell?.aliases?.cx).toBe('codex');
        expect(loaded?.selection.portOffset).toBe(300);
        expect(loaded?.selection.ports).toEqual([]);
    });

    it('rejects unsupported keys with local-specific error', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.local.yml'),
            yaml.dump({ stack: 'compose', overlays: ['nodejs'] })
        );

        expect(() => loadLocalProjectConfig(repoDir)).toThrow(
            'Unsupported local config keys in superposition.local.yml: stack, overlays'
        );
        expect(() => loadLocalProjectConfig(repoDir)).toThrow(
            'Allowed top-level keys: $schema, env, mounts, shell, customizations, portOffset, ports.'
        );
    });

    it('detects unsupported dotfile local config without applying it', () => {
        fs.writeFileSync(path.join(repoDir, '.superposition.local.yml'), 'env:\n  FOO: bar\n');
        expect(findIgnoredLocalProjectConfig(repoDir)?.fileName).toBe('.superposition.local.yml');
        expect(loadLocalProjectConfig(repoDir)).toBeNull();
    });

    it('applies local port overrides, env override, mount append, shell merge, and customization merge', () => {
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
            outputPath: '.devcontainer',
            portOffset: 100,
            projectEnv: { DEBUG: { value: 'false', target: 'remoteEnv' } },
            projectPorts: [{ value: '8080' }],
            projectMounts: [{ source: './shared', destination: '/shared' }],
            projectShell: { aliases: { cx: 'old' }, snippets: ['echo shared'] },
            customizations: {
                devcontainerPatch: { customizations: { vscode: { settings: { a: 1 } } } },
            },
        };

        const merged = applyLocalConfigToAnswers(answers, {
            portOffset: 300,
            env: { DEBUG: { value: 'true', target: 'remoteEnv' } },
            ports: [{ value: '9000' }],
            mounts: [{ source: '${HOME}/.codex', destination: '/home/vscode/.codex' }],
            shell: { aliases: { cx: 'codex' }, snippets: ['echo local'] },
            customizations: {
                devcontainerPatch: { customizations: { vscode: { settings: { b: 2 } } } },
            },
        });

        expect(merged.portOffset).toBe(300);
        expect(merged.projectEnv?.DEBUG.value).toBe('true');
        expect(merged.projectPorts).toEqual([{ value: '9000' }]);
        expect(merged.projectMounts).toHaveLength(2);
        expect(merged.projectShell?.aliases?.cx).toBe('codex');
        expect(merged.projectShell?.snippets).toEqual(['echo shared', 'echo local']);
        expect(merged.customizations?.devcontainerPatch?.customizations?.vscode?.settings).toEqual({
            a: 1,
            b: 2,
        });

        const cleared = applyLocalConfigToAnswers(answers, { ports: [] });
        expect(cleared.projectPorts).toEqual([]);
        expect(cleared.portOffset).toBe(100);
    });

    it('local mount affects generated output without changing shared project config', async () => {
        const outputPath = path.join(repoDir, '.devcontainer');
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({ stack: 'plain', overlays: ['nodejs'], devcontainerGitignore: true })
        );
        const before = fs.readFileSync(path.join(repoDir, 'superposition.yml'), 'utf8');
        const local = loadLocalProjectConfig(repoDir);
        expect(local).toBeNull();

        fs.writeFileSync(
            path.join(repoDir, 'superposition.local.yml'),
            yaml.dump({
                mounts: [{ source: '${HOME}/.codex', destination: '/home/vscode/.codex' }],
            })
        );
        const loadedLocal = loadLocalProjectConfig(repoDir)!;
        const answers = applyLocalConfigToAnswers(
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
                devcontainerGitignore: true,
            },
            loadedLocal.selection
        );

        await composeDevContainer(answers, OVERLAYS_DIR);
        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
        );
        expect(devcontainer.mounts).toContain(
            'source=${HOME}/.codex,target=/home/vscode/.codex,type=bind'
        );
        expect(fs.readFileSync(path.join(repoDir, 'superposition.yml'), 'utf8')).toBe(before);
    });

    it('git utility detects tracked generated output and does not mutate index', () => {
        execFileSync('git', ['init'], { cwd: repoDir, stdio: 'ignore' });
        execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoDir });
        execFileSync('git', ['config', 'user.name', 'Test'], { cwd: repoDir });
        fs.mkdirSync(path.join(repoDir, '.devcontainer'));
        fs.writeFileSync(path.join(repoDir, '.devcontainer', 'devcontainer.json'), '{}\n');
        execFileSync('git', ['add', '.devcontainer/devcontainer.json'], { cwd: repoDir });

        const tracked = listTrackedFilesUnder(repoDir, '.devcontainer');
        expect(tracked.ok).toBe(true);
        expect(tracked.value).toContain('.devcontainer/devcontainer.json');
        expect(
            execFileSync('git', ['ls-files', '--', '.devcontainer'], {
                cwd: repoDir,
                encoding: 'utf8',
            })
        ).toContain('.devcontainer/devcontainer.json');
    });

    it('fresh init prints local trust contract once and applies local mount', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.local.yml'),
            yaml.dump({
                mounts: [{ source: '${HOME}/.codex', destination: '/home/vscode/.codex' }],
            })
        );

        const result = runCli(['init', '--stack', 'plain', '--language', 'nodejs'], repoDir);
        const output = combinedOutput(result);
        expect(result.status).toBe(0);
        expect(countOccurrences(output, 'Local-only config trust')).toBe(1);
        expect(output).toContain('path: superposition.local.yml');
        expect(output).toContain('applied fields:');
        expect(output).toContain('mounts');
        expect(output).toContain('disposition: Applied safely');
        expect(output).not.toContain('Local config detected: superposition.local.yml');
        expect(fs.readFileSync(path.join(repoDir, '.gitignore'), 'utf8')).toContain(
            'superposition.local.yml'
        );

        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(repoDir, '.devcontainer', 'devcontainer.json'), 'utf8')
        );
        expect(devcontainer.mounts).toContain(
            'source=${HOME}/.codex,target=/home/vscode/.codex,type=bind'
        );
        expect(fs.readFileSync(path.join(repoDir, '.superposition.yml'), 'utf8')).not.toContain(
            '.codex'
        );
    });

    it('fresh init fails before writes for invalid local key', () => {
        fs.mkdirSync(path.join(repoDir, '.devcontainer'));
        const outputFile = path.join(repoDir, '.devcontainer', 'devcontainer.json');
        fs.writeFileSync(outputFile, '{"before":true}\n');
        fs.writeFileSync(path.join(repoDir, 'superposition.local.yml'), 'stack: compose\n');

        const result = runCli(['init', '--stack', 'plain', '--language', 'nodejs'], repoDir);
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain(
            'Unsupported local config keys in superposition.local.yml: stack'
        );
        expect(fs.existsSync(path.join(repoDir, '.superposition.yml'))).toBe(false);
        expect(fs.readFileSync(outputFile, 'utf8')).toBe('{"before":true}\n');
    });

    it('regen applies local port overrides only to generated output and not shared persistence', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                overlays: ['postgres'],
                devcontainerGitignore: true,
                portOffset: 100,
                ports: ['9000:9000'],
            })
        );
        const before = fs.readFileSync(path.join(repoDir, 'superposition.yml'), 'utf8');
        fs.writeFileSync(
            path.join(repoDir, 'superposition.local.yml'),
            yaml.dump({
                portOffset: 300,
                ports: [],
            })
        );

        const result = runCli(['regen'], repoDir);
        expect(result.status).toBe(0);
        expect(fs.readFileSync(path.join(repoDir, 'superposition.yml'), 'utf8')).toBe(before);

        const manifest = JSON.parse(
            fs.readFileSync(path.join(repoDir, '.devcontainer', 'superposition.json'), 'utf8')
        ) as { portOffset?: number };
        expect(manifest.portOffset).toBe(100);

        const compose = fs.readFileSync(
            path.join(repoDir, '.devcontainer', 'docker-compose.yml'),
            'utf8'
        );
        expect(compose).not.toContain('9000:9000');
        expect(compose).toContain('5732:5432');
        expect(compose).not.toContain('5532:5432');
    });

    it('regen prints local trust contract once and adds root gitignore entry', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({ stack: 'plain', overlays: ['nodejs'], devcontainerGitignore: true })
        );
        fs.writeFileSync(
            path.join(repoDir, 'superposition.local.yml'),
            yaml.dump({
                mounts: [{ source: '${HOME}/.codex', destination: '/home/vscode/.codex' }],
            })
        );

        const result = runCli(['regen'], repoDir);
        const output = combinedOutput(result);
        expect(result.status).toBe(0);
        expect(countOccurrences(output, 'Local-only config trust')).toBe(1);
        expect(output).toContain('path: superposition.local.yml');
        expect(output).toContain('applied fields:');
        expect(output).toContain('mounts');
        expect(output).toContain('git-ignore safety: present');
        expect(output).toContain('disposition: Applied safely');
        expect(output).not.toContain('Local config detected: superposition.local.yml');
        expect(fs.readFileSync(path.join(repoDir, '.gitignore'), 'utf8')).toContain(
            'superposition.local.yml'
        );
        expect(fs.readFileSync(path.join(repoDir, '.devcontainer', '.gitignore'), 'utf8')).toBe(
            '*\n'
        );
    });

    it('no-scaffold still adds root gitignore entry when local config exists', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.local.yml'),
            yaml.dump({
                mounts: [{ source: '${HOME}/.codex', destination: '/home/vscode/.codex' }],
            })
        );

        const result = runCli(
            ['init', '--stack', 'plain', '--language', 'nodejs', '--no-scaffold'],
            repoDir
        );
        expect(result.status).toBe(0);
        expect(fs.readFileSync(path.join(repoDir, '.gitignore'), 'utf8')).toContain(
            'superposition.local.yml'
        );
        expect(fs.existsSync(path.join(repoDir, '.devcontainer', 'devcontainer.json'))).toBe(false);
    });

    it('regen fails before writes for invalid local key', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({ stack: 'plain', overlays: ['nodejs'] })
        );
        fs.mkdirSync(path.join(repoDir, '.devcontainer'));
        const outputFile = path.join(repoDir, '.devcontainer', 'devcontainer.json');
        fs.writeFileSync(outputFile, '{"before":true}\n');
        fs.writeFileSync(path.join(repoDir, 'superposition.local.yml'), 'stack: compose\n');

        const result = runCli(['regen'], repoDir);
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain(
            'Unsupported local config keys in superposition.local.yml: stack'
        );
        expect(fs.readFileSync(outputFile, 'utf8')).toBe('{"before":true}\n');
    });

    it('regen trust contract stays preventive even when generated files are tracked', () => {
        execFileSync('git', ['init'], { cwd: repoDir, stdio: 'ignore' });
        execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: repoDir });
        execFileSync('git', ['config', 'user.name', 'Test'], { cwd: repoDir });
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'plain',
                overlays: ['nodejs'],
                outputPath: '.',
                devcontainerGitignore: true,
            })
        );
        execFileSync('git', ['add', 'superposition.yml'], { cwd: repoDir });
        fs.writeFileSync(path.join(repoDir, 'superposition.local.yml'), 'env:\n  DEBUG: "true"\n');

        const result = runCli(['regen'], repoDir);
        const output = combinedOutput(result);
        expect(result.status).toBe(0);
        expect(countOccurrences(output, 'Local-only config trust')).toBe(1);
        expect(output).toContain('tracked-file cleanup: not needed');
        expect(output).toContain('disposition: Applied safely');
        expect(output).not.toContain('Local config detected: superposition.local.yml');
        expect(output).not.toContain('git rm -r --cached --');
    });

    it('keeps single trust contract when local config exists without devcontainerGitignore', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({ stack: 'plain', overlays: ['nodejs'] })
        );
        fs.writeFileSync(path.join(repoDir, 'superposition.local.yml'), 'env:\n  DEBUG: "true"\n');

        const result = runCli(['regen'], repoDir);
        const output = combinedOutput(result);
        expect(result.status).toBe(0);
        expect(countOccurrences(output, 'Local-only config trust')).toBe(1);
        expect(output).toContain('git-ignore safety: present');
        expect(output).toContain('tracked-file cleanup: not needed');
        expect(output).toContain('disposition: Applied safely');
        expect(output).not.toContain('Local config detected: superposition.local.yml');
    });
});
