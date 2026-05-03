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

describe('Project Mounts', () => {
    const overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
    let repoDir: string;

    beforeEach(() => {
        repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-mounts-'));
    });

    afterEach(() => {
        fs.rmSync(repoDir, { recursive: true, force: true });
    });

    it('loads mounts from superposition.yml as normalized ProjectMount objects', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'plain',
                overlays: ['nodejs'],
                mounts: [
                    'source=${localWorkspaceFolder}/../libs,target=/workspace/libs,type=bind',
                    {
                        source: '${HOME}/.codex',
                        destination: '/home/vscode/.codex',
                        cached: true,
                        target: 'devcontainerMount',
                    },
                ],
            })
        );

        const loaded = loadProjectConfig(overlaysConfig, repoDir);
        expect(loaded?.selection.mounts).toEqual([
            { value: 'source=${localWorkspaceFolder}/../libs,target=/workspace/libs,type=bind' },
            {
                source: '${HOME}/.codex',
                destination: '/home/vscode/.codex',
                cached: true,
                target: 'devcontainerMount',
            },
        ]);

        const answers = buildAnswersFromProjectConfig(loaded!.selection, overlaysConfig);
        expect(answers.projectMounts).toEqual(loaded?.selection.mounts);
    });

    it('supports map-form mounts definitions', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'plain',
                overlays: ['nodejs'],
                mounts: {
                    codex: {
                        source: '${HOME}/.codex',
                        destination: '/home/vscode/.codex',
                        cached: true,
                    },
                },
            })
        );

        const loaded = loadProjectConfig(overlaysConfig, repoDir);
        expect(loaded?.selection.mounts).toEqual([
            {
                name: 'codex',
                source: '${HOME}/.codex',
                destination: '/home/vscode/.codex',
                cached: true,
            },
        ]);
    });

    it('routes auto mounts to devcontainer.json on plain stack', async () => {
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
            projectMounts: [
                {
                    source: '${localWorkspaceFolder}/../libs',
                    destination: '/workspace/libs',
                    type: 'bind',
                    readOnly: true,
                },
            ],
        };

        await composeDevContainer(answers);

        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
        ) as { mounts?: string[] };

        expect(devcontainer.mounts).toContain(
            'source=${localWorkspaceFolder}/../libs,target=/workspace/libs,type=bind,readonly'
        );
    });

    it('routes auto mounts to devcontainer.json on compose stack (stack-agnostic)', async () => {
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
            projectMounts: [{ source: './data', destination: '/workspace/data' }],
        };

        await composeDevContainer(answers);

        // auto always routes to devcontainer.json mounts[] regardless of stack
        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
        ) as { mounts?: string[] };
        expect(devcontainer.mounts).toContain('source=./data,target=/workspace/data,type=bind');

        // auto does NOT write to docker-compose volumes (use explicit composeVolume for that)
        const compose = yaml.load(
            fs.readFileSync(path.join(outputPath, 'docker-compose.yml'), 'utf8')
        ) as {
            services: {
                devcontainer?: {
                    volumes?: string[];
                };
            };
        };
        expect(compose.services.devcontainer?.volumes ?? []).not.toContain(
            './data:/workspace/data'
        );
    });

    it('forces mount into devcontainer.json when target is devcontainerMount on compose stack', async () => {
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
            projectMounts: [
                {
                    source: 'certs',
                    destination: '/certs',
                    type: 'volume',
                    target: 'devcontainerMount',
                },
            ],
        };

        await composeDevContainer(answers);

        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
        ) as { mounts?: string[] };

        const compose = yaml.load(
            fs.readFileSync(path.join(outputPath, 'docker-compose.yml'), 'utf8')
        ) as {
            services: {
                devcontainer?: {
                    volumes?: string[];
                };
            };
        };

        expect(devcontainer.mounts).toContain('source=certs,target=/certs,type=volume');
        expect(compose.services.devcontainer?.volumes ?? []).not.toContain('certs:/certs');
    });

    it('forces mount into compose volumes when target is composeVolume on compose stack', async () => {
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
            projectMounts: [
                { source: './logs', destination: '/workspace/logs', target: 'composeVolume' },
            ],
        };

        await composeDevContainer(answers);

        const compose = yaml.load(
            fs.readFileSync(path.join(outputPath, 'docker-compose.yml'), 'utf8')
        ) as {
            services: {
                devcontainer?: {
                    volumes?: string[];
                };
            };
        };

        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
        ) as { mounts?: string[] };

        expect(compose.services.devcontainer?.volumes).toContain('./logs:/workspace/logs');
        expect(devcontainer.mounts ?? []).not.toContain('./logs:/workspace/logs');
    });

    it('rejects composeVolume target on plain stack', async () => {
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
            projectMounts: [{ value: './data:/workspace/data', target: 'composeVolume' }],
        };

        await expect(composeDevContainer(answers)).rejects.toThrow(/requires stack: compose/);
    });

    it('coexists with customizations.devcontainerPatch — both mounts appear', async () => {
        const outputPath = path.join(repoDir, '.devcontainer');
        const customDir = path.join(outputPath, 'custom');
        fs.mkdirSync(customDir, { recursive: true });
        fs.writeFileSync(
            path.join(customDir, 'devcontainer.patch.json'),
            JSON.stringify({ mounts: ['source=vol-b,target=/b,type=volume'] }, null, 2)
        );

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
            projectMounts: [
                { source: 'vol-a', destination: '/a', type: 'volume', target: 'devcontainerMount' },
            ],
        };

        await composeDevContainer(answers);

        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
        ) as { mounts?: string[] };

        expect(devcontainer.mounts).toContain('source=vol-a,target=/a,type=volume');
        expect(devcontainer.mounts).toContain('source=vol-b,target=/b,type=volume');
    });

    it('coexists with customizations.dockerComposePatch — both volumes appear', async () => {
        const outputPath = path.join(repoDir, '.devcontainer');
        const customDir = path.join(outputPath, 'custom');
        fs.mkdirSync(customDir, { recursive: true });
        fs.writeFileSync(
            path.join(customDir, 'docker-compose.patch.yml'),
            yaml.dump({
                services: { devcontainer: { volumes: ['./extra:/workspace/extra'] } },
            })
        );

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
            projectMounts: [
                { source: './data', destination: '/workspace/data', target: 'composeVolume' },
            ],
        };

        await composeDevContainer(answers);

        const compose = yaml.load(
            fs.readFileSync(path.join(outputPath, 'docker-compose.yml'), 'utf8')
        ) as {
            services: {
                devcontainer?: {
                    volumes?: string[];
                };
            };
        };

        expect(compose.services.devcontainer?.volumes).toContain('./data:/workspace/data');
        expect(compose.services.devcontainer?.volumes).toContain('./extra:/workspace/extra');
    });

    it('serializes and round-trips mounts in superposition.yml', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'plain',
                overlays: ['nodejs'],
                mounts: [
                    'source=${localWorkspaceFolder}/../libs,target=/workspace/libs,type=bind',
                    {
                        source: '${HOME}/.codex',
                        destination: '/home/vscode/.codex',
                        cached: true,
                        target: 'devcontainerMount',
                    },
                ],
            })
        );

        const loaded = loadProjectConfig(overlaysConfig, repoDir);
        expect(loaded).not.toBeNull();

        const serialized = serializeProjectConfig(loaded!.selection);
        expect(serialized).toContain(
            'source=${localWorkspaceFolder}/../libs,target=/workspace/libs,type=bind'
        );
        expect(serialized).toContain('devcontainerMount');
        expect(serialized).toContain('destination: /home/vscode/.codex');
    });

    it('rejects empty mount value strings', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'plain',
                overlays: ['nodejs'],
                mounts: [''],
            })
        );

        expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow(
            /mounts\[0\] must be a non-empty string/
        );
    });

    it('rejects invalid mount entries (non-string, non-object)', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            `stack: plain\noverlays:\n  - nodejs\nmounts:\n  - 42\n`
        );

        expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow(
            /mounts\[0\] must be a non-empty string or an object mount definition/
        );
    });

    it('rejects object mounts missing value and source/destination pair', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'plain',
                overlays: ['nodejs'],
                mounts: [{ type: 'bind' }],
            })
        );

        expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow(
            /must define either "value" or both "source" and "destination"/
        );
    });

    it('rejects object mounts that combine value with source or destination', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'plain',
                overlays: ['nodejs'],
                mounts: [{ value: 'source=a,target=/a,type=bind', source: 'a', destination: '/a' }],
            })
        );

        expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow(
            /must not combine "value" with "source" or "destination"/
        );
    });
});
