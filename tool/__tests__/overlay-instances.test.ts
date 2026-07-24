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

    async function composeCurrentProject() {
        const loaded = loadProjectConfig(overlaysConfig, repoDir)!;
        const answers = mergeAnswers(
            buildAnswersFromProjectConfig(loaded.selection, overlaysConfig)
        );
        await composeDevContainer(answers, OVERLAYS_DIR);

        return {
            compose: yaml.load(
                fs.readFileSync(path.join(repoDir, '.devcontainer', 'docker-compose.yml'), 'utf8')
            ) as any,
            devcontainer: JSON.parse(
                fs.readFileSync(path.join(repoDir, '.devcontainer', 'devcontainer.json'), 'utf8')
            ),
            manifest: JSON.parse(
                fs.readFileSync(path.join(repoDir, '.devcontainer', 'superposition.json'), 'utf8')
            ),
        };
    }

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

    it('materializes two redis instances with distinct service and verification identities', async () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                baseImage: 'bookworm',
                overlays: [
                    { overlay: 'redis', name: 'cache' },
                    { overlay: 'redis', name: 'queue', parameters: { REDIS_PORT: 6380 } },
                ],
                parameters: {
                    REDIS_PASSWORD: 'shared-pass',
                },
                outputPath: path.join(repoDir, '.devcontainer'),
            })
        );

        const { compose, devcontainer } = await composeCurrentProject();
        expect(compose.services['redis-cache']).toBeDefined();
        expect(compose.services['redis-queue']).toBeDefined();
        expect(compose.services['redis-cache'].ports).toEqual(['6379:6379']);
        expect(compose.services['redis-queue'].ports).toEqual(['6380:6379']);
        expect(compose.volumes['redis-data-cache']).toBeDefined();
        expect(compose.volumes['redis-data-queue']).toBeDefined();
        expect(devcontainer.runServices).toEqual(['redis-cache', 'redis-queue']);
        expect(devcontainer.remoteEnv.REDIS_HOST_CACHE).toBe('redis-cache');
        expect(devcontainer.remoteEnv.REDIS_HOST_QUEUE).toBe('redis-queue');
        expect(devcontainer.remoteEnv.REDIS_PORT_CACHE).toBe('6379');
        expect(devcontainer.remoteEnv.REDIS_PORT_QUEUE).toBe('6380');
        expect(devcontainer.postStartCommand['verify-redis-cache']).toBe(
            'bash .devcontainer/scripts/verify-redis-cache.sh'
        );
        expect(devcontainer.postStartCommand['verify-redis-queue']).toBe(
            'bash .devcontainer/scripts/verify-redis-queue.sh'
        );
        expect(
            fs.readFileSync(
                path.join(repoDir, '.devcontainer', 'scripts', 'verify-redis-queue.sh'),
                'utf8'
            )
        ).toContain('redis-queue');
        const redisServicesDoc = fs.readFileSync(
            path.join(repoDir, '.devcontainer', 'services.md'),
            'utf8'
        );
        expect(redisServicesDoc).toContain('redis://redis-cache:');
        expect(redisServicesDoc).toContain('redis://redis-queue:');
        expect(redisServicesDoc).toContain('redis-cli -h redis-cache');
        expect(redisServicesDoc).toContain('redis-cli -h redis-queue');
        expect(redisServicesDoc).not.toContain('redis://redis:${');
    });

    it('materializes two fuseki instances with distinct service, copied-file, and script identities', async () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                baseImage: 'bookworm',
                overlays: [
                    { overlay: 'fuseki', name: 'app' },
                    { overlay: 'fuseki', name: 'analytics', parameters: { FUSEKI_PORT: 3031 } },
                ],
                parameters: {
                    FUSEKI_ADMIN_PASSWORD: 'shared-admin',
                },
                outputPath: path.join(repoDir, '.devcontainer'),
            })
        );

        const { compose, devcontainer } = await composeCurrentProject();
        expect(compose.services['fuseki-app']).toBeDefined();
        expect(compose.services['fuseki-analytics']).toBeDefined();
        expect(compose.services['fuseki-app'].hostname).toBe('fuseki-app');
        expect(compose.services['fuseki-analytics'].hostname).toBe('fuseki-analytics');
        expect(compose.services['fuseki-app'].ports).toEqual(['3030:3030']);
        expect(compose.services['fuseki-analytics'].ports).toEqual(['3031:3030']);
        expect(compose.volumes['fuseki-data-app']).toBeDefined();
        expect(compose.volumes['fuseki-data-analytics']).toBeDefined();
        expect(devcontainer.runServices).toEqual(['fuseki-app', 'fuseki-analytics']);
        expect(devcontainer.remoteEnv.FUSEKI_HOST_APP).toBe('fuseki-app');
        expect(devcontainer.remoteEnv.FUSEKI_HOST_ANALYTICS).toBe('fuseki-analytics');
        expect(devcontainer.remoteEnv.FUSEKI_PORT_ANALYTICS).toBe('3031');
        expect(devcontainer.postCreateCommand['setup-fuseki-app']).toBe(
            'bash .devcontainer/scripts/setup-fuseki-app.sh'
        );
        expect(devcontainer.postCreateCommand['setup-fuseki-analytics']).toBe(
            'bash .devcontainer/scripts/setup-fuseki-analytics.sh'
        );
        expect(devcontainer.postStartCommand['verify-fuseki-app']).toBe(
            'bash .devcontainer/scripts/verify-fuseki-app.sh'
        );
        expect(
            fs.readFileSync(
                path.join(repoDir, '.devcontainer', 'scripts', 'setup-fuseki-analytics.sh'),
                'utf8'
            )
        ).toContain('seed-fuseki-analytics.sh');
        expect(
            fs.readFileSync(path.join(repoDir, '.devcontainer', 'seed-fuseki-analytics.sh'), 'utf8')
        ).toContain('fuseki-analytics');
    });

    it('materializes two sqlserver instances with distinct service and verification identities', async () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                baseImage: 'bookworm',
                overlays: [
                    { overlay: 'sqlserver', name: 'app' },
                    { overlay: 'sqlserver', name: 'analytics', parameters: { MSSQL_PORT: 1434 } },
                ],
                parameters: {
                    MSSQL_SA_PASSWORD: 'SharedPassw0rd!',
                },
                outputPath: path.join(repoDir, '.devcontainer'),
            })
        );

        const { compose, devcontainer } = await composeCurrentProject();
        expect(compose.services['sqlserver-app']).toBeDefined();
        expect(compose.services['sqlserver-analytics']).toBeDefined();
        expect(compose.services['sqlserver-app'].ports).toEqual(['1433:1433']);
        expect(compose.services['sqlserver-analytics'].ports).toEqual(['1434:1433']);
        expect(compose.volumes['sqlserver-data-app']).toBeDefined();
        expect(compose.volumes['sqlserver-data-analytics']).toBeDefined();
        expect(devcontainer.runServices).toEqual(['sqlserver-app', 'sqlserver-analytics']);
        expect(devcontainer.remoteEnv.MSSQL_HOST_APP).toBe('sqlserver-app');
        expect(devcontainer.remoteEnv.MSSQL_HOST_ANALYTICS).toBe('sqlserver-analytics');
        expect(devcontainer.remoteEnv.MSSQL_PORT_ANALYTICS).toBe('1434');
        expect(devcontainer.postStartCommand['verify-sqlserver-app']).toBe(
            'bash .devcontainer/scripts/verify-sqlserver-app.sh'
        );
        expect(devcontainer.postStartCommand['verify-sqlserver-analytics']).toBe(
            'bash .devcontainer/scripts/verify-sqlserver-analytics.sh'
        );
        expect(
            fs.readFileSync(
                path.join(repoDir, '.devcontainer', 'scripts', 'verify-sqlserver-analytics.sh'),
                'utf8'
            )
        ).toContain('sqlserver-analytics');
        const sqlserverPortsDoc = JSON.parse(
            fs.readFileSync(path.join(repoDir, '.devcontainer', 'ports.json'), 'utf8')
        );
        expect(sqlserverPortsDoc.ports).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ service: 'sqlserver-app', actualPort: 1433 }),
                expect.objectContaining({ service: 'sqlserver-analytics', actualPort: 1434 }),
            ])
        );
    });

    it('materializes two nats instances with distinct service and monitoring identities', async () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                baseImage: 'bookworm',
                overlays: [
                    { overlay: 'nats', name: 'bus' },
                    {
                        overlay: 'nats',
                        name: 'metrics',
                        parameters: {
                            NATS_CLIENT_PORT: 4223,
                            NATS_HTTP_PORT: 8223,
                            NATS_CLUSTER_PORT: 6223,
                        },
                    },
                ],
                outputPath: path.join(repoDir, '.devcontainer'),
            })
        );

        const { compose, devcontainer } = await composeCurrentProject();
        expect(compose.services['nats-bus']).toBeDefined();
        expect(compose.services['nats-metrics']).toBeDefined();
        expect(compose.services['nats-bus'].ports).toEqual(['4222:4222', '8222:8222', '6222:6222']);
        expect(compose.services['nats-metrics'].ports).toEqual([
            '4223:4222',
            '8223:8222',
            '6223:6222',
        ]);
        expect(compose.volumes['nats-data-bus']).toBeDefined();
        expect(compose.volumes['nats-data-metrics']).toBeDefined();
        expect(devcontainer.runServices).toEqual(['nats-bus', 'nats-metrics']);
        expect(devcontainer.remoteEnv.NATS_URL_BUS).toBe('nats://nats-bus:4222');
        expect(devcontainer.remoteEnv.NATS_URL_METRICS).toBe('nats://nats-metrics:4223');
        expect(devcontainer.postStartCommand['verify-nats-bus']).toBe(
            'bash .devcontainer/scripts/verify-nats-bus.sh'
        );
        expect(devcontainer.postStartCommand['verify-nats-metrics']).toBe(
            'bash .devcontainer/scripts/verify-nats-metrics.sh'
        );
        expect(
            fs.readFileSync(
                path.join(repoDir, '.devcontainer', 'scripts', 'verify-nats-metrics.sh'),
                'utf8'
            )
        ).toContain('nats-metrics');
        const natsPortsDoc = JSON.parse(
            fs.readFileSync(path.join(repoDir, '.devcontainer', 'ports.json'), 'utf8')
        );
        expect(natsPortsDoc.ports).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ service: 'nats-bus', actualPort: 4222 }),
                expect.objectContaining({ service: 'nats-bus', actualPort: 8222 }),
                expect.objectContaining({ service: 'nats-metrics', actualPort: 4223 }),
                expect.objectContaining({ service: 'nats-metrics', actualPort: 8223 }),
            ])
        );
    });

    it('rejects named entries for deferred repeatability overlays', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                overlays: [{ overlay: 'rabbitmq', name: 'queue' }],
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
