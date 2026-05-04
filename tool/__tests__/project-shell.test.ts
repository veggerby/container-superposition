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

describe('Project Shell', () => {
    const overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
    let repoDir: string;

    beforeEach(() => {
        repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-shell-'));
    });

    afterEach(() => {
        fs.rmSync(repoDir, { recursive: true, force: true });
    });

    it('loads shell aliases/snippets from superposition.yml and exposes them to answers', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'plain',
                overlays: ['nodejs'],
                shell: {
                    aliases: {
                        k: 'kubectl',
                        kgp: 'kubectl get pods',
                    },
                    snippets: ['source /etc/profile'],
                },
            })
        );

        const loaded = loadProjectConfig(overlaysConfig, repoDir);
        expect(loaded?.selection.shell).toEqual({
            aliases: {
                k: 'kubectl',
                kgp: 'kubectl get pods',
            },
            snippets: ['source /etc/profile'],
        });

        const answers = buildAnswersFromProjectConfig(loaded!.selection, overlaysConfig);
        expect(answers.projectShell).toEqual(loaded?.selection.shell);
    });

    it('serializes shell config back to project file format', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'plain',
                overlays: ['nodejs'],
                shell: {
                    aliases: {
                        k: 'kubectl',
                    },
                },
            })
        );

        const loaded = loadProjectConfig(overlaysConfig, repoDir);
        const serialized = serializeProjectConfig(loaded!.selection);
        expect(serialized).toContain('shell:');
        expect(serialized).toContain('aliases:');
        expect(serialized).toContain('k: kubectl');
    });

    it('generates shell-init and postCreate hook for bash/zsh', async () => {
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
            projectShell: {
                aliases: {
                    k: 'kubectl',
                },
                snippets: ['export FOO=bar'],
            },
        };

        await composeDevContainer(answers);

        const shellInitPath = path.join(outputPath, 'custom', 'shell-init.sh');
        const hookScriptPath = path.join(outputPath, 'scripts', 'setup-project-shell.sh');
        expect(fs.existsSync(shellInitPath)).toBe(true);
        expect(fs.existsSync(hookScriptPath)).toBe(true);

        const shellInit = fs.readFileSync(shellInitPath, 'utf8');
        expect(shellInit).toContain("alias k='kubectl'");
        expect(shellInit).toContain('export FOO=bar');

        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(outputPath, 'devcontainer.json'), 'utf8')
        ) as { postCreateCommand?: Record<string, string> | string };

        expect(typeof devcontainer.postCreateCommand).toBe('object');
        expect(
            (devcontainer.postCreateCommand as Record<string, string>)['setup-project-shell']
        ).toContain('setup-project-shell.sh');
    });
});
