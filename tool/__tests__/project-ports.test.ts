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

    it('loads and serializes project ports from superposition.yml', () => {
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

        const serialized = serializeProjectConfig(loaded!.selection);
        expect(serialized).toContain('ports:');
        expect(serialized).toContain('${API_PORT:-8080}:8080');
        expect(serialized).toContain('onAutoForward: openBrowser');
    });

    it('applies project ports in plain stack without portOffset shifts', async () => {
        const outputPath = path.join(repoDir, '.devcontainer');
        fs.writeFileSync(path.join(repoDir, '.env'), 'API_PORT=9001\n');

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
            portOffset: 100,
            projectPorts: [
                {
                    value: '${API_PORT:-8080}:8080',
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
        expect(devcontainer.forwardPorts).not.toContain(9101);
        expect(devcontainer.forwardPorts).toContain(8180); // nodejs overlay port 8080 + offset
        expect(devcontainer.portsAttributes?.['9001']).toEqual({
            label: 'Custom API',
            onAutoForward: 'notify',
        });
    });

    it('applies project ports in compose stack with generation-time expansion', async () => {
        const outputPath = path.join(repoDir, '.devcontainer');
        fs.writeFileSync(path.join(repoDir, '.env'), 'API_PORT=9010\n');

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
            portsAttributes?: Record<string, { label?: string; onAutoForward?: string }>;
        };
        const compose = yaml.load(
            fs.readFileSync(path.join(outputPath, 'docker-compose.yml'), 'utf8')
        ) as {
            services?: { devcontainer?: { ports?: string[] } };
        };

        expect(devcontainer.forwardPorts).toContain(9010);
        expect(devcontainer.forwardPorts).toContain(5173);
        expect(devcontainer.portsAttributes?.['9010']).toEqual({
            label: 'API',
            onAutoForward: 'notify',
        });
        expect(compose.services?.devcontainer?.ports).toContain('9010:8080');
        expect(compose.services?.devcontainer?.ports).toContain('5173:5173');
    });
});
