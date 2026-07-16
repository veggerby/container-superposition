import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import { composeDevContainer } from '../questionnaire/composer.js';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import {
    buildAnswersFromProjectConfig,
    loadProjectConfig,
    serializeProjectConfig,
} from '../schema/project-config.js';
import type { QuestionnaireAnswers } from '../schema/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');

describe('Project Env', () => {
    const overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
    let repoDir: string;

    beforeEach(() => {
        repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-env-'));
    });

    afterEach(() => {
        fs.rmSync(repoDir, { recursive: true, force: true });
    });

    it('loads project env from superposition.yml and exposes it to answers', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'compose',
                composeEnvFiles: true,
                overlays: ['nodejs'],
                env: {
                    APP_NAME: 'demo-app',
                    API_BASE_URL: {
                        value: '${API_BASE_URL:-http://localhost:3000}',
                        target: 'composeEnv',
                    },
                },
            })
        );

        const loaded = loadProjectConfig(overlaysConfig, repoDir);
        expect(loaded?.selection.composeEnvFiles).toBe(true);
        expect(loaded?.selection.env).toEqual({
            APP_NAME: { value: 'demo-app' },
            API_BASE_URL: {
                value: '${API_BASE_URL:-http://localhost:3000}',
                target: 'composeEnv',
            },
        });

        const answers = buildAnswersFromProjectConfig(loaded!.selection, overlaysConfig);
        expect(answers.composeEnvFiles).toBe(true);
        expect(answers.projectEnv).toEqual(loaded?.selection.env);
    });

    it('accepts deprecated customizations.environment, warns, but serializes envTemplate', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'plain',
                overlays: ['nodejs'],
                customizations: {
                    environment: {
                        PROJECT_FLAG: 'enabled',
                    },
                },
            })
        );

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const loaded = loadProjectConfig(overlaysConfig, repoDir);
        expect(loaded?.selection.customizations?.envTemplate).toEqual({
            PROJECT_FLAG: 'enabled',
        });
        expect(warnSpy).toHaveBeenCalled();
        expect(warnSpy.mock.calls.flat().join('\n')).toContain('customizations.environment');

        const serialized = serializeProjectConfig(loaded!.selection);
        expect(serialized).toContain('envTemplate:');
        expect(serialized).not.toContain('\n  environment:\n');
    });

    it('routes auto project env to remoteEnv for plain stacks and resolves root .env references', async () => {
        const outputPath = path.join(repoDir, '.devcontainer');
        fs.writeFileSync(path.join(repoDir, '.env'), 'API_TOKEN=from-root\n');

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
            outputPath,
            projectEnv: {
                API_TOKEN: { value: '${API_TOKEN}' },
                APP_NAME: { value: 'plain-demo' },
            },
        };

        await composeDevContainer(answers);

        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
        ) as { remoteEnv?: Record<string, string> };

        expect(devcontainer.remoteEnv?.API_TOKEN).toBe('from-root');
        expect(devcontainer.remoteEnv?.APP_NAME).toBe('plain-demo');
    });

    it('routes auto project env to docker-compose via .devcontainer/.env and containerEnv references', async () => {
        const outputPath = path.join(repoDir, '.devcontainer');
        fs.writeFileSync(path.join(repoDir, '.env'), 'API_TOKEN=from-root\n');

        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
            composeEnvFiles: true,
            projectEnv: {
                API_TOKEN: { value: '${API_TOKEN}' },
                APP_NAME: { value: 'compose-demo' },
            },
        };

        await composeDevContainer(answers);

        const compose = yaml.load(
            fs.readFileSync(path.join(outputPath, 'docker-compose.yml'), 'utf8')
        ) as {
            services: {
                devcontainer?: {
                    environment?: Record<string, string>;
                };
            };
        };
        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
        ) as { remoteEnv?: Record<string, string> };

        expect(compose.services.devcontainer?.environment?.API_TOKEN).toBe('${API_TOKEN}');
        expect(compose.services.devcontainer?.environment?.APP_NAME).toBe('${APP_NAME}');
        expect(devcontainer.remoteEnv?.API_TOKEN).toBe('${containerEnv:API_TOKEN}');
        expect(devcontainer.remoteEnv?.APP_NAME).toBe('${containerEnv:APP_NAME}');

        const composeEnvFile = fs.readFileSync(path.join(outputPath, '.env'), 'utf8');
        expect(composeEnvFile).toContain('API_TOKEN=from-root');
        expect(composeEnvFile).toContain('APP_NAME=compose-demo');
    });

    it('omits unresolved ${NAME} project env entries from materialized compose .env when root .env is missing', async () => {
        const outputPath = path.join(repoDir, '.devcontainer');

        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
            composeEnvFiles: true,
            projectEnv: {
                API_TOKEN: { value: '${API_TOKEN}' },
                APP_NAME: { value: 'compose-demo' },
            },
        };

        await composeDevContainer(answers);

        const composeEnvFile = fs.readFileSync(path.join(outputPath, '.env'), 'utf8');
        expect(composeEnvFile).not.toContain('API_TOKEN=');
        expect(composeEnvFile).toContain('APP_NAME=compose-demo');
    });

    it('requires composeEnvFiles for compose project env generation', async () => {
        const outputPath = path.join(repoDir, '.devcontainer');

        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: [],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
            projectEnv: {
                API_TOKEN: { value: '${API_TOKEN}' },
            },
        };

        await expect(composeDevContainer(answers)).rejects.toThrow(/--compose-env-files/);
    });

    it('rejects composeEnv targets on plain stacks', async () => {
        const outputPath = path.join(repoDir, '.devcontainer');

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
            outputPath,
            projectEnv: {
                API_TOKEN: { value: '${API_TOKEN}', target: 'composeEnv' },
            },
        };

        await expect(composeDevContainer(answers)).rejects.toThrow(/requires stack: compose/);
    });
});

describe('Parameter token substitution in env: values', () => {
    const overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
    let repoDir: string;

    beforeEach(() => {
        repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'param-token-env-'));
    });

    afterEach(() => {
        fs.rmSync(repoDir, { recursive: true, force: true });
    });

    it('resolves {{cs.KEY}} in env: value using postgres overlay parameters (compose stack)', async () => {
        const outputPath = path.join(repoDir, '.devcontainer');
        // postgres overlay declares POSTGRES_USER, POSTGRES_DB, POSTGRES_PORT (compose-only overlay)
        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: ['postgres'],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
            overlayParameters: {
                POSTGRES_USER: 'testuser',
                POSTGRES_PORT: '5433',
                POSTGRES_DB: 'testdb',
                POSTGRES_PASSWORD: 'pass',
                POSTGRES_VERSION: '16',
            },
            // Use target: remoteEnv so the resolved value appears in devcontainer.json
            projectEnv: {
                DB_LABEL: {
                    value: '{{cs.POSTGRES_USER}}:{{cs.POSTGRES_PORT}}/{{cs.POSTGRES_DB}}',
                    target: 'remoteEnv',
                },
            },
        };
        await composeDevContainer(answers, OVERLAYS_DIR, { isRegen: true });
        const dc = JSON.parse(fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8'));
        expect(dc.remoteEnv.DB_LABEL).toBe('testuser:5433/testdb');
        // No {{cs.*}} tokens survive to output
        expect(JSON.stringify(dc)).not.toMatch(/\{\{cs\./);
    });

    it('does NOT substitute ${VAR:-default} via {{cs.KEY}} engine (pass-through at unit level verified separately)', async () => {
        // The {{cs.KEY}} substitution engine must NOT touch ${VAR:-default} expressions.
        // This is verified at unit level in overlay-parameters.test.ts.
        // Integration: env: value with only a ${VAR} expression (no {{cs.KEY}} tokens)
        // should produce no generated files with {{cs.*}} tokens.
        const outputPath = path.join(repoDir, '.devcontainer');
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
            outputPath,
            // No {{cs.*}} tokens — only a ${VAR} runtime expression
            projectEnv: { MY_VAR: { value: '${MY_VAR:-fallback}' } },
        };
        await composeDevContainer(answers, OVERLAYS_DIR, { isRegen: true });
        const dc = JSON.parse(fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8'));
        // No {{cs.*}} tokens in any generated output
        expect(JSON.stringify(dc)).not.toMatch(/\{\{cs\./);
    });

    it('resolves ad-hoc project-only parameters (API_PORT/WEB_DEV_PORT) in env: values end-to-end (AC1)', async () => {
        // No overlay declares API_PORT or WEB_DEV_PORT — these are project-only parameters.
        // Verifies the composeDevContainer → resolveParameters → substituteParametersInObject path.
        const outputPath = path.join(repoDir, '.devcontainer');
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
            outputPath,
            overlayParameters: {
                API_PORT: '8088',
                WEB_DEV_PORT: '5173',
            },
            projectEnv: {
                VITE_API_URL: {
                    value: 'http://localhost:{{cs.API_PORT}}',
                    target: 'remoteEnv',
                },
                API_PORT: { value: '{{cs.API_PORT}}', target: 'remoteEnv' },
                WEB_DEV_PORT: { value: '{{cs.WEB_DEV_PORT}}', target: 'remoteEnv' },
            },
        };
        await composeDevContainer(answers, OVERLAYS_DIR, { isRegen: true });
        const dc = JSON.parse(fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8'));
        expect(dc.remoteEnv.VITE_API_URL).toBe('http://localhost:8088');
        expect(dc.remoteEnv.API_PORT).toBe('8088');
        expect(dc.remoteEnv.WEB_DEV_PORT).toBe('5173');
        // No {{cs.*}} tokens survive to any generated file
        expect(JSON.stringify(dc)).not.toMatch(/\{\{cs\./);
    });

    it('throws hard error before writing files when {{cs.KEY}} token unresolved', async () => {
        const outputPath = path.join(repoDir, '.devcontainer');
        const answers: QuestionnaireAnswers = {
            stack: 'compose',
            baseImage: 'bookworm',
            language: ['nodejs'],
            needsDocker: false,
            database: ['postgres'],
            playwright: false,
            cloudTools: [],
            devTools: [],
            observability: [],
            outputPath,
            overlayParameters: {
                POSTGRES_USER: 'u',
                POSTGRES_PORT: '5432',
                POSTGRES_DB: 'db',
                POSTGRES_PASSWORD: 'pw',
                POSTGRES_VERSION: '16',
            },
            projectEnv: { FOO: { value: '{{cs.MISSING_PARAM}}' } },
        };
        await expect(composeDevContainer(answers, OVERLAYS_DIR, { isRegen: true })).rejects.toThrow(
            /env\.FOO/
        );
    });
});
