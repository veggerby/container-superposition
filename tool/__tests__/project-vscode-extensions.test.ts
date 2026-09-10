import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { composeDevContainer } from '../questionnaire/composer.js';
import { buildAnswersFromProjectConfig, loadProjectConfig } from '../schema/project-config.js';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import { mergeAnswers } from '../questionnaire/answers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.join(__dirname, '..', '..');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');
const INDEX_YML_PATH = path.join(OVERLAYS_DIR, 'index.yml');

describe('Project VS Code extensions', () => {
    const overlaysConfig = loadOverlaysConfig(OVERLAYS_DIR, INDEX_YML_PATH);
    let repoDir: string;

    beforeEach(() => {
        repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'project-vscode-extensions-'));
    });

    afterEach(() => {
        fs.rmSync(repoDir, { recursive: true, force: true });
    });

    it('loads and generates first-class vscodeExtensions without removing overlay extensions', async () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({
                stack: 'plain',
                overlays: ['nodejs'],
                outputPath: './.devcontainer',
                vscodeExtensions: ['GitHub.copilot', 'EditorConfig.EditorConfig'],
            })
        );

        const loaded = loadProjectConfig(overlaysConfig, repoDir);
        expect(loaded?.selection.vscodeExtensions).toEqual([
            'GitHub.copilot',
            'EditorConfig.EditorConfig',
        ]);

        const answers = mergeAnswers(
            buildAnswersFromProjectConfig(loaded!.selection, overlaysConfig)
        );
        answers.outputPath = path.join(repoDir, '.devcontainer');
        await composeDevContainer(answers, OVERLAYS_DIR);

        const devcontainer = JSON.parse(
            fs.readFileSync(path.join(repoDir, '.devcontainer', 'devcontainer.json'), 'utf8')
        );
        expect(devcontainer.customizations.vscode.extensions).toContain('dbaeumer.vscode-eslint');
        expect(devcontainer.customizations.vscode.extensions).toContain('GitHub.copilot');
        expect(devcontainer.customizations.vscode.extensions).toContain(
            'EditorConfig.EditorConfig'
        );
    });

    it('rejects invalid first-class vscodeExtensions values before generation', () => {
        fs.writeFileSync(
            path.join(repoDir, 'superposition.yml'),
            yaml.dump({ stack: 'plain', vscodeExtensions: ['GitHub.copilot', ''] })
        );

        expect(() => loadProjectConfig(overlaysConfig, repoDir)).toThrow(
            'vscodeExtensions[1] must be a non-empty string'
        );
    });
});
