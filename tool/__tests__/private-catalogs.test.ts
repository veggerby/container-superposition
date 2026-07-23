import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import { loadProjectConfig, buildAnswersFromProjectConfig } from '../schema/project-config.js';
import { resolveOverlaysContext } from '../schema/catalogs.js';
import { applyPresetSelections } from '../questionnaire/presets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');
const TSX_CLI = path.join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

function writeAcmeCatalog(repoDir: string) {
    const catalogRoot = path.join(repoDir, 'catalogs', 'acme');
    fs.mkdirSync(path.join(catalogRoot, 'web-api'), { recursive: true });
    fs.mkdirSync(path.join(catalogRoot, '.presets'), { recursive: true });
    fs.writeFileSync(
        path.join(catalogRoot, 'web-api', 'overlay.yml'),
        [
            'id: web-api',
            'name: Acme Web API',
            'description: External web API overlay',
            'category: dev',
            'supports:',
            '  - plain',
            '  - compose',
            '',
        ].join('\n')
    );
    fs.writeFileSync(
        path.join(catalogRoot, '.presets', 'starter.yml'),
        [
            'id: starter',
            'name: Acme Starter',
            'description: External starter preset',
            'type: meta',
            'category: preset',
            'selects:',
            '  required:',
            '    - web-api',
            '',
        ].join('\n')
    );
}

function runCli(args: string[], cwd: string) {
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
        status: result.status ?? 1,
        stdout: result.stdout,
        stderr: result.stderr,
    };
}

describe('private catalogs', () => {
    let repoDir: string;
    let originalCwd: string;
    beforeEach(() => {
        repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'private-catalogs-'));
        originalCwd = process.cwd();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
            throw new Error(`process.exit(${code})`);
        });
    });

    afterEach(() => {
        process.chdir(originalCwd);
        vi.restoreAllMocks();
    });

    it('loads namespace-qualified external overlays and presets from a repo-relative path catalog', async () => {
        writeAcmeCatalog(repoDir);
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            [
                'stack: plain',
                'catalogs:',
                '  - id: acme-platform',
                '    namespace: acme',
                '    source:',
                '      type: path',
                '      path: catalogs/acme',
                'preset: acme/starter',
                'overlays:',
                '  - acme/web-api',
                '',
            ].join('\n')
        );

        const baseConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
        const projectConfig = loadProjectConfig(baseConfig, repoDir);
        expect(projectConfig?.selection.catalogs?.[0].namespace).toBe('acme');
        expect(projectConfig?.selection.preset).toBe('acme/starter');
        expect(projectConfig?.selection.overlays).toEqual(['acme/web-api']);

        const overlaysContext = resolveOverlaysContext(repoDir, OVERLAYS_DIR);
        expect(
            overlaysContext.overlaysConfig.overlays.some((overlay) => overlay.id === 'acme/web-api')
        ).toBe(true);
        expect(
            overlaysContext.overlaysConfig.overlays.some((overlay) => overlay.id === 'acme/starter')
        ).toBe(true);

        const answers = await applyPresetSelections(
            buildAnswersFromProjectConfig(projectConfig!.selection, overlaysContext.overlaysConfig),
            overlaysContext.overlaysConfig,
            overlaysContext.presetsDir
        );
        expect(answers.preset).toBe('acme/starter');
        expect(answers.overlaySelections).toEqual([
            {
                kind: 'singleton',
                overlayId: 'acme/web-api',
                source: 'overlays',
            },
        ]);
    });

    it('rejects unqualified external overlay ids, inline https credentials, and floating remote pins', () => {
        writeAcmeCatalog(repoDir);
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            [
                'stack: plain',
                'catalogs:',
                '  - id: acme-platform',
                '    namespace: acme',
                '    source:',
                '      type: path',
                '      path: catalogs/acme',
                'overlays:',
                '  - web-api',
                '',
            ].join('\n')
        );

        const baseConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
        expect(() => loadProjectConfig(baseConfig, repoDir)).toThrow(
            /unsupported entries: web-api/
        );

        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            [
                'stack: plain',
                'catalogs:',
                '  - id: acme-platform',
                '    namespace: acme',
                '    source:',
                '      type: git',
                '      url: https://ghp_secret@github.com/acme/catalog.git',
                "      commit: 'abcdef1'",
                '',
            ].join('\n')
        );

        expect(() => loadProjectConfig(baseConfig, repoDir)).toThrow(/must not embed credentials/);

        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            [
                'stack: plain',
                'catalogs:',
                '  - id: acme-platform',
                '    namespace: acme',
                '    source:',
                '      type: git',
                '      url: ssh://git.example.com/acme/catalog.git',
                '      ref: main',
                "      commit: 'abcdef1'",
                '',
            ].join('\n')
        );

        expect(() => loadProjectConfig(baseConfig, repoDir)).toThrow(
            /floating refs like 'main' are rejected/
        );
    });

    it('uses the same merged registry across list, explain, plan, init, and doctor CLI flows', () => {
        writeAcmeCatalog(repoDir);
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            [
                'stack: plain',
                'outputPath: .devcontainer',
                'catalogs:',
                '  - id: acme-platform',
                '    namespace: acme',
                '    source:',
                '      type: path',
                '      path: catalogs/acme',
                'overlays:',
                '  - acme/web-api',
                '',
            ].join('\n')
        );

        const listResult = runCli(['list', '--json'], repoDir);
        expect(listResult.status).toBe(0);
        expect(listResult.stdout).toContain('acme/web-api');

        const explainResult = runCli(['explain', 'acme/web-api', '--json'], repoDir);
        expect(explainResult.status).toBe(0);
        expect(explainResult.stdout).toContain('acme/web-api');

        const planResult = runCli(
            ['plan', '--stack', 'plain', '--overlays', 'acme/web-api', '--json'],
            repoDir
        );
        expect(planResult.status).toBe(0);
        expect(planResult.stdout).toContain('acme/web-api');

        const initResult = runCli(['init', '--from-project', '--no-interactive'], repoDir);
        expect(initResult.status).toBe(0);
        expect(fs.existsSync(path.join(repoDir, '.devcontainer', 'superposition.json'))).toBe(true);
        const manifest = JSON.parse(
            fs.readFileSync(path.join(repoDir, '.devcontainer', 'superposition.json'), 'utf8')
        );
        expect(manifest.catalogs).toEqual([
            expect.objectContaining({
                id: 'acme-platform',
                namespace: 'acme',
                sourceType: 'path',
            }),
        ]);

        const doctorResult = runCli(['doctor', '--from-project', '--json'], repoDir);
        expect(doctorResult.status).toBe(0);
        expect(doctorResult.stdout).toContain('"errors": 0');
    });

    it('validates archive checksum requirements and supports local git catalogs with immutable commits', () => {
        const baseConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);

        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            [
                'stack: plain',
                'catalogs:',
                '  - id: archive-catalog',
                '    namespace: acme',
                '    source:',
                '      type: archive',
                '      url: https://example.com/catalog.tgz',
                '      checksum: nope',
                '',
            ].join('\n')
        );
        expect(() => loadProjectConfig(baseConfig, repoDir)).toThrow(/sha256:<64 hex>/);

        const gitRepo = path.join(repoDir, 'catalog-git');
        writeAcmeCatalog(gitRepo);
        execFileSync('git', ['init'], { cwd: gitRepo, stdio: 'pipe' });
        execFileSync('git', ['config', 'user.email', 'test@example.com'], {
            cwd: gitRepo,
            stdio: 'pipe',
        });
        execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: gitRepo, stdio: 'pipe' });
        execFileSync('git', ['add', '.'], { cwd: gitRepo, stdio: 'pipe' });
        execFileSync('git', ['commit', '-m', 'catalog'], { cwd: gitRepo, stdio: 'pipe' });
        const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
            cwd: gitRepo,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();

        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            [
                'stack: plain',
                'catalogs:',
                '  - id: acme-platform',
                '    namespace: acme',
                '    source:',
                `      type: git`,
                `      url: ${gitRepo}`,
                '      subpath: catalogs/acme',
                `      commit: ${commit}`,
                'overlays:',
                '  - acme/web-api',
                '',
            ].join('\n')
        );

        const projectConfig = loadProjectConfig(baseConfig, repoDir);
        expect(projectConfig?.selection.overlays).toEqual(['acme/web-api']);
        const overlaysContext = resolveOverlaysContext(repoDir, OVERLAYS_DIR);
        expect(
            overlaysContext.overlaysConfig.overlays.some((overlay) => overlay.id === 'acme/web-api')
        ).toBe(true);
    });

    it('uses repo-relative path catalog receipt identities regardless of current working directory', () => {
        writeAcmeCatalog(repoDir);
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            [
                'stack: plain',
                'catalogs:',
                '  - id: acme-platform',
                '    namespace: acme',
                '    source:',
                '      type: path',
                '      path: catalogs/acme',
                '',
            ].join('\n')
        );

        process.chdir(repoDir);
        const fromRepoRoot = resolveOverlaysContext(repoDir, OVERLAYS_DIR).catalogs;

        fs.mkdirSync(path.join(repoDir, 'nested'), { recursive: true });
        process.chdir(path.join(repoDir, 'nested'));
        const fromNestedDir = resolveOverlaysContext(repoDir, OVERLAYS_DIR).catalogs;

        expect(fromRepoRoot).toEqual([
            expect.objectContaining({
                id: 'acme-platform',
                namespace: 'acme',
                sourceType: 'path',
                resolvedIdentity: 'path:catalogs/acme',
            }),
        ]);
        expect(fromNestedDir).toEqual(fromRepoRoot);
    });
});
