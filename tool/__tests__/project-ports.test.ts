import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import { composeDevContainer } from '../questionnaire/composer.js';
import {
    buildAnswersFromProjectConfig,
    loadProjectConfig,
    serializeProjectConfig,
} from '../schema/project-config.js';
import type { QuestionnaireAnswers } from '../schema/types.js';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');

describe('Project Ports', () => {
    const overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
    let repoDir: string;

    beforeEach(() => {
        repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-ports-'));
    });

    afterEach(() => {
        fs.rmSync(repoDir, { recursive: true, force: true });
    });

    // ─── Parser / serializer round-trip ──────────────────────────────────────

    describe('round-trip parse/serialize', () => {
        it('loads mixed string and object entries as ProjectPort objects', () => {
            fs.writeFileSync(
                path.join(repoDir, 'superposition.yml'),
                yaml.dump({
                    stack: 'compose',
                    overlays: ['nodejs'],
                    ports: [
                        '${API_PORT:-8080}:8080',
                        {
                            value: '${WEB_DEV_PORT:-5173}:5173',
                            label: 'Web dev server',
                            onAutoForward: 'openBrowser',
                        },
                    ],
                })
            );

            const loaded = loadProjectConfig(overlaysConfig, repoDir);
            expect(loaded?.selection.ports).toEqual([
                { value: '${API_PORT:-8080}:8080' },
                {
                    value: '${WEB_DEV_PORT:-5173}:5173',
                    label: 'Web dev server',
                    onAutoForward: 'openBrowser',
                },
            ]);

            const answers = buildAnswersFromProjectConfig(loaded!.selection, overlaysConfig);
            expect(answers.projectPorts).toEqual(loaded?.selection.ports);
        });

        it('serializes value-only entry as string shorthand', () => {
            fs.writeFileSync(
                path.join(repoDir, 'superposition.yml'),
                yaml.dump({
                    stack: 'compose',
                    ports: ['${API_PORT:-8080}:8080'],
                })
            );
            const loaded = loadProjectConfig(overlaysConfig, repoDir);
            const serialized = serializeProjectConfig(loaded!.selection);
            // compact form — no object keys other than the value itself
            expect(serialized).toContain('${API_PORT:-8080}:8080');
            expect(serialized).not.toContain('label:');
        });

        it('serializes object entry with metadata keys', () => {
            fs.writeFileSync(
                path.join(repoDir, 'superposition.yml'),
                yaml.dump({
                    stack: 'compose',
                    ports: [
                        { value: '${API_PORT:-8080}:8080', label: 'API', onAutoForward: 'notify' },
                    ],
                })
            );
            const loaded = loadProjectConfig(overlaysConfig, repoDir);
            const serialized = serializeProjectConfig(loaded!.selection);
            expect(serialized).toContain('label: API');
            expect(serialized).toContain('onAutoForward: notify');
        });

        it('returns undefined for empty ports array', () => {
            fs.writeFileSync(
                path.join(repoDir, 'superposition.yml'),
                yaml.dump({ stack: 'compose', ports: [] })
            );
            const loaded = loadProjectConfig(overlaysConfig, repoDir);
            expect(loaded?.selection.ports).toBeUndefined();
        });

        it('throws ProjectConfigError for non-array ports field', () => {
            fs.writeFileSync(
                path.join(repoDir, 'superposition.yml'),
                'stack: compose\nports: "not-an-array"\n'
            );
            expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow(
                'ports: must be an array'
            );
        });

        it('throws ProjectConfigError for array entry that is neither string nor object', () => {
            fs.writeFileSync(
                path.join(repoDir, 'superposition.yml'),
                'stack: compose\nports:\n  - 12345\n'
            );
            expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow(
                "ports[0]: each entry must be a string or an object with a 'value' key."
            );
        });

        it('throws ProjectConfigError for invalid onAutoForward enum value', () => {
            fs.writeFileSync(
                path.join(repoDir, 'superposition.yml'),
                yaml.dump({
                    stack: 'compose',
                    ports: [{ value: '8080:8080', onAutoForward: 'badvalue' }],
                })
            );
            expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow('onAutoForward');
        });
    });

    // ─── Plain stack ─────────────────────────────────────────────────────────

    describe('plain stack', () => {
        it('resolves port from superposition.yml env (first priority)', async () => {
            const outputPath = path.join(repoDir, '.devcontainer');
            // root .env has API_PORT=9002 — should be overridden by superposition env
            fs.writeFileSync(path.join(repoDir, '.env'), 'API_PORT=9002\n');

            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
                projectEnv: { API_PORT: { value: '9001' } },
                projectPorts: [{ value: '${API_PORT:-8080}' }],
            };

            await composeDevContainer(answers);

            const devcontainer = JSON.parse(
                fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
            ) as { forwardPorts?: number[] };

            expect(devcontainer.forwardPorts).toContain(9001);
            expect(devcontainer.forwardPorts).not.toContain(9002);
            expect(devcontainer.forwardPorts).not.toContain(8080);
        });

        it('falls back to root .env when not in superposition env', async () => {
            const outputPath = path.join(repoDir, '.devcontainer');
            fs.writeFileSync(path.join(repoDir, '.env'), 'API_PORT=9002\n');

            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
                projectPorts: [{ value: '${API_PORT:-8080}' }],
            };

            await composeDevContainer(answers);

            const devcontainer = JSON.parse(
                fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
            ) as { forwardPorts?: number[] };

            expect(devcontainer.forwardPorts).toContain(9002);
        });

        it('uses inline default when variable absent everywhere', async () => {
            const outputPath = path.join(repoDir, '.devcontainer');

            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
                projectPorts: [{ value: '${API_PORT:-8080}' }],
            };

            await composeDevContainer(answers);

            const devcontainer = JSON.parse(
                fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
            ) as { forwardPorts?: number[] };

            expect(devcontainer.forwardPorts).toContain(8080);
        });

        it('throws ProjectConfigError for HOST:CONTAINER format on plain stack', async () => {
            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath: path.join(repoDir, '.devcontainer'),
                projectPorts: [{ value: '${API_PORT:-8080}:8080' }],
            };

            await expect(composeDevContainer(answers)).rejects.toThrow(
                "ports[0]: stack 'plain' expects a container port expression (no colon)"
            );
        });

        it('throws ProjectConfigError for unresolvable reference (no default, absent everywhere)', async () => {
            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath: path.join(repoDir, '.devcontainer'),
                projectPorts: [{ value: '${MISSING}' }],
            };

            await expect(composeDevContainer(answers)).rejects.toThrow('ports[0]: cannot resolve');
        });

        it('does not apply portOffset to project ports (overlay ports ARE shifted)', async () => {
            const outputPath = path.join(repoDir, '.devcontainer');

            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                language: ['nodejs'], // nodejs overlay adds port 8080
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
                portOffset: 100,
                projectPorts: [{ value: '${API_PORT:-8080}' }],
            };

            await composeDevContainer(answers);

            const devcontainer = JSON.parse(
                fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
            ) as { forwardPorts?: number[] };

            // Project port: 8080 (not shifted)
            expect(devcontainer.forwardPorts).toContain(8080);
            // nodejs overlay port 8080 + offset 100 = 8180 (shifted)
            expect(devcontainer.forwardPorts).toContain(8180);
        });

        it('writes portsAttributes keyed by container port when metadata present', async () => {
            const outputPath = path.join(repoDir, '.devcontainer');

            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
                projectPorts: [
                    {
                        value: '${API_PORT:-9001}',
                        label: 'Custom API',
                        onAutoForward: 'notify',
                    },
                ],
            };

            await composeDevContainer(answers);

            const devcontainer = JSON.parse(
                fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
            ) as {
                forwardPorts?: number[];
                portsAttributes?: Record<string, { label?: string; onAutoForward?: string }>;
            };

            expect(devcontainer.forwardPorts).toContain(9001);
            expect(devcontainer.portsAttributes?.['9001']).toEqual({
                label: 'Custom API',
                onAutoForward: 'notify',
            });
        });

        it('does not add portsAttributes entry when no metadata present', async () => {
            const outputPath = path.join(repoDir, '.devcontainer');

            const answers: QuestionnaireAnswers = {
                stack: 'plain',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
                projectPorts: [{ value: '9001' }],
            };

            await composeDevContainer(answers);

            const devcontainer = JSON.parse(
                fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
            ) as { portsAttributes?: Record<string, unknown> };

            expect(devcontainer.portsAttributes?.['9001']).toBeUndefined();
        });
    });

    // ─── Compose stack ────────────────────────────────────────────────────────

    describe('compose stack', () => {
        it('writes port binding verbatim to docker-compose.yml (no expansion)', async () => {
            const outputPath = path.join(repoDir, '.devcontainer');
            fs.writeFileSync(path.join(repoDir, '.env'), 'API_PORT=9010\n');

            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
                projectPorts: [{ value: '${API_PORT:-8080}:8080' }],
            };

            await composeDevContainer(answers);

            const compose = yaml.load(
                fs.readFileSync(path.join(outputPath, 'docker-compose.yml'), 'utf8')
            ) as { services?: { devcontainer?: { ports?: string[] } } };

            // Must be verbatim — NOT expanded
            expect(compose.services?.devcontainer?.ports).toContain('${API_PORT:-8080}:8080');
            expect(compose.services?.devcontainer?.ports).not.toContain('9010:8080');
        });

        it('extracts container port into devcontainer.json forwardPorts', async () => {
            const outputPath = path.join(repoDir, '.devcontainer');

            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
                projectPorts: [
                    { value: '${API_PORT:-8080}:8080' },
                    { value: '${WEB_DEV_PORT:-5173}:5173' },
                ],
            };

            await composeDevContainer(answers);

            const devcontainer = JSON.parse(
                fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
            ) as { forwardPorts?: number[] };

            expect(devcontainer.forwardPorts).toContain(8080);
            expect(devcontainer.forwardPorts).toContain(5173);
        });

        it('throws ProjectConfigError for bare port expression on compose (no colon)', async () => {
            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath: path.join(repoDir, '.devcontainer'),
                projectPorts: [{ value: '${API_PORT:-8080}' }],
            };

            await expect(composeDevContainer(answers)).rejects.toThrow(
                "ports[0]: stack 'compose' expects a HOST:CONTAINER port binding (with colon)"
            );
        });

        it('writes portsAttributes keyed by extracted container port', async () => {
            const outputPath = path.join(repoDir, '.devcontainer');

            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
                projectPorts: [
                    { value: '${API_PORT:-8080}:8080', label: 'API', onAutoForward: 'notify' },
                ],
            };

            await composeDevContainer(answers);

            const devcontainer = JSON.parse(
                fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
            ) as {
                portsAttributes?: Record<string, { label?: string; onAutoForward?: string }>;
            };

            // Key is container port 8080, NOT host port
            expect(devcontainer.portsAttributes?.['8080']).toEqual({
                label: 'API',
                onAutoForward: 'notify',
            });
        });

        it('extracts container port from three-segment IP:HOST:CONTAINER binding', async () => {
            const outputPath = path.join(repoDir, '.devcontainer');

            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
                projectPorts: [{ value: '192.168.1.10:9000:8080' }],
            };

            await composeDevContainer(answers);

            const devcontainer = JSON.parse(
                fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
            ) as { forwardPorts?: number[] };
            const compose = yaml.load(
                fs.readFileSync(path.join(outputPath, 'docker-compose.yml'), 'utf8')
            ) as { services?: { devcontainer?: { ports?: string[] } } };

            expect(devcontainer.forwardPorts).toContain(8080);
            expect(compose.services?.devcontainer?.ports).toContain('192.168.1.10:9000:8080');
        });

        it('extracts default from ${VAR:-DEFAULT} container segment', async () => {
            const outputPath = path.join(repoDir, '.devcontainer');

            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
                projectPorts: [{ value: '9000:${CONTAINER_PORT:-3000}' }],
            };

            await composeDevContainer(answers);

            const devcontainer = JSON.parse(
                fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
            ) as { forwardPorts?: number[] };

            expect(devcontainer.forwardPorts).toContain(3000);
        });

        it('skips forwardPorts when container segment has no default (${VAR} only)', async () => {
            const outputPath = path.join(repoDir, '.devcontainer');

            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
                // No error thrown — best-effort skip
                projectPorts: [{ value: '9000:${CONTAINER_PORT}' }],
            };

            // Should not throw
            await composeDevContainer(answers);

            const devcontainer = JSON.parse(
                fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
            ) as { forwardPorts?: number[] };

            // No container port extracted — not in forwardPorts
            expect((devcontainer.forwardPorts ?? []).includes(NaN)).toBe(false);
            expect(devcontainer.forwardPorts ?? []).not.toContain(undefined);
        });

        it('does not expand ${VAR} even when variable present in root .env', async () => {
            const outputPath = path.join(repoDir, '.devcontainer');
            fs.writeFileSync(path.join(repoDir, '.env'), 'API_PORT=9010\nWEB_DEV_PORT=4000\n');

            const answers: QuestionnaireAnswers = {
                stack: 'compose',
                baseImage: 'bookworm',
                language: [],
                needsDocker: false,
                database: [],
                playwright: false,
                cloudTools: [],
                devTools: [],
                observability: [],
                outputPath,
                projectPorts: [
                    { value: '${API_PORT:-8080}:8080', label: 'API', onAutoForward: 'notify' },
                    { value: '${WEB_DEV_PORT:-5173}:5173' },
                ],
            };

            await composeDevContainer(answers);

            const devcontainer = JSON.parse(
                fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
            ) as {
                forwardPorts?: number[];
                portsAttributes?: Record<string, unknown>;
            };
            const compose = yaml.load(
                fs.readFileSync(path.join(outputPath, 'docker-compose.yml'), 'utf8')
            ) as { services?: { devcontainer?: { ports?: string[] } } };

            // docker-compose gets verbatim strings
            expect(compose.services?.devcontainer?.ports).toContain('${API_PORT:-8080}:8080');
            expect(compose.services?.devcontainer?.ports).toContain('${WEB_DEV_PORT:-5173}:5173');
            expect(compose.services?.devcontainer?.ports).not.toContain('9010:8080');
            expect(compose.services?.devcontainer?.ports).not.toContain('4000:5173');

            // devcontainer.json gets extracted container ports
            expect(devcontainer.forwardPorts).toContain(8080);
            expect(devcontainer.forwardPorts).toContain(5173);
            // portsAttributes keyed by container port 8080
            expect(devcontainer.portsAttributes?.['8080']).toBeDefined();
        });
    });
});
