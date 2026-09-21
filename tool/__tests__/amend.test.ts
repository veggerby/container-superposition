import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '..', '..');
const tsxCli = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');

function workspace(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'cs-amend-'));
}

function namedWorkspace(name: string): string {
    const root = path.join(os.tmpdir(), `${name}-${cryptoRandomSuffix()}`);
    fs.mkdirSync(root, { recursive: true });
    return root;
}

function cryptoRandomSuffix(): string {
    return `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function quotePosixShellArg(value: string): string {
    if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
    return `'${value.replace(/'/g, `'\\''`)}'`;
}

function runCli(cwd: string, args: string[], env: Record<string, string> = {}) {
    return spawnSync(
        process.execPath,
        [tsxCli, path.join(repoRoot, 'scripts', 'init.ts'), ...args],
        {
            cwd,
            env: { ...process.env, FORCE_COLOR: '0', ...env },
            encoding: 'utf8',
        }
    );
}

function git(cwd: string, args: string[]) {
    return spawnSync('git', args, { cwd, encoding: 'utf8' });
}

function writeBase(
    root: string,
    config: Record<string, unknown> = { image: 'mcr.microsoft.com/devcontainers/base:bookworm' }
) {
    fs.mkdirSync(path.join(root, '.devcontainer'), { recursive: true });
    fs.writeFileSync(
        path.join(root, '.devcontainer', 'devcontainer.json'),
        `${JSON.stringify(config, null, 4)}\n`
    );
}

function defaultAlternatePath(root: string): string {
    return path.join(root, '.devcontainer', 'superposition-local', 'devcontainer.json');
}

function nonDefaultAlternatePath(root: string): string {
    return path.join(root, 'infra', 'dev', 'superposition-local', 'devcontainer.json');
}

function rootBaseAlternatePath(root: string): string {
    return path.join(root, '.container-superposition', 'amendment', 'devcontainer.json');
}

describe('amend command', () => {
    it('accepts JSONC comments and trailing commas in the team-owned base devcontainer', () => {
        const root = workspace();
        try {
            fs.mkdirSync(path.join(root, '.devcontainer'), { recursive: true });
            fs.writeFileSync(
                path.join(root, '.devcontainer', 'devcontainer.json'),
                [
                    '{',
                    '  // VS Code-created devcontainer files may contain comments.',
                    '  /* Keep valid block comments when parsing JSONC input. */',
                    '  "image": "mcr.microsoft.com/devcontainers/base:bookworm",',
                    '  "notes": "https://example.com/path?x=1 // not a comment and \\"quoted\\" text",',
                    '  "remoteEnv": {',
                    '    "TEAM": "1",',
                    '  },',
                    '}',
                    '',
                ].join('\n')
            );
            git(root, ['init']);
            const init = runCli(root, ['amend', 'init']);
            expect(init.status).toBe(0);
            const alternate = JSON.parse(fs.readFileSync(defaultAlternatePath(root), 'utf8'));
            expect(alternate.remoteEnv.TEAM).toBe('1');
            expect(alternate.notes).toBe(
                'https://example.com/path?x=1 // not a comment and "quoted" text'
            );
            expect(
                fs.readFileSync(path.join(root, '.devcontainer', 'devcontainer.json'), 'utf8')
            ).toContain('// VS Code-created devcontainer files may contain comments.');
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('rejects unterminated JSONC block comments before creating amendment artifacts', () => {
        const root = workspace();
        try {
            fs.mkdirSync(path.join(root, '.devcontainer'), { recursive: true });
            fs.writeFileSync(
                path.join(root, '.devcontainer', 'devcontainer.json'),
                '{\n  "image": "mcr.microsoft.com/devcontainers/base:bookworm"\n  /* missing terminator\n}\n'
            );
            git(root, ['init']);
            const excludeRel = git(root, ['rev-parse', '--git-path', 'info/exclude']).stdout.trim();
            const excludePath = path.join(root, excludeRel);
            const excludeBefore = fs.readFileSync(excludePath, 'utf8');

            const init = runCli(root, ['amend', 'init']);

            expect(init.status).not.toBe(0);
            expect(init.stderr).toContain('Unterminated JSONC block comment');
            expect(fs.existsSync(path.join(root, '.container-superposition'))).toBe(false);
            expect(fs.existsSync(defaultAlternatePath(root))).toBe(false);
            expect(fs.readFileSync(excludePath, 'utf8')).toBe(excludeBefore);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('creates and refreshes a local-only Pi-style amendment without changing team base or Git index', () => {
        const root = workspace();
        try {
            writeBase(root, {
                image: 'mcr.microsoft.com/devcontainers/base:bookworm',
                remoteEnv: { TEAM: '1' },
            });
            git(root, ['init']);
            const baseBefore = fs.readFileSync(
                path.join(root, '.devcontainer', 'devcontainer.json'),
                'utf8'
            );
            const init = runCli(root, ['amend', 'init']);
            expect(init.status).toBe(0);
            expect(init.stdout).toContain('Local devcontainer amendment initialized');
            expect(
                fs.existsSync(path.join(root, '.container-superposition', 'amendment.yml'))
            ).toBe(true);
            expect(
                fs.readFileSync(path.join(root, '.devcontainer', 'devcontainer.json'), 'utf8')
            ).toBe(baseBefore);

            fs.writeFileSync(
                path.join(root, '.container-superposition', 'amendment.yml'),
                [
                    '$schema: https://raw.githubusercontent.com/veggerby/container-superposition/main/tool/schema/superposition.local.schema.json',
                    'env:',
                    '  PI_HOME: ${localEnv:HOME}/.pi',
                    'mounts:',
                    '  - source=${localEnv:HOME}/.pi,target=/home/vscode/.pi,type=bind',
                    'vscodeExtensions:',
                    '  - ms-vscode.test-adapter-converter',
                    'customizations:',
                    '  devcontainerPatch:',
                    '    customizations:',
                    '      vscode:',
                    '        settings:',
                    '          pi.enabled: true',
                    '',
                ].join('\n')
            );
            const refresh = runCli(root, ['amend', 'refresh']);
            expect(refresh.status).toBe(0);
            const alternatePath = defaultAlternatePath(root);
            const alternate = JSON.parse(fs.readFileSync(alternatePath, 'utf8'));
            expect(alternate.image).toContain('devcontainers/base');
            expect(alternate.remoteEnv).toMatchObject({
                TEAM: '1',
                PI_HOME: '${localEnv:HOME}/.pi',
            });
            expect(alternate.mounts).toContain(
                'source=${localEnv:HOME}/.pi,target=/home/vscode/.pi,type=bind'
            );
            expect(alternate.customizations.vscode.extensions).toContain(
                'ms-vscode.test-adapter-converter'
            );
            expect(alternate.customizations.vscode.settings['pi.enabled']).toBe(true);
            expect(
                fs.readFileSync(path.join(root, '.devcontainer', 'devcontainer.json'), 'utf8')
            ).toBe(baseBefore);
            expect(git(root, ['diff', '--cached', '--name-only']).stdout).toBe('');
            expect(
                git(root, ['check-ignore', '-v', '--', '.container-superposition/amendment.yml'])
                    .status
            ).toBe(0);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('refresh is deterministic and remove restores default discovery while retaining input', () => {
        const root = workspace();
        try {
            writeBase(root);
            git(root, ['init']);
            expect(runCli(root, ['amend', 'init']).status).toBe(0);
            fs.writeFileSync(
                path.join(root, '.container-superposition', 'amendment.yml'),
                'mounts:\n  - source=pi,target=/pi,type=volume\n'
            );
            expect(runCli(root, ['amend', 'refresh']).status).toBe(0);
            const alternatePath = defaultAlternatePath(root);
            const statePath = path.join(root, '.container-superposition', 'amendment-state.json');
            const first =
                fs.readFileSync(alternatePath, 'utf8') + fs.readFileSync(statePath, 'utf8');
            expect(runCli(root, ['amend', 'refresh']).status).toBe(0);
            const second =
                fs.readFileSync(alternatePath, 'utf8') + fs.readFileSync(statePath, 'utf8');
            expect(second).toBe(first);
            const remove = runCli(root, ['amend', 'remove']);
            expect(remove.status).toBe(0);
            expect(fs.existsSync(alternatePath)).toBe(false);
            expect(
                fs.existsSync(path.join(root, '.container-superposition', 'amendment.yml'))
            ).toBe(true);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('migrates a missing legacy alternate config receipt during refresh', () => {
        const root = workspace();
        try {
            writeBase(root);
            git(root, ['init']);
            expect(runCli(root, ['amend', 'init']).status).toBe(0);

            const statePath = path.join(root, '.container-superposition', 'amendment-state.json');
            const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
            const legacyPath = '.devcontainer/devcontainer.superposition-local.json';
            fs.rmSync(defaultAlternatePath(root));
            state.generatedArtifacts = [legacyPath];
            state.generatedArtifactSha256 = { [legacyPath]: 'missing-legacy-artifact' };
            fs.writeFileSync(statePath, `${JSON.stringify(state, null, 4)}\n`);

            const refresh = runCli(root, ['amend', 'refresh']);
            expect(refresh.status).toBe(0);
            expect(fs.existsSync(defaultAlternatePath(root))).toBe(true);
            expect(fs.existsSync(path.join(root, legacyPath))).toBe(false);
            const migratedState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
            expect(migratedState.generatedArtifacts).toEqual([
                '.devcontainer/superposition-local/devcontainer.json',
            ]);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('refreshes and removes a non-default base using the receipt path', () => {
        const root = workspace();
        try {
            fs.mkdirSync(path.join(root, 'infra', 'dev'), { recursive: true });
            fs.writeFileSync(
                path.join(root, 'infra', 'dev', 'devcontainer.json'),
                '{"image":"mcr.microsoft.com/devcontainers/base:bookworm"}\n'
            );
            git(root, ['init']);
            expect(
                runCli(root, ['amend', 'init', '--base', 'infra/dev/devcontainer.json']).status
            ).toBe(0);
            fs.writeFileSync(
                path.join(root, '.container-superposition', 'amendment.yml'),
                'env:\n  PI_HOME: /pi\n'
            );
            expect(runCli(root, ['amend', 'refresh']).status).toBe(0);
            expect(fs.existsSync(nonDefaultAlternatePath(root))).toBe(true);
            expect(runCli(root, ['amend', 'remove']).status).toBe(0);
            expect(fs.existsSync(nonDefaultAlternatePath(root))).toBe(false);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('refreshes and removes a root .devcontainer.json base using the receipt path', () => {
        const root = workspace();
        try {
            fs.writeFileSync(
                path.join(root, '.devcontainer.json'),
                '{"image":"mcr.microsoft.com/devcontainers/base:bookworm"}\n'
            );
            git(root, ['init']);
            expect(runCli(root, ['amend', 'init']).status).toBe(0);
            fs.writeFileSync(
                path.join(root, '.container-superposition', 'amendment.yml'),
                'env:\n  PI_HOME: /pi\n'
            );
            expect(runCli(root, ['amend', 'refresh']).status).toBe(0);
            const alternatePath = rootBaseAlternatePath(root);
            expect(fs.existsSync(alternatePath)).toBe(true);
            const alternate = JSON.parse(fs.readFileSync(alternatePath, 'utf8'));
            expect(alternate.remoteEnv?.PI_HOME).toBe('/pi');
            expect(runCli(root, ['amend', 'remove']).status).toBe(0);
            expect(fs.existsSync(alternatePath)).toBe(false);
            expect(
                fs.existsSync(path.join(root, '.container-superposition', 'amendment.yml'))
            ).toBe(true);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('rewrites build paths so moved alternate configs preserve team base relative semantics', () => {
        const root = workspace();
        try {
            fs.mkdirSync(path.join(root, '.devcontainer'), { recursive: true });
            fs.writeFileSync(path.join(root, '.devcontainer', 'Dockerfile'), 'FROM alpine\n');
            fs.mkdirSync(path.join(root, 'src'));
            writeBase(root, {
                build: {
                    dockerfile: 'Dockerfile',
                    context: '..',
                },
            });
            git(root, ['init']);

            expect(runCli(root, ['amend', 'init']).status).toBe(0);

            const alternate = JSON.parse(fs.readFileSync(defaultAlternatePath(root), 'utf8'));
            expect(alternate.build).toMatchObject({
                dockerfile: '../Dockerfile',
                context: '../..',
            });
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('rewrites local feature source keys while preserving remote feature IDs and options', () => {
        const root = workspace();
        const absoluteFeaturePath = path.join(root, 'absolute-feature');
        try {
            fs.mkdirSync(path.join(root, '.devcontainer', 'features', 'pelm-pipx-package'), {
                recursive: true,
            });
            fs.mkdirSync(path.join(root, 'shared-feature'), { recursive: true });
            fs.mkdirSync(absoluteFeaturePath, { recursive: true });
            writeBase(root, {
                image: 'mcr.microsoft.com/devcontainers/base:bookworm',
                features: {
                    '.\\features\\pelm-pipx-package': { packages: ['pelm'] },
                    '..\\shared-feature': {},
                    'ghcr.io/devcontainers/features/node:1': { version: 'lts' },
                    'https://example.com/features/tool.tgz': {},
                    [absoluteFeaturePath]: { absolute: true },
                },
            });
            git(root, ['init']);

            expect(runCli(root, ['amend', 'init']).status).toBe(0);

            const alternate = JSON.parse(fs.readFileSync(defaultAlternatePath(root), 'utf8'));
            expect(alternate.features).toEqual({
                '../features/pelm-pipx-package': { packages: ['pelm'] },
                '../../shared-feature': {},
                'ghcr.io/devcontainers/features/node:1': { version: 'lts' },
                'https://example.com/features/tool.tgz': {},
                [absoluteFeaturePath]: { absolute: true },
            });
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('rejects colliding feature source keys after relative path rewriting', () => {
        const root = workspace();
        try {
            writeBase(root, {
                image: 'mcr.microsoft.com/devcontainers/base:bookworm',
                features: {
                    './features/pelm-pipx-package': {},
                    '.\\features\\..\\features\\pelm-pipx-package': { packages: ['pelm'] },
                },
            });
            git(root, ['init']);

            const init = runCli(root, ['amend', 'init']);
            expect(init.status).not.toBe(0);
            expect(init.stderr).toContain(
                'Feature source path collision after rewriting relative keys'
            );
            expect(init.stderr).toContain('./features/pelm-pipx-package');
            expect(init.stderr).toContain('.\\features\\..\\features\\pelm-pipx-package');
            expect(init.stderr).toContain('../features/pelm-pipx-package');
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('supports compose overrides while preserving team compose files', () => {
        const root = workspace();
        try {
            fs.mkdirSync(path.join(root, '.devcontainer'), { recursive: true });
            fs.writeFileSync(
                path.join(root, 'docker-compose.yml'),
                'services:\n  app:\n    image: node:20\n'
            );
            fs.writeFileSync(
                path.join(root, 'docker-compose.extra.yml'),
                'services:\n  app:\n    environment:\n      TEAM: yes\n'
            );
            writeBase(root, {
                dockerComposeFile: ['../docker-compose.yml', '../docker-compose.extra.yml'],
                service: 'app',
                workspaceFolder: '/workspace',
            });
            git(root, ['init']);
            expect(runCli(root, ['amend', 'init']).status).toBe(0);
            fs.writeFileSync(
                path.join(root, '.container-superposition', 'amendment.yml'),
                'env:\n  PI_CACHE: /cache\nmounts:\n  - value: pi-cache:/pi-cache\n    target: composeVolume\n'
            );
            const refresh = runCli(root, ['amend', 'refresh']);
            expect(refresh.status).toBe(0);
            const alternate = JSON.parse(fs.readFileSync(defaultAlternatePath(root), 'utf8'));
            expect(alternate.remoteEnv?.PI_CACHE).toBeUndefined();
            expect(alternate.dockerComposeFile).toEqual([
                '../../docker-compose.yml',
                '../../docker-compose.extra.yml',
                '../../.container-superposition/amendment/docker-compose.override.yml',
            ]);
            const override = fs.readFileSync(
                path.join(
                    root,
                    '.container-superposition',
                    'amendment',
                    'docker-compose.override.yml'
                ),
                'utf8'
            );
            expect(override).toContain('PI_CACHE: /cache');
            expect(override).toContain('pi-cache:/pi-cache');
            expect(fs.readFileSync(path.join(root, 'docker-compose.yml'), 'utf8')).toContain(
                'image: node:20'
            );
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('stops before writes for ambiguous bases, shared authority, and tracked local paths', () => {
        const ambiguous = workspace();
        const shared = workspace();
        const tracked = workspace();
        try {
            writeBase(ambiguous);
            fs.writeFileSync(path.join(ambiguous, '.devcontainer.json'), '{}\n');
            const ambiguousResult = runCli(ambiguous, ['amend', 'init']);
            expect(ambiguousResult.status).not.toBe(0);
            expect(fs.existsSync(path.join(ambiguous, '.container-superposition'))).toBe(false);

            writeBase(shared);
            fs.mkdirSync(path.join(shared, '.devcontainer'), { recursive: true });
            fs.writeFileSync(
                path.join(shared, '.devcontainer', 'superposition.json'),
                '{"stack":"plain"}\n'
            );
            const sharedResult = runCli(shared, ['amend', 'init']);
            expect(sharedResult.status).not.toBe(0);
            expect(sharedResult.stderr).toContain('non-adopting repositories');

            writeBase(tracked);
            git(tracked, ['init']);
            fs.mkdirSync(path.join(tracked, '.container-superposition'));
            fs.writeFileSync(
                path.join(tracked, '.container-superposition', 'amendment.yml'),
                '$schema: test\n'
            );
            git(tracked, ['add', '.container-superposition/amendment.yml']);
            const trackedResult = runCli(tracked, ['amend', 'init']);
            expect(trackedResult.status).not.toBe(0);
            expect(trackedResult.stderr).toContain('git rm --cached');
            expect(
                fs.existsSync(
                    path.join(tracked, '.devcontainer', 'superposition-local', 'devcontainer.json')
                )
            ).toBe(false);
        } finally {
            for (const dir of [ambiguous, shared, tracked])
                fs.rmSync(dir, { recursive: true, force: true });
        }
    }, 30_000);

    it('rejects tampered receipts and refuses to remove unrelated content', () => {
        const root = workspace();
        try {
            writeBase(root);
            git(root, ['init']);
            expect(runCli(root, ['amend', 'init']).status).toBe(0);
            fs.writeFileSync(path.join(root, 'important.txt'), 'keep me\n');
            const statePath = path.join(root, '.container-superposition', 'amendment-state.json');
            const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
            state.generatedArtifacts = ['important.txt'];
            state.generatedArtifactSha256 = {
                'important.txt':
                    state.generatedArtifactSha256[state.generatedArtifacts[0]] ?? 'bad',
            };
            fs.writeFileSync(statePath, `${JSON.stringify(state, null, 4)}\n`);
            const remove = runCli(root, ['amend', 'remove']);
            expect(remove.status).not.toBe(0);
            expect(remove.stderr).toContain('Unexpected generated artifact path');
            expect(fs.readFileSync(path.join(root, 'important.txt'), 'utf8')).toBe('keep me\n');
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('rejects unowned generated-path collisions and symlinked local state before writes', () => {
        const collision = workspace();
        const symlinked = workspace();
        try {
            writeBase(collision);
            git(collision, ['init']);
            fs.mkdirSync(path.join(collision, '.devcontainer', 'superposition-local'));
            fs.writeFileSync(
                path.join(collision, '.devcontainer', 'superposition-local', 'devcontainer.json'),
                '{"unowned":true}\n'
            );
            const excludeRel = git(collision, [
                'rev-parse',
                '--git-path',
                'info/exclude',
            ]).stdout.trim();
            const excludePath = path.join(collision, excludeRel);
            const excludeBefore = fs.readFileSync(excludePath, 'utf8');
            const collisionResult = runCli(collision, ['amend', 'init']);
            expect(collisionResult.status).not.toBe(0);
            expect(collisionResult.stderr).toContain('Refusing to overwrite unowned');
            expect(
                fs.existsSync(path.join(collision, '.container-superposition', 'amendment.yml'))
            ).toBe(false);
            expect(
                fs.existsSync(
                    path.join(collision, '.container-superposition', 'amendment-state.json')
                )
            ).toBe(false);
            expect(fs.readFileSync(excludePath, 'utf8')).toBe(excludeBefore);

            writeBase(symlinked);
            git(symlinked, ['init']);
            fs.mkdirSync(path.join(symlinked, 'outside'));
            fs.symlinkSync(
                path.join(symlinked, 'outside'),
                path.join(symlinked, '.container-superposition')
            );
            const symlinkResult = runCli(symlinked, ['amend', 'init']);
            expect(symlinkResult.status).not.toBe(0);
            expect(symlinkResult.stderr).toContain('symlink component');
            expect(fs.existsSync(path.join(symlinked, 'outside', 'amendment.yml'))).toBe(false);
        } finally {
            for (const dir of [collision, symlinked])
                fs.rmSync(dir, { recursive: true, force: true });
        }
    }, 30_000);

    it('rejects symlinked local amendment receipt paths during inspect', () => {
        const root = workspace();
        try {
            writeBase(root);
            git(root, ['init']);
            fs.mkdirSync(path.join(root, 'outside'), { recursive: true });
            fs.writeFileSync(
                path.join(root, 'outside', 'amendment-state.json'),
                JSON.stringify({ basePath: '.devcontainer/devcontainer.json' }, null, 4)
            );
            fs.symlinkSync(path.join(root, 'outside'), path.join(root, '.container-superposition'));
            const inspect = runCli(root, ['amend', 'inspect']);
            expect(inspect.status).not.toBe(0);
            expect(inspect.stderr).toContain('symlink component');
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('rolls back the complete amendment set when refresh fails after artifact writes', () => {
        const root = workspace();
        try {
            writeBase(root);
            git(root, ['init']);
            expect(runCli(root, ['amend', 'init']).status).toBe(0);
            fs.writeFileSync(
                path.join(root, '.container-superposition', 'amendment.yml'),
                'env:\n  FIRST: one\n'
            );
            expect(runCli(root, ['amend', 'refresh']).status).toBe(0);
            const alternatePath = defaultAlternatePath(root);
            const statePath = path.join(root, '.container-superposition', 'amendment-state.json');
            const previousAlternate = fs.readFileSync(alternatePath, 'utf8');
            const previousState = fs.readFileSync(statePath, 'utf8');
            fs.writeFileSync(
                path.join(root, '.container-superposition', 'amendment.yml'),
                'env:\n  SECOND: two\n'
            );
            const failed = runCli(root, ['amend', 'refresh'], {
                CS_AMEND_INJECT_REFRESH_FAILURE_AFTER_WRITES: '1',
            });
            expect(failed.status).not.toBe(0);
            expect(fs.readFileSync(alternatePath, 'utf8')).toBe(previousAlternate);
            expect(fs.readFileSync(statePath, 'utf8')).toBe(previousState);
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('preserves supported postCreateCommand forms when adding shell enrichment', () => {
        const cases: Array<[string, unknown]> = [
            ['string', 'echo team'],
            ['array', ['echo', 'team']],
            ['object', { team: 'echo team' }],
        ];
        for (const [name, postCreateCommand] of cases) {
            const root = workspace();
            try {
                writeBase(root, {
                    image: 'mcr.microsoft.com/devcontainers/base:bookworm',
                    postCreateCommand,
                });
                git(root, ['init']);
                expect(runCli(root, ['amend', 'init']).status, name).toBe(0);
                fs.writeFileSync(
                    path.join(root, '.container-superposition', 'amendment.yml'),
                    "shell:\n  aliases:\n    ll: ls -la\n    quote: echo 'hello'\n  snippets:\n    - export PI_READY=1\n"
                );
                expect(runCli(root, ['amend', 'refresh']).status, name).toBe(0);
                const alternate = JSON.parse(fs.readFileSync(defaultAlternatePath(root), 'utf8'));
                if (name === 'object') {
                    expect(alternate.postCreateCommand.team, name).toBe('echo team');
                } else {
                    expect(alternate.postCreateCommand.default, name).toEqual(postCreateCommand);
                }
                expect(
                    alternate.postCreateCommand['container-superposition-local'],
                    name
                ).toContain('shell.sh');
                const hook = fs.readFileSync(
                    path.join(root, '.container-superposition', 'amendment', 'shell.sh'),
                    'utf8'
                );
                const init = fs.readFileSync(
                    path.join(root, '.container-superposition', 'amendment', 'shell-init.sh'),
                    'utf8'
                );
                expect(hook).toContain('install_hook "$HOME/.bashrc"');
                expect(hook).toContain('source "$SHELL_INIT_FILE"');
                expect(hook).not.toContain('/usr/local/share');
                expect(init).toContain("alias ll='ls -la'");
                expect(init).toContain("alias quote='echo '\"'\"'hello'\"'\"''");
                expect(init).toContain('export PI_READY=1');
                const state = JSON.parse(
                    fs.readFileSync(
                        path.join(root, '.container-superposition', 'amendment-state.json'),
                        'utf8'
                    )
                );
                expect(state.generatedArtifacts).toContain(
                    '.container-superposition/amendment/shell-init.sh'
                );
            } finally {
                fs.rmSync(root, { recursive: true, force: true });
            }
        }
    }, 30_000);

    it('does not mutate Git exclude when refresh input validation fails', () => {
        const root = workspace();
        try {
            writeBase(root);
            git(root, ['init']);
            expect(runCli(root, ['amend', 'init']).status).toBe(0);
            const excludeRel = git(root, ['rev-parse', '--git-path', 'info/exclude']).stdout.trim();
            const excludePath = path.join(root, excludeRel);
            fs.writeFileSync(excludePath, '');
            fs.writeFileSync(
                path.join(root, '.container-superposition', 'amendment.yml'),
                'unsupportedKey: true\n'
            );
            const refresh = runCli(root, ['amend', 'refresh']);
            expect(refresh.status).not.toBe(0);
            expect(refresh.stderr).toContain('Unsupported local amendment keys');
            expect(fs.readFileSync(excludePath, 'utf8')).toBe('');
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('prints project-root launch guidance for the selected repository when invoked elsewhere', () => {
        const root = workspace();
        const outside = workspace();
        try {
            writeBase(root);
            git(root, ['init']);
            const configPath = defaultAlternatePath(root);
            const expectedCommand = `devcontainer up --workspace-folder ${root} --config ${configPath}`;
            const init = runCli(outside, ['amend', 'init', '--project-root', root]);
            expect(init.status).toBe(0);
            expect(init.stdout).toContain(expectedCommand);
            expect(init.stdout).not.toContain('--workspace-folder .');
            const inspect = runCli(outside, ['amend', 'inspect', '--project-root', root, '--json']);
            expect(inspect.status).toBe(0);
            const inspected = JSON.parse(inspect.stdout);
            expect(inspected.launchCommand).toBe(expectedCommand);
        } finally {
            for (const dir of [root, outside]) fs.rmSync(dir, { recursive: true, force: true });
        }
    }, 30_000);

    it('shell-quotes launch guidance for project paths with spaces and shell-sensitive characters', () => {
        const root = namedWorkspace("cs amend shell $HOME & 'repo");
        const outside = workspace();
        try {
            writeBase(root);
            git(root, ['init']);
            const configPath = defaultAlternatePath(root);
            const expectedCommand = `devcontainer up --workspace-folder ${quotePosixShellArg(root)} --config ${quotePosixShellArg(configPath)}`;
            const init = runCli(outside, ['amend', 'init', '--project-root', root]);
            expect(init.status).toBe(0);
            expect(init.stdout).toContain(`Launch with: ${expectedCommand}`);
            expect(init.stdout).not.toContain(`--workspace-folder ${root} --config ${configPath}`);

            const inspect = runCli(outside, ['amend', 'inspect', '--project-root', root, '--json']);
            expect(inspect.status).toBe(0);
            const inspected = JSON.parse(inspect.stdout);
            expect(inspected.launchCommand).toBe(expectedCommand);
        } finally {
            for (const dir of [root, outside]) fs.rmSync(dir, { recursive: true, force: true });
        }
    }, 30_000);

    it('reports wrong ignore provenance as unsafe during inspect', () => {
        const root = workspace();
        try {
            writeBase(root);
            git(root, ['init']);
            expect(runCli(root, ['amend', 'init']).status).toBe(0);
            const exclude = git(root, ['rev-parse', '--git-path', 'info/exclude']).stdout.trim();
            fs.writeFileSync(path.join(root, exclude), '');
            fs.writeFileSync(
                path.join(root, '.gitignore'),
                '.container-superposition/\n.devcontainer/superposition-local/devcontainer.json\n'
            );
            const inspect = runCli(root, ['amend', 'inspect', '--json']);
            expect(inspect.status).toBe(0);
            const result = JSON.parse(inspect.stdout);
            expect(result.status).toBe('unsafe/git protection missing or wrong');
            expect(
                result.git.ignoreProvenance.some((entry: { expected: boolean }) => !entry.expected)
            ).toBe(true);
            const inspectHuman = runCli(root, ['amend', 'inspect']);
            expect(inspectHuman.status).toBe(0);
            expect(inspectHuman.stdout).toContain(
                'Git protection warning: expected worktree-local excludes'
            );
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('rejects unsupported amendment-only fields instead of silently discarding them', () => {
        const root = workspace();
        try {
            writeBase(root);
            git(root, ['init']);
            expect(runCli(root, ['amend', 'init']).status).toBe(0);
            fs.writeFileSync(
                path.join(root, '.container-superposition', 'amendment.yml'),
                [
                    'portOffset: 1000',
                    'ports:',
                    '  - containerPort: 3000',
                    'customizations:',
                    '  envTemplate:',
                    '    LOCAL_ONLY: value',
                    '  scripts:',
                    '    postCreate:',
                    '      - echo unsupported',
                    '  files:',
                    '    - path: local.txt',
                    '      content: unsupported',
                    '',
                ].join('\n')
            );
            const refresh = runCli(root, ['amend', 'refresh']);
            expect(refresh.status).not.toBe(0);
            expect(refresh.stderr).toContain('Unsupported local amendment keys');
            expect(refresh.stderr).toContain('portOffset, ports');

            fs.writeFileSync(
                path.join(root, '.container-superposition', 'amendment.yml'),
                'customizations:\n  envTemplate:\n    LOCAL_ONLY: value\n'
            );
            const customizationRefresh = runCli(root, ['amend', 'refresh']);
            expect(customizationRefresh.status).not.toBe(0);
            expect(customizationRefresh.stderr).toContain(
                'Unsupported local amendment customizations keys'
            );
            expect(customizationRefresh.stderr).toContain('customizations.envTemplate');
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('rejects compose-only amendment fields for plain base devcontainers', () => {
        const root = workspace();
        try {
            writeBase(root);
            git(root, ['init']);
            expect(runCli(root, ['amend', 'init']).status).toBe(0);
            fs.writeFileSync(
                path.join(root, '.container-superposition', 'amendment.yml'),
                [
                    'env:',
                    '  SHOULD_FAIL:',
                    '    value: nope',
                    '    target: composeEnv',
                    'mounts:',
                    '  - value: cache:/cache',
                    '    target: composeVolume',
                    '',
                ].join('\n')
            );
            const refresh = runCli(root, ['amend', 'refresh']);
            expect(refresh.status).not.toBe(0);
            expect(refresh.stderr).toContain('Compose-only amendment fields');
            expect(refresh.stderr).toContain('require a compose-backed base devcontainer.');
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('detects missing amendment input as drift during inspect', () => {
        const root = workspace();
        try {
            writeBase(root);
            git(root, ['init']);
            expect(runCli(root, ['amend', 'init']).status).toBe(0);
            fs.rmSync(path.join(root, '.container-superposition', 'amendment.yml'), {
                force: true,
            });
            const inspect = runCli(root, ['amend', 'inspect', '--json']);
            expect(inspect.status).toBe(0);
            const result = JSON.parse(inspect.stdout);
            expect(result.status).toBe('input changed — refresh required');
            expect(result.input.exists).toBe(false);
            expect(result.input.sha256).toBeNull();
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('refuses amend remove when protected local paths are tracked', () => {
        const root = workspace();
        try {
            writeBase(root);
            git(root, ['init']);
            expect(runCli(root, ['amend', 'init']).status).toBe(0);
            git(root, ['add', '-f', '.container-superposition/amendment.yml']);
            const remove = runCli(root, ['amend', 'remove']);
            expect(remove.status).not.toBe(0);
            expect(remove.stderr).toContain(
                'Refusing to remove while local amendment paths are tracked by Git'
            );
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('retains local git exclude block on purge when local amendment directory remains', () => {
        const root = workspace();
        try {
            writeBase(root);
            git(root, ['init']);
            expect(runCli(root, ['amend', 'init']).status).toBe(0);
            fs.writeFileSync(
                path.join(root, '.container-superposition', 'keep.txt'),
                'user-managed content\n'
            );
            const remove = runCli(root, ['amend', 'remove', '--purge']);
            expect(remove.status).toBe(0);
            expect(remove.stdout).toContain('Retaining local Git exclude block');
            const excludeRel = git(root, ['rev-parse', '--git-path', 'info/exclude']).stdout.trim();
            const excludeContent = fs.readFileSync(path.join(root, excludeRel), 'utf8');
            expect(excludeContent).toContain('/.container-superposition/');
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);

    it('inspect reports modified generated artifacts instead of current', () => {
        const root = workspace();
        try {
            writeBase(root);
            git(root, ['init']);
            expect(runCli(root, ['amend', 'init']).status).toBe(0);
            const alternatePath = defaultAlternatePath(root);
            fs.writeFileSync(alternatePath, '{"tampered":true}\n');
            const inspect = runCli(root, ['amend', 'inspect', '--json']);
            expect(inspect.status).toBe(0);
            const result = JSON.parse(inspect.stdout);
            expect(result.status).toBe('modified artifact');
            expect(result.artifacts).toContainEqual(
                expect.objectContaining({
                    path: '.devcontainer/superposition-local/devcontainer.json',
                    status: 'modified',
                })
            );
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    }, 30_000);
});
