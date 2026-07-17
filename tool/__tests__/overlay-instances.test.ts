import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import {
    buildAnswersFromManifest,
    buildAnswersFromProjectConfig,
    loadProjectConfig,
} from '../schema/project-config.js';
import { mergeAnswers } from '../questionnaire/answers.js';
import { composeDevContainer } from '../questionnaire/composer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');
const TSX_CLI = path.join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');

function runCli(args: string[], cwd: string) {
    return spawnSync(
        process.execPath,
        [TSX_CLI, path.join(REPO_ROOT, 'scripts', 'init.ts'), ...args],
        {
            cwd,
            env: { ...process.env, FORCE_COLOR: '0' },
            encoding: 'utf8',
        }
    );
}

describe('compose overlay instances', () => {
    const overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
    let repoDir: string;

    beforeEach(() => {
        repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'overlay-instances-'));
    });

    afterEach(() => {
        fs.rmSync(repoDir, { recursive: true, force: true });
    });

    it('parses mixed overlay entries and preserves named selections in answers', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                baseImage: 'bookworm',
                overlays: [
                    'nodejs',
                    { overlay: 'postgres', name: 'app', parameters: { POSTGRES_DB: 'app' } },
                    {
                        overlay: 'postgres',
                        name: 'analytics',
                        parameters: { POSTGRES_DB: 'analytics', POSTGRES_PORT: 5433 },
                    },
                ],
                parameters: {
                    POSTGRES_USER: 'postgres',
                    POSTGRES_PASSWORD: 'postgres',
                },
                outputPath: path.join(repoDir, '.devcontainer'),
            })
        );

        const loaded = loadProjectConfig(overlaysConfig, repoDir);
        expect(loaded?.selection.overlays).toEqual([
            'nodejs',
            { overlay: 'postgres', name: 'app', parameters: { POSTGRES_DB: 'app' } },
            {
                overlay: 'postgres',
                name: 'analytics',
                parameters: { POSTGRES_DB: 'analytics', POSTGRES_PORT: '5433' },
            },
        ]);

        const answers = buildAnswersFromProjectConfig(loaded!.selection, overlaysConfig);
        expect(answers.overlaySelections).toEqual([
            { kind: 'singleton', overlayId: 'nodejs', source: 'overlays' },
            {
                kind: 'named',
                overlayId: 'postgres',
                instanceName: 'app',
                parameters: { POSTGRES_DB: 'app' },
                source: 'overlays',
            },
            {
                kind: 'named',
                overlayId: 'postgres',
                instanceName: 'analytics',
                parameters: { POSTGRES_DB: 'analytics', POSTGRES_PORT: '5433' },
                source: 'overlays',
            },
        ]);
    });

    it('materializes two postgres instances with shared defaults and instance overrides', async () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                baseImage: 'bookworm',
                overlays: [
                    'nodejs',
                    { overlay: 'postgres', name: 'app', parameters: { POSTGRES_DB: 'app' } },
                    {
                        overlay: 'postgres',
                        name: 'analytics',
                        parameters: { POSTGRES_DB: 'analytics', POSTGRES_PORT: 5433 },
                    },
                ],
                parameters: {
                    POSTGRES_USER: 'shared-user',
                    POSTGRES_PASSWORD: 'shared-pass',
                },
                outputPath: path.join(repoDir, '.devcontainer'),
            })
        );

        const loaded = loadProjectConfig(overlaysConfig, repoDir)!;
        const answers = mergeAnswers(
            buildAnswersFromProjectConfig(loaded.selection, overlaysConfig)
        );
        await composeDevContainer(answers, OVERLAYS_DIR);

        const compose = yaml.load(
            fs.readFileSync(path.join(repoDir, '.devcontainer', 'docker-compose.yml'), 'utf8')
        ) as any;
        expect(compose.services['postgres-app']).toBeDefined();
        expect(compose.services['postgres-analytics']).toBeDefined();
        expect(compose.services['postgres-app'].environment.POSTGRES_USER).toContain('shared-user');
        expect(compose.services['postgres-analytics'].environment.POSTGRES_USER).toContain(
            'shared-user'
        );
        expect(compose.services['postgres-app'].environment.POSTGRES_DB).toContain('app');
        expect(compose.services['postgres-analytics'].environment.POSTGRES_DB).toContain(
            'analytics'
        );
        expect(compose.services['postgres-app'].ports).toEqual(['5432:5432']);
        expect(compose.services['postgres-analytics'].ports).toEqual(['5433:5432']);
        expect(compose.volumes['postgres-data-app']).toBeDefined();
        expect(compose.volumes['postgres-data-analytics']).toBeDefined();

        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(repoDir, '.devcontainer', 'devcontainer.json'), 'utf8')
        );
        expect(devcontainer.runServices).toEqual(['postgres-app', 'postgres-analytics']);
        expect(devcontainer.remoteEnv.POSTGRES_HOST_APP).toBe('postgres-app');
        expect(devcontainer.remoteEnv.POSTGRES_HOST_ANALYTICS).toBe('postgres-analytics');
        expect(devcontainer.remoteEnv.POSTGRES_PORT_APP).toBe('5432');
        expect(devcontainer.remoteEnv.POSTGRES_PORT_ANALYTICS).toBe('5433');
        expect(devcontainer.forwardPorts).toContain('5432');
        expect(devcontainer.forwardPorts).toContain('5433');

        const manifest = JSON.parse(
            fs.readFileSync(path.join(repoDir, '.devcontainer', 'superposition.json'), 'utf8')
        );
        expect(manifest.overlays).toEqual(['nodejs', 'postgres']);
        expect(manifest.overlaySelections).toEqual([
            'nodejs',
            { overlay: 'postgres', name: 'app', parameters: { POSTGRES_DB: 'app' } },
            {
                overlay: 'postgres',
                name: 'analytics',
                parameters: { POSTGRES_DB: 'analytics', POSTGRES_PORT: '5433' },
            },
        ]);

        const manifestAnswers = buildAnswersFromManifest(manifest, overlaysConfig, '.devcontainer');
        expect(manifestAnswers.overlaySelections).toEqual([
            { kind: 'singleton', overlayId: 'nodejs', source: 'manifest' },
            {
                kind: 'named',
                overlayId: 'postgres',
                instanceName: 'app',
                parameters: { POSTGRES_DB: 'app' },
                source: 'manifest',
            },
            {
                kind: 'named',
                overlayId: 'postgres',
                instanceName: 'analytics',
                parameters: { POSTGRES_DB: 'analytics', POSTGRES_PORT: '5433' },
                source: 'manifest',
            },
        ]);
    });

    it('rejects mixed singleton and named selection for the same overlay family', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                overlays: ['postgres', { overlay: 'postgres', name: 'analytics' }],
            })
        );

        expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow(
            /cannot mix legacy string and named object selection/
        );
    });

    it('rejects category sugar when named entries are present', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                database: ['redis'],
                overlays: [{ overlay: 'postgres', name: 'app' }],
            })
        );

        expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow(
            /Named overlay entries require the unified overlays: surface only/
        );
    });

    it('rejects named entries for non-repeatable overlays', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                overlays: [{ overlay: 'redis', name: 'cache' }],
            })
        );

        expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow(/not repeatable/);
    });

    it('rejects duplicate legacy string selection for a repeated family request', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                overlays: ['postgres', 'postgres'],
            })
        );

        expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow(
            /selected more than once via legacy string entries/
        );
    });

    it('rejects named entries on plain stacks', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'plain',
                overlays: [{ overlay: 'postgres', name: 'app' }],
            })
        );

        expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow(
            /supported only on stack 'compose'/
        );
    });

    it('fails when repeated instances resolve the same explicit host port', async () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                baseImage: 'bookworm',
                overlays: [
                    { overlay: 'postgres', name: 'app' },
                    { overlay: 'postgres', name: 'analytics' },
                ],
                outputPath: path.join(repoDir, '.devcontainer'),
            })
        );

        const loaded = loadProjectConfig(overlaysConfig, repoDir)!;
        const answers = mergeAnswers(
            buildAnswersFromProjectConfig(loaded.selection, overlaysConfig)
        );
        await expect(composeDevContainer(answers, OVERLAYS_DIR)).rejects.toThrow(
            /same explicit host port 5432/
        );
    });

    it('bails out of interactive init editing when named selections already exist', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                baseImage: 'bookworm',
                overlays: [{ overlay: 'postgres', name: 'app' }],
                outputPath: path.join(repoDir, '.devcontainer'),
            })
        );

        const result = runCli(['init'], repoDir);
        const output = `${result.stdout}\n${result.stderr}`;
        expect(result.status).toBe(0);
        expect(output).toContain('Interactive init editing cannot safely round-trip');
        expect(output).toContain('Edit superposition.yml manually');
        expect(fs.existsSync(path.join(repoDir, '.devcontainer'))).toBe(false);
    });
});
